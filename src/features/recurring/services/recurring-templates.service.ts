import { addDays, addMonths, endOfMonth, parseISO } from 'date-fns';
import { supabaseUntyped as supabase } from '@/lib/supabase/extended-client';
import { formatSupabaseError } from '@/lib/supabase/errors';
import { toISODate } from '@/lib/date';
import {
  nextOccurrences,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from '@/lib/finance/recurrence';
import { createExpense, type CreateExpenseInput } from '@/features/expenses/services/expenses.service';
import type { CreateIncomeInput } from '@/features/incomes/services/incomes.service';
import type { RecurringTemplateInput } from '@/schemas/recurring.schema';
import type { SplitMethod } from '@/lib/supabase/aliases';

export interface RecurringTemplateRow {
  id: string;
  household_id: string;
  kind: 'income' | 'expense';
  active: boolean;
  label: string;
  amount: number;
  currency: string;
  category_id: string | null;
  user_id: string | null;
  source: string | null;
  expense_type: 'fixed' | 'variable' | 'debt' | 'one_time' | null;
  split_method: SplitMethod | null;
  recurring_rule_id: string;
  last_materialized_on: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  recurring_rules?: {
    frequency: RecurrenceFrequency;
    interval: number;
    start_date: string;
    end_date: string | null;
    day_of_month: number | null;
    day_of_week: number | null;
  } | null;
}

const MAX_OCCURRENCES_PER_RUN = 18;

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function normalizeEndDate(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildRule(input: RecurringTemplateInput): RecurrenceRule {
  const start = parseLocalDate(input.start_date);
  return {
    frequency: input.frequency as RecurrenceFrequency,
    interval: 1,
    start_date: input.start_date,
    end_date: normalizeEndDate(input.end_date),
    day_of_month: input.frequency === 'monthly' ? start.getDate() : null,
    day_of_week:
      input.frequency === 'weekly' || input.frequency === 'biweekly' ? start.getDay() : null,
  };
}

function templateToFormInput(row: RecurringTemplateRow): RecurringTemplateInput {
  const rule = row.recurring_rules;
  return {
    kind: row.kind,
    label: row.label,
    amount: Number(row.amount),
    frequency: (rule?.frequency ?? 'monthly') as RecurringTemplateInput['frequency'],
    start_date: rule?.start_date ?? toISODate(new Date()),
    end_date: rule?.end_date ?? '',
    category_id: row.category_id,
    user_id: row.user_id ?? undefined,
    source: row.source ?? '',
    expense_type: row.expense_type ?? 'fixed',
    split_method: row.split_method ?? 'equal',
  };
}

function throwIfError(error: unknown): void {
  if (error) throw new Error(formatSupabaseError(error));
}

async function attachRules(
  templates: RecurringTemplateRow[],
): Promise<RecurringTemplateRow[]> {
  if (templates.length === 0) return templates;

  const ruleIds = [...new Set(templates.map((t) => t.recurring_rule_id))];
  const { data: rules, error } = await supabase
    .from('recurring_rules')
    .select('id, frequency, interval, start_date, end_date, day_of_month, day_of_week')
    .in('id', ruleIds);

  throwIfError(error);

  const byId = new Map((rules ?? []).map((r) => [r.id as string, r]));

  return templates.map((t) => ({
    ...t,
    recurring_rules: byId.get(t.recurring_rule_id) ?? null,
  }));
}

export async function listRecurringTemplates(
  householdId: string,
): Promise<RecurringTemplateRow[]> {
  const { data, error } = await supabase
    .from('recurring_templates')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  throwIfError(error);
  return attachRules((data ?? []) as RecurringTemplateRow[]);
}

export async function createRecurringTemplate(
  householdId: string,
  createdBy: string,
  input: RecurringTemplateInput,
  currency: string,
): Promise<RecurringTemplateRow> {
  const rulePayload = buildRule(input);

  const { data: rule, error: ruleError } = await supabase
    .from('recurring_rules')
    .insert({
      household_id: householdId,
      frequency: rulePayload.frequency,
      interval: rulePayload.interval,
      start_date: rulePayload.start_date,
      end_date: rulePayload.end_date,
      day_of_month: rulePayload.day_of_month,
      day_of_week: rulePayload.day_of_week,
    })
    .select('id, frequency, interval, start_date, end_date, day_of_month, day_of_week')
    .single();

  throwIfError(ruleError);
  if (!rule) throw new Error('No se pudo crear la regla');

  const templateInsert: Record<string, unknown> = {
    household_id: householdId,
    kind: input.kind,
    active: true,
    label: input.label,
    amount: input.amount,
    currency,
    category_id: input.category_id ?? null,
    recurring_rule_id: rule.id,
    created_by: createdBy,
  };

  if (input.kind === 'income') {
    if (!input.user_id) throw new Error('Selecciona quién recibe el ingreso');
    templateInsert.user_id = input.user_id;
    templateInsert.source = input.source?.trim() || input.label;
  } else {
    templateInsert.expense_type = input.expense_type ?? 'fixed';
    templateInsert.split_method = input.split_method ?? 'equal';
    templateInsert.user_id = null;
    templateInsert.source = null;
  }

  const { data: template, error: templateError } = await supabase
    .from('recurring_templates')
    .insert(templateInsert)
    .select('*')
    .single();

  if (templateError || !template) {
    await supabase.from('recurring_rules').delete().eq('id', rule.id);
    throwIfError(templateError);
    throw new Error('No se pudo crear la plantilla');
  }

  const row = {
    ...(template as RecurringTemplateRow),
    recurring_rules: rule,
  };

  await materializeRecurringTemplates(householdId, createdBy, row.id);

  return row;
}

export async function updateRecurringTemplate(
  templateId: string,
  input: RecurringTemplateInput,
): Promise<RecurringTemplateRow> {
  const { data: existing, error: fetchError } = await supabase
    .from('recurring_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  throwIfError(fetchError);
  if (!existing) throw new Error('Plantilla no encontrada');

  const rulePayload = buildRule(input);
  const endDate = rulePayload.end_date;
  const today = toISODate(new Date());
  const shouldDeactivate = Boolean(endDate && endDate < today);

  const { error: ruleError } = await supabase
    .from('recurring_rules')
    .update({
      frequency: rulePayload.frequency,
      interval: rulePayload.interval,
      start_date: rulePayload.start_date,
      end_date: endDate,
      day_of_month: rulePayload.day_of_month,
      day_of_week: rulePayload.day_of_week,
    })
    .eq('id', existing.recurring_rule_id as string);

  throwIfError(ruleError);

  const templatePatch: Record<string, unknown> = {
    label: input.label,
    amount: input.amount,
    category_id: input.category_id ?? null,
    active: shouldDeactivate ? false : existing.active,
  };

  if (input.kind === 'income') {
    if (!input.user_id) throw new Error('Selecciona quién recibe el ingreso');
    templatePatch.user_id = input.user_id;
    templatePatch.source = input.source?.trim() || input.label;
  } else {
    templatePatch.expense_type = input.expense_type ?? 'fixed';
    templatePatch.split_method = input.split_method ?? 'equal';
  }

  const { data: template, error: templateError } = await supabase
    .from('recurring_templates')
    .update(templatePatch)
    .eq('id', templateId)
    .select('*')
    .single();

  throwIfError(templateError);
  if (!template) throw new Error('No se pudo actualizar la plantilla');

  const [row] = await attachRules([template as RecurringTemplateRow]);
  return row;
}

export { templateToFormInput };

export async function setRecurringTemplateActive(
  templateId: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('recurring_templates')
    .update({ active })
    .eq('id', templateId);
  throwIfError(error);
}

export async function deleteRecurringTemplate(templateId: string): Promise<void> {
  const { data: template, error: fetchError } = await supabase
    .from('recurring_templates')
    .select('recurring_rule_id')
    .eq('id', templateId)
    .single();
  throwIfError(fetchError);

  const { error } = await supabase.from('recurring_templates').delete().eq('id', templateId);
  throwIfError(error);

  if (template?.recurring_rule_id) {
    await supabase.from('recurring_rules').delete().eq('id', template.recurring_rule_id);
  }
}

async function getActiveMemberUserIds(householdId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)
    .eq('status', 'active');
  throwIfError(error);
  return (data ?? []).map((m) => m.user_id).filter((id): id is string => Boolean(id));
}

async function existingMaterializedDates(
  kind: 'income' | 'expense',
  templateId: string,
  from: string,
  to: string,
): Promise<Set<string>> {
  const table = kind === 'income' ? 'incomes' : 'expenses';
  const { data, error } = await supabase
    .from(table)
    .select('date')
    .eq('recurring_template_id', templateId)
    .gte('date', from)
    .lte('date', to);
  throwIfError(error);
  return new Set((data ?? []).map((r) => r.date as string));
}

async function materializeOneTemplate(
  template: RecurringTemplateRow,
  householdId: string,
  createdBy: string,
  memberIds: string[],
  horizonIso: string,
): Promise<number> {
  const ruleRow = template.recurring_rules;
  if (!ruleRow || !template.active) return 0;

  const rule: RecurrenceRule = {
    frequency: ruleRow.frequency,
    interval: ruleRow.interval,
    start_date: ruleRow.start_date,
    end_date: ruleRow.end_date,
    day_of_month: ruleRow.day_of_month,
    day_of_week: ruleRow.day_of_week,
  };

  const fromDate = template.last_materialized_on
    ? addDays(parseISO(template.last_materialized_on), 1)
    : parseLocalDate(rule.start_date);

  const occurrences = nextOccurrences(rule, MAX_OCCURRENCES_PER_RUN, fromDate)
    .filter((d) => toISODate(d) <= horizonIso)
    .slice(0, MAX_OCCURRENCES_PER_RUN);

  if (occurrences.length === 0) return 0;

  const fromIso = toISODate(occurrences[0]);
  const toIso = toISODate(occurrences[occurrences.length - 1]);
  const existing = await existingMaterializedDates(template.kind, template.id, fromIso, toIso);

  let lastCreated: string | null = template.last_materialized_on;
  let created = 0;

  for (const occ of occurrences) {
    const dateIso = toISODate(occ);
    if (existing.has(dateIso)) {
      if (!lastCreated || dateIso > lastCreated) lastCreated = dateIso;
      continue;
    }

    if (template.kind === 'income') {
      const payload: CreateIncomeInput = {
        household_id: householdId,
        created_by: createdBy,
        user_id: template.user_id!,
        amount: Number(template.amount),
        currency: template.currency,
        date: dateIso,
        category_id: template.category_id,
        source: template.source ?? template.label,
        notes: 'Generado automáticamente',
      };
      const { error } = await supabase.from('incomes').insert({
        ...payload,
        is_recurring: true,
        recurring_rule_id: template.recurring_rule_id,
        recurring_template_id: template.id,
      });
      if (error) {
        console.warn('[recurring] income skip', dateIso, error);
        continue;
      }
    } else {
      const participants = memberIds.map((userId) => ({ userId }));
      const payload: CreateExpenseInput = {
        household_id: householdId,
        created_by: createdBy,
        amount: Number(template.amount),
        currency: template.currency,
        date: dateIso,
        due_date: dateIso,
        category_id: template.category_id,
        type: template.expense_type ?? 'fixed',
        status: 'pending',
        description: template.label,
        notes: 'Generado automáticamente',
        split: {
          method: template.split_method ?? 'equal',
          participants,
        },
      };
      try {
        const expense = await createExpense(payload);
        const { error: patchError } = await supabase
          .from('expenses')
          .update({
            is_recurring: true,
            recurring_rule_id: template.recurring_rule_id,
            recurring_template_id: template.id,
          })
          .eq('id', expense.id);
        if (patchError) console.warn('[recurring] expense patch', patchError);
      } catch (err) {
        console.warn('[recurring] expense skip', dateIso, err);
        continue;
      }
    }

    created++;
    existing.add(dateIso);
    if (!lastCreated || dateIso > lastCreated) lastCreated = dateIso;
  }

  if (lastCreated) {
    const { error } = await supabase
      .from('recurring_templates')
      .update({ last_materialized_on: lastCreated })
      .eq('id', template.id);
    if (error) console.warn('[recurring] last_materialized_on', error);
  }

  return created;
}

/**
 * Creates income/expense rows for due occurrences (up to ~2 months ahead).
 * Pass `onlyTemplateId` right after creating a template to avoid reloading the full list.
 */
export async function materializeRecurringTemplates(
  householdId: string,
  createdBy: string,
  onlyTemplateId?: string,
): Promise<{ created: number }> {
  let templates: RecurringTemplateRow[];

  if (onlyTemplateId) {
    const { data, error } = await supabase
      .from('recurring_templates')
      .select('*')
      .eq('id', onlyTemplateId)
      .single();
    throwIfError(error);
    if (!data) return { created: 0 };
    templates = await attachRules([data as RecurringTemplateRow]);
  } else {
    templates = await listRecurringTemplates(householdId);
  }

  const active = templates.filter((t) => t.active);
  if (active.length === 0) return { created: 0 };

  const horizon = endOfMonth(addMonths(new Date(), 2));
  const horizonIso = toISODate(horizon);
  const memberIds = await getActiveMemberUserIds(householdId);
  let created = 0;

  for (const template of active) {
    created += await materializeOneTemplate(
      template,
      householdId,
      createdBy,
      memberIds,
      horizonIso,
    );
  }

  return { created };
}

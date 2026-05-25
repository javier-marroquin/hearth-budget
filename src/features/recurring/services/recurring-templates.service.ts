import { addDays, addMonths, endOfMonth, parseISO } from 'date-fns';
import { supabaseUntyped as supabase } from '@/lib/supabase/extended-client';
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

function parseLocalDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function buildRule(input: RecurringTemplateInput): Omit<RecurrenceRule, 'end_date' | 'occurrences'> {
  const start = parseLocalDate(input.start_date);
  return {
    frequency: input.frequency as RecurrenceFrequency,
    interval: 1,
    start_date: input.start_date,
    day_of_month: input.frequency === 'monthly' ? start.getDate() : null,
    day_of_week:
      input.frequency === 'weekly' || input.frequency === 'biweekly' ? start.getDay() : null,
  };
}

export async function listRecurringTemplates(
  householdId: string,
): Promise<RecurringTemplateRow[]> {
  const { data, error } = await supabase
    .from('recurring_templates')
    .select(
      `
      *,
      recurring_rules (
        frequency,
        interval,
        start_date,
        end_date,
        day_of_month,
        day_of_week
      )
    `,
    )
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as RecurringTemplateRow[];
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
      day_of_month: rulePayload.day_of_month,
      day_of_week: rulePayload.day_of_week,
    })
    .select()
    .single();

  if (ruleError || !rule) throw ruleError ?? new Error('No se pudo crear la regla');

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
    .select()
    .single();

  if (templateError || !template) {
    await supabase.from('recurring_rules').delete().eq('id', rule.id);
    throw templateError ?? new Error('No se pudo crear la plantilla');
  }

  await materializeRecurringTemplates(householdId, createdBy);

  const rows = await listRecurringTemplates(householdId);
  const created = rows.find((r) => r.id === template.id);
  if (!created) throw new Error('Plantilla creada pero no encontrada');
  return created;
}

export async function setRecurringTemplateActive(
  templateId: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('recurring_templates')
    .update({ active })
    .eq('id', templateId);
  if (error) throw error;
}

export async function deleteRecurringTemplate(templateId: string): Promise<void> {
  const { data: template, error: fetchError } = await supabase
    .from('recurring_templates')
    .select('recurring_rule_id')
    .eq('id', templateId)
    .single();
  if (fetchError) throw fetchError;

  const { error } = await supabase.from('recurring_templates').delete().eq('id', templateId);
  if (error) throw error;

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
  if (error) throw error;
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
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.date as string));
}

/**
 * Creates income/expense rows for each due occurrence up to ~2 months ahead.
 */
export async function materializeRecurringTemplates(
  householdId: string,
  createdBy: string,
): Promise<{ created: number }> {
  const templates = await listRecurringTemplates(householdId);
  const active = templates.filter((t) => t.active);
  if (active.length === 0) return { created: 0 };

  const horizon = endOfMonth(addMonths(new Date(), 2));
  const horizonIso = toISODate(horizon);
  const memberIds = await getActiveMemberUserIds(householdId);
  let created = 0;

  for (const template of active) {
    const ruleRow = template.recurring_rules;
    if (!ruleRow) continue;

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

    const occurrences = nextOccurrences(rule, 48, fromDate).filter(
      (d) => toISODate(d) <= horizonIso,
    );

    if (occurrences.length === 0) continue;

    const fromIso = toISODate(occurrences[0]);
    const toIso = toISODate(occurrences[occurrences.length - 1]);
    const existing = await existingMaterializedDates(template.kind, template.id, fromIso, toIso);

    let lastCreated: string | null = template.last_materialized_on;

    for (const occ of occurrences) {
      const dateIso = toISODate(occ);
      if (existing.has(dateIso)) {
        if (!lastCreated || dateIso > lastCreated) lastCreated = dateIso;
        continue;
      }

      try {
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
          if (error) throw error;
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
          const expense = await createExpense(payload);
          await supabase
            .from('expenses')
            .update({
              is_recurring: true,
              recurring_rule_id: template.recurring_rule_id,
              recurring_template_id: template.id,
            })
            .eq('id', expense.id);
        }
        created++;
        existing.add(dateIso);
        if (!lastCreated || dateIso > lastCreated) lastCreated = dateIso;
      } catch (err) {
        console.warn('[recurring] skip occurrence', template.label, dateIso, err);
      }
    }

    if (lastCreated) {
      await supabase
        .from('recurring_templates')
        .update({ last_materialized_on: lastCreated })
        .eq('id', template.id);
    }
  }

  return { created };
}

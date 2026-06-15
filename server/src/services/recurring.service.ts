import { addDays, addMonths, endOfMonth, parseISO } from 'date-fns';
import { toISODate } from '@/lib/date.js';
import {
  nextOccurrences,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from '@/lib/finance/recurrence.js';
import type { SplitMethod } from '@/lib/db/aliases.js';
import type { RecurringTemplateInput } from '@/schemas/recurring.schema.js';
import type { DbClient } from '../db/pool.js';
import { createExpenseWithSplits } from './expenses.service.js';

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

type RecurringRuleRow = NonNullable<RecurringTemplateRow['recurring_rules']> & { id: string };

const MAX_OCCURRENCES_PER_RUN = 18;

const RULE_COLUMNS =
  'id, frequency, interval, start_date, end_date, day_of_month, day_of_week';

function isoDate(value: unknown): string {
  if (value instanceof Date) return toISODate(value);
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value).slice(0, 10);
}

function mapTemplateRow(row: Record<string, unknown>): RecurringTemplateRow {
  return {
    id: row.id as string,
    household_id: row.household_id as string,
    kind: row.kind as RecurringTemplateRow['kind'],
    active: Boolean(row.active),
    label: row.label as string,
    amount: Number(row.amount),
    currency: row.currency as string,
    category_id: (row.category_id as string | null) ?? null,
    user_id: (row.user_id as string | null) ?? null,
    source: (row.source as string | null) ?? null,
    expense_type: (row.expense_type as RecurringTemplateRow['expense_type']) ?? null,
    split_method: (row.split_method as SplitMethod | null) ?? null,
    recurring_rule_id: row.recurring_rule_id as string,
    last_materialized_on: row.last_materialized_on
      ? isoDate(row.last_materialized_on)
      : null,
    created_by: row.created_by as string,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapRuleRow(row: Record<string, unknown>): RecurringRuleRow {
  return {
    id: row.id as string,
    frequency: row.frequency as RecurrenceFrequency,
    interval: Number(row.interval),
    start_date: isoDate(row.start_date),
    end_date: row.end_date ? isoDate(row.end_date) : null,
    day_of_month: row.day_of_month != null ? Number(row.day_of_month) : null,
    day_of_week: row.day_of_week != null ? Number(row.day_of_week) : null,
  };
}

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

export function templateToFormInput(row: RecurringTemplateRow): RecurringTemplateInput {
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

async function attachRules(
  client: DbClient,
  templates: RecurringTemplateRow[],
): Promise<RecurringTemplateRow[]> {
  if (templates.length === 0) return templates;

  const ruleIds = [...new Set(templates.map((t) => t.recurring_rule_id))];
  const { rows } = await client.query(
    `SELECT ${RULE_COLUMNS} FROM public.recurring_rules WHERE id = ANY($1::uuid[])`,
    [ruleIds],
  );

  const byId = new Map(rows.map((r) => [r.id as string, mapRuleRow(r)]));

  return templates.map((t) => ({
    ...t,
    recurring_rules: byId.get(t.recurring_rule_id) ?? null,
  }));
}

export async function listRecurringTemplates(
  client: DbClient,
  householdId: string,
): Promise<RecurringTemplateRow[]> {
  const { rows } = await client.query(
    `SELECT * FROM public.recurring_templates
     WHERE household_id = $1
     ORDER BY created_at DESC`,
    [householdId],
  );
  return attachRules(client, rows.map(mapTemplateRow));
}

export async function createRecurringTemplate(
  client: DbClient,
  householdId: string,
  createdBy: string,
  input: RecurringTemplateInput,
  currency: string,
): Promise<RecurringTemplateRow> {
  const rulePayload = buildRule(input);

  const { rows: ruleRows } = await client.query(
    `INSERT INTO public.recurring_rules
       (household_id, frequency, interval, start_date, end_date, day_of_month, day_of_week)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${RULE_COLUMNS}`,
    [
      householdId,
      rulePayload.frequency,
      rulePayload.interval,
      rulePayload.start_date,
      rulePayload.end_date,
      rulePayload.day_of_month,
      rulePayload.day_of_week,
    ],
  );
  const rule = ruleRows[0];
  if (!rule) throw new Error('No se pudo crear la regla');

  const ruleId = rule.id as string;

  const params: unknown[] = [
    householdId,
    input.kind,
    input.label,
    input.amount,
    currency,
    input.category_id ?? null,
    ruleId,
    createdBy,
  ];

  let insertSql = `INSERT INTO public.recurring_templates
     (household_id, kind, active, label, amount, currency, category_id, recurring_rule_id, created_by`;

  if (input.kind === 'income') {
    if (!input.user_id) throw new Error('Selecciona quién recibe el ingreso');
    insertSql += `, user_id, source) VALUES ($1, $2, true, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`;
    params.push(input.user_id, input.source?.trim() || input.label);
  } else {
    insertSql += `, expense_type, split_method, user_id, source) VALUES ($1, $2, true, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, NULL) RETURNING *`;
    params.push(input.expense_type ?? 'fixed', input.split_method ?? 'equal');
  }

  let templateRows;
  try {
    ({ rows: templateRows } = await client.query(insertSql, params));
  } catch (err) {
    await client.query(`DELETE FROM public.recurring_rules WHERE id = $1`, [ruleId]);
    throw err;
  }

  const template = templateRows[0];
  if (!template) {
    await client.query(`DELETE FROM public.recurring_rules WHERE id = $1`, [ruleId]);
    throw new Error('No se pudo crear la plantilla');
  }

  const row: RecurringTemplateRow = {
    ...mapTemplateRow(template),
    recurring_rules: mapRuleRow(rule),
  };

  await materializeRecurringTemplates(client, householdId, createdBy, row.id);

  return row;
}

export async function updateRecurringTemplate(
  client: DbClient,
  templateId: string,
  input: RecurringTemplateInput,
): Promise<RecurringTemplateRow> {
  const { rows: existingRows } = await client.query(
    `SELECT * FROM public.recurring_templates WHERE id = $1`,
    [templateId],
  );
  const existing = existingRows[0];
  if (!existing) throw new Error('Plantilla no encontrada');

  const rulePayload = buildRule(input);
  const endDate = rulePayload.end_date;
  const today = toISODate(new Date());
  const shouldDeactivate = Boolean(endDate && endDate < today);

  await client.query(
    `UPDATE public.recurring_rules
     SET frequency = $1, interval = $2, start_date = $3, end_date = $4,
         day_of_month = $5, day_of_week = $6, updated_at = now()
     WHERE id = $7`,
    [
      rulePayload.frequency,
      rulePayload.interval,
      rulePayload.start_date,
      endDate,
      rulePayload.day_of_month,
      rulePayload.day_of_week,
      existing.recurring_rule_id,
    ],
  );

  const params: unknown[] = [
    input.label,
    input.amount,
    input.category_id ?? null,
    shouldDeactivate ? false : existing.active,
    templateId,
  ];

  let updateSql = `UPDATE public.recurring_templates
     SET label = $1, amount = $2, category_id = $3, active = $4, updated_at = now()`;

  if (input.kind === 'income') {
    if (!input.user_id) throw new Error('Selecciona quién recibe el ingreso');
    updateSql += `, user_id = $5, source = $6 WHERE id = $7 RETURNING *`;
    params.splice(4, 0, input.user_id, input.source?.trim() || input.label);
  } else {
    updateSql += `, expense_type = $5, split_method = $6 WHERE id = $7 RETURNING *`;
    params.splice(4, 0, input.expense_type ?? 'fixed', input.split_method ?? 'equal');
  }

  const { rows: templateRows } = await client.query(updateSql, params);
  const template = templateRows[0];
  if (!template) throw new Error('No se pudo actualizar la plantilla');

  const [row] = await attachRules(client, [mapTemplateRow(template)]);
  return row;
}

export async function setRecurringTemplateActive(
  client: DbClient,
  templateId: string,
  active: boolean,
): Promise<void> {
  await client.query(
    `UPDATE public.recurring_templates SET active = $1, updated_at = now() WHERE id = $2`,
    [active, templateId],
  );
}

export async function deleteRecurringTemplate(
  client: DbClient,
  templateId: string,
): Promise<void> {
  const { rows } = await client.query(
    `SELECT recurring_rule_id FROM public.recurring_templates WHERE id = $1`,
    [templateId],
  );
  const template = rows[0];
  if (!template) throw new Error('Plantilla no encontrada');

  await client.query(`DELETE FROM public.recurring_templates WHERE id = $1`, [templateId]);

  if (template.recurring_rule_id) {
    await client.query(`DELETE FROM public.recurring_rules WHERE id = $1`, [
      template.recurring_rule_id,
    ]);
  }
}

async function getActiveMemberUserIds(
  client: DbClient,
  householdId: string,
): Promise<string[]> {
  const { rows } = await client.query(
    `SELECT user_id FROM public.household_members
     WHERE household_id = $1 AND status = 'active'`,
    [householdId],
  );
  return rows.map((m) => m.user_id as string).filter(Boolean);
}

async function existingMaterializedDates(
  client: DbClient,
  kind: 'income' | 'expense',
  templateId: string,
  from: string,
  to: string,
): Promise<Set<string>> {
  const table = kind === 'income' ? 'incomes' : 'expenses';
  const { rows } = await client.query(
    `SELECT date FROM public.${table}
     WHERE recurring_template_id = $1 AND date >= $2 AND date <= $3`,
    [templateId, from, to],
  );
  return new Set(rows.map((r) => isoDate(r.date)));
}

async function materializeOneTemplate(
  client: DbClient,
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
  const existing = await existingMaterializedDates(
    client,
    template.kind,
    template.id,
    fromIso,
    toIso,
  );

  let lastCreated: string | null = template.last_materialized_on;
  let created = 0;

  for (const occ of occurrences) {
    const dateIso = toISODate(occ);
    if (existing.has(dateIso)) {
      if (!lastCreated || dateIso > lastCreated) lastCreated = dateIso;
      continue;
    }

    if (template.kind === 'income') {
      try {
        await client.query(
          `INSERT INTO public.incomes
             (household_id, user_id, amount, currency, date, category_id, source, notes,
              created_by, is_recurring, recurring_rule_id, recurring_template_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11)`,
          [
            householdId,
            template.user_id,
            Number(template.amount),
            template.currency,
            dateIso,
            template.category_id,
            template.source ?? template.label,
            'Generado automáticamente',
            createdBy,
            template.recurring_rule_id,
            template.id,
          ],
        );
      } catch (err) {
        console.warn('[recurring] income skip', dateIso, err);
        continue;
      }
    } else {
      const participants = memberIds.map((userId) => ({ userId }));
      try {
        const expense = await createExpenseWithSplits(client, {
          household_id: householdId,
          created_by: createdBy,
          amount: Number(template.amount),
          currency: template.currency,
          date: dateIso,
          due_date: dateIso,
          category_id: template.category_id,
          type: template.expense_type ?? 'fixed',
          status: 'pending',
          split_method: template.split_method ?? 'equal',
          description: template.label,
          notes: 'Generado automáticamente',
          split: {
            method: template.split_method ?? 'equal',
            participants,
          },
        });
        await client.query(
          `UPDATE public.expenses
           SET is_recurring = true, recurring_rule_id = $1, recurring_template_id = $2, updated_at = now()
           WHERE id = $3`,
          [template.recurring_rule_id, template.id, expense.id],
        );
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
    try {
      await client.query(
        `UPDATE public.recurring_templates
         SET last_materialized_on = $1, updated_at = now()
         WHERE id = $2`,
        [lastCreated, template.id],
      );
    } catch (err) {
      console.warn('[recurring] last_materialized_on', err);
    }
  }

  return created;
}

/**
 * Creates income/expense rows for due occurrences (up to ~2 months ahead).
 * Pass `onlyTemplateId` right after creating a template to avoid reloading the full list.
 */
export async function materializeRecurringTemplates(
  client: DbClient,
  householdId: string,
  createdBy: string,
  onlyTemplateId?: string,
): Promise<{ created: number }> {
  let templates: RecurringTemplateRow[];

  if (onlyTemplateId) {
    const { rows } = await client.query(
      `SELECT * FROM public.recurring_templates WHERE id = $1`,
      [onlyTemplateId],
    );
    if (!rows[0]) return { created: 0 };
    templates = await attachRules(client, [mapTemplateRow(rows[0])]);
  } else {
    templates = await listRecurringTemplates(client, householdId);
  }

  const active = templates.filter((t) => t.active);
  if (active.length === 0) return { created: 0 };

  const horizon = endOfMonth(addMonths(new Date(), 2));
  const horizonIso = toISODate(horizon);
  const memberIds = await getActiveMemberUserIds(client, householdId);
  let created = 0;

  for (const template of active) {
    created += await materializeOneTemplate(
      client,
      template,
      householdId,
      createdBy,
      memberIds,
      horizonIso,
    );
  }

  return { created };
}

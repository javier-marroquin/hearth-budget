import { apiFetch } from '@/lib/api/client';
import { toISODate } from '@/lib/date';
import type { SplitMethod } from '@/lib/db/aliases';
import type { RecurrenceFrequency } from '@/lib/finance/recurrence';
import type { RecurringTemplateInput } from '@/schemas/recurring.schema';

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

export async function listRecurringTemplates(
  householdId: string,
): Promise<RecurringTemplateRow[]> {
  return apiFetch(`/api/households/${householdId}/recurring-templates`);
}

export async function createRecurringTemplate(
  householdId: string,
  _createdBy: string,
  input: RecurringTemplateInput,
  currency: string,
): Promise<RecurringTemplateRow> {
  return apiFetch(`/api/households/${householdId}/recurring-templates`, {
    method: 'POST',
    body: JSON.stringify({ ...input, currency }),
  });
}

export async function updateRecurringTemplate(
  templateId: string,
  input: RecurringTemplateInput,
): Promise<RecurringTemplateRow> {
  return apiFetch(`/api/recurring-templates/${templateId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function setRecurringTemplateActive(
  templateId: string,
  active: boolean,
): Promise<void> {
  await apiFetch(`/api/recurring-templates/${templateId}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

export async function deleteRecurringTemplate(templateId: string): Promise<void> {
  await apiFetch(`/api/recurring-templates/${templateId}`, { method: 'DELETE' });
}

export async function materializeRecurringTemplates(
  householdId: string,
  _createdBy: string,
  onlyTemplateId?: string,
): Promise<{ created: number }> {
  return apiFetch(`/api/households/${householdId}/recurring-templates/materialize`, {
    method: 'POST',
    body: JSON.stringify(
      onlyTemplateId ? { templateId: onlyTemplateId } : {},
    ),
  });
}

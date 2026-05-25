/**
 * Full JSON backup of a household.
 *
 * Reads the household + all its child entities in parallel and packages them
 * into a single JSON document the user can download (and later re-import
 * once we add restore).
 */

import { supabase } from '@/lib/supabase/client';
import { supabaseUntyped } from '@/lib/supabase/extended-client';
import type {
  CalendarEventRow,
  CategoryRow,
  ContributionRow,
  ExpenseRow,
  ExpenseSplitRow,
  HouseholdRow,
  HouseholdMemberRow,
  IncomeRow,
  RecurringRuleRow,
  SavingsGoalRow,
} from '@/lib/supabase/aliases';

export interface HouseholdBackup {
  /** Always `1`. Bump when the schema of this file changes. */
  schema_version: 1;
  exported_at: string;
  app: 'household-budget';
  household: HouseholdRow;
  members: HouseholdMemberRow[];
  categories: CategoryRow[];
  incomes: IncomeRow[];
  expenses: ExpenseRow[];
  expense_splits: ExpenseSplitRow[];
  contributions: ContributionRow[];
  savings_goals: SavingsGoalRow[];
  calendar_events: CalendarEventRow[];
  recurring_rules: RecurringRuleRow[];
  recurring_templates?: unknown[];
}

export async function exportHouseholdBackup(
  householdId: string,
): Promise<HouseholdBackup> {
  const [
    household,
    members,
    categories,
    incomes,
    expenses,
    splits,
    contributions,
    goals,
    events,
    rules,
    templates,
  ] = await Promise.all([
    supabase.from('households').select('*').eq('id', householdId).single(),
    supabase.from('household_members').select('*').eq('household_id', householdId),
    supabase.from('categories').select('*').eq('household_id', householdId),
    supabase.from('incomes').select('*').eq('household_id', householdId),
    supabase.from('expenses').select('*').eq('household_id', householdId),
    supabase
      .from('expense_splits')
      .select('*, expenses!inner(household_id)')
      .eq('expenses.household_id', householdId),
    supabase.from('contributions').select('*').eq('household_id', householdId),
    supabase.from('savings_goals').select('*').eq('household_id', householdId),
    supabase.from('calendar_events').select('*').eq('household_id', householdId),
    supabase.from('recurring_rules').select('*').eq('household_id', householdId),
    supabaseUntyped
      .from('recurring_templates')
      .select('*')
      .eq('household_id', householdId),
  ]);

  const errors = [
    household.error,
    members.error,
    categories.error,
    incomes.error,
    expenses.error,
    splits.error,
    contributions.error,
    goals.error,
    events.error,
    rules.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e?.message).join('; '));
  }
  if (!household.data) throw new Error('Household not found');

  return {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    app: 'household-budget',
    household: household.data,
    members: members.data ?? [],
    categories: categories.data ?? [],
    incomes: incomes.data ?? [],
    expenses: expenses.data ?? [],
    expense_splits:
      // strip the joined household_id alias from each split row
      (splits.data ?? []).map(({ ...rest }) => {
        const r = rest as Record<string, unknown>;
        delete r.expenses;
        return r as ExpenseSplitRow;
      }),
    contributions: contributions.data ?? [],
    savings_goals: goals.data ?? [],
    calendar_events: events.data ?? [],
    recurring_rules: rules.data ?? [],
    recurring_templates: templates.data ?? undefined,
  };
}

export function backupFilename(householdName: string): string {
  const safe = householdName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+|-+$/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return `presupuesto-hogar-${safe}-${date}.json`;
}

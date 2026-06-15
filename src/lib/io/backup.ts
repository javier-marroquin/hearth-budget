/**
 * Full JSON backup of a household.
 */

import { apiFetch } from '@/lib/api/client';
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
} from '@/lib/db/aliases';

export interface HouseholdBackup {
  schema_version: 1;
  exported_at: string;
  app: 'hearth-budget';
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
  return apiFetch(`/api/households/${householdId}/backup`);
}

export function backupFilename(householdName: string): string {
  const safe = householdName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+|-+$/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return `hearth-budget-${safe}-${date}.json`;
}

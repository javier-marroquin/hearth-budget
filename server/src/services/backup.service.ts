import type { DbClient } from '../db/pool.js';

export async function exportHouseholdBackup(client: DbClient, householdId: string) {
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
    client.query(`SELECT * FROM public.households WHERE id = $1`, [householdId]),
    client.query(`SELECT * FROM public.household_members WHERE household_id = $1`, [householdId]),
    client.query(`SELECT * FROM public.categories WHERE household_id = $1`, [householdId]),
    client.query(`SELECT * FROM public.incomes WHERE household_id = $1`, [householdId]),
    client.query(`SELECT * FROM public.expenses WHERE household_id = $1`, [householdId]),
    client.query(
      `SELECT es.* FROM public.expense_splits es
       INNER JOIN public.expenses e ON e.id = es.expense_id
       WHERE e.household_id = $1`,
      [householdId],
    ),
    client.query(`SELECT * FROM public.contributions WHERE household_id = $1`, [householdId]),
    client.query(`SELECT * FROM public.savings_goals WHERE household_id = $1`, [householdId]),
    client.query(`SELECT * FROM public.calendar_events WHERE household_id = $1`, [householdId]),
    client.query(`SELECT * FROM public.recurring_rules WHERE household_id = $1`, [householdId]),
    client.query(`SELECT * FROM public.recurring_templates WHERE household_id = $1`, [householdId]),
  ]);

  if (!household.rows[0]) throw new Error('Household not found');

  return {
    schema_version: 1 as const,
    exported_at: new Date().toISOString(),
    app: 'household-budget',
    household: household.rows[0],
    members: members.rows,
    categories: categories.rows,
    incomes: incomes.rows,
    expenses: expenses.rows,
    expense_splits: splits.rows,
    contributions: contributions.rows,
    savings_goals: goals.rows,
    calendar_events: events.rows,
    recurring_rules: rules.rows,
    recurring_templates: templates.rows,
  };
}

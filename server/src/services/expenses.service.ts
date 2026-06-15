import type { DbClient } from '../db/pool.js';
import { splitExpense, type SplitParticipant } from '@/lib/finance/splits.js';
import type { SplitMethod } from '@/lib/db/aliases.js';

export interface CreateExpenseInput {
  household_id: string;
  amount: number;
  currency: string;
  date: string;
  due_date?: string | null;
  category_id?: string | null;
  type: string;
  status?: string;
  split_method: SplitMethod;
  description?: string | null;
  notes?: string | null;
  created_by: string;
  split: {
    method: SplitMethod;
    participants: SplitParticipant[];
  };
}

export async function createExpenseWithSplits(
  client: DbClient,
  input: CreateExpenseInput,
) {
  const { rows } = await client.query(
    `INSERT INTO public.expenses
       (household_id, amount, currency, date, due_date, category_id, type, status,
        split_method, description, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      input.household_id,
      input.amount,
      input.currency,
      input.date,
      input.due_date ?? null,
      input.category_id ?? null,
      input.type,
      input.status ?? 'pending',
      input.split.method,
      input.description ?? null,
      input.notes ?? null,
      input.created_by,
    ],
  );
  const expense = rows[0];
  if (!expense) throw new Error('Failed to create expense');

  if (input.split.participants.length > 0) {
    const splits = splitExpense(input.amount, input.split.participants, input.split.method);
    for (const s of splits) {
      await client.query(
        `INSERT INTO public.expense_splits (expense_id, user_id, amount, percentage)
         VALUES ($1, $2, $3, $4)`,
        [expense.id, s.userId, s.amount, s.percentage],
      );
    }
  }

  return expense;
}

export async function getExpenseSplits(client: DbClient, expenseId: string) {
  const { rows } = await client.query(
    `SELECT * FROM public.expense_splits WHERE expense_id = $1`,
    [expenseId],
  );
  return rows;
}

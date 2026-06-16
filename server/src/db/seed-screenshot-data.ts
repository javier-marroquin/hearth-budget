/**
 * Rich demo dataset for screenshots / QA.
 * Run: npm run db:seed:demo
 */
import '../load-env.js';
import { addDays, addMonths, startOfMonth } from 'date-fns';
import { withUserContext, type DbClient } from '../db/pool.js';
import {
  createUserWithProfile,
  findUserByEmail,
} from '../auth/service.js';
import { createHousehold } from '../services/households.service.js';
import { createExpenseWithSplits } from '../services/expenses.service.js';
import {
  createRecurringTemplate,
} from '../services/recurring.service.js';
import { toISODate } from '@/lib/date.js';

const DEMO_EMAIL = 'demo@local.dev';
const DEMO_PASSWORD = 'demo1234';

const EXTRA_USERS = [
  { email: 'maria@local.dev', password: 'demo1234', fullName: 'María García', role: 'familiar' as const },
  { email: 'carlos@local.dev', password: 'demo1234', fullName: 'Carlos Ruiz', role: 'inquilino' as const },
  { email: 'ana@local.dev', password: 'demo1234', fullName: 'Ana López', role: 'invitado' as const },
];

const PENDING_INVITE = { email: 'pedro@ejemplo.com', role: 'familiar' as const };

function iso(d: Date): string {
  return toISODate(d);
}

async function ensureUser(
  email: string,
  password: string,
  fullName: string,
): Promise<string> {
  return withUserContext(null, async (client) => {
    const existing = await findUserByEmail(client, email);
    if (existing) {
      await client.query(
        `UPDATE public.profiles SET full_name = $1, locale = 'en' WHERE id = $2`,
        [fullName, existing.id],
      );
      return existing.id;
    }
    const { user } = await createUserWithProfile(client, {
      email,
      password,
      fullName,
      locale: 'en',
    });
    return user.id;
  });
}

async function clearHouseholdFinancials(householdId: string): Promise<void> {
  await withUserContext(null, async (client) => {
    await client.query(
      `DELETE FROM public.expense_splits
       WHERE expense_id IN (SELECT id FROM public.expenses WHERE household_id = $1)`,
      [householdId],
    );
    await client.query(`DELETE FROM public.expenses WHERE household_id = $1`, [householdId]);
    await client.query(`DELETE FROM public.incomes WHERE household_id = $1`, [householdId]);
    await client.query(`DELETE FROM public.contributions WHERE household_id = $1`, [householdId]);
    await client.query(`DELETE FROM public.calendar_events WHERE household_id = $1`, [householdId]);
    await client.query(`DELETE FROM public.notifications WHERE household_id = $1`, [householdId]);
    await client.query(`DELETE FROM public.recurring_templates WHERE household_id = $1`, [householdId]);
    await client.query(`DELETE FROM public.recurring_rules WHERE household_id = $1`, [householdId]);
    await client.query(`DELETE FROM public.savings_goals WHERE household_id = $1`, [householdId]);
    await client.query(`DELETE FROM public.payment_statuses WHERE household_id = $1`, [householdId]);
    await client.query(
      `DELETE FROM public.household_members
       WHERE household_id = $1 AND status = 'invited'`,
      [householdId],
    );
  });
}

type CatMap = Record<string, string>;

async function loadCategories(client: DbClient, householdId: string): Promise<CatMap> {
  const { rows } = await client.query<{ id: string; name: string }>(
    `SELECT id, name FROM public.categories WHERE household_id = $1`,
    [householdId],
  );
  return Object.fromEntries(rows.map((r) => [r.name, r.id]));
}

/** Creates expense + splits; marks paid_at / split.paid when status is paid. */
async function seedExpense(
  client: DbClient,
  input: Parameters<typeof createExpenseWithSplits>[1] & { paid_by?: string },
): Promise<void> {
  const expense = await createExpenseWithSplits(client, input);
  const expenseId = expense.id as string;

  if (input.status === 'paid') {
    const paidAt = `${input.date}T14:00:00.000Z`;
    await client.query(
      `UPDATE public.expenses
       SET paid_at = $1, paid_by = $2, updated_at = now()
       WHERE id = $3`,
      [paidAt, input.paid_by ?? input.created_by, expenseId],
    );
    await client.query(
      `UPDATE public.expense_splits SET paid = true WHERE expense_id = $1`,
      [expenseId],
    );
  }
}

async function seed(): Promise<void> {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const adminId = await ensureUser(DEMO_EMAIL, DEMO_PASSWORD, 'Javier Marroquín');
  const memberIds: Record<string, string> = { javier: adminId };

  for (const u of EXTRA_USERS) {
    memberIds[u.email.split('@')[0]!] = await ensureUser(u.email, u.password, u.fullName);
  }

  const { householdId, currency } = await withUserContext(adminId, async (client) => {
    const { rows: existing } = await client.query<{ id: string; currency: string }>(
      `SELECT h.id, h.currency FROM public.households h
       JOIN public.household_members hm ON hm.household_id = h.id
       WHERE hm.user_id = $1 AND hm.status = 'active'
       ORDER BY h.created_at ASC LIMIT 1`,
      [adminId],
    );

    let householdId: string;
    let currency: string;

    if (existing[0]) {
      householdId = existing[0].id;
      currency = existing[0].currency;
      await client.query(
        `UPDATE public.households
         SET name = $1, currency = 'USD', timezone = 'America/El_Salvador', envelope_mode_enabled = true
         WHERE id = $2`,
        ['Casa Hearth', householdId],
      );
      console.log('[seed:demo] reusing household', householdId);
    } else {
      const h = await createHousehold(client, adminId, {
        name: 'Casa Hearth',
        currency: 'USD',
        timezone: 'America/El_Salvador',
      });
      householdId = h.id;
      currency = h.currency;
      await client.query(
        `UPDATE public.households SET envelope_mode_enabled = true WHERE id = $1`,
        [householdId],
      );
      console.log('[seed:demo] created household', householdId);
    }

    await client.query(
      `UPDATE public.profiles SET default_household_id = $1 WHERE id = $2`,
      [householdId, adminId],
    );

    return { householdId, currency };
  });

  await clearHouseholdFinancials(householdId);

  await withUserContext(adminId, async (client) => {
    for (const u of EXTRA_USERS) {
      const uid = memberIds[u.email.split('@')[0]!]!;
      await client.query(
        `INSERT INTO public.household_members (household_id, user_id, role, status, joined_at)
         VALUES ($1, $2, $3, 'active', now())
         ON CONFLICT (household_id, user_id) DO UPDATE
           SET role = EXCLUDED.role, status = 'active'`,
        [householdId, uid, u.role],
      );
    }

    await client.query(
      `INSERT INTO public.household_members
         (household_id, user_id, role, status, invited_email, invited_at)
       VALUES ($1, NULL, $2, 'invited', $3, now())`,
      [householdId, PENDING_INVITE.role, PENDING_INVITE.email],
    );

    const budgets: Array<[string, number, boolean]> = [
      ['Vivienda', 1200, true],
      ['Alimentación', 600, false],
      ['Transporte', 350, false],
      ['Salud', 200, true],
      ['Educación', 150, false],
      ['Entretenimiento', 120, false],
      ['Servicios', 280, true],
      ['Otros', 100, false],
    ];
    for (const [name, budget, rollover] of budgets) {
      await client.query(
        `UPDATE public.categories
         SET monthly_budget = $1, rollover_enabled = $2
         WHERE household_id = $3 AND name = $4 AND type = 'expense'`,
        [budget, rollover, householdId, name],
      );
    }

    const cats = await loadCategories(client, householdId);
    const javier = memberIds.javier!;
    const maria = memberIds.maria!;
    const carlos = memberIds.carlos!;
    const allMembers = [javier, maria, carlos];

    // --- Incomes (12 months for trend chart + extras this month) ---
    for (let i = 11; i >= 0; i--) {
      const m = addMonths(monthStart, -i);
      await client.query(
        `INSERT INTO public.incomes
           (household_id, user_id, amount, currency, date, category_id, source, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          householdId,
          javier,
          4200,
          currency,
          iso(m),
          cats['Salario']!,
          'Main salary',
          null,
          adminId,
        ],
      );
      if (i % 2 === 0) {
        await client.query(
          `INSERT INTO public.incomes
             (household_id, user_id, amount, currency, date, category_id, source, notes, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            householdId,
            maria,
            850 + (11 - i) * 40,
            currency,
            iso(addDays(m, 2)),
            cats['Freelance']!,
            i === 0 ? 'UX project' : 'Consulting',
            null,
            adminId,
          ],
        );
      }
    }
    const incomeExtras: Array<[string, number, string, string, string]> = [
      [javier, 800, iso(addDays(monthStart, 10)), cats['Inversiones']!, 'Dividends'],
      [maria, 350, iso(addDays(today, -3)), cats['Otros ingresos']!, 'Online sale'],
    ];
    for (const [userId, amount, date, categoryId, source] of incomeExtras) {
      await client.query(
        `INSERT INTO public.incomes
           (household_id, user_id, amount, currency, date, category_id, source, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [householdId, userId, amount, currency, date, categoryId, source, null, adminId],
      );
    }

    // --- Expenses: paid vs pending vs overdue (current month, visible in UI) ---
    type ExpSeed = Parameters<typeof seedExpense>[1];

    const paidThisMonth: ExpSeed[] = [
      {
        household_id: householdId,
        created_by: adminId,
        paid_by: javier,
        amount: 1100,
        currency,
        date: iso(addDays(monthStart, 1)),
        due_date: iso(addDays(monthStart, 1)),
        category_id: cats['Vivienda'],
        type: 'fixed',
        status: 'paid',
        split_method: 'equal',
        description: 'Rent — paid',
        notes: 'Transfer confirmed',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        paid_by: maria,
        amount: 145,
        currency,
        date: iso(addDays(today, -7)),
        due_date: iso(addDays(today, -7)),
        category_id: cats['Servicios'],
        type: 'fixed',
        status: 'paid',
        split_method: 'equal',
        description: 'Electric bill — paid',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        paid_by: javier,
        amount: 185,
        currency,
        date: iso(addDays(today, -6)),
        due_date: iso(addDays(today, -6)),
        category_id: cats['Alimentación'],
        type: 'variable',
        status: 'paid',
        split_method: 'equal',
        description: 'Groceries — paid',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        paid_by: carlos,
        amount: 72,
        currency,
        date: iso(addDays(today, -5)),
        due_date: iso(addDays(today, -5)),
        category_id: cats['Alimentación'],
        type: 'variable',
        status: 'paid',
        split_method: 'equal',
        description: 'Local market — paid',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        paid_by: javier,
        amount: 65,
        currency,
        date: iso(addDays(today, -4)),
        due_date: iso(addDays(today, -4)),
        category_id: cats['Transporte'],
        type: 'variable',
        status: 'paid',
        split_method: 'equal',
        description: 'Gas — paid',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        paid_by: maria,
        amount: 42,
        currency,
        date: iso(addDays(today, -2)),
        due_date: iso(addDays(today, -2)),
        category_id: cats['Salud'],
        type: 'variable',
        status: 'paid',
        split_method: 'equal',
        description: 'Pharmacy — paid',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        paid_by: javier,
        amount: 28,
        currency,
        date: iso(addDays(monthStart, 5)),
        due_date: iso(addDays(monthStart, 5)),
        category_id: cats['Entretenimiento'],
        type: 'fixed',
        status: 'paid',
        split_method: 'equal',
        description: 'Netflix + Spotify — paid',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        paid_by: javier,
        amount: 320,
        currency,
        date: iso(addDays(monthStart, 8)),
        due_date: iso(addDays(monthStart, 8)),
        category_id: cats['Otros'],
        type: 'debt',
        status: 'paid',
        split_method: 'equal',
        description: 'Credit card — paid',
        split: { method: 'equal', participants: [{ userId: javier }] },
      },
      {
        household_id: householdId,
        created_by: adminId,
        paid_by: javier,
        amount: 450,
        currency,
        date: iso(addDays(today, -1)),
        due_date: iso(addDays(today, -1)),
        category_id: cats['Vivienda'],
        type: 'one_time',
        status: 'paid',
        split_method: 'custom',
        description: 'Washer repair — paid',
        notes: 'Split 50/30/20',
        split: {
          method: 'custom',
          participants: [
            { userId: javier, amount: 225 },
            { userId: maria, amount: 135 },
            { userId: carlos, amount: 90 },
          ],
        },
      },
      {
        household_id: householdId,
        created_by: adminId,
        paid_by: maria,
        amount: 55,
        currency,
        date: iso(addDays(today, -3)),
        due_date: iso(addDays(today, -3)),
        category_id: cats['Servicios'],
        type: 'fixed',
        status: 'paid',
        split_method: 'equal',
        description: 'Internet (last month) — paid',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
    ];

    for (const exp of paidThisMonth) {
      await seedExpense(client, exp);
    }

    // Previous month — paid only (history)
    const paidLastMonth: ExpSeed[] = [
      {
        household_id: householdId,
        created_by: adminId,
        paid_by: javier,
        amount: 1100,
        currency,
        date: iso(addDays(addMonths(monthStart, -1), 1)),
        due_date: iso(addDays(addMonths(monthStart, -1), 1)),
        category_id: cats['Vivienda'],
        type: 'fixed',
        status: 'paid',
        split_method: 'equal',
        description: 'May rent — paid',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        paid_by: javier,
        amount: 210,
        currency,
        date: iso(addDays(addMonths(monthStart, -1), 10)),
        due_date: iso(addDays(addMonths(monthStart, -1), 10)),
        category_id: cats['Transporte'],
        type: 'fixed',
        status: 'paid',
        split_method: 'equal',
        description: 'May car insurance — paid',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
    ];
    for (const exp of paidLastMonth) {
      await seedExpense(client, exp);
    }

    const pendingThisMonth: ExpSeed[] = [
      {
        household_id: householdId,
        created_by: adminId,
        amount: 55,
        currency,
        date: iso(addDays(today, 3)),
        due_date: iso(addDays(today, 3)),
        category_id: cats['Servicios'],
        type: 'fixed',
        status: 'pending',
        split_method: 'equal',
        description: 'Fiber internet — pending',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        amount: 95,
        currency,
        date: iso(addDays(today, 5)),
        due_date: iso(addDays(today, 5)),
        category_id: cats['Entretenimiento'],
        type: 'variable',
        status: 'pending',
        split_method: 'equal',
        description: 'Restaurant — pending',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        amount: 210,
        currency,
        date: iso(addDays(today, 9)),
        due_date: iso(addDays(today, 9)),
        category_id: cats['Transporte'],
        type: 'fixed',
        status: 'pending',
        split_method: 'equal',
        description: 'Car insurance — pending',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        amount: 380,
        currency,
        date: iso(addDays(today, 12)),
        due_date: iso(addDays(today, 12)),
        category_id: cats['Educación'],
        type: 'fixed',
        status: 'pending',
        split_method: 'equal',
        description: 'Tuition — pending',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        amount: 120,
        currency,
        date: iso(addDays(today, 1)),
        due_date: iso(addDays(today, 1)),
        category_id: cats['Salud'],
        type: 'variable',
        status: 'pending',
        split_method: 'equal',
        description: 'Doctor visit — pending',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        amount: 1500,
        currency,
        date: iso(addDays(today, 20)),
        due_date: iso(addDays(today, 20)),
        category_id: cats['Otros'],
        type: 'debt',
        status: 'pending',
        split_method: 'equal',
        description: 'Personal loan — pending',
        notes: 'Cuota mensual',
        split: { method: 'equal', participants: [{ userId: javier }] },
      },
    ];
    for (const exp of pendingThisMonth) {
      await seedExpense(client, exp);
    }

    const overdueExpenses: ExpSeed[] = [
      {
        household_id: householdId,
        created_by: adminId,
        amount: 78,
        currency,
        date: iso(addDays(today, -8)),
        due_date: iso(addDays(today, -5)),
        category_id: cats['Servicios'],
        type: 'fixed',
        status: 'overdue',
        split_method: 'equal',
        description: 'Water — overdue',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        amount: 165,
        currency,
        date: iso(addDays(today, -12)),
        due_date: iso(addDays(today, -7)),
        category_id: cats['Vivienda'],
        type: 'fixed',
        status: 'overdue',
        split_method: 'equal',
        description: 'HOA fee — overdue',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
      {
        household_id: householdId,
        created_by: adminId,
        amount: 49,
        currency,
        date: iso(addDays(today, -10)),
        due_date: iso(addDays(today, -4)),
        category_id: cats['Entretenimiento'],
        type: 'variable',
        status: 'overdue',
        split_method: 'equal',
        description: 'Movies + snacks — overdue',
        split: { method: 'equal', participants: [{ userId: carlos }] },
      },
    ];
    for (const exp of overdueExpenses) {
      await seedExpense(client, exp);
    }

    // --- Contributions: received vs pending vs overdue ---
    const contributions: Array<[string, number, string, string, string | null, string | null]> = [
      [maria, 400, iso(addDays(monthStart, 3)), 'received', iso(addDays(monthStart, 3)), 'March contribution — received'],
      [maria, 400, iso(addDays(monthStart, 18)), 'received', iso(addDays(monthStart, 18)), 'Biweekly contribution — received'],
      [carlos, 350, iso(addDays(monthStart, 5)), 'received', iso(addDays(monthStart, 6)), 'Initial contribution — received'],
      [carlos, 350, iso(addDays(today, 2)), 'pending', null, 'Biweekly contribution — pending'],
      [carlos, 350, iso(addDays(today, -10)), 'overdue', null, 'Past contribution — overdue'],
      [maria, 400, iso(addDays(today, 8)), 'pending', null, 'End-of-month contribution — pending'],
      [javier, 500, iso(addDays(today, 4)), 'pending', null, 'Admin contribution — pending'],
    ];
    for (const [userId, amount, expected, status, received, notes] of contributions) {
      await client.query(
        `INSERT INTO public.contributions
           (household_id, user_id, amount, currency, expected_date, received_date, status, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          householdId,
          userId,
          amount,
          currency,
          expected,
          received,
          status,
          notes,
          adminId,
        ],
      );
    }

    // --- Metas de ahorro ---
    const goals: Array<[string, number, number, string | null, string]> = [
      ['Emergency fund', 15000, 9750, iso(addMonths(today, 6)), 'active'],
      ['Europe vacation', 8000, 2400, iso(addMonths(today, 10)), 'active'],
      ['MacBook Pro', 2500, 2500, iso(addMonths(today, -2)), 'completed'],
      ['Kitchen remodel', 5000, 800, null, 'paused'],
    ];
    for (const [name, target, current, targetDate, status] of goals) {
      await client.query(
        `INSERT INTO public.savings_goals
           (household_id, name, target_amount, current_amount, target_date, category_id, status, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          householdId,
          name,
          target,
          current,
          targetDate,
          cats['Ahorro general'] ?? cats['Emergencias'] ?? null,
          status,
          'Demo goal for screenshots',
          adminId,
        ],
      );
    }

    // --- Calendar events (all types / statuses) ---
    const tz = (d: Date, h = 9) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0).toISOString();

    const calendarEvents: Array<[string, string, string, string, number | null, string]> = [
      ['Rent (paid)', 'expense', 'paid', tz(addDays(monthStart, 1)), 1100, '#16a34a'],
      ['Upcoming rent (pending)', 'expense', 'pending', tz(addDays(today, 1)), 1100, '#0ea5e9'],
      ['Javier salary (received)', 'income', 'paid', tz(addDays(today, -2)), 4200, '#16a34a'],
      ['Carlos contribution (pending)', 'contribution', 'contribution', tz(addDays(today, 2)), 350, '#eab308'],
      ['Agua (overdue)', 'expense', 'overdue', tz(addDays(today, -4)), 78, '#ef4444'],
      ['Internet (pending)', 'expense', 'pending', tz(addDays(today, 3)), 55, '#f97316'],
      ['Maria freelance (upcoming)', 'income', 'recurring', tz(addDays(today, 6)), 925, '#0d9488'],
      ['Goal: Emergency fund', 'goal', 'savings', tz(addDays(today, 7)), 500, '#8b5cf6'],
    ];
    for (const [title, eventType, status, startAt, amount, color] of calendarEvents) {
      await client.query(
        `INSERT INTO public.calendar_events
           (household_id, title, description, event_type, start_at, all_day, status, color, amount, user_id)
         VALUES ($1,$2,$3,$4,$5,false,$6,$7,$8,$9)`,
        [
          householdId,
          title,
          'Demo event — Casa Hearth',
          eventType,
          startAt,
          status,
          color,
          amount,
          eventType === 'income' ? maria : javier,
        ],
      );
    }

    // --- Recurring templates (weekly / biweekly / monthly) ---
    const recurringStart = iso(addMonths(monthStart, -2));
    await createRecurringTemplate(client, householdId, adminId, {
      kind: 'income',
      label: 'Javier salary',
      amount: 4200,
      frequency: 'monthly',
      start_date: recurringStart,
      end_date: '',
      category_id: cats['Salario'] ?? null,
      user_id: javier,
      source: 'Empresa Tech SA',
    }, currency);

    await createRecurringTemplate(client, householdId, adminId, {
      kind: 'income',
      label: 'Maria freelance',
      amount: 925,
      frequency: 'biweekly',
      start_date: recurringStart,
      end_date: '',
      category_id: cats['Freelance'] ?? null,
      user_id: maria,
      source: 'Freelance clients',
    }, currency);

    await createRecurringTemplate(client, householdId, adminId, {
      kind: 'expense',
      label: 'Rent',
      amount: 1100,
      frequency: 'monthly',
      start_date: recurringStart,
      end_date: '',
      category_id: cats['Vivienda'] ?? null,
      expense_type: 'fixed',
      split_method: 'equal',
    }, currency);

    await createRecurringTemplate(client, householdId, adminId, {
      kind: 'expense',
      label: 'Internet',
      amount: 55,
      frequency: 'biweekly',
      start_date: recurringStart,
      end_date: '',
      category_id: cats['Servicios'] ?? null,
      expense_type: 'fixed',
      split_method: 'equal',
    }, currency);

    await createRecurringTemplate(client, householdId, adminId, {
      kind: 'expense',
      label: 'Cleaning',
      amount: 40,
      frequency: 'weekly',
      start_date: recurringStart,
      end_date: '',
      category_id: cats['Servicios'] ?? null,
      expense_type: 'variable',
      split_method: 'equal',
    }, currency);

    await client.query(
      `DELETE FROM public.expense_splits
       WHERE expense_id IN (
         SELECT id FROM public.expenses
         WHERE household_id = $1 AND notes = 'Auto-generated'
       )`,
      [householdId],
    );
    await client.query(
      `DELETE FROM public.expenses
       WHERE household_id = $1 AND notes = 'Auto-generated'`,
      [householdId],
    );
    await client.query(
      `DELETE FROM public.incomes
       WHERE household_id = $1 AND notes = 'Auto-generated'`,
      [householdId],
    );

    console.log('[seed:demo] recurring templates ok; auto-generated rows removed');
    console.log('[seed:demo] financial data inserted');
  });

  // Notifications: insert without RLS user context (service-style)
  await withUserContext(null, async (client) => {
    const notifs: Array<[string, string, string, string, boolean]> = [
      [adminId, 'payment_reminder', 'Upcoming payment: Internet', 'Due in 3 days — $55.00', false],
      [adminId, 'expense_overdue', 'Overdue expense', 'Water (overdue) — $78.00', false],
      [memberIds.maria!, 'contribution_due', 'Pending contribution', 'Your $400 contribution is due soon', false],
      [memberIds.carlos!, 'contribution_overdue', 'Overdue contribution', 'You have an overdue $350 contribution', true],
      [adminId, 'goal_progress', 'Goal at 65%', 'Emergency fund — sigue así', true],
      [adminId, 'member_invite', 'Invitation sent', `You invited ${PENDING_INVITE.email}`, true],
    ];
    for (const [userId, type, title, message, read] of notifs) {
      await client.query(
        `INSERT INTO public.notifications
           (household_id, user_id, type, title, message, read, read_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          householdId,
          userId,
          type,
          title,
          message,
          read,
          read ? new Date().toISOString() : null,
        ],
      );
    }
    console.log('[seed:demo] notifications inserted');
  });

  console.log('\n[seed:demo] ✓ Screenshot-ready dataset loaded');
  console.log('  Household: Casa Hearth (USD, envelope mode on)');
  console.log('  Login: demo@local.dev / demo1234');
  console.log('  Extra members: maria@, carlos@, ana@ (demo1234)');
  console.log('  Pending invitation:', PENDING_INVITE.email);
  console.log('  Income: 12-month salary + freelance + extras (current month)');
  console.log('  Expenses: ~10 paid, ~6 pending, ~3 overdue (current month)');
  console.log('  Contributions: 3 received, 3 pending, 1 overdue');
  console.log('  Recurring: templates without auto-generate (use Generate dates in Schedules)');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed:demo] failed', err);
    process.exit(1);
  });

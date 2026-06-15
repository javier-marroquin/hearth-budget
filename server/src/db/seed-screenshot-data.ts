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
        `UPDATE public.profiles SET full_name = $1, locale = 'es' WHERE id = $2`,
        [fullName, existing.id],
      );
      return existing.id;
    }
    const { user } = await createUserWithProfile(client, {
      email,
      password,
      fullName,
      locale: 'es',
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
          'Salario principal',
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
            i === 0 ? 'Proyecto UX' : 'Consultoría',
            null,
            adminId,
          ],
        );
      }
    }
    const incomeExtras: Array<[string, number, string, string, string]> = [
      [javier, 800, iso(addDays(monthStart, 10)), cats['Inversiones']!, 'Dividendos'],
      [maria, 350, iso(addDays(today, -3)), cats['Otros ingresos']!, 'Venta en línea'],
    ];
    for (const [userId, amount, date, categoryId, source] of incomeExtras) {
      await client.query(
        `INSERT INTO public.incomes
           (household_id, user_id, amount, currency, date, category_id, source, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [householdId, userId, amount, currency, date, categoryId, source, null, adminId],
      );
    }

    // --- Expenses: pagados vs pendientes vs vencidos (mes actual, visibles en UI) ---
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
        description: 'Alquiler — pagado',
        notes: 'Transferencia confirmada',
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
        description: 'Luz eléctrica — pagado',
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
        description: 'Supermercado — pagado',
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
        description: 'Mercado local — pagado',
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
        description: 'Gasolina — pagado',
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
        description: 'Farmacia — pagado',
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
        description: 'Netflix + Spotify — pagado',
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
        description: 'Tarjeta de crédito — pagado',
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
        description: 'Reparación lavadora — pagado',
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
        description: 'Internet (mes anterior) — pagado',
        split: { method: 'equal', participants: allMembers.map((userId) => ({ userId })) },
      },
    ];

    for (const exp of paidThisMonth) {
      await seedExpense(client, exp);
    }

    // Mes anterior — solo pagados (historial)
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
        description: 'Alquiler mayo — pagado',
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
        description: 'Seguro vehículo mayo — pagado',
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
        description: 'Internet fibra — pendiente',
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
        description: 'Restaurante — pendiente',
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
        description: 'Seguro vehículo — pendiente',
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
        description: 'Colegiatura — pendiente',
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
        description: 'Consulta médica — pendiente',
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
        description: 'Préstamo personal — pendiente',
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
        description: 'Agua — vencido',
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
        description: 'Condominio — vencido',
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
        description: 'Cine + snacks — vencido',
        split: { method: 'equal', participants: [{ userId: carlos }] },
      },
    ];
    for (const exp of overdueExpenses) {
      await seedExpense(client, exp);
    }

    // --- Contributions: recibidos vs pendientes vs vencidos ---
    const contributions: Array<[string, number, string, string, string | null, string | null]> = [
      [maria, 400, iso(addDays(monthStart, 3)), 'received', iso(addDays(monthStart, 3)), 'Aporte marzo — recibido'],
      [maria, 400, iso(addDays(monthStart, 18)), 'received', iso(addDays(monthStart, 18)), 'Aporte quincenal — recibido'],
      [carlos, 350, iso(addDays(monthStart, 5)), 'received', iso(addDays(monthStart, 6)), 'Aporte inicial — recibido'],
      [carlos, 350, iso(addDays(today, 2)), 'pending', null, 'Aporte quincenal — pendiente'],
      [carlos, 350, iso(addDays(today, -10)), 'overdue', null, 'Aporte anterior — vencido'],
      [maria, 400, iso(addDays(today, 8)), 'pending', null, 'Aporte fin de mes — pendiente'],
      [javier, 500, iso(addDays(today, 4)), 'pending', null, 'Aporte administrador — pendiente'],
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
      ['Fondo de emergencia', 15000, 9750, iso(addMonths(today, 6)), 'active'],
      ['Vacaciones Europa', 8000, 2400, iso(addMonths(today, 10)), 'active'],
      ['MacBook Pro', 2500, 2500, iso(addMonths(today, -2)), 'completed'],
      ['Renovación cocina', 5000, 800, null, 'paused'],
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
          'Meta demo para capturas',
          adminId,
        ],
      );
    }

    // --- Calendar events (all types / statuses) ---
    const tz = (d: Date, h = 9) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0).toISOString();

    const calendarEvents: Array<[string, string, string, string, number | null, string]> = [
      ['Alquiler (pagado)', 'expense', 'paid', tz(addDays(monthStart, 1)), 1100, '#16a34a'],
      ['Alquiler próximo (pendiente)', 'expense', 'pending', tz(addDays(today, 1)), 1100, '#0ea5e9'],
      ['Salario Javier (recibido)', 'income', 'paid', tz(addDays(today, -2)), 4200, '#16a34a'],
      ['Aporte Carlos (pendiente)', 'contribution', 'contribution', tz(addDays(today, 2)), 350, '#eab308'],
      ['Agua (vencido)', 'expense', 'overdue', tz(addDays(today, -4)), 78, '#ef4444'],
      ['Internet (pendiente)', 'expense', 'pending', tz(addDays(today, 3)), 55, '#f97316'],
      ['Freelance María (próximo)', 'income', 'recurring', tz(addDays(today, 6)), 925, '#0d9488'],
      ['Meta: Fondo emergencia', 'goal', 'savings', tz(addDays(today, 7)), 500, '#8b5cf6'],
    ];
    for (const [title, eventType, status, startAt, amount, color] of calendarEvents) {
      await client.query(
        `INSERT INTO public.calendar_events
           (household_id, title, description, event_type, start_at, all_day, status, color, amount, user_id)
         VALUES ($1,$2,$3,$4,$5,false,$6,$7,$8,$9)`,
        [
          householdId,
          title,
          'Evento demo — Casa Hearth',
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
      label: 'Salario Javier',
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
      label: 'Freelance María',
      amount: 925,
      frequency: 'biweekly',
      start_date: recurringStart,
      end_date: '',
      category_id: cats['Freelance'] ?? null,
      user_id: maria,
      source: 'Clientes freelance',
    }, currency);

    await createRecurringTemplate(client, householdId, adminId, {
      kind: 'expense',
      label: 'Alquiler',
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
      label: 'Limpieza',
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
         WHERE household_id = $1 AND notes = 'Generado automáticamente'
       )`,
      [householdId],
    );
    await client.query(
      `DELETE FROM public.expenses
       WHERE household_id = $1 AND notes = 'Generado automáticamente'`,
      [householdId],
    );
    await client.query(
      `DELETE FROM public.incomes
       WHERE household_id = $1 AND notes = 'Generado automáticamente'`,
      [householdId],
    );

    console.log('[seed:demo] recurring templates ok; auto-generated rows removed');
    console.log('[seed:demo] financial data inserted');
  });

  // Notifications: insert without RLS user context (service-style)
  await withUserContext(null, async (client) => {
    const notifs: Array<[string, string, string, string, boolean]> = [
      [adminId, 'payment_reminder', 'Pago próximo: Internet', 'Vence en 3 días — $55.00', false],
      [adminId, 'expense_overdue', 'Gasto vencido', 'Agua (vencida) — $78.00', false],
      [memberIds.maria!, 'contribution_due', 'Aporte pendiente', 'Tu aporte de $400 vence pronto', false],
      [memberIds.carlos!, 'contribution_overdue', 'Aporte atrasado', 'Tienes un aporte vencido de $350', true],
      [adminId, 'goal_progress', 'Meta al 65%', 'Fondo de emergencia — sigue así', true],
      [adminId, 'member_invite', 'Invitación enviada', `Invitaste a ${PENDING_INVITE.email}`, true],
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

  console.log('\n[seed:demo] ✓ Dataset listo para capturas');
  console.log('  Hogar: Casa Hearth (USD, sobres activos)');
  console.log('  Login: demo@local.dev / demo1234');
  console.log('  Miembros extra: maria@, carlos@, ana@ (demo1234)');
  console.log('  Invitación pendiente:', PENDING_INVITE.email);
  console.log('  Ingresos: salario 12 meses + freelance + extras (mes actual)');
  console.log('  Gastos: ~10 pagados, ~6 pendientes, ~3 vencidos (mes actual)');
  console.log('  Aportes: 3 recibidos, 3 pendientes, 1 vencido');
  console.log('  Fijos: plantillas sin auto-generar (botón "Generar fechas" en Pagos programados)');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed:demo] failed', err);
    process.exit(1);
  });

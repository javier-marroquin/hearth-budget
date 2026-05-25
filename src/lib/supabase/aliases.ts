/**
 * Row / enum aliases on top of the auto-generated `database.types.ts`.
 *
 * This file is HAND-WRITTEN and safe to keep across re-runs of
 *   `supabase gen types typescript --linked > database.types.ts`
 *
 * The generated file only exports `Database`, `Tables<>`, `TablesInsert<>`,
 * `TablesUpdate<>` and `Enums<>`. Here we project them into per-entity names
 * used across the codebase.
 */

import type { Database, Tables, TablesInsert, TablesUpdate, Enums } from './database.types';

export type { Database, Tables, TablesInsert, TablesUpdate, Enums };

// --- Row aliases -----------------------------------------------------------
export type ProfileRow = Tables<'profiles'>;
export type HouseholdRow = Tables<'households'>;
export type HouseholdMemberRow = Tables<'household_members'>;
export type CategoryRow = Tables<'categories'>;
export type IncomeRow = Tables<'incomes'>;
export type ExpenseRow = Tables<'expenses'>;
export type ExpenseSplitRow = Tables<'expense_splits'>;
export type ContributionRow = Tables<'contributions'>;
export type SavingsGoalRow = Tables<'savings_goals'>;
export type CalendarEventRow = Tables<'calendar_events'>;
export type RecurringRuleRow = Tables<'recurring_rules'>;
export type PaymentStatusRow = Tables<'payment_statuses'>;
export type NotificationRow = Tables<'notifications'>;
export type AuditLogRow = Tables<'audit_logs'>;

// --- Insert / Update helpers ----------------------------------------------
export type ProfileInsert = TablesInsert<'profiles'>;
export type HouseholdInsert = TablesInsert<'households'>;
export type CategoryInsert = TablesInsert<'categories'>;
export type IncomeInsert = TablesInsert<'incomes'>;
export type ExpenseInsert = TablesInsert<'expenses'>;
export type ContributionInsert = TablesInsert<'contributions'>;
export type SavingsGoalInsert = TablesInsert<'savings_goals'>;
export type CalendarEventInsert = TablesInsert<'calendar_events'>;
export type NotificationInsert = TablesInsert<'notifications'>;

// --- Enum aliases ----------------------------------------------------------
export type HouseholdRole = Enums<'household_role'>;
export type MemberStatus = Enums<'member_status'>;
export type CategoryType = Enums<'category_type'>;
export type ExpenseType = Enums<'expense_type'>;
export type PaymentStatus = Enums<'payment_status'>;
export type ContributionStatus = Enums<'contribution_status'>;
export type GoalStatus = Enums<'goal_status'>;
export type SplitMethod = Enums<'split_method'>;
export type CalendarEventType = Enums<'calendar_event_type'>;
export type CalendarEventStatus = Enums<'calendar_event_status'>;
export type RecurrenceFrequency = Enums<'recurrence_frequency'>;

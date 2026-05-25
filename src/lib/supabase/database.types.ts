/**
 * Database types for Supabase.
 *
 * Hand-written to match `supabase gen types typescript` output format.
 * Once your project is live regenerate with:
 *   supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 *
 * Keep this in sync with `supabase/migrations/*.sql`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type HouseholdRole = 'admin' | 'familiar' | 'inquilino' | 'invitado';
export type MemberStatus = 'active' | 'invited' | 'removed';
export type CategoryType = 'income' | 'expense' | 'savings';
export type ExpenseType = 'fixed' | 'variable' | 'debt' | 'one_time';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';
export type ContributionStatus = 'pending' | 'received' | 'overdue';
export type GoalStatus = 'active' | 'completed' | 'paused';
export type SplitMethod = 'equal' | 'percentage' | 'income_based' | 'custom';
export type CalendarEventType =
  | 'expense'
  | 'income'
  | 'contribution'
  | 'goal'
  | 'reminder';
export type CalendarEventStatus =
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'recurring'
  | 'contribution'
  | 'savings'
  | 'completed';
export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          default_household_id: string | null;
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          default_household_id?: string | null;
          locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          default_household_id?: string | null;
          locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          currency: string;
          timezone: string;
          envelope_mode_enabled: boolean;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          currency?: string;
          timezone?: string;
          envelope_mode_enabled?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          currency?: string;
          timezone?: string;
          envelope_mode_enabled?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string | null;
          role: HouseholdRole;
          share_percentage: number | null;
          status: MemberStatus;
          invited_email: string | null;
          invited_at: string | null;
          joined_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id?: string | null;
          role?: HouseholdRole;
          share_percentage?: number | null;
          status?: MemberStatus;
          invited_email?: string | null;
          invited_at?: string | null;
          joined_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string | null;
          role?: HouseholdRole;
          share_percentage?: number | null;
          status?: MemberStatus;
          invited_email?: string | null;
          invited_at?: string | null;
          joined_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          type: CategoryType;
          color: string;
          icon: string;
          is_system: boolean;
          parent_id: string | null;
          monthly_budget: number | null;
          rollover_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          type: CategoryType;
          color?: string;
          icon?: string;
          is_system?: boolean;
          parent_id?: string | null;
          monthly_budget?: number | null;
          rollover_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          type?: CategoryType;
          color?: string;
          icon?: string;
          is_system?: boolean;
          parent_id?: string | null;
          monthly_budget?: number | null;
          rollover_enabled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      incomes: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          amount: number;
          currency: string;
          date: string;
          category_id: string | null;
          source: string | null;
          is_recurring: boolean;
          recurring_rule_id: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          amount: number;
          currency: string;
          date: string;
          category_id?: string | null;
          source?: string | null;
          is_recurring?: boolean;
          recurring_rule_id?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['incomes']['Insert']>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          household_id: string;
          amount: number;
          currency: string;
          date: string;
          due_date: string | null;
          category_id: string | null;
          type: ExpenseType;
          status: PaymentStatus;
          paid_at: string | null;
          paid_by: string | null;
          split_method: SplitMethod;
          is_recurring: boolean;
          recurring_rule_id: string | null;
          description: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          amount: number;
          currency: string;
          date: string;
          due_date?: string | null;
          category_id?: string | null;
          type: ExpenseType;
          status?: PaymentStatus;
          paid_at?: string | null;
          paid_by?: string | null;
          split_method?: SplitMethod;
          is_recurring?: boolean;
          recurring_rule_id?: string | null;
          description?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
        Relationships: [];
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          user_id: string;
          amount: number;
          percentage: number | null;
          paid: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          user_id: string;
          amount: number;
          percentage?: number | null;
          paid?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['expense_splits']['Insert']>;
        Relationships: [];
      };
      contributions: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          amount: number;
          currency: string;
          expected_date: string;
          received_date: string | null;
          status: ContributionStatus;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          amount: number;
          currency: string;
          expected_date: string;
          received_date?: string | null;
          status?: ContributionStatus;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contributions']['Insert']>;
        Relationships: [];
      };
      savings_goals: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          target_date: string | null;
          category_id: string | null;
          status: GoalStatus;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          target_date?: string | null;
          category_id?: string | null;
          status?: GoalStatus;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['savings_goals']['Insert']>;
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          description: string | null;
          event_type: CalendarEventType;
          related_id: string | null;
          related_type: string | null;
          start_at: string;
          end_at: string | null;
          all_day: boolean;
          status: CalendarEventStatus;
          color: string | null;
          recurring_rule_id: string | null;
          user_id: string | null;
          amount: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          description?: string | null;
          event_type: CalendarEventType;
          related_id?: string | null;
          related_type?: string | null;
          start_at: string;
          end_at?: string | null;
          all_day?: boolean;
          status?: CalendarEventStatus;
          color?: string | null;
          recurring_rule_id?: string | null;
          user_id?: string | null;
          amount?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['calendar_events']['Insert']>;
        Relationships: [];
      };
      recurring_rules: {
        Row: {
          id: string;
          household_id: string;
          frequency: RecurrenceFrequency;
          interval: number;
          day_of_month: number | null;
          day_of_week: number | null;
          start_date: string;
          end_date: string | null;
          occurrences: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          frequency: RecurrenceFrequency;
          interval?: number;
          day_of_month?: number | null;
          day_of_week?: number | null;
          start_date: string;
          end_date?: string | null;
          occurrences?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['recurring_rules']['Insert']>;
        Relationships: [];
      };
      payment_statuses: {
        Row: {
          id: string;
          household_id: string;
          entity_type: string;
          entity_id: string;
          previous_status: string | null;
          new_status: string;
          changed_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          entity_type: string;
          entity_id: string;
          previous_status?: string | null;
          new_status: string;
          changed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payment_statuses']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          related_id: string | null;
          related_type: string | null;
          read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          related_id?: string | null;
          related_type?: string | null;
          read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          household_id: string | null;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          changes: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string | null;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          changes?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      household_role: HouseholdRole;
      member_status: MemberStatus;
      category_type: CategoryType;
      expense_type: ExpenseType;
      payment_status: PaymentStatus;
      contribution_status: ContributionStatus;
      goal_status: GoalStatus;
      split_method: SplitMethod;
      calendar_event_type: CalendarEventType;
      calendar_event_status: CalendarEventStatus;
      recurrence_frequency: RecurrenceFrequency;
    };
    CompositeTypes: Record<string, never>;
  };
}

// --- Convenience aliases ----------------------------------------------------
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Row type aliases (one per table)
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

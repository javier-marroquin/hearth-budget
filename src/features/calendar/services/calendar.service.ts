import { supabase } from '@/lib/supabase/client';
import type {
  CalendarEventRow,
  CalendarEventStatus,
  CalendarEventType,
} from '@/lib/supabase/aliases';

export interface CalendarEventFilters {
  householdId: string;
  from?: string; // ISO timestamp
  to?: string;
  userId?: string;
  status?: CalendarEventStatus;
  eventType?: CalendarEventType;
}

export async function listCalendarEvents(
  filters: CalendarEventFilters,
): Promise<CalendarEventRow[]> {
  let q = supabase
    .from('calendar_events')
    .select('*')
    .eq('household_id', filters.householdId)
    .order('start_at');
  if (filters.from) q = q.gte('start_at', filters.from);
  if (filters.to) q = q.lte('start_at', filters.to);
  if (filters.userId) q = q.eq('user_id', filters.userId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.eventType) q = q.eq('event_type', filters.eventType);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export interface CreateCalendarEventInput {
  household_id: string;
  title: string;
  description?: string | null;
  event_type: CalendarEventType;
  start_at: string;
  end_at?: string | null;
  all_day?: boolean;
  status?: CalendarEventStatus;
  user_id?: string | null;
  amount?: number | null;
  color?: string | null;
  related_id?: string | null;
  related_type?: string | null;
}

export async function createCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<CalendarEventRow> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      household_id: input.household_id,
      title: input.title,
      description: input.description ?? null,
      event_type: input.event_type,
      start_at: input.start_at,
      end_at: input.end_at ?? null,
      all_day: input.all_day ?? true,
      status: input.status ?? 'pending',
      user_id: input.user_id ?? null,
      amount: input.amount ?? null,
      color: input.color ?? null,
      related_id: input.related_id ?? null,
      related_type: input.related_type ?? null,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create event');
  return data;
}

export async function updateCalendarEvent(
  id: string,
  patch: Partial<CreateCalendarEventInput> & { start_at?: string; end_at?: string | null },
): Promise<CalendarEventRow> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to update event');
  return data;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) throw error;
}

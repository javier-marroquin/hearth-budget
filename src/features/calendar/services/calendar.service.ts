import { apiFetch } from '@/lib/api/client';
import type {
  CalendarEventRow,
  CalendarEventStatus,
  CalendarEventType,
} from '@/lib/db/aliases';

export interface CalendarEventFilters {
  householdId: string;
  from?: string;
  to?: string;
  userId?: string;
  status?: CalendarEventStatus;
  eventType?: CalendarEventType;
}

function queryString(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export async function listCalendarEvents(
  filters: CalendarEventFilters,
): Promise<CalendarEventRow[]> {
  return apiFetch(
    `/api/households/${filters.householdId}/calendar-events${queryString({
      from: filters.from,
      to: filters.to,
      userId: filters.userId,
      status: filters.status,
      eventType: filters.eventType,
    })}`,
  );
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
  const { household_id, ...body } = input;
  return apiFetch(`/api/households/${household_id}/calendar-events`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateCalendarEvent(
  id: string,
  patch: Partial<CreateCalendarEventInput> & { start_at?: string; end_at?: string | null },
): Promise<CalendarEventRow> {
  return apiFetch(`/api/calendar-events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await apiFetch(`/api/calendar-events/${id}`, { method: 'DELETE' });
}

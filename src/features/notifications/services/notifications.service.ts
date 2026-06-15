import { apiFetch } from '@/lib/api/client';
import type { NotificationRow } from '@/lib/db/aliases';

export async function listMyNotifications(householdId: string): Promise<NotificationRow[]> {
  return apiFetch(`/api/households/${householdId}/notifications`);
}

export async function markAllRead(householdId: string): Promise<void> {
  await apiFetch(`/api/households/${householdId}/notifications/mark-all-read`, {
    method: 'POST',
  });
}

export async function markOneRead(id: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}/mark-read`, { method: 'POST' });
}

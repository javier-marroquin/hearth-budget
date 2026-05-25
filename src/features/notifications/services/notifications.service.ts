import { supabase } from '@/lib/supabase/client';
import type { NotificationRow } from '@/lib/supabase/aliases';
import { useAuthStore } from '@/features/auth/stores/auth.store';

export async function listMyNotifications(householdId: string): Promise<NotificationRow[]> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markAllRead(householdId: string): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

export async function markOneRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Escape hatch: untyped Supabase client to use ONLY for tables / columns that
 * aren't yet in the auto-generated `database.types.ts`.
 *
 * Current usage: `recurring_templates` + the `recurring_template_id`
 * columns on `incomes` / `expenses` (migration 0008).
 *
 * Once you run `supabase gen types typescript --linked > database.types.ts`
 * you can switch back to the strongly-typed `supabase` client.
 */

import { supabase as base } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseUntyped = base as unknown as SupabaseClient<any, 'public', any>;

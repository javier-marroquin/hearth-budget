import { create } from 'zustand';

/**
 * Minimal auth user shape. We avoid coupling to `@supabase/supabase-js`
 * types here so this file can be imported anywhere.
 */
export interface AuthUser {
  id: string;
  email: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  /** True while we're checking the existing session on first load. */
  initializing: boolean;
  setUser: (user: AuthUser | null) => void;
  setInitializing: (value: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initializing: true,
  setUser: (user) => set({ user }),
  setInitializing: (value) => set({ initializing: value }),
  reset: () => set({ user: null, initializing: false }),
}));

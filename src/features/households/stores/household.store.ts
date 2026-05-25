import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type HouseholdRole = 'admin' | 'familiar' | 'inquilino' | 'invitado';

export interface Household {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  envelope_mode_enabled?: boolean;
}

export interface HouseholdMembership {
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  share_percentage: number | null;
  status: 'active' | 'invited' | 'removed';
}

interface HouseholdState {
  activeHousehold: Household | null;
  membership: HouseholdMembership | null;
  households: Household[];
  setActiveHousehold: (household: Household | null) => void;
  setMembership: (membership: HouseholdMembership | null) => void;
  setHouseholds: (households: Household[]) => void;
  reset: () => void;
}

export const useHouseholdStore = create<HouseholdState>()(
  persist(
    (set) => ({
      activeHousehold: null,
      membership: null,
      households: [],
      setActiveHousehold: (household) => set({ activeHousehold: household }),
      setMembership: (membership) => set({ membership }),
      setHouseholds: (households) => set({ households }),
      reset: () => set({ activeHousehold: null, membership: null, households: [] }),
    }),
    {
      name: 'household-budget:household',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeHousehold: state.activeHousehold }),
    },
  ),
);

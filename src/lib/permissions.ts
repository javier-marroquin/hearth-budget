import type { HouseholdRole } from '@/features/households/stores/household.store';

/**
 * Centralised permission helpers. Authorisation is enforced on the API;
 * these are only for UX (hiding buttons, disabling inputs).
 */
export const Permissions = {
  canViewData: (_role: HouseholdRole | null | undefined): boolean => true,

  canWriteExpenses: (role: HouseholdRole | null | undefined): boolean =>
    role === 'admin' || role === 'familiar' || role === 'inquilino',

  canWriteIncomes: (role: HouseholdRole | null | undefined): boolean =>
    role === 'admin' || role === 'familiar' || role === 'inquilino',

  canManageCategories: (role: HouseholdRole | null | undefined): boolean =>
    role === 'admin' || role === 'familiar',

  canInviteMembers: (role: HouseholdRole | null | undefined): boolean =>
    role === 'admin',

  canManageMembers: (role: HouseholdRole | null | undefined): boolean =>
    role === 'admin',

  canEditHousehold: (role: HouseholdRole | null | undefined): boolean =>
    role === 'admin',

  canDeleteHousehold: (role: HouseholdRole | null | undefined): boolean =>
    role === 'admin',

  isReadOnly: (role: HouseholdRole | null | undefined): boolean =>
    role === 'invitado',
};

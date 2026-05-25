import { useHouseholdStore } from '@/features/households/stores/household.store';
import { Permissions } from '@/lib/permissions';

/**
 * UX-level permission checks. Always consider RLS the actual gate.
 */
export function usePermissions() {
  const role = useHouseholdStore((s) => s.membership?.role ?? null);

  return {
    role,
    canViewData: Permissions.canViewData(role),
    canWriteExpenses: Permissions.canWriteExpenses(role),
    canWriteIncomes: Permissions.canWriteIncomes(role),
    canManageCategories: Permissions.canManageCategories(role),
    canInviteMembers: Permissions.canInviteMembers(role),
    canManageMembers: Permissions.canManageMembers(role),
    canEditHousehold: Permissions.canEditHousehold(role),
    canDeleteHousehold: Permissions.canDeleteHousehold(role),
    isReadOnly: Permissions.isReadOnly(role),
  };
}

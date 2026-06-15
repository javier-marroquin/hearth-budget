import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useHouseholdStore } from '../stores/household.store';
import { updateMyProfile } from '@/features/auth/services/auth.service';
import type { OnboardingInput } from '@/schemas/onboarding.schema';
import {
  createHousehold,
  listMyHouseholds,
  listMembers,
} from '../services/households.service';

const QK = {
  myHouseholds: ['households', 'mine'] as const,
  members: (id: string) => ['households', id, 'members'] as const,
};

/**
 * Load all households the current user is a member of. Hydrates the household
 * store with the list + active selection on first load.
 */
export function useMyHouseholds() {
  const user = useAuthStore((s) => s.user);
  const { setHouseholds, setActiveHousehold, setMembership, activeHousehold } =
    useHouseholdStore();

  const query = useQuery({
    queryKey: QK.myHouseholds,
    queryFn: listMyHouseholds,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!query.data) return;
    const households = query.data.map((r) => r.household);
    setHouseholds(households);

    if (households.length === 0) {
      setActiveHousehold(null);
      setMembership(null);
      return;
    }

    // Keep existing selection if still valid; otherwise pick the first.
    const stillValid = activeHousehold
      ? households.find((h) => h.id === activeHousehold.id)
      : undefined;
    const selectedHousehold = stillValid ?? households[0];
    const selectedRow =
      query.data.find((r) => r.household.id === selectedHousehold!.id) ??
      query.data[0];

    if (selectedHousehold && selectedRow) {
      setActiveHousehold(selectedHousehold);
      setMembership(selectedRow.membership);
    }
  }, [query.data, setHouseholds, setActiveHousehold, setMembership, activeHousehold]);

  return query;
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async (input: OnboardingInput) => {
      if (!user) throw new Error('Not authenticated');
      await updateMyProfile({ fullName: input.fullName });
      const household = await createHousehold({
        name: input.name,
        currency: input.currency,
        timezone: input.timezone,
        ownerId: user.id,
      });
      return { household, fullName: input.fullName.trim() };
    },
    onSuccess: async ({ fullName }) => {
      if (user) {
        setUser({ ...user, full_name: fullName });
      }
      await queryClient.invalidateQueries({ queryKey: ['households'] });
      toast.success(i18n.t('toast.household_created'));
      navigate('/dashboard', { replace: true });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? t('common.error'));
    },
  });
}

export function useHouseholdMembers(householdId: string | null | undefined) {
  return useQuery({
    queryKey: householdId ? QK.members(householdId) : ['households', 'none', 'members'],
    queryFn: () => listMembers(householdId!),
    enabled: Boolean(householdId),
  });
}

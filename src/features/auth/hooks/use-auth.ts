import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth.store';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import {
  sendMagicLink,
  signOut as supabaseSignOut,
  updateMyProfile,
} from '../services/auth.service';
import { getAuthErrorMessage } from '../utils/auth-errors';

export function useAuth() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const resetAuth = useAuthStore((s) => s.reset);
  const resetHousehold = useHouseholdStore((s) => s.reset);

  const magicLink = useMutation({
    mutationFn: sendMagicLink,
    onSuccess: (_data, variables) => {
      navigate(`/auth/check-email?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (error: Error) => {
      toast.error(getAuthErrorMessage(error, t));
    },
  });

  const updateProfile = useMutation({
    mutationFn: (fullName: string) => updateMyProfile({ fullName }),
    onSuccess: (result) => {
      const current = useAuthStore.getState().user;
      if (current) {
        useAuthStore.getState().setUser({
          ...current,
          full_name: result.full_name,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['households'] });
      toast.success(t('settings.profile_saved'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.error'));
    },
  });

  const signOut = async () => {
    try {
      await supabaseSignOut();
    } catch (err) {
      console.warn('[auth] signOut error', err);
    } finally {
      resetAuth();
      resetHousehold();
      navigate('/login', { replace: true });
    }
  };

  return {
    sendMagicLink: magicLink.mutate,
    isSendingMagicLink: magicLink.isPending,
    updateProfile: updateProfile.mutate,
    isUpdatingProfile: updateProfile.isPending,
    signOut,
  };
}

import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth.store';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import {
  signInWithPassword,
  signUpWithPassword,
  signOut as authSignOut,
  updateMyProfile,
} from '../services/auth.service';
import { getAuthErrorMessage } from '../utils/auth-errors';

function postAuthPath(inviteToken?: string): string {
  if (inviteToken) {
    return `/invite?token=${encodeURIComponent(inviteToken)}`;
  }
  return '/onboarding';
}

export function useAuth() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const resetAuth = useAuthStore((s) => s.reset);
  const resetHousehold = useHouseholdStore((s) => s.reset);

  const signIn = useMutation({
    mutationFn: ({
      email,
      password,
    }: {
      email: string;
      password: string;
      inviteToken?: string;
    }) => signInWithPassword({ email, password }),
    onSuccess: (data, variables) => {
      useAuthStore.getState().setUser(data.user);
      navigate(postAuthPath(variables.inviteToken), { replace: true });
    },
    onError: (error: Error) => {
      toast.error(getAuthErrorMessage(error, t));
    },
  });

  const signUp = useMutation({
    mutationFn: ({
      email,
      password,
      fullName,
      inviteToken,
    }: {
      email: string;
      password: string;
      fullName?: string;
      inviteToken?: string;
    }) => signUpWithPassword({ email, password, fullName, inviteToken }),
    onSuccess: (data, variables) => {
      if (data.session) {
        useAuthStore.getState().setUser(data.user);
        navigate(postAuthPath(variables.inviteToken), { replace: true });
        return;
      }
      navigate(
        `/auth/check-email?email=${encodeURIComponent(variables.email)}`,
        { replace: true },
      );
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
      await authSignOut();
    } catch (err) {
      console.warn('[auth] signOut error', err);
    } finally {
      resetAuth();
      resetHousehold();
      navigate('/login', { replace: true });
    }
  };

  return {
    signIn: signIn.mutate,
    isSigningIn: signIn.isPending,
    signUp: signUp.mutate,
    isSigningUp: signUp.isPending,
    updateProfile: updateProfile.mutate,
    isUpdatingProfile: updateProfile.isPending,
    signOut,
  };
}

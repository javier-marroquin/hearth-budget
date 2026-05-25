import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth.store';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { sendMagicLink, signOut as supabaseSignOut } from '../services/auth.service';

export function useAuth() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const resetAuth = useAuthStore((s) => s.reset);
  const resetHousehold = useHouseholdStore((s) => s.reset);

  const magicLink = useMutation({
    mutationFn: sendMagicLink,
    onSuccess: (_data, variables) => {
      navigate(`/auth/check-email?email=${encodeURIComponent(variables.email)}`);
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
    signOut,
  };
}

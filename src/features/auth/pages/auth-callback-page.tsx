import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { FullScreenLoader } from '@/components/layout/full-screen-loader';
import { resolveCallbackSession } from '../services/auth.service';

/**
 * Handles the Magic Link redirect from Supabase.
 *
 * The Supabase JS client (with `detectSessionInUrl: true`) consumes the
 * token in the URL hash automatically as soon as it's instantiated. We just
 * wait for the session to be present and then redirect to /onboarding or
 * /dashboard depending on whether the user has any household.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const inviteToken = params.get('invite');
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying');

  useEffect(() => {
    let cancelled = false;

    const finishRedirect = async () => {
      let session;
      try {
        session = await resolveCallbackSession();
      } catch {
        session = null;
      }
      if (cancelled) return;

      if (!session) {
        setStatus('error');
        toast.error(t('auth.callback_error'));
        setTimeout(() => navigate('/login', { replace: true }), 1500);
        return;
      }

      // If an invite token came along, send to accept-invite first.
      if (inviteToken) {
        navigate(`/invite?token=${encodeURIComponent(inviteToken)}`, { replace: true });
        return;
      }

      // Onboarding redirects to /dashboard if the user already has a household.
      navigate('/onboarding', { replace: true });
    };

    void finishRedirect();
    return () => {
      cancelled = true;
    };
  }, [navigate, inviteToken, t]);

  return (
    <FullScreenLoader
      label={status === 'verifying' ? t('auth.verifying') : t('auth.callback_error')}
    />
  );
}

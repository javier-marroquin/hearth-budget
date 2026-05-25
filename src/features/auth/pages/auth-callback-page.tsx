import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FullScreenLoader } from '@/components/layout/full-screen-loader';
import { useTranslation } from 'react-i18next';

/**
 * Receives the magic-link redirect from Supabase. F2 implements the real
 * session detection; for F1 we just redirect to login.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/login', { replace: true }), 500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return <FullScreenLoader label={t('auth.verifying')} />;
}

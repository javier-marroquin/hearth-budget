import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { sendMagicLink } from '../services/auth.service';
import { getAuthErrorMessage } from '../utils/auth-errors';

const RESEND_COOLDOWN = 60;

export function CheckEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email') ?? '';
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);

  // Without an email there's nothing to do here.
  useEffect(() => {
    if (!email) navigate('/login', { replace: true });
  }, [email, navigate]);

  // Countdown until resend is allowed.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await sendMagicLink({ email });
      toast.success(t('auth.resend'));
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      toast.error(getAuthErrorMessage(err, t));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle>{t('auth.check_email_title')}</CardTitle>
            <CardDescription>
              {t('auth.check_email_subtitle', { email })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="default"
              className="w-full"
              onClick={resend}
              disabled={cooldown > 0 || resending}
            >
              {cooldown > 0
                ? t('auth.resend_in', { seconds: cooldown })
                : t('auth.resend')}
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/login">{t('auth.back_to_login')}</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

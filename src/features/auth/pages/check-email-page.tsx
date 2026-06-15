import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
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
import { resendSignupConfirmation } from '../services/auth.service';
import { getAuthErrorMessage } from '../utils/auth-errors';

const RESEND_COOLDOWN = 60;

export function CheckEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email') ?? '';
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) navigate('/login', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await resendSignupConfirmation(email);
      toast.success(t('auth.confirmation_resent'));
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      toast.error(getAuthErrorMessage(err, t));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-border shadow-none">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <Mail className="h-5 w-5" />
            </div>
            <CardTitle className="text-subtitle">{t('auth.check_email_title')}</CardTitle>
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
                : t('auth.resend_confirmation')}
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/login">{t('auth.back_to_login')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Link, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function CheckEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle>{t('auth.check_email_title')}</CardTitle>
          <CardDescription>{t('auth.check_email_subtitle', { email })}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild className="w-full">
            <Link to="/login">{t('auth.back_to_login')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

/**
 * Login placeholder for F1. F2 replaces this with the magic-link form.
 */
export function LoginPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-sky-50 p-4 dark:from-emerald-950/30 dark:to-sky-950/30">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 font-bold text-white">
            PH
          </div>
          <CardTitle className="text-2xl">{t('auth.magic_link_title')}</CardTitle>
          <CardDescription>{t('auth.magic_link_subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-md bg-muted p-3 text-center text-xs text-muted-foreground">
            Auth se activa en la fase F2 (Supabase Magic Link).
          </p>
          <Button className="w-full" disabled>
            {t('auth.send_magic_link')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { fetchEmailStatus, sendTestEmail } from '../services/email.service';

export function EmailSettingsSection() {
  const { t } = useTranslation();
  const userEmail = useAuthStore((s) => s.user?.email);

  const { data: status, isLoading } = useQuery({
    queryKey: ['email-status'],
    queryFn: fetchEmailStatus,
  });

  const test = useMutation({
    mutationFn: () => sendTestEmail(userEmail ?? undefined),
    onSuccess: (result) => {
      toast.success(
        t('settings.email.test_sent', {
          mode: t(`settings.email.mode.${result.mode}`),
        }),
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const modeLabel = status ? t(`settings.email.mode.${status.mode}`) : '—';

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          {t('settings.email.title')}
        </CardTitle>
        <CardDescription>{t('settings.email.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.loading')}
          </div>
        )}

        {status && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{t('settings.email.status')}:</span>
              <Badge variant={status.configured ? 'default' : 'secondary'}>{modeLabel}</Badge>
              {status.from ? (
                <span className="text-xs text-muted-foreground">
                  {t('settings.email.from')}: {status.from}
                </span>
              ) : null}
            </div>

            {status.smtp ? (
              <p className="text-xs text-muted-foreground">
                SMTP {status.smtp.host}:{status.smtp.port}
                {status.smtp.secure ? ' (TLS)' : ''}
                {status.smtp.hasAuth ? ` · ${t('settings.email.auth_configured')}` : ''}
              </p>
            ) : null}

            <p className="text-sm text-muted-foreground">{t('settings.email.inbound_note')}</p>

            <div className="rounded-lg border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">{t('settings.email.env_title')}</p>
              <ul className="list-inside list-disc space-y-1 font-mono text-[11px]">
                <li>SMTP_HOST, SMTP_PORT, SMTP_FROM</li>
                <li>SMTP_USER, SMTP_PASS, SMTP_SECURE (optional)</li>
                <li>RESEND_API_KEY, RESEND_FROM_EMAIL (alternative)</li>
              </ul>
              <p className="mt-2">{t('settings.email.env_hint')}</p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!userEmail || test.isPending || !status.supportsInvites}
              onClick={() => test.mutate()}
            >
              {test.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t('settings.email.send_test')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

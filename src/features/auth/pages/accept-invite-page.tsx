import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/client';
import { useAuthStore } from '../stores/auth.store';

type State =
  | { kind: 'loading' }
  | { kind: 'needs-login'; token: string }
  | { kind: 'success'; householdName: string }
  | { kind: 'error'; message: string };

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!token) {
      setState({ kind: 'error', message: t('invite.token_missing') });
      return;
    }
    if (!user) {
      setState({ kind: 'needs-login', token });
      return;
    }

    const accept = async () => {
      try {
        const body = await apiFetch<{ household_name?: string }>('/api/accept-invite', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        setState({ kind: 'success', householdName: body.household_name ?? '' });
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
      } catch (err) {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : t('invite.unknown_error'),
        });
      }
    };

    void accept();
  }, [token, user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md border-border shadow-none">
        <CardHeader className="space-y-3 text-center">
          {state.kind === 'loading' && (
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
          )}
          {state.kind === 'success' && (
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          )}
          {state.kind === 'error' && (
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
          )}
          <CardTitle>
            {state.kind === 'success'
              ? '¡Bienvenido!'
              : state.kind === 'error'
                ? t('common.error')
                : t('invite.accept')}
          </CardTitle>
          {state.kind === 'success' && (
            <CardDescription>
              Te uniste al hogar {state.householdName}. Redirigiendo…
            </CardDescription>
          )}
          {state.kind === 'error' && (
            <CardDescription>{state.message}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {state.kind === 'needs-login' && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Para aceptar la invitación primero inicia sesión o crea una cuenta.
              </p>
              <Button
                className="w-full"
                onClick={() =>
                  navigate(`/login?invite=${encodeURIComponent(state.token)}`)
                }
              >
                {t('auth.login')}
              </Button>
            </>
          )}
          {state.kind === 'error' && (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate('/login')}
            >
              {t('auth.back_to_login')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

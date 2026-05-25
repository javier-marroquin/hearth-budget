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
import { useAuthStore } from '../stores/auth.store';
import { supabase } from '@/lib/supabase/client';

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
      setState({ kind: 'error', message: 'Invitation token missing' });
      return;
    }
    if (!user) {
      setState({ kind: 'needs-login', token });
      return;
    }

    const accept = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const access = session.session?.access_token;
        if (!access) {
          setState({ kind: 'needs-login', token });
          return;
        }
        const res = await fetch('/api/accept-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const body = (await res.json()) as { household_name?: string };
        setState({ kind: 'success', householdName: body.household_name ?? '' });
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
      } catch (err) {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    };

    void accept();
  }, [token, user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          {state.kind === 'loading' && (
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
          )}
          {state.kind === 'success' && (
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          )}
          {state.kind === 'error' && (
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
          )}
          <CardTitle>
            {state.kind === 'success'
              ? '¡Bienvenido!'
              : state.kind === 'error'
                ? t('common.error')
                : 'Aceptar invitación'}
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
                Para aceptar la invitación primero inicia sesión con tu correo.
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

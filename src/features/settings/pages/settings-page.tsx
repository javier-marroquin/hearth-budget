import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { apiFetch } from '@/lib/api/client';
import { usePermissions } from '@/hooks/use-permissions';
import { ImportExportSection } from '../components/import-export-section';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { updateProfile, isUpdatingProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const setActiveHousehold = useHouseholdStore((s) => s.setActiveHousehold);
  const { canEditHousehold } = usePermissions();
  const qc = useQueryClient();

  useEffect(() => {
    setFullName(user?.full_name ?? '');
  }, [user?.full_name]);

  const toggleEnvelope = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!activeHousehold) throw new Error('No household');
      const data = await apiFetch<{
        id: string;
        envelope_mode_enabled: boolean;
      }>(`/api/households/${activeHousehold.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ envelope_mode_enabled: enabled }),
      });
      return data;
    },
    onSuccess: async (data) => {
      if (data && activeHousehold) {
        setActiveHousehold({
          ...activeHousehold,
          envelope_mode_enabled: data.envelope_mode_enabled,
        });
      }
      await qc.invalidateQueries({ queryKey: ['households'] });
      toast.success(t('settings.saved'));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <PageHeader title={t('nav.settings')} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.profile_title')}</CardTitle>
            <CardDescription>{t('settings.profile_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="profile-full-name">{t('settings.display_name')}</Label>
              <Input
                id="profile-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('settings.display_name_placeholder')}
                autoComplete="name"
              />
              {user?.email ? (
                <p className="text-xs text-muted-foreground">{user.email}</p>
              ) : null}
            </div>
            <Button
              type="button"
              disabled={
                isUpdatingProfile ||
                fullName.trim().length < 2 ||
                fullName.trim() === (user?.full_name ?? '').trim()
              }
              onClick={() => updateProfile(fullName.trim())}
            >
              {t('settings.save_profile')}
            </Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Apariencia</CardTitle>
            <CardDescription>Idioma y tema visual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Idioma</Label>
              <Select
                value={i18n.language.split('-')[0]}
                onValueChange={(v) => void i18n.changeLanguage(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tema</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Oscuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Household */}
        <Card>
          <CardHeader>
            <CardTitle>Hogar</CardTitle>
            <CardDescription>
              {activeHousehold?.name} · {activeHousehold?.currency} ·{' '}
              {activeHousehold?.timezone}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3">
              <div className="space-y-0.5">
                <Label>{t('settings.envelope_title')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.envelope_description')}
                </p>
              </div>
              <Switch
                disabled={!canEditHousehold || toggleEnvelope.isPending}
                checked={activeHousehold?.envelope_mode_enabled ?? false}
                onCheckedChange={(v) => toggleEnvelope.mutate(v)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <ImportExportSection />
      </div>
    </>
  );
}

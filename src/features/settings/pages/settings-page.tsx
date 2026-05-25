import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { supabase } from '@/lib/supabase/client';
import { usePermissions } from '@/hooks/use-permissions';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const setActiveHousehold = useHouseholdStore((s) => s.setActiveHousehold);
  const { canEditHousehold } = usePermissions();
  const qc = useQueryClient();

  const toggleEnvelope = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!activeHousehold) throw new Error('No household');
      const { data, error } = await supabase
        .from('households')
        .update({ envelope_mode_enabled: enabled })
        .eq('id', activeHousehold.id)
        .select()
        .single();
      if (error) throw error;
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
      toast.success('Configuración guardada');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <PageHeader title={t('nav.settings')} />

      <div className="grid gap-4 md:grid-cols-2">
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
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label>Modo Envelope</Label>
                <p className="text-xs text-muted-foreground">
                  Activa la asignación por categoría (zero-sum). Habilita la vista &quot;Presupuesto&quot;.
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
    </>
  );
}

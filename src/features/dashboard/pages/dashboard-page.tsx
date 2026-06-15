import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Check,
  LayoutDashboard,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import i18n from '@/i18n';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useHouseholdKpis } from '../hooks/use-household-kpis';
import { useHouseholdMembers } from '@/features/households/hooks/use-households';
import { DashboardGrid, useDashboardLayout } from '../components/dashboard-grid';
import { WidgetPalette } from '../components/widget-palette';
import { DEFAULT_LAYOUT } from '../widgets/widget-registry';
import { resetLayout } from '../services/layout.service';
import { memberDisplayName } from '@/lib/display-labels';

export function DashboardPage() {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const userId = useAuthStore((s) => s.user?.id);
  const householdId = activeHousehold?.id;
  const currency = activeHousehold?.currency ?? 'COP';

  const { data: kpis } = useHouseholdKpis(householdId);
  const { data: members } = useHouseholdMembers(householdId);

  const [editing, setEditing] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { layout, setLayout } = useDashboardLayout();

  const memberLookup = useMemo(() => {
    const map = new Map<string, string>();
    members?.forEach((m) => {
      if (!m.user_id) return;
      map.set(
        m.user_id,
        memberDisplayName(m.profile?.full_name ?? m.profile?.email, t),
      );
    });
    return map;
  }, [members, t]);

  const ctx = useMemo(
    () => ({
      householdId: householdId ?? '',
      currency,
      envelopeMode: activeHousehold?.envelope_mode_enabled ?? false,
      kpis,
      memberLookup,
    }),
    [householdId, currency, activeHousehold, kpis, memberLookup],
  );

  const onRemoveItem = (instanceId: string) => {
    setLayout((prev) => prev.filter((it) => it.instanceId !== instanceId));
  };

  const onResetLayout = () => {
    if (!userId || !householdId) return;
    if (!confirm('¿Restaurar el dashboard a su diseño por defecto?')) return;
    resetLayout(userId, householdId);
    setLayout(DEFAULT_LAYOUT);
    toast.success(i18n.t('toast.dashboard_restored'));
  };

  if (!householdId) return null;

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        actions={
          editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaletteOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Agregar widget
              </Button>
              <Button variant="outline" size="sm" onClick={onResetLayout}>
                <RotateCcw className="h-4 w-4" />
                Restaurar
              </Button>
              <Button size="sm" onClick={() => setEditing(false)}>
                <Check className="h-4 w-4" />
                Listo
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <LayoutDashboard className="h-4 w-4" />
              Personalizar
            </Button>
          )
        }
      />

      {/* Alerts */}
      {kpis && (kpis.belowSavingsTarget || kpis.overduePaymentsCount > 0) && (
        <div className="mb-4 space-y-2">
          {kpis.belowSavingsTarget && kpis.totalIncome > 0 && (
            <Card className="border-amber-300/50 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20">
              <CardContent className="flex items-center gap-3 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>{t('alerts.savings_warning')}</span>
              </CardContent>
            </Card>
          )}
          {kpis.overduePaymentsCount > 0 && (
            <Card className="border-red-300/50 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20">
              <CardContent className="flex items-center gap-3 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span>
                  {t('alerts.overdue_warning', {
                    count: kpis.overduePaymentsCount,
                  })}
                </span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {editing && (
        <div className="mb-3 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Modo edición:</strong> arrastra
          cada widget por el icono ≡ (como en la pantalla de inicio del
          celular), redimensiona desde la esquina inferior derecha y usa ×
          para quitar. El orden se guarda al soltar.
        </div>
      )}

      <DashboardGrid
        ctx={ctx}
        editing={editing}
        layout={layout}
        onLayoutChange={setLayout}
        onRemoveItem={onRemoveItem}
      />

      <WidgetPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        existing={layout}
        onAdd={(item) => {
          setLayout((prev) => [...prev, item]);
          setPaletteOpen(false);
          toast.success(i18n.t('toast.widget_added'));
        }}
      />
    </>
  );
}

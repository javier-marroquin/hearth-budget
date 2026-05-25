import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, HandCoins, CircleCheck, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExportCsvButton } from '@/components/io/export-csv-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import {
  useContributions,
  useDeleteContribution,
  useMarkContributionReceived,
} from '../hooks/use-contributions';
import { useHouseholdMembers } from '@/features/households/hooks/use-households';
import { ContributionFormDialog } from '../components/contribution-form-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency, formatDate } from '@/lib/format';
import type { ContributionRow, ContributionStatus } from '@/lib/supabase/aliases';
import type { CsvColumn } from '@/lib/io/csv';

const statusVariant: Record<ContributionStatus, 'success' | 'warning' | 'destructive'> = {
  received: 'success',
  pending: 'warning',
  overdue: 'destructive',
};

const statusLabel: Record<ContributionStatus, string> = {
  received: 'Recibido',
  pending: 'Pendiente',
  overdue: 'Vencido',
};

export function ContributionsPage() {
  const { t, i18n } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { canWriteIncomes } = usePermissions();
  const householdId = activeHousehold?.id ?? '';

  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilters = useMemo(
    () => ({
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      userId: searchParams.get('user') ?? undefined,
      status: (searchParams.get('status') ?? undefined) as
        | ContributionStatus
        | undefined,
    }),
    [searchParams],
  );

  const { data: contributions, isLoading } = useContributions(
    activeHousehold ? { householdId, ...urlFilters } : null,
  );

  const hasUrlFilters =
    urlFilters.from || urlFilters.to || urlFilters.userId || urlFilters.status;
  const { data: members } = useHouseholdMembers(householdId);
  const markReceived = useMarkContributionReceived(householdId);
  const remove = useDeleteContribution(householdId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContributionRow | null>(null);
  const [toDelete, setToDelete] = useState<ContributionRow | null>(null);

  const memberName = (userId: string) => {
    const m = members?.find((mm) => mm.user_id === userId);
    return m?.profile?.full_name ?? m?.profile?.email ?? '—';
  };

  const exportColumns = useMemo<CsvColumn<ContributionRow>[]>(
    () => [
      { key: 'expected_date', header: 'Fecha esperada', get: (r) => r.expected_date },
      { key: 'received_date', header: 'Fecha recibido', get: (r) => r.received_date ?? '' },
      { key: 'member', header: 'Aportante', get: (r) => memberName(r.user_id) },
      { key: 'status', header: 'Estado', get: (r) => r.status },
      { key: 'amount', header: 'Monto', get: (r) => Number(r.amount) },
      { key: 'currency', header: 'Moneda', get: (r) => r.currency },
      { key: 'notes', header: 'Notas', get: (r) => r.notes ?? '' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members],
  );

  return (
    <>
      <PageHeader
        title={t('contributions.title')}
        actions={
          <>
            <ExportCsvButton
              filename={`aportes-${new Date().toISOString().slice(0, 10)}.csv`}
              rows={contributions ?? []}
              columns={exportColumns}
            />
            {canWriteIncomes && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t('contributions.new')}
              </Button>
            )}
          </>
        }
      />

      {hasUrlFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-xs">
          <span className="font-medium text-muted-foreground">Filtros activos:</span>
          {urlFilters.status && (
            <Badge variant="outline">Estado: {statusLabel[urlFilters.status]}</Badge>
          )}
          {urlFilters.userId && (
            <Badge variant="outline">Miembro: {memberName(urlFilters.userId)}</Badge>
          )}
          {(urlFilters.from || urlFilters.to) && (
            <Badge variant="outline">
              {urlFilters.from ?? '…'} → {urlFilters.to ?? '…'}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setSearchParams({})}
          >
            <X className="h-3 w-3" />
            Limpiar
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!isLoading && (!contributions || contributions.length === 0) && (
        <EmptyState
          icon={HandCoins}
          title="Sin aportes registrados"
          description="Registra los aportes que cada miembro hace al presupuesto del hogar."
        />
      )}

      {!isLoading && contributions && contributions.length > 0 && (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha esperada</TableHead>
                <TableHead>Aportante</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Recibido</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                {canWriteIncomes && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contributions.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {formatDate(c.expected_date, 'PP', i18n.language)}
                  </TableCell>
                  <TableCell className="font-medium">{memberName(c.user_id)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[c.status]}>
                      {statusLabel[c.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.received_date ? formatDate(c.received_date, 'PP', i18n.language) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(Number(c.amount), { currency: c.currency })}
                  </TableCell>
                  {canWriteIncomes && (
                    <TableCell className="flex justify-end gap-1">
                      {c.status !== 'received' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markReceived.mutate(c.id)}
                          aria-label="Marcar recibido"
                        >
                          <CircleCheck className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(c);
                          setOpen(true);
                        }}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(c)}
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ContributionFormDialog
        open={open}
        onOpenChange={setOpen}
        contribution={editing}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar aporte"
        description="Esta acción no se puede deshacer."
        destructive
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </>
  );
}

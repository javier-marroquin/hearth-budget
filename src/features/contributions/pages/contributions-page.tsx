import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, HandCoins, CircleCheck, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { DataTableShell } from '@/components/layout/data-table-shell';
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
import type { ContributionRow, ContributionStatus } from '@/lib/db/aliases';
import type { CsvColumn } from '@/lib/io/csv';

const statusVariant: Record<ContributionStatus, 'success' | 'warning' | 'destructive'> = {
  received: 'success',
  pending: 'warning',
  overdue: 'destructive',
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
      { key: 'expected_date', header: t('table.expected_date'), get: (r) => r.expected_date },
      { key: 'received_date', header: t('table.received_date'), get: (r) => r.received_date ?? '' },
      { key: 'member', header: t('table.contributor'), get: (r) => memberName(r.user_id) },
      { key: 'status', header: t('table.status'), get: (r) => r.status },
      { key: 'amount', header: t('table.amount'), get: (r) => Number(r.amount) },
      { key: 'currency', header: t('table.currency'), get: (r) => r.currency },
      { key: 'notes', header: t('table.notes'), get: (r) => r.notes ?? '' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, t],
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
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary p-3 text-[13px]">
          <span className="font-medium text-muted-foreground">{t('table.filters.active')}</span>
          {urlFilters.status && (
            <Badge variant="outline">{t('table.status')}: {t(`status.${urlFilters.status}`)}</Badge>
          )}
          {urlFilters.userId && (
            <Badge variant="outline">{t('common.member')}: {memberName(urlFilters.userId)}</Badge>
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
            {t('table.filters.clear')}
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
          title={t('empty.contributions_title')}
          description={t('empty.contributions_description')}
        />
      )}

      {!isLoading && contributions && contributions.length > 0 && (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.expected_date')}</TableHead>
                <TableHead>{t('table.contributor')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.received_date')}</TableHead>
                <TableHead className="text-right">{t('table.amount')}</TableHead>
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
                      {t(`status.${c.status}`)}
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
                          aria-label={t('aria.mark_received')}
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
                        aria-label={t('aria.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(c)}
                        aria-label={t('aria.delete')}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <ContributionFormDialog
        open={open}
        onOpenChange={setOpen}
        contribution={editing}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('delete.contribution_title')}
        description={t('delete.irreversible')}
        destructive
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </>
  );
}

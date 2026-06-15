import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Wallet, X } from 'lucide-react';
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
import { useDeleteIncome, useIncomes } from '../hooks/use-incomes';
import { useCategories } from '@/features/categories/hooks/use-categories';
import { useHouseholdMembers } from '@/features/households/hooks/use-households';
import { IncomeFormDialog } from '../components/income-form-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency, formatDate } from '@/lib/format';
import { translateCategoryName } from '@/lib/display-labels';
import type { IncomeRow } from '@/lib/db/aliases';
import type { CsvColumn } from '@/lib/io/csv';

export function IncomesPage() {
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
      categoryId: searchParams.get('category') ?? undefined,
    }),
    [searchParams],
  );

  const { data: incomes, isLoading } = useIncomes(
    activeHousehold ? { householdId, ...urlFilters } : null,
  );

  const hasUrlFilters =
    urlFilters.from || urlFilters.to || urlFilters.userId || urlFilters.categoryId;
  const { data: categories } = useCategories(householdId, 'income');
  const { data: members } = useHouseholdMembers(householdId);
  const remove = useDeleteIncome(householdId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeRow | null>(null);
  const [toDelete, setToDelete] = useState<IncomeRow | null>(null);

  const memberName = (userId: string) => {
    const m = members?.find((mm) => mm.user_id === userId);
    return m?.profile?.full_name ?? m?.profile?.email ?? '—';
  };
  const categoryName = (id: string | null) => {
    if (!id) return '—';
    const cat = categories?.find((c) => c.id === id);
    if (!cat) return '—';
    return translateCategoryName(cat.name, cat.is_system, t);
  };

  const exportColumns = useMemo<CsvColumn<IncomeRow>[]>(
    () => [
      { key: 'date', header: t('table.date'), get: (r) => r.date },
      { key: 'member', header: t('table.payee'), get: (r) => memberName(r.user_id) },
      { key: 'category', header: t('table.category'), get: (r) => categoryName(r.category_id) },
      { key: 'source', header: t('table.source'), get: (r) => r.source ?? '' },
      { key: 'amount', header: t('table.amount'), get: (r) => Number(r.amount) },
      { key: 'currency', header: t('table.currency'), get: (r) => r.currency },
      { key: 'notes', header: t('table.notes'), get: (r) => r.notes ?? '' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, categories, t],
  );

  return (
    <>
      <PageHeader
        title={t('incomes.title')}
        actions={
          <>
            <ExportCsvButton
              filename={`ingresos-${new Date().toISOString().slice(0, 10)}.csv`}
              rows={incomes ?? []}
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
                {t('incomes.new')}
              </Button>
            )}
          </>
        }
      />

      {hasUrlFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary p-3 text-[13px]">
          <span className="font-medium text-muted-foreground">Filtros activos:</span>
          {(urlFilters.from || urlFilters.to) && (
            <Badge variant="outline">
              {urlFilters.from ?? '…'} → {urlFilters.to ?? '…'}
            </Badge>
          )}
          {urlFilters.userId && (
            <Badge variant="outline">
              Miembro: {memberName(urlFilters.userId)}
            </Badge>
          )}
          {urlFilters.categoryId && (
            <Badge variant="outline">
              Categoría: {categoryName(urlFilters.categoryId)}
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

      {!isLoading && (!incomes || incomes.length === 0) && (
        <EmptyState
          icon={Wallet}
          title={t('empty.incomes_title')}
          description={t('empty.incomes_description')}
          action={
            canWriteIncomes && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t('incomes.new')}
              </Button>
            )
          }
        />
      )}

      {!isLoading && incomes && incomes.length > 0 && (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.date')}</TableHead>
                <TableHead>{t('table.payee')}</TableHead>
                <TableHead>{t('table.category')}</TableHead>
                <TableHead>{t('table.source')}</TableHead>
                <TableHead className="text-right">{t('table.amount')}</TableHead>
                {canWriteIncomes && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.map((inc) => (
                <TableRow key={inc.id}>
                  <TableCell>{formatDate(inc.date, 'PP', i18n.language)}</TableCell>
                  <TableCell className="font-medium">{memberName(inc.user_id)}</TableCell>
                  <TableCell>{categoryName(inc.category_id)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {inc.source ?? '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(Number(inc.amount), {
                      currency: inc.currency,
                    })}
                  </TableCell>
                  {canWriteIncomes && (
                    <TableCell className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(inc);
                          setOpen(true);
                        }}
                        aria-label={t('aria.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(inc)}
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

      <IncomeFormDialog open={open} onOpenChange={setOpen} income={editing} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('delete.income_title')}
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

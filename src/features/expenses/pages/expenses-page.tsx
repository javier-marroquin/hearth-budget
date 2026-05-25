import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Receipt, CircleCheck } from 'lucide-react';
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
  useDeleteExpense,
  useExpenses,
  useMarkExpensePaid,
} from '../hooks/use-expenses';
import { useCategories } from '@/features/categories/hooks/use-categories';
import { ExpenseFormDialog } from '../components/expense-form-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency, formatDate } from '@/lib/format';
import type { ExpenseRow, PaymentStatus } from '@/lib/supabase/aliases';
import type { CsvColumn } from '@/lib/io/csv';

const statusVariant: Record<PaymentStatus, 'success' | 'warning' | 'destructive'> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'destructive',
};

export function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { canWriteExpenses } = usePermissions();
  const householdId = activeHousehold?.id ?? '';

  const { data: expenses, isLoading } = useExpenses(
    activeHousehold ? { householdId } : null,
  );
  const { data: categories } = useCategories(householdId, 'expense');
  const remove = useDeleteExpense(householdId);
  const markPaid = useMarkExpensePaid(householdId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [toDelete, setToDelete] = useState<ExpenseRow | null>(null);

  const categoryName = (id: string | null) => {
    if (!id) return '—';
    return categories?.find((c) => c.id === id)?.name ?? '—';
  };

  const exportColumns = useMemo<CsvColumn<ExpenseRow>[]>(
    () => [
      { key: 'date', header: 'Fecha', get: (r) => r.date },
      { key: 'due_date', header: 'Fecha límite', get: (r) => r.due_date ?? '' },
      { key: 'description', header: 'Descripción', get: (r) => r.description ?? '' },
      { key: 'category', header: 'Categoría', get: (r) => categoryName(r.category_id) },
      { key: 'type', header: 'Tipo', get: (r) => r.type },
      { key: 'status', header: 'Estado', get: (r) => r.status },
      { key: 'amount', header: 'Monto', get: (r) => Number(r.amount) },
      { key: 'currency', header: 'Moneda', get: (r) => r.currency },
      { key: 'notes', header: 'Notas', get: (r) => r.notes ?? '' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories],
  );

  return (
    <>
      <PageHeader
        title={t('expenses.title')}
        actions={
          <>
            <ExportCsvButton
              filename={`gastos-${new Date().toISOString().slice(0, 10)}.csv`}
              rows={expenses ?? []}
              columns={exportColumns}
            />
            {canWriteExpenses && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t('expenses.new')}
              </Button>
            )}
          </>
        }
      />

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!isLoading && (!expenses || expenses.length === 0) && (
        <EmptyState
          icon={Receipt}
          title="Sin gastos registrados"
          description="Empieza registrando los gastos del hogar este mes."
          action={
            canWriteExpenses && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {t('expenses.new')}
              </Button>
            )
          }
        />
      )}

      {!isLoading && expenses && expenses.length > 0 && (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                {canWriteExpenses && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{formatDate(e.date, 'PP', i18n.language)}</TableCell>
                  <TableCell className="font-medium">{e.description ?? '—'}</TableCell>
                  <TableCell>{categoryName(e.category_id)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {t(`expenses.type.${e.type}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[e.status]}>
                      {t(`calendar.status.${e.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(Number(e.amount), { currency: e.currency })}
                  </TableCell>
                  {canWriteExpenses && (
                    <TableCell className="flex justify-end gap-1">
                      {e.status !== 'paid' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markPaid.mutate(e.id)}
                          aria-label="Marcar pagado"
                        >
                          <CircleCheck className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(e);
                          setOpen(true);
                        }}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(e)}
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

      <ExpenseFormDialog open={open} onOpenChange={setOpen} expense={editing} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar gasto"
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

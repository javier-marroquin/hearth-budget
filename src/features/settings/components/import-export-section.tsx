import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImportCsvDialog } from '@/components/io/import-csv-dialog';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useHouseholdMembers } from '@/features/households/hooks/use-households';
import { useCategories } from '@/features/categories/hooks/use-categories';
import { createIncome } from '@/features/incomes/services/incomes.service';
import { createExpense } from '@/features/expenses/services/expenses.service';
import {
  parseDate,
  parseNumber,
  type FieldDefinition,
} from '@/lib/io/import-mapping';
import { csvBlob, downloadBlob } from '@/lib/io/csv';
import { backupFilename, exportHouseholdBackup } from '@/lib/io/backup';
import type { ExpenseType, SplitMethod } from '@/lib/supabase/aliases';

interface ImportedIncome {
  user_id: string | null;
  amount: number;
  currency: string | null;
  date: string;
  category_id: string | null;
  source: string | null;
  notes: string | null;
}

interface ImportedExpense {
  amount: number;
  currency: string | null;
  date: string;
  due_date: string | null;
  category_id: string | null;
  type: ExpenseType | null;
  description: string | null;
  notes: string | null;
}

export function ImportExportSection() {
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const user = useAuthStore((s) => s.user);
  const { data: members } = useHouseholdMembers(activeHousehold?.id);
  const { data: incomeCategories } = useCategories(activeHousehold?.id, 'income');
  const { data: expenseCategories } = useCategories(activeHousehold?.id, 'expense');
  const qc = useQueryClient();

  const [importIncomesOpen, setImportIncomesOpen] = useState(false);
  const [importExpensesOpen, setImportExpensesOpen] = useState(false);

  // --- Full JSON backup ----------------------------------------------------
  const backupMutation = useMutation({
    mutationFn: async () => {
      if (!activeHousehold) throw new Error('No household');
      const data = await exportHouseholdBackup(activeHousehold.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      downloadBlob(blob, backupFilename(activeHousehold.name));
      return data;
    },
    onSuccess: () => toast.success('Backup descargado'),
    onError: (err: Error) => toast.error(err.message),
  });

  // --- helpers: resolve names to ids --------------------------------------
  const resolveUserId = (raw: unknown): string | null => {
    if (!raw) return null;
    const value = String(raw).toLowerCase().trim();
    const m = members?.find(
      (mm) =>
        mm.user_id &&
        (mm.profile?.full_name?.toLowerCase() === value ||
          mm.profile?.email?.toLowerCase() === value),
    );
    return m?.user_id ?? null;
  };

  const resolveCategoryId = (raw: unknown, kind: 'income' | 'expense'): string | null => {
    if (!raw) return null;
    const value = String(raw).toLowerCase().trim();
    const list = kind === 'income' ? incomeCategories : expenseCategories;
    return list?.find((c) => c.name.toLowerCase() === value)?.id ?? null;
  };

  // --- Income import -------------------------------------------------------
  const incomeFields: FieldDefinition[] = [
    { key: 'date', label: 'Fecha', required: true, aliases: ['fecha'], parse: parseDate },
    {
      key: 'amount',
      label: 'Monto',
      required: true,
      aliases: ['amount', 'valor', 'cantidad'],
      parse: parseNumber,
    },
    { key: 'currency', label: 'Moneda', aliases: ['currency', 'moneda'] },
    {
      key: 'user_id',
      label: 'Perceptor (nombre o email)',
      required: true,
      aliases: ['perceptor', 'miembro', 'member', 'persona'],
      parse: (v) => resolveUserId(v),
    },
    {
      key: 'category_id',
      label: 'Categoría',
      aliases: ['category', 'categoria'],
      parse: (v) => resolveCategoryId(v, 'income'),
    },
    { key: 'source', label: 'Fuente', aliases: ['fuente', 'source'] },
    { key: 'notes', label: 'Notas', aliases: ['notas', 'notes', 'comentarios'] },
  ];

  const importIncomesMutation = useMutation({
    mutationFn: async (rows: ImportedIncome[]) => {
      if (!activeHousehold || !user) throw new Error('Not ready');
      let inserted = 0;
      let failed = 0;
      for (const row of rows) {
        try {
          if (!row.user_id) throw new Error('Perceptor no resuelto');
          await createIncome({
            household_id: activeHousehold.id,
            created_by: user.id,
            user_id: row.user_id,
            amount: row.amount,
            currency: (row.currency ?? activeHousehold.currency).toUpperCase(),
            date: row.date,
            category_id: row.category_id,
            source: row.source,
            notes: row.notes,
          });
          inserted++;
        } catch (err) {
          console.warn('[import incomes]', err);
          failed++;
        }
      }
      return { inserted, failed };
    },
    onSettled: async () => {
      if (activeHousehold) {
        await qc.invalidateQueries({ queryKey: ['incomes', activeHousehold.id] });
        await qc.invalidateQueries({ queryKey: ['kpis', activeHousehold.id] });
      }
    },
  });

  // --- Expense import ------------------------------------------------------
  const expenseFields: FieldDefinition[] = [
    { key: 'date', label: 'Fecha', required: true, aliases: ['fecha'], parse: parseDate },
    {
      key: 'amount',
      label: 'Monto',
      required: true,
      aliases: ['amount', 'valor', 'cantidad'],
      parse: parseNumber,
    },
    { key: 'currency', label: 'Moneda', aliases: ['currency', 'moneda'] },
    {
      key: 'due_date',
      label: 'Fecha límite',
      aliases: ['vencimiento', 'due_date', 'fecha_limite'],
      parse: parseDate,
    },
    {
      key: 'description',
      label: 'Descripción',
      aliases: ['descripcion', 'description', 'concepto'],
    },
    {
      key: 'category_id',
      label: 'Categoría',
      aliases: ['category', 'categoria'],
      parse: (v) => resolveCategoryId(v, 'expense'),
    },
    {
      key: 'type',
      label: 'Tipo (fixed/variable/debt/one_time)',
      aliases: ['tipo', 'type'],
      parse: (v) => {
        const lc = v.toLowerCase().trim() as ExpenseType;
        const valid: ExpenseType[] = ['fixed', 'variable', 'debt', 'one_time'];
        return valid.includes(lc) ? lc : 'variable';
      },
    },
    { key: 'notes', label: 'Notas', aliases: ['notas', 'notes'] },
  ];

  const importExpensesMutation = useMutation({
    mutationFn: async (rows: ImportedExpense[]) => {
      if (!activeHousehold || !user) throw new Error('Not ready');
      const memberIds = members
        ?.filter((m) => m.status === 'active' && m.user_id)
        .map((m) => ({ userId: m.user_id! })) ?? [];
      let inserted = 0;
      let failed = 0;
      for (const row of rows) {
        try {
          await createExpense({
            household_id: activeHousehold.id,
            created_by: user.id,
            amount: row.amount,
            currency: (row.currency ?? activeHousehold.currency).toUpperCase(),
            date: row.date,
            due_date: row.due_date,
            category_id: row.category_id,
            type: (row.type ?? 'variable') as ExpenseType,
            description: row.description,
            notes: row.notes,
            split: { method: 'equal' as SplitMethod, participants: memberIds },
          });
          inserted++;
        } catch (err) {
          console.warn('[import expenses]', err);
          failed++;
        }
      }
      return { inserted, failed };
    },
    onSettled: async () => {
      if (activeHousehold) {
        await qc.invalidateQueries({ queryKey: ['expenses', activeHousehold.id] });
        await qc.invalidateQueries({ queryKey: ['kpis', activeHousehold.id] });
      }
    },
  });

  // --- Download CSV templates ---------------------------------------------
  const downloadTemplate = (kind: 'incomes' | 'expenses') => {
    const headers =
      kind === 'incomes'
        ? 'Fecha,Monto,Moneda,Perceptor,Categoría,Fuente,Notas'
        : 'Fecha,Monto,Moneda,Fecha límite,Descripción,Categoría,Tipo,Notas';
    const sample =
      kind === 'incomes'
        ? '2026-05-15,3500000,COP,javier@correo.com,Salario,Empresa X,Pago mensual'
        : '2026-05-15,180000,COP,2026-05-20,Internet,Servicios,fixed,Plan hogar';
    downloadBlob(csvBlob(`${headers}\r\n${sample}\r\n`), `plantilla-${kind}.csv`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar / Exportar</CardTitle>
        <CardDescription>
          Respaldos completos del hogar y carga masiva desde CSV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Backup */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Backup completo (JSON)</p>
          <p className="text-xs text-muted-foreground">
            Descarga un archivo con todo el hogar: ingresos, gastos, aportes, metas, categorías y eventos.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={backupMutation.isPending || !activeHousehold}
            onClick={() => backupMutation.mutate()}
          >
            {backupMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Descargar backup
          </Button>
        </div>

        {/* Import incomes */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Importar ingresos desde CSV</p>
          <p className="text-xs text-muted-foreground">
            El nombre o email del perceptor debe coincidir exactamente con un miembro activo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadTemplate('incomes')}
            >
              <Download className="h-4 w-4" />
              Plantilla CSV
            </Button>
            <Button size="sm" onClick={() => setImportIncomesOpen(true)}>
              <Upload className="h-4 w-4" />
              Importar ingresos
            </Button>
          </div>
        </div>

        {/* Import expenses */}
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Importar gastos desde CSV</p>
          <p className="text-xs text-muted-foreground">
            La división se calcula automáticamente entre todos los miembros activos (parts iguales).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadTemplate('expenses')}
            >
              <Download className="h-4 w-4" />
              Plantilla CSV
            </Button>
            <Button size="sm" onClick={() => setImportExpensesOpen(true)}>
              <Upload className="h-4 w-4" />
              Importar gastos
            </Button>
          </div>
        </div>
      </CardContent>

      <ImportCsvDialog<ImportedIncome>
        open={importIncomesOpen}
        onOpenChange={setImportIncomesOpen}
        title="Importar ingresos"
        description="Mapea las columnas de tu CSV con los campos de la app."
        fields={incomeFields}
        onImport={(rows) => importIncomesMutation.mutateAsync(rows)}
      />

      <ImportCsvDialog<ImportedExpense>
        open={importExpensesOpen}
        onOpenChange={setImportExpensesOpen}
        title="Importar gastos"
        description="Mapea las columnas de tu CSV con los campos de la app."
        fields={expenseFields}
        onImport={(rows) => importExpensesMutation.mutateAsync(rows)}
      />
    </Card>
  );
}

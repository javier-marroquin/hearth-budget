import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
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
import type { ExpenseType, SplitMethod } from '@/lib/db/aliases';
import i18n from '@/i18n';

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
  const { t } = useTranslation();
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
    onSuccess: () => toast.success(i18n.t('settings.backup_downloaded')),
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
  const incomeFields: FieldDefinition[] = useMemo(
    () => [
      {
        key: 'date',
        label: t('settings.import_fields.date'),
        required: true,
        aliases: ['fecha', 'date'],
        parse: parseDate,
      },
      {
        key: 'amount',
        label: t('settings.import_fields.amount'),
        required: true,
        aliases: ['amount', 'valor', 'cantidad', 'monto'],
        parse: parseNumber,
      },
      {
        key: 'currency',
        label: t('settings.import_fields.currency'),
        aliases: ['currency', 'moneda'],
      },
      {
        key: 'user_id',
        label: t('settings.import_fields.payee'),
        required: true,
        aliases: ['perceptor', 'miembro', 'member', 'persona', 'payee'],
        parse: (v) => resolveUserId(v),
      },
      {
        key: 'category_id',
        label: t('settings.import_fields.category'),
        aliases: ['category', 'categoria'],
        parse: (v) => resolveCategoryId(v, 'income'),
      },
      {
        key: 'source',
        label: t('settings.import_fields.source'),
        aliases: ['fuente', 'source'],
      },
      {
        key: 'notes',
        label: t('settings.import_fields.notes'),
        aliases: ['notas', 'notes', 'comentarios'],
      },
    ],
    [t, members, incomeCategories, expenseCategories],
  );

  const importIncomesMutation = useMutation({
    mutationFn: async (rows: ImportedIncome[]) => {
      if (!activeHousehold || !user) throw new Error('Not ready');
      let inserted = 0;
      let failed = 0;
      for (const row of rows) {
        try {
          if (!row.user_id) throw new Error(t('settings.import_payee_unresolved'));
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
  const expenseFields: FieldDefinition[] = useMemo(
    () => [
      {
        key: 'date',
        label: t('settings.import_fields.date'),
        required: true,
        aliases: ['fecha', 'date'],
        parse: parseDate,
      },
      {
        key: 'amount',
        label: t('settings.import_fields.amount'),
        required: true,
        aliases: ['amount', 'valor', 'cantidad', 'monto'],
        parse: parseNumber,
      },
      {
        key: 'currency',
        label: t('settings.import_fields.currency'),
        aliases: ['currency', 'moneda'],
      },
      {
        key: 'due_date',
        label: t('settings.import_fields.due_date'),
        aliases: ['vencimiento', 'due_date', 'fecha_limite'],
        parse: parseDate,
      },
      {
        key: 'description',
        label: t('settings.import_fields.description'),
        aliases: ['descripcion', 'description', 'concepto'],
      },
      {
        key: 'category_id',
        label: t('settings.import_fields.category'),
        aliases: ['category', 'categoria'],
        parse: (v) => resolveCategoryId(v, 'expense'),
      },
      {
        key: 'type',
        label: t('settings.import_fields.type'),
        aliases: ['tipo', 'type'],
        parse: (v) => {
          const lc = v.toLowerCase().trim() as ExpenseType;
          const valid: ExpenseType[] = ['fixed', 'variable', 'debt', 'one_time'];
          return valid.includes(lc) ? lc : 'variable';
        },
      },
      {
        key: 'notes',
        label: t('settings.import_fields.notes'),
        aliases: ['notas', 'notes'],
      },
    ],
    [t, members, incomeCategories, expenseCategories],
  );

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
        ? 'Date,Amount,Currency,Payee,Category,Source,Notes'
        : 'Date,Amount,Currency,Due date,Description,Category,Type,Notes';
    const sample =
      kind === 'incomes'
        ? '2026-05-15,3500,USD,demo@local.dev,Salary,Company X,Monthly pay'
        : '2026-05-15,180,USD,2026-05-20,Internet,Utilities,fixed,Home plan';
    downloadBlob(csvBlob(`${headers}\r\n${sample}\r\n`), `template-${kind}.csv`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.import_export_title')}</CardTitle>
        <CardDescription>{t('settings.import_export_description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('settings.backup_json_title')}</p>
          <p className="text-xs text-muted-foreground">{t('settings.backup_json_description')}</p>
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
            {t('settings.download_backup')}
          </Button>
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">{t('settings.import_incomes_title')}</p>
          <p className="text-xs text-muted-foreground">{t('settings.import_incomes_hint')}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadTemplate('incomes')}
            >
              <Download className="h-4 w-4" />
              {t('settings.csv_template')}
            </Button>
            <Button size="sm" onClick={() => setImportIncomesOpen(true)}>
              <Upload className="h-4 w-4" />
              {t('settings.import_incomes_button')}
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">{t('settings.import_expenses_title')}</p>
          <p className="text-xs text-muted-foreground">{t('settings.import_expenses_hint')}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadTemplate('expenses')}
            >
              <Download className="h-4 w-4" />
              {t('settings.csv_template')}
            </Button>
            <Button size="sm" onClick={() => setImportExpensesOpen(true)}>
              <Upload className="h-4 w-4" />
              {t('settings.import_expenses_button')}
            </Button>
          </div>
        </div>
      </CardContent>

      <ImportCsvDialog<ImportedIncome>
        open={importIncomesOpen}
        onOpenChange={setImportIncomesOpen}
        title={t('settings.import_incomes_title')}
        description={t('settings.import_incomes_description')}
        fields={incomeFields}
        onImport={(rows) => importIncomesMutation.mutateAsync(rows)}
      />

      <ImportCsvDialog<ImportedExpense>
        open={importExpensesOpen}
        onOpenChange={setImportExpensesOpen}
        title={t('settings.import_expenses_title')}
        description={t('settings.import_expenses_description')}
        fields={expenseFields}
        onImport={(rows) => importExpensesMutation.mutateAsync(rows)}
      />
    </Card>
  );
}

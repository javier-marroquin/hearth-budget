import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCsv, type CsvColumn } from '@/lib/io/csv';
import i18n from '@/i18n';
import { toast } from 'sonner';

interface ExportCsvButtonProps<T> {
  /** Final filename, e.g. "gastos-2026-05.csv" */
  filename: string;
  rows: T[];
  columns: CsvColumn<T>[];
  label?: string;
  disabled?: boolean;
}

export function ExportCsvButton<T>({
  filename,
  rows,
  columns,
  label = i18n.t('export.csv'),
  disabled,
}: ExportCsvButtonProps<T>) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || rows.length === 0}
      onClick={() => {
        try {
          downloadCsv(filename, rows, columns);
          toast.success(i18n.t('toast.csv_downloaded', { filename }));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : i18n.t('toast.export_error'));
        }
      }}
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}

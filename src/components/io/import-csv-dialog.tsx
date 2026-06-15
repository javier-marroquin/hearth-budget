import { useMemo, useRef, useState } from 'react';
import { AlertCircle, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import i18n from '@/i18n';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { parseCsv, type ParsedCsv } from '@/lib/io/csv';
import {
  applyMapping,
  NULL_COLUMN,
  suggestMapping,
  type FieldDefinition,
} from '@/lib/io/import-mapping';

export interface ImportCsvDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDefinition[];
  /** Called once with the validated rows. Should perform the insert. */
  onImport: (rows: T[]) => Promise<{ inserted: number; failed: number }>;
}

export function ImportCsvDialog<T>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onImport,
}: ImportCsvDialogProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  const result = useMemo(() => {
    if (!csv) return null;
    return applyMapping<T>(csv, mapping, fields);
  }, [csv, mapping, fields]);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.rows.length === 0) {
        toast.error(i18n.t('toast.csv_empty'));
        return;
      }
      setCsv(parsed);
      setMapping(suggestMapping(parsed.headers, fields));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : i18n.t('toast.csv_read_error'));
    }
  };

  const reset = () => {
    setCsv(null);
    setMapping({});
  };

  const startImport = async () => {
    if (!result) return;
    if (result.errors.length > 0) {
      toast.error(i18n.t('toast.import_validation_errors', { count: result.errors.length }));
      return;
    }
    setImporting(true);
    try {
      const res = await onImport(result.rows);
      toast.success(
        res.failed > 0
          ? i18n.t('toast.import_result', { inserted: res.inserted, failed: res.failed })
          : i18n.t('toast.import_success', { count: res.inserted }),
      );
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : i18n.t('toast.import_error'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {!csv && (
          <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8 text-center">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">Selecciona un archivo CSV</p>
              <p className="text-xs text-muted-foreground">
                Acepta separadores , y formatos de fecha YYYY-MM-DD, DD/MM/YYYY, etc.
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <Button onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Elegir archivo
            </Button>
          </div>
        )}

        {csv && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {csv.rows.length} filas detectadas. Asocia cada columna del CSV con su campo correspondiente:
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>
                    {f.label}
                    {f.required && <span className="ml-1 text-destructive">*</span>}
                  </Label>
                  <Select
                    value={mapping[f.key] ?? NULL_COLUMN}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [f.key]: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NULL_COLUMN}>— Ignorar —</SelectItem>
                      {csv.headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Vista previa ({Math.min(5, result?.rows.length ?? 0)} de{' '}
                {result?.rows.length ?? 0})
              </p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {fields.map((f) => (
                        <TableHead key={f.key}>{f.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(result?.rows ?? []).slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {fields.map((f) => {
                          const value = (row as Record<string, unknown>)[f.key];
                          return (
                            <TableCell key={f.key} className="font-mono text-xs">
                              {value === null || value === undefined
                                ? '—'
                                : String(value)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {result && result.errors.length > 0 && (
              <div className="rounded-md border border-amber-300/60 bg-amber-50/40 p-3 text-xs dark:bg-amber-950/20">
                <div className="mb-1 flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4" />
                  {result.errors.length} errores de validación
                </div>
                <ul className="max-h-24 list-disc space-y-0.5 overflow-y-auto pl-5 text-muted-foreground">
                  {result.errors.slice(0, 8).map((e, i) => (
                    <li key={i}>
                      Fila {e.rowIndex + 2}, campo <strong>{e.field}</strong>: {e.message}
                    </li>
                  ))}
                  {result.errors.length > 8 && (
                    <li>… y {result.errors.length - 8} más</li>
                  )}
                </ul>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={reset}>
              Cambiar archivo
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            Cancelar
          </Button>
          <Button
            onClick={startImport}
            disabled={
              !csv ||
              importing ||
              (result?.errors.length ?? 0) > 0 ||
              (result?.rows.length ?? 0) === 0
            }
          >
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            Importar {result?.rows.length ?? 0} filas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

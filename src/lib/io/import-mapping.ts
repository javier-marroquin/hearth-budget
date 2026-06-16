/**
 * Helpers to map raw CSV rows to typed payloads ready to insert.
 */

import type { ParsedCsv } from './csv';

export interface FieldDefinition {
  /** Internal field name we want to fill. */
  key: string;
  /** Human label shown in the dialog. */
  label: string;
  /** Required for an insert to succeed. */
  required?: boolean;
  /** Auto-detection: any header that matches one of these (case-insensitive). */
  aliases?: string[];
  /** Coercion applied to the raw cell value. */
  parse?: (value: string) => unknown;
}

export const NULL_COLUMN = '__null__';

/**
 * Best-effort auto-map: for each field, find the first CSV header that
 * matches its name or any alias.
 */
export function suggestMapping(
  csvHeaders: string[],
  fields: FieldDefinition[],
): Record<string, string> {
  const out: Record<string, string> = {};
  const normalised = csvHeaders.map((h) => h.trim().toLowerCase());
  for (const f of fields) {
    const candidates = [f.key, f.label, ...(f.aliases ?? [])].map((c) =>
      c.toLowerCase(),
    );
    const idx = normalised.findIndex((h) => candidates.includes(h));
    out[f.key] = idx >= 0 ? csvHeaders[idx]! : NULL_COLUMN;
  }
  return out;
}

/**
 * Apply the mapping + field parsers to produce typed rows.
 *
 * Returns parsed objects (one per CSV data row) AND a list of validation
 * errors keyed by row index.
 */
export interface MappedResult<T> {
  rows: T[];
  errors: Array<{ rowIndex: number; field: string; message: string }>;
}

export function applyMapping<T>(
  csv: ParsedCsv,
  mapping: Record<string, string>,
  fields: FieldDefinition[],
): MappedResult<T> {
  const headerIndex = new Map(csv.headers.map((h, i) => [h, i]));
  const rows: T[] = [];
  const errors: MappedResult<T>['errors'] = [];

  csv.rows.forEach((cells, rowIndex) => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const header = mapping[f.key];
      if (!header || header === NULL_COLUMN) {
        if (f.required) {
          errors.push({
            rowIndex,
            field: f.key,
            message: `Columna requerida sin mapear`,
          });
        }
        out[f.key] = null;
        continue;
      }
      const idx = headerIndex.get(header);
      if (idx === undefined) continue;
      const raw = (cells[idx] ?? '').trim();
      if (!raw) {
        if (f.required) {
          errors.push({
            rowIndex,
            field: f.key,
            message: `Empty value in required column`,
          });
        }
        out[f.key] = null;
        continue;
      }
      try {
        out[f.key] = f.parse ? f.parse(raw) : raw;
      } catch (err) {
        errors.push({
          rowIndex,
          field: f.key,
          message: err instanceof Error ? err.message : 'Error de parseo',
        });
      }
    }
    rows.push(out as T);
  });

  return { rows, errors };
}

// --- common parsers --------------------------------------------------------

export function parseNumber(raw: string): number {
  // Strip currency symbols, spaces, etc. Keep only digits, comma, dot, minus.
  const cleaned = raw.replace(/[^0-9,.\-]/g, '');
  if (!cleaned || !/\d/.test(cleaned)) {
    throw new Error(`Not a valid number: ${raw}`);
  }

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  let normalised: string;
  if (lastDot === -1 && lastComma === -1) {
    normalised = cleaned;
  } else if (lastDot === -1) {
    // Only commas. If multiple → all thousands. If one with ≤2 digits after → decimal.
    const parts = cleaned.split(',');
    if (parts.length > 2 || (parts[parts.length - 1] ?? '').length > 2) {
      normalised = cleaned.replace(/,/g, '');
    } else {
      normalised = cleaned.replace(',', '.');
    }
  } else if (lastComma === -1) {
    // Only dots. Same logic.
    const parts = cleaned.split('.');
    if (parts.length > 2 || (parts[parts.length - 1] ?? '').length > 2) {
      normalised = cleaned.replace(/\./g, '');
    } else {
      normalised = cleaned;
    }
  } else if (lastDot > lastComma) {
    // en-US style: comma=thousands, dot=decimal
    normalised = cleaned.replace(/,/g, '');
  } else {
    // es-CO style: dot=thousands, comma=decimal
    normalised = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const n = Number(normalised);
  if (!Number.isFinite(n)) throw new Error(`Not a valid number: ${raw}`);
  return n;
}

export function parseDate(raw: string): string {
  // Accepts:  YYYY-MM-DD  ·  DD/MM/YYYY  ·  D/M/YY  ·  MM-DD-YYYY (US)
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const slash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const [, a, b, c] = slash;
    const year = c!.length === 2 ? `20${c}` : c;
    // Default es-CO interpretation: DD/MM/YYYY
    return `${year}-${b!.padStart(2, '0')}-${a!.padStart(2, '0')}`;
  }
  // Fallback to Date constructor
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  throw new Error(`Fecha no reconocida: ${raw}`);
}

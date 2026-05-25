/**
 * Minimal RFC-4180 CSV encoder/decoder. No dependencies.
 *
 * - Quotes fields containing comma, double-quote, newline or leading/trailing whitespace.
 * - Escapes embedded double-quotes by doubling them.
 * - Adds a UTF-8 BOM to encoded output so Excel opens it correctly.
 */

const SEP = ',';
const LINE = '\r\n';
const BOM = '\uFEFF';

export interface CsvColumn<T> {
  key: string;
  header: string;
  get: (row: T) => string | number | boolean | null | undefined;
}

/**
 * Serialise an array of records to a CSV string.
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const out: string[] = [];
  out.push(columns.map((c) => csvEscape(c.header)).join(SEP));
  for (const row of rows) {
    out.push(columns.map((c) => csvEscape(c.get(row))).join(SEP));
  }
  return BOM + out.join(LINE);
}

/**
 * Build a Blob suitable for downloading.
 */
export function csvBlob(content: string): Blob {
  return new Blob([content], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Trigger a browser download for the given blob + filename.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Shortcut: download `rows` as CSV file named `filename`.
 */
export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const csv = toCsv(rows, columns);
  downloadBlob(csvBlob(csv), filename);
}

// --- decoder ---------------------------------------------------------------

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/**
 * Parse a CSV string. Tolerant of trailing whitespace and Windows/Unix line endings.
 * Returns headers (first row) + remaining rows.
 */
export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === SEP) {
      current.push(field);
      field = '';
    } else if (ch === '\r') {
      // ignore — handled by \n
    } else if (ch === '\n') {
      current.push(field);
      field = '';
      rows.push(current);
      current = [];
    } else {
      field += ch;
    }
  }
  // Tail: push the last field if there was any content or open row
  if (field !== '' || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  // Strip fully-empty trailing rows
  while (rows.length > 0 && rows[rows.length - 1]!.every((c) => c === '')) {
    rows.pop();
  }

  const headers = rows.shift() ?? [];
  return { headers, rows };
}

// --- helpers ---------------------------------------------------------------

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  const needsQuote =
    s.includes(SEP) ||
    s.includes('"') ||
    s.includes('\n') ||
    s.includes('\r') ||
    /^\s|\s$/.test(s);
  if (!needsQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

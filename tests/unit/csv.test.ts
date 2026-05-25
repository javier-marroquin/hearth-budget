import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from '@/lib/io/csv';
import { applyMapping, parseDate, parseNumber, suggestMapping } from '@/lib/io/import-mapping';

describe('toCsv', () => {
  it('encodes simple values with a BOM + CRLF', () => {
    const csv = toCsv(
      [{ a: 'foo', b: 1 }],
      [
        { key: 'a', header: 'A', get: (r) => r.a },
        { key: 'b', header: 'B', get: (r) => r.b },
      ],
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(csv).toContain('A,B\r\n');
    expect(csv).toContain('foo,1');
  });

  it('quotes fields with commas, quotes or newlines', () => {
    const csv = toCsv(
      [
        { x: 'hello, world' },
        { x: 'she said "hi"' },
        { x: 'line\nbreak' },
      ],
      [{ key: 'x', header: 'X', get: (r) => r.x }],
    );
    expect(csv).toContain('"hello, world"');
    expect(csv).toContain('"she said ""hi"""');
    expect(csv).toContain('"line\nbreak"');
  });

  it('emits empty string for null/undefined', () => {
    const csv = toCsv(
      [{ a: null as string | null, b: undefined as string | undefined }],
      [
        { key: 'a', header: 'A', get: (r) => r.a },
        { key: 'b', header: 'B', get: (r) => r.b },
      ],
    );
    // Header line then a row of two empty cells separated by a comma
    expect(csv).toContain('A,B\r\n,');
  });
});

describe('parseCsv', () => {
  it('parses simple files round-tripped through toCsv', () => {
    const csv = toCsv(
      [
        { a: 'x', b: 'y, z' },
        { a: '1', b: '2' },
      ],
      [
        { key: 'a', header: 'A', get: (r) => r.a },
        { key: 'b', header: 'B', get: (r) => r.b },
      ],
    );
    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(['A', 'B']);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toEqual(['x', 'y, z']);
    expect(parsed.rows[1]).toEqual(['1', '2']);
  });

  it('handles embedded quotes and newlines', () => {
    const csv = `A,B\r\n"hi ""you""","multi\nline"\r\n`;
    const parsed = parseCsv(csv);
    expect(parsed.rows[0]).toEqual(['hi "you"', 'multi\nline']);
  });

  it('ignores empty trailing rows', () => {
    const csv = `A,B\r\n1,2\r\n\r\n`;
    const parsed = parseCsv(csv);
    expect(parsed.rows).toHaveLength(1);
  });
});

describe('parseNumber', () => {
  it('parses plain integers and decimals', () => {
    expect(parseNumber('1500')).toBe(1500);
    expect(parseNumber('1500.50')).toBe(1500.5);
  });
  it('handles es-CO style "1.500.000,50"', () => {
    expect(parseNumber('1.500.000,50')).toBe(1_500_000.5);
  });
  it('handles en-US style "1,500.50"', () => {
    expect(parseNumber('1,500.50')).toBe(1500.5);
  });
  it('handles "$ 3.500.000"', () => {
    expect(parseNumber('$ 3.500.000')).toBe(3_500_000);
  });
  it('throws on garbage', () => {
    expect(() => parseNumber('abc')).toThrow();
  });
});

describe('parseDate', () => {
  it('returns ISO date for YYYY-MM-DD input', () => {
    expect(parseDate('2026-05-15')).toBe('2026-05-15');
  });
  it('returns ISO date for DD/MM/YYYY input', () => {
    expect(parseDate('15/05/2026')).toBe('2026-05-15');
  });
  it('pads single digits', () => {
    expect(parseDate('5/3/2026')).toBe('2026-03-05');
  });
  it('throws on garbage', () => {
    expect(() => parseDate('not a date')).toThrow();
  });
});

describe('suggestMapping', () => {
  it('matches by key, label or alias case-insensitively', () => {
    const mapping = suggestMapping(
      ['Fecha', 'Monto', 'Categoria', 'OtraCol'],
      [
        { key: 'date', label: 'Fecha' },
        { key: 'amount', label: 'Monto' },
        { key: 'category_id', label: 'Categoría', aliases: ['categoria'] },
        { key: 'notes', label: 'Notas' },
      ],
    );
    expect(mapping.date).toBe('Fecha');
    expect(mapping.amount).toBe('Monto');
    expect(mapping.category_id).toBe('Categoria');
    expect(mapping.notes).toBe('__null__');
  });
});

describe('applyMapping', () => {
  it('parses cells and reports missing required fields', () => {
    const csv = parseCsv('Fecha,Monto,Notas\r\n2026-01-15,1500,Hola\r\n2026-02-15,,Test\r\n');
    const result = applyMapping<{ date: string; amount: number; notes: string | null }>(
      csv,
      { date: 'Fecha', amount: 'Monto', notes: 'Notas' },
      [
        { key: 'date', label: 'Fecha', required: true, parse: parseDate },
        { key: 'amount', label: 'Monto', required: true, parse: parseNumber },
        { key: 'notes', label: 'Notas' },
      ],
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ date: '2026-01-15', amount: 1500, notes: 'Hola' });
    // Second row has empty amount → validation error
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.rowIndex).toBe(1);
    expect(result.errors[0]?.field).toBe('amount');
  });
});

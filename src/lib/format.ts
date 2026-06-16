/**
 * Formatting helpers (currency, percent, numbers, dates).
 * All formatters are locale-aware via Intl APIs.
 */

import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { es, enUS, type Locale } from 'date-fns/locale';

const DEFAULT_LOCALE = 'es-CO';
const DEFAULT_CURRENCY = 'COP';

const dateFnsLocales: Record<string, Locale> = { es, en: enUS };

export function getDateFnsLocale(locale: string): Locale {
  const base = locale.split('-')[0] ?? 'en';
  return dateFnsLocales[base] ?? es;
}

/** Format a number as currency (defaults to es-CO + COP). */
export function formatCurrency(
  amount: number | null | undefined,
  options: { locale?: string; currency?: string; compact?: boolean } = {},
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  const {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    compact = false,
  } = options;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** Format a number as a percent. `value` is 0..1 (0.25 → "25%"). */
export function formatPercent(
  value: number | null | undefined,
  options: { locale?: string; digits?: number } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const { locale = DEFAULT_LOCALE, digits = 1 } = options;
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Format a plain number with thousand separators. */
export function formatNumber(
  value: number | null | undefined,
  options: { locale?: string; digits?: number } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const { locale = DEFAULT_LOCALE, digits = 0 } = options;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Format a date string or Date with a pattern, locale-aware. */
export function formatDate(
  value: string | Date | null | undefined,
  pattern = 'PP',
  locale = 'en',
): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? parseISO(value) : value;
  if (!isValid(date)) return '—';
  return format(date, pattern, { locale: getDateFnsLocale(locale) });
}

/** Format a date as relative ("3 days ago"). */
export function formatRelative(
  value: string | Date | null | undefined,
  locale = 'en',
): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? parseISO(value) : value;
  if (!isValid(date)) return '—';
  return formatDistanceToNow(date, { addSuffix: true, locale: getDateFnsLocale(locale) });
}

/** Truncate a string with ellipsis. */
export function truncate(value: string, max = 40): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + '…';
}

/** Format a person's name to initials (max 2 chars). */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase();
  return (parts[0]?.[0] ?? '').concat(parts[parts.length - 1]?.[0] ?? '').toUpperCase();
}

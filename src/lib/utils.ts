import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Compose Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Sleep for `ms` milliseconds (useful in mocks/tests). */
export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/** Returns true when running in the browser (not SSR / Node). */
export const isBrowser = () => typeof window !== 'undefined';

/** Safely parse JSON, returning a fallback on error. */
export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Generate a short, URL-safe id (not cryptographically secure). */
export function shortId(length = 8): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    const idx = bytes[i] ?? 0;
    out += chars[idx % chars.length];
  }
  return out;
}

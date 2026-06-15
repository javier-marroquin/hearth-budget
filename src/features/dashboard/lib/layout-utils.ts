import type { LayoutItem } from '../widgets/widget-types';

/** Stable visual order: top→bottom, left→right. */
export function sortLayoutItems(items: LayoutItem[]): LayoutItem[] {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * Reflow widgets into `cols` columns (mobile / tablet), preserving
 * sort order — similar to how iOS rearranges icons on a narrower grid.
 */
export function reflowLayout(items: LayoutItem[], cols: number): LayoutItem[] {
  const sorted = sortLayoutItems(items);
  let x = 0;
  let y = 0;
  let rowMaxH = 0;
  const out: LayoutItem[] = [];

  for (const it of sorted) {
    let w = Math.min(Math.max(it.w, 1), cols);

    if (x + w > cols) {
      x = 0;
      y += rowMaxH;
      rowMaxH = 0;
    }

    out.push({ ...it, x, y, w, h: it.h });
    rowMaxH = Math.max(rowMaxH, it.h);
    x += w;

    if (x >= cols) {
      x = 0;
      y += rowMaxH;
      rowMaxH = 0;
    }
  }

  return out;
}

/** Single-column stack for very small screens. */
export function stackLayout(items: LayoutItem[], cols: number): LayoutItem[] {
  const sorted = sortLayoutItems(items);
  let y = 0;
  return sorted.map((it) => {
    const next = { ...it, x: 0, y, w: cols, h: it.h };
    y += it.h;
    return next;
  });
}

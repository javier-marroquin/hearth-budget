import { describe, expect, it } from 'vitest';
import { reflowLayout, sortLayoutItems } from './layout-utils';
import type { LayoutItem } from '../widgets/widget-types';

const sample: LayoutItem[] = [
  { instanceId: 'a', widgetId: 'kpi-hero', x: 0, y: 0, w: 12, h: 2 },
  { instanceId: 'b', widgetId: 'kpi-total-income', x: 0, y: 2, w: 2, h: 2 },
  { instanceId: 'c', widgetId: 'kpi-balance', x: 4, y: 2, w: 2, h: 2 },
];

describe('sortLayoutItems', () => {
  it('orders by y then x', () => {
    const shuffled = [sample[2]!, sample[0]!, sample[1]!];
    const sorted = sortLayoutItems(shuffled);
    expect(sorted.map((i) => i.instanceId)).toEqual(['a', 'b', 'c']);
  });
});

describe('reflowLayout', () => {
  it('wraps into fewer columns without overlap', () => {
    const reflowed = reflowLayout(sample, 6);
    expect(reflowed[0]!.w).toBe(6);
    expect(reflowed[1]!.x).toBe(0);
    expect(reflowed[1]!.w).toBeLessThanOrEqual(6);
    const rows = reflowed.map((i) => i.y);
    expect(new Set(rows).size).toBeGreaterThan(1);
  });
});

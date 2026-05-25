import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Filler,
} from 'chart.js';

let registered = false;

/** Register Chart.js components once (lazy). */
export function ensureChartJsRegistered() {
  if (registered) return;
  ChartJS.register(
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip,
    Legend,
    Filler,
  );
  registered = true;
}

/** Read a CSS variable as HSL color string for Chart.js usage. */
export function cssColor(varName: string, alpha = 1): string {
  if (typeof window === 'undefined') return `hsla(0, 0%, 50%, ${alpha})`;
  const root = getComputedStyle(document.documentElement);
  const value = root.getPropertyValue(varName).trim();
  if (!value) return `hsla(0, 0%, 50%, ${alpha})`;
  return `hsl(${value} / ${alpha})`;
}

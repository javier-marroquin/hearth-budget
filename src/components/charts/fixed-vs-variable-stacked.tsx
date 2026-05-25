import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { ensureChartJsRegistered, cssColor } from './chart-defaults';
import { formatCurrency } from '@/lib/format';

interface Props {
  data: { fixed: number; variable: number; debt: number; one_time: number };
  currency?: string;
}

export function FixedVsVariableStacked({ data, currency }: Props) {
  ensureChartJsRegistered();

  const chartData = {
    labels: ['Este mes'],
    datasets: [
      {
        label: 'Fijos',
        data: [data.fixed],
        backgroundColor: cssColor('--chart-1', 0.85),
        borderRadius: 4,
      },
      {
        label: 'Variables',
        data: [data.variable],
        backgroundColor: cssColor('--chart-3', 0.85),
        borderRadius: 4,
      },
      {
        label: 'Deudas',
        data: [data.debt],
        backgroundColor: cssColor('--destructive', 0.85),
        borderRadius: 4,
      },
      {
        label: 'Únicos',
        data: [data.one_time],
        backgroundColor: cssColor('--chart-4', 0.85),
        borderRadius: 4,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true } },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, { currency, compact: true })}`,
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: {
        stacked: true,
        ticks: {
          callback: (v) => formatCurrency(Number(v), { currency, compact: true }),
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}

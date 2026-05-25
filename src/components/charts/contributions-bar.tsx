import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { ensureChartJsRegistered, cssColor } from './chart-defaults';
import { formatCurrency } from '@/lib/format';

interface Props {
  data: Array<{ name: string; amount: number; pending: number }>;
  currency?: string;
}

export function ContributionsBar({ data, currency }: Props) {
  ensureChartJsRegistered();

  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        label: 'Recibido',
        data: data.map((d) => d.amount),
        backgroundColor: cssColor('--success', 0.85),
        borderRadius: 6,
      },
      {
        label: 'Pendiente',
        data: data.map((d) => d.pending),
        backgroundColor: cssColor('--warning', 0.85),
        borderRadius: 6,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true } },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.x, { currency, compact: true })}`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          callback: (v) => formatCurrency(Number(v), { currency, compact: true }),
        },
      },
      y: { stacked: true, grid: { display: false } },
    },
  };

  return (
    <div className="h-72">
      <Bar data={chartData} options={options} />
    </div>
  );
}

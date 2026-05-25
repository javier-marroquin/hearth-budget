import { Doughnut } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { ensureChartJsRegistered } from './chart-defaults';
import { formatCurrency } from '@/lib/format';

interface Props {
  data: Array<{ category: string; color: string; amount: number }>;
  currency?: string;
}

export function CategoryDoughnut({ data, currency }: Props) {
  ensureChartJsRegistered();

  const chartData = {
    labels: data.map((d) => d.category),
    datasets: [
      {
        data: data.map((d) => d.amount),
        backgroundColor: data.map((d) => d.color),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right',
        labels: { usePointStyle: true, boxWidth: 8, padding: 10 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.label}: ${formatCurrency(Number(ctx.parsed), { currency, compact: true })}`,
        },
      },
    },
  };

  return (
    <div className="h-72">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}

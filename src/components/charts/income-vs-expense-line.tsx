import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { format, parse } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { ensureChartJsRegistered, cssColor } from './chart-defaults';
import { formatCurrency } from '@/lib/format';

interface Props {
  data: Array<{ monthIso: string; income: number; expense: number }>;
  currency?: string;
}

export function IncomeVsExpenseLine({ data, currency }: Props) {
  const { t, i18n } = useTranslation();
  ensureChartJsRegistered();

  const dateLocale = i18n.language.startsWith('en') ? enUS : es;

  const chartData = useMemo(() => {
    const labels = data.map((d) =>
      format(parse(d.monthIso, 'yyyy-MM', new Date()), 'MMM', { locale: dateLocale }),
    );
    return {
      labels,
      datasets: [
        {
          label: t('charts.income'),
          data: data.map((d) => d.income),
          borderColor: cssColor('--success'),
          backgroundColor: cssColor('--success', 0.15),
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3,
        },
        {
          label: t('charts.expenses'),
          data: data.map((d) => d.expense),
          borderColor: cssColor('--destructive'),
          backgroundColor: cssColor('--destructive', 0.15),
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3,
        },
      ],
    };
  }, [data, t, dateLocale]);

  const options: ChartOptions<'line'> = {
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
      x: { grid: { display: false } },
      y: {
        ticks: {
          callback: (v) => formatCurrency(Number(v), { currency, compact: true }),
        },
      },
    },
  };

  return (
    <div className="h-full min-h-[140px] w-full">
      <Line data={chartData} options={options} />
    </div>
  );
}

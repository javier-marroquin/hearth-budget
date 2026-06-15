import { useTranslation } from 'react-i18next';
import type { CalendarEventStatus } from '@/lib/db/aliases';

const LEGEND: CalendarEventStatus[] = [
  'pending',
  'paid',
  'overdue',
  'recurring',
  'contribution',
  'savings',
];

const LEGEND_CLASS: Record<CalendarEventStatus, string> = {
  pending: 'bg-[hsl(38_92%_50%)]',
  paid: 'bg-[hsl(142_71%_45%)]',
  overdue: 'bg-[hsl(0_72%_51%)]',
  recurring: 'bg-[hsl(252_75%_60%)]',
  contribution: 'bg-[hsl(199_89%_48%)]',
  savings: 'bg-[hsl(280_75%_60%)]',
  completed: 'bg-[hsl(215_16%_47%)]',
};

export function CalendarLegend() {
  const { t } = useTranslation();

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t('calendar.legend')}
      </span>
      {LEGEND.map((status) => (
        <div key={status} className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${LEGEND_CLASS[status]}`}
            aria-hidden
          />
          <span className="text-[13px] text-muted-foreground">
            {t(`calendar.status.${status}`)}
          </span>
        </div>
      ))}
    </div>
  );
}

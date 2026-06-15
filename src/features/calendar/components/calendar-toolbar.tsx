import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { useCalendarStore } from '@/stores/calendar.store';

type CalendarView = ReturnType<typeof useCalendarStore.getState>['view'];

interface CalendarToolbarProps {
  title: string;
  view: CalendarView;
  isMobile: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
}

export function CalendarToolbar({
  title,
  view,
  isMobile,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: CalendarToolbarProps) {
  const { t } = useTranslation();

  const viewOptions = isMobile
    ? [
        { value: 'dayGridMonth' as const, label: t('calendar.views.month') },
        { value: 'listMonth' as const, label: t('calendar.views.list') },
      ]
    : [
        { value: 'dayGridMonth' as const, label: t('calendar.views.month') },
        { value: 'timeGridWeek' as const, label: t('calendar.views.week') },
        { value: 'timeGridDay' as const, label: t('calendar.views.day') },
        { value: 'listMonth' as const, label: t('calendar.views.list') },
      ];

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onPrev}
            aria-label={t('calendar.nav.prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onNext}
            aria-label={t('calendar.nav.next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onToday}>
          {t('calendar.nav.today')}
        </Button>
        <h2 className="ml-1 truncate text-section font-semibold tracking-tight sm:ml-2">
          {title}
        </h2>
      </div>

      <SegmentedControl
        value={view}
        options={viewOptions}
        onChange={onViewChange}
        aria-label={t('calendar.views.label')}
        fullWidth
        className="sm:w-auto sm:flex-none"
      />
    </div>
  );
}

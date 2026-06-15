import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventInput, EventClickArg, DateSelectArg } from '@fullcalendar/core';
import type { EventChangeArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import enLocale from '@fullcalendar/core/locales/en-gb';
import { useTranslation } from 'react-i18next';
import { useCalendarStore } from '@/stores/calendar.store';
import { CalendarToolbar } from './calendar-toolbar';
import { CalendarLegend } from './calendar-legend';
import type { CalendarEventRow, CalendarEventStatus } from '@/lib/db/aliases';

interface BudgetCalendarProps {
  events: CalendarEventRow[];
  onSelectSlot: (start: string) => void;
  onSelectEvent: (event: CalendarEventRow) => void;
  onEventChange: (id: string, patch: { start_at: string; end_at: string | null }) => void;
}

const STATUS_CLASS: Record<CalendarEventStatus, string> = {
  pending: 'fc-event-status-pending',
  paid: 'fc-event-status-paid',
  overdue: 'fc-event-status-overdue',
  recurring: 'fc-event-status-recurring',
  contribution: 'fc-event-status-contribution',
  savings: 'fc-event-status-savings',
  completed: 'fc-event-status-completed',
};

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

export function BudgetCalendar({
  events,
  onSelectSlot,
  onSelectEvent,
  onEventChange,
}: BudgetCalendarProps) {
  const { i18n } = useTranslation();
  const ref = useRef<FullCalendar>(null);
  const view = useCalendarStore((s) => s.view);
  const setView = useCalendarStore((s) => s.setView);
  const setDate = useCalendarStore((s) => s.setDate);
  const isMobile = useIsMobile();
  const [title, setTitle] = useState('');

  const activeView = isMobile
    ? view === 'listMonth'
      ? 'listMonth'
      : 'dayGridMonth'
    : view;

  useEffect(() => {
    const api = ref.current?.getApi();
    if (api && api.view.type !== activeView) {
      api.changeView(activeView);
    }
  }, [activeView]);

  const fcEvents: EventInput[] = useMemo(
    () =>
      events.map((e) => {
        const status = e.status;
        const customClass = e.color ? undefined : STATUS_CLASS[status];
        return {
          id: e.id,
          title: e.title,
          start: e.start_at,
          end: e.end_at ?? undefined,
          allDay: e.all_day,
          backgroundColor: e.color ?? undefined,
          borderColor: e.color ?? undefined,
          classNames: customClass ? [customClass, 'fc-event-minimal'] : ['fc-event-minimal'],
          extendedProps: { row: e },
        };
      }),
    [events],
  );

  const handleClick = (arg: EventClickArg) => {
    const row = arg.event.extendedProps.row as CalendarEventRow | undefined;
    if (row) onSelectEvent(row);
  };

  const handleSelect = (arg: DateSelectArg) => {
    const iso = arg.allDay
      ? arg.startStr
      : arg.start.toISOString().slice(0, 16);
    onSelectSlot(iso);
  };

  const handleChange = (arg: EventChangeArg) => {
    const id = arg.event.id;
    onEventChange(id, {
      start_at: arg.event.start?.toISOString() ?? '',
      end_at: arg.event.end?.toISOString() ?? null,
    });
  };

  const api = () => ref.current?.getApi();

  return (
    <div className="budget-calendar-shell overflow-hidden rounded-xl border border-border bg-card">
      <div className="p-4 md:p-6">
        <CalendarToolbar
          title={title}
          view={activeView}
          isMobile={isMobile}
          onPrev={() => api()?.prev()}
          onNext={() => api()?.next()}
          onToday={() => api()?.today()}
          onViewChange={(next) => {
            setView(next);
            api()?.changeView(next);
          }}
        />

        <div className="budget-calendar-grid mt-4">
          <FullCalendar
            ref={ref}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={activeView}
            height="auto"
            contentHeight={isMobile ? 'auto' : undefined}
            firstDay={1}
            locale={i18n.language === 'en' ? enLocale : esLocale}
            headerToolbar={false}
            footerToolbar={false}
            editable={!isMobile}
            selectable
            selectMirror
            dayMaxEvents={isMobile ? 2 : 4}
            events={fcEvents}
            eventClick={handleClick}
            select={handleSelect}
            eventChange={handleChange}
            datesSet={(arg) => {
              setTitle(arg.view.title);
              setDate(arg.startStr.slice(0, 10));
              setView(arg.view.type as typeof view);
            }}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false,
              hour12: false,
            }}
            dayHeaderFormat={{ weekday: 'short' }}
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
          />
        </div>

        <CalendarLegend />
      </div>
    </div>
  );
}

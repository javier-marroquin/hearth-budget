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
import type { CalendarEventRow, CalendarEventStatus } from '@/lib/supabase/aliases';

interface BudgetCalendarProps {
  events: CalendarEventRow[];
  onSelectSlot: (start: string) => void;
  onSelectEvent: (event: CalendarEventRow) => void;
  onEventChange: (id: string, patch: { start_at: string; end_at: string | null }) => void;
}

const STATUS_HSL: Record<CalendarEventStatus, string> = {
  pending: 'hsl(38 92% 50%)',
  paid: 'hsl(142 71% 45%)',
  overdue: 'hsl(0 84% 60%)',
  recurring: 'hsl(252 75% 60%)',
  contribution: 'hsl(199 89% 48%)',
  savings: 'hsl(280 75% 60%)',
  completed: 'hsl(215 16% 47%)',
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
  const isMobile = useIsMobile();

  const fcEvents: EventInput[] = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start_at,
        end: e.end_at ?? undefined,
        allDay: e.all_day,
        backgroundColor: e.color ?? STATUS_HSL[e.status],
        borderColor: e.color ?? STATUS_HSL[e.status],
        textColor: '#ffffff',
        extendedProps: { row: e },
      })),
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

  return (
    <div className="rounded-lg border bg-card p-2 md:p-4">
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={isMobile ? 'listMonth' : view}
        height="auto"
        contentHeight={isMobile ? 'auto' : undefined}
        firstDay={1}
        locale={i18n.language === 'en' ? enLocale : esLocale}
        headerToolbar={
          isMobile
            ? {
                left: 'prev,next',
                center: 'title',
                right: 'today',
              }
            : {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
              }
        }
        footerToolbar={
          isMobile
            ? {
                center: 'dayGridMonth,listMonth',
              }
            : undefined
        }
        buttonText={{
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
          list: 'Agenda',
        }}
        editable={!isMobile}
        selectable
        selectMirror
        dayMaxEvents={isMobile ? 2 : 3}
        events={fcEvents}
        eventClick={handleClick}
        select={handleSelect}
        eventChange={handleChange}
        viewDidMount={(arg) =>
          setView(arg.view.type as ReturnType<typeof useCalendarStore.getState>['view'])
        }
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false,
          hour12: false,
        }}
      />
    </div>
  );
}

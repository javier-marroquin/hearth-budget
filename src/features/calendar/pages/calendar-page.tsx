import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetCalendar } from '../components/budget-calendar';
import { EventFormDialog } from '../components/event-form-dialog';
import { CalendarFilters } from '../components/calendar-filters';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import {
  useCalendarEvents,
  useUpdateCalendarEvent,
} from '../hooks/use-calendar-events';
import { useRealtimeCalendarSync } from '../hooks/use-realtime-sync';
import { useCalendarStore } from '@/stores/calendar.store';
import { usePermissions } from '@/hooks/use-permissions';
import type { CalendarEventRow } from '@/lib/db/aliases';

export function CalendarPage() {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const householdId = activeHousehold?.id ?? '';
  const filters = useCalendarStore((s) => s.filters);
  const { canWriteExpenses } = usePermissions();

  const { data: events, isLoading } = useCalendarEvents(
    activeHousehold
      ? {
          householdId,
          ...(filters.status !== 'all' && { status: filters.status }),
          ...(filters.eventType !== 'all' && { eventType: filters.eventType }),
          ...(filters.userId !== 'all' && { userId: filters.userId }),
        }
      : null,
  );
  const update = useUpdateCalendarEvent(householdId);

  // Subscribe to realtime updates (changes from other members reflect live).
  useRealtimeCalendarSync(householdId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEventRow | null>(null);
  const [defaultStart, setDefaultStart] = useState<string | undefined>();

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    const search = filters.search.trim().toLowerCase();
    if (!search) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(search) ||
        (e.description ?? '').toLowerCase().includes(search),
    );
  }, [events, filters.search]);

  return (
    <>
      <PageHeader
        title={t('nav.calendar')}
        actions={
          canWriteExpenses && (
            <Button
              onClick={() => {
                setEditing(null);
                setDefaultStart(new Date().toISOString().slice(0, 16));
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t('calendar.new_event')}
            </Button>
          )
        }
      />

      <CalendarFilters />

      {isLoading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : (
        <BudgetCalendar
          events={filteredEvents}
          onSelectSlot={(start) => {
            if (!canWriteExpenses) return;
            setEditing(null);
            setDefaultStart(start);
            setOpen(true);
          }}
          onSelectEvent={(event) => {
            setEditing(event);
            setOpen(true);
          }}
          onEventChange={(id, patch) => {
            update.mutate({ id, patch });
          }}
        />
      )}

      <EventFormDialog
        open={open}
        onOpenChange={setOpen}
        event={editing}
        defaultStartAt={defaultStart}
      />
    </>
  );
}

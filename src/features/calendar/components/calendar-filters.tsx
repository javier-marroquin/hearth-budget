import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCalendarStore } from '@/stores/calendar.store';
import { useHouseholdMembers } from '@/features/households/hooks/use-households';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import type {
  CalendarEventStatus,
  CalendarEventType,
} from '@/lib/supabase/database.types';

const STATUSES: CalendarEventStatus[] = [
  'pending',
  'paid',
  'overdue',
  'recurring',
  'contribution',
  'savings',
  'completed',
];
const TYPES: CalendarEventType[] = [
  'expense',
  'income',
  'contribution',
  'goal',
  'reminder',
];

export function CalendarFilters() {
  const { t } = useTranslation();
  const { filters, setFilters, resetFilters } = useCalendarStore();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { data: members } = useHouseholdMembers(activeHousehold?.id);

  const active = members?.filter((m) => m.status === 'active' && m.user_id);

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.eventType !== 'all' ||
    filters.userId !== 'all';

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-card p-3">
      <Filter className="h-4 w-4 text-muted-foreground" />

      <Select
        value={filters.status}
        onValueChange={(v) =>
          setFilters({ status: v as CalendarEventStatus | 'all' })
        }
      >
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder={t('calendar.filters.status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')}</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`calendar.status.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.eventType}
        onValueChange={(v) =>
          setFilters({ eventType: v as CalendarEventType | 'all' })
        }
      >
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder={t('calendar.filters.type')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')}</SelectItem>
          {TYPES.map((tp) => (
            <SelectItem key={tp} value={tp}>
              {tp}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.userId}
        onValueChange={(v) => setFilters({ userId: v })}
      >
        <SelectTrigger className="h-8 w-[160px]">
          <SelectValue placeholder={t('calendar.filters.user')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')}</SelectItem>
          {active?.map((m) => (
            <SelectItem key={m.id} value={m.user_id!}>
              {m.profile?.full_name ?? m.profile?.email ?? 'Miembro'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <X className="h-4 w-4" />
          Limpiar
        </Button>
      )}
    </div>
  );
}

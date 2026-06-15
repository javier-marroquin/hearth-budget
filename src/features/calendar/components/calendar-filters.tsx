import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCalendarStore } from '@/stores/calendar.store';
import { useHouseholdMembers } from '@/features/households/hooks/use-households';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import type {
  CalendarEventStatus,
  CalendarEventType,
} from '@/lib/db/aliases';

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
    filters.userId !== 'all' ||
    filters.search.trim().length > 0;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-secondary p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder={t('calendar.filters.search')}
          className="h-10 bg-background pl-9"
        />
      </div>

      <Select
        value={filters.status}
        onValueChange={(v) =>
          setFilters({ status: v as CalendarEventStatus | 'all' })
        }
      >
        <SelectTrigger className="h-10 w-full bg-background sm:w-[150px]">
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
        <SelectTrigger className="h-10 w-full bg-background sm:w-[150px]">
          <SelectValue placeholder={t('calendar.filters.type')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')}</SelectItem>
          {TYPES.map((tp) => (
            <SelectItem key={tp} value={tp}>
              {t(`calendar.event_type.${tp}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.userId}
        onValueChange={(v) => setFilters({ userId: v })}
      >
        <SelectTrigger className="h-10 w-full bg-background sm:w-[170px]">
          <SelectValue placeholder={t('calendar.filters.user')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')}</SelectItem>
          {active?.map((m) => (
            <SelectItem key={m.id} value={m.user_id!}>
              {m.profile?.full_name ?? m.profile?.email ?? t('common.member')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={resetFilters}>
          <X className="h-4 w-4" />
          {t('calendar.filters.clear')}
        </Button>
      )}
    </div>
  );
}

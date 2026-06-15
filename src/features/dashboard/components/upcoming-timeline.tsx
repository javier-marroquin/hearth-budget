import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarClock,
  ChevronRight,
  GripVertical,
  HandCoins,
  Receipt,
  RotateCcw,
  Target,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useUpcoming } from '../hooks/use-upcoming';
import { useUpcomingOrder } from '../hooks/use-upcoming-order';
import type { UpcomingItem, UpcomingKind } from '../services/upcoming.service';

interface UpcomingTimelineProps {
  householdId: string;
  currency?: string;
  windowDays?: number;
  variant?: 'default' | 'sidebar';
}

const KIND_META: Record<
  UpcomingKind,
  {
    icon: typeof Wallet;
    bg: string;
    text: string;
    sign: 1 | -1;
  }
> = {
  income: {
    icon: Wallet,
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    sign: 1,
  },
  expense: {
    icon: Receipt,
    bg: 'bg-red-500/15',
    text: 'text-red-600 dark:text-red-400',
    sign: -1,
  },
  contribution: {
    icon: HandCoins,
    bg: 'bg-sky-500/15',
    text: 'text-sky-600 dark:text-sky-400',
    sign: 1,
  },
  event: {
    icon: CalendarIcon,
    bg: 'bg-violet-500/15',
    text: 'text-violet-600 dark:text-violet-400',
    sign: 1,
  },
  goal: {
    icon: Target,
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    sign: -1,
  },
};

export function UpcomingTimeline({
  householdId,
  currency,
  windowDays = 14,
  variant = 'default',
}: UpcomingTimelineProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useUpcoming(householdId, windowDays);
  const { applyOrder, moveItem, setOrderedIds, syncWithItems } =
    useUpcomingOrder(householdId);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const sidebar = variant === 'sidebar';

  const sortedItems = useMemo(() => {
    if (!data?.items.length) return [];
    return applyOrder(data.items);
  }, [data, applyOrder]);

  useEffect(() => {
    if (data?.items.length) syncWithItems(data.items);
  }, [data?.items, syncWithItems]);

  const handleClick = (item: UpcomingItem) => {
    switch (item.kind) {
      case 'expense':
        navigate('/expenses');
        break;
      case 'income':
        navigate('/incomes');
        break;
      case 'contribution':
        navigate('/contributions');
        break;
      case 'event':
        navigate('/calendar');
        break;
      case 'goal':
        navigate('/goals');
        break;
    }
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    moveItem(
      dragId,
      targetId,
      sortedItems.map((i) => i.id),
    );
    setDragId(null);
    setDropTargetId(null);
  };

  const resetOrder = () => {
    if (!data?.items.length) return;
    setOrderedIds(data.items.map((i) => i.id));
  };

  return (
    <Card
      className={cn(
        'flex flex-col overflow-hidden',
        sidebar && 'h-full max-h-[min(70vh,640px)] lg:max-h-[calc(100vh-7rem)]',
      )}
    >
      <CardHeader className={cn('shrink-0 space-y-0', sidebar ? 'px-4 py-3' : 'pb-3')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className={cn(sidebar ? 'text-sm' : 'text-base')}>
              {t('dashboard.upcoming.title')}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              {t('dashboard.upcoming.window', { days: windowDays })}
            </p>
          </div>
          {data && data.overdueCount > 0 && (
            <Badge variant="destructive" className="h-5 shrink-0 gap-0.5 px-1.5 text-[10px]">
              <AlertCircle className="h-2.5 w-2.5" />
              {data.overdueCount}
            </Badge>
          )}
        </div>
        {sortedItems.length > 0 && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {t('dashboard.upcoming.drag_hint')}
          </p>
        )}
      </CardHeader>

      <CardContent
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          sidebar ? 'overflow-hidden px-3 pb-3 pt-0' : 'pt-0',
        )}
      >
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {!isLoading && data && data.items.length === 0 && (
          <EmptyState
            icon={CalendarClock}
            title={t('dashboard.upcoming.empty_title')}
            description={t('dashboard.upcoming.empty_description', {
              days: windowDays,
            })}
          />
        )}

        {!isLoading && data && data.items.length > 0 && (
          <>
            <div
              className={cn(
                'mb-2 flex shrink-0 flex-wrap gap-x-3 gap-y-1 rounded-lg border border-border bg-secondary px-2.5 py-2 text-[10px]',
                sidebar && 'flex-col gap-1',
              )}
            >
              <SummaryChip
                label={t('dashboard.upcoming.income_total')}
                value={data.totalIncome}
                currency={currency}
                tone="emerald"
              />
              <SummaryChip
                label={t('dashboard.upcoming.expense_total')}
                value={data.totalExpense}
                currency={currency}
                tone="red"
              />
              <SummaryChip
                label={t('dashboard.upcoming.net')}
                value={data.totalIncome - data.totalExpense}
                currency={currency}
                tone={
                  data.totalIncome - data.totalExpense >= 0 ? 'emerald' : 'red'
                }
              />
            </div>

            <ul
              className={cn(
                'min-h-0 flex-1 space-y-1.5',
                sidebar && 'overflow-y-auto pr-0.5',
              )}
            >
              {sortedItems.map((item) => (
                <UpcomingRow
                  key={item.id}
                  item={item}
                  fallbackCurrency={currency}
                  compact={sidebar}
                  locale={i18n.language}
                  isDragging={dragId === item.id}
                  isDropTarget={dropTargetId === item.id && dragId !== item.id}
                  onNavigate={() => handleClick(item)}
                  onDragStart={() => setDragId(item.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setDropTargetId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropTargetId(item.id);
                  }}
                  onDragLeave={() => {
                    if (dropTargetId === item.id) setDropTargetId(null);
                  }}
                  onDrop={() => handleDrop(item.id)}
                />
              ))}
            </ul>

            <div className="mt-2 flex shrink-0 justify-end border-t pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[10px]"
                onClick={resetOrder}
              >
                <RotateCcw className="h-3 w-3" />
                {t('dashboard.upcoming.reset_order')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingRow({
  item,
  fallbackCurrency,
  compact,
  locale,
  isDragging,
  isDropTarget,
  onNavigate,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  item: UpcomingItem;
  fallbackCurrency?: string;
  compact?: boolean;
  locale: string;
  isDragging: boolean;
  isDropTarget: boolean;
  onNavigate: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  const { t } = useTranslation();
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const isOverdue = item.daysUntil < 0;
  const signed = item.amount != null ? item.amount * meta.sign : null;

  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={cn(
        'flex items-stretch gap-0.5 rounded-lg border border-border bg-card transition-colors duration-150',
        isDragging && 'opacity-50',
        isDropTarget && 'ring-2 ring-primary/40',
        isOverdue && 'border-red-300/50 dark:border-red-900/40',
      )}
    >
      <div
        className={cn(
          'flex cursor-grab items-center px-1 text-muted-foreground active:cursor-grabbing',
          compact ? 'pl-0.5' : 'pl-1',
        )}
        aria-hidden
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-40" />
      </div>
      <button
        type="button"
        onClick={onNavigate}
        className={cn(
          'group flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:bg-accent/40',
          compact ? 'py-2 pr-2' : 'gap-3 p-2.5 pr-3',
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded',
            compact ? 'h-7 w-7' : 'h-8 w-8',
            meta.bg,
            meta.text,
          )}
        >
          <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-xs font-medium">{item.title}</span>
            {isOverdue && (
              <Badge variant="destructive" className="h-3.5 px-1 text-[9px]">
                {t('calendar.status.overdue')}
              </Badge>
            )}
          </div>
          <p className="truncate text-[10px] text-muted-foreground">
            {formatDate(item.date, compact ? 'd MMM' : 'PP', locale)}
            {item.subtitle ? ` · ${item.subtitle}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {signed !== null && (
            <p
              className={cn(
                'text-xs font-semibold tabular-nums',
                meta.sign === 1
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-foreground',
              )}
            >
              {meta.sign === 1 ? '+' : '-'}
              {formatCurrency(Math.abs(signed), {
                currency: item.currency ?? fallbackCurrency,
                compact: true,
              })}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">
            {relativeDayLabel(item.daysUntil, locale)}
          </p>
        </div>
        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:block" />
      </button>
    </li>
  );
}

function SummaryChip({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: number;
  currency?: string;
  tone: 'emerald' | 'red';
}) {
  const cls =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold tabular-nums', cls)}>
        {formatCurrency(value, { currency, compact: true })}
      </span>
    </div>
  );
}

function relativeDayLabel(d: number, locale: string): string {
  const en = locale.startsWith('en');
  if (d === 0) return en ? 'Today' : 'Hoy';
  if (d === 1) return en ? 'Tomorrow' : 'Mañana';
  if (d === -1) return en ? 'Yesterday' : 'Ayer';
  if (d < 0) return en ? `${Math.abs(d)}d ago` : `-${Math.abs(d)}d`;
  return en ? `+${d}d` : `+${d}d`;
}

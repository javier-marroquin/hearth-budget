import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarClock,
  ChevronRight,
  HandCoins,
  Receipt,
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
import type { UpcomingItem, UpcomingKind } from '../services/upcoming.service';

interface UpcomingTimelineProps {
  householdId: string;
  currency?: string;
  /** Days ahead to look. Default 14. */
  windowDays?: number;
}

const KIND_META: Record<
  UpcomingKind,
  {
    icon: typeof Wallet;
    bg: string;
    text: string;
    label: string;
    sign: 1 | -1;
  }
> = {
  income: {
    icon: Wallet,
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Ingreso',
    sign: 1,
  },
  expense: {
    icon: Receipt,
    bg: 'bg-red-500/15',
    text: 'text-red-600 dark:text-red-400',
    label: 'Gasto',
    sign: -1,
  },
  contribution: {
    icon: HandCoins,
    bg: 'bg-sky-500/15',
    text: 'text-sky-600 dark:text-sky-400',
    label: 'Aporte',
    sign: 1,
  },
  event: {
    icon: CalendarIcon,
    bg: 'bg-violet-500/15',
    text: 'text-violet-600 dark:text-violet-400',
    label: 'Evento',
    sign: 1,
  },
  goal: {
    icon: Target,
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'Meta',
    sign: -1,
  },
};

export function UpcomingTimeline({
  householdId,
  currency,
  windowDays = 14,
}: UpcomingTimelineProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useUpcoming(householdId, windowDays);
  const [expanded, setExpanded] = useState(false);

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, UpcomingItem[]>();
    for (const item of data.items) {
      const day = item.date.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(item);
    }
    return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
  }, [data]);

  const visible = expanded ? grouped : grouped.slice(0, 5);
  const hasMore = grouped.length > 5;

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">
            {t('dashboard.upcoming.title')}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.upcoming.window', { days: windowDays })}
          </p>
        </div>
        {data && data.overdueCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {data.overdueCount} {t('dashboard.upcoming.overdue')}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
            {/* Net summary line */}
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-md border bg-muted/30 p-3 text-xs">
              <SummaryLine
                label={t('dashboard.upcoming.income_total')}
                value={data.totalIncome}
                currency={currency}
                tone="emerald"
              />
              <SummaryLine
                label={t('dashboard.upcoming.expense_total')}
                value={data.totalExpense}
                currency={currency}
                tone="red"
              />
              <SummaryLine
                label={t('dashboard.upcoming.net')}
                value={data.totalIncome - data.totalExpense}
                currency={currency}
                tone={
                  data.totalIncome - data.totalExpense >= 0 ? 'emerald' : 'red'
                }
              />
            </div>

            <div className="space-y-4">
              {visible.map((group, gi) => (
                <motion.div
                  key={group.day}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gi * 0.03 }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {dayLabel(group.day, i18n.language)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(group.day, 'PPP', i18n.language)}
                    </span>
                    <div className="ml-2 h-px flex-1 bg-border" />
                  </div>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <UpcomingRow
                        key={item.id}
                        item={item}
                        fallbackCurrency={currency}
                        onClick={() => handleClick(item)}
                      />
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded
                    ? t('dashboard.upcoming.collapse')
                    : t('dashboard.upcoming.see_all', {
                        count: grouped.length - 5,
                      })}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingRow({
  item,
  fallbackCurrency,
  onClick,
}: {
  item: UpcomingItem;
  fallbackCurrency?: string;
  onClick: () => void;
}) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const isOverdue = item.daysUntil < 0;
  const signed = item.amount != null ? item.amount * meta.sign : null;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group flex w-full items-center gap-3 rounded-md border bg-card p-3 text-left transition-colors hover:bg-accent/40',
          isOverdue && 'border-red-300/60 dark:border-red-900/40',
        )}
      >
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
            meta.bg,
            meta.text,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{item.title}</span>
            {isOverdue && (
              <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                Vencido
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {item.subtitle ? `${item.subtitle} · ` : ''}
            <span className={meta.text}>{meta.label}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          {signed !== null && (
            <p
              className={cn(
                'text-sm font-semibold tabular-nums',
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
          <p className="text-xs text-muted-foreground">
            {relativeDayLabel(item.daysUntil)}
          </p>
        </div>
        <ChevronRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
      </button>
    </li>
  );
}

function SummaryLine({
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
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn('text-sm font-bold tabular-nums', cls)}>
        {formatCurrency(value, { currency, compact: true })}
      </p>
    </div>
  );
}

function dayLabel(iso: string, locale: string): string {
  const today = new Date();
  const target = new Date(`${iso}T00:00:00`);
  const diff = Math.round(
    (target.getTime() - todayStart(today).getTime()) / 86400_000,
  );
  if (diff === 0) return locale.startsWith('en') ? 'Today' : 'Hoy';
  if (diff === 1) return locale.startsWith('en') ? 'Tomorrow' : 'Mañana';
  if (diff === -1) return locale.startsWith('en') ? 'Yesterday' : 'Ayer';
  if (diff < 0)
    return locale.startsWith('en')
      ? `${Math.abs(diff)} days ago`
      : `Hace ${Math.abs(diff)} días`;
  return locale.startsWith('en') ? `In ${diff} days` : `En ${diff} días`;
}

function relativeDayLabel(d: number): string {
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d === -1) return 'Ayer';
  if (d < 0) return `Hace ${Math.abs(d)} días`;
  return `En ${d} días`;
}

function todayStart(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

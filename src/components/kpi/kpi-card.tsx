import { motion } from 'framer-motion';
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  trend?: { value: number; positiveIsGood?: boolean };
  icon?: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md';
  delay?: number;
  className?: string;
}

const toneClass: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'border-border bg-card',
  success: 'border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20',
  warning: 'border-amber-200/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20',
  destructive: 'border-red-200/60 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20',
};

const iconBgTone: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  destructive: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

export function KpiCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  tone = 'default',
  size = 'md',
  delay = 0,
  className,
}: KpiCardProps) {
  const compact = size === 'sm';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2 }}
      className={cn('h-full', className)}
    >
      <Card
        className={cn(
          'h-full border shadow-sm transition-shadow hover:shadow-md',
          toneClass[tone],
        )}
      >
        <CardContent
          className={cn(
            'flex h-full min-h-[88px] flex-col justify-between',
            compact ? 'p-3' : 'p-4',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'font-medium uppercase tracking-wide text-muted-foreground',
                compact ? 'text-[10px] leading-tight' : 'text-xs',
              )}
            >
              {label}
            </p>
            {Icon && (
              <div
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-md',
                  compact ? 'h-7 w-7' : 'h-8 w-8',
                  iconBgTone[tone],
                )}
              >
                <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              </div>
            )}
          </div>
          <div className="mt-2">
            <p
              className={cn(
                'font-bold tabular-nums tracking-tight',
                compact ? 'text-lg' : 'text-xl',
              )}
            >
              {value}
            </p>
            {(hint || trend) && (
              <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                {trend && <TrendIndicator trend={trend} />}
                {hint && <span>{hint}</span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TrendIndicator({
  trend,
}: {
  trend: { value: number; positiveIsGood?: boolean };
}) {
  const positive = trend.value > 0;
  const negative = trend.value < 0;
  const positiveIsGood = trend.positiveIsGood ?? true;
  const good = positive ? positiveIsGood : negative ? !positiveIsGood : null;

  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const cls =
    good === null
      ? 'text-muted-foreground'
      : good
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <span className={cn('mr-1 inline-flex items-center gap-0.5 font-medium', cls)}>
      <Icon className="h-3 w-3" />
      {Math.abs(trend.value).toFixed(0)}%
    </span>
  );
}

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
  delay?: number;
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
  delay = 0,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
    >
      <Card className={cn('card-hover', toneClass[tone])}>
        <CardContent className="flex items-start justify-between p-5">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {(hint || trend) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {trend && <TrendIndicator trend={trend} />}
                {hint && <span>{hint}</span>}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconBgTone[tone])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
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
    <span className={cn('inline-flex items-center gap-0.5 font-medium', cls)}>
      <Icon className="h-3 w-3" />
      {Math.abs(trend.value).toFixed(0)}%
    </span>
  );
}

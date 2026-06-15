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
  success: 'border-primary/20 bg-primary/5',
  warning: 'border-warning/30 bg-warning/5',
  destructive: 'border-destructive/30 bg-destructive/5',
};

const iconBgTone: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'bg-secondary text-muted-foreground',
  success: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function KpiCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  tone = 'default',
  size = 'md',
  className,
}: KpiCardProps) {
  const compact = size === 'sm';

  return (
    <div className={cn('h-full', className)}>
      <Card className={cn('h-full border', toneClass[tone])}>
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
                compact ? 'text-[10px] leading-tight' : 'text-[11px]',
              )}
            >
              {label}
            </p>
            {Icon && (
              <div
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-lg',
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
              <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {trend && <TrendIndicator trend={trend} />}
                {hint && <span>{hint}</span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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
        ? 'text-primary'
        : 'text-destructive';

  return (
    <span className={cn('mr-1 inline-flex items-center gap-0.5 font-medium', cls)}>
      <Icon className="h-3 w-3" />
      {Math.abs(trend.value).toFixed(0)}%
    </span>
  );
}

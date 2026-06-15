import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface HeroKpiProps {
  actualIncome: number;
  minRequiredIncome: number;
  deficit: number;
  surplus: number;
  currency?: string;
}

export function HeroKpi({
  actualIncome,
  minRequiredIncome,
  deficit,
  surplus,
  currency,
}: HeroKpiProps) {
  const { t } = useTranslation();
  const hasDeficit = deficit > 0;
  const progress =
    minRequiredIncome > 0
      ? Math.min((actualIncome / minRequiredIncome) * 100, 100)
      : 0;

  return (
    <Card
      className={cn(
        'border-border',
        hasDeficit ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5',
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[13px] font-medium text-muted-foreground">
              {t('dashboard.hero_question')}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl font-bold tracking-tight sm:text-3xl">
                {formatCurrency(minRequiredIncome, { currency })}
              </span>
              {hasDeficit ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-0.5 text-[13px] font-medium text-destructive">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {t('dashboard.deficit')}: {formatCurrency(deficit, { currency, compact: true })}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-0.5 text-[13px] font-medium text-primary">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  {t('dashboard.surplus')}: {formatCurrency(surplus, { currency, compact: true })}
                </span>
              )}
            </div>
          </div>

          <div className="w-full sm:max-w-xs sm:shrink-0">
            <div className="mb-1 flex justify-between text-[13px]">
              <span className="text-muted-foreground">
                {t('dashboard.actual_income')}:{' '}
                <span className="font-semibold text-foreground">
                  {formatCurrency(actualIncome, { currency, compact: true })}
                </span>
              </span>
              <span className="font-medium tabular-nums">{progress.toFixed(0)}%</span>
            </div>
            <Progress
              value={progress}
              className="h-1.5"
              indicatorClassName={hasDeficit ? 'bg-destructive' : 'bg-primary'}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

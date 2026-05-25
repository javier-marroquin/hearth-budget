import { motion } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        className={cn(
          'border shadow-sm',
          hasDeficit
            ? 'border-red-200/80 bg-gradient-to-r from-red-50/80 to-background dark:border-red-900/50 dark:from-red-950/25'
            : 'border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 to-background dark:border-emerald-900/50 dark:from-emerald-950/25',
        )}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                {t('dashboard.hero_question')}
              </p>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {formatCurrency(minRequiredIncome, { currency })}
                </span>
                {hasDeficit ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {t('dashboard.deficit')}: {formatCurrency(deficit, { currency, compact: true })}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    {t('dashboard.surplus')}: {formatCurrency(surplus, { currency, compact: true })}
                  </span>
                )}
              </div>
            </div>

            <div className="w-full sm:max-w-xs sm:shrink-0">
              <div className="mb-1 flex justify-between text-xs">
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
                indicatorClassName={
                  hasDeficit
                    ? 'bg-gradient-to-r from-red-500 to-amber-500'
                    : 'bg-gradient-to-r from-emerald-500 to-sky-500'
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

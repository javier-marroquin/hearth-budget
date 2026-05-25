import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden border-2',
          hasDeficit
            ? 'border-red-300/50 bg-gradient-to-br from-red-50 to-amber-50 dark:border-red-900/40 dark:from-red-950/30 dark:to-amber-950/20'
            : 'border-emerald-300/50 bg-gradient-to-br from-emerald-50 to-sky-50 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-sky-950/20',
        )}
      >
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {t('dashboard.hero_question')}
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold tracking-tight md:text-5xl">
                  {formatCurrency(minRequiredIncome, { currency })}
                </span>
                {hasDeficit ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    <AlertTriangle className="h-3 w-3" />
                    {t('dashboard.deficit')}: {formatCurrency(deficit, { currency })}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('dashboard.surplus')}: {formatCurrency(surplus, { currency })}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('dashboard.actual_income')}:{' '}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(actualIncome, { currency })}
                    </span>
                  </span>
                  <span className="font-medium">{progress.toFixed(0)}%</span>
                </div>
                <Progress
                  value={progress}
                  className="h-2"
                  indicatorClassName={
                    hasDeficit
                      ? 'bg-gradient-to-r from-red-500 to-amber-500'
                      : 'bg-gradient-to-r from-emerald-500 to-sky-500'
                  }
                />
              </div>
            </div>

            <div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/40 backdrop-blur dark:bg-black/20 lg:flex">
              <TrendingUp className="h-12 w-12 text-foreground/70" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

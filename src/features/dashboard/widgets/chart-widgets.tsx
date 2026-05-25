import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { IncomeVsExpenseLine } from '@/components/charts/income-vs-expense-line';
import { CategoryDoughnut } from '@/components/charts/category-doughnut';
import { ContributionsBar } from '@/components/charts/contributions-bar';
import { FixedVsVariableStacked } from '@/components/charts/fixed-vs-variable-stacked';
import { WidgetShell } from './widget-shell';
import type { WidgetProps } from './widget-types';

// =============================================================================
// Income vs Expense line — fills the widget; height adapts to grid cell.
// =============================================================================
export function ChartIncomeVsExpenseWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  return (
    <WidgetShell
      title={t('dashboard.income_vs_expense')}
      editing={ctx.editing}
      onRemove={onRemove}

    >
      {ctx.kpis ? (
        <div className="h-full min-h-0">
          <FillHeight>
            <IncomeVsExpenseLine
              data={ctx.kpis.monthlyTrend}
              currency={ctx.currency}
            />
          </FillHeight>
        </div>
      ) : (
        <Skeleton className="h-full w-full" />
      )}
    </WidgetShell>
  );
}

// =============================================================================
// Category doughnut
// =============================================================================
export function ChartCategoryDoughnutWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <WidgetShell
      title={t('dashboard.by_category')}
      editing={ctx.editing}
      onRemove={onRemove}
      onActivate={() => navigate('/expenses')}

    >
      {ctx.kpis ? (
        ctx.kpis.expenseByCategory.length > 0 ? (
          <FillHeight>
            <CategoryDoughnut
              data={ctx.kpis.expenseByCategory}
              currency={ctx.currency}
            />
          </FillHeight>
        ) : (
          <p className="grid h-full place-items-center text-center text-xs text-muted-foreground">
            Sin gastos este mes
          </p>
        )
      ) : (
        <Skeleton className="h-full w-full" />
      )}
    </WidgetShell>
  );
}

// =============================================================================
// Contributions by member bar
// =============================================================================
export function ChartContributionsByMemberWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <WidgetShell
      title={t('dashboard.by_member')}
      editing={ctx.editing}
      onRemove={onRemove}
      onActivate={() => navigate('/contributions')}

    >
      {ctx.kpis ? (
        ctx.kpis.contributionsByMember.length > 0 ? (
          <FillHeight>
            <ContributionsBar
              data={ctx.kpis.contributionsByMember.map((c) => ({
                name: ctx.memberLookup.get(c.userId) ?? 'Miembro',
                amount: c.amount,
                pending: c.pending,
              }))}
              currency={ctx.currency}
            />
          </FillHeight>
        ) : (
          <p className="grid h-full place-items-center text-center text-xs text-muted-foreground">
            Sin aportes este mes
          </p>
        )
      ) : (
        <Skeleton className="h-full w-full" />
      )}
    </WidgetShell>
  );
}

// =============================================================================
// Fixed vs Variable stacked
// =============================================================================
export function ChartFixedVsVariableWidget({ ctx, onRemove }: WidgetProps) {
  const { t } = useTranslation();
  return (
    <WidgetShell
      title={t('dashboard.fixed_vs_variable')}
      editing={ctx.editing}
      onRemove={onRemove}

    >
      {ctx.kpis ? (
        <FillHeight>
          <FixedVsVariableStacked
            data={ctx.kpis.fixedVsVariable}
            currency={ctx.currency}
          />
        </FillHeight>
      ) : (
        <Skeleton className="h-full w-full" />
      )}
    </WidgetShell>
  );
}

/**
 * Helper container that pushes its child to fill the available height.
 * Charts inside need `maintainAspectRatio: false` (which they already have).
 */
function FillHeight({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-full min-h-[140px]">
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

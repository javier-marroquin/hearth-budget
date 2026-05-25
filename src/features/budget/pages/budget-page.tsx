import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { PiggyBank } from 'lucide-react';

export function BudgetPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.budget')} />
      <EmptyState
        icon={PiggyBank}
        title="Presupuesto mensual (Envelope)"
        description="Vista de asignación zero-sum por categoría con rollover se implementa en F6."
      />
    </>
  );
}

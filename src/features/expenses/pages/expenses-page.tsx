import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Receipt } from 'lucide-react';

export function ExpensesPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('expenses.title')} />
      <EmptyState
        icon={Receipt}
        title="Gastos"
        description="El CRUD con división (equal/percentage/income-based) se implementa en F3."
      />
    </>
  );
}

import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Wallet } from 'lucide-react';

export function IncomesPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('incomes.title')} />
      <EmptyState
        icon={Wallet}
        title="Ingresos"
        description="El CRUD completo se implementa en F3."
      />
    </>
  );
}

import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { BarChart3 } from 'lucide-react';

export function DashboardPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.hero_question')} />
      <EmptyState
        icon={BarChart3}
        title="Dashboard"
        description="Los 15 KPIs y los 4 charts se implementan en la fase F4."
      />
    </>
  );
}

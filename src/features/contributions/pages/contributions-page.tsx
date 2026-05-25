import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { HandCoins } from 'lucide-react';

export function ContributionsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('contributions.title')} />
      <EmptyState
        icon={HandCoins}
        title="Aportes"
        description="El registro y seguimiento de aportes mensuales se implementa en F3."
      />
    </>
  );
}

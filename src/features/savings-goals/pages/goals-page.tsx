import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Target } from 'lucide-react';

export function GoalsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.goals')} />
      <EmptyState
        icon={Target}
        title="Metas de ahorro"
        description="Metas con goal templates y cálculo automático se implementan en F6."
      />
    </>
  );
}

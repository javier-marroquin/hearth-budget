import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Tags } from 'lucide-react';

export function CategoriesPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.categories')} />
      <EmptyState
        icon={Tags}
        title="Categorías"
        description="Las categorías del hogar con presupuesto mensual se implementan en F3 y F6."
      />
    </>
  );
}

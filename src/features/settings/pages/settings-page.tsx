import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Settings } from 'lucide-react';

export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.settings')} />
      <EmptyState
        icon={Settings}
        title="Configuración"
        description="Idioma, tema, moneda, zona horaria y modo envelope se completan progresivamente."
      />
    </>
  );
}

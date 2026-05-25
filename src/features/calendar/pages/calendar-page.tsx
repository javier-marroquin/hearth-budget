import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Calendar } from 'lucide-react';

export function CalendarPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.calendar')} />
      <EmptyState
        icon={Calendar}
        title="Calendario"
        description="FullCalendar con drag&drop y sincronización en tiempo real se implementa en F5."
      />
    </>
  );
}

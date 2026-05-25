import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { CalendarClock } from 'lucide-react';

export function SchedulesPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.schedules')} />
      <EmptyState
        icon={CalendarClock}
        title="Pagos programados"
        description="Motor de recurrencias (daily/weekly/monthly/yearly) se implementa en F6."
      />
    </>
  );
}

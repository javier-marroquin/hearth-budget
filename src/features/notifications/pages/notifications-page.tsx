import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Bell } from 'lucide-react';

export function NotificationsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.notifications')} />
      <EmptyState
        icon={Bell}
        title="Notificaciones"
        description="Centro de notificaciones in-app + emails (Resend) se implementa en F7."
      />
    </>
  );
}

import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Users } from 'lucide-react';

export function MembersPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.members')} />
      <EmptyState
        icon={Users}
        title="Miembros del hogar"
        description="La gestión de miembros y roles se completa en F2 (Auth + RLS) y F7 (invitaciones)."
      />
    </>
  );
}

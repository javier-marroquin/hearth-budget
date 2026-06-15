import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import {
  useMarkAllRead,
  useMarkOneRead,
  useNotifications,
} from '../hooks/use-notifications';
import { formatRelative } from '@/lib/format';

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const householdId = activeHousehold?.id ?? '';
  const { data: notifications, isLoading } = useNotifications(householdId);
  const markAll = useMarkAllRead(householdId);
  const markOne = useMarkOneRead(householdId);

  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <>
      <PageHeader
        title={t('nav.notifications')}
        description={
          unread > 0
            ? t('notifications.unread_count', { count: unread })
            : t('notifications.all_caught_up')
        }
        actions={
          unread > 0 && (
            <Button variant="outline" onClick={() => markAll.mutate()}>
              <CheckCheck className="h-4 w-4" />
              Marcar todas como leídas
            </Button>
          )
        }
      />

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!isLoading && (!notifications || notifications.length === 0) && (
        <EmptyState
          icon={Bell}
          title={t('empty.notifications_title')}
          description={t('empty.notifications_description')}
        />
      )}

      <div className="space-y-2">
        {notifications?.map((n) => (
          <Card
            key={n.id}
            className={n.read ? '' : 'border-primary/30 bg-primary/5'}
          >
            <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="flex flex-1 items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {!n.read && <Badge variant="info">Nuevo</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelative(n.created_at, i18n.language)}
                    </p>
                  </div>
                </div>
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markOne.mutate(n.id)}
                  >
                    Marcar leída
                  </Button>
                )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

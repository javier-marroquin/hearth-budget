import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { UserPlus, Users } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHouseholdStore } from '../stores/household.store';
import { useHouseholdMembers } from '../hooks/use-households';
import { getInitials } from '@/lib/format';
import { usePermissions } from '@/hooks/use-permissions';
import { Skeleton } from '@/components/ui/skeleton';

export function MembersPage() {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { canInviteMembers } = usePermissions();
  const { data: members, isLoading } = useHouseholdMembers(activeHousehold?.id);

  return (
    <>
      <PageHeader
        title={t('nav.members')}
        description={activeHousehold?.name}
        actions={
          canInviteMembers && (
            <Button disabled>
              <UserPlus className="h-4 w-4" />
              Invitar (F7)
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

      {!isLoading && (!members || members.length === 0) && (
        <EmptyState icon={Users} title="Sin miembros aún" />
      )}

      {!isLoading && members && members.length > 0 && (
        <div className="space-y-2">
          {members.map((m, idx) => {
            const displayName =
              m.profile?.full_name ??
              m.profile?.email ??
              m.invited_email ??
              'Miembro';
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.joined_at
                            ? `Unido ${format(new Date(m.joined_at), 'PP')}`
                            : m.invited_at
                              ? `Invitado ${format(new Date(m.invited_at), 'PP')}`
                              : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{t(`roles.${m.role}`)}</Badge>
                      {m.status === 'invited' && (
                        <Badge variant="warning">Pendiente</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}

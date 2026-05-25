import { Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useHouseholdStore } from '../stores/household.store';

export function HouseholdSelector() {
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
      <Home className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">{activeHousehold?.name ?? t('app.name')}</span>
    </div>
  );
}

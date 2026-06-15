import { Home, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useHouseholdStore } from '../stores/household.store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useMyHouseholds } from '../hooks/use-households';

export function HouseholdSelector() {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const setActiveHousehold = useHouseholdStore((s) => s.setActiveHousehold);
  const setMembership = useHouseholdStore((s) => s.setMembership);
  const { data } = useMyHouseholds();

  if (!activeHousehold) return null;

  // Only one household → static badge.
  if ((data?.length ?? 0) <= 1) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[13px]">
        <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="max-w-[140px] truncate font-medium sm:max-w-[260px]">
          {activeHousehold.name}
        </span>
      </div>
    );
  }

  // Multiple households → dropdown.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-0 gap-2">
          <Home className="h-4 w-4 shrink-0" />
          <span className="max-w-[120px] truncate font-medium sm:max-w-[160px]">
            {activeHousehold.name}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t('app.name')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {data?.map(({ household, membership }) => (
          <DropdownMenuItem
            key={household.id}
            onClick={() => {
              setActiveHousehold(household);
              setMembership(membership);
            }}
            className="flex items-center justify-between"
          >
            <span className="truncate">{household.name}</span>
            {activeHousehold.id === household.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

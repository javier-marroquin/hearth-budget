import {
  BarChart3,
  Bell,
  Calendar,
  CalendarClock,
  HandCoins,
  PiggyBank,
  Receipt,
  Settings,
  Tags,
  Target,
  Users,
  Wallet,
} from 'lucide-react';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof BarChart3;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: BarChart3 },
  { to: '/calendar', labelKey: 'nav.calendar', icon: Calendar },
  { to: '/incomes', labelKey: 'nav.incomes', icon: Wallet },
  { to: '/expenses', labelKey: 'nav.expenses', icon: Receipt },
  { to: '/contributions', labelKey: 'nav.contributions', icon: HandCoins },
  { to: '/budget', labelKey: 'nav.budget', icon: PiggyBank },
  { to: '/categories', labelKey: 'nav.categories', icon: Tags },
  { to: '/schedules', labelKey: 'nav.schedules', icon: CalendarClock },
  { to: '/goals', labelKey: 'nav.goals', icon: Target },
  { to: '/members', labelKey: 'nav.members', icon: Users },
  { to: '/notifications', labelKey: 'nav.notifications', icon: Bell },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { MobileNavSheet } from './mobile-nav-sheet';
import { FullScreenLoader } from './full-screen-loader';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';
import { useMyHouseholds } from '@/features/households/hooks/use-households';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { RecurringMaterializer } from '@/features/recurring/components/recurring-materializer';

export function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { isLoading, data } = useMyHouseholds();

  if (isLoading) return <FullScreenLoader />;
  if (data && data.length === 0) return <Navigate to="/onboarding" replace />;
  if (!activeHousehold) return <FullScreenLoader />;

  return (
    <div className="flex min-h-screen bg-background">
      <RecurringMaterializer />
      <Sidebar />
      <MobileNavSheet />
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col transition-[margin] duration-200',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64',
        )}
      >
        <Topbar />
        <main className="flex-1 px-3 py-4 md:px-8 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { FullScreenLoader } from './full-screen-loader';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';
import { useMyHouseholds } from '@/features/households/hooks/use-households';
import { useHouseholdStore } from '@/features/households/stores/household.store';

export function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { isLoading, data } = useMyHouseholds();

  if (isLoading) return <FullScreenLoader />;

  // Authenticated but no household? Send to onboarding.
  if (data && data.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  // Households loaded but selection not yet hydrated (very brief).
  if (!activeHousehold) return <FullScreenLoader />;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 flex-col transition-[margin] duration-200',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64',
        )}
      >
        <Topbar />
        <main className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar, SIDEBAR_COLLAPSED, SIDEBAR_WIDTH } from './sidebar';
import { Topbar } from './topbar';
import { MobileNavSheet } from './mobile-nav-sheet';
import { FullScreenLoader } from './full-screen-loader';
import { useUiStore } from '@/stores/ui.store';
import { useMyHouseholds } from '@/features/households/hooks/use-households';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { RecurringMaterializer } from '@/features/recurring/components/recurring-materializer';

export function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const pushRecentPath = useUiStore((s) => s.pushRecentPath);
  const location = useLocation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { isLoading, data } = useMyHouseholds();

  useEffect(() => {
    pushRecentPath(location.pathname);
  }, [location.pathname, pushRecentPath]);

  if (isLoading) return <FullScreenLoader />;
  if (data && data.length === 0) return <Navigate to="/onboarding" replace />;
  if (!activeHousehold) return <FullScreenLoader />;

  const sidebarW = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div className="min-h-screen bg-background">
      <RecurringMaterializer />
      <Sidebar />
      <MobileNavSheet />

      <div
        className="flex min-h-screen flex-col transition-[margin] duration-200 ease-out md:ml-[var(--sidebar-w)]"
        style={{ '--sidebar-w': `${sidebarW}px` } as React.CSSProperties}
      >
        <Topbar />
        <main className="flex-1 bg-background">
          <div className="mx-auto w-full max-w-content px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

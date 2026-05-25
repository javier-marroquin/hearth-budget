import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';

export function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

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

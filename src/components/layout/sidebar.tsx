import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';
import {
  NAV_ITEMS,
  SETTINGS_NAV_ITEM,
  type NavItem,
} from './sidebar-nav-items';
import { SidebarNavLink } from './sidebar-nav-link';
import { GlobalSearch } from './global-search';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED = 56;

export function Sidebar() {
  const { t } = useTranslation();
  const { sidebarCollapsed, toggleSidebar, favoritePaths, recentPaths } =
    useUiStore();

  const favoriteItems = useMemo(
    () =>
      favoritePaths
        .map((path) => NAV_ITEMS.find((n) => n.to === path))
        .filter((n): n is NavItem => Boolean(n)),
    [favoritePaths],
  );

  const recentItems = useMemo(
    () =>
      recentPaths
        .map((path) => NAV_ITEMS.find((n) => n.to === path))
        .filter((n): n is NavItem => Boolean(n)),
    [recentPaths],
  );

  const mainItems = useMemo(
    () => NAV_ITEMS.filter((n) => !favoritePaths.includes(n.to)),
    [favoritePaths],
  );

  return (
    <aside
      style={{
        width: sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH,
      }}
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out md:flex',
      )}
    >
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center justify-between px-3">
        <div
          className={cn(
            'flex min-w-0 items-center gap-2 overflow-hidden',
            sidebarCollapsed && 'justify-center w-full',
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-[11px] font-bold text-background">
            PH
          </div>
          {!sidebarCollapsed && (
            <span className="truncate text-[13px] font-semibold text-foreground">
              {t('app.name')}
            </span>
          )}
        </div>
        {!sidebarCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 shrink-0 text-muted-foreground"
            aria-label="Colapsar sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>

      {sidebarCollapsed && (
        <div className="flex justify-center pb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 text-muted-foreground"
            aria-label="Expandir sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      <GlobalSearch collapsed={sidebarCollapsed} />

      <ScrollArea className="flex-1 px-2">
        <nav className="pb-4">
          {favoriteItems.length > 0 && !sidebarCollapsed && (
            <section>
              <p className="nav-section-label">{t('nav.favorites', 'Favoritos')}</p>
              <ul className="space-y-0.5">
                {favoriteItems.map((item) => (
                  <li key={`fav-${item.to}`}>
                    <SidebarNavLink item={item} showFavoriteToggle />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            {!sidebarCollapsed && (
              <p className="nav-section-label">{t('nav.main', 'Principal')}</p>
            )}
            <ul className="space-y-0.5">
              {(sidebarCollapsed ? NAV_ITEMS : mainItems).map((item) => (
                <li key={item.to}>
                  <SidebarNavLink
                    item={item}
                    collapsed={sidebarCollapsed}
                    showFavoriteToggle={!sidebarCollapsed}
                  />
                </li>
              ))}
            </ul>
          </section>

          {recentItems.length > 0 && !sidebarCollapsed && (
            <section>
              <p className="nav-section-label">{t('nav.recent', 'Reciente')}</p>
              <ul className="space-y-0.5">
                {recentItems.map((item) => (
                  <li key={`recent-${item.to}`}>
                    <SidebarNavLink item={item} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </nav>
      </ScrollArea>

      {/* Settings — pinned bottom */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <SidebarNavLink item={SETTINGS_NAV_ITEM} collapsed={sidebarCollapsed} />
      </div>
    </aside>
  );
}

export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED };

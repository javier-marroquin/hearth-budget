import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUiStore } from '@/stores/ui.store';
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from './sidebar-nav-items';
import { SidebarNavLink } from './sidebar-nav-link';
import { GlobalSearch } from './global-search';

export function MobileNavSheet() {
  const { t } = useTranslation();
  const open = useUiStore((s) => s.mobileMenuOpen);
  const setOpen = useUiStore((s) => s.setMobileMenuOpen);
  const location = useLocation();
  const favoritePaths = useUiStore((s) => s.favoritePaths);
  const recentPaths = useUiStore((s) => s.recentPaths);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, setOpen]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const favoriteItems = NAV_ITEMS.filter((n) => favoritePaths.includes(n.to));
  const recentItems = recentPaths
    .map((path) => NAV_ITEMS.find((n) => n.to === path))
    .filter(Boolean) as typeof NAV_ITEMS;
  const mainItems = NAV_ITEMS.filter((n) => !favoritePaths.includes(n.to));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[280px] border-r border-sidebar-border bg-sidebar p-0">
        <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-[13px] font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-[11px] font-bold text-background">
              PH
            </div>
            {t('app.name')}
          </SheetTitle>
        </SheetHeader>

        <GlobalSearch />

        <ScrollArea className="h-[calc(100vh-8rem)] px-2">
          <nav className="pb-4">
            {favoriteItems.length > 0 && (
              <section>
                <p className="nav-section-label">{t('nav.favorites')}</p>
                <ul className="space-y-0.5">
                  {favoriteItems.map((item) => (
                    <li key={`m-fav-${item.to}`}>
                      <SidebarNavLink
                        item={item}
                        showFavoriteToggle
                        onNavigate={() => setOpen(false)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <p className="nav-section-label">{t('nav.main')}</p>
              <ul className="space-y-0.5">
                {mainItems.map((item) => (
                  <li key={item.to}>
                    <SidebarNavLink
                      item={item}
                      showFavoriteToggle
                      onNavigate={() => setOpen(false)}
                    />
                  </li>
                ))}
              </ul>
            </section>

            {recentItems.length > 0 && (
              <section>
                <p className="nav-section-label">{t('nav.recent')}</p>
                <ul className="space-y-0.5">
                  {recentItems.map((item) => (
                    <li key={`m-recent-${item.to}`}>
                      <SidebarNavLink item={item} onNavigate={() => setOpen(false)} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </nav>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-2">
          <SidebarNavLink
            item={SETTINGS_NAV_ITEM}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

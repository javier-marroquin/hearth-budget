import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui.store';
import type { NavItem } from './sidebar-nav-items';
import { Button } from '@/components/ui/button';

interface SidebarNavLinkProps {
  item: NavItem;
  collapsed?: boolean;
  showFavoriteToggle?: boolean;
  onNavigate?: () => void;
}

export function SidebarNavLink({
  item,
  collapsed = false,
  showFavoriteToggle = false,
  onNavigate,
}: SidebarNavLinkProps) {
  const { t } = useTranslation();
  const favoritePaths = useUiStore((s) => s.favoritePaths);
  const toggleFavorite = useUiStore((s) => s.toggleFavorite);
  const Icon = item.icon;
  const isFavorite = favoritePaths.includes(item.to);

  return (
    <div className="group relative flex items-center">
      <NavLink
        to={item.to}
        onClick={onNavigate}
        title={collapsed ? t(item.labelKey) : undefined}
        className={({ isActive }) =>
          cn(
            'nav-item flex-1',
            collapsed && 'justify-center px-2',
            isActive && 'nav-item-active',
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.75} />
        {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
      </NavLink>
      {showFavoriteToggle && !collapsed && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'absolute right-0 h-6 w-6 opacity-0 transition-opacity duration-150 group-hover:opacity-100',
            isFavorite && 'opacity-100',
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(item.to);
          }}
          aria-label={isFavorite ? t('aria.favorite_remove') : t('aria.favorite_add')}
        >
          <Star
            className={cn('h-3 w-3', isFavorite && 'fill-primary text-primary')}
          />
        </Button>
      )}
    </div>
  );
}

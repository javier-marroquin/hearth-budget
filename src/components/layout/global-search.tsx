import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { useUiStore } from '@/stores/ui.store';
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from './sidebar-nav-items';

interface GlobalSearchProps {
  collapsed?: boolean;
}

export function GlobalSearch({ collapsed = false }: GlobalSearchProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const allItems = useMemo(() => [...NAV_ITEMS, SETTINGS_NAV_ITEM], []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allItems.filter((item) => t(item.labelKey).toLowerCase().includes(q));
  }, [query, allItems, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSidebarCollapsed(false);
        setOpen(true);
        requestAnimationFrame(() => {
          document.getElementById('global-search-input')?.focus();
        });
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSidebarCollapsed]);

  if (collapsed) {
    return (
      <button
        type="button"
        className="nav-item mx-2 w-[calc(100%-16px)] justify-center"
        onClick={() => setSidebarCollapsed(false)}
        title={t('aria.global_search')}
      >
        <Search className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="relative px-3 pb-2 pt-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="global-search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t('nav.search_placeholder', 'Buscar…')}
          className="h-8 border-transparent bg-background pl-8 text-[13px] shadow-none placeholder:text-muted-foreground/70 focus-visible:border-border"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-3 right-3 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-sm">
          {results.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground transition-colors duration-150 hover:bg-accent"
                onMouseDown={() => {
                  navigate(item.to);
                  setQuery('');
                  setOpen(false);
                }}
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {t(item.labelKey)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

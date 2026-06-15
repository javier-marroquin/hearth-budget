import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DEFAULT_FAVORITES = ['/dashboard', '/expenses', '/calendar'];
const MAX_RECENT = 5;

interface UiState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  favoritePaths: string[];
  recentPaths: string[];
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleFavorite: (path: string) => void;
  pushRecentPath: (path: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      favoritePaths: DEFAULT_FAVORITES,
      recentPaths: [],

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

      toggleFavorite: (path) => {
        const current = get().favoritePaths;
        set({
          favoritePaths: current.includes(path)
            ? current.filter((p) => p !== path)
            : [...current, path],
        });
      },

      pushRecentPath: (path) => {
        if (path.startsWith('/auth') || path === '/onboarding') return;
        const cleaned = path.split('?')[0] ?? path;
        const prev = get().recentPaths.filter((p) => p !== cleaned);
        set({ recentPaths: [cleaned, ...prev].slice(0, MAX_RECENT) });
      },
    }),
    {
      name: 'household-budget:ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        favoritePaths: state.favoritePaths,
        recentPaths: state.recentPaths,
      }),
    },
  ),
);

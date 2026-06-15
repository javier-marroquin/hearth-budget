import { create } from 'zustand';
import type {
  CalendarEventStatus,
  CalendarEventType,
} from '@/lib/db/aliases';

export interface CalendarFilters {
  status: CalendarEventStatus | 'all';
  eventType: CalendarEventType | 'all';
  userId: string | 'all';
  search: string;
}

interface CalendarState {
  view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listMonth';
  date: string; // ISO date the view is centered on
  filters: CalendarFilters;
  setView: (view: CalendarState['view']) => void;
  setDate: (iso: string) => void;
  setFilters: (next: Partial<CalendarFilters>) => void;
  resetFilters: () => void;
}

const defaultFilters: CalendarFilters = {
  status: 'all',
  eventType: 'all',
  userId: 'all',
  search: '',
};

export const useCalendarStore = create<CalendarState>((set) => ({
  view: 'dayGridMonth',
  date: new Date().toISOString().slice(0, 10),
  filters: defaultFilters,
  setView: (view) => set({ view }),
  setDate: (iso) => set({ date: iso }),
  setFilters: (next) =>
    set((s) => ({ filters: { ...s.filters, ...next } })),
  resetFilters: () => set({ filters: defaultFilters }),
}));

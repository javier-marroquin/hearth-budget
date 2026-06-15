import type { TFunction } from 'i18next';
import type { UpcomingItem } from '@/features/dashboard/services/upcoming.service';

/** Default seeded category names (Spanish) → i18n keys. */
const SYSTEM_CATEGORY_KEYS: Record<string, string> = {
  Vivienda: 'categories.system.housing',
  Alimentación: 'categories.system.food',
  Transporte: 'categories.system.transport',
  Salud: 'categories.system.health',
  Educación: 'categories.system.education',
  Entretenimiento: 'categories.system.entertainment',
  Servicios: 'categories.system.utilities',
  Otros: 'categories.system.other_expense',
  Salario: 'categories.system.salary',
  Freelance: 'categories.system.freelance',
  Inversiones: 'categories.system.investments',
  'Otros ingresos': 'categories.system.other_income',
  'Ahorro general': 'categories.system.general_savings',
  Emergencias: 'categories.system.emergency',
};

export function translateCategoryName(
  name: string,
  isSystem: boolean | undefined,
  t: TFunction,
): string {
  if (!isSystem) return name;
  const key = SYSTEM_CATEGORY_KEYS[name];
  return key ? t(key) : name;
}

export function resolveUpcomingTitle(item: UpcomingItem, t: TFunction): string {
  switch (item.kind) {
    case 'expense':
      return item.title.trim() || t('expenses.unnamed');
    case 'income':
      return item.title.trim() || t('incomes.unnamed');
    case 'contribution':
      return t('contributions.from_member', {
        name: item.title.trim() || t('common.member'),
      });
    case 'goal':
      return item.title.trim() || t('goals.unnamed');
    default:
      return item.title.trim() || t('calendar.unnamed_event');
  }
}

export function resolveUpcomingSubtitle(
  item: UpcomingItem,
  t: TFunction,
): string | null {
  if (item.kind === 'goal' && !item.subtitle?.trim()) {
    return t('goals.to_complete');
  }
  return item.subtitle?.trim() || null;
}

export function memberDisplayName(
  name: string | null | undefined,
  t: TFunction,
): string {
  return name?.trim() || t('common.member');
}

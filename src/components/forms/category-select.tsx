import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/features/categories/hooks/use-categories';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { translateCategoryName } from '@/lib/display-labels';
import type { CategoryType } from '@/lib/db/aliases';

interface CategorySelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  type?: CategoryType;
  placeholder?: string;
  allowNone?: boolean;
}

const NONE_VALUE = '__none__';

export function CategorySelect({
  value,
  onChange,
  type,
  placeholder,
  allowNone = true,
}: CategorySelectProps) {
  const { t } = useTranslation();
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { data: categories } = useCategories(activeHousehold?.id, type);

  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? t('table.category')} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && (
          <SelectItem value={NONE_VALUE}>{t('categories.none')}</SelectItem>
        )}
        {categories?.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              {translateCategoryName(c.name, c.is_system, t)}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

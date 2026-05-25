import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHouseholdMembers } from '@/features/households/hooks/use-households';
import { useHouseholdStore } from '@/features/households/stores/household.store';

interface MemberSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MemberSelect({
  value,
  onChange,
  placeholder = 'Miembro',
}: MemberSelectProps) {
  const activeHousehold = useHouseholdStore((s) => s.activeHousehold);
  const { data: members } = useHouseholdMembers(activeHousehold?.id);

  const active = members?.filter((m) => m.status === 'active' && m.user_id);

  return (
    <Select value={value ?? ''} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {active?.map((m) => (
          <SelectItem key={m.id} value={m.user_id!}>
            {m.profile?.full_name ?? m.profile?.email ?? 'Miembro'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

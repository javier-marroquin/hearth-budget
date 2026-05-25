import * as React from 'react';
import { Input, type InputProps } from '@/components/ui/input';

export interface MoneyInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value: number | undefined;
  onChange: (value: number) => void;
}

/**
 * Number input that emits real `number` values (not strings).
 * Empty string → 0.
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={value === undefined || Number.isNaN(value) ? '' : value}
        onChange={(e) => {
          const v = e.target.value;
          const n = v === '' ? 0 : Number(v);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        {...props}
      />
    );
  },
);
MoneyInput.displayName = 'MoneyInput';

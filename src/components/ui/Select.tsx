import React from 'react';
import { Select as BoardUISelect, SelectItem } from '@/components/base/select/select';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  disabled,
}) => {
  return (
    <div className="mb-3">
      <BoardUISelect
        label={label}
        selectedKey={value}
        onSelectionChange={(key) => onChange(String(key))}
        isDisabled={disabled}
      >
        {options.map((opt) => (
          <SelectItem key={opt.value} id={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </BoardUISelect>
    </div>
  );
};

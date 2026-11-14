import React from 'react';
import { Input as BoardUIInput } from '@/components/base/input/input';

interface InputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  return (
    <div className="mb-3">
      <BoardUIInput
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        isDisabled={disabled}
      />
    </div>
  );
};

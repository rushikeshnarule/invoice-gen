import React from 'react';
import { Switch as BoardUISwitch } from '@/components/base/switch/switch';

interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled,
}) => {
  return (
    <div className="flex items-center justify-between py-1.5 cursor-pointer">
      <div className="flex-1 pr-3">
        <span className="text-xs font-medium text-slate-800 block">{label}</span>
        {description && (
          <span className="text-[11px] text-slate-500 mt-0.5 block">{description}</span>
        )}
      </div>
      <BoardUISwitch
        isSelected={checked}
        onChange={onChange}
        isDisabled={disabled}
        size="md"
        shape="pill"
      />
    </div>
  );
};

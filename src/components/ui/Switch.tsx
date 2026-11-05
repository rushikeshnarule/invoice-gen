import React from 'react';

interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled,
}) => {
  const switchId = id || `switch-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div style={{ flex: 1, paddingRight: 12 }}>
        <label
          htmlFor={switchId}
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#1e293b',
            cursor: 'inherit',
            display: 'block',
          }}
        >
          {label}
        </label>
        {description && (
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: 1 }}>
            {description}
          </div>
        )}
      </div>

      <div
        id={switchId}
        role="switch"
        aria-checked={checked}
        style={{
          width: 36,
          height: 20,
          backgroundColor: checked ? 'var(--accent, #2563eb)' : '#cbd5e1',
          borderRadius: 10,
          position: 'relative',
          transition: 'background-color 0.2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            transition: 'left 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          }}
        />
      </div>
    </div>
  );
};

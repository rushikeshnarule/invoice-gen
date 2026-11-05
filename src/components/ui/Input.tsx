import React from 'react';

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
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 600,
          color: '#475569',
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '7px 10px',
          fontSize: '13px',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          color: '#1e293b',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
    </div>
  );
};

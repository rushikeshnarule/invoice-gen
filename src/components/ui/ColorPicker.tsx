import React from 'react';
import { ACCENT_PALETTE } from '../../types';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
}) => {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <label
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </label>
        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>
          {value.toUpperCase()}
        </span>
      </div>

      {/* 10-color BoardUI Palette Swatches */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 6,
          marginBottom: 8,
        }}
      >
        {ACCENT_PALETTE.map((hex) => {
          const isSelected = hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              title={hex}
              style={{
                height: 28,
                backgroundColor: hex,
                borderRadius: 6,
                border: isSelected ? '2px solid #0f172a' : '1px solid rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 0.1s ease',
                position: 'relative',
              }}
            >
              {isSelected && (
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 6,
                    height: 6,
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Hex Input with native color picker */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 32,
            height: 32,
            padding: 0,
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            cursor: 'pointer',
            backgroundColor: 'transparent',
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#2563EB"
          maxLength={7}
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: '12px',
            fontFamily: 'monospace',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            color: '#1e293b',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
};

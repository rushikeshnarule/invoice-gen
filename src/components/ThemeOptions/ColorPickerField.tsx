import React, { useState, useEffect, useRef } from 'react';
import { ACCENT_PALETTE } from '../../types';

interface ColorPickerFieldProps {
  value: string;
  onChange: (hex: string) => void;
  palette?: readonly string[];
  className?: string;
}

export const ColorPickerField: React.FC<ColorPickerFieldProps> = ({
  value,
  onChange,
  palette = ACCENT_PALETTE,
  className = '',
}) => {
  const [localColor, setLocalColor] = useState(value || '#2563eb');
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalColor(value || '#2563eb');
  }, [value]);

  const commitColor = (newColor: string) => {
    setLocalColor(newColor);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      onChange(newColor);
    });
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">Accent Colour</span>
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {localColor.toUpperCase()}
        </span>
      </div>

      {/* Palette Swatches */}
      <div className="grid grid-cols-5 gap-2">
        {palette.map((hex) => {
          const isSelected = hex.toLowerCase() === localColor.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => commitColor(hex)}
              className={`h-8 rounded-lg transition-colors duration-150 relative flex items-center justify-center cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-slate-900 ring-offset-1 shadow-2xs'
                  : 'hover:opacity-90 border border-black/10'
              }`}
              style={{ backgroundColor: hex }}
              title={hex}
            >
              {isSelected && <span className="size-2 rounded-full bg-white shadow" />}
            </button>
          );
        })}
      </div>

      {/* Custom Color Input */}
      <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
        <input
          type="color"
          value={localColor.startsWith('#') && localColor.length === 7 ? localColor : '#2563eb'}
          onChange={(e) => commitColor(e.target.value)}
          className="size-7 rounded border border-slate-300 bg-transparent cursor-pointer p-0"
        />
        <input
          type="text"
          value={localColor}
          onChange={(e) => {
            const val = e.target.value;
            setLocalColor(val);
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
              commitColor(val);
            }
          }}
          onBlur={() => {
            let formatted = localColor.trim();
            if (!formatted.startsWith('#')) formatted = `#${formatted}`;
            if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
              commitColor(formatted);
            } else {
              setLocalColor(value);
            }
          }}
          placeholder="#2563EB"
          maxLength={7}
          className="flex-1 bg-transparent text-slate-900 font-mono text-xs outline-none"
        />
      </div>
    </div>
  );
};

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
    <div className="mb-3.5">
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          {label}
        </label>
        <span className="text-xs font-mono text-slate-500">
          {value.toUpperCase()}
        </span>
      </div>

      {/* BoardUI Accent Palette Swatches */}
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {ACCENT_PALETTE.map((hex) => {
          const isSelected = hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              title={hex}
              className={`h-7 rounded-lg transition-transform cursor-pointer relative ${
                isSelected ? 'scale-105 ring-2 ring-slate-900 ring-offset-1' : 'border border-slate-200/80 hover:scale-102'
              }`}
              style={{ backgroundColor: hex }}
            >
              {isSelected && (
                <span className="absolute inset-0 m-auto size-1.5 rounded-full bg-white shadow-xs" />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Hex Input */}
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-8 p-0 border border-slate-300 rounded-lg cursor-pointer bg-white"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg uppercase outline-none focus:border-blue-600 bg-white"
        />
      </div>
    </div>
  );
};

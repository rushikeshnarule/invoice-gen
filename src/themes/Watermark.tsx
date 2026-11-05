// ─── Watermark component shared by all themes ──────────────────────
import React from 'react';
import type { ThemeOptions } from '../types';
import { getWatermarkText } from './themeHelpers';

interface WatermarkProps {
  options: ThemeOptions;
  status: string;
}

export const Watermark: React.FC<WatermarkProps> = ({ options, status }) => {
  const text = getWatermarkText(options.watermark, options.watermarkCustomText, status);
  if (!text) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(-35deg)',
        fontSize: '80pt',
        fontWeight: 700,
        color: 'rgba(0,0,0,0.06)',
        letterSpacing: '0.15em',
        pointerEvents: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        zIndex: 0,
      }}
    >
      {text}
    </div>
  );
};

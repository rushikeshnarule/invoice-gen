import { lazy } from 'react';
import type { ThemeDefinition } from '../../types';

const definition: ThemeDefinition = {
  id: 'thermal',
  name: 'Thermal Receipt',
  description: '80mm receipt width, monospace font, centred header, compact item lines, UPI QR, no page borders.',
  paper: ['80mm'],
  component: lazy(() => import('./index')),
  defaultOptions: {
    paper: '80mm',
    fontFamily: 'mono',
    fontSize: 'small',
    accentColor: '#000000',
  },
};

export default definition;

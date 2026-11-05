import { lazy } from 'react';
import type { ThemeDefinition } from '../../types';

const definition: ThemeDefinition = {
  id: 'compact',
  name: 'Compact',
  description: '8.5-9pt type, tight rows, two-column meta block, designed for 25+ line items per page.',
  paper: ['A4', 'A5'],
  component: lazy(() => import('./index')),
  defaultOptions: {
    paper: 'A4',
    fontFamily: 'system',
    fontSize: 'small',
    accentColor: '#0f766e',
  },
};

export default definition;

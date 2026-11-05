import { lazy } from 'react';
import type { ThemeDefinition } from '../../types';

const definition: ThemeDefinition = {
  id: 'bold',
  name: 'Bold',
  description: 'Oversized invoice number, vertical accent strip on left edge, high-contrast totals.',
  paper: ['A4', 'A5'],
  component: lazy(() => import('./index')),
  defaultOptions: {
    paper: 'A4',
    fontFamily: 'system',
    fontSize: 'normal',
    accentColor: '#dc2626',
  },
};

export default definition;

import { lazy } from 'react';
import type { ThemeDefinition } from '../../types';

const definition: ThemeDefinition = {
  id: 'modern',
  name: 'Modern',
  description: 'Coloured top band with logo & invoice number, rounded totals card, zebra-striped rows.',
  paper: ['A4', 'A5'],
  component: lazy(() => import('./index')),
  defaultOptions: {
    paper: 'A4',
    fontFamily: 'inter',
    fontSize: 'normal',
    accentColor: '#2563eb',
  },
};

export default definition;

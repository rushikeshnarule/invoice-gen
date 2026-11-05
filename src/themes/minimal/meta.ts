import { lazy } from 'react';
import type { ThemeDefinition } from '../../types';

const definition: ThemeDefinition = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Hairline borders, generous whitespace, accent used only for title and total.',
  paper: ['A4', 'A5'],
  component: lazy(() => import('./index')),
  defaultOptions: {
    paper: 'A4',
    fontFamily: 'system',
    fontSize: 'normal',
    accentColor: '#111827',
  },
};

export default definition;

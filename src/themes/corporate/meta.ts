import { lazy } from 'react';
import type { ThemeDefinition } from '../../types';

const definition: ThemeDefinition = {
  id: 'corporate',
  name: 'Corporate',
  description: 'Two-column header (From / Bill to), grey table header, formal terms section, signature & stamp areas.',
  paper: ['A4', 'A5'],
  component: lazy(() => import('./index')),
  defaultOptions: {
    paper: 'A4',
    fontFamily: 'system',
    fontSize: 'normal',
    accentColor: '#334155',
  },
};

export default definition;

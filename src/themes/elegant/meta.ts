import { lazy } from 'react';
import type { ThemeDefinition } from '../../types';

const definition: ThemeDefinition = {
  id: 'elegant',
  name: 'Elegant',
  description: 'Serif typography, muted neutral palette, thin accent rule, refined luxury appeal.',
  paper: ['A4', 'A5'],
  component: lazy(() => import('./index')),
  defaultOptions: {
    paper: 'A4',
    fontFamily: 'serif',
    fontSize: 'normal',
    accentColor: '#b45309',
  },
};

export default definition;

import { lazy } from 'react';
import type { ThemeDefinition } from '../../types';

const definition: ThemeDefinition = {
  id: 'classic',
  name: 'Classic',
  description: 'Full-border table, centred business header, GST boxes, tax summary, bank & signature blocks.',
  paper: ['A4', 'A5'],
  component: lazy(() => import('./index')),
  defaultOptions: {
    paper: 'A4',
    fontFamily: 'system',
    fontSize: 'normal',
    accentColor: '#1e3a8a',
  },
};

export default definition;

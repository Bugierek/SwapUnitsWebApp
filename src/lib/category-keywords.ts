'use client';

import type { UnitCategory } from '@/types';

export const CATEGORY_KEYWORDS: Partial<Record<UnitCategory, string[]>> = {
  Length: ['distance', 'height', 'width', 'depth', 'span'],
  Mass: ['weight', 'heaviness'],
  Temperature: ['heat', 'cold', 'climate', 'weather'],
  Time: ['duration', 'interval', 'schedule'],
  Pressure: ['barometric', 'atm', 'compression'],
  Area: ['surface', 'sq', 'square'],
  Volume: ['capacity', 'cubic', 'liters', 'gallons'],
  Energy: ['power', 'joules', 'calories'],
  Speed: ['velocity', 'pace', 'rate'],
  'Fuel Economy': [
    'fuel',
    'mpg',
    'efficiency',
    'consumption',
    'ev',
    'watt-hour',
    'watt hour',
    'wh/km',
    'wh/mi',
    'wh per km',
    'wh per mile',
  ],
  'Data Storage': ['storage', 'memory', 'drive', 'disk', 'files'],
  'Data Transfer Rate': ['bandwidth', 'network', 'internet', 'upload', 'download'],
  Bitcoin: ['crypto', 'cryptocurrency', 'btc', 'satoshi'],
  'SI Prefixes': ['prefix', 'prefixes', 'si prefixes'],
};

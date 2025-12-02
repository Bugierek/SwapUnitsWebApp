'use client';

import type { UnitCategory } from '@/types';

export const CATEGORY_KEYWORDS: Partial<Record<UnitCategory, string[]>> = {
  Length: ['distance', 'height', 'width', 'depth', 'span', 'measurement'],
  Mass: ['weight', 'heaviness', 'weigh'],
  Temperature: ['climate', 'weather'],
  Time: ['duration', 'interval', 'schedule', 'clock', 'period'],
  Pressure: ['barometric', 'compression'],
  Area: ['surface', 'square', 'space'],
  Volume: ['capacity', 'cubic', 'fluid', 'liquid', 'container'],
  Energy: ['power', 'joules', 'calories', 'watts', 'electricity', 'electric', 'work'],
  Speed: ['velocity', 'pace'],
  'Fuel Economy': [
    'fuel',
    'efficiency',
    'consumption',
    'mileage',
    'petrol',
    'diesel',
  ],
  'Data Storage': ['storage', 'memory', 'drive', 'disk', 'files'],
  'Data Transfer Rate': ['bandwidth', 'network', 'internet', 'upload', 'download', 'connection', 'wifi'],
  Bitcoin: ['crypto', 'cryptocurrency', 'blockchain'],
  Currency: ['money', 'exchange', 'forex'],
  'SI Prefixes': ['prefix', 'prefixes', 'metric'],
};

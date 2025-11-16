import type { UnitCategory } from '@/types';

export type CategoryDefaultPair = {
  fromUnit: string;
  toUnit: string;
};

const CATEGORY_DEFAULT_PAIRS: Partial<Record<UnitCategory, CategoryDefaultPair>> = {
  Length: { fromUnit: 'm', toUnit: 'ft' },
  Mass: { fromUnit: 'kg', toUnit: 'g' },
  Temperature: { fromUnit: '°C', toUnit: '°F' },
  Time: { fromUnit: 's', toUnit: 'ms' },
  Pressure: { fromUnit: 'Pa', toUnit: 'atm' },
  Area: { fromUnit: 'm²', toUnit: 'ft²' },
  Volume: { fromUnit: 'L', toUnit: 'mL' },
  Energy: { fromUnit: 'J', toUnit: 'kJ' },
  Speed: { fromUnit: 'm/s', toUnit: 'km/h' },
  'Fuel Economy': { fromUnit: 'km/L', toUnit: 'MPG (US)' },
  'Data Storage': { fromUnit: 'GB', toUnit: 'MB' },
  'Data Transfer Rate': { fromUnit: 'Mbps', toUnit: 'MB/s' },
  Bitcoin: { fromUnit: 'BTC', toUnit: 'sat' },
  Currency: { fromUnit: 'EUR', toUnit: 'USD' },
};

export function getCategoryDefaultPair(category: UnitCategory): CategoryDefaultPair | null {
  return CATEGORY_DEFAULT_PAIRS[category] ?? null;
}

import { describe, expect, it } from 'vitest';

import { convertNumericValue } from '@/lib/conversion-math';
import type { UnitCategory } from '@/types';

// Conversion factors checked against values computed independently from the exact definitions
// (1 lb = 0.45359237 kg, standard gravity 9.80665 m/s², US gallon = 231 in³, imperial gallon =
// 4.54609 L, IT BTU = 1055.05585262 J, conventional mmHg = 133.322387415 Pa) and against NIST
// SP 811 Appendix B. Expected values are the exact results, so they must match to 1e-9 relative.
// [category, value, from, to, expected]
const CASES: [string, number, string, string, number][] = [
  ['Power', 1, 'hp', 'W', 745.69987158227022], ['Power', 1, 'PS', 'W', 735.49875], ['Power', 1, 'kW', 'hp', 1.3410220895950278],
  ['Power', 100, 'PS', 'hp', 98.63200706], ['Power', 12000, 'BTU/h', 'kW', 3.516852842], ['Power', 1, 'BTU/h', 'W', 0.29307107017222],
  ['Force', 1, 'lbf', 'N', 4.4482216152605], ['Force', 1, 'kN', 'lbf', 224.80894309971], ['Force', 1, 'kgf', 'N', 9.80665], ['Force', 1, 'kip', 'kN', 4.4482216152605], ['Force', 1, 'N', 'dyn', 1e5],
  ['Force', 22, 'kN', 'kgf', 2243.3756685514421], ['Torque', 1, 'lbf·ft', 'N·m', 1.3558179483314004], ['Torque', 1, 'N·m', 'lbf·ft', 0.7375621492772654],
  ['Torque', 1, 'lbf·in', 'N·m', 0.1129848290276167], ['Torque', 120, 'lbf·in', 'lbf·ft', 10], ['Torque', 1, 'ozf·in', 'N·m', 0.00706155181422604], ['Torque', 25, 'kgf·m', 'N·m', 245.16625], ['Torque', 1, 'kgf·cm', 'N·cm', 9.80665],
  ['Density', 1, 'g/cm³', 'kg/m³', 1000], ['Density', 1, 'lb/ft³', 'kg/m³', 16.018463373960138], ['Density', 1, 'lb/in³', 'kg/m³', 27679.904710203125], ['Density', 1, 'lb/gal', 'kg/m³', 119.82642731689663],
  ['Density', 1000, 'kg/m³', 'lb/ft³', 62.42796057614462], ['Density', 1, 'g/mL', 'kg/L', 1], ['Density', 1, 'lb/ft³', 'lb/in³', 1/1728],
  ['Volume', 1, 'cup', 'mL', 236.5882365], ['Volume', 1, 'fl oz', 'mL', 29.5735295625], ['Volume', 1, 'tbsp', 'tsp', 3], ['Volume', 1, 'tbsp', 'mL', 14.78676478125], ['Volume', 1, 'tsp', 'mL', 4.92892159375],
  ['Volume', 1, 'pt', 'mL', 473.176473], ['Volume', 1, 'qt', 'L', 0.946352946], ['Volume', 1, 'gal', 'qt', 4], ['Volume', 1, 'cup', 'fl oz', 8],
  ['Volume', 1, 'gal (UK)', 'L', 4.54609], ['Volume', 1, 'pt (UK)', 'mL', 568.26125], ['Volume', 1, 'fl oz (UK)', 'mL', 28.4130625], ['Volume', 1, 'pt (UK)', 'fl oz (UK)', 20], ['Volume', 1, 'gal (UK)', 'gal', 1.2009499255],
  ['Volume', 1, 'in³', 'cm³', 16.387064], ['Volume', 1, 'yd³', 'm³', 0.764554857984], ['Volume', 1, 'gal', 'in³', 231], ['Volume', 1, 'yd³', 'ft³', 27],
  ['Mass', 1, 'st', 'lb', 14], ['Mass', 1, 'st', 'kg', 6.35029318], ['Mass', 1, 'ton (US)', 'lb', 2000], ['Mass', 1, 'ton (UK)', 'lb', 2240], ['Mass', 1, 'ton (UK)', 'kg', 1016.0469088],
  ['Pressure', 1, 'hPa', 'mbar', 1], ['Pressure', 1013.25, 'hPa', 'inHg', 29.921255579748476], ['Pressure', 1, 'atm', 'Torr', 760], ['Pressure', 1, 'atm', 'mmHg', 759.9998917], ['Pressure', 1, 'mmHg', 'Pa', 133.322387415],
  ['Pressure', 1, 'inHg', 'Pa', 3386.388640341], ['Pressure', 1, 'MPa', 'psi', 145.03773773], ['Pressure', 1, 'bar', 'hPa', 1000],
  ['Energy', 1, 'kWh', 'Wh', 1000], ['Energy', 1, 'Wh', 'J', 3600], ['Energy', 1, 'MJ', 'kWh', 0.2777777778], ['Energy', 1, 'eV', 'J', 1.602176634e-19], ['Energy', 1, 'thm', 'BTU', 100000], ['Energy', 1, 'thm', 'kWh', 29.30710701722],
  ['Speed', 1, 'ft/s', 'm/s', 0.3048], ['Speed', 88, 'ft/s', 'mph', 60],
  ['Data Storage', 1, 'GB', 'MB', 1000], ['Data Storage', 1, 'TB', 'GiB', 931.3225746154785], ['Data Storage', 1, 'GiB', 'MiB', 1024], ['Data Storage', 1, 'KiB', 'B', 1024], ['Data Storage', 1, 'KB', 'B', 1000], ['Data Storage', 1, 'GiB', 'GB', 1.073741824], ['Data Storage', 1, 'TiB', 'TB', 1.099511627776],
  // unchanged existing units, for regression
  ['Length', 1, 'mi', 'km', 1.609344], ['Mass', 1, 'kg', 'lb', 2.2046226218], ['Volume', 1, 'gal', 'L', 3.785411784], ['Energy', 1, 'kWh', 'BTU', 3412.1416331], ['Pressure', 1, 'psi', 'kPa', 6.894757293168],
];

describe('unit conversion values', () => {
  it.each(CASES)('%s: %d %s to %s', (category, value, from, to, expected) => {
    const result = convertNumericValue(category as UnitCategory, from, to, value);
    expect(result).not.toBeNull();
    const relativeError = Math.abs((result as number) - expected) / Math.abs(expected);
    expect(relativeError).toBeLessThan(1e-9);
  });
});

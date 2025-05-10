

import type { UnitCategory, UnitData, Preset, Unit, ConverterMode } from '@/types';

// Base units:
// Length: Meter (m)
// Mass: Kilogram (kg)
// Temperature: Celsius (°C) - Special handling
// Time: Second (s)
// Pressure: Pascal (Pa)
// Area: Square Meter (m²)
// Volume: Cubic Meter (m³)
// Energy: Joule (J)
// Speed: Meter per second (m/s)
// Fuel Economy: Kilometer per Liter (km/L) - Note: Higher is better
// Data Storage: Byte (B)
// Data Transfer Rate: Bits per second (bps)
// Bitcoin: Bitcoin (BTC)

export const unitData: Record<UnitCategory, UnitData> = {
  Length: {
    name: 'Length',
    units: [
      { name: 'Meter', symbol: 'm', factor: 1 },
      { name: 'Kilometer', symbol: 'km', factor: 1000 },
      { name: 'Centimeter', symbol: 'cm', factor: 0.01 },
      { name: 'Millimeter', symbol: 'mm', factor: 0.001 },
      { name: 'Mile', symbol: 'mi', factor: 1609.34 },
      { name: 'Yard', symbol: 'yd', factor: 0.9144 },
      { name: 'Foot', symbol: 'ft', factor: 0.3048 },
      { name: 'Inch', symbol: 'in', factor: 0.0254 },
    ],
  },
  Mass: {
    name: 'Mass',
    units: [
      { name: 'Kilogram', symbol: 'kg', factor: 1 },
      { name: 'Gram', symbol: 'g', factor: 0.001 },
      { name: 'Milligram', symbol: 'mg', factor: 0.000001 },
      { name: 'Metric Ton', symbol: 't', factor: 1000 },
      { name: 'Pound', symbol: 'lb', factor: 0.453592 },
      { name: 'Ounce', symbol: 'oz', factor: 0.0283495 },
    ],
  },
  Temperature: {
    name: 'Temperature',
    units: [
      // Factors are handled specially for temperature
      { name: 'Celsius', symbol: '°C', factor: 1 },
      { name: 'Fahrenheit', symbol: '°F', factor: 1 },
      { name: 'Kelvin', symbol: 'K', factor: 1 },
    ],
  },
  Time: {
    name: 'Time',
    units: [
      { name: 'Second', symbol: 's', factor: 1, mode: 'all' },
      { name: 'Millisecond', symbol: 'ms', factor: 0.001, mode: 'all' },
      { name: 'Microsecond', symbol: 'µs', factor: 1e-6, mode: 'advanced' },
      { name: 'Nanosecond', symbol: 'ns', factor: 1e-9, mode: 'advanced' },
      { name: 'Picosecond', symbol: 'ps', factor: 1e-12, mode: 'advanced' },
      { name: 'Femtosecond', symbol: 'fs', factor: 1e-15, mode: 'advanced' },
      { name: 'Minute', symbol: 'min', factor: 60, mode: 'all' },
      { name: 'Hour', symbol: 'hr', factor: 3600, mode: 'all' },
      { name: 'Day', symbol: 'day', factor: 86400, mode: 'all' },
    ],
  },
   Pressure: {
    name: 'Pressure',
    units: [
      { name: 'Pascal', symbol: 'Pa', factor: 1 },
      { name: 'Kilopascal', symbol: 'kPa', factor: 1000 },
      { name: 'Bar', symbol: 'bar', factor: 100000 },
      { name: 'Atmosphere', symbol: 'atm', factor: 101325 },
      { name: 'Pound per square inch', symbol: 'psi', factor: 6894.76 },
    ],
  },
  Area: {
    name: 'Area',
    units: [
        { name: 'Square Meter', symbol: 'm²', factor: 1 },
        { name: 'Square Kilometer', symbol: 'km²', factor: 1000000 },
        { name: 'Square Centimeter', symbol: 'cm²', factor: 0.0001 },
        { name: 'Square Millimeter', symbol: 'mm²', factor: 0.000001 },
        { name: 'Square Mile', symbol: 'mi²', factor: 2589988.11 },
        { name: 'Square Yard', symbol: 'yd²', factor: 0.836127 },
        { name: 'Square Foot', symbol: 'ft²', factor: 0.092903 },
        { name: 'Square Inch', symbol: 'in²', factor: 0.00064516 },
        { name: 'Hectare', symbol: 'ha', factor: 10000 },
        { name: 'Acre', symbol: 'acre', factor: 4046.86 },
    ],
   },
    Volume: {
        name: 'Volume',
        units: [
            { name: 'Cubic Meter', symbol: 'm³', factor: 1 },
            { name: 'Cubic Kilometer', symbol: 'km³', factor: 1e9 },
            { name: 'Cubic Centimeter', symbol: 'cm³', factor: 1e-6 },
            { name: 'Cubic Millimeter', symbol: 'mm³', factor: 1e-9 },
            { name: 'Liter', symbol: 'L', factor: 0.001 },
            { name: 'Milliliter', symbol: 'mL', factor: 1e-6 },
            { name: 'Gallon (US)', symbol: 'gal', factor: 0.00378541 },
            { name: 'Quart (US)', symbol: 'qt', factor: 0.000946353 },
            { name: 'Pint (US)', symbol: 'pt', factor: 0.000473176 },
            { name: 'Cup (US)', symbol: 'cup', factor: 0.000236588 },
            { name: 'Fluid Ounce (US)', symbol: 'fl oz', factor: 2.95735e-5 },
            { name: 'Tablespoon (US)', symbol: 'tbsp', factor: 1.47868e-5 },
            { name: 'Teaspoon (US)', symbol: 'tsp', factor: 4.92892e-6 },
            { name: 'Cubic Foot', symbol: 'ft³', factor: 0.0283168 },
            { name: 'Cubic Inch', symbol: 'in³', factor: 1.63871e-5 },
        ],
    },
    Energy: {
        name: 'Energy',
        units: [
            { name: 'Joule', symbol: 'J', factor: 1 },
            { name: 'Kilojoule', symbol: 'kJ', factor: 1000 },
            { name: 'Calorie', symbol: 'cal', factor: 4.184 },
            { name: 'Kilocalorie (food)', symbol: 'kcal', factor: 4184 },
            { name: 'Watt Hour', symbol: 'Wh', factor: 3600 },
            { name: 'Kilowatt Hour', symbol: 'kWh', factor: 3.6e6 },
            { name: 'Electronvolt', symbol: 'eV', factor: 1.60218e-19 },
            { name: 'British Thermal Unit', symbol: 'BTU', factor: 1055.06 },
            { name: 'Foot-pound', symbol: 'ft⋅lb', factor: 1.35582 },
        ],
    },
    Speed: {
        name: 'Speed',
        units: [
            { name: 'Meter per second', symbol: 'm/s', factor: 1 },
            { name: 'Kilometer per hour', symbol: 'km/h', factor: 1 / 3.6 },
            { name: 'Mile per hour', symbol: 'mph', factor: 0.44704 },
            { name: 'Foot per second', symbol: 'ft/s', factor: 0.3048 },
            { name: 'Knot', symbol: 'kn', factor: 0.514444 }, // Nautical mile per hour
        ],
    },
    'Fuel Economy': {
        name: 'Fuel Economy',
        units: [
            { name: 'Kilometer per Liter', symbol: 'km/L', factor: 1 },
            { name: 'Liter per 100 kilometers', symbol: 'L/100km', factor: 100 },
            { name: 'Mile per Gallon (US)', symbol: 'MPG (US)', factor: 0.425144 },
            { name: 'Mile per Gallon (UK)', symbol: 'MPG (UK)', factor: 0.354006 },
        ],
    },
    'Data Storage': {
        name: 'Data Storage',
        units: [
            { name: 'Bit', symbol: 'bit', factor: 1 / 8 },
            { name: 'Byte', symbol: 'B', factor: 1 },
            { name: 'Kilobyte', symbol: 'KB', factor: 1024 },
            { name: 'Megabyte', symbol: 'MB', factor: 1024 ** 2 },
            { name: 'Gigabyte', symbol: 'GB', factor: 1024 ** 3 },
            { name: 'Terabyte', symbol: 'TB', factor: 1024 ** 4 },
            { name: 'Petabyte', symbol: 'PB', factor: 1024 ** 5 },
        ],
    },
    'Data Transfer Rate': {
        name: 'Data Transfer Rate',
        units: [
            { name: 'Bits per second', symbol: 'bps', factor: 1 },
            { name: 'Kilobits per second', symbol: 'Kbps', factor: 1000 },
            { name: 'Megabits per second', symbol: 'Mbps', factor: 1e6 },
            { name: 'Gigabits per second', symbol: 'Gbps', factor: 1e9 },
            { name: 'Terabits per second', symbol: 'Tbps', factor: 1e12 },
            { name: 'Bytes per second', symbol: 'B/s', factor: 8 },
            { name: 'Kilobytes per second', symbol: 'KB/s', factor: 8 * 1000 },
            { name: 'Megabytes per second', symbol: 'MB/s', factor: 8 * 1e6 },
            { name: 'Gigabytes per second', symbol: 'GB/s', factor: 8 * 1e9 },
            { name: 'Terabytes per second', symbol: 'TB/s', factor: 8 * 1e12 },
        ],
    },
    Bitcoin: {
        name: 'Bitcoin',
        units: [
            { name: 'Bitcoin', symbol: 'BTC', factor: 1 },
            { name: 'Satoshi', symbol: 'sat', factor: 1e-8 },
        ],
    },
};

export const allPresets: Preset[] = [
  { category: 'Length', fromUnit: 'm', toUnit: 'ft', name: 'Meter to Feet' },
  { category: 'Length', fromUnit: 'km', toUnit: 'mi', name: 'Kilometer to Miles' },
  { category: 'Mass', fromUnit: 'kg', toUnit: 'lb', name: 'Kilograms to Pounds' },
  { category: 'Mass', fromUnit: 'lb', toUnit: 'kg', name: 'Pounds to Kilograms' },
  { category: 'Bitcoin', fromUnit: 'BTC', toUnit: 'sat', name: 'Bitcoin to Satoshi' },
  { category: 'Bitcoin', fromUnit: 'sat', toUnit: 'BTC', name: 'Satoshi to Bitcoin' },
  { category: 'Temperature', fromUnit: '°C', toUnit: '°F', name: 'Celsius to Fahrenheit' },
  { category: 'Temperature', fromUnit: '°F', toUnit: '°C', name: 'Fahrenheit to Celsius' },
  { category: 'Time', fromUnit: 'hr', toUnit: 'min', name: 'Hours to Minutes' },
  { category: 'Time', fromUnit: 's', toUnit: 'ms', name: 'Seconds to Milliseconds' },
  { category: 'Pressure', fromUnit: 'psi', toUnit: 'kPa', name: 'PSI to Kilopascals' },
  { category: 'Pressure', fromUnit: 'bar', toUnit: 'psi', name: 'Bar to PSI' },
  { category: 'Area', fromUnit: 'm²', toUnit: 'ft²', name: 'Square Meters to Square Feet' },
  { category: 'Area', fromUnit: 'acre', toUnit: 'm²', name: 'Acres to Square Meters' },
  { category: 'Volume', fromUnit: 'L', toUnit: 'gal', name: 'Liters to Gallons (US)' },
  { category: 'Volume', fromUnit: 'mL', toUnit: 'L', name: 'Milliliters to Liters' },
  { category: 'Energy', fromUnit: 'kWh', toUnit: 'BTU', name: 'Kilowatt Hours to BTU' },
  { category: 'Energy', fromUnit: 'J', toUnit: 'cal', name: 'Joules to Calories' },
  { category: 'Speed', fromUnit: 'km/h', toUnit: 'mph', name: 'km/h to mph' },
  { category: 'Speed', fromUnit: 'm/s', toUnit: 'km/h', name: 'm/s to km/h' },
  { category: 'Fuel Economy', fromUnit: 'MPG (US)', toUnit: 'km/L', name: 'MPG (US) to km/L' },
  { category: 'Fuel Economy', fromUnit: 'L/100km', toUnit: 'MPG (US)', name: 'L/100km to MPG (US)' },
  { category: 'Fuel Economy', fromUnit: 'km/L', toUnit: 'MPG (UK)', name: 'km/L to MPG (UK)' },
  { category: 'Data Storage', fromUnit: 'GB', toUnit: 'MB', name: 'Gigabytes to Megabytes' },
  { category: 'Data Storage', fromUnit: 'TB', toUnit: 'GB', name: 'Terabytes to Gigabytes' },
  { category: 'Data Transfer Rate', fromUnit: 'Mbps', toUnit: 'MB/s', name: 'Mbps to MB/s' },
  { category: 'Data Transfer Rate', fromUnit: 'Gbps', toUnit: 'Mbps', name: 'Gbps to Mbps' },
];

const categoryOrder: UnitCategory[] = [
  'Length', 'Mass', 'Temperature', 'Time', 'Bitcoin',
  'Pressure', 'Area', 'Volume', 'Energy', 'Speed',
  'Fuel Economy', 'Data Storage', 'Data Transfer Rate',
];

export const getUnitsForCategoryAndMode = (category: UnitCategory | "", mode: ConverterMode): Unit[] => {
  const allCategoryUnits = category ? unitData[category as UnitCategory]?.units ?? [] : [];

  if (mode === 'basic') {
    return allCategoryUnits.filter(unit => unit.mode !== 'advanced');
  }
  return allCategoryUnits; // Advanced mode gets all units (basic, advanced, all)
};

export const getFilteredAndSortedPresets = (): Preset[] => {
    const sortedPresets = [...allPresets].sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.category);
        const indexB = categoryOrder.indexOf(b.category);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const finalPresets: Preset[] = [];
    const categoryCounts: Record<string, number> = {};

    categoryOrder.forEach(category => {
        const presetForCategory = sortedPresets.find(p => p.category === category);
        if (presetForCategory && finalPresets.length < 15) {
            const isAlreadyAdded = finalPresets.some(fp =>
                fp.name === presetForCategory.name && fp.category === presetForCategory.category
            );
            if (!isAlreadyAdded) {
                finalPresets.push(presetForCategory);
                categoryCounts[category] = 1;
            }
        }
    });

    sortedPresets.forEach(preset => {
        if (finalPresets.length >= 15) return;
        const currentCount = categoryCounts[preset.category] || 0;
        const isAlreadyAdded = finalPresets.some(fp =>
           fp.name === preset.name && fp.category === preset.category
        );
        if (!isAlreadyAdded && currentCount < 2) {
            finalPresets.push(preset);
            categoryCounts[preset.category] = currentCount + 1;
        }
    });

    const lastRequestedPresetName = 'km/L to MPG (UK)';
    const hasLastRequested = finalPresets.some(p => p.name === lastRequestedPresetName);

    if (finalPresets.length === 15 && !hasLastRequested) {
        const lastRequestedPreset = allPresets.find(p => p.name === lastRequestedPresetName);
        if (lastRequestedPreset) {
            finalPresets[14] = lastRequestedPreset;
        }
    } else if (finalPresets.length < 15 && !hasLastRequested) {
         const lastRequestedPreset = allPresets.find(p => p.name === lastRequestedPresetName);
         if (lastRequestedPreset) {
            finalPresets.push(lastRequestedPreset);
         }
    }
    return finalPresets.slice(0, 15);
};

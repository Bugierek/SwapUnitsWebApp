

import type { UnitCategory, UnitData, Preset, Unit } from '@/types';

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
      { name: 'Meter', symbol: 'm', factor: 1, mode: 'all' },
      { name: 'Kilometer', symbol: 'km', factor: 1000, mode: 'all' },
      { name: 'Centimeter', symbol: 'cm', factor: 0.01, mode: 'all' },
      { name: 'Millimeter', symbol: 'mm', factor: 0.001, mode: 'all' },
      { name: 'Mile', symbol: 'mi', factor: 1609.34, mode: 'all' },
      { name: 'Foot', symbol: 'ft', factor: 0.3048, mode: 'all' },
      { name: 'Inch', symbol: 'in', factor: 0.0254, mode: 'all' },
    ],
  },
  Mass: {
    name: 'Mass',
    units: [
      { name: 'Kilogram', symbol: 'kg', factor: 1, mode: 'all' },
      { name: 'Gram', symbol: 'g', factor: 0.001, mode: 'all' },
      { name: 'Milligram', symbol: 'mg', factor: 0.000001, mode: 'all' },
      { name: 'Metric Ton', symbol: 't', factor: 1000, mode: 'all' },
      { name: 'Pound', symbol: 'lb', factor: 0.453592, mode: 'all' },
      { name: 'Ounce', symbol: 'oz', factor: 0.0283495, mode: 'all' },
    ],
  },
  Temperature: {
    name: 'Temperature',
    units: [
      { name: 'Celsius', symbol: '°C', factor: 1, mode: 'all' },
      { name: 'Fahrenheit', symbol: '°F', factor: 1, mode: 'all' },
      { name: 'Kelvin', symbol: 'K', factor: 1, mode: 'all' },
    ],
  },
  Time: {
    name: 'Time',
    units: [
      { name: 'Millisecond', symbol: 'ms', factor: 0.001, mode: 'all' },
      { name: 'Second', symbol: 's', factor: 1, mode: 'all' },
      { name: 'Minute', symbol: 'min', factor: 60, mode: 'all' },
      { name: 'Hour', symbol: 'hr', factor: 3600, mode: 'all' },
      { name: 'Day', symbol: 'day', factor: 86400, mode: 'all' },
      { name: 'Year', symbol: 'yr', factor: 31557600, mode: 'all' },
    ].sort((a, b) => a.factor - b.factor),
  },
   Pressure: {
    name: 'Pressure',
    units: [
      { name: 'Pascal', symbol: 'Pa', factor: 1, mode: 'all' },
      { name: 'Kilopascal', symbol: 'kPa', factor: 1000, mode: 'all' },
      { name: 'Bar', symbol: 'bar', factor: 100000, mode: 'all' },
      { name: 'Atmosphere', symbol: 'atm', factor: 101325, mode: 'all' },
      { name: 'Pound per square inch', symbol: 'psi', factor: 6894.76, mode: 'all' },
    ],
  },
  Area: {
    name: 'Area',
    units: [
        { name: 'Square Meter', symbol: 'm²', factor: 1, mode: 'all' },
        { name: 'Square Kilometer', symbol: 'km²', factor: 1e6, mode: 'all' },
        { name: 'Square Centimeter', symbol: 'cm²', factor: 0.0001, mode: 'all' },
        { name: 'Square Millimeter', symbol: 'mm²', factor: 1e-6, mode: 'all' },
        { name: 'Square Mile', symbol: 'mi²', factor: 2589988.110336, mode: 'all' },
        { name: 'Square Yard', symbol: 'yd²', factor: 0.83612736, mode: 'all' },
        { name: 'Square Foot', symbol: 'ft²', factor: 0.092903, mode: 'all' },
        { name: 'Square Inch', symbol: 'in²', factor: 0.00064516, mode: 'all' },
        { name: 'Hectare', symbol: 'ha', factor: 10000, mode: 'all' },
        { name: 'Acre', symbol: 'acre', factor: 4046.86, mode: 'all' },
    ],
   },
    Volume: {
        name: 'Volume',
        units: [
            { name: 'Cubic Meter', symbol: 'm³', factor: 1, mode: 'all' },
            { name: 'Cubic Centimeter', symbol: 'cm³', factor: 1e-6, mode: 'all' },
            { name: 'Liter', symbol: 'L', factor: 0.001, mode: 'all' },
            { name: 'Milliliter', symbol: 'mL', factor: 1e-6, mode: 'all' },
            { name: 'Gallon (US)', symbol: 'gal', factor: 0.00378541, mode: 'all' },
            { name: 'Cubic Foot', symbol: 'ft³', factor: 0.0283168, mode: 'all' },
        ],
    },
    Energy: {
        name: 'Energy',
        units: [
            { name: 'Joule', symbol: 'J', factor: 1, mode: 'all' },
            { name: 'Kilojoule', symbol: 'kJ', factor: 1000, mode: 'all' },
            { name: 'Calorie', symbol: 'cal', factor: 4.184, mode: 'all' },
            { name: 'Kilocalorie (food)', symbol: 'kcal', factor: 4184, mode: 'all' },
            { name: 'Kilowatt Hour', symbol: 'kWh', factor: 3.6e6, mode: 'all' },
            { name: 'British Thermal Unit', symbol: 'BTU', factor: 1055.06, mode: 'all' },
        ],
    },
    Speed: {
        name: 'Speed',
        units: [
            { name: 'Meter per second', symbol: 'm/s', factor: 1, mode: 'all' },
            { name: 'Kilometer per hour', symbol: 'km/h', factor: 1 / 3.6, mode: 'all' },
            { name: 'Mile per hour', symbol: 'mph', factor: 0.44704, mode: 'all' },
        ],
    },
    'Fuel Economy': {
        name: 'Fuel Economy',
        units: [
            { name: 'Kilometer per Liter', symbol: 'km/L', factor: 1, mode: 'all' },
            { name: 'Liter per 100 kilometers', symbol: 'L/100km', factor: 100, mode: 'all' },
            { name: 'Mile per Gallon (US)', symbol: 'MPG (US)', factor: 0.425144, mode: 'all' },
            { name: 'Mile per Gallon (UK)', symbol: 'MPG (UK)', factor: 0.354006, mode: 'all' },
        ],
    },
    'Data Storage': {
        name: 'Data Storage',
        units: [
            { name: 'Byte', symbol: 'B', factor: 1, mode: 'all' },
            { name: 'Kilobyte', symbol: 'KB', factor: 1024, mode: 'all' },
            { name: 'Megabyte', symbol: 'MB', factor: 1024 ** 2, mode: 'all' },
            { name: 'Gigabyte', symbol: 'GB', factor: 1024 ** 3, mode: 'all' },
            { name: 'Terabyte', symbol: 'TB', factor: 1024 ** 4, mode: 'all' },
        ],
    },
    'Data Transfer Rate': {
        name: 'Data Transfer Rate',
        units: [
            { name: 'Bits per second', symbol: 'bps', factor: 1, mode: 'all' },
            { name: 'Kilobits per second', symbol: 'Kbps', factor: 1000, mode: 'all' },
            { name: 'Megabits per second', symbol: 'Mbps', factor: 1e6, mode: 'all' },
            { name: 'Gigabits per second', symbol: 'Gbps', factor: 1e9, mode: 'all' },
            { name: 'Bytes per second', symbol: 'B/s', factor: 8, mode: 'all' },
            { name: 'Kilobytes per second', symbol: 'KB/s', factor: 8 * 1000, mode: 'all' },
            { name: 'Megabytes per second', symbol: 'MB/s', factor: 8 * 1e6, mode: 'all' },
        ],
    },
    Bitcoin: {
        name: 'Bitcoin',
        units: [
            { name: 'Bitcoin', symbol: 'BTC', factor: 1, mode: 'all' },
            { name: 'Satoshi', symbol: 'sat', factor: 1e-8, mode: 'all' },
        ],
    },
    // Categories below were advanced-only and are now effectively removed
    // by having no units with mode 'all' or 'basic'
    Ethereum: {
        name: 'Ethereum',
        units: [],
    },
    'EM Frequency': {
      name: 'EM Frequency & Wavelength',
      units: [],
    },
    'Sound Frequency': {
      name: 'Sound Frequency & Wavelength',
      units: [],
    },
};

export const allPresets: Preset[] = [
  { category: 'Length', fromUnit: 'm', toUnit: 'ft', name: 'Meter to Feet' },
  { category: 'Length', fromUnit: 'km', toUnit: 'mi', name: 'Kilometer to Miles' },
  { category: 'Length', fromUnit: 'in', toUnit: 'cm', name: 'Inches to Centimeters' },
  { category: 'Mass', fromUnit: 'kg', toUnit: 'lb', name: 'Kilograms to Pounds' },
  { category: 'Mass', fromUnit: 'lb', toUnit: 'kg', name: 'Pounds to Kilograms' },
  { category: 'Mass', fromUnit: 'g', toUnit: 'oz', name: 'Grams to Ounces' },
  { category: 'Temperature', fromUnit: '°C', toUnit: '°F', name: 'Celsius to Fahrenheit' },
  { category: 'Temperature', fromUnit: '°F', toUnit: '°C', name: 'Fahrenheit to Celsius' },
  { category: 'Time', fromUnit: 'hr', toUnit: 'min', name: 'Hours to Minutes' },
  { category: 'Time', fromUnit: 's', toUnit: 'ms', name: 'Seconds to Milliseconds' },
  { category: 'Pressure', fromUnit: 'psi', toUnit: 'kPa', name: 'PSI to Kilopascals' },
  { category: 'Pressure', fromUnit: 'bar', toUnit: 'psi', name: 'Bar to PSI' },
  { category: 'Pressure', fromUnit: 'Pa', toUnit: 'atm', name: 'Pascals to Atmospheres' },
  { category: 'Pressure', fromUnit: 'atm', toUnit: 'Pa', name: 'Atmospheres to Pascals' },
  { category: 'Area', fromUnit: 'm²', toUnit: 'ft²', name: 'Square Meters to Square Feet' },
  { category: 'Area', fromUnit: 'acre', toUnit: 'm²', name: 'Acres to Square Meters' },
  { category: 'Area', fromUnit: 'km²', toUnit: 'mi²', name: 'Square Kilometers to Square Miles' },
  { category: 'Area', fromUnit: 'm²', toUnit: 'acre', name: 'Square Meters to Acres' },
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
  { category: 'Bitcoin', fromUnit: 'BTC', toUnit: 'sat', name: 'Bitcoin to Satoshi' },
  { category: 'Bitcoin', fromUnit: 'sat', toUnit: 'BTC', name: 'Satoshi to Bitcoin' },
];

const categoryOrder: UnitCategory[] = [
  'Length', 'Mass', 'Temperature', 'Time', 'Bitcoin',
  'Pressure', 'Area', 'Volume', 'Energy', 'Speed',
  'Fuel Economy', 'Data Storage', 'Data Transfer Rate',
];

export const getUnitsForCategoryAndMode = (category: UnitCategory | ""): Unit[] => {
  const categoryKey = category as UnitCategory;
  if (!category || !unitData[categoryKey]) {
    return [];
  }
  // Since there's only one mode now, always return all units for the category
  return unitData[categoryKey].units ?? [];
};

export const getFilteredAndSortedPresets = (): Preset[] => {
    // All presets are valid in basic mode now
    const validPresets = allPresets.filter(preset => {
        const fromUnitDetails = getUnitsForCategoryAndMode(preset.category).find(u => u.symbol === preset.fromUnit);
        const toUnitDetails = getUnitsForCategoryAndMode(preset.category).find(u => u.symbol === preset.toUnit);
        return fromUnitDetails && toUnitDetails;
    });

    const sortedByOrder = [...validPresets].sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.category);
        const indexB = categoryOrder.indexOf(b.category);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    let finalPresets: Preset[] = [];
    const categoryCounts: Record<string, number> = {};

    categoryOrder.forEach(catName => {
        if (finalPresets.length >= 15) return;
        const presetForCategory = sortedByOrder.find(p => p.category === catName);

        if (presetForCategory) {
             const isAlreadyAdded = finalPresets.some(fp =>
                fp.name === presetForCategory.name && fp.category === presetForCategory.category
            );
            if (!isAlreadyAdded) {
                finalPresets.push(presetForCategory);
                categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
            }
        }
    });

    sortedByOrder.forEach(preset => {
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

    const bitcoinPresetTarget = 'Bitcoin to Satoshi';
    const bitcoinCategoryTarget: UnitCategory = 'Bitcoin';
    let btcPresetInstance = validPresets.find(p => p.name === bitcoinPresetTarget && p.category === bitcoinCategoryTarget);

    finalPresets = finalPresets.filter(p => !(p.name === bitcoinPresetTarget && p.category === bitcoinCategoryTarget));

    if(btcPresetInstance) {
        if (finalPresets.length >= 4) {
            finalPresets.splice(4, 0, btcPresetInstance);
        } else {
            finalPresets.push(btcPresetInstance);
        }
    }

    const lastRequestedPresetName = 'km/L to MPG (UK)';
    const lastRequestedPresetCategory: UnitCategory = 'Fuel Economy';
    const hasLastRequested = finalPresets.some(p => p.name === lastRequestedPresetName && p.category === lastRequestedPresetCategory);

    if (!hasLastRequested) {
        const presetToAdd = validPresets.find(p => p.name === lastRequestedPresetName && p.category === lastRequestedPresetCategory);
        if (presetToAdd) {
            if (finalPresets.length < 15) {
                finalPresets.push(presetToAdd);
            } else {
                let replaced = false;
                for (let i = finalPresets.length - 1; i >= 0; i--) {
                    const cat = finalPresets[i].category;
                    if (categoryCounts[cat] > 1 && cat !== bitcoinCategoryTarget && cat !== lastRequestedPresetCategory) {
                         const firstIndexOfCat = finalPresets.findIndex(fp => fp.category === cat);
                         if (i !== firstIndexOfCat) {
                            finalPresets[i] = presetToAdd;
                            if(categoryCounts[cat]) categoryCounts[cat]--;
                            categoryCounts[lastRequestedPresetCategory] = (categoryCounts[lastRequestedPresetCategory] || 0) + 1;
                            replaced = true;
                            break;
                         }
                    }
                }
                if (!replaced && finalPresets.length > 0 && finalPresets[finalPresets.length - 1].category !== bitcoinCategoryTarget) {
                     const removedCat = finalPresets[finalPresets.length - 1].category;
                     finalPresets[finalPresets.length - 1] = presetToAdd;
                     if (categoryCounts[removedCat]) categoryCounts[removedCat]--;
                     categoryCounts[lastRequestedPresetCategory] = (categoryCounts[lastRequestedPresetCategory] || 0) + 1;
                }
            }
        }
    }

    finalPresets.sort((a,b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category));

    const uniqueNames = new Set<string>();
    finalPresets = finalPresets.filter(p => {
        const duplicate = uniqueNames.has(p.name + p.category);
        uniqueNames.add(p.name+p.category);
        return !duplicate;
    });

    return finalPresets.slice(0,15);
};


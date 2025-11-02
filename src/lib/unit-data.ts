import type { UnitCategory, UnitData, Preset, Unit, FavoriteItem, ConverterMode } from '@/types';

// Base units:
// Length: Meter (m)
// Mass: Kilogram (kg)
// Temperature: Celsius (°C) - Special handling
// Time: Second (s)
// Pressure: Pascal (Pa)
// Area: Square Meter (m²)
// Volume: Liter (L) 
// Energy: Joule (J)
// Speed: Meter per second (m/s)
// Fuel Economy: Kilometer per Liter (km/L)
// Data Storage: Byte (B)
// Data Transfer Rate: Bits per second (bps)
// Bitcoin: Bitcoin (BTC)

const LITER_GASOLINE_KWH_EQUIVALENCE = 9.5; // 1L of gasoline energy equivalent in kWh

export const unitData: Record<UnitCategory, UnitData> = {
  Length: {
    name: 'Length',
    units: [
      { name: 'Meter', symbol: 'm', factor: 1, mode: 'all' },
      { name: 'Kilometer', symbol: 'km', factor: 1000, mode: 'all' },
      { name: 'Centimeter', symbol: 'cm', factor: 0.01, mode: 'all' },
      { name: 'Millimeter', symbol: 'mm', factor: 0.001, mode: 'all' },
      { name: 'Micrometer', symbol: 'µm', factor: 1e-6, mode: 'advanced' },
      { name: 'Nanometer', symbol: 'nm', factor: 1e-9, mode: 'advanced' },
      { name: 'Mile', symbol: 'mi', factor: 1609.34, mode: 'all' },
      { name: 'Foot', symbol: 'ft', factor: 0.3048, mode: 'all' },
      { name: 'Inch', symbol: 'in', factor: 0.0254, mode: 'all' },
    ].sort((a,b) => a.factor - b.factor),
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
    ].sort((a,b) => a.factor - b.factor),
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
      { name: 'Femtosecond', symbol: 'fs', factor: 1e-15, mode: 'advanced' },
      { name: 'Picosecond', symbol: 'ps', factor: 1e-12, mode: 'advanced' },
      { name: 'Nanosecond', symbol: 'ns', factor: 1e-9, mode: 'advanced' },
      { name: 'Microsecond', symbol: 'µs', factor: 1e-6, mode: 'advanced' },
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
    ].sort((a,b) => a.factor - b.factor),
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
    ].sort((a,b) => a.factor - b.factor),
   },
    Volume: { 
        name: 'Volume',
        units: [ // Base unit is Liter (L)
            { name: 'Liter', symbol: 'L', factor: 1, mode: 'all' },
            { name: 'Milliliter', symbol: 'mL', factor: 0.001, mode: 'all' },
            { name: 'Cubic Meter', symbol: 'm³', factor: 1000, mode: 'all' }, // 1 m³ = 1000 L
            { name: 'Cubic Centimeter', symbol: 'cm³', factor: 0.001, mode: 'all' }, // Same as Milliliter
            { name: 'Cubic Millimeter', symbol: 'mm³', factor: 0.000001, mode: 'all' },
            { name: 'Gallon (US)', symbol: 'gal', factor: 3.78541, mode: 'all' }, // US Gallon to L
            { name: 'Cubic Foot', symbol: 'ft³', factor: 28.3168, mode: 'all' }, // Cubic Foot to L
        ].sort((a,b) => a.factor - b.factor),
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
        ].sort((a,b) => a.factor - b.factor),
    },
    Speed: {
        name: 'Speed',
        units: [
            { name: 'Meter per second', symbol: 'm/s', factor: 1, mode: 'all' },
            { name: 'Kilometer per hour', symbol: 'km/h', factor: 1 / 3.6, mode: 'all' },
            { name: 'Mile per hour', symbol: 'mph', factor: 0.44704, mode: 'all' },
        ].sort((a,b) => a.factor - b.factor),
    },
    'Fuel Economy': { 
        name: 'Fuel Economy',
        units: [
            { name: 'Kilometer per Liter', symbol: 'km/L', factor: 1, mode: 'all', unitType: 'direct_efficiency' },
            { name: 'Liter per 100 km', symbol: 'L/100km', factor: 100, mode: 'all', unitType: 'inverse_consumption' },
            { name: 'Mile per Gallon (US)', symbol: 'MPG (US)', factor: 0.425144, mode: 'all', unitType: 'direct_efficiency' },
            { name: 'Mile per Gallon (UK)', symbol: 'MPG (UK)', factor: 0.354006, mode: 'all', unitType: 'direct_efficiency' },
            { name: 'Kilometer per kWh', symbol: 'km/kWh', factor: LITER_GASOLINE_KWH_EQUIVALENCE, mode: 'all', unitType: 'direct_efficiency' }, 
            { name: 'Mile per kWh', symbol: 'mi/kWh', factor: 1.60934 * LITER_GASOLINE_KWH_EQUIVALENCE, mode: 'all', unitType: 'direct_efficiency' }, 
            { name: 'kWh per 100 km', symbol: 'kWh/100km', factor: 100 * LITER_GASOLINE_KWH_EQUIVALENCE, mode: 'all', unitType: 'inverse_consumption' }, 
            { name: 'kWh per 100 miles', symbol: 'kWh/100mi', factor: (100 * LITER_GASOLINE_KWH_EQUIVALENCE) / 1.60934 , mode: 'all', unitType: 'inverse_consumption' }, 
        ].sort((a, b) => {
            const getUnitRank = (unit: Unit) => {
                const preferredOrderICE = ['km/L', 'L/100km', 'MPG (US)', 'MPG (UK)'];
                const preferredOrderEV = ['km/kWh', 'mi/kWh', 'kWh/100km', 'kWh/100mi'];
                
                let rank = 100;
                let index = -1;

                if (preferredOrderICE.includes(unit.symbol)) {
                    index = preferredOrderICE.indexOf(unit.symbol);
                    if (index !== -1) rank = index;
                } else if (preferredOrderEV.includes(unit.symbol)) {
                    index = preferredOrderEV.indexOf(unit.symbol);
                    if (index !== -1) rank = index + preferredOrderICE.length;
                }
                return rank;
            };
            const rankA = getUnitRank(a);
            const rankB = getUnitRank(b);
            if (rankA !== rankB) return rankA - rankB;
            return a.name.localeCompare(b.name);
        }),
    },
    'Data Storage': {
        name: 'Data Storage',
        units: [
            { name: 'Byte', symbol: 'B', factor: 1, mode: 'all' },
            { name: 'Kilobyte', symbol: 'KB', factor: 1024, mode: 'all' },
            { name: 'Megabyte', symbol: 'MB', factor: 1024 ** 2, mode: 'all' },
            { name: 'Gigabyte', symbol: 'GB', factor: 1024 ** 3, mode: 'all' },
            { name: 'Terabyte', symbol: 'TB', factor: 1024 ** 4, mode: 'all' },
        ].sort((a,b) => a.factor - b.factor),
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
        ].sort((a,b) => a.factor - b.factor),
    },
    Bitcoin: {
        name: 'Bitcoin',
        units: [
            { name: 'Bitcoin', symbol: 'BTC', factor: 1, mode: 'all' },
            { name: 'Satoshi', symbol: 'sat', factor: 1e-8, mode: 'all' },
        ].sort((a,b) => a.factor - b.factor),
    },
};

export const allPresets: Preset[] = [
  { category: 'Length', fromUnit: 'm', toUnit: 'ft', name: 'Meter to Feet' },
  { category: 'Length', fromUnit: 'km', toUnit: 'mi', name: 'Kilometer to Miles' },
  { category: 'Mass', fromUnit: 'kg', toUnit: 'lb', name: 'Kilograms to Pounds' },
  { category: 'Mass', fromUnit: 'g', toUnit: 'oz', name: 'Grams to Ounces' },
  { category: 'Temperature', fromUnit: '°C', toUnit: '°F', name: 'Celsius to Fahrenheit' },
  { category: 'Temperature', fromUnit: '°F', toUnit: '°C', name: 'Fahrenheit to Celsius' },
  { category: 'Time', fromUnit: 'hr', toUnit: 'min', name: 'Hours to Minutes' },
  { category: 'Time', fromUnit: 's', toUnit: 'ms', name: 'Seconds to Milliseconds' },
  { category: 'Pressure', fromUnit: 'psi', toUnit: 'kPa', name: 'PSI to Kilopascals' },
  { category: 'Pressure', fromUnit: 'Pa', toUnit: 'atm', name: 'Pascals to Atmospheres' },
  { category: 'Area', fromUnit: 'm²', toUnit: 'ft²', name: 'Square Meters to Square Feet' },
  { category: 'Area', fromUnit: 'acre', toUnit: 'm²', name: 'Acres to Square Meters' },
  { category: 'Volume', fromUnit: 'L', toUnit: 'gal', name: 'Liters to Gallons (US)' },
  { category: 'Volume', fromUnit: 'mL', toUnit: 'L', name: 'Milliliters to Liters' },
  { category: 'Energy', fromUnit: 'kWh', toUnit: 'BTU', name: 'Kilowatt Hours to BTU' },
  { category: 'Energy', fromUnit: 'J', toUnit: 'cal', name: 'Joules to Calories' },
  { category: 'Speed', fromUnit: 'km/h', toUnit: 'mph', name: 'km/h to mph' },
  { category: 'Speed', fromUnit: 'm/s', toUnit: 'km/h', name: 'm/s to km/h' },
  { category: 'Fuel Economy', fromUnit: 'MPG (US)', toUnit: 'km/L', name: 'MPG (US) to km/L' },
  { category: 'Fuel Economy', fromUnit: 'km/L', toUnit: 'MPG (UK)', name: 'km/L to MPG (UK)'},
  { category: 'Fuel Economy', fromUnit: 'kWh/100km', toUnit: 'mi/kWh', name: 'kWh/100km to mi/kWh (EV)' },
  { category: 'Fuel Economy', fromUnit: 'mi/kWh', toUnit: 'kWh/100km', name: 'mi/kWh to kWh/100km (EV)' },
  { category: 'Data Storage', fromUnit: 'GB', toUnit: 'MB', name: 'Gigabytes to Megabytes' },
  { category: 'Data Storage', fromUnit: 'TB', toUnit: 'GB', name: 'Terabytes to Gigabytes' },
  { category: 'Data Transfer Rate', fromUnit: 'Mbps', toUnit: 'MB/s', name: 'Mbps to MB/s' },
  { category: 'Data Transfer Rate', fromUnit: 'Gbps', toUnit: 'Mbps', name: 'Gbps to Mbps' },
  { category: 'Bitcoin', fromUnit: 'BTC', toUnit: 'sat', name: 'Bitcoin to Satoshi' },
  { category: 'Bitcoin', fromUnit: 'sat', toUnit: 'BTC', name: 'Satoshi to Bitcoin' },

  // Advanced Mode Specific Presets (ensure these only use units marked 'advanced' or 'all'/'basic' IF the preset itself is conceptually advanced)
  { category: 'Time', fromUnit: 's', toUnit: 'ns', name: 'Seconds to Nanoseconds (Adv)' },
  { category: 'Length', fromUnit: 'm', toUnit: 'nm', name: 'Meters to Nanometers (Adv)' },
];


export const categoryDisplayOrder: UnitCategory[] = [
  'Length', 'Mass', 'Temperature', 'Time', 'Pressure',
  'Area', 'Volume', 'Energy', 'Speed', 'Fuel Economy',
  'Data Storage', 'Data Transfer Rate', 'Bitcoin',
  // Removed: 'Ethereum', 'EM Frequency', 'Sound Frequency',
];

export const getUnitsForCategoryAndMode = (category: UnitCategory | "", mode?: ConverterMode ): Unit[] => {
  const categoryKey = category as UnitCategory;
  if (!categoryKey || !unitData[categoryKey]) {
    return [];
  }
  const units = unitData[categoryKey].units ?? [];
  // If mode is not provided, or is 'basic', filter for 'all' or 'basic'
  // Since mode toggle is removed, effectively always 'basic' or rather 'all available'
  return units.filter(unit => unit.mode === 'all' || unit.mode === 'basic' || unit.mode === 'advanced');
};


export const getFilteredAndSortedPresets = (
    favorites: FavoriteItem[] = [],
    currentMode: ConverterMode = 'basic' 
): Preset[] => {
    const favoriteSignatures = new Set(
        favorites.map(fav => `${fav.category}-${fav.fromUnit}-${fav.toUnit}`)
    );

    const presetsNotInFavorites = allPresets.filter(preset => {
        const presetSignature = `${preset.category}-${preset.fromUnit}-${preset.toUnit}`;
        return !favoriteSignatures.has(presetSignature) && unitData[preset.category]; // Ensure category still exists
    });
    
    const validPresetsForMode = presetsNotInFavorites.filter(preset => {
        const categoryUnits = unitData[preset.category]?.units;
        if (!categoryUnits) return false;

        const fromUnitDetails = categoryUnits.find(u => u.symbol === preset.fromUnit);
        const toUnitDetails = categoryUnits.find(u => u.symbol === preset.toUnit);
        
        // Since converter mode toggle is removed, all defined presets are potentially valid
        // if their units exist.
        return fromUnitDetails && toUnitDetails;
    });


    const sortedValidPresets = [...validPresetsForMode].sort((a, b) => {
        const indexA = categoryDisplayOrder.indexOf(a.category);
        const indexB = categoryDisplayOrder.indexOf(b.category);

        if (indexA !== indexB) {
            if (indexA === -1) return 1; 
            if (indexB === -1) return -1;
            return indexA - indexB;
        }
        return a.name.localeCompare(b.name);
    });
    
    let onePresetPerCategoryList: Preset[] = [];
    const addedCategories = new Set<UnitCategory>();
    let bitcoinPreset: Preset | null = null;

    for (const preset of sortedValidPresets) {
        if (preset.category === 'Bitcoin' && !bitcoinPreset) {
            bitcoinPreset = preset; 
        } else if (!addedCategories.has(preset.category)) {
            onePresetPerCategoryList.push(preset);
            addedCategories.add(preset.category);
        }
    }

    if (bitcoinPreset) {
        if (onePresetPerCategoryList.length >= 4) { // Ensure 5th position is available
            onePresetPerCategoryList.splice(4, 0, bitcoinPreset);
        } else {
            onePresetPerCategoryList.push(bitcoinPreset); 
        }
        addedCategories.add('Bitcoin'); 
    }
    
    let finalPresets = onePresetPerCategoryList.slice(0, 15);
    const uniqueNames = new Set<string>();
    finalPresets = finalPresets.filter(p => {
        const presetKey = p.name + p.category; 
        const isDuplicate = uniqueNames.has(presetKey);
        if (!isDuplicate) {
            uniqueNames.add(presetKey);
        }
    return !isDuplicate;
  });
  
  return finalPresets;
};

export const getPresetsForCategory = (category: UnitCategory): Preset[] => {
  return allPresets.filter((preset) => preset.category === category);
};

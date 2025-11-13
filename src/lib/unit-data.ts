import type { UnitCategory, UnitData, Preset, Unit, FavoriteItem } from '@/types';

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

const LITER_GASOLINE_KWH_EQUIVALENCE = 9.5; // DOE AFDC gasoline energy equivalent (kWh/L)

const fuelEconomyUnits: Unit[] = [
  { name: 'Kilometer per Liter', symbol: 'km/L', factor: 1, unitType: 'direct_efficiency' },
  { name: 'Liter per 100 km', symbol: 'L/100km', factor: 100, unitType: 'inverse_consumption' },
  { name: 'Mile per Gallon (US)', symbol: 'MPG (US)', factor: 0.425143707430272, unitType: 'direct_efficiency' },
  { name: 'Mile per Gallon (UK)', symbol: 'MPG (UK)', factor: 0.3540061899346471, unitType: 'direct_efficiency' },
  { name: 'Kilometer per kWh', symbol: 'km/kWh', factor: LITER_GASOLINE_KWH_EQUIVALENCE, unitType: 'direct_efficiency' }, 
  { name: 'Mile per kWh', symbol: 'mi/kWh', factor: 1.609344 * LITER_GASOLINE_KWH_EQUIVALENCE, unitType: 'direct_efficiency' }, 
  { name: 'kWh per 100 km', symbol: 'kWh/100km', factor: 100 * LITER_GASOLINE_KWH_EQUIVALENCE, unitType: 'inverse_consumption' }, 
  { name: 'kWh per 100 miles', symbol: 'kWh/100mi', factor: (100 * LITER_GASOLINE_KWH_EQUIVALENCE) / 1.609344 , unitType: 'inverse_consumption' }, 
];

fuelEconomyUnits.sort((a, b) => {
  const preferredOrderICE = ['km/L', 'L/100km', 'MPG (US)', 'MPG (UK)'];
  const preferredOrderEV = ['km/kWh', 'mi/kWh', 'kWh/100km', 'kWh/100mi'];

  const getUnitRank = (unit: Unit) => {
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
});

export const unitData: Record<UnitCategory, UnitData> = {
  Length: {
    name: 'Length',
    units: [
      { name: 'Meter', symbol: 'm', factor: 1 },
      { name: 'Kilometer', symbol: 'km', factor: 1000 },
      { name: 'Centimeter', symbol: 'cm', factor: 0.01 },
      { name: 'Millimeter', symbol: 'mm', factor: 0.001 },
      { name: 'Micrometer', symbol: 'µm', factor: 1e-6 },
      { name: 'Nanometer', symbol: 'nm', factor: 1e-9 },
      { name: 'Mile', symbol: 'mi', factor: 1609.344 },
      { name: 'Foot', symbol: 'ft', factor: 0.3048 },
      { name: 'Inch', symbol: 'in', factor: 0.0254 },
    ].sort((a,b) => a.factor - b.factor),
  },
  Mass: {
    name: 'Mass',
    units: [
      { name: 'Kilogram', symbol: 'kg', factor: 1 },
      { name: 'Gram', symbol: 'g', factor: 0.001 },
      { name: 'Milligram', symbol: 'mg', factor: 0.000001 },
      { name: 'Metric Ton', symbol: 't', factor: 1000 },
      { name: 'Pound', symbol: 'lb', factor: 0.45359237 },
      { name: 'Ounce', symbol: 'oz', factor: 0.028349523125 },
    ].sort((a,b) => a.factor - b.factor),
  },
  Temperature: {
    name: 'Temperature',
    units: [
      { name: 'Celsius', symbol: '°C', factor: 1 }, 
      { name: 'Fahrenheit', symbol: '°F', factor: 1 }, 
      { name: 'Kelvin', symbol: 'K', factor: 1 }, 
    ],
  },
  Time: {
    name: 'Time',
    units: [
      { name: 'Femtosecond', symbol: 'fs', factor: 1e-15 },
      { name: 'Picosecond', symbol: 'ps', factor: 1e-12 },
      { name: 'Nanosecond', symbol: 'ns', factor: 1e-9 },
      { name: 'Microsecond', symbol: 'µs', factor: 1e-6 },
      { name: 'Millisecond', symbol: 'ms', factor: 0.001 },
      { name: 'Second', symbol: 's', factor: 1 },
      { name: 'Minute', symbol: 'min', factor: 60 },
      { name: 'Hour', symbol: 'h', factor: 3600 },
      { name: 'Day', symbol: 'd', factor: 86400 },
      { name: 'Year', symbol: 'a', factor: 31557600 }, 
    ].sort((a, b) => a.factor - b.factor),
  },
   Pressure: {
    name: 'Pressure',
    units: [
      { name: 'Pascal', symbol: 'Pa', factor: 1 },
      { name: 'Kilopascal', symbol: 'kPa', factor: 1000 },
      { name: 'Bar', symbol: 'bar', factor: 100000 },
      { name: 'Atmosphere', symbol: 'atm', factor: 101325 },
      { name: 'Pound per square inch', symbol: 'psi', factor: 6894.757293168 },
    ].sort((a,b) => a.factor - b.factor),
  },
  Area: {
    name: 'Area',
    units: [
        { name: 'Square Meter', symbol: 'm²', factor: 1 },
        { name: 'Square Kilometer', symbol: 'km²', factor: 1e6 },
        { name: 'Square Centimeter', symbol: 'cm²', factor: 0.0001 },
        { name: 'Square Millimeter', symbol: 'mm²', factor: 1e-6 },
        { name: 'Square Mile', symbol: 'mi²', factor: 2589988.110336 },
        { name: 'Square Yard', symbol: 'yd²', factor: 0.83612736 },
        { name: 'Square Foot', symbol: 'ft²', factor: 0.09290304 },
        { name: 'Square Inch', symbol: 'in²', factor: 0.00064516 },
        { name: 'Hectare', symbol: 'ha', factor: 10000 },
        { name: 'Acre', symbol: 'acre', factor: 4046.8564224 },
    ].sort((a,b) => a.factor - b.factor),
   },
    Volume: { 
        name: 'Volume',
        units: [ // Base unit is Liter (L)
            { name: 'Liter', symbol: 'L', factor: 1 },
            { name: 'Milliliter', symbol: 'mL', factor: 0.001 },
            { name: 'Cubic Meter', symbol: 'm³', factor: 1000 }, // 1 m³ = 1000 L
            { name: 'Cubic Centimeter', symbol: 'cm³', factor: 0.001 }, // Same as Milliliter
            { name: 'Cubic Millimeter', symbol: 'mm³', factor: 0.000001 },
            { name: 'Gallon (US)', symbol: 'gal', factor: 3.785411784 }, // US Gallon to L
            { name: 'Cubic Foot', symbol: 'ft³', factor: 28.316846592 }, // Cubic Foot to L
        ].sort((a,b) => a.factor - b.factor),
    },
    Energy: {
        name: 'Energy',
        units: [
            { name: 'Joule', symbol: 'J', factor: 1 },
            { name: 'Kilojoule', symbol: 'kJ', factor: 1000 },
            { name: 'Calorie', symbol: 'cal', factor: 4.184 },
            { name: 'Kilocalorie (food)', symbol: 'kcal', factor: 4184 },
            { name: 'Kilowatt Hour', symbol: 'kWh', factor: 3.6e6 },
            { name: 'British Thermal Unit', symbol: 'BTU', factor: 1055.05585262 },
        ].sort((a,b) => a.factor - b.factor),
    },
    Speed: {
        name: 'Speed',
        units: [
            { name: 'Meter per second', symbol: 'm/s', factor: 1 },
            { name: 'Kilometer per hour', symbol: 'km/h', factor: 1 / 3.6 },
            { name: 'Mile per hour', symbol: 'mph', factor: 0.44704 },
        ].sort((a,b) => a.factor - b.factor),
    },
    'Fuel Economy': { 
        name: 'Fuel Economy',
        units: fuelEconomyUnits,
    },
    'Data Storage': {
        name: 'Data Storage',
        units: [
            { name: 'Byte', symbol: 'B', factor: 1 },
            { name: 'Kilobyte', symbol: 'KB', factor: 1024 },
            { name: 'Megabyte', symbol: 'MB', factor: 1024 ** 2 },
            { name: 'Gigabyte', symbol: 'GB', factor: 1024 ** 3 },
            { name: 'Terabyte', symbol: 'TB', factor: 1024 ** 4 },
        ].sort((a,b) => a.factor - b.factor),
    },
    'Data Transfer Rate': {
        name: 'Data Transfer Rate',
        units: [
            { name: 'Bits per second', symbol: 'bps', factor: 1 },
            { name: 'Kilobits per second', symbol: 'Kbps', factor: 1000 },
            { name: 'Megabits per second', symbol: 'Mbps', factor: 1e6 },
            { name: 'Gigabits per second', symbol: 'Gbps', factor: 1e9 },
            { name: 'Bytes per second', symbol: 'B/s', factor: 8 },
            { name: 'Kilobytes per second', symbol: 'KB/s', factor: 8 * 1000 },
            { name: 'Megabytes per second', symbol: 'MB/s', factor: 8 * 1e6 },
        ].sort((a,b) => a.factor - b.factor),
    },
    'SI Prefixes': {
    name: 'SI Unit Prefixes',
    units: [
      { name: 'Yocto (10⁻²⁴)', symbol: 'y', factor: 1e-24 },
      { name: 'Zepto (10⁻²¹)', symbol: 'z', factor: 1e-21 },
      { name: 'Atto (10⁻¹⁸)', symbol: 'a', factor: 1e-18 },
      { name: 'Femto (10⁻¹⁵)', symbol: 'f', factor: 1e-15 },
      { name: 'Pico (10⁻¹²)', symbol: 'p', factor: 1e-12 },
      { name: 'Nano (10⁻⁹)', symbol: 'n', factor: 1e-9 },
      { name: 'Micro (10⁻⁶)', symbol: 'µ', factor: 1e-6 },
      { name: 'Milli (10⁻³)', symbol: 'm', factor: 1e-3 },
      { name: 'Centi (10⁻²)', symbol: 'c', factor: 1e-2 },
      { name: 'Deci (10⁻¹)', symbol: 'd', factor: 1e-1 },
      { name: 'Deca (10¹)', symbol: 'da', factor: 10 },
      { name: 'Hecto (10²)', symbol: 'h', factor: 1e2 },
      { name: 'Kilo (10³)', symbol: 'k', factor: 1e3 },
      { name: 'Mega (10⁶)', symbol: 'M', factor: 1e6 },
      { name: 'Giga (10⁹)', symbol: 'G', factor: 1e9 },
      { name: 'Tera (10¹²)', symbol: 'T', factor: 1e12 },
      { name: 'Peta (10¹⁵)', symbol: 'P', factor: 1e15 },
      { name: 'Exa (10¹⁸)', symbol: 'E', factor: 1e18 },
      { name: 'Zetta (10²¹)', symbol: 'Z', factor: 1e21 },
      { name: 'Yotta (10²⁴)', symbol: 'Y', factor: 1e24 },
    ],
  },
  Bitcoin: {
        name: 'Bitcoin',
        units: [
            { name: 'Bitcoin', symbol: 'BTC', factor: 1 },
            { name: 'Satoshi', symbol: 'sat', factor: 1e-8 },
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
  { category: 'Time', fromUnit: 'h', toUnit: 'min', name: 'Hours to Minutes' },
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
  { category: 'SI Prefixes', fromUnit: 'p', toUnit: 'µ', name: 'Pico to micro' },

  // Additional high-precision presets surfaced for power users
  { category: 'Time', fromUnit: 's', toUnit: 'ns', name: 'Seconds to Nanoseconds (Adv)' },
  { category: 'Length', fromUnit: 'm', toUnit: 'nm', name: 'Meters to Nanometers (Adv)' },
];


export const categoryDisplayOrder: UnitCategory[] = [
  'Length', 'Mass', 'Temperature', 'Time', 'Pressure',
  'Area', 'Volume', 'Energy', 'Speed', 'Fuel Economy',
  'Data Storage', 'Data Transfer Rate', 'Bitcoin', 'SI Prefixes',
  // Removed: 'Ethereum', 'EM Frequency', 'Sound Frequency',
];

export const getUnitsForCategory = (category: UnitCategory | ""): Unit[] => {
  const categoryKey = category as UnitCategory;
  if (!categoryKey || !unitData[categoryKey]) {
    return [];
  }
  return unitData[categoryKey].units ?? [];
};


export const getFilteredAndSortedPresets = (
    favorites: FavoriteItem[] = []
): Preset[] => {
    const favoriteSignatures = new Set(
        favorites.map(fav => `${fav.category}-${fav.fromUnit}-${fav.toUnit}`)
    );

    const presetsNotInFavorites = allPresets.filter(preset => {
        const presetSignature = `${preset.category}-${preset.fromUnit}-${preset.toUnit}`;
        return !favoriteSignatures.has(presetSignature) && unitData[preset.category]; // Ensure category still exists
    });
    
    const validPresets = presetsNotInFavorites.filter(preset => {
        const categoryUnits = unitData[preset.category]?.units;
        if (!categoryUnits) return false;

        const fromUnitDetails = categoryUnits.find(u => u.symbol === preset.fromUnit);
        const toUnitDetails = categoryUnits.find(u => u.symbol === preset.toUnit);
        
        // Ensure presets only surface when both referenced units exist for the category.
        return fromUnitDetails && toUnitDetails;
    });


    const sortedValidPresets = [...validPresets].sort((a, b) => {
        const indexA = categoryDisplayOrder.indexOf(a.category);
        const indexB = categoryDisplayOrder.indexOf(b.category);

        if (indexA !== indexB) {
            if (indexA === -1) return 1; 
            if (indexB === -1) return -1;
            return indexA - indexB;
        }
        return a.name.localeCompare(b.name);
    });
    
    const onePresetPerCategoryList: Preset[] = [];
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

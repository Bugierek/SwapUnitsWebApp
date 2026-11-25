import type { UnitCategory, UnitData, Preset, Unit, FavoriteItem, UnitNotation } from '@/types';

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
// Power: Watt (W)
// Force: Newton (N)
// Torque: Newton meter (N·m)
// Density: Kilogram per cubic meter (kg/m³)
// Fuel Economy: Kilometer per Liter (km/L)
// Data Storage: Byte (B). KB/MB/GB/TB are decimal (10³ steps, the SI meaning and what drive
//   makers use); KiB/MiB/GiB/TiB are the IEC binary units (2¹⁰ steps).
// Data Transfer Rate: Bits per second (bps)
// Bitcoin: Bitcoin (BTC)
// Currency: Currency (dynamic rates)
//
// Factors for the US customary, imperial and gravitational units follow NIST SP 811 Appendix B
// and are computed from the exact definitions below rather than from its rounded table values.

const EPA_MPGE_WH_PER_GALLON = 33705; // EPA consumer-label MPGe constant (fueleconomy.gov / 40 CFR 600.116)
const US_GALLON_TO_LITER = 3.785411784; // 231 in³, exact; matches the Volume category's 'gal' factor below
const IMPERIAL_GALLON_TO_LITER = 4.54609; // exact (UK Weights and Measures Act 1985)
const POUND_TO_KG = 0.45359237; // exact (international avoirdupois pound)
const STANDARD_GRAVITY = 9.80665; // m/s², exact; defines the kilogram-force and pound-force
const POUND_FORCE_TO_NEWTON = POUND_TO_KG * STANDARD_GRAVITY; // 4.4482216152605 N
const BTU_IT_TO_JOULE = 1055.05585262; // International Table BTU, exact; same BTU as the Energy category
const MMHG_TO_PASCAL = 133.322387415; // conventional mmHg: 13.5951 g/cm³ × 1 mm × standard gravity
const LITER_GASOLINE_KWH_EQUIVALENCE = (EPA_MPGE_WH_PER_GALLON / 1000) / US_GALLON_TO_LITER; // ≈ 8.9039 kWh/L
const WH_PER_KM_FACTOR = LITER_GASOLINE_KWH_EQUIVALENCE * 1000; // converts Wh/km to km/L via inverse relationship
const MILES_TO_KILOMETERS = 1.609344;
// km/L per mile per US gallon (1.609344 km ÷ 3.785411784 L).
const MPG_US_FACTOR = 0.425143707430272;

const fuelEconomyUnits: Unit[] = [
  { name: 'Kilometer per Liter', symbol: 'km/L', factor: 1, unitType: 'direct_efficiency' },
  { name: 'Liter per 100 km', symbol: 'L/100km', factor: 100, unitType: 'inverse_consumption' },
  { name: 'Liter per 100 miles', symbol: 'L/100mi', factor: 100 * MILES_TO_KILOMETERS, unitType: 'inverse_consumption' },
  { name: 'Mile per Gallon (US)', symbol: 'MPG (US)', factor: MPG_US_FACTOR, unitType: 'direct_efficiency' },
  { name: 'Mile per Gallon (UK)', symbol: 'MPG (UK)', factor: 0.3540061899346471, unitType: 'direct_efficiency' },
  // EPA's MPGe is miles per 33,705 Wh, the energy-equivalent of one US gallon of gasoline. The
  // EV units in this category already convert through that same constant, so 1 MPGe is exactly
  // 1 MPG (US) here: 120 MPGe = 33.705 kWh ÷ 1.2 = 28.0875 kWh/100mi.
  { name: 'Mile per gallon equivalent', symbol: 'MPGe', factor: MPG_US_FACTOR, unitType: 'direct_efficiency' },
  { name: 'Kilometer per kWh', symbol: 'km/kWh', factor: LITER_GASOLINE_KWH_EQUIVALENCE, unitType: 'direct_efficiency' }, 
  { name: 'Mile per kWh', symbol: 'mi/kWh', factor: 1.609344 * LITER_GASOLINE_KWH_EQUIVALENCE, unitType: 'direct_efficiency' }, 
  { name: 'kWh per 100 km', symbol: 'kWh/100km', factor: 100 * LITER_GASOLINE_KWH_EQUIVALENCE, unitType: 'inverse_consumption' }, 
  { name: 'kWh per 100 miles', symbol: 'kWh/100mi', factor: 100 * LITER_GASOLINE_KWH_EQUIVALENCE * MILES_TO_KILOMETERS, unitType: 'inverse_consumption' },
  { name: 'Watt-hour per kilometer', symbol: 'Wh/km', factor: WH_PER_KM_FACTOR, unitType: 'inverse_consumption' },
  { name: 'Watt-hour per mile', symbol: 'Wh/mi', factor: WH_PER_KM_FACTOR * MILES_TO_KILOMETERS, unitType: 'inverse_consumption' },
];

// Also the display order of the EV units, after the liquid-fuel ones. MPGe comes first so it sits
// next to MPG (US) / MPG (UK) in unit lists.
export const EV_FUEL_ECONOMY_UNIT_SYMBOLS = ['MPGe', 'km/kWh', 'mi/kWh', 'kWh/100km', 'kWh/100mi', 'Wh/km', 'Wh/mi'] as const;

export const isEvFuelEconomyUnit = (symbol: string): boolean =>
  (EV_FUEL_ECONOMY_UNIT_SYMBOLS as readonly string[]).includes(symbol);

export const isEvInvolvingFuelEconomyPair = (fromSymbol: string, toSymbol: string): boolean =>
  isEvFuelEconomyUnit(fromSymbol) || isEvFuelEconomyUnit(toSymbol);

fuelEconomyUnits.sort((a, b) => {
  const preferredOrderICE = ['km/L', 'L/100km', 'L/100mi', 'MPG (US)', 'MPG (UK)'];
  const preferredOrderEV: readonly string[] = EV_FUEL_ECONOMY_UNIT_SYMBOLS;

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
  Currency: {
    name: 'Currency',
    units: [
      { name: 'Euro', symbol: 'EUR', factor: 1 },
      { name: 'US Dollar', symbol: 'USD', factor: 1 },
      { name: 'British Pound', symbol: 'GBP', factor: 1 },
      { name: 'Swiss Franc', symbol: 'CHF', factor: 1 },
      { name: 'Japanese Yen', symbol: 'JPY', factor: 1 },
      { name: 'Polish Zloty', symbol: 'PLN', factor: 1 },
      { name: 'Canadian Dollar', symbol: 'CAD', factor: 1 },
      { name: 'Australian Dollar', symbol: 'AUD', factor: 1 },
      { name: 'New Zealand Dollar', symbol: 'NZD', factor: 1 },
      { name: 'Swedish Krona', symbol: 'SEK', factor: 1 },
      { name: 'Norwegian Krone', symbol: 'NOK', factor: 1 },
      { name: 'Danish Krone', symbol: 'DKK', factor: 1 },
      { name: 'Brazilian Real', symbol: 'BRL', factor: 1 },
      { name: 'Chinese Yuan', symbol: 'CNY', factor: 1 },
      { name: 'Czech Koruna', symbol: 'CZK', factor: 1 },
      { name: 'Hong Kong Dollar', symbol: 'HKD', factor: 1 },
      { name: 'Hungarian Forint', symbol: 'HUF', factor: 1 },
      { name: 'Indonesian Rupiah', symbol: 'IDR', factor: 1 },
      { name: 'Israeli Shekel', symbol: 'ILS', factor: 1 },
      { name: 'Indian Rupee', symbol: 'INR', factor: 1 },
      { name: 'Icelandic Krona', symbol: 'ISK', factor: 1 },
      { name: 'South Korean Won', symbol: 'KRW', factor: 1 },
      { name: 'Mexican Peso', symbol: 'MXN', factor: 1 },
      { name: 'Malaysian Ringgit', symbol: 'MYR', factor: 1 },
      { name: 'Philippine Peso', symbol: 'PHP', factor: 1 },
      { name: 'Romanian Leu', symbol: 'RON', factor: 1 },
      { name: 'Singapore Dollar', symbol: 'SGD', factor: 1 },
      { name: 'Thai Baht', symbol: 'THB', factor: 1 },
      { name: 'Turkish Lira', symbol: 'TRY', factor: 1 },
      { name: 'South African Rand', symbol: 'ZAR', factor: 1 },
    ],
  },
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
      { name: 'Yard', symbol: 'yd', factor: 0.9144 },
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
      { name: 'Stone', symbol: 'st', factor: 6.35029318 }, // 14 lb
      { name: 'Short Ton (US)', symbol: 'ton (US)', factor: 907.18474 }, // 2000 lb
      { name: 'Long Ton (UK)', symbol: 'ton (UK)', factor: 1016.0469088 }, // 2240 lb
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
      { name: 'Hectopascal', symbol: 'hPa', factor: 100 },
      // Same size as the hectopascal; weather reports use both.
      { name: 'Millibar', symbol: 'mbar', factor: 100 },
      { name: 'Megapascal', symbol: 'MPa', factor: 1e6 },
      { name: 'Millimeter of mercury', symbol: 'mmHg', factor: MMHG_TO_PASCAL },
      { name: 'Inch of mercury', symbol: 'inHg', factor: 25.4 * MMHG_TO_PASCAL },
      // Exactly 1/760 atm; differs from the conventional mmHg by about 1 part in 7 million.
      { name: 'Torr', symbol: 'Torr', factor: 101325 / 760 },
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
            { name: 'Cubic Inch', symbol: 'in³', factor: 0.016387064 }, // 2.54³ cm³, exact
            { name: 'Cubic Yard', symbol: 'yd³', factor: 764.554857984 }, // 0.9144³ m³, exact
            // US customary kitchen and liquid measures, all fractions of the 231 in³ US gallon.
            { name: 'Teaspoon (US)', symbol: 'tsp', factor: US_GALLON_TO_LITER / 768 },
            { name: 'Tablespoon (US)', symbol: 'tbsp', factor: US_GALLON_TO_LITER / 256 },
            { name: 'Fluid Ounce (US)', symbol: 'fl oz', factor: US_GALLON_TO_LITER / 128 },
            { name: 'Cup (US)', symbol: 'cup', factor: US_GALLON_TO_LITER / 16 },
            { name: 'Pint (US)', symbol: 'pt', factor: US_GALLON_TO_LITER / 8 },
            { name: 'Quart (US)', symbol: 'qt', factor: US_GALLON_TO_LITER / 4 },
            // Imperial measures. Named "Imperial ..." rather than "... (UK)" so the finder's
            // plain "fluid ounce" / "pint" / "gallon" keep meaning the US units, as "gallon" does now.
            { name: 'Imperial Fluid Ounce', symbol: 'fl oz (UK)', factor: IMPERIAL_GALLON_TO_LITER / 160 },
            { name: 'Imperial Pint', symbol: 'pt (UK)', factor: IMPERIAL_GALLON_TO_LITER / 8 },
            { name: 'Imperial Gallon', symbol: 'gal (UK)', factor: IMPERIAL_GALLON_TO_LITER },
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
            { name: 'British Thermal Unit', symbol: 'BTU', factor: BTU_IT_TO_JOULE },
            { name: 'Watt Hour', symbol: 'Wh', factor: 3600 },
            { name: 'Megajoule', symbol: 'MJ', factor: 1e6 },
            // Exact since the 2019 SI redefinition fixed the elementary charge.
            { name: 'Electronvolt', symbol: 'eV', factor: 1.602176634e-19 },
            // 100,000 BTU (IT), the "therm (EC)" in NIST SP 811; the U.S. therm there is 0.02% smaller.
            { name: 'Therm', symbol: 'thm', factor: 100000 * BTU_IT_TO_JOULE },
        ].sort((a,b) => a.factor - b.factor),
    },
    Speed: {
        name: 'Speed',
        units: [
            { name: 'Meter per second', symbol: 'm/s', factor: 1 },
            { name: 'Kilometer per hour', symbol: 'km/h', factor: 1 / 3.6 },
            { name: 'Mile per hour', symbol: 'mph', factor: 0.44704 },
            // International knot: exactly 1 nautical mile (1852 m) per hour.
            { name: 'Knot', symbol: 'kn', factor: 1852 / 3600 },
            { name: 'Foot per second', symbol: 'ft/s', factor: 0.3048 },
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
            // Decimal (SI) units, as NIST, IEC 80000-13 and drive makers define them. The symbol
            // stays "KB" rather than SI "kB": pair URLs are built from symbols.
            { name: 'Kilobyte', symbol: 'KB', factor: 1e3 },
            { name: 'Megabyte', symbol: 'MB', factor: 1e6 },
            { name: 'Gigabyte', symbol: 'GB', factor: 1e9 },
            { name: 'Terabyte', symbol: 'TB', factor: 1e12 },
            // IEC binary units: what Windows and RAM sizes report while labelling them "GB".
            { name: 'Kibibyte', symbol: 'KiB', factor: 1024 },
            { name: 'Mebibyte', symbol: 'MiB', factor: 1024 ** 2 },
            { name: 'Gibibyte', symbol: 'GiB', factor: 1024 ** 3 },
            { name: 'Tebibyte', symbol: 'TiB', factor: 1024 ** 4 },
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
  // The categories below come last on purpose: the finder's alias index follows this object's
  // order, so where a symbol here matches an older one case-insensitively (kN/kn, PS/ps, Nm/nm)
  // the older unit stays the default and the parser picks the new one from context or exact case.
  Power: {
    name: 'Power',
    units: [
      // Milliwatt sorts first (by factor), so the alias index reads an all-lowercase "mw" as
      // milliwatts ("5mw laser"); "MW" typed in capitals is still the megawatt.
      { name: 'Milliwatt', symbol: 'mW', factor: 1e-3 },
      { name: 'Watt', symbol: 'W', factor: 1 },
      { name: 'Kilowatt', symbol: 'kW', factor: 1e3 },
      { name: 'Megawatt', symbol: 'MW', factor: 1e6 },
      { name: 'Gigawatt', symbol: 'GW', factor: 1e9 },
      // 550 ft·lbf/s ≈ 745.70 W.
      { name: 'Horsepower (mechanical)', symbol: 'hp', factor: 550 * 0.3048 * POUND_FORCE_TO_NEWTON },
      // 75 kgf·m/s = 735.49875 W (PS / CV / pk).
      { name: 'Metric Horsepower (PS)', symbol: 'PS', factor: 75 * STANDARD_GRAVITY },
      { name: 'BTU per hour', symbol: 'BTU/h', factor: BTU_IT_TO_JOULE / 3600 },
    ].sort((a, b) => a.factor - b.factor),
  },
  Force: {
    name: 'Force',
    units: [
      { name: 'Newton', symbol: 'N', factor: 1 },
      { name: 'Kilonewton', symbol: 'kN', factor: 1e3 },
      { name: 'Dyne', symbol: 'dyn', factor: 1e-5 },
      { name: 'Kilogram-force', symbol: 'kgf', factor: STANDARD_GRAVITY },
      { name: 'Pound-force', symbol: 'lbf', factor: POUND_FORCE_TO_NEWTON },
      { name: 'Kip', symbol: 'kip', factor: 1000 * POUND_FORCE_TO_NEWTON }, // 1,000 lbf
    ].sort((a, b) => a.factor - b.factor),
  },
  Torque: {
    name: 'Torque',
    units: [
      { name: 'Newton Meter', symbol: 'N·m', factor: 1 },
      { name: 'Newton Centimeter', symbol: 'N·cm', factor: 0.01 },
      { name: 'Kilogram-force Meter', symbol: 'kgf·m', factor: STANDARD_GRAVITY },
      { name: 'Kilogram-force Centimeter', symbol: 'kgf·cm', factor: STANDARD_GRAVITY / 100 },
      { name: 'Pound-force Foot', symbol: 'lbf·ft', factor: POUND_FORCE_TO_NEWTON * 0.3048 },
      { name: 'Pound-force Inch', symbol: 'lbf·in', factor: POUND_FORCE_TO_NEWTON * 0.0254 },
      { name: 'Ounce-force Inch', symbol: 'ozf·in', factor: (POUND_FORCE_TO_NEWTON / 16) * 0.0254 },
    ].sort((a, b) => a.factor - b.factor),
  },
  Density: {
    name: 'Density',
    units: [
      { name: 'Kilogram per cubic meter', symbol: 'kg/m³', factor: 1 },
      { name: 'Gram per cubic centimeter', symbol: 'g/cm³', factor: 1000 },
      // g/mL and kg/L are the same density as g/cm³; g/L is the same as kg/m³.
      { name: 'Gram per milliliter', symbol: 'g/mL', factor: 1000 },
      { name: 'Kilogram per liter', symbol: 'kg/L', factor: 1000 },
      { name: 'Gram per liter', symbol: 'g/L', factor: 1 },
      { name: 'Pound per cubic foot', symbol: 'lb/ft³', factor: POUND_TO_KG / 0.028316846592 },
      { name: 'Pound per cubic inch', symbol: 'lb/in³', factor: POUND_TO_KG / 0.000016387064 },
      { name: 'Pound per gallon (US)', symbol: 'lb/gal', factor: POUND_TO_KG / (US_GALLON_TO_LITER / 1000) },
    ].sort((a, b) => a.factor - b.factor),
  },
};

// Other exact ways of writing a unit: the same unit, not a separate one, so no pair pages of their
// own. The finder accepts each (plus keyboard forms: "N/mm2", "W*s"); the category table, the pair
// pages and /unit-notations show them. Exact equivalences only: nothing approximate, and nothing
// that also means something else ("kt" is knot and kilotonne, "fps" is also frames per second).
// Torque in N·m is deliberately not listed as joules; see the Torque FAQ.
const UNIT_NOTATIONS: Partial<Record<UnitCategory, Record<string, UnitNotation[]>>> = {
  Pressure: {
    Pa: [{ text: 'N/m²', why: 'The pascal is defined as one newton per square metre.' }],
    kPa: [{ text: 'kN/m²', why: '1 kN/m² = 1,000 N/m² = 1,000 Pa.' }],
    MPa: [
      { text: 'N/mm²', why: '1 mm² = 10⁻⁶ m², so 1 N/mm² = 10⁶ N/m² = 1 MPa. Common in steel, concrete and material specifications.' },
      { text: 'MN/m²', why: '1 MN/m² = 10⁶ N/m² = 1 MPa.' },
    ],
    psi: [
      { text: 'lbf/in²', why: 'psi stands for pound-force per square inch.' },
      { text: 'lb/in²', why: 'Common shorthand for lbf/in²: the pound here is the pound-force.' },
    ],
  },
  Area: {
    ha: [{ text: 'hm²', why: 'A hectare is a square hectometre: 100 m × 100 m = 10,000 m².' }],
    'in²': [{ text: 'sq in', why: 'US abbreviation for square inch.' }],
    'ft²': [{ text: 'sq ft', why: 'US abbreviation for square foot.' }],
    'yd²': [{ text: 'sq yd', why: 'US abbreviation for square yard.' }],
    'mi²': [{ text: 'sq mi', why: 'US abbreviation for square mile.' }],
    acre: [{ text: 'ac', why: 'Standard abbreviation of acre.' }],
  },
  Volume: {
    'cm³': [{ text: 'cc', why: 'Cubic centimetre, used for engine displacement and medical doses.' }],
    L: [{ text: 'dm³', why: 'The litre is defined as one cubic decimetre (10 cm × 10 cm × 10 cm).' }],
    'mm³': [{ text: 'µL', why: '1 µL = 10⁻⁶ L = 10⁻⁶ dm³ = 1 mm³.' }],
    'in³': [{ text: 'cu in', why: 'US abbreviation for cubic inch.' }],
    'ft³': [{ text: 'cu ft', why: 'US abbreviation for cubic foot.' }],
    'yd³': [{ text: 'cu yd', why: 'US abbreviation for cubic yard.' }],
  },
  Energy: {
    J: [{ text: 'W·s', why: 'A watt is one joule per second, so one watt for one second is one joule.' }],
    Wh: [{ text: 'W·h', why: 'Watt times hour; the dot is usually left out.' }],
    kWh: [{ text: 'kW·h', why: 'Kilowatt times hour; the dot is usually left out.' }],
    kcal: [{ text: 'Cal', why: 'The Calorie with a capital C on food labels is one kilocalorie (4,184 J); the small calorie (cal) is 1,000 times smaller.' }],
  },
  Speed: {
    'km/h': [
      { text: 'kph', why: 'Common abbreviation of kilometres per hour, though not an SI symbol.' },
      { text: 'km/hr', why: 'The same unit with "hr" for hour.' },
      { text: 'kmh', why: 'Written without the slash on some signs and dashboards.' },
    ],
    mph: [{ text: 'mi/h', why: 'Miles per hour written as a quotient.' }],
  },
  Power: {
    W: [{ text: 'J/s', why: 'The watt is defined as one joule per second.' }],
    kW: [{ text: 'kJ/s', why: '1 kJ/s = 1,000 J/s = 1 kW.' }],
  },
  Force: {
    N: [{ text: 'kg·m/s²', why: 'One newton accelerates one kilogram by one metre per second squared (F = m·a).' }],
    dyn: [{ text: 'g·cm/s²', why: 'The CGS unit of force: one gram accelerated by one centimetre per second squared, 10⁻⁵ N.' }],
    kgf: [{ text: 'kp', why: 'Kilopond, the older name for the kilogram-force (9.80665 N).' }],
    kip: [{ text: 'klbf', why: 'A kip is a kilo-pound-force: 1,000 lbf.' }],
  },
  Torque: {
    'lbf·ft': [{ text: 'ft·lbf', why: 'The same product in the other order; US specs often write ft·lb.' }],
    'lbf·in': [{ text: 'in·lbf', why: 'The same product in the other order; often written in·lb.' }],
    'ozf·in': [{ text: 'in·ozf', why: 'The same product in the other order.' }],
  },
  Density: {
    'g/cm³': [{ text: 'g/cc', why: '1 cc is 1 cm³.' }],
    'lb/ft³': [{ text: 'pcf', why: 'Pounds per cubic foot, common in US construction.' }],
  },
  'Data Storage': {
    KB: [{ text: 'kB', why: 'kB (lowercase k) is the SI form and KB the common one; both are 1,000 bytes here. 1,024 bytes is a KiB.' }],
  },
  'Data Transfer Rate': {
    bps: [{ text: 'bit/s', why: 'Bits per second, with the unit written out.' }],
    Kbps: [
      { text: 'kbit/s', why: 'Kilobits per second, with the unit written out.' },
      { text: 'Kb/s', why: 'A lowercase b is the bit: Kb/s is kilobits per second (KB/s is kilobytes, 8 times more).' },
    ],
    Mbps: [
      { text: 'Mbit/s', why: 'Megabits per second, with the unit written out.' },
      { text: 'Mb/s', why: 'A lowercase b is the bit: Mb/s is megabits per second (MB/s is megabytes, 8 times more).' },
    ],
    Gbps: [
      { text: 'Gbit/s', why: 'Gigabits per second, with the unit written out.' },
      // Exact case by hand: "GB/s" (gigabytes per second) isn't a listed unit, so it would
      // otherwise be read as this.
      { text: 'Gb/s', why: 'A lowercase b is the bit: Gb/s is gigabits per second (GB/s is gigabytes, 8 times more).', exactCase: true },
    ],
    'B/s': [{ text: 'Bps', why: 'Bytes per second with a capital B (bps with a lowercase b is bits per second).' }],
    'KB/s': [
      { text: 'kB/s', why: 'kB (lowercase k) is the SI form of the kilobyte.' },
      { text: 'KBps', why: 'Kilobytes per second with a capital B (Kbps is kilobits per second).' },
    ],
    'MB/s': [{ text: 'MBps', why: 'Megabytes per second with a capital B (Mbps is megabits per second).' }],
  },
};

(Object.entries(UNIT_NOTATIONS) as [UnitCategory, Record<string, UnitNotation[]>][]).forEach(([category, bySymbol]) => {
  Object.entries(bySymbol).forEach(([symbol, notations]) => {
    const unit = unitData[category].units.find((candidate) => candidate.symbol === symbol);
    if (!unit) {
      throw new Error(`UNIT_NOTATIONS: no unit ${symbol} in ${category}`);
    }
    unit.alsoWrittenAs = notations;
  });
});


export const allPresets: Preset[] = [
  { category: 'Length', fromUnit: 'm', toUnit: 'ft', name: 'Meter to Feet' },
  { category: 'Length', fromUnit: 'm', toUnit: 'yd', name: 'Meter to Yards' },
  { category: 'Length', fromUnit: 'km', toUnit: 'mi', name: 'Kilometer to Miles' },
  { category: 'Mass', fromUnit: 'kg', toUnit: 'lb', name: 'Kilograms to Pounds' },
  { category: 'Mass', fromUnit: 'g', toUnit: 'oz', name: 'Grams to Ounces' },
  { category: 'Mass', fromUnit: 'st', toUnit: 'kg', name: 'Stone to Kilograms' },
  { category: 'Temperature', fromUnit: '°C', toUnit: '°F', name: 'Celsius to Fahrenheit' },
  { category: 'Temperature', fromUnit: '°F', toUnit: '°C', name: 'Fahrenheit to Celsius' },
  { category: 'Time', fromUnit: 'h', toUnit: 'min', name: 'Hours to Minutes' },
  { category: 'Time', fromUnit: 's', toUnit: 'ms', name: 'Seconds to Milliseconds' },
  { category: 'Pressure', fromUnit: 'psi', toUnit: 'kPa', name: 'PSI to Kilopascals' },
  { category: 'Pressure', fromUnit: 'Pa', toUnit: 'atm', name: 'Pascals to Atmospheres' },
  { category: 'Pressure', fromUnit: 'hPa', toUnit: 'inHg', name: 'Hectopascals to Inches of Mercury' },
  { category: 'Area', fromUnit: 'm²', toUnit: 'ft²', name: 'Square Meters to Square Feet' },
  { category: 'Area', fromUnit: 'acre', toUnit: 'm²', name: 'Acres to Square Meters' },
  { category: 'Volume', fromUnit: 'L', toUnit: 'gal', name: 'Liters to Gallons (US)' },
  { category: 'Volume', fromUnit: 'mL', toUnit: 'L', name: 'Milliliters to Liters' },
  { category: 'Volume', fromUnit: 'cup', toUnit: 'mL', name: 'Cups to Milliliters' },
  { category: 'Volume', fromUnit: 'fl oz', toUnit: 'mL', name: 'Fluid Ounces to Milliliters' },
  { category: 'Energy', fromUnit: 'kWh', toUnit: 'BTU', name: 'Kilowatt Hours to BTU' },
  { category: 'Energy', fromUnit: 'J', toUnit: 'cal', name: 'Joules to Calories' },
  { category: 'Speed', fromUnit: 'km/h', toUnit: 'mph', name: 'km/h to mph' },
  { category: 'Speed', fromUnit: 'm/s', toUnit: 'km/h', name: 'm/s to km/h' },
  { category: 'Power', fromUnit: 'kW', toUnit: 'hp', name: 'Kilowatts to Horsepower' },
  { category: 'Power', fromUnit: 'BTU/h', toUnit: 'W', name: 'BTU per Hour to Watts' },
  { category: 'Force', fromUnit: 'N', toUnit: 'lbf', name: 'Newtons to Pounds-force' },
  { category: 'Force', fromUnit: 'kgf', toUnit: 'N', name: 'Kilograms-force to Newtons' },
  { category: 'Torque', fromUnit: 'N·m', toUnit: 'lbf·ft', name: 'Newton Meters to Pound-feet' },
  { category: 'Torque', fromUnit: 'lbf·ft', toUnit: 'N·m', name: 'Pound-feet to Newton Meters' },
  { category: 'Density', fromUnit: 'g/cm³', toUnit: 'kg/m³', name: 'g/cm³ to kg/m³' },
  { category: 'Density', fromUnit: 'kg/m³', toUnit: 'lb/ft³', name: 'kg/m³ to lb/ft³' },
  { category: 'Fuel Economy', fromUnit: 'MPG (US)', toUnit: 'km/L', name: 'MPG (US) to km/L' },
  { category: 'Fuel Economy', fromUnit: 'km/L', toUnit: 'MPG (UK)', name: 'km/L to MPG (UK)'},
  { category: 'Fuel Economy', fromUnit: 'L/100km', toUnit: 'L/100mi', name: 'L/100km to L/100mi' },
  { category: 'Fuel Economy', fromUnit: 'L/100mi', toUnit: 'L/100km', name: 'L/100mi to L/100km' },
  { category: 'Fuel Economy', fromUnit: 'kWh/100km', toUnit: 'mi/kWh', name: 'kWh/100km to mi/kWh (EV)' },
  { category: 'Fuel Economy', fromUnit: 'mi/kWh', toUnit: 'kWh/100km', name: 'mi/kWh to kWh/100km (EV)' },
  { category: 'Fuel Economy', fromUnit: 'Wh/km', toUnit: 'Wh/mi', name: 'Wh/km to Wh/mi (EV)' },
  { category: 'Fuel Economy', fromUnit: 'Wh/mi', toUnit: 'Wh/km', name: 'Wh/mi to Wh/km (EV)' },
  { category: 'Data Storage', fromUnit: 'GB', toUnit: 'MB', name: 'Gigabytes to Megabytes' },
  { category: 'Data Storage', fromUnit: 'TB', toUnit: 'GB', name: 'Terabytes to Gigabytes' },
  { category: 'Data Storage', fromUnit: 'TB', toUnit: 'GiB', name: 'Terabytes to Gibibytes' },
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
  'Area', 'Volume', 'Energy', 'Speed', 'Power', 'Force', 'Torque', 'Density', 'Fuel Economy',
  'Data Storage', 'Data Transfer Rate', 'Bitcoin', 'Currency', 'SI Prefixes',
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

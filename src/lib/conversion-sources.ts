import type { UnitCategory } from '@/types';
import { EV_FUEL_ECONOMY_UNIT_SYMBOLS } from '@/lib/unit-data';

export type ConversionSource = {
  id: string;
  title: string;
  organization: string;
  url: string;
  summary: string;
  appliesToUnits?: string[];
};

const NIST_GUIDE_SOURCE: ConversionSource = {
  id: 'nist-guide-si',
  title: 'The International System of Units (SI) — NIST Special Publication 330',
  organization: 'National Institute of Standards and Technology (NIST)',
  url: 'https://www.nist.gov/pml/special-publication-330',
  summary:
    'The SI Brochure (SP 330) is the definitive English edition of the BIPM SI tables. NIST’s edition lists the official constants and conversion factors tying inch-pound units to SI, which SwapUnits applies for length, mass, temperature, pressure, volume, and related conversions. See /standards/nist-si-tenfold for the complete decimal multiple/submultiple table.',
};

const NIST_SP_811_FACTORS: ConversionSource = {
  id: 'nist-sp-811-appendix-b8',
  title: 'Guide for the Use of the SI (NIST SP 811), Appendix B.8: Factors for Units Listed Alphabetically',
  organization: 'National Institute of Standards and Technology (NIST)',
  url: 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8',
  summary:
    'NIST’s table of factors for converting non-SI units to SI, including horsepower, pound-force, kilogram-force, pound-force foot, millimeter and inch of mercury, therm, electronvolt, US cups and spoons, and the short and long ton. SwapUnits computes each factor from the exact definitions behind the table (1 lb = 0.45359237 kg, standard gravity = 9.80665 m/s², 1 US gallon = 231 in³) rather than from its rounded values.',
};

const UK_WEIGHTS_AND_MEASURES_ACT: ConversionSource = {
  id: 'uk-weights-and-measures-act-1985',
  title: 'Weights and Measures Act 1985, Schedule 1',
  organization: 'UK Parliament (legislation.gov.uk)',
  url: 'https://www.legislation.gov.uk/ukpga/1985/72/schedule/1',
  summary:
    'Defines the imperial units: the pint as 0.56826125 liters (so the gallon is 4.54609 L and the fluid ounce 1/20 pint), the pound as 0.45359237 kg, the stone as 14 pounds, and the ton as 2,240 pounds.',
  appliesToUnits: ['fl oz (UK)', 'pt (UK)', 'gal (UK)', 'st', 'ton (UK)'],
};

const NIST_BINARY_PREFIXES: ConversionSource = {
  id: 'nist-binary-prefixes',
  title: 'Prefixes for Binary Multiples',
  organization: 'National Institute of Standards and Technology (NIST)',
  url: 'https://physics.nist.gov/cuu/Units/binary.html',
  summary:
    'States that SI prefixes are powers of ten (1 MB = 1,000,000 bytes) and lists the IEC binary prefixes kibi, mebi, gibi and tebi for powers of two (1 MiB = 1,048,576 bytes).',
};

const APPLE_STORAGE_CAPACITY: ConversionSource = {
  id: 'apple-storage-capacity',
  title: 'How storage capacity is measured on Apple devices',
  organization: 'Apple Support',
  url: 'https://support.apple.com/en-us/102119',
  summary:
    'Explains that storage device makers measure capacity in decimal units (1 GB = 1 billion bytes), that the binary system counts 1 GB as 1,073,741,824 bytes, and that OS X Leopard and earlier and iOS 10 and earlier reported storage in binary.',
};

const EPA_FUEL_ECONOMY_GUIDE: ConversionSource = {
  id: 'epa-fuel-economy-guide',
  title: 'Fuel Economy Guide (Model Year 2024)',
  organization: 'U.S. Environmental Protection Agency & U.S. Department of Energy',
  url: 'https://www.fueleconomy.gov/feg/pdfs/guides/FEG2024.pdf',
  summary:
    'Describes how MPG, km/L, and L/100 km ratings are calculated for the U.S. Monroney label and how to interpret efficiency versus consumption metrics.',
};

const DOE_AFDC_FUEL_PROPERTIES: ConversionSource = {
  id: 'doe-afdc-fuel-properties',
  title: 'Alternative Fuels Data Center: Fuel Properties Comparison',
  organization: 'U.S. Department of Energy',
  url: 'https://afdc.energy.gov/fuels/properties',
  summary:
    'Lists gasoline energy content, used alongside the EPA MPGe consumer-label constant (33,705 Wh/gallon, about 8.90 kWh per liter) to convert between liquid-fuel efficiency (km/L) and EV metrics (km/kWh, kWh/100 km, Wh/km).',
  appliesToUnits: [...EV_FUEL_ECONOMY_UNIT_SYMBOLS],
};

const EPA_MPGE_METHODOLOGY: ConversionSource = {
  id: 'epa-mpge-methodology',
  title: 'Petroleum-Equivalent Fuel Economy Calculation — 10 CFR 474.3',
  organization: 'U.S. Department of Energy',
  url: 'https://www.ecfr.gov/current/title-10/chapter-II/subchapter-D/part-474/section-474.3',
  summary:
    "EPA's consumer MPGe label uses a fixed 33,705 Wh/gallon energy-equivalence constant from five-cycle dynamometer testing, while a separate Petroleum Equivalency Factor for manufacturer CAFE compliance credit is being phased down from 82,049 to 28,996 Wh/gallon between model years 2010 and 2030 — two different constants for two different purposes.",
  appliesToUnits: [...EV_FUEL_ECONOMY_UNIT_SYMBOLS],
};

const IEC_80000_13: ConversionSource = {
  id: 'iec-80000-13',
  title: 'IEC 80000-13:2008, Quantities and units - Part 13: Information science and technology',
  organization: 'International Electrotechnical Commission (IEC)',
  url: 'https://webstore.iec.ch/publication/1529',
  summary:
    'Defines the bit, byte, and the decimal SI prefixes (kilo = 10^3, mega = 10^6, etc.) as well as binary multiples, which underpin the storage capacity and data rate conversions.',
};

const BITCOIN_CORE_DENOMINATION: ConversionSource = {
  id: 'bitcoin-core-denomination',
  title: 'Bitcoin Developer Glossary - Denomination',
  organization: 'Bitcoin Core Project',
  url: 'https://developer.bitcoin.org/glossary.html#term-Denomination',
  summary:
    'States that one bitcoin equals 100,000,000 satoshis, so BTC/Satoshi conversions follow the official Bitcoin Core denomination.',
};

const FRANKFURTER_ECB_RATES: ConversionSource = {
  id: 'frankfurter-ecb',
  title: 'Frankfurter.dev (ECB reference rates)',
  organization: 'Line of Flight / European Central Bank',
  url: 'https://www.frankfurter.dev',
  summary:
    'Open-source API that republishes the ECB daily FX reference rates (EUR base, updated once per business day around 16:00 CET). The app fetches these rates once per day for currency conversions.',
};

const categorySources: Record<UnitCategory, ConversionSource[]> = {
  Length: [NIST_GUIDE_SOURCE],
  Mass: [NIST_GUIDE_SOURCE, NIST_SP_811_FACTORS, UK_WEIGHTS_AND_MEASURES_ACT],
  Temperature: [NIST_GUIDE_SOURCE],
  Time: [NIST_GUIDE_SOURCE],
  Pressure: [NIST_GUIDE_SOURCE, NIST_SP_811_FACTORS],
  Area: [NIST_GUIDE_SOURCE],
  Volume: [NIST_GUIDE_SOURCE, NIST_SP_811_FACTORS, UK_WEIGHTS_AND_MEASURES_ACT],
  Energy: [NIST_GUIDE_SOURCE, NIST_SP_811_FACTORS],
  Speed: [NIST_GUIDE_SOURCE, NIST_SP_811_FACTORS],
  Power: [NIST_GUIDE_SOURCE, NIST_SP_811_FACTORS],
  Force: [NIST_GUIDE_SOURCE, NIST_SP_811_FACTORS],
  Torque: [NIST_GUIDE_SOURCE, NIST_SP_811_FACTORS],
  Density: [NIST_GUIDE_SOURCE, NIST_SP_811_FACTORS],
  'Fuel Economy': [NIST_GUIDE_SOURCE, EPA_FUEL_ECONOMY_GUIDE, DOE_AFDC_FUEL_PROPERTIES, EPA_MPGE_METHODOLOGY],
  'Data Storage': [IEC_80000_13, NIST_BINARY_PREFIXES, APPLE_STORAGE_CAPACITY],
  'Data Transfer Rate': [IEC_80000_13],
  Bitcoin: [BITCOIN_CORE_DENOMINATION],
  'SI Prefixes': [NIST_GUIDE_SOURCE],
  Currency: [FRANKFURTER_ECB_RATES],
};

export function getConversionSources(
  category: UnitCategory,
  fromUnit?: string,
  toUnit?: string,
): ConversionSource[] {
  const entries = categorySources[category] ?? [];
  if (!fromUnit && !toUnit) {
    return entries;
  }

  const fromSymbol = fromUnit?.toLowerCase();
  const toSymbol = toUnit?.toLowerCase();

  return entries.filter((source) => {
    if (!source.appliesToUnits || source.appliesToUnits.length === 0) {
      return true;
    }
    return source.appliesToUnits.some((unit) => {
      const normalized = unit.toLowerCase();
      return normalized === fromSymbol || normalized === toSymbol;
    });
  });
}

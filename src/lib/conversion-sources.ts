import type { UnitCategory } from '@/types';

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
    'The SI Brochure (SP 330) is the definitive English edition of the BIPM SI tables. NIST’s edition lists the official constants and conversion factors tying inch-pound units to SI, which SwapUnits applies for length, mass, temperature, pressure, volume, and related conversions.',
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
  url: 'https://afdc.energy.gov/fuels/fuel_properties',
  summary:
    'Lists gasoline lower heating value (about 32 MJ/gal, which is roughly 9.5 kWh per liter), letting the app convert between liquid-fuel efficiency (km/L) and EV metrics (km/kWh, kWh/100 km).',
  appliesToUnits: ['km/kWh', 'mi/kWh', 'kWh/100km', 'kWh/100mi'],
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

const categorySources: Record<UnitCategory, ConversionSource[]> = {
  Length: [NIST_GUIDE_SOURCE],
  Mass: [NIST_GUIDE_SOURCE],
  Temperature: [NIST_GUIDE_SOURCE],
  Time: [NIST_GUIDE_SOURCE],
  Pressure: [NIST_GUIDE_SOURCE],
  Area: [NIST_GUIDE_SOURCE],
  Volume: [NIST_GUIDE_SOURCE],
  Energy: [NIST_GUIDE_SOURCE],
  Speed: [NIST_GUIDE_SOURCE],
  'Fuel Economy': [NIST_GUIDE_SOURCE, EPA_FUEL_ECONOMY_GUIDE, DOE_AFDC_FUEL_PROPERTIES],
  'Data Storage': [IEC_80000_13],
  'Data Transfer Rate': [IEC_80000_13],
  Bitcoin: [BITCOIN_CORE_DENOMINATION],
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

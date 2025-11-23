import { getCategorySlug, categoryInfoList } from '@/lib/category-info';
import { unitData } from '@/lib/unit-data';
import type { UnitCategory } from '@/types';

const delimiter = '-to-';

const normalizeUnitForSlug = (unit: string): string =>
  unit
    .replace(/µ/g, 'u')
    .replace(/°/g, 'deg')
    .replace(/\+/g, 'plus')
    .replace(/\//g, '-per-')
    .replace(/\s+/g, '-')
    .replace(/\^2|²/g, '2')
    .replace(/\^3|³/g, '3');

const denormalizeUnitFromSlug = (slugUnit: string): string =>
  slugUnit
    .replace(/-per-/g, '/')
    .replace(/deg/g, '°')
    .replace(/plus/g, '+')
    .replace(/-/g, ' ');

const encodeUnit = (unit: string): string => normalizeUnitForSlug(unit);
const decodeUnit = (value: string): string => {
  const denormalized = denormalizeUnitFromSlug(value);
  // If it looks like a currency code (letters only, short), normalize to uppercase.
  if (/^[a-z]+$/i.test(denormalized) && denormalized.length <= 4) {
    return denormalized.toUpperCase();
  }
  return denormalized;
};

export const buildConversionPairSlug = (fromSymbol: string, toSymbol: string): string =>
  `${encodeUnit(fromSymbol)}${delimiter}${encodeUnit(toSymbol)}`;

export const parseConversionPairSlug = (
  slug: string,
): { fromSymbol: string; toSymbol: string } | null => {
  const parts = slug.split(delimiter);
  if (parts.length !== 2) return null;
  try {
    return {
      fromSymbol: decodeUnit(parts[0]),
      toSymbol: decodeUnit(parts[1]),
    };
  } catch {
    return null;
  }
};

export const buildConversionPairUrl = (
  category: UnitCategory,
  fromSymbol: string,
  toSymbol: string,
): string => {
  const categorySlug = getCategorySlug(category);
  const pairSlug = buildConversionPairSlug(fromSymbol, toSymbol);
  return `/conversions/${categorySlug}/${pairSlug}`;
};

export const listAllConversionPairs = (): Array<{
  category: UnitCategory;
  categorySlug: string;
  fromSymbol: string;
  toSymbol: string;
  pairSlug: string;
}> => {
  const pairs: Array<{
    category: UnitCategory;
    categorySlug: string;
    fromSymbol: string;
    toSymbol: string;
    pairSlug: string;
  }> = [];

  for (const info of categoryInfoList) {
    if (info.category === 'SI Prefixes') {
      continue;
    }
    const units = unitData[info.category]?.units ?? [];
    for (const fromUnit of units) {
      for (const toUnit of units) {
        if (fromUnit.symbol === toUnit.symbol) continue;
        pairs.push({
          category: info.category,
          categorySlug: info.slug,
          fromSymbol: fromUnit.symbol,
          toSymbol: toUnit.symbol,
          pairSlug: buildConversionPairSlug(fromUnit.symbol, toUnit.symbol),
        });
      }
    }
  }

  return pairs;
};

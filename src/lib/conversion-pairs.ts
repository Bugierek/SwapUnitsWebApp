import { getCategorySlug, categoryInfoList } from '@/lib/category-info';
import { unitData } from '@/lib/unit-data';
import type { UnitCategory } from '@/types';

const delimiter = '-to-';

export const normalizeUnitForSlug = (unit: string): string =>
  unit
    .replace(/µ/g, 'u')
    .replace(/°/g, 'deg')
    .replace(/\+/g, 'plus')
    .replace(/\//g, '-per-')
    .replace(/\s+/g, '-')
    .replace(/\^2|²/g, '2')
    .replace(/\^3|³/g, '3');

const denormalizeUnitFromSlug = (slugUnit: string): string => {
  let val = slugUnit
    .replace(/-per-/g, '/')
    .replace(/deg/g, '°')
    .replace(/plus/g, '+')
    .replace(/-/g, ' ');
  // Restore common superscripts for area/volume
  val = val.replace(/2\b/g, '²').replace(/3\b/g, '³');
  return val;
};

const encodeUnit = (unit: string): string => normalizeUnitForSlug(unit);
const decodeUnit = (value: string): string => denormalizeUnitFromSlug(value);

export const buildConversionPairSlug = (fromSymbol: string, toSymbol: string): string =>
  `${encodeUnit(fromSymbol)}${delimiter}${encodeUnit(toSymbol)}`;

export const parseConversionPairSlug = (
  slug: string,
): { fromSymbol: string; toSymbol: string } | null => {
  const parts = slug.split(delimiter);
  if (parts.length !== 2) return null;
  try {
    const fromPart = decodeURIComponent(parts[0]);
    const toPart = decodeURIComponent(parts[1]);
    return {
      fromSymbol: decodeUnit(fromPart),
      toSymbol: decodeUnit(toPart),
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

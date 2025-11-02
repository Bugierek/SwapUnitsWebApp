import { getCategorySlug, categoryInfoList } from '@/lib/category-info';
import { unitData } from '@/lib/unit-data';
import type { UnitCategory } from '@/types';

const delimiter = '-to-';

const encodeUnit = (unit: string): string => encodeURIComponent(unit);
const decodeUnit = (value: string): string => decodeURIComponent(value);

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

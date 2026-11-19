import { getCategorySlug, categoryInfoList } from '@/lib/category-info';
import { unitData } from '@/lib/unit-data';
import type { Unit, UnitCategory } from '@/types';

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

const safeDecodeURIComponent = (value: string): string | null => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

const splitPairSlug = (slug: string): [string, string] | null => {
  const exact = slug.split(delimiter);
  if (exact.length === 2) return [exact[0], exact[1]];
  const loose = slug.split(/-to-/i);
  if (loose.length === 2) return [loose[0], loose[1]];
  return null;
};

// Matches one side of a pair slug to a unit. Exact matches are tried before any
// case-insensitive or normalized match, so a canonical slug always resolves to the unit it
// was built from, even if two symbols in a category ever differ only by case (SI Prefixes do,
// e.g. m/M, but they have no pair pages).
const matchUnitFromSlugPart = (units: Unit[], part: string): Unit | undefined => {
  const denormalized = denormalizeUnitFromSlug(part);
  const slugLower = part.toLowerCase();
  const normalizedLower = normalizeUnitForSlug(denormalized).toLowerCase();
  const matchers: Array<(unit: Unit) => boolean> = [
    (unit) => encodeUnit(unit.symbol) === part,
    (unit) => unit.symbol === part,
    (unit) => unit.symbol === denormalized,
    (unit) => encodeUnit(unit.symbol).toLowerCase() === slugLower,
    (unit) => unit.symbol.toLowerCase() === denormalized.toLowerCase(),
    (unit) => normalizeUnitForSlug(unit.symbol).toLowerCase() === normalizedLower,
  ];
  for (const matches of matchers) {
    const found = units.find(matches);
    if (found) return found;
  }
  return undefined;
};

export type ResolvedConversionPair = {
  fromUnit: Unit;
  toUnit: Unit;
  /** The slug `generateStaticParams`/the sitemap use for this pair, e.g. "degC-to-degF". */
  canonicalSlug: string;
  /** True when the requested slug (after URL-decoding) is already the canonical one. */
  isCanonical: boolean;
};

/**
 * Resolves a requested pair slug (possibly lowercase, URL-encoded or using raw symbols such as
 * "µm") to unit data and the canonical slug. Returns null when either side doesn't match a unit.
 */
export const resolveConversionPairSlug = (
  category: UnitCategory,
  pairSlug: string,
): ResolvedConversionPair | null => {
  const decoded = safeDecodeURIComponent(pairSlug);
  if (decoded === null) return null;
  const parts = splitPairSlug(decoded);
  if (!parts) return null;

  const units = unitData[category]?.units ?? [];
  const fromUnit = matchUnitFromSlugPart(units, parts[0]);
  const toUnit = matchUnitFromSlugPart(units, parts[1]);
  if (!fromUnit || !toUnit) return null;

  const canonicalSlug = buildConversionPairSlug(fromUnit.symbol, toUnit.symbol);
  return {
    fromUnit,
    toUnit,
    canonicalSlug,
    isCanonical: decoded === canonicalSlug,
  };
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

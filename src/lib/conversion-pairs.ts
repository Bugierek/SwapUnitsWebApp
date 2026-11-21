import {
  getCategorySlug,
  getCategoryInfoBySlug,
  categoryInfoList,
  type CategoryInfo,
} from '@/lib/category-info';
import { unitData } from '@/lib/unit-data';
import type { Unit, UnitCategory } from '@/types';

const delimiter = '-to-';

export const normalizeUnitForSlug = (unit: string): string =>
  unit
    .replace(/µ/g, 'u')
    .replace(/°/g, 'deg')
    .replace(/\+/g, 'plus')
    .replace(/\//g, '-per-')
    // "N·m" -> "N-m", "lbf·ft" -> "lbf-ft" (a raw "·" would be percent-encoded in the URL).
    .replace(/·/g, '-')
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

export const buildConversionPairSlug = (fromSymbol: string, toSymbol: string): string =>
  `${encodeUnit(fromSymbol)}${delimiter}${encodeUnit(toSymbol)}`;

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
// A lowercase or mis-cased slug that matches two units differing only in case goes to the unit
// that had pair pages first, so links that already existed keep their target: "kw-to-mw" has
// redirected to kW-to-MW since before the milliwatt was added. (The finder reads a typed "mw" as
// milliwatts; URLs keep the older meaning.)
const CASE_INSENSITIVE_SLUG_PREFERENCE: Record<string, string> = { mw: 'MW' };

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
    const found = units.filter(matches);
    if (found.length > 1) {
      const preferred = found.find(
        (unit) => CASE_INSENSITIVE_SLUG_PREFERENCE[unit.symbol.toLowerCase()] === unit.symbol,
      );
      if (preferred) return preferred;
    }
    if (found.length > 0) return found[0];
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

export type ResolvedConversionPairPage = ResolvedConversionPair & {
  categoryInfo: CategoryInfo;
  /** e.g. "/conversions/temperature-conversion/degC-to-degF" */
  canonicalPath: string;
};

/**
 * Resolves the two dynamic segments of a pair page URL. Returns null for unknown categories,
 * SI Prefixes (no pair pages) and slugs that don't match two units of the category.
 */
export const resolveConversionPairPage = (
  categorySlug: string,
  pairSlug: string,
): ResolvedConversionPairPage | null => {
  const categoryInfo = getCategoryInfoBySlug(categorySlug);
  if (!categoryInfo || categoryInfo.category === 'SI Prefixes') {
    return null;
  }
  const pair = resolveConversionPairSlug(categoryInfo.category, pairSlug);
  if (!pair) {
    return null;
  }
  return {
    ...pair,
    categoryInfo,
    canonicalPath: `/conversions/${categoryInfo.slug}/${pair.canonicalSlug}`,
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

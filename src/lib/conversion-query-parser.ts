'use client';

import { unitData } from '@/lib/unit-data';
import type { UnitCategory, Unit, UnitData } from '@/types';
import { matchSiPrefixToken } from '@/lib/si-prefixes';
import { getCategoryDefaultPair } from '@/lib/category-defaults';
import { CATEGORY_KEYWORDS } from '@/lib/category-keywords';

type AliasEntry = {
  symbol: string;
  category: UnitCategory;
};

type AliasIndex = Map<string, AliasEntry[]>;

type ValueStrategy = 'explicit' | 'force-default' | 'preserve-existing';

type UnitParseSuccess = {
  ok: true;
  kind: 'unit';
  value: number;
  fromUnit: string;
  toUnit: string;
  category: UnitCategory;
  valueStrategy: ValueStrategy;
};

type SiPrefixParseSuccess = {
  ok: true;
  kind: 'si-prefix';
  value: number;
  fromPrefixSymbol: string;
  toPrefixSymbol: string;
  inputText: string;
  valueStrategy: ValueStrategy;
};

type CategoryParseSuccess = {
  ok: true;
  kind: 'category';
  category: UnitCategory;
};

export type ParseSuccess = UnitParseSuccess | SiPrefixParseSuccess | CategoryParseSuccess;
export type ParseResult = ParseSuccess | ParseFailure;
export type ParsedConversionPayload = ParseSuccess;

type ParseFailure = {
  ok: false;
  error: string;
  suggestions?: string[];
};

const CONNECTOR_GLOBAL_REGEX = /\b(to|into|in)\b/gi;
const CONNECTOR_WORDS = new Set(['to', 'into', 'in']);
const STOP_WORDS = [
  'convert',
  'please',
  'me',
  'for',
  'how much is',
  'how much',
  'how many',
  'calculate',
  'calc',
  'what is',
  "what's",
  'whats',
  'the value of',
  'value of',
  'value',
  'amount of',
  'amount',
];

const SUPERSCRIPT_DIGIT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

const EXTRA_UNIT_SYNONYMS: Record<string, string[]> = {
  kg: ['kilogram', 'kilograms', 'kilo', 'kilos'],
  g: ['gram', 'grams'],
  mg: ['milligram', 'milligrams'],
  lb: ['pound', 'pounds'],
  oz: ['ounce', 'ounces'],
  mi: ['mile', 'miles'],
  ft: ['foot', 'feet'],
  yd: ['yard', 'yards'],
  in: ['inch', 'inches'],
  km: ['kilometer', 'kilometers', 'kilometre', 'kilometres'],
  m: ['meter', 'meters', 'metre', 'metres'],
  cm: ['centimeter', 'centimeters', 'centimetre', 'centimetres'],
  mm: ['millimeter', 'millimeters', 'millimetre', 'millimetres'],
  L: ['liter', 'liters', 'litre', 'litres'],
  mL: ['milliliter', 'milliliters', 'millilitre', 'millilitres'],
  min: ['minute', 'minutes', 'mins'],
  '°C': ['celsius', 'centigrade', 'c', 'deg c', 'degc', 'c deg', 'c-degree'],
  '°F': ['fahrenheit', 'f', 'deg f', 'degf', 'f deg', 'f-degree'],
  'm/s': ['meter per second', 'meters per second', 'metre per second', 'metres per second'],
  'km/h': ['kilometer per hour', 'kilometers per hour', 'kilometre per hour', 'kilometres per hour'],
  'mph': ['mile per hour', 'miles per hour'],
  'BTU': ['british thermal unit', 'british thermal units'],
  '\u00B5m': ['micrometer', 'micrometers', 'micrometre', 'micrometres', 'micron', 'microns', 'um'],
  '\u00B5s': ['microsecond', 'microseconds', 'us'],
  'm\u00B2': ['square meter', 'square meters', 'square metre', 'square metres', 'sq meter', 'sq meters', 'sqm', 'm2'],
  'cm\u00B2': ['square centimeter', 'square centimeters', 'square centimetre', 'square centimetres', 'cm2'],
  'mm\u00B2': ['square millimeter', 'square millimeters', 'square millimetre', 'square millimetres', 'mm2'],
  'ft\u00B2': ['square foot', 'square feet', 'ft2', 'sq ft'],
  'in\u00B2': ['square inch', 'square inches', 'in2', 'sq in'],
  'm\u00B3': ['cubic meter', 'cubic meters', 'cubic metre', 'cubic metres', 'm3'],
  'cm\u00B3': ['cubic centimeter', 'cubic centimeters', 'cubic centimetre', 'cubic centimetres', 'cm3'],
  'mm\u00B3': ['cubic millimeter', 'cubic millimeters', 'cubic millimetre', 'cubic millimetres', 'mm3'],
  'ft\u00B3': ['cubic foot', 'cubic feet', 'ft3', 'cu ft'],
  t: ['metric ton', 'metric tons', 'tonne', 'tonnes', 'ton', 'tons'],
  'Wh/km': [
    'wh per km',
    'wh per kilometer',
    'wh per kilometre',
    'watt hour per km',
    'watt hours per km',
    'watt-hour per kilometer',
    'watt-hours per kilometer',
    'watt hour per kilometer',
    'watt hour per kilometre',
    'watt hours per kilometre',
  ],
  'Wh/mi': [
    'wh per mi',
    'wh per mile',
    'watt hour per mile',
    'watt hours per mile',
    'watt-hour per mile',
    'watt-hours per mile',
  ],
};

const UNIT_SPECIFIC_TARGETS: Record<string, string[]> = {
  'Wh/km': ['Wh/mi', 'mi/kWh'],
  'Wh/mi': ['Wh/km', 'km/kWh'],
};

const TEMPERATURE_DEGREE_SYNONYMS: Record<string, string[]> = {
  '°C': [
    'degree celsius',
    'degrees celsius',
    'degree centigrade',
    'degrees centigrade',
    'degree °c',
    'degrees °c',
    'degree c',
    'degrees c',
    'deg c',
    'deg. c',
    'deg. °c',
    'deg °c',
  ],
  '°F': [
    'degree fahrenheit',
    'degrees fahrenheit',
    'degree °f',
    'degrees °f',
    'degree f',
    'degrees f',
    'deg f',
    'deg. f',
    'deg. °f',
    'deg °f',
  ],
};

let cachedAliasIndex: AliasIndex | null = null;
let cachedCategoryAliasMap: Map<string, UnitCategory> | null = null;

function getAliasIndex(): AliasIndex {
  if (!cachedAliasIndex) {
    cachedAliasIndex = buildAliasIndex();
  }
  return cachedAliasIndex;
}

function getCategoryAliasMap(): Map<string, UnitCategory> {
  if (cachedCategoryAliasMap) {
    return cachedCategoryAliasMap;
  }

  const map = new Map<string, UnitCategory>();
  (Object.keys(unitData) as UnitCategory[]).forEach((category) => {
    const categoryName = unitData[category]?.name ?? category;
    const aliases = new Set<string>([
      category,
      categoryName,
      ...(CATEGORY_KEYWORDS[category] ?? []),
    ]);
    aliases.forEach((alias) => {
      const key = alias.trim().toLowerCase();
      if (!key) return;
      map.set(key, category);
    });
  });

  cachedCategoryAliasMap = map;
  return map;
}

export function parseConversionQuery(rawQuery: string): ParseResult {
  if (!rawQuery || !rawQuery.trim()) {
    return { ok: false, error: 'Empty query' };
  }

  let normalized = normalizeQuery(rawQuery);
  const siDirectiveMatch = normalized.match(/^si\b/i);
  const hasSiDirective = Boolean(siDirectiveMatch);
  if (hasSiDirective) {
    normalized = normalized.slice(siDirectiveMatch![0].length).trim();
  }

  const valueMatch = normalized.match(
    /^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i,
  );

  let value = 1;
  let hasExplicitValue = false;
  if (valueMatch) {
    value = normalizeNumberToken(valueMatch[1]);
    normalized = normalized.slice(valueMatch[0].length).trim();
    hasExplicitValue = true;
  }

  const defaultValueStrategy: ValueStrategy = hasExplicitValue ? 'explicit' : 'force-default';

  const connectorMatches = Array.from(normalized.matchAll(CONNECTOR_GLOBAL_REGEX));

  const index = getAliasIndex();

  if (connectorMatches.length > 0) {
    for (const connectorMatch of connectorMatches) {
      const matchIndex = connectorMatch.index ?? -1;
      if (matchIndex < 0) continue;

      const fromPart = normalized.slice(0, matchIndex).trim();
      const toPart = normalized
        .slice(matchIndex + connectorMatch[0].length)
        .trim();

      if (!fromPart || !toPart) {
        continue;
      }

      const fromAlias = resolveAlias(index, fromPart);
      if (!fromAlias) {
        continue;
      }

      const toAlias = resolveAlias(index, toPart);
      if (!toAlias) {
        continue;
      }

      if (fromAlias && toAlias && fromAlias.category === toAlias.category) {
        return {
          ok: true,
          kind: 'unit',
          value,
          fromUnit: fromAlias.symbol,
          toUnit: toAlias.symbol,
          category: fromAlias.category,
          valueStrategy: defaultValueStrategy,
        };
      }

      if (hasSiDirective) {
        const prefixResult = tryParseSiPrefixes(fromPart, toPart, value, defaultValueStrategy);
        if (prefixResult) {
          return prefixResult;
        }
      }
    }
  }

  if (hasSiDirective) {
    const loosePrefixResult = tryParseSiPrefixesWithoutConnector(normalized, value, defaultValueStrategy);
    if (loosePrefixResult) {
      return loosePrefixResult;
    }
  }

  const singleUnitResult = tryParseSingleUnitQuery(
    normalized,
    value,
    hasExplicitValue,
    index,
  );
  if (singleUnitResult) {
    return singleUnitResult;
  }

  const categoryResult = tryParseCategoryQuery(normalized);
  if (categoryResult) {
    return categoryResult;
  }

  return { ok: false, error: 'Missing unit information' };
}

function normalizeQuery(query: string): string {
  let result = query
    .replace(/[,]/g, '') // remove thousand separators
    .replace(/[\u2192\u2794]/g, ' to ') // arrows
    .replace(/=>|->|=/g, ' to ');

  result = result.replace(/(^|[^a-zA-Z°µμ])(to|into|in)(?=$|[^a-zA-Z°µμ])/gi, '$1 $2 ');

  result = result
    .replace(/(\d)(?=[a-zA-Z°µμ])/g, (match, digit: string, offset: number, original: string) => {
      const rest = original.slice(offset + 1);
      if (/^[eE][+-]?\d/.test(rest)) {
        return digit;
      }
      return `${digit} `;
    })
    .replace(/([a-zA-Z°µμ])(?=\d)/g, (match, letter: string, offset: number, original: string) => {
      const rest = original.slice(offset + 1);
      if ((letter === 'e' || letter === 'E') && /^[+-]?\d/.test(rest)) {
        return letter;
      }
      return `${letter} `;
    });

  for (const stopWord of STOP_WORDS) {
    const stopRegex = new RegExp(`\\b${escapeRegex(stopWord)}\\b`, 'gi');
    result = result.replace(stopRegex, ' ');
  }

  result = result.replace(/\s+/g, ' ').trim();
  return result;
}

function normalizeNumberToken(token: string): number {
  const cleaned = token.replace(/,/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 1;
}

function resolveAlias(index: AliasIndex, raw: string): AliasEntry | null {
  const cleaned = normalizeAlias(raw);
  const direct = index.get(cleaned);
  if (!direct) return null;
  if (direct.length === 1) return direct[0];

  const firstSymbol = direct[0].symbol;
  if (direct.every((entry) => entry.symbol === firstSymbol)) {
    return direct[0];
  }

  // ambiguous, pick the first but caller can handle if needed
  return direct[0];
}

function normalizeAlias(raw: string): string {
  return raw
    .trim()
    .replace(/^(from|of)\s+/, '')
    .replace(/\s+per\s+/, ' per ')
    .replace(/deg\./gi, 'deg')
    .replace(/degrees?/gi, 'degree')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function buildAliasIndex(): AliasIndex {
  const map: AliasIndex = new Map();

  (Object.entries(unitData) as [UnitCategory, UnitData][]).forEach(
    ([category, data]) => {
      const units = (data.units ?? []) as Unit[];
      units.forEach((unit) => {
        const aliases = buildAliasesForUnit(unit);
        aliases.forEach((alias) => {
          addAlias(map, alias, unit.symbol, category);
        });
      });
    },
  );

  return map;
}

function buildAliasesForUnit(unit: Unit): string[] {
  const aliases = new Set<string>();
  const lowerSymbol = unit.symbol.toLowerCase();
  aliases.add(lowerSymbol);
  aliases.add(unit.symbol);

  const baseName = unit.name.toLowerCase();
  aliases.add(baseName);

  if (!baseName.endsWith('s')) {
    aliases.add(`${baseName}s`);
  }

  const nameWithoutParentheses = baseName.replace(/\s*\(.*?\)\s*/g, '').trim();
  if (nameWithoutParentheses && nameWithoutParentheses !== baseName) {
    aliases.add(nameWithoutParentheses);
    if (!nameWithoutParentheses.endsWith('s')) {
      aliases.add(`${nameWithoutParentheses}s`);
    }
  }

  const extra = EXTRA_UNIT_SYNONYMS[unit.symbol];
  if (extra) {
    extra.forEach((syn) => aliases.add(syn.toLowerCase()));
  }

  if (unit.symbol in TEMPERATURE_DEGREE_SYNONYMS) {
    TEMPERATURE_DEGREE_SYNONYMS[unit.symbol].forEach((syn) =>
      aliases.add(syn.toLowerCase()),
    );
  }

  // micro symbol fallbacks
  [...aliases].forEach((alias) => {
    if (/µ/.test(alias)) {
      aliases.add(alias.replace(/µ/g, 'u'));
      aliases.add(alias.replace(/µ/g, 'micro'));
    }
  });

  // allow aliases with hyphen / slash replacements
  [...aliases].forEach((alias) => {
    aliases.add(alias.replace(/-/g, ' '));
    aliases.add(alias.replace(/\s+/g, ' '));
  });

  const expanded = new Set<string>();
  Array.from(aliases.values())
    .map((alias) => alias.trim())
    .filter(Boolean)
    .forEach((alias) => {
      expandAliasVariants(alias).forEach((variant) => expanded.add(variant));
    });

  return Array.from(expanded.values());
}

function addAlias(
  map: AliasIndex,
  alias: string,
  symbol: string,
  category: UnitCategory,
) {
  const key = alias.toLowerCase();
  if (!map.has(key)) {
    map.set(key, []);
  }
  map.get(key)!.push({ symbol, category });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

function expandAliasVariants(alias: string): string[] {
  const variants = new Set<string>();
  const queue: string[] = [alias];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    const normalized = current.replace(/\s+/g, ' ').trim();
    if (!normalized || variants.has(normalized)) continue;
    variants.add(normalized);

    if (/[µμ]/.test(normalized)) {
      queue.push(normalized.replace(/[µμ]/g, 'u'));
      queue.push(normalized.replace(/[µμ]/g, 'micro'));
    }

    if (/[¹²³⁴⁵⁶⁷⁸⁹⁰]/.test(normalized)) {
      queue.push(
        normalized.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, (sup) => SUPERSCRIPT_DIGIT_MAP[sup] ?? ''),
      );
      queue.push(
        normalized.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, (sup) => ` ${SUPERSCRIPT_DIGIT_MAP[sup] ?? ''}`),
      );
      queue.push(
        normalized.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, (sup) => `^${SUPERSCRIPT_DIGIT_MAP[sup] ?? ''}`),
      );
    }

    const superscriptMatch = normalized.match(/^(.*?)([²³])$/);
    if (superscriptMatch) {
      const base = superscriptMatch[1].trim();
      const suffix = superscriptMatch[2] === '²' ? 'squared' : 'cubed';
      queue.push(`${base} ${suffix}`);
    }

    const squarePrefix = normalized.match(/^square\s+(.+)/);
    if (squarePrefix) {
      const rest = squarePrefix[1];
      queue.push(`${rest} squared`);
      queue.push(`${rest}^2`);
      queue.push(`${rest} 2`);
    }

    const sqPrefix = normalized.match(/^sq\.?\s+(.+)/);
    if (sqPrefix) {
      const rest = sqPrefix[1];
      queue.push(`${rest} squared`);
      queue.push(`${rest}^2`);
      queue.push(`${rest} 2`);
    }

    const cubicPrefix = normalized.match(/^cubic\s+(.+)/);
    if (cubicPrefix) {
      const rest = cubicPrefix[1];
      queue.push(`${rest} cubed`);
      queue.push(`${rest}^3`);
      queue.push(`${rest} 3`);
    }

    const cuPrefix = normalized.match(/^cu\.?\s+(.+)/);
    if (cuPrefix) {
      const rest = cuPrefix[1];
      queue.push(`${rest} cubed`);
      queue.push(`${rest}^3`);
      queue.push(`${rest} 3`);
    }

    const squaredWord = normalized.match(/^(.+)\s+squared$/);
    if (squaredWord) {
      const base = squaredWord[1];
      queue.push(`${base}^2`);
      queue.push(`${base} 2`);
    }

    const cubedWord = normalized.match(/^(.+)\s+cubed$/);
    if (cubedWord) {
      const base = cubedWord[1];
      queue.push(`${base}^3`);
      queue.push(`${base} 3`);
    }
  }

  return Array.from(variants.values());
}

export function getAliasesForUnit(unit: Unit): string[] {
  return buildAliasesForUnit(unit);
}

function tryParseSiPrefixes(
  fromToken: string,
  toToken: string,
  value: number,
  valueStrategy: ValueStrategy,
): SiPrefixParseSuccess | null {
  const fromPrefix = matchSiPrefixToken(fromToken);
  const toPrefix = matchSiPrefixToken(toToken);
  if (!fromPrefix || !toPrefix) {
    return null;
  }

  return {
    ok: true,
    kind: 'si-prefix',
    value,
    fromPrefixSymbol: fromPrefix.symbol,
    toPrefixSymbol: toPrefix.symbol,
    inputText: `${fromToken} to ${toToken}`,
    valueStrategy,
  };
}

function tryParseSiPrefixesWithoutConnector(
  normalized: string,
  value: number,
  valueStrategy: ValueStrategy,
): SiPrefixParseSuccess | null {
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token && !CONNECTOR_WORDS.has(token.toLowerCase()));
  if (tokens.length < 2) {
    return null;
  }

  for (let i = 1; i < tokens.length; i += 1) {
    const fromToken = tokens.slice(0, i).join(' ');
    const toToken = tokens.slice(i).join(' ');
    const result = tryParseSiPrefixes(fromToken, toToken, value || 1, valueStrategy);
    if (result) {
      return {
        ...result,
        inputText: normalized,
        value: Number.isFinite(value) ? value : 1,
        valueStrategy,
      };
    }
  }

  return null;
}

function tryParseSingleUnitQuery(
  normalized: string,
  value: number,
  hasExplicitValue: boolean,
  index: AliasIndex,
): UnitParseSuccess | null {
  if (!normalized) {
    return null;
  }

  const sanitized = normalized.replace(CONNECTOR_GLOBAL_REGEX, ' ').trim();
  if (!sanitized) {
    return null;
  }

  const alias = resolveAlias(index, sanitized);
  if (!alias) {
    return null;
  }

  const units = ((unitData[alias.category]?.units ?? []) as Unit[]).map((unit) => unit.symbol);
  const defaultPair = getCategoryDefaultPair(alias.category);
  const candidateTargets: string[] = [];

  const specificTargets = UNIT_SPECIFIC_TARGETS[alias.symbol];
  if (specificTargets) {
    specificTargets.forEach((target) => candidateTargets.push(target));
  }

  if (defaultPair) {
    candidateTargets.push(defaultPair.toUnit);
    candidateTargets.push(defaultPair.fromUnit);
  }

  units
    .filter((symbol) => symbol !== alias.symbol)
    .forEach((symbol) => candidateTargets.push(symbol));

  const toUnit =
    candidateTargets.find((symbol) => symbol && symbol !== alias.symbol) ??
    alias.symbol;

  return {
    ok: true,
    kind: 'unit',
    value: hasExplicitValue ? value : 1,
    fromUnit: alias.symbol,
    toUnit,
    category: alias.category,
    valueStrategy: hasExplicitValue ? 'explicit' : 'preserve-existing',
  };
}

function tryParseCategoryQuery(normalized: string): CategoryParseSuccess | null {
  const aliasMap = getCategoryAliasMap();
  const stripped = normalized
    .replace(/\b(conversions?|conversion|converter|unit|units)\b/gi, ' ')
    .replace(CONNECTOR_GLOBAL_REGEX, ' ')
    .trim();
  if (!stripped) {
    return null;
  }
  const key = stripped.toLowerCase();
  const match = aliasMap.get(key);
  if (!match) {
    return null;
  }
  return {
    ok: true,
    kind: 'category',
    category: match,
  };
}

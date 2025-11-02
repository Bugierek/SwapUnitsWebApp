'use client';

import { unitData, getUnitsForCategoryAndMode } from '@/lib/unit-data';
import type { UnitCategory, Unit, UnitData } from '@/types';

type AliasEntry = {
  symbol: string;
  category: UnitCategory;
};

type AliasIndex = Map<string, AliasEntry[]>;

type ParseSuccess = {
  ok: true;
  value: number;
  fromUnit: string;
  toUnit: string;
  category: UnitCategory;
};

type ParseFailure = {
  ok: false;
  error: string;
  suggestions?: string[];
};

export type ParseResult = ParseSuccess | ParseFailure;

const CONNECTOR_REGEX = /\b(to|into|in)\b/;
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

const EXTRA_UNIT_SYNONYMS: Record<string, string[]> = {
  kg: ['kilogram', 'kilograms', 'kilo', 'kilos'],
  g: ['gram', 'grams'],
  mg: ['milligram', 'milligrams'],
  lb: ['pound', 'pounds'],
  oz: ['ounce', 'ounces'],
  mi: ['mile', 'miles'],
  ft: ['foot', 'feet'],
  in: ['inch', 'inches'],
  km: ['kilometer', 'kilometers', 'kilometre', 'kilometres'],
  m: ['meter', 'meters', 'metre', 'metres'],
  cm: ['centimeter', 'centimeters', 'centimetre', 'centimetres'],
  mm: ['millimeter', 'millimeters', 'millimetre', 'millimetres'],
  L: ['liter', 'liters', 'litre', 'litres'],
  mL: ['milliliter', 'milliliters', 'millilitre', 'millilitres'],
  '°C': ['celsius', 'centigrade', 'c', 'deg c', 'degc', 'c deg', 'c-degree'],
  '°F': ['fahrenheit', 'f', 'deg f', 'degf', 'f deg', 'f-degree'],
  'm/s': ['meter per second', 'meters per second', 'metre per second', 'metres per second'],
  'km/h': ['kilometer per hour', 'kilometers per hour', 'kilometre per hour', 'kilometres per hour'],
  'mph': ['mile per hour', 'miles per hour'],
  'BTU': ['british thermal unit', 'british thermal units'],
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

function getAliasIndex(): AliasIndex {
  if (!cachedAliasIndex) {
    cachedAliasIndex = buildAliasIndex();
  }
  return cachedAliasIndex;
}

export function parseConversionQuery(rawQuery: string): ParseResult {
  if (!rawQuery || !rawQuery.trim()) {
    return { ok: false, error: 'Empty query' };
  }

  let normalized = normalizeQuery(rawQuery);

  const valueMatch = normalized.match(
    /^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i,
  );

  let value = 1;
  if (valueMatch) {
    value = normalizeNumberToken(valueMatch[1]);
    normalized = normalized.slice(valueMatch[0].length).trim();
  }

  const connectorMatch = CONNECTOR_REGEX.exec(normalized);
  if (!connectorMatch || connectorMatch.index === undefined) {
    return { ok: false, error: 'Could not find connector (to/in)' };
  }

  const fromPart = normalized.slice(0, connectorMatch.index).trim();
  const toPart = normalized
    .slice(connectorMatch.index + connectorMatch[0].length)
    .trim();

  if (!fromPart || !toPart) {
    return { ok: false, error: 'Missing unit information' };
  }

  const index = getAliasIndex();

  const fromAlias = resolveAlias(index, fromPart);
  if (!fromAlias) {
    return {
      ok: false,
      error: `Unrecognized unit "${fromPart}"`,
      suggestions: suggestAliases(index, fromPart),
    };
  }

  const toAlias = resolveAlias(index, toPart);
  if (!toAlias) {
    return {
      ok: false,
      error: `Unrecognized unit "${toPart}"`,
      suggestions: suggestAliases(index, toPart),
    };
  }

  if (fromAlias.category !== toAlias.category) {
    return {
      ok: false,
      error: `Units do not share a category (${fromAlias.category} vs ${toAlias.category})`,
    };
  }

  return {
    ok: true,
    value,
    fromUnit: fromAlias.symbol,
    toUnit: toAlias.symbol,
    category: fromAlias.category,
  };
}

function normalizeQuery(query: string): string {
  let result = query
    .replace(/[,]/g, '') // remove thousand separators
    .replace(/[\u2192\u2794]/g, ' to ') // arrows
    .replace(/=>|->|=/g, ' to ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

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

function suggestAliases(index: AliasIndex, raw: string): string[] {
  const cleaned = normalizeAlias(raw);
  const suggestions: string[] = [];
  for (const key of index.keys()) {
    if (key.startsWith(cleaned.slice(0, 2))) {
      suggestions.push(key);
    }
    if (suggestions.length >= 5) break;
  }
  return suggestions;
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

  // allow aliases with hyphen / slash replacements
  [...aliases].forEach((alias) => {
    aliases.add(alias.replace(/-/g, ' '));
    aliases.add(alias.replace(/\s+/g, ' '));
  });

  return Array.from(aliases.values()).map((alias) => alias.trim());
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

import { unitData } from '@/lib/unit-data';
import type { UnitCategory, Unit, UnitData } from '@/types';
import { matchSiPrefixToken } from '@/lib/si-prefixes';
import { getCategoryDefaultPair } from '@/lib/category-defaults';
import { CATEGORY_KEYWORDS } from '@/lib/category-keywords';

export type AliasEntry = {
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

// A "to" / "in" written against one of these characters is part of a unit symbol, not the
// connector: "lbf·in", "lb-in", "in-lb", "lb/in³", "in²", "in³". (\b alone treats all of them as
// word boundaries, which is what used to turn "5 in² to cm²" into "5 in | ² to cm²".)
// The combobox uses findConnectorMatches / stripConnectorWords too, so both finders agree.
const CONNECTOR_GLUE_BEFORE = new Set(['·', '-', '/']);
const CONNECTOR_GLUE_AFTER = new Set(['·', '-', '²', '³']);

const isGluedConnector = (text: string, index: number, length: number): boolean =>
  CONNECTOR_GLUE_BEFORE.has(text[index - 1] ?? '') ||
  CONNECTOR_GLUE_AFTER.has(text[index + length] ?? '');

/** The "to" / "into" / "in" connector words in `text`, skipping ones that belong to a unit symbol. */
export function findConnectorMatches(text: string): Array<{ index: number; word: string }> {
  const matches: Array<{ index: number; word: string }> = [];
  for (const match of text.matchAll(CONNECTOR_GLOBAL_REGEX)) {
    const index = match.index ?? -1;
    if (index < 0 || isGluedConnector(text, index, match[0].length)) continue;
    matches.push({ index, word: match[0] });
  }
  return matches;
}

/** `text` with its connector words replaced by spaces; "in" inside a symbol ("lbf·in", "in²") is kept. */
export function stripConnectorWords(text: string): string {
  return text.replace(CONNECTOR_GLOBAL_REGEX, (word: string, _connector: string, offset: number, whole: string) =>
    isGluedConnector(whole, offset, word.length) ? word : ' ',
  );
}

// Notations that only mean their unit typed in exactly this case, because the lowercase form is
// already another unit: "Mb/s" is megabits per second, while "MB/s" (and the all-lowercase
// "mb/s", which keeps its old meaning) is megabytes; "Cal" (food Calorie) is a kilocalorie, while
// "cal" is the small calorie. b = bit and B = byte (IEC 80000-13). Derived from the notations in
// unit-data.ts (see getNotationAliases), so a new clash is covered without editing this.
let cachedCaseExactNotationRules: Array<[RegExp, string]> | null = null;

function getCaseExactNotationRules(): Array<[RegExp, string]> {
  if (!cachedCaseExactNotationRules) {
    cachedCaseExactNotationRules = getNotationAliases()
      .filter((notation) => notation.exactCase)
      .map((notation) => [
        new RegExp(`(^|[\\s\\d.,(])${escapeRegex(notation.text)}(?=$|[\\s,;)])`, 'g'),
        `$1${notation.symbol}`,
      ]);
  }
  return cachedCaseExactNotationRules;
}

/** Rewrites the case-sensitive notations above to their unit symbol. Used by both finders. */
export function rewriteCaseExactNotations(text: string): string {
  return getCaseExactNotationRules().reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text);
}

// Milli symbols typed in exactly this case, whose lowercase form is a mega unit the site lists
// ("mJ" -> "mj" -> MJ). There's no millijoule or millipascal unit, so rather than read them as
// megajoules / megapascals (10^9 too large) the finder says so. All-lowercase "mj" / "mpa" keep
// meaning MJ / MPa. (Milliwatts are a unit; "mW" vs "MW" is resolved by exact case.)
const UNLISTED_EXACT_SYMBOLS: Array<[string, string]> = [
  ['mJ', 'mJ means millijoules, which SwapUnits doesn\'t list yet (MJ is megajoules).'],
  ['mPa', 'mPa means millipascals, which SwapUnits doesn\'t list yet (MPa is megapascals).'],
];

/** The message for an unlisted milli symbol in `text` ("5 mJ to J"), or null. */
export function findUnlistedExactSymbol(text: string): string | null {
  for (const [symbol, message] of UNLISTED_EXACT_SYMBOLS) {
    if (new RegExp(`(^|[\\s\\d.,(])${escapeRegex(symbol)}(?=$|[\\s,;)])`).test(text)) {
      return message;
    }
  }
  return null;
}

// "m2" -> "m²", "ft^3" -> "ft³", but not the "e2" / "e3" of scientific notation ("1e3 g", "2.5e2"),
// which used to become "1e³" and stop the query from parsing. A replace callback instead of a
// lookbehind, which Safari < 16.4 can't parse.
const isExponentMarker = (letters: string, offset: number, whole: string): boolean =>
  letters.toLowerCase() === 'e' && /[\d.]/.test(whole[offset - 1] ?? '');

/** Turns "m2"/"m^2" into "m²" and "m3"/"m^3" into "m³". Used by both finders. */
export function toSuperscriptPowers(text: string): string {
  return text
    .replace(/([a-z]+)\^?2(?=\s|$|[^0-9])/gi, (match: string, letters: string, offset: number, whole: string) =>
      isExponentMarker(letters, offset, whole) ? match : `${letters}²`,
    )
    .replace(/([a-z]+)\^?3(?=\s|$|[^0-9])/gi, (match: string, letters: string, offset: number, whole: string) =>
      isExponentMarker(letters, offset, whole) ? match : `${letters}³`,
    );
}

/**
 * Spaces out connector words glued to numbers or symbols ("5mto ft" -> "5m to ft") without
 * splitting a unit symbol that contains "in" ("lbf·in", "in-lb", "in²", "lb/in³"). Shared by the
 * parser's normalizeQuery and the combobox's normalizeInput.
 */
export function spaceConnectorWords(text: string): string {
  return text.replace(
    /(^|[^a-zA-Z°µμ·\-/])(to|into|in)(?=$|[^a-zA-Z°µμ·\-²³])/gi,
    '$1 $2 ',
  );
}
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
  'MPG (US)': ['mpg', 'mpg us', 'mpg (us)', 'mpg-us', 'mpgus'],
  'MPG (UK)': ['mpg uk', 'mpg(uk)', 'mpg-uk', 'imperial mpg', 'uk mpg', 'mpg'],
  USD: ['usd', 'us dollar', 'us dollars', 'dollar', 'dollars'],
  EUR: ['eur', 'euro', 'euros'],
  GBP: ['gbp', 'pound', 'pounds', 'british pound', 'sterling'],
  CHF: ['chf', 'swiss franc', 'swiss francs'],
  JPY: ['jpy', 'yen', 'japanese yen'],
  PLN: ['pln', 'zloty', 'złoty', 'zł'],
  CAD: ['cad', 'canadian dollar', 'canadian dollars'],
  AUD: ['aud', 'australian dollar', 'australian dollars'],
  NZD: ['nzd', 'new zealand dollar', 'new zealand dollars'],
  SEK: ['sek', 'swedish krona', 'swedish kronor'],
  NOK: ['nok', 'norwegian krone', 'norwegian kroner'],
  DKK: ['dkk', 'danish krone', 'danish kroner'],
  kg: ['kilogram', 'kilograms', 'kilo', 'kilos'],
  g: ['gram', 'grams'],
  mg: ['milligram', 'milligrams'],
  lb: ['pound', 'pounds', 'lbs'],
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
  s: ['sec', 'secs'],
  h: ['hr', 'hrs'],
  a: ['yr', 'yrs'],
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
  // Mass. No "us ..." aliases: a standalone "us" is read as microseconds (µs).
  'ton (UK)': ['uk ton', 'uk tons', 'imperial ton', 'imperial tons'],
  // Volume. Plain "fluid ounce" / "pint" / "gallon" mean the US units; the imperial ones are
  // named "Imperial ..." (see unit-data.ts) so they don't share those aliases.
  'in³': ['cubic inch', 'cubic inches', 'in3', 'cu in'],
  'yd³': ['cubic yard', 'cubic yards', 'yd3', 'cu yd'],
  tsp: ['teaspoon', 'teaspoons'],
  tbsp: ['tablespoon', 'tablespoons', 'tbs'],
  'fl oz': ['floz', 'fl. oz', 'fluid ounce', 'fluid ounces'],
  cup: ['cup', 'cups'],
  pt: ['pint', 'pints'],
  qt: ['quart', 'quarts'],
  'fl oz (UK)': ['uk fl oz', 'fl oz uk', 'imperial fl oz', 'uk fluid ounce', 'uk fluid ounces'],
  'pt (UK)': ['uk pint', 'uk pints', 'pint uk', 'pt uk'],
  'gal (UK)': ['uk gallon', 'uk gallons', 'gallon uk', 'gal uk'],
  // Pressure
  mmHg: ['mm hg', 'millimeters of mercury', 'millimetres of mercury', 'millimetre of mercury'],
  inHg: ['in hg', 'inches of mercury'],
  hPa: ['hectopascals'],
  mbar: ['millibars'],
  // Energy
  Wh: ['watt hour', 'watt hours', 'watt-hour', 'watt-hours'],
  eV: ['electron volt', 'electron volts', 'electron-volt', 'electron-volts'],
  thm: ['therm', 'therms'],
  // Speed
  'ft/s': ['foot per second', 'feet per second'],
  // Power
  hp: ['horsepower', 'bhp', 'mechanical horsepower'],
  PS: ['metric horsepower', 'metric hp', 'cv'],
  'BTU/h': ['btu per hour', 'btu/hr', 'btuh', 'btu/hour'],
  // Force
  kgf: ['kilogram force', 'kilograms-force', 'kilopond', 'kp'],
  lbf: ['pound force', 'pounds force', 'pounds-force', 'lb force'],
  // Torque. Written forms people actually use for the same unit ("Nm", "lb-ft", "ft-lbs",
  // "in-lb", "kgm"); hyphen forms also get a spaced variant automatically.
  'N·m': ['nm', 'n m', 'n-m', 'n.m', 'newton meter', 'newton meters', 'newton metre', 'newton metres', 'newton-meter', 'newton-meters', 'newton-metre', 'newton-metres'],
  'N·cm': ['ncm', 'n cm', 'n-cm', 'newton centimeter', 'newton centimeters', 'newton centimetre', 'newton centimetres'],
  'kgf·m': ['kgm', 'kg m', 'kg-m', 'kgf m', 'kgf-m'],
  'kgf·cm': ['kgcm', 'kg cm', 'kg-cm', 'kgf cm', 'kgf-cm'],
  'lbf·ft': [
    'lb ft', 'lb-ft', 'lbft', 'lbs ft', 'lb·ft', 'lbf ft', 'lbf-ft',
    'ft lb', 'ft-lb', 'ftlb', 'ft lbs', 'ft-lbs', 'ft·lb', 'ft lbf', 'ft-lbf', 'ft·lbf',
    'foot pound', 'foot pounds', 'foot-pound', 'foot-pounds', 'pound foot', 'pound feet', 'pound-foot', 'pound-feet', 'pound-force feet',
  ],
  'lbf·in': [
    'lb in', 'lb-in', 'lbin', 'lbs in', 'lb·in', 'lbf in', 'lbf-in',
    'in lb', 'in-lb', 'inlb', 'in lbs', 'in-lbs', 'in·lb', 'in lbf', 'in-lbf', 'in·lbf',
    'inch pound', 'inch pounds', 'inch-pound', 'inch-pounds', 'pound inch', 'pound inches', 'pound-inch', 'pound-inches', 'pound-force inches',
  ],
  'ozf·in': ['oz in', 'oz-in', 'ozin', 'oz·in', 'ozf in', 'ozf-in', 'in oz', 'in-oz', 'inch ounce', 'inch ounces', 'ounce inch', 'ounce inches', 'ounce-inch', 'ounce-inches'],
  // Density
  'kg/m³': ['kg per m³', 'kilograms per cubic meter', 'kilograms per cubic metre', 'kilogram per cubic metre'],
  'g/cm³': ['g/cc', 'g per cm³', 'grams per cubic centimeter', 'grams per cubic centimetre', 'gram per cubic centimetre'],
  'g/mL': ['g per ml', 'grams per milliliter', 'grams per millilitre', 'gram per millilitre'],
  'kg/L': ['kg per l', 'kilograms per liter', 'kilograms per litre', 'kilogram per litre'],
  'g/L': ['g per l', 'grams per liter', 'grams per litre', 'gram per litre'],
  'lb/ft³': ['lb per ft³', 'lbs/ft³', 'lb/cu ft', 'pcf', 'pounds per cubic foot'],
  'lb/in³': ['lb per in³', 'lbs/in³', 'pounds per cubic inch'],
  'lb/gal': ['lb per gal', 'lbs/gal', 'pounds per gallon'],
};

const UNIT_SPECIFIC_TARGETS: Record<string, string[]> = {
  'Wh/km': ['Wh/mi', 'mi/kWh'],
  'Wh/mi': ['Wh/km', 'km/kWh'],
  'kWh/100mi': ['mi/kWh', 'kWh/100km'],
  'kWh/100km': ['km/kWh', 'kWh/100mi'],
  'L/100km': ['L/100mi', 'MPG (US)', 'MPG (UK)', 'km/L'],
  'L/100mi': ['L/100km', 'MPG (US)', 'MPG (UK)', 'km/L'],
  'MPG (US)': ['L/100km', 'km/L'],
  'MPG (UK)': ['L/100km', 'km/L'],
  // MPGe equals MPG (US) numerically, so default a bare "100 mpge" to EPA's companion EV metric.
  'MPGe': ['kWh/100mi', 'kWh/100km', 'mi/kWh'],
  // Units added in the missing-units step: a bare "3 cups" or "150 hp" goes to the unit people
  // usually want it in.
  st: ['kg'],
  'ton (US)': ['t'],
  'ton (UK)': ['t'],
  'in³': ['cm³'],
  'yd³': ['m³'],
  tsp: ['mL'],
  tbsp: ['mL'],
  'fl oz': ['mL'],
  cup: ['mL'],
  pt: ['mL'],
  qt: ['L'],
  'fl oz (UK)': ['mL'],
  'pt (UK)': ['mL'],
  'gal (UK)': ['L'],
  hPa: ['inHg'],
  mbar: ['inHg'],
  inHg: ['hPa'],
  mmHg: ['kPa'],
  Torr: ['Pa'],
  MPa: ['psi'],
  Wh: ['J'],
  MJ: ['kWh'],
  eV: ['J'],
  thm: ['kWh'],
  'ft/s': ['m/s'],
  KiB: ['KB'],
  MiB: ['MB'],
  GiB: ['GB'],
  TiB: ['TB'],
  mW: ['W'],
  hp: ['kW'],
  PS: ['kW', 'hp'],
  'BTU/h': ['W'],
  N: ['lbf'],
  kN: ['lbf'],
  lbf: ['N'],
  kgf: ['N'],
  kip: ['kN'],
  dyn: ['N'],
  'N·m': ['lbf·ft'],
  'N·cm': ['lbf·in'],
  'lbf·ft': ['N·m'],
  'lbf·in': ['N·m'],
  'kgf·m': ['N·m'],
  'kgf·cm': ['N·m'],
  'ozf·in': ['N·cm'],
  'kg/m³': ['g/cm³'],
  'lb/ft³': ['kg/m³'],
  'lb/in³': ['g/cm³'],
  'lb/gal': ['kg/L'],
  'kg/L': ['lb/gal'],
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

type CompoundStep = { symbol: string; token: string };
type CompoundChainDef = { category: UnitCategory; steps: CompoundStep[]; requiredSteps: number };

const COMPOUND_NUMBER_TOKEN = '-?\\d+(?:\\.\\d+)?';

// Mixed-unit input, e.g. "5 ft 7 in" or "1 h 32 min 15 sec". Deliberately abbreviation-only
// (no "feet"/"inches"/"hours" word forms) to keep the grammar small and unambiguous - each
// chain must match a contiguous prefix starting from its largest unit, in order.
const COMPOUND_CHAINS: CompoundChainDef[] = [
  {
    category: 'Length' as UnitCategory,
    steps: [
      { symbol: 'ft', token: 'ft' },
      { symbol: 'in', token: 'in' },
    ],
    requiredSteps: 2,
  },
  {
    category: 'Mass' as UnitCategory,
    steps: [
      { symbol: 'lb', token: 'lb' },
      { symbol: 'oz', token: 'oz' },
    ],
    requiredSteps: 2,
  },
  {
    category: 'Time' as UnitCategory,
    steps: [
      { symbol: 'h', token: 'h' },
      { symbol: 'min', token: 'min' },
      { symbol: 's', token: 'sec' },
    ],
    requiredSteps: 2,
  },
];

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

// Used by the finder UI to let a compound-shaped query ("5 ft 7 in") win over an
// autocomplete suggestion that happens to match one of its tokens by prefix (e.g. "ft to cm").
// Deliberately shape-only (matchAnyCompoundShape, not tryParseCompoundQuantity) - a compound
// value with an invalid explicit target ("5 ft 7 in to m2") must still win here, so the caller
// gets a chance to show the real "bad target" error instead of silently falling back to an
// unrelated auto-highlighted suggestion.
export function isCompoundQuantityQuery(rawQuery: string): boolean {
  return matchAnyCompoundShape(rawQuery) !== null;
}

export function parseConversionQuery(rawQuery: string): ParseResult {
  if (!rawQuery || !rawQuery.trim()) {
    return { ok: false, error: 'Empty query' };
  }

  const unlistedSymbol = findUnlistedExactSymbol(rawQuery);
  if (unlistedSymbol) {
    return { ok: false, error: unlistedSymbol };
  }

  // Compound detection runs on the raw string, before normalizeQuery's cubic/square-unit
  // shorthand pass ("ft3" -> "ft³") gets a chance to eat an unspaced inches/oz/sec value
  // that happens to be exactly 2 or 3 (e.g. "5ft3in" would otherwise become "5ft³in").
  const rawCompoundResult = tryParseCompoundQuantity(rawQuery);
  if (rawCompoundResult) {
    return rawCompoundResult;
  }

  let normalized = normalizeQuery(rawQuery);
  normalized = normalized
    .replace(/\/\s+([a-zA-Z°µμ])/g, '/$1')
    .replace(/([a-zA-Z°µμ])\s+\/\s+(\d)/g, '$1/$2');
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

  const fuelFallback = tryParseFuelEconomyQuery(normalized, value, defaultValueStrategy);
  if (fuelFallback) {
    return fuelFallback;
  }

  const connectorMatches = findConnectorMatches(normalized);

  const index = getAliasIndex();

  if (connectorMatches.length > 0) {
    for (const connectorMatch of connectorMatches) {
      const matchIndex = connectorMatch.index;

      const fromPart = normalized.slice(0, matchIndex).trim();
      const toPart = normalized
        .slice(matchIndex + connectorMatch.word.length)
        .trim();

      if (!fromPart || !toPart) {
        continue;
      }

      let fromAlias = resolveAlias(index, fromPart);
      if (!fromAlias) {
        fromAlias = resolveFuelEconomyShorthand(fromPart);
      }
      if (!fromAlias) {
        continue;
      }

      let toAlias = resolveAlias(index, toPart);
      if (!toAlias) {
        toAlias = resolveFuelEconomyShorthand(toPart);
      }
      if (!toAlias) {
        continue;
      }

      // With the "si" directive, a prefix pair ("si micro to milli") goes to tryParseSiPrefixes below
      // like "si kilo to milli" does, instead of returning as an ordinary unit pair.
      const isSiPrefixPair = hasSiDirective && fromAlias.category === 'SI Prefixes';
      if (fromAlias && toAlias && fromAlias.category === toAlias.category && !isSiPrefixPair) {
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

    // Second pass: a side whose text fits several units ("pounds" = GBP or lb, "kn" = knot or
    // kN, "nm" = nanometer or N·m) takes the reading that shares a category with the other side,
    // so "10 pounds to kg" and "100 kn to lbf" work. Only reached when no split worked with each
    // side's default reading, so anything the first pass parses is unchanged.
    if (!hasSiDirective) {
      for (const connectorMatch of connectorMatches) {
        const fromPart = normalized.slice(0, connectorMatch.index).trim();
        const toPart = normalized.slice(connectorMatch.index + connectorMatch.word.length).trim();
        if (!fromPart || !toPart) continue;

        const fromCandidates = resolveAliasCandidatesWithShorthand(index, fromPart);
        const toCandidates = resolveAliasCandidatesWithShorthand(index, toPart);
        for (const fromCandidate of fromCandidates) {
          if (fromCandidate.category === 'SI Prefixes') continue;
          const toCandidate = toCandidates.find((candidate) => candidate.category === fromCandidate.category);
          if (toCandidate) {
            return {
              ok: true,
              kind: 'unit',
              value,
              fromUnit: fromCandidate.symbol,
              toUnit: toCandidate.symbol,
              category: fromCandidate.category,
              valueStrategy: defaultValueStrategy,
            };
          }
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
  let result = rewriteCaseExactNotations(
    query
      .replace(/[,]/g, '') // remove thousand separators
      .replace(/[\u2192\u2794]/g, ' to ') // arrows
      .replace(/=>|->|=/g, ' to '),
  );

  // Convert ASCII "u" prefix to proper micro symbol "µ" for common micro- units
  // Only convert when "u" is followed by a single letter AND that's the end of the unit token
  // This handles: "100um", "50 us", "um" but NOT "usd", "user", etc.
  // Same letter set as the combobox's normalizeInput (micro units: um, us, ug, ul, ua), so a word
  // like "uk" in "uk pint" or "fl oz uk" isn't turned into "µk". Not before "dollar(s)": "us dollar"
  // is the currency (it used to become "µs dollar" and fail). Negative lookahead is fine in old
  // Safari (only lookbehind isn't).
  result = result.replace(/(^|\s)u([mgsal])(?=\s|$)(?!\s+dollars?\b)/gi, '$1µ$2'); // standalone "um", "us"
  result = result.replace(/([0-9.,]+\s*)u([mgsal])(?=\s|$)(?!\s+dollars?\b)/gi, '$1µ$2'); // "100um", "5 us"

  // Convert common squared abbreviations: sqm, sqft, sqkm, etc. → m², ft², km²
  // Handles: "sqm", "100sqm", "100 sqm", "sqft", "sq ft", "sq km"
  result = result.replace(/(^|[\s\d])sq\s*m\b/gi, '$1m²');
  result = result.replace(/(^|[\s\d])sq\s*km\b/gi, '$1km²');
  result = result.replace(/(^|[\s\d])sq\s*cm\b/gi, '$1cm²');
  result = result.replace(/(^|[\s\d])sq\s*mm\b/gi, '$1mm²');
  result = result.replace(/(^|[\s\d])sq\s*ft\b/gi, '$1ft²');
  result = result.replace(/(^|[\s\d])sq\s*in\b/gi, '$1in²');
  result = result.replace(/(^|[\s\d])sq\s*yd\b/gi, '$1yd²');
  result = result.replace(/(^|[\s\d])sq\s*mi\b/gi, '$1mi²');

  // Convert common cubed abbreviations: cum, cuft, etc. → m³, ft³
  // Handles: "cum", "100cum", "100 cum", "cuft", "cu ft", "cu m"
  result = result.replace(/(^|[\s\d])cu\s*m\b/gi, '$1m³');
  result = result.replace(/(^|[\s\d])cu\s*cm\b/gi, '$1cm³');
  result = result.replace(/(^|[\s\d])cu\s*mm\b/gi, '$1mm³');
  result = result.replace(/(^|[\s\d])cu\s*ft\b/gi, '$1ft³');
  result = result.replace(/(^|[\s\d])cu\s*in\b/gi, '$1in³');
  result = result.replace(/(^|[\s\d])cu\s*yd\b/gi, '$1yd³');

  // Squared / cubed notation: "m2", "m^2", "100m2", "50 ft3", "cm^3" (not "1e3", see the helper)
  result = toSuperscriptPowers(result);

  result = spaceConnectorWords(result);

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

  // Re-join "per 100 km/mi" units that the digit/letter spacing above splits apart
  // ("kwh/100mi" -> "kwh/100 mi"), so L/100km, L/100mi, kWh/100km and kWh/100mi stay single
  // tokens. Mirrors the combobox normalizer's rejoin step, narrowed to the only units of this shape.
  result = result.replace(/\/\s*(\d+)\s+(km|mi)\b/gi, '/$1$2');

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

function resolveFuelEconomyShorthand(raw: string): AliasEntry | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;

  const mpgUsVariants = new Set(['mpg us', 'mpg (us)', 'mpg-us', 'mpgus']);
  const mpgUkVariants = new Set([
    'mpg uk',
    'mpg(uk)',
    'mpg-uk',
    'imperial mpg',
    'uk mpg',
    'mpg imperial',
  ]);

  if (mpgUsVariants.has(normalized)) {
    return { symbol: 'MPG (US)', category: 'Fuel Economy' as UnitCategory };
  }
  if (mpgUkVariants.has(normalized)) {
    return { symbol: 'MPG (UK)', category: 'Fuel Economy' as UnitCategory };
  }
  return null;
}

type CaseExactForm = AliasEntry & {
  /** True when the clash is with another unit, not only with an SI prefix (N vs the prefix n). */
  clashesWithUnit: boolean;
};

let cachedCaseExactForms: Map<string, CaseExactForm> | null = null;

// The alias index is lowercase, so a few symbols collide with another unit's alias: kN vs knot
// (kn), PS vs picosecond (ps), Nm (N·m without the dot) vs nanometer (nm), N vs the nano prefix
// (n). Typed with exactly the symbol's case, each of these means its own unit. Built from the
// data, so a future clash is covered without editing this list.
function getCaseExactForms(): Map<string, CaseExactForm> {
  if (cachedCaseExactForms) {
    return cachedCaseExactForms;
  }

  const index = getAliasIndex();
  const map = new Map<string, CaseExactForm>();
  (Object.entries(unitData) as [UnitCategory, UnitData][]).forEach(([category, data]) => {
    if (category === 'SI Prefixes') return;
    ((data.units ?? []) as Unit[]).forEach((unit) => {
      new Set([unit.symbol, unit.symbol.replace(/·/g, '')]).forEach((form) => {
        const others = (index.get(form.toLowerCase()) ?? []).filter(
          (entry) => entry.symbol !== unit.symbol || entry.category !== category,
        );
        if (others.length === 0 || map.has(form)) return;
        map.set(form, {
          symbol: unit.symbol,
          category,
          clashesWithUnit: others.some((entry) => entry.category !== 'SI Prefixes'),
        });
      });
    });
  });

  cachedCaseExactForms = map;
  return map;
}

/**
 * The unit whose symbol is exactly `token`, case included, when that symbol clashes with another
 * unit's alias once lowercased ("kN" -> kilonewton, "kn" -> knot, "PS", "Nm"). Null for anything
 * else. The finder list uses it to put the exact-case unit's pairs first.
 */
export function getCaseExactUnitMatch(token: string): AliasEntry | null {
  const form = getCaseExactForms().get(token.trim());
  return form && form.clashesWithUnit ? { symbol: form.symbol, category: form.category } : null;
}

/**
 * The unit the parser reads `text` as by default ("mpg" -> MPG (US), "fl oz" -> US fluid ounce),
 * or null. The finder list puts that unit first within its category, so the list and the parser
 * agree on what a bare unit name means.
 */
export function resolveUnitText(text: string): AliasEntry | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return resolveAlias(getAliasIndex(), trimmed) ?? resolveFuelEconomyShorthand(trimmed);
}

/**
 * Every unit `text` can mean as a whole, the default first: a symbol, name, alias or notation
 * ("pounds" -> GBP and lb, "N/mm²" -> MPa, "feet" -> ft). The finder list uses it so a unit typed
 * that way lists its pairs; partial text ("n/m") matches nothing here.
 */
export function resolveUnitCandidates(text: string): AliasEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return resolveAliasCandidatesWithShorthand(getAliasIndex(), trimmed);
}

/** Every unit `raw` can mean, the default first; an exact-case symbol ("kN") moves to the front. */
function resolveAliasCandidates(index: AliasIndex, raw: string): AliasEntry[] {
  const direct = index.get(normalizeAlias(raw)) ?? [];
  const candidates: AliasEntry[] = [];
  direct.forEach((entry) => {
    if (!candidates.some((c) => c.symbol === entry.symbol && c.category === entry.category)) {
      candidates.push(entry);
    }
  });

  const exact = getCaseExactForms().get(raw.trim().replace(/^(from|of)\s+/i, ''));
  if (exact) {
    const position = candidates.findIndex(
      (c) => c.symbol === exact.symbol && c.category === exact.category,
    );
    if (position > 0) {
      candidates.unshift(...candidates.splice(position, 1));
    }
  }
  return candidates;
}

function resolveAliasCandidatesWithShorthand(index: AliasIndex, raw: string): AliasEntry[] {
  const candidates = resolveAliasCandidates(index, raw);
  const shorthand = resolveFuelEconomyShorthand(raw);
  if (shorthand && !candidates.some((c) => c.symbol === shorthand.symbol && c.category === shorthand.category)) {
    candidates.push(shorthand);
  }
  return candidates;
}

function resolveAlias(index: AliasIndex, raw: string): AliasEntry | null {
  return resolveAliasCandidates(index, raw)[0] ?? null;
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

function buildAliasIndex(includeNotations = true): AliasIndex {
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

  // Notations ("N/mm²", "cc", "kph") after every unit's own aliases. Exact-case ones aren't added:
  // their lowercase form means another unit, so they're rewritten to the symbol beforehand
  // (rewriteCaseExactNotations) instead.
  if (includeNotations) {
    getNotationAliases()
      .filter((notation) => !notation.exactCase)
      .forEach((notation) => {
        notationKeyboardForms(notation.text).forEach((form) => {
          expandAliasVariants(form.toLowerCase()).forEach((variant) => {
            addAlias(map, variant, notation.symbol, notation.category);
          });
        });
      });
  }

  return map;
}

type NotationAlias = { text: string; symbol: string; category: UnitCategory; exactCase: boolean };
let cachedNotationAliases: NotationAlias[] | null = null;

// The ways a notation is typed on a keyboard: "W·s" as "Ws", "W s", "W*s", "W.s", "W-s".
// Superscripts ("N/mm2", "N/mm^2") are handled by expandAliasVariants.
function notationKeyboardForms(text: string): string[] {
  if (!text.includes('·')) return [text];
  return ['·', '', ' ', '*', '.', '-'].map((joiner) => text.replace(/·/g, joiner));
}

/**
 * Every notation in unit-data.ts with its unit, and whether only its exact case means that unit:
 * set by hand (UnitNotation.exactCase) or because a lowercase keyboard form already means a
 * different unit ("Cal" vs cal, "Mb/s" vs MB/s, "Bps" vs bps).
 */
function getNotationAliases(): NotationAlias[] {
  if (cachedNotationAliases) {
    return cachedNotationAliases;
  }
  const baseIndex = buildAliasIndex(false);
  const notations: NotationAlias[] = [];
  (Object.entries(unitData) as [UnitCategory, UnitData][]).forEach(([category, data]) => {
    if (category === 'SI Prefixes') return;
    ((data.units ?? []) as Unit[]).forEach((unit) => {
      (unit.alsoWrittenAs ?? []).forEach((notation) => {
        const clashes = notationKeyboardForms(notation.text).some((form) =>
          (baseIndex.get(normalizeAlias(form)) ?? []).some(
            (entry) => entry.symbol !== unit.symbol || entry.category !== category,
          ),
        );
        notations.push({
          text: notation.text,
          symbol: unit.symbol,
          category,
          exactCase: Boolean(notation.exactCase) || clashes,
        });
      });
    });
  });
  cachedNotationAliases = notations;
  return notations;
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

export function escapeRegex(value: string): string {
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

function tryParseFuelEconomyQuery(
  normalized: string,
  value: number,
  valueStrategy: ValueStrategy,
): UnitParseSuccess | null {
  const search = normalized.toLowerCase();
  if (!/l\/100\s*km/.test(search)) {
    return null;
  }
  if (!/\bmpg\b/.test(search)) {
    return null;
  }

  // "mpg uk", "mpg (uk)" and also "uk mpg" / "imperial mpg" (the last two used to give US MPG).
  const mpgUnit =
    /\bmpg\s*(uk|imperial|\(uk\))/i.test(search) || /\b(uk|imperial)\s+mpg\b/i.test(search)
      ? 'MPG (UK)'
      : 'MPG (US)';
  // Respect the order the user typed: "30 mpg to l/100km" converts MPG -> L/100km (this used to
  // always return L/100km -> MPG, i.e. reversed for MPG-first queries).
  const mpgFirst = search.search(/\bmpg\b/) < search.search(/l\/100\s*km/);

  return {
    ok: true,
    kind: 'unit',
    value: Number.isFinite(value) ? value : 1,
    fromUnit: mpgFirst ? mpgUnit : 'L/100km',
    toUnit: mpgFirst ? 'L/100km' : mpgUnit,
    category: 'Fuel Economy' as UnitCategory,
    valueStrategy,
  };
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

  const sanitized = stripConnectorWords(normalized).trim();
  if (!sanitized) {
    return null;
  }

  // The unstripped text first, for aliases that contain a connector word ("in lb" = lbf·in).
  const alias =
    resolveAlias(index, normalized) ??
    resolveAlias(index, sanitized) ??
    resolveFuelEconomyShorthand(sanitized);
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

function getUnitFactor(category: UnitCategory, symbol: string): number | null {
  const unit = ((unitData[category]?.units ?? []) as Unit[]).find((u) => u.symbol === symbol);
  return unit ? unit.factor : null;
}

function getCategoryBaseUnitSymbol(category: UnitCategory): string | null {
  const units = (unitData[category]?.units ?? []) as Unit[];
  return units.find((u) => u.factor === 1)?.symbol ?? null;
}

// Resolves the target unit for a parsed compound quantity: an explicit trailing "to X" wins
// (must resolve to a unit in the same category, otherwise the whole compound parse is rejected
// rather than silently guessing a different target); with no explicit target, default to the
// category's base/SI unit - matches how someone reading "5 ft 7 in" or "2 lb 8 oz" expects a
// single authoritative conversion (meters, kilograms), not this parser's usual "interesting
// example pair" default used for plain single-unit browsing.
function resolveCompoundTarget(
  category: UnitCategory,
  collapseSymbol: string,
  remainder: string,
): string | null {
  const trailing = stripConnectorWords(remainder).trim();
  if (!trailing) {
    return getCategoryBaseUnitSymbol(category) ?? collapseSymbol;
  }

  const targetAlias = resolveAlias(getAliasIndex(), trailing);
  if (!targetAlias || targetAlias.category !== category) {
    return null;
  }
  return targetAlias.symbol;
}

function finalizeCompound(
  category: UnitCategory,
  collapseSymbol: string,
  collapsedValue: number,
  remainder: string,
): UnitParseSuccess | null {
  const toUnit = resolveCompoundTarget(category, collapseSymbol, remainder);
  if (!toUnit) return null;

  return {
    ok: true,
    kind: 'unit',
    value: collapsedValue,
    fromUnit: collapseSymbol,
    toUnit,
    category,
    valueStrategy: 'explicit',
  };
}

type CompoundShapeMatch = {
  category: UnitCategory;
  collapseSymbol: string;
  collapsedValue: number;
  remainder: string;
};

// Matches the VALUE shape only (e.g. "5 ft 7 in") - deliberately does not care whether the
// trailing remainder resolves to a valid same-category target. Kept separate from the full
// resolve so callers can tell "this text is a compound quantity, with a target problem" apart
// from "this text was never a compound quantity at all" - the two need different handling
// upstream (an honest error vs. silently deferring to normal single-unit/suggestion parsing).
function matchCompoundShape(normalized: string, chain: CompoundChainDef): CompoundShapeMatch | null {
  let rest = normalized;
  const parts: { symbol: string; amount: number }[] = [];

  for (const step of chain.steps) {
    // No \b here deliberately: a \b can't tell "unspaced adjacent digit" (5ft3in) from
    // "continuation of the same token" - it treats digits and letters as the same word
    // class. Matching the literal token directly and letting the *next* step's leading
    // number requirement do the real disambiguation is what makes "5ft3in" parse right.
    const stepRegex = new RegExp(`^(${COMPOUND_NUMBER_TOKEN})\\s*${escapeRegex(step.token)}`, 'i');
    const match = rest.match(stepRegex);
    if (!match) break;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) break;
    parts.push({ symbol: step.symbol, amount });
    rest = rest.slice(match[0].length).trim();
  }

  if (parts.length < chain.requiredSteps) {
    return null;
  }

  const collapseSymbol = chain.steps[0].symbol;
  const collapseFactor = getUnitFactor(chain.category, collapseSymbol);
  if (collapseFactor === null) return null;

  let totalBase = 0;
  for (const part of parts) {
    const factor = getUnitFactor(chain.category, part.symbol);
    if (factor === null) return null;
    totalBase += part.amount * factor;
  }

  return { category: chain.category, collapseSymbol, collapsedValue: totalBase / collapseFactor, remainder: rest };
}

// Feet/inches prime notation, e.g. 6' 2" - a distinct grammar from the word-token chains above
// (no "ft"/"in" text at all), so it carries no risk of colliding with the "in" connector word.
// Accepts straight quotes plus the common curly/typographic variants (e.g. iOS "smart quotes",
// or text pasted from a word processor) and the proper prime/double-prime symbols.
const FEET_MARK = `'’′`;
const INCH_MARK = `"”″`;
const COMPOUND_PRIME_REGEX = new RegExp(
  `^(${COMPOUND_NUMBER_TOKEN})\\s*[${FEET_MARK}]\\s*(${COMPOUND_NUMBER_TOKEN})\\s*[${INCH_MARK}]\\s*(.*)$`,
);

function matchPrimeShape(normalized: string): CompoundShapeMatch | null {
  const primeMatch = normalized.match(COMPOUND_PRIME_REGEX);
  if (!primeMatch) return null;
  const feet = Number(primeMatch[1]);
  const inches = Number(primeMatch[2]);
  const ftFactor = getUnitFactor('Length' as UnitCategory, 'ft');
  const inFactor = getUnitFactor('Length' as UnitCategory, 'in');
  if (!Number.isFinite(feet) || !Number.isFinite(inches) || !ftFactor || !inFactor) return null;
  const totalBase = feet * ftFactor + inches * inFactor;
  return {
    category: 'Length' as UnitCategory,
    collapseSymbol: 'ft',
    collapsedValue: totalBase / ftFactor,
    remainder: primeMatch[3],
  };
}

// Natural phrasing puts the compound quantity after a lead-in ("convert 5 ft 7 in to cm",
// "how much is 6' 2\" in meters") - strips only a leading STOP_WORDS phrase, nothing else, so
// this never touches the sq/cu/squared/cubed-notation hazard the rest of normalizeQuery has.
function stripLeadingStopWords(text: string): string {
  let result = text;
  let changed = true;
  while (changed) {
    changed = false;
    for (const stopWord of STOP_WORDS) {
      const stopRegex = new RegExp(`^\\s*${escapeRegex(stopWord)}\\b\\s*`, 'i');
      const match = result.match(stopRegex);
      if (match) {
        result = result.slice(match[0].length);
        changed = true;
        break;
      }
    }
  }
  return result;
}

function matchAnyCompoundShape(rawQuery: string): CompoundShapeMatch | null {
  if (!rawQuery || !rawQuery.trim()) return null;
  const stripped = stripLeadingStopWords(rawQuery.trim());
  const primeShape = matchPrimeShape(stripped);
  if (primeShape) return primeShape;
  for (const chain of COMPOUND_CHAINS) {
    const shape = matchCompoundShape(stripped, chain);
    if (shape) return shape;
  }
  return null;
}

function tryParseCompoundQuantity(rawQuery: string): UnitParseSuccess | null {
  const shape = matchAnyCompoundShape(rawQuery);
  if (!shape) return null;
  return finalizeCompound(shape.category, shape.collapseSymbol, shape.collapsedValue, shape.remainder);
}

function tryParseCategoryQuery(normalized: string): CategoryParseSuccess | null {
  const aliasMap = getCategoryAliasMap();
  const stripped = stripConnectorWords(
    normalized.replace(/\b(conversions?|conversion|converter|unit|units)\b/gi, ' '),
  ).trim();
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

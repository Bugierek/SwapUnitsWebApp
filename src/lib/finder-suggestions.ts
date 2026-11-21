// The finder's suggestion list: the items it can suggest (every unit pair and SI-prefix pair),
// how typed text is normalized, which items match it and in what order they're listed. Kept
// out of the combobox component so the same code can be tested and compared in Node.
import type { UnitCategory } from '@/types';
import {
  parseConversionQuery,
  findConnectorMatches,
  stripConnectorWords,
  spaceConnectorWords,
  rewriteCaseExactNotations,
  toSuperscriptPowers,
  getCaseExactUnitMatch,
  resolveUnitText,
  resolveUnitCandidates,
  findUnlistedExactSymbol,
  getAliasesForUnit,
  type AliasEntry,
} from '@/lib/conversion-query-parser';
import { categoryDisplayOrder, getUnitsForCategory, unitData } from '@/lib/unit-data';
import { ALL_SI_PREFIXES } from '@/lib/si-prefixes';
import { CATEGORY_KEYWORDS } from '@/lib/category-keywords';
import { buildConversionPairUrl } from '@/lib/conversion-pairs';

// Scientific notation: 1e5, 2.5e-3, etc.
// Negative numbers: Only valid for Temperature (parsed later with category context)
// Number tokens to strip when extracting unit text from a query. Digits that directly follow "/"
// belong to a unit (L/100km, kWh/100mi), so the replacer keeps those. A callback is used instead of
// a regex lookbehind, which older Safari (< 16.4) can't parse.
const NUMBER_TOKEN_RE = /[-+]?[\d.,]+(?:[eE][-+]?\d+)?/g;
const keepPer100Digits = (match: string, offset: number, whole: string) =>
  offset > 0 && whole[offset - 1] === '/' ? match : '';

// Prefix match on a unit symbol, also with the "·" of compound symbols left out, so "nm" finds
// N·m as well as nm and "kgfm" finds kgf·m. `text` is already lowercase.
const symbolStartsWith = (symbol: string, text: string): boolean => {
  const lower = symbol.toLowerCase();
  return lower.startsWith(text) || (lower.includes('·') && lower.replace(/·/g, '').startsWith(text));
};

// The first connector word with unit text before it: "kg to g" splits, "to kg" doesn't, and
// neither does "5 in lb" (5 inch-pounds). Uses the parser's rule, so the "in" of "lbf·in" or
// "in²" is never a connector.
const splitAtConnector = (text: string): { before: string; after: string } | null => {
  for (const { index, word } of findConnectorMatches(text)) {
    const before = text.slice(0, index);
    if (!before.replace(NUMBER_TOKEN_RE, '').trim()) continue;
    return { before, after: text.slice(index + word.length) };
  }
  return null;
};

export type ConversionComboboxItem = {
  value: string;
  category: UnitCategory;
  categoryLabel: string;
  fromSymbol: string;
  toSymbol: string;
  fromName: string;
  toName: string;
  label: string;
  keywords: string[];
  keywordsLower: string[];
  pairUrl: string;
  kind?: 'unit' | 'si-prefix';
  siPrefixMeta?: {
    fromSymbol: string;
    toSymbol: string;
  };
};

export const LETTER_REGEX = /[a-zA-Z°µμ]/;

export function normalizeFinderInput(value: string): string {
  // "Mb/s" -> "Mbps", "Mg" -> "t" etc. (case-sensitive notations, shared with the parser)
  const withArrowsNormalized = rewriteCaseExactNotations(value.replace(/(->|=>|→)/gi, ' to '));
  
  // Convert ASCII "u" prefix to proper micro symbol "µ" for micro- units
  // Only convert known micro units: um, us, ug, ul, ua, etc. (not just "u" alone)
  // This handles: "100um", "50 us" but NOT "505u", "usd"
  // Pattern: u followed by specific letters that are known micro units
  let withMicroConverted = withArrowsNormalized.replace(/(^|\s)u([mgsal])(?=\s|$)(?!\s+dollars?\b)/gi, '$1µ$2'); // um, us, ug, ua, ul
  withMicroConverted = withMicroConverted.replace(/([0-9.,]+\s*)u([mgsal])(?=\s|$)(?!\s+dollars?\b)/gi, '$1µ$2'); // 100um, 50us, etc.
  
  // Convert common squared abbreviations: sqm, sqft, sqkm, etc. → m², ft², km²
  // Handles: "sqm", "100sqm", "100 sqm", "sqft", "sq ft", "sq km"
  let withAreaAbbrevs = withMicroConverted.replace(/(^|[\s\d])sq\s*m\b/gi, '$1m²');
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])sq\s*km\b/gi, '$1km²');
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])sq\s*cm\b/gi, '$1cm²');
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])sq\s*mm\b/gi, '$1mm²');
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])sq\s*ft\b/gi, '$1ft²');
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])sq\s*in\b/gi, '$1in²');
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])sq\s*yd\b/gi, '$1yd²');
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])sq\s*mi\b/gi, '$1mi²');

  // Convert common cubed abbreviations: cum, cuft, etc. → m³, ft³
  // Handles: "cum", "100cum", "100 cum", "cuft", "cu ft", "cu m"
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])cu\s*m\b/gi, '$1m³');
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])cu\s*cm\b/gi, '$1cm³');
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])cu\s*mm\b/gi, '$1mm³');
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])cu\s*ft\b/gi, '$1ft³');
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])cu\s*in\b/gi, '$1in³');
  withAreaAbbrevs = withAreaAbbrevs.replace(/(^|[\s\d])cu\s*yd\b/gi, '$1yd³');
  
  // Squared / cubed notation: "m2", "m^2", "100m2", "50 ft3", "cm^3", but not the "e3" of
  // scientific notation ("1e3 g") - shared with the parser.
  const withSquaredConverted = toSuperscriptPowers(withAreaAbbrevs);
  
  const withConnectorsSpaced = spaceConnectorWords(withSquaredConverted);

  const withSpacing = withConnectorsSpaced
    .replace(/(\d)(?=[A-Za-z°µµ])/g, (match, digit: string, offset: number, original: string) => {
      const rest = original.slice(offset + 1);
      if (/^[eE][+-]?\d/.test(rest)) {
        return digit;
      }
      return `${digit} `;
    })
    .replace(/([A-Za-z°µµ])(?=\d)/g, (match, letter: string, offset: number, original: string) => {
      const rest = original.slice(offset + 1);
      if ((letter === 'e' || letter === 'E') && /^[+-]?\d/.test(rest)) {
        return letter;
      }
      return `${letter} `;
    });

  const rejoinedSlashUnits = withSpacing.replace(/\/\s*(\d+)\s+([A-Za-z°µµ]+)/g, '/$1$2');

  return rejoinedSlashUnits.replace(/\s+/g, ' ').trim();
}

// A same-unit pair ("1 t to Mg": tonne to megagram) never appears in the suggestion list, so its
// first item is always some other unit ("t to ton (UK)"). For these, Enter uses the parser.
export function isSameUnitPairQuery(query: string): boolean {
  const parsed = parseConversionQuery(normalizeFinderInput(query));
  return parsed.ok && parsed.kind === 'unit' && parsed.fromUnit === parsed.toUnit;
}

export function isPureNumericQuery(query: string): boolean {
  if (!query) return false;
  const withoutCommas = query.replace(/,/g, '').trim();
  if (!withoutCommas) {
    return false;
  }

  if (LETTER_REGEX.test(stripConnectorWords(withoutCommas))) {
    return false;
  }

  const compact = withoutCommas.replace(/\s+/g, '');
  return /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(compact);
}

/** Every suggestion, in category display order. Built once by the converter. */
export function buildFinderItems(): ConversionComboboxItem[] {
  const orderedCategories: UnitCategory[] = [
    ...categoryDisplayOrder,
    ...Object.keys(unitData).filter(
      (category) => !categoryDisplayOrder.includes(category as UnitCategory),
    ),
  ]
    .filter((category, index, arr) => arr.indexOf(category) === index)
    .filter((category): category is UnitCategory => !!unitData[category as UnitCategory]);

  return orderedCategories.flatMap<ConversionComboboxItem>((category) => {
    const data = unitData[category as UnitCategory];
    if (!data) return [];

    if (category === 'SI Prefixes') {
      return ALL_SI_PREFIXES.flatMap((fromPrefix) =>
        ALL_SI_PREFIXES.filter((other) => other.symbol !== fromPrefix.symbol).map((toPrefix) => {
          const keywords = new Set<string>([
            'si prefix',
            'prefix conversion',
            fromPrefix.prefix,
            toPrefix.prefix,
            fromPrefix.symbol,
            toPrefix.symbol,
            `${fromPrefix.prefix} to ${toPrefix.prefix}`,
            `${fromPrefix.symbol} to ${toPrefix.symbol}`,
          ]);
          fromPrefix.aliases.forEach((alias) => keywords.add(alias));
          toPrefix.aliases.forEach((alias) => keywords.add(alias));

          const keywordList = Array.from(keywords);
          return {
            value: `${category}:${fromPrefix.symbol}:${toPrefix.symbol}`,
            category,
            categoryLabel: 'SI Unit Prefixes',
            fromSymbol: fromPrefix.symbol,
            toSymbol: toPrefix.symbol,
            fromName: fromPrefix.prefix,
            toName: toPrefix.prefix,
            label: `${fromPrefix.prefix} to ${toPrefix.prefix}`,
            keywords: keywordList,
            keywordsLower: keywordList.map((keyword) => keyword.toLowerCase()),
            pairUrl: `/standards/nist-si-tenfold?from=${fromPrefix.symbol}&to=${toPrefix.symbol}`,
            kind: 'si-prefix' as const,
            siPrefixMeta: { fromSymbol: fromPrefix.symbol, toSymbol: toPrefix.symbol },
          };
        }),
      );
    }

    const units = getUnitsForCategory(category);
    return units.flatMap<ConversionComboboxItem>((fromUnit) =>
      units
        .filter((toUnit) => toUnit.symbol !== fromUnit.symbol)
        .map((toUnit) => {
          const label = `${fromUnit.symbol} to ${toUnit.symbol}`;
          const pairUrl = buildConversionPairUrl(category, fromUnit.symbol, toUnit.symbol);
          const keywordSet = new Set<string>([
            category,
            data.name,
            fromUnit.name,
            fromUnit.symbol,
            toUnit.name,
            toUnit.symbol,
            label,
            `${fromUnit.name} to ${toUnit.name}`,
            `${fromUnit.symbol} to ${toUnit.symbol}`,
            `${fromUnit.name} -> ${toUnit.name}`,
            `${fromUnit.symbol} -> ${toUnit.symbol}`,
            `${fromUnit.name} → ${toUnit.name}`,
            `${fromUnit.symbol} → ${toUnit.symbol}`,
            `${fromUnit.name} ${toUnit.symbol}`,
            `${fromUnit.symbol} ${toUnit.name}`,
            `${fromUnit.symbol}${toUnit.symbol}`,
            `${fromUnit.name} ${toUnit.name}`,
          ]);

          (CATEGORY_KEYWORDS[category] ?? []).forEach((keyword) =>
            keywordSet.add(keyword.toLowerCase()),
          );

          getAliasesForUnit(fromUnit).forEach((alias) => keywordSet.add(alias));
          getAliasesForUnit(toUnit).forEach((alias) => keywordSet.add(alias));

          const keywords = Array.from(keywordSet);
          return {
            value: `${category}:${fromUnit.symbol}:${toUnit.symbol}`,
            category,
            categoryLabel: data.name,
            fromSymbol: fromUnit.symbol,
            toSymbol: toUnit.symbol,
            fromName: fromUnit.name,
            toName: toUnit.name,
            label,
            keywords,
            keywordsLower: keywords.map((keyword) => keyword.toLowerCase()),
            pairUrl,
            kind: 'unit' as const,
            siPrefixMeta: undefined,
          };
        }),
    );
  });
}

// The units a complete piece of text means as a whole: a symbol, name, alias or notation ("feet",
// "pounds", "N/mm²", "kph"). A unit typed that way lists its pairs even though the text isn't a
// prefix of the unit's symbol or name. Whole text only, so partial input ("n/m", "d") still matches
// by prefix alone, and nothing outside the parser's own alias list ever matches. SI prefix rows
// keep matching by prefix name or symbol only ("meter" is also the alias of the prefix m).
type Reading = (category: UnitCategory, symbol: string) => boolean;
const readAs = (text: string): Reading => {
  const entries = text
    ? resolveUnitCandidates(text).filter((entry) => entry.category !== 'SI Prefixes')
    : [];
  return (category, symbol) =>
    entries.some((entry) => entry.category === category && entry.symbol === symbol);
};

/** The items that match the (already normalized) query. */
export function filterFinderItems(items: ConversionComboboxItem[], normalizedSearch: string): ConversionComboboxItem[] {
  const sanitizedForLetters = stripConnectorWords(normalizedSearch);
  const hasUnitCharacters = LETTER_REGEX.test(sanitizedForLetters);

  if (!normalizedSearch || !hasUnitCharacters) {
    return items;
  }

  // "mJ", "mPa": milli units the site doesn't list. Nothing matches; Enter shows the parser's
  // explanation instead of suggesting megajoules / megapascals.
  if (findUnlistedExactSymbol(normalizedSearch)) {
    return [];
  }

  const lowerSearch = normalizedSearch.toLowerCase().trim();
  
  // Check if there's a number in the query (including scientific notation)
  // Examples: "20", "1.5", "2e5", "3.14e-2"
  const hasNumbers = /\d/.test(lowerSearch);
  
  // Connector word (to, in, into) with unit text before it; "in" inside a symbol doesn't count
  const connectorSplit = splitAtConnector(lowerSearch);
  const hasConnector = connectorSplit !== null;

  // Check if negative number - only valid for Temperature category
  const hasNegativeNumber = /^-\d/.test(lowerSearch.trim());

  // CASE 1: NO NUMBERS
  if (!hasNumbers) {
    // A connector word is only a connector if there's text BEFORE it
    // "kg to g" = connector, "to" or "t" = just searching for units starting with "to"/"t"
    // Sub-case 1a: Has real connector with text before it (e.g., "kg to g", "ton in lb")
    if (connectorSplit) {
      const beforeConnector = connectorSplit.before.trim();
      const afterConnector = connectorSplit.after.trim();
      const fromReading = readAs(beforeConnector);
      const toReading = readAs(afterConnector);
      return items.filter((item) => {
        const fromNameLower = item.fromName.toLowerCase();
        const toNameLower = item.toName.toLowerCase();

        // Must match from unit
        const matchesFrom =
          symbolStartsWith(item.fromSymbol, beforeConnector) ||
          fromNameLower.startsWith(beforeConnector) ||
          fromReading(item.category, item.fromSymbol);

        if (!matchesFrom) return false;

        // If no to unit yet, show all conversions from this unit
        if (!afterConnector) return true;

        // Must match to unit
        return (
          symbolStartsWith(item.toSymbol, afterConnector) ||
          toNameLower.startsWith(afterConnector) ||
          toReading(item.category, item.toSymbol)
        );
      });
    }

    // Sub-case 1b: No connector (e.g., "t", "to", "ton", "time", "mass", "weight")
    const searchText = lowerSearch.trim();
    
    if (!searchText) {
      return items;
    }

    const searchReading = readAs(searchText);
    return items.filter((item) => {
      const categoryLower = item.category.toLowerCase();
      const fromNameLower = item.fromName.toLowerCase();

      // Simple startsWith matching on:
      // 1. Category name
      // 2. From unit symbol
      // 3. From unit name
      // 4. Category keywords (synonyms like "weight", "distance", "money")
      // 5. The whole text as a unit notation or alias ("cc", "N/mm²")
      return (
        categoryLower.startsWith(searchText) ||
        symbolStartsWith(item.fromSymbol, searchText) ||
        fromNameLower.startsWith(searchText) ||
        item.keywordsLower.some((keyword) => keyword.startsWith(searchText)) ||
        searchReading(item.category, item.fromSymbol)
      );
    });
  }

  // CASE 2: HAS NUMBERS, NO CONNECTOR
  // User typing: "20", "20 k", "20 kg", "1e5 m", "-20 celsius", "100 kg g"
  if (hasNumbers && !hasConnector) {
    // Extract just the text part (remove numbers, scientific notation, signs)
    // Keep minus sign only if followed immediately by digit (for negative temp check)
    const textPart = lowerSearch.replace(NUMBER_TOKEN_RE, keepPer100Digits).replace(/\s+/g, ' ').trim();
    
    if (!textPart) {
      // Just a number, show everything
      return items;
    }

    // Check if there are multiple unit tokens (e.g., "100 kg g" = from-unit + to-unit)
    const unitTokens = textPart.split(/\s+/).filter(t => t.length > 0);
    
    // CASE 2a: Single unit token - match from unit only. Also a multi-word text that is one unit
    // as a whole ("5 fl oz", "5 us dollar", "5 kg m/s²"), before it's split into from + to below.
    const textReading = readAs(textPart);
    if (unitTokens.length === 1 || resolveUnitCandidates(textPart).length > 0) {
      return items.filter((item) => {
        const fromNameLower = item.fromName.toLowerCase();

        // If negative number, only show Temperature category
        if (hasNegativeNumber && item.category !== 'Temperature') {
          return false;
        }

        // Match from unit only
        return (
          symbolStartsWith(item.fromSymbol, textPart) ||
          fromNameLower.startsWith(textPart) ||
          textReading(item.category, item.fromSymbol)
        );
      });
    }
    
    // CASE 2b: Multiple unit tokens - try to match from-unit + to-unit
    // e.g., "100 kg g", "50 m ft", "20 celsius fahrenheit"
    if (unitTokens.length >= 2) {
      const fromUnitToken = unitTokens[0];
      const toUnitToken = unitTokens.slice(1).join(' '); // Rest could be multi-word
      const fromReading = readAs(fromUnitToken);
      const toReading = readAs(toUnitToken);
      
      return items.filter((item) => {
        const fromNameLower = item.fromName.toLowerCase();
        const toNameLower = item.toName.toLowerCase();

        // If negative number, only show Temperature category
        if (hasNegativeNumber && item.category !== 'Temperature') {
          return false;
        }

        // Must match from unit
        const matchesFrom =
          symbolStartsWith(item.fromSymbol, fromUnitToken) ||
          fromNameLower.startsWith(fromUnitToken) ||
          fromReading(item.category, item.fromSymbol);

        if (!matchesFrom) return false;

        // Must match to unit
        return (
          symbolStartsWith(item.toSymbol, toUnitToken) ||
          toNameLower.startsWith(toUnitToken) ||
          toReading(item.category, item.toSymbol)
        );
      });
    }

    // Fallback: match from unit only
    return items.filter((item) => {
      const fromNameLower = item.fromName.toLowerCase();

      // If negative number, only show Temperature category
      if (hasNegativeNumber && item.category !== 'Temperature') {
        return false;
      }

      return (
        symbolStartsWith(item.fromSymbol, textPart) ||
        fromNameLower.startsWith(textPart)
      );
    });
  }

  // CASE 3: HAS NUMBERS AND CONNECTOR
  // User typing: "20 kg to", "20 kg to g", "20 kg to gra", "1e5 m to km", "-20 celsius to f"
  if (hasNumbers && connectorSplit) {
    // Split by connector word
    const beforeConnector = connectorSplit.before;
    const afterConnector = connectorSplit.after.trim();

    // Extract from unit (text after number, before connector)
    // Remove numbers, scientific notation, extra spaces
    const fromUnitText = beforeConnector.replace(NUMBER_TOKEN_RE, keepPer100Digits).replace(/\s+/g, ' ').trim();
    
    // Extract to unit (text after connector)
    const toUnitText = afterConnector.replace(NUMBER_TOKEN_RE, keepPer100Digits).replace(/\s+/g, ' ').trim();
    const fromReading = readAs(fromUnitText);
    const toReading = readAs(toUnitText);

    return items.filter((item) => {
      const fromNameLower = item.fromName.toLowerCase();
      const toNameLower = item.toName.toLowerCase();

      // If negative number, only show Temperature category
      if (hasNegativeNumber && item.category !== 'Temperature') {
        return false;
      }

      // Must match from unit
      const matchesFrom =
        symbolStartsWith(item.fromSymbol, fromUnitText) ||
        fromNameLower.startsWith(fromUnitText) ||
        fromReading(item.category, item.fromSymbol);

      if (!matchesFrom) return false;

      // If no to unit typed yet, show all conversions from this unit
      if (!toUnitText) return true;

      // Must match to unit
      return (
        symbolStartsWith(item.toSymbol, toUnitText) ||
        toNameLower.startsWith(toUnitText) ||
        toReading(item.category, item.toSymbol)
      );
    });
  }

  return items;
}

export function orderFinderCategories(items: ConversionComboboxItem[]): UnitCategory[] {
  const categoriesInItems = Array.from(new Set(items.map((item) => item.category)));
  const extras = categoriesInItems.filter(
    (category) => !categoryDisplayOrder.includes(category as UnitCategory),
  );

  const combined = [
    ...categoryDisplayOrder,
    ...extras,
  ].filter((category): category is UnitCategory => categoriesInItems.includes(category as UnitCategory));

  const uniqueOrdered: UnitCategory[] = [];
  combined.forEach((category) => {
    if (!uniqueOrdered.includes(category)) {
      uniqueOrdered.push(category);
    }
  });
  return uniqueOrdered;
}

export function sortFinderItems(
  baseItems: ConversionComboboxItem[],
  orderedCategories: UnitCategory[],
  normalizedSearch: string,
): ConversionComboboxItem[] {
  const categoryRank = new Map<UnitCategory, number>();
  orderedCategories.forEach((cat, index) => {
    categoryRank.set(cat, index);
  });

  const rankOf = (category: UnitCategory) =>
    categoryRank.has(category) ? (categoryRank.get(category) as number) : orderedCategories.length;

  const normalizedItems = baseItems.map((item) =>
    item.kind === 'si-prefix'
      ? { ...item, category: 'SI Prefixes' as UnitCategory }
      : item,
  );

  // Get the search text to prioritize matching from units
  const searchQuery = normalizedSearch.toLowerCase().trim();
  const searchText = searchQuery.replace(/[\d.,\s-]+/g, '').replace(/\b(to|in|into)\b/g, '').trim();

  // A from-unit typed with its exact symbol case where that symbol clashes with another unit
  // once lowercased ("kN" vs knot "kn", "PS" vs picosecond "ps", "Nm" vs nanometer "nm") puts
  // that unit's pairs first; typed the other way ("kn", "ps", "nm") the older unit stays first.
  const connectorSplit = splitAtConnector(normalizedSearch);
  const fromText = (connectorSplit ? connectorSplit.before : normalizedSearch)
    .replace(NUMBER_TOKEN_RE, keepPer100Digits)
    .replace(/\s+/g, ' ')
    .trim();
  const firstToken = fromText.split(' ')[0] ?? '';
  const exactUnit =
    getCaseExactUnitMatch(fromText) ?? (firstToken !== fromText ? getCaseExactUnitMatch(firstToken) : null);
  const isExactUnit = (item: ConversionComboboxItem) =>
    exactUnit !== null && item.category === exactUnit.category && item.fromSymbol === exactUnit.symbol;

  // The unit the parser reads the typed from-unit as goes first within its category, so the
  // first suggestion (what Enter picks) matches the parser: "30 mpg" -> MPG (US), not MPG (UK).
  const parserFrom = fromText ? resolveUnitText(fromText) ?? (firstToken !== fromText ? resolveUnitText(firstToken) : null) : null;
  const isParserFrom = (item: ConversionComboboxItem) =>
    parserFrom !== null && item.category === parserFrom.category && item.fromSymbol === parserFrom.symbol;

  // The same for the to-unit, where one category has two units that differ only in case ("5 kW
  // to MW" is megawatts, "5 kW to mw" and "5 kW to mW" milliwatts): the parser's reading first.
  const toText = connectorSplit
    ? connectorSplit.after.replace(NUMBER_TOKEN_RE, keepPer100Digits).replace(/\s+/g, ' ').trim()
    : '';
  const parserTo = toText ? resolveUnitText(toText) : null;
  const isParserTo = (item: ConversionComboboxItem) =>
    parserTo !== null && item.category === parserTo.category && item.toSymbol === parserTo.symbol;

  // When the query names both units and the parser reads it as a pair, that pair goes first: the
  // first row is what Enter picks, and a pair from a higher-ranked category whose symbols merely
  // start the same way must not win ("5 hp to PS" listed hPa → psi first, "5 W to kW" Wh → kWh,
  // "5 B to MB" bar → mbar).
  let parsedPairValue: string | null = null;
  if (toText) {
    const parsed = parseConversionQuery(normalizedSearch);
    if (parsed.ok && parsed.kind === 'unit' && parsed.fromUnit !== parsed.toUnit) {
      parsedPairValue = `${parsed.category}:${parsed.fromUnit}:${parsed.toUnit}`;
    }
  }

  return normalizedItems.sort((a, b) => {
    // The parser's reading of a complete "A to B" query (see above)
    if (parsedPairValue) {
      const aParsed = a.value === parsedPairValue;
      if (aParsed !== (b.value === parsedPairValue)) return aParsed ? -1 : 1;
    }

    // 0. Exact-case symbol match (see above)
    if (exactUnit) {
      const aExact = isExactUnit(a);
      if (aExact !== isExactUnit(b)) return aExact ? -1 : 1;
    }

    // 1. Sort by category rank first
    const rankDiff = rankOf(a.category) - rankOf(b.category);
    if (rankDiff !== 0) return rankDiff;

    // 1b. Within the category, the parser's reading of the from-unit (see above)
    if (parserFrom) {
      const aParser = isParserFrom(a);
      if (aParser !== isParserFrom(b)) return aParser ? -1 : 1;
    }

    // 1c. Then the parser's reading of the to-unit (see above)
    if (parserTo) {
      const aParserTo = isParserTo(a);
      if (aParserTo !== isParserTo(b)) return aParserTo ? -1 : 1;
    }

    // 2. Within same category, prioritize items where FROM unit starts with search
    if (searchText) {
      const aFromLower = a.fromSymbol.toLowerCase();
      const bFromLower = b.fromSymbol.toLowerCase();
      const aFromNameLower = a.fromName.toLowerCase();
      const bFromNameLower = b.fromName.toLowerCase();
      
      // searchText has its spaces, digits and hyphens removed, so compare against the symbol and
      // name with the same characters removed too ("fl oz" -> "floz", "N·m" -> "nm"); without
      // this a multi-word unit could never count as matching its own from-unit.
      const squash = (value: string) => value.replace(/[\d.,\s\-·]+/g, '');

      // A from-symbol equal to the search beats one that only starts with it, so "fl oz",
      // "pt" and "gal" list the US unit before "fl oz (UK)", "pt (UK)", "gal (UK)".
      const aExactSymbol = squash(aFromLower) === searchText;
      const bExactSymbol = squash(bFromLower) === searchText;
      if (aExactSymbol !== bExactSymbol) return aExactSymbol ? -1 : 1;

      const aFromMatches =
        aFromLower.startsWith(searchText) ||
        aFromNameLower.startsWith(searchText) ||
        squash(aFromLower).startsWith(searchText) ||
        squash(aFromNameLower).startsWith(searchText);
      const bFromMatches =
        bFromLower.startsWith(searchText) ||
        bFromNameLower.startsWith(searchText) ||
        squash(bFromLower).startsWith(searchText) ||
        squash(bFromNameLower).startsWith(searchText);
      
      if (aFromMatches && !bFromMatches) return -1;
      if (!aFromMatches && bFromMatches) return 1;
    }

    // 3. Finally sort alphabetically by label
    return a.label.localeCompare(b.label);
  });
}

// --- Row hints ("N/mm² = MPa") -------------------------------------------------------------

type SideReading = { typed: string; entries: AliasEntry[] };
export type FinderReadings = { from: SideReading | null; to: SideReading | null };

const stripNumbers = (text: string) =>
  text.replace(NUMBER_TOKEN_RE, keepPer100Digits).replace(/\s+/g, ' ').trim();

/** What the typed from- and to-unit text each mean as a whole, in the case they were typed. */
export function getFinderReadings(normalizedSearch: string): FinderReadings {
  const split = normalizedSearch ? splitAtConnector(normalizedSearch) : null;
  const fromText = stripNumbers(split ? split.before : normalizedSearch);
  const toText = split ? stripNumbers(split.after) : '';
  const reading = (text: string): SideReading | null =>
    text ? { typed: text, entries: resolveUnitCandidates(text) } : null;
  return { from: reading(fromText), to: reading(toText) };
}

// Compares typed text with a notation ignoring case, joiners and how powers are written, so the
// hint can show the notation as it's properly written ("n/mm2" -> "N/mm²").
const squashNotation = (text: string) =>
  text.toLowerCase().replace(/[·*.\-\s^]/g, '').replace(/²/g, '2').replace(/³/g, '3').replace(/μ/g, 'µ');

function displayTyped(category: UnitCategory, symbol: string, typed: string): string {
  const unit = unitData[category]?.units.find((candidate) => candidate.symbol === symbol);
  const notation = unit?.alsoWrittenAs?.find((entry) => squashNotation(entry.text) === squashNotation(typed));
  return notation ? notation.text : typed;
}

/**
 * "N/mm² = MPa" for a row whose unit was typed as a notation or alias rather than as (the start
 * of) its own symbol or name, so it's clear why the row is listed. Null otherwise.
 */
export function getFinderItemNote(item: ConversionComboboxItem, readings: FinderReadings): string | null {
  if (item.kind === 'si-prefix') return null;
  const parts: string[] = [];
  const side = (reading: SideReading | null, symbol: string, name: string) => {
    if (!reading) return;
    const typedLower = reading.typed.toLowerCase();
    if (symbolStartsWith(symbol, typedLower) || name.toLowerCase().startsWith(typedLower)) return;
    if (!reading.entries.some((entry) => entry.category === item.category && entry.symbol === symbol)) return;
    parts.push(`${displayTyped(item.category, symbol, reading.typed)} = ${symbol}`);
  };
  side(readings.from, item.fromSymbol, item.fromName);
  side(readings.to, item.toSymbol, item.toName);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * For a query whose two sides are the same unit ("5 N/mm2 to MPa", "5 kg to kg"), the message
 * shown instead of "No conversion found": a same-unit pair has no row of its own, but Enter still
 * converts it. (cc to mL isn't one: cm³ and mL are two listed units with a row each.)
 */
export function getSameUnitMessage(normalizedSearch: string): string | null {
  if (!normalizedSearch) return null;
  const parsed = parseConversionQuery(normalizedSearch);
  if (!parsed.ok || parsed.kind !== 'unit' || parsed.fromUnit !== parsed.toUnit) return null;
  const { from, to } = getFinderReadings(normalizedSearch);
  if (!from || !to) return null;
  const a = displayTyped(parsed.category, parsed.fromUnit, from.typed);
  const b = displayTyped(parsed.category, parsed.toUnit, to.typed);
  return squashNotation(a) === squashNotation(b)
    ? 'Both sides are the same unit. Press Enter to convert.'
    : `${a} and ${b} are the same unit (1 ${a} = 1 ${b}). Press Enter to convert.`;
}

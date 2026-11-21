'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnitCategory } from '@/types';
import { Input } from '@/components/ui/input';
import { UnitIcon } from './unit-icon';
import {
  parseConversionQuery,
  isCompoundQuantityQuery,
  findConnectorMatches,
  stripConnectorWords,
  spaceConnectorWords,
  rewriteCaseExactNotations,
  toSuperscriptPowers,
  getCaseExactUnitMatch,
  resolveUnitText,
  type ParsedConversionPayload,
} from '@/lib/conversion-query-parser';
import { categoryDisplayOrder } from '@/lib/unit-data';

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

const LEXER_NUMBER_RE = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/;
const findLeadingNumericValue = (value: string): number => {
  const sanitized = value.replace(/,/g, '').replace(/\s+/g, ' ').trim();
  const match = sanitized.match(LEXER_NUMBER_RE);
  return match ? Number(match[0]) : NaN;
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

export interface ConversionComboboxProps {
  items: ConversionComboboxItem[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputId?: string;
  disabled?: boolean;
  triggerClassName?: string;
  onParsedConversion?: (payload: ParsedConversionPayload) => void;
  onParseError?: (message: string) => void;
  presetQuery?: string | null;
  autoFocusOnMount?: boolean;
  onAutoFocusComplete?: () => void;
  onNumericValue?: (value: number) => void;
  prefixIcon?: React.ReactNode;
}

const LETTER_REGEX = /[a-zA-Z°µμ]/;
const INITIAL_VISIBLE_ITEMS = 50;
const LOAD_INCREMENT = 50;

function normalizeInput(value: string): string {
  // "Mb/s" -> "Mbps", "Mg" -> "t" etc. (case-sensitive notations, shared with the parser)
  const withArrowsNormalized = rewriteCaseExactNotations(value.replace(/(->|=>|→)/gi, ' to '));
  
  // Convert ASCII "u" prefix to proper micro symbol "µ" for micro- units
  // Only convert known micro units: um, us, ug, ul, ua, etc. (not just "u" alone)
  // This handles: "100um", "50 us" but NOT "505u", "usd"
  // Pattern: u followed by specific letters that are known micro units
  let withMicroConverted = withArrowsNormalized.replace(/(^|\s)u([mgsal])(?=\s|$)/gi, '$1µ$2'); // um, us, ug, ua, ul
  withMicroConverted = withMicroConverted.replace(/([0-9.,]+\s*)u([mgsal])(?=\s|$)/gi, '$1µ$2'); // 100um, 50us, etc.
  
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
function isSameUnitPairQuery(query: string): boolean {
  const parsed = parseConversionQuery(normalizeInput(query));
  return parsed.ok && parsed.kind === 'unit' && parsed.fromUnit === parsed.toUnit;
}

function isPureNumericQuery(query: string): boolean {
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

export function ConversionCombobox({
  items,
  value,
  onChange,
  placeholder = 'Type a phrase like "100 kg in g" to get a conversion',
  inputId,
  disabled = false,
  triggerClassName,
  onParsedConversion,
  onParseError,
  presetQuery = null,
  autoFocusOnMount = false,
  onAutoFocusComplete,
  onNumericValue,
  prefixIcon,
}: ConversionComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [committedInput, setCommittedInput] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listContainerRef = React.useRef<HTMLUListElement | null>(null);
  const scrollTickingRef = React.useRef(false);
  const listId = React.useId();
  const generatedInputId = React.useId();
  const resolvedInputId = inputId ?? generatedInputId;

  const autoFocusTriggeredRef = React.useRef(false);
  const handleNumericCommit = React.useCallback(
    (value: number) => {
      onNumericValue?.(value);
    },
    [onNumericValue],
  );

  React.useEffect(() => {
    if (!presetQuery) return;
    // Same precaution as tryParse: a compound preset must be checked/parsed from the raw
    // text before this combobox's normalizeInput can corrupt an unspaced value like "ft3in".
    const normalizedPreset = isCompoundQuantityQuery(presetQuery)
      ? presetQuery.trim()
      : normalizeInput(presetQuery);
    setSearch(normalizedPreset);
    setCommittedInput(normalizedPreset);
    setOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      if (inputRef.current && normalizedPreset) {
        const position = normalizedPreset.length;
        inputRef.current.setSelectionRange(position, position);
      }
      if (normalizedPreset) {
        const parsed = parseConversionQuery(normalizedPreset);
        if (parsed.ok) {
          onParsedConversion?.(parsed);
        } else {
          onParseError?.(parsed.error);
        }
      }
    });
  }, [presetQuery, onParsedConversion, onParseError]);

  React.useEffect(() => {
    if (!autoFocusOnMount || autoFocusTriggeredRef.current) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const coarseQuery = window.matchMedia('(pointer: coarse)');
    const prefersTouch =
      coarseQuery.matches || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

    if (prefersTouch) {
      autoFocusTriggeredRef.current = true;
      onAutoFocusComplete?.();
      return;
    }

    const handle = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      autoFocusTriggeredRef.current = true;
      onAutoFocusComplete?.();
    });
    return () => cancelAnimationFrame(handle);
  }, [autoFocusOnMount, onAutoFocusComplete]);

  const trimmedSearch = search.trim();
  const normalizedSearch = React.useMemo(() => normalizeInput(trimmedSearch), [trimmedSearch]);
  const sanitizedForLetters = stripConnectorWords(normalizedSearch);
  const hasUnitCharacters = LETTER_REGEX.test(sanitizedForLetters);

  const baseItems = React.useMemo(() => {
    if (!normalizedSearch || !hasUnitCharacters) {
      return items;
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
        return items.filter((item) => {
          const fromNameLower = item.fromName.toLowerCase();
          const toNameLower = item.toName.toLowerCase();

          // Must match from unit
          const matchesFrom =
            symbolStartsWith(item.fromSymbol, beforeConnector) ||
            fromNameLower.startsWith(beforeConnector);

          if (!matchesFrom) return false;

          // If no to unit yet, show all conversions from this unit
          if (!afterConnector) return true;

          // Must match to unit
          return (
            symbolStartsWith(item.toSymbol, afterConnector) ||
            toNameLower.startsWith(afterConnector)
          );
        });
      }

      // Sub-case 1b: No connector (e.g., "t", "to", "ton", "time", "mass", "weight")
      const searchText = lowerSearch.trim();
      
      if (!searchText) {
        return items;
      }

      return items.filter((item) => {
        const categoryLower = item.category.toLowerCase();
        const fromNameLower = item.fromName.toLowerCase();

        // Simple startsWith matching on:
        // 1. Category name
        // 2. From unit symbol
        // 3. From unit name
        // 4. Category keywords (synonyms like "weight", "distance", "money")
        return (
          categoryLower.startsWith(searchText) ||
          symbolStartsWith(item.fromSymbol, searchText) ||
          fromNameLower.startsWith(searchText) ||
          item.keywordsLower.some((keyword) => keyword.startsWith(searchText))
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
      
      // CASE 2a: Single unit token - match from unit only
      if (unitTokens.length === 1) {
        return items.filter((item) => {
          const fromNameLower = item.fromName.toLowerCase();

          // If negative number, only show Temperature category
          if (hasNegativeNumber && item.category !== 'Temperature') {
            return false;
          }

          // Match from unit only
          return (
            symbolStartsWith(item.fromSymbol, textPart) ||
            fromNameLower.startsWith(textPart)
          );
        });
      }
      
      // CASE 2b: Multiple unit tokens - try to match from-unit + to-unit
      // e.g., "100 kg g", "50 m ft", "20 celsius fahrenheit"
      if (unitTokens.length >= 2) {
        const fromUnitToken = unitTokens[0];
        const toUnitToken = unitTokens.slice(1).join(' '); // Rest could be multi-word
        
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
            fromNameLower.startsWith(fromUnitToken);

          if (!matchesFrom) return false;

          // Must match to unit
          return (
            symbolStartsWith(item.toSymbol, toUnitToken) ||
            toNameLower.startsWith(toUnitToken)
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
          fromNameLower.startsWith(fromUnitText);

        if (!matchesFrom) return false;

        // If no to unit typed yet, show all conversions from this unit
        if (!toUnitText) return true;

        // Must match to unit
        return (
          symbolStartsWith(item.toSymbol, toUnitText) ||
          toNameLower.startsWith(toUnitText)
        );
      });
    }

    return items;
  }, [items, normalizedSearch, hasUnitCharacters]);

  const orderedCategories = React.useMemo(() => {
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
  }, [items]);

  const sortedItems = React.useMemo(() => {
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

    return normalizedItems.sort((a, b) => {
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
  }, [baseItems, orderedCategories, normalizedSearch]);

  const [visibleItemLimit, setVisibleItemLimit] = React.useState(INITIAL_VISIBLE_ITEMS);
  const [autoHighlightedValue, setAutoHighlightedValue] = React.useState<string | null>(null);
  const previousSearchRef = React.useRef(normalizedSearch);
  const previousOpenRef = React.useRef(open);

  React.useEffect(() => {
    setVisibleItemLimit((prev) => Math.min(prev, sortedItems.length));
  }, [sortedItems.length]);

  React.useEffect(() => {
    const searchChanged = previousSearchRef.current !== normalizedSearch;
    const openChanged = previousOpenRef.current !== open;

    previousSearchRef.current = normalizedSearch;
    previousOpenRef.current = open;

    if (!searchChanged && !openChanged) {
      return;
    }

    const baseline = Math.min(INITIAL_VISIBLE_ITEMS, sortedItems.length);
    setVisibleItemLimit(baseline);
  }, [normalizedSearch, open, sortedItems.length]);

  const baseVisibleItems = React.useMemo(
    () => sortedItems.slice(0, visibleItemLimit),
    [sortedItems, visibleItemLimit],
  );

  const displayItems = React.useMemo(() => {
    if (!autoHighlightedValue) {
      return baseVisibleItems;
    }

    const inBaseSlice = baseVisibleItems.some((item) => item.value === autoHighlightedValue);
    if (inBaseSlice) {
      return baseVisibleItems;
    }

    const match = sortedItems.find((item) => item.value === autoHighlightedValue);
    if (!match) {
      return baseVisibleItems;
    }

    const deduped = baseVisibleItems.filter((item) => item.value !== autoHighlightedValue);
    return [match, ...deduped].slice(0, visibleItemLimit);
  }, [autoHighlightedValue, baseVisibleItems, sortedItems, visibleItemLimit]);

  const hasMoreItems = visibleItemLimit < sortedItems.length;
  const increaseVisibleItems = React.useCallback(() => {
    setVisibleItemLimit((prev) => Math.min(prev + LOAD_INCREMENT, sortedItems.length));
  }, [sortedItems.length]);

  const handleScroll = React.useCallback(
    (event: React.UIEvent<HTMLUListElement>) => {
      if (!hasMoreItems) return;
      if (scrollTickingRef.current) return;
      const target = event.currentTarget;
      scrollTickingRef.current = true;
      requestAnimationFrame(() => {
        scrollTickingRef.current = false;
        const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
        if (distanceFromBottom <= 160) {
          increaseVisibleItems();
        }
      });
    },
    [hasMoreItems, increaseVisibleItems],
  );

  const displayValue = open ? search : committedInput;

  const closeDropdown = React.useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const handleSelect = React.useCallback(
    (selectedValue: string) => {
      const match = items.find((item) => item.value === selectedValue);
      if (!match) {
        closeDropdown();
        return;
      }

      setAutoHighlightedValue(null);

      if (match.kind === 'si-prefix' && match.siPrefixMeta) {
        onParsedConversion?.({
          ok: true,
          kind: 'si-prefix',
          value: 1,
          fromPrefixSymbol: match.siPrefixMeta.fromSymbol,
          toPrefixSymbol: match.siPrefixMeta.toSymbol,
          inputText: match.label,
          valueStrategy: 'force-default',
        });
        setCommittedInput(match.label);
        setSearch(match.label);
        closeDropdown();
        return;
      }

      onChange(selectedValue);
      const rawInput = inputRef.current?.value ?? search ?? committedInput;
      const sanitizedInput = rawInput.trim();
      const numericCandidate = findLeadingNumericValue(sanitizedInput);
      if (handleNumericCommit && Number.isFinite(numericCandidate)) {
        handleNumericCommit(numericCandidate);
      }
      // If there's a numeric value, construct full query with the selected conversion pair
      const hasNumeric = Number.isFinite(numericCandidate);
      const displayText = hasNumeric && match.label
        ? `${numericCandidate} ${match.label}`.trim()
        : (sanitizedInput !== '' && isPureNumericQuery(sanitizedInput) && match.label
          ? `${sanitizedInput} ${match.label}`.trim()
          : rawInput);
      setCommittedInput(displayText);
      setSearch(displayText);
      onParsedConversion?.({
        ok: true,
        kind: 'unit',
        category: match.category as UnitCategory,
        fromUnit: match.fromSymbol,
        toUnit: match.toSymbol,
        value: hasNumeric ? numericCandidate : 1,
        valueStrategy: hasNumeric ? 'explicit' : 'preserve-existing',
      });
      closeDropdown();
    },
    [
      closeDropdown,
      committedInput,
      handleNumericCommit,
      items,
      onChange,
      onParsedConversion,
      search,
    ],
  );

  const handleParsedSelection = React.useCallback(
    (parsed: ParsedConversionPayload, typedQuery: string) => {
      onParsedConversion?.(parsed);

      const trimmed = typedQuery.trim();
      setCommittedInput(trimmed);
      setSearch(trimmed);

      if (parsed.kind === 'category') {
        closeDropdown();
        return;
      }

      if (parsed.kind === 'si-prefix') {
        closeDropdown();
        return;
      }

      const matchingItem = items.find(
        (item) =>
          item.kind !== 'si-prefix' &&
          item.category === parsed.category &&
          item.fromSymbol === parsed.fromUnit &&
          item.toSymbol === parsed.toUnit,
      );

      if (matchingItem) {
        setAutoHighlightedValue(matchingItem.value);
        closeDropdown();
        return;
      }

      closeDropdown();
    },
    [closeDropdown, items, onParsedConversion],
  );

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setCommittedInput((prev) => prev || search);
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown, open, search]);

  // Simple highlighting: always start at first item when items or search changes
  React.useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }

    if (displayItems.length === 0) {
      setHighlightedIndex(-1);
      return;
    }

    // Always reset to first item when display items change
    setHighlightedIndex(0);
  }, [displayItems, open]);

  React.useEffect(() => {
    if (!open) {
      setAutoHighlightedValue(null);
      scrollTickingRef.current = false;
      return;
    }

    // Disable auto-highlighting - just keep it null
    // This simplifies the highlighting logic and prevents conflicts
    setAutoHighlightedValue(null);
  }, [normalizedSearch, open]);

  React.useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const option = containerRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${highlightedIndex}"]`,
    );
    option?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  React.useEffect(() => {
    if (!open) return;
    listContainerRef.current?.scrollTo({ top: 0 });
  }, [normalizedSearch, open]);

  const tryParse = React.useCallback(
    (query: string) => {
      if (!onParsedConversion && !onParseError) return false;

      // Compound quantities ("5ft3in") must be checked on the ORIGINAL text before this
      // combobox's own normalizeInput runs - it has its own cubic/square-unit shorthand pass
      // ("ft3" -> "ft³") that would otherwise eat an unspaced compound value first, the same
      // hazard normalizeQuery has on the conversion-query-parser side.
      if (isCompoundQuantityQuery(query)) {
        const compoundParsed = parseConversionQuery(query);
        if (compoundParsed.ok) {
          handleParsedSelection(compoundParsed, query);
          return true;
        }
        // The value shape matched ("5 ft 7 in") but something else failed - almost always an
        // explicit target that doesn't resolve or is a different category ("...to m2"). Show
        // the real error instead of falling through: an unrelated auto-highlighted suggestion
        // ("ft to cm") would otherwise get silently applied below.
        onParseError?.(compoundParsed.error);
        return true;
      }

      const normalized = normalizeInput(query);
      // Prime-notation compound quantities (6' 2") are letter-free, so they'd otherwise be
      // rejected by the letter check meant to filter out bare numbers.
      if (
        !LETTER_REGEX.test(stripConnectorWords(normalized)) &&
        !isCompoundQuantityQuery(normalized)
      ) {
        return false;
      }

      const parsed = parseConversionQuery(normalized);
      if (parsed.ok) {
        handleParsedSelection(parsed, normalized);
        return true;
      }

      if (displayItems.length === 0) {
        onParseError?.(parsed.error);
      }
      return false;
    },
    [displayItems.length, handleParsedSelection, onParsedConversion, onParseError],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const rawValue = event.currentTarget.value;
      const query = normalizeInput(rawValue);

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!open) setOpen(true);
        if (!displayItems.length) return;
        setAutoHighlightedValue(null);
        setHighlightedIndex((prev) =>
          prev < 0 || prev + 1 >= displayItems.length ? 0 : prev + 1,
        );
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!displayItems.length) return;
        setAutoHighlightedValue(null);
        setHighlightedIndex((prev) =>
          prev <= 0 ? displayItems.length - 1 : prev - 1,
        );
        return;
      }

      if (event.key === 'Escape') {
        setCommittedInput(rawValue || committedInput);
        closeDropdown();
        return;
      }

      // Options aren't focusable (focus stays here via aria-activedescendant), so Tab leaves the
      // finder; close the popup like Escape so it doesn't stay open over the next fields.
      if (event.key === 'Tab') {
        if (open) {
          setCommittedInput(rawValue || committedInput);
          closeDropdown();
        }
        return;
      }

      if (event.key === 'Enter') {
        const hasHighlight =
          highlightedIndex >= 0 && highlightedIndex < displayItems.length;
        // A compound quantity ("5 ft 7 in") must win over an auto-highlighted suggestion
        // that only matches one of its tokens by prefix (e.g. "ft to cm") - that highlight
        // was never a deliberate user choice, just the list's default first item. Checked
        // against rawValue, not query: query has already been through this combobox's own
        // normalizeInput, which can mangle an unspaced compound value (see tryParse).
        const preferParse =
          !hasHighlight || isCompoundQuantityQuery(rawValue) || (Boolean(query) && isSameUnitPairQuery(rawValue));
        if (preferParse && query && tryParse(rawValue)) {
          event.preventDefault();
          return;
        }

        if (
          !hasHighlight &&
          query &&
          handleNumericCommit &&
          isPureNumericQuery(query)
        ) {
          event.preventDefault();
          const numericValue = Number(query.replace(/\s+/g, ''));
          if (Number.isFinite(numericValue)) {
            handleNumericCommit(numericValue);
            setSearch('');
            setCommittedInput('');
            setAutoHighlightedValue(null);
            closeDropdown();
          }
          return;
        }

        if (displayItems.length > 0) {
          const targetItem = hasHighlight
            ? displayItems[highlightedIndex]
            : displayItems[0];
          if (targetItem) {
            event.preventDefault();
            handleSelect(targetItem.value);
            return;
          }
        }
      }
    },
    [
      closeDropdown,
      committedInput,
      displayItems,
      handleSelect,
      highlightedIndex,
      open,
      tryParse,
      handleNumericCommit,
    ],
  );


  // ARIA combobox pattern (APG "list autocomplete"): focus stays in the input, the highlighted
  // option is exposed through aria-activedescendant and marked aria-selected. The popup only
  // counts as an expanded listbox while it actually renders options, so aria-controls never
  // points at a missing element ("No conversion found." is announced as a status instead).
  const optionId = (index: number) => `${listId}-option-${index}`;
  const isListboxShown = open && displayItems.length > 0;
  const activeDescendant =
    isListboxShown && highlightedIndex >= 0 && highlightedIndex < displayItems.length
      ? optionId(highlightedIndex)
      : undefined;

  return (
    <div ref={containerRef} className={cn('relative', triggerClassName)}>
      <div className="relative">
        {prefixIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            {prefixIcon}
          </span>
        )}
        <Input
          ref={inputRef}
          type="text"
          id={resolvedInputId}
          name={resolvedInputId}
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => {
            setSearch(committedInput);
            requestAnimationFrame(() => inputRef.current?.select());
          }}
          onChange={(event) => {
            const updated = event.target.value;
            setCommittedInput(updated);
            setSearch(updated);
            setOpen(true);
          }}
          onClick={() => {
            if (!open && !disabled) {
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'h-11 w-full rounded-xl border border-border/60 bg-[hsl(var(--control-background))] px-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60',
            prefixIcon ? 'pl-9' : '',
          )}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isListboxShown}
          aria-haspopup="listbox"
          aria-controls={isListboxShown ? listId : undefined}
          aria-activedescendant={activeDescendant}
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border/60 bg-[hsl(var(--control-background))] shadow-xl">
          {displayItems.length === 0 ? (
            <p role="status" className="px-4 py-6 text-sm text-muted-foreground">No conversion found.</p>
          ) : (
            // The listbox scrolls itself (no wrapper div). Its options aren't focusable - arrow
            // keys move aria-activedescendant and scrollIntoView follows - which is fine for the
            // popup a combobox controls, but a plain scrolling wrapper would have no keyboard access.
            <ul
              ref={listContainerRef}
              id={listId}
              className="max-h-80 divide-y divide-border/60 overflow-y-auto"
              onScroll={handleScroll}
              role="listbox"
              aria-label="Conversion results"
            >
              {displayItems.map((item, index) => {
                const isHighlighted = highlightedIndex === index;
                const isSelected = value === item.value;

                return (
                  // The row is a presentational wrapper so the reference link can sit next to
                  // the option rather than inside it (options can't contain interactive content).
                  // The link is a mouse shortcut, hidden from assistive tech and the tab order;
                  // keyboard and screen reader users reach the same page via the converter's
                  // "Details" link after selecting.
                  <li
                    key={item.value}
                    role="presentation"
                    data-option-index={index}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-sm transition',
                      isHighlighted ? 'bg-primary/10 text-foreground' : 'hover:bg-primary/10',
                    )}
                    onMouseEnter={() => {
                      setAutoHighlightedValue(null);
                      setHighlightedIndex(index);
                    }}
                    onClick={() => handleSelect(item.value)}
                  >
                    <div
                      id={optionId(index)}
                      role="option"
                      aria-selected={isHighlighted}
                      className="flex min-w-0 items-center gap-3"
                    >
                      {item.kind === 'si-prefix' ? (
                        <ArrowLeftRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <UnitIcon
                          category={item.category as UnitCategory}
                          className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-foreground">
                          {item.label}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {item.fromName} → {item.toName} · {item.categoryLabel}
                        </span>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Link
                        href={item.pairUrl}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:border-primary/70 hover:text-primary"
                        aria-label={`Open ${item.fromName} to ${item.toName} reference`}
                        aria-hidden="true"
                        tabIndex={-1}
                        onClick={() => closeDropdown()}
                      >
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <Check
                        className={cn(
                          'h-4 w-4 text-primary transition-opacity',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                        aria-hidden="true"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnitCategory } from '@/types';
import { Input } from '@/components/ui/input';
import { UnitIcon } from './unit-icon';
import { parseConversionQuery, type ParsedConversionPayload } from '@/lib/conversion-query-parser';
import { categoryDisplayOrder } from '@/lib/unit-data';

// Scientific notation: 1e5, 2.5e-3, etc.
// Negative numbers: Only valid for Temperature (parsed later with category context)
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

const CONNECTOR_TOKEN_REGEX = /\b(to|into|in)\b/gi;
const LETTER_REGEX = /[a-zA-Z°µμ]/;
const INITIAL_VISIBLE_ITEMS = 50;
const LOAD_INCREMENT = 50;
const CONNECTOR_TERMS = new Set(['to', 'in', 'into']);

function normalizeInput(value: string): string {
  const withArrowsNormalized = value.replace(/(->|=>|→)/gi, ' to ');
  
  // Convert ASCII "u" prefix to proper micro symbol "µ" for micro- units
  // Only convert known micro units: um, us, ug, ul, ua, etc. (not just "u" alone)
  // This handles: "100um", "50 us" but NOT "505u", "usd"
  // Pattern: u followed by specific letters that are known micro units
  let withMicroConverted = withArrowsNormalized.replace(/(^|\s)u([mgsal])(?=\s|$)/gi, '$1µ$2'); // um, us, ug, ua, ul
  withMicroConverted = withMicroConverted.replace(/([0-9.,]+\s*)u([mgsal])(?=\s|$)/gi, '$1µ$2'); // 100um, 50us, etc.
  
  const withConnectorsSpaced = withMicroConverted.replace(
    /(^|[^a-zA-Z°µμ])(to|into|in)(?=$|[^a-zA-Z°µμ])/gi,
    '$1 $2 ',
  );

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

function isPureNumericQuery(query: string): boolean {
  if (!query) return false;
  const withoutCommas = query.replace(/,/g, '').trim();
  if (!withoutCommas) {
    return false;
  }

  if (LETTER_REGEX.test(withoutCommas.replace(CONNECTOR_TOKEN_REGEX, ' '))) {
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
  const listContainerRef = React.useRef<HTMLDivElement | null>(null);
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
    const normalizedPreset = normalizeInput(presetQuery);
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
    console.log('finder parse', normalizedPreset, parsed);
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
  const sanitizedForLetters = normalizedSearch.replace(CONNECTOR_TOKEN_REGEX, ' ');
  const hasUnitCharacters = LETTER_REGEX.test(sanitizedForLetters);

  const baseItems = React.useMemo(() => {
    console.log('[Filter Entry]', {
      search,
      trimmedSearch,
      normalizedSearch,
      sanitizedForLetters,
      hasUnitCharacters,
      willFilter: !!(normalizedSearch && hasUnitCharacters)
    });
    
    if (!normalizedSearch || !hasUnitCharacters) {
      console.log('[Filter] Returning ALL items - no search or no unit chars');
      return items;
    }

    const lowerSearch = normalizedSearch.toLowerCase().trim();
    
    // Check if there's a number in the query (including scientific notation)
    // Examples: "20", "1.5", "2e5", "3.14e-2"
    const hasNumbers = /\d/.test(lowerSearch);
    
    // Check for connector words (to, in, into)
    const hasConnector = /\b(to|in|into)\b/.test(lowerSearch);
    
    // Check if negative number - only valid for Temperature category
    const hasNegativeNumber = /^-\d/.test(lowerSearch.trim());

    // CASE 1: NO NUMBERS
    if (!hasNumbers) {
      // A connector word is only a connector if there's text BEFORE it
      // "kg to g" = connector, "to" or "t" = just searching for units starting with "to"/"t"
      let hasRealConnector = false;
      let beforeConnector = '';
      let afterConnector = '';
      
      if (hasConnector) {
        const parts = lowerSearch.split(/\b(to|in|into)\b/);
        beforeConnector = parts[0]?.trim() || '';
        afterConnector = parts.slice(2).join('').trim() || '';
        
        // Only treat as connector if there's text BEFORE the connector word
        hasRealConnector = beforeConnector.length > 0;
      }
      
      // Sub-case 1a: Has real connector with text before it (e.g., "kg to g", "ton in lb")
      if (hasRealConnector) {
        return items.filter((item) => {
          const fromSymbolLower = item.fromSymbol.toLowerCase();
          const fromNameLower = item.fromName.toLowerCase();
          const toSymbolLower = item.toSymbol.toLowerCase();
          const toNameLower = item.toName.toLowerCase();

          // Must match from unit
          const matchesFrom = 
            fromSymbolLower.startsWith(beforeConnector) ||
            fromNameLower.startsWith(beforeConnector);

          if (!matchesFrom) return false;

          // If no to unit yet, show all conversions from this unit
          if (!afterConnector) return true;

          // Must match to unit
          return (
            toSymbolLower.startsWith(afterConnector) ||
            toNameLower.startsWith(afterConnector)
          );
        });
      }

      // Sub-case 1b: No connector (e.g., "t", "to", "ton", "time", "mass", "weight")
      const searchText = lowerSearch.trim();
      
      if (!searchText) {
        return items;
      }

      const filtered = items.filter((item) => {
        const categoryLower = item.category.toLowerCase();
        const fromSymbolLower = item.fromSymbol.toLowerCase();
        const fromNameLower = item.fromName.toLowerCase();

        // Simple startsWith matching on:
        // 1. Category name
        // 2. From unit symbol
        // 3. From unit name
        // 4. Category keywords (synonyms like "weight", "distance", "money")
        const matches = (
          categoryLower.startsWith(searchText) ||
          fromSymbolLower.startsWith(searchText) ||
          fromNameLower.startsWith(searchText) ||
          item.keywordsLower.some((keyword) => keyword.startsWith(searchText))
        );
        
        return matches;
      });
      
      console.log('[Combobox Filter] Query:', searchText, 'Results:', filtered.length, 'of', items.length);
      return filtered;
    }

    // CASE 2: HAS NUMBERS, NO CONNECTOR
    // User typing: "20", "20 k", "20 kg", "1e5 m", "-20 celsius"
    if (hasNumbers && !hasConnector) {
      // Extract just the text part (remove numbers, scientific notation, signs)
      // Keep minus sign only if followed immediately by digit (for negative temp check)
      const textPart = lowerSearch.replace(/[-+]?[\d.,]+(?:[eE][-+]?\d+)?/g, '').replace(/\s+/g, ' ').trim();
      
      if (!textPart) {
        // Just a number, show everything
        return items;
      }

      return items.filter((item) => {
        const fromSymbolLower = item.fromSymbol.toLowerCase();
        const fromNameLower = item.fromName.toLowerCase();
        
        // If negative number, only show Temperature category
        if (hasNegativeNumber && item.category !== 'Temperature') {
          return false;
        }

        // Match from unit only
        return (
          fromSymbolLower.startsWith(textPart) ||
          fromNameLower.startsWith(textPart)
        );
      });
    }

    // CASE 3: HAS NUMBERS AND CONNECTOR
    // User typing: "20 kg to", "20 kg to g", "20 kg to gra", "1e5 m to km", "-20 celsius to f"
    if (hasNumbers && hasConnector) {
      // Split by connector word
      const parts = lowerSearch.split(/\b(to|in|into)\b/);
      const beforeConnector = parts[0] || '';
      const afterConnector = parts.slice(2).join('').trim() || '';

      // Extract from unit (text after number, before connector)
      // Remove numbers, scientific notation, extra spaces
      const fromUnitText = beforeConnector.replace(/[-+]?[\d.,]+(?:[eE][-+]?\d+)?/g, '').replace(/\s+/g, ' ').trim();
      
      // Extract to unit (text after connector)
      const toUnitText = afterConnector.replace(/[-+]?[\d.,]+(?:[eE][-+]?\d+)?/g, '').replace(/\s+/g, ' ').trim();

      return items.filter((item) => {
        const fromSymbolLower = item.fromSymbol.toLowerCase();
        const fromNameLower = item.fromName.toLowerCase();
        const toSymbolLower = item.toSymbol.toLowerCase();
        const toNameLower = item.toName.toLowerCase();

        // If negative number, only show Temperature category
        if (hasNegativeNumber && item.category !== 'Temperature') {
          return false;
        }

        // Must match from unit
        const matchesFrom = 
          fromSymbolLower.startsWith(fromUnitText) ||
          fromNameLower.startsWith(fromUnitText);

        if (!matchesFrom) return false;

        // If no to unit typed yet, show all conversions from this unit
        if (!toUnitText) return true;

        // Must match to unit
        return (
          toSymbolLower.startsWith(toUnitText) ||
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

    return normalizedItems.sort((a, b) => {
      // 1. Sort by category rank first
      const rankDiff = rankOf(a.category) - rankOf(b.category);
      if (rankDiff !== 0) return rankDiff;

      // 2. Within same category, prioritize items where FROM unit starts with search
      if (searchText) {
        const aFromLower = a.fromSymbol.toLowerCase();
        const bFromLower = b.fromSymbol.toLowerCase();
        const aFromNameLower = a.fromName.toLowerCase();
        const bFromNameLower = b.fromName.toLowerCase();
        
        const aFromMatches = aFromLower.startsWith(searchText) || aFromNameLower.startsWith(searchText);
        const bFromMatches = bFromLower.startsWith(searchText) || bFromNameLower.startsWith(searchText);
        
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
    (event: React.UIEvent<HTMLDivElement>) => {
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

  const shouldAttemptParsing = React.useCallback(
    (query: string) => {
      if (!query) return false;
      const sanitized = query.replace(CONNECTOR_TOKEN_REGEX, ' ');
      return LETTER_REGEX.test(sanitized);
    },
    [],
  );

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
    const option = containerRef.current?.querySelector<HTMLButtonElement>(
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
      const normalized = normalizeInput(query);
      if (!LETTER_REGEX.test(normalized.replace(CONNECTOR_TOKEN_REGEX, ' '))) return false;

      const parsed = parseConversionQuery(normalized);
      console.log('finder parse manual', normalized, parsed);
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

      if (event.key === 'Enter') {
        const hasHighlight =
          highlightedIndex >= 0 && highlightedIndex < displayItems.length;
        if (!hasHighlight && query && tryParse(query)) {
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


  const activeDescendant =
    highlightedIndex >= 0 && highlightedIndex < displayItems.length
      ? `conversion-option-${highlightedIndex}`
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
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          aria-activedescendant={activeDescendant}
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border/60 bg-[hsl(var(--control-background))] shadow-xl">
          {displayItems.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No conversion found.</p>
          ) : (
            <div
              ref={listContainerRef}
              className="max-h-80 overflow-y-auto"
              onScroll={handleScroll}
              role="presentation"
            >
              <ul
                id={listId}
                className="divide-y divide-border/60"
                role="listbox"
                aria-label="Conversion results"
              >
                {displayItems.map((item, index) => {
                  const isHighlighted = highlightedIndex === index;
                  const isSelected = value === item.value;

                  return (
                    <li key={item.value}>
                      <button
                        type="button"
                        id={`conversion-option-${index}`}
                        data-option-index={index}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition focus:outline-none',
                          isHighlighted ? 'bg-primary/10 text-foreground' : 'hover:bg-primary/10',
                        )}
                        onMouseEnter={() => {
                          setAutoHighlightedValue(null);
                          setHighlightedIndex(index);
                        }}
                        onClick={() => handleSelect(item.value)}
                        role="option"
                        aria-selected={isSelected}
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
                        <div className="ml-auto flex items-center gap-2">
                          <Link
                            href={item.pairUrl}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:border-primary/70 hover:text-primary"
                            aria-label={`Open ${item.fromName} to ${item.toName} reference`}
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
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

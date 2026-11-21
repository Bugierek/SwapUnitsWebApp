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
  stripConnectorWords,
  type ParsedConversionPayload,
} from '@/lib/conversion-query-parser';
import {
  LETTER_REGEX,
  filterFinderItems,
  getFinderItemNote,
  getFinderReadings,
  getSameUnitMessage,
  isPureNumericQuery,
  isSameUnitPairQuery,
  normalizeFinderInput,
  orderFinderCategories,
  sortFinderItems,
  type ConversionComboboxItem,
} from '@/lib/finder-suggestions';

const LEXER_NUMBER_RE = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/;
const findLeadingNumericValue = (value: string): number => {
  const sanitized = value.replace(/,/g, '').replace(/\s+/g, ' ').trim();
  const match = sanitized.match(LEXER_NUMBER_RE);
  return match ? Number(match[0]) : NaN;
};

export type { ConversionComboboxItem } from '@/lib/finder-suggestions';

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

const INITIAL_VISIBLE_ITEMS = 50;
const LOAD_INCREMENT = 50;

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
      : normalizeFinderInput(presetQuery);
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
  const normalizedSearch = React.useMemo(() => normalizeFinderInput(trimmedSearch), [trimmedSearch]);

  const baseItems = React.useMemo(
    () => filterFinderItems(items, normalizedSearch),
    [items, normalizedSearch],
  );

  const orderedCategories = React.useMemo(() => orderFinderCategories(items), [items]);

  // What the typed units mean ("N/mm²" -> MPa), for the hint on rows listed because of it.
  const finderReadings = React.useMemo(() => getFinderReadings(normalizedSearch), [normalizedSearch]);

  const sortedItems = React.useMemo(
    () => sortFinderItems(baseItems, orderedCategories, normalizedSearch),
    [baseItems, orderedCategories, normalizedSearch],
  );

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

      const normalized = normalizeFinderInput(query);
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
      const query = normalizeFinderInput(rawValue);

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
          // Phone keyboards capitalise the first letter, which changes what some symbols mean
          // ("mw" -> "Mw", "nm" -> "Nm" = newton metre, "cal" -> "Cal" = kilocalorie).
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
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
            <p role="status" className="px-4 py-6 text-sm text-muted-foreground">
              {getSameUnitMessage(normalizedSearch) ?? 'No conversion found.'}
            </p>
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
                const note = getFinderItemNote(item, finderReadings);

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
                        {note && (
                          <span className="truncate text-xs font-medium text-primary-text">{note}</span>
                        )}
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

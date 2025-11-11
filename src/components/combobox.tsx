'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnitCategory } from '@/types';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UnitIcon } from './unit-icon';
import { parseConversionQuery } from '@/lib/conversion-query-parser';

type ConversionComboboxItem = {
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
};

export interface ConversionComboboxProps {
  items: ConversionComboboxItem[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputId?: string;
  disabled?: boolean;
  triggerClassName?: string;
  onParsedConversion?: (payload: {
    category: UnitCategory;
    fromUnit: string;
    toUnit: string;
    value: number;
  }) => void;
  onParseError?: (message: string) => void;
}

const CONNECTOR_REGEX = /\b(to|into|in)\b/i;
const CONNECTOR_TOKEN_REGEX = /\b(to|into|in)\b/gi;
const LETTER_REGEX = /[a-zA-Z°µμ]/;
const INITIAL_VISIBLE = 200;
const LOAD_INCREMENT = 120;
const CONNECTOR_TERMS = new Set(['to', 'in', 'into']);

function normalizeInput(value: string): string {
  const withArrowsNormalized = value.replace(/(->|=>|→)/gi, ' to ');
  const withConnectorsSpaced = withArrowsNormalized.replace(/(to|into|in)(?=$|[^a-zA-Z°µμ])/gi, ' $1 ');

  const withSpacing = withConnectorsSpaced
    .replace(/(\d)(?=[A-Za-z°µµ])/g, (match, digit: string, offset: number, original: string) => {
      const next = original[offset + 1];
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

  return withSpacing.replace(/\s+/g, ' ').trim();
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
}: ConversionComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [committedInput, setCommittedInput] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_VISIBLE);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const listId = React.useId();
  const generatedInputId = React.useId();
  const resolvedInputId = inputId ?? generatedInputId;

  const trimmedSearch = search.trim();
  const normalizedSearch = React.useMemo(() => normalizeInput(trimmedSearch), [trimmedSearch]);
  const sanitizedForLetters = normalizedSearch.replace(CONNECTOR_TOKEN_REGEX, ' ');
  const hasUnitCharacters = LETTER_REGEX.test(sanitizedForLetters);

  const baseItems = React.useMemo(() => {
    if (!normalizedSearch || !hasUnitCharacters) {
      return items;
    }

    const terms = normalizedSearch
      .toLowerCase()
      .split(/\s+/)
      .filter(
        (term) =>
          term &&
          LETTER_REGEX.test(term) &&
          !CONNECTOR_TERMS.has(term),
      );

    if (terms.length === 0) {
      return items;
    }

    return items.filter((item) =>
      terms.every((term) => item.keywordsLower.some((keyword) => keyword.includes(term))),
    );
  }, [items, normalizedSearch, hasUnitCharacters]);

  React.useEffect(() => {
    setVisibleCount((prev) => {
      const next = Math.min(INITIAL_VISIBLE, baseItems.length || INITIAL_VISIBLE);
      return prev === next ? prev : next;
    });
  }, [baseItems]);

  const visibleItems = React.useMemo(
    () => baseItems.slice(0, visibleCount),
    [baseItems, visibleCount],
  );

  const hasMoreItems = visibleCount < baseItems.length;

  const displayValue = open ? search : committedInput;

  const closeDropdown = React.useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const handleSelect = React.useCallback(
    (selectedValue: string) => {
      const match = items.find((item) => item.value === selectedValue);
      onChange(selectedValue);
      setCommittedInput(match?.label ?? '');
      setSearch(match?.label ?? '');
      closeDropdown();
    },
    [closeDropdown, items, onChange],
  );

  const handleParsedSelection = React.useCallback(
    ({
      category,
      fromUnit,
      toUnit,
      value: parsedValue,
    }: {
      category: UnitCategory;
      fromUnit: string;
      toUnit: string;
      value: number;
    }, typedQuery: string) => {
      onParsedConversion?.({ category, fromUnit, toUnit, value: parsedValue });

      const matchingItem = items.find(
        (item) =>
          item.category === category &&
          item.fromSymbol === fromUnit &&
          item.toSymbol === toUnit,
      );

      if (matchingItem) {
        handleSelect(matchingItem.value);
        setCommittedInput(typedQuery);
        setSearch(typedQuery);
        return;
      }

      setCommittedInput(typedQuery);
      setSearch(typedQuery);
      closeDropdown();
    },
    [closeDropdown, handleSelect, items, onParsedConversion],
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

  React.useEffect(() => {
    if (!open || visibleItems.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    setHighlightedIndex((prev) => {
      if (prev < 0 || prev >= visibleItems.length) {
        return 0;
      }
      return prev;
    });
  }, [open, visibleItems.length]);

  React.useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const option = containerRef.current?.querySelector<HTMLButtonElement>(
      `[data-option-index="${highlightedIndex}"]`,
    );
    option?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  const increaseVisible = React.useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + LOAD_INCREMENT, baseItems.length));
  }, [baseItems.length]);

  React.useEffect(() => {
    if (!open) return;
    const viewport = containerRef.current?.querySelector<HTMLDivElement>(
      '[data-radix-scroll-area-viewport]',
    );
    if (!viewport) return;
    viewportRef.current = viewport;

    const handleScroll = () => {
      if (!viewportRef.current || !hasMoreItems) return;
      const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 40) {
        increaseVisible();
      }
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [increaseVisible, hasMoreItems, open]);

  const tryParse = React.useCallback(
    (query: string) => {
      if (!onParsedConversion && !onParseError) return false;
      const normalized = normalizeInput(query);
      if (!LETTER_REGEX.test(normalized.replace(CONNECTOR_TOKEN_REGEX, ' '))) return false;
      if (!CONNECTOR_REGEX.test(normalized)) return false;

      const parsed = parseConversionQuery(normalized);
      if (parsed.ok) {
        handleParsedSelection(
          {
            category: parsed.category,
            fromUnit: parsed.fromUnit,
            toUnit: parsed.toUnit,
            value: parsed.value,
          },
          normalized,
        );
        return true;
      }

      onParseError?.(parsed.error);
      return false;
    },
    [handleParsedSelection, onParsedConversion, onParseError],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const rawValue = event.currentTarget.value;
      const query = normalizeInput(rawValue);

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!open) setOpen(true);
        if (!visibleItems.length) return;
        setHighlightedIndex((prev) =>
          prev < 0 || prev + 1 >= visibleItems.length ? 0 : prev + 1,
        );
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!visibleItems.length) return;
        setHighlightedIndex((prev) =>
          prev <= 0 ? visibleItems.length - 1 : prev - 1,
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
          highlightedIndex >= 0 && highlightedIndex < visibleItems.length;

        if (query && tryParse(query)) {
          event.preventDefault();
          return;
        }

        if (hasHighlight) {
          event.preventDefault();
          handleSelect(visibleItems[highlightedIndex].value);
        }
      }
    },
    [closeDropdown, committedInput, handleSelect, highlightedIndex, open, tryParse, visibleItems],
  );

  const activeDescendant =
    highlightedIndex >= 0 && highlightedIndex < visibleItems.length
      ? `conversion-option-${highlightedIndex}`
      : undefined;

  return (
    <div ref={containerRef} className={cn('relative', triggerClassName)}>
      <Input
        ref={inputRef}
        type="text"
        id={resolvedInputId}
        name={resolvedInputId}
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => {
          setOpen(true);
          setSearch(committedInput);
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        onChange={(event) => {
          setSearch(event.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="h-11 w-full rounded-xl border border-border/60 bg-[hsl(var(--control-background))] px-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeDescendant}
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border/60 bg-[hsl(var(--control-background))] shadow-xl">
          {visibleItems.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No conversion found.</p>
          ) : (
            <ScrollArea className="max-h-80 overflow-y-auto">
              <ul
                id={listId}
                className="divide-y divide-border/60"
                role="listbox"
                aria-label="Conversion results"
              >
                {visibleItems.map((item, index) => {
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
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => handleSelect(item.value)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <UnitIcon
                          category={item.category}
                          className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
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
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronsUpDown } from 'lucide-react';

import type { UnitCategory } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { UnitIcon } from '@/components/unit-icon';
import { useRouter } from 'next/navigation';

export type MeasurementCategoryOption = {
  value: UnitCategory;
  title: string;
  slug: string;
  topUnits: string;
  keywords: string[];
};

type MeasurementCategoryDropdownProps = {
  options: MeasurementCategoryOption[];
  value?: UnitCategory | '';
  placeholder?: string;
  onSelect: (value: UnitCategory) => void;
  triggerClassName?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick' | 'value'>;

export const MeasurementCategoryDropdown = React.forwardRef<HTMLButtonElement, MeasurementCategoryDropdownProps>(
  (
    {
      options,
      value,
      placeholder = 'Select a category',
      onSelect,
      triggerClassName,
      ...triggerProps
    },
    ref,
  ) => {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const internalTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [contentWidth, setContentWidth] = React.useState<number | undefined>(undefined);

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  React.useLayoutEffect(() => {
    if (open) {
      setContentWidth(internalTriggerRef.current?.offsetWidth ?? undefined);
    } else {
      setSearch('');
    }
  }, [open]);

  const handleSelect = React.useCallback(
    (nextValue: UnitCategory) => {
      onSelect(nextValue);
      setOpen(false);
    },
    [onSelect],
  );

  const mergedTriggerRef = React.useMemo(() => {
    return (node: HTMLButtonElement | null) => {
      internalTriggerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }
    };
  }, [ref]);

  const { className: triggerClassNameProp, ...restTriggerProps } = triggerProps;

  const normalizedQuery = search.trim().toLowerCase();
  const filteredOptions = React.useMemo(() => {
    if (!normalizedQuery) return options;
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return options;
    return options.filter((option) =>
      tokens.every((token) =>
        option.keywords.some((keyword) => keyword.includes(token) || token.includes(keyword)),
      ),
    );
  }, [normalizedQuery, options]);

  const popoverWidth = contentWidth ?? internalTriggerRef.current?.offsetWidth ?? undefined;
  const maxHeight = filteredOptions.length > 4 ? 360 : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={mergedTriggerRef}
          type="button"
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-white px-3 py-2.5 text-left text-sm font-medium text-foreground transition hover:border-primary/50 focus:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20',
            triggerClassNameProp,
            triggerClassName,
          )}
          aria-haspopup="dialog"
          aria-expanded={open}
          {...restTriggerProps}
        >
          {selectedOption ? (
            <span className="flex items-center gap-2">
              <UnitIcon category={selectedOption.value} className="h-4 w-4" aria-hidden="true" />
              {selectedOption.title}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        avoidCollisions={false}
        style={{ width: popoverWidth, maxHeight }}
        className="z-50 w-[min(360px,90vw)] max-h-[360px] overflow-hidden rounded-2xl border border-border/60 bg-white p-0 shadow-xl"
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-hidden">
            <div className="sticky top-0 z-10 border-b border-border/60 bg-white px-3 pb-2 pt-3">
              <Input
                placeholder="Filter measurement types..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 rounded-lg border border-border/50 bg-white px-3 text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto px-3 pb-3">
              {filteredOptions.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No matching categories.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {filteredOptions.map((option) => {
                    const isSelected = option.value === value;
                    return (
                      <div
                        key={option.value}
                        className={cn(
                          'relative flex h-[82px] w-full flex-col gap-1 overflow-hidden rounded-xl border border-border/50 bg-white px-3 py-2 text-sm font-medium text-foreground shadow-sm transition duration-150 ease-out hover:border-primary/40 hover:bg-primary/5 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 sm:h-[110px] sm:gap-3 sm:px-4 sm:py-3',
                          isSelected && 'border-primary/60 bg-primary/5',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelect(option.value)}
                          className="flex flex-1 flex-col items-start text-left"
                        >
                          <span className="flex items-center gap-2">
                            <UnitIcon category={option.value} className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                            <span className="block font-semibold text-foreground">{option.title}</span>
                          </span>
                          {option.topUnits && (
                            <span className="mt-2 line-clamp-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground leading-tight sm:mt-4 sm:leading-snug">
                              {option.topUnits}
                            </span>
                          )}
                        </button>
                        <Link
                          href={`/measurements/${option.slug}`}
                          prefetch={false}
                          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                          aria-label={`Open ${option.title} reference page`}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setOpen(false);
                          router.push(`/measurements/${option.slug}`);
                        }}
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

MeasurementCategoryDropdown.displayName = 'MeasurementCategoryDropdown';

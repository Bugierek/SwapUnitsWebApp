
'use client';

import * as React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import type { MeasurementCategoryOption } from '@/components/measurement-category-dropdown';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { unitData, getUnitsForCategory, categoryDisplayOrder } from '@/lib/unit-data';
import type { UnitCategory, ConversionResult, Preset, NumberFormat, ConversionHistoryItem, FavoriteItem } from '@/types';
import {
  Copy,
  Star,
  Calculator,
  ChevronRight,
  ChevronsUpDown,
  ArrowUpRight,
  Check,
  Info,
  Search,
} from 'lucide-react';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useIsCoarsePointer } from '@/hooks/use-pointer-capabilities';
import { cn } from '@/lib/utils';
import { copyTextToClipboard } from '@/lib/copy-to-clipboard';
import { useImperativeHandle, forwardRef } from 'react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ConversionComboboxProps, ConversionComboboxItem } from './combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import SimpleCalculator from '@/components/simple-calculator';
import { getCategorySlug } from '@/lib/category-info';
import { convertNumericValue, convertUnitsDetailed } from '@/lib/conversion-math';
import { buildConversionPairUrl } from '@/lib/conversion-pairs';
import { getAliasesForUnit, parseConversionQuery } from '@/lib/conversion-query-parser';
import type { ParsedConversionPayload } from '@/lib/conversion-query-parser';
import { ALL_SI_PREFIXES } from '@/lib/si-prefixes';
import { getConversionSources } from '@/lib/conversion-sources';
import { getCategoryDefaultPair } from '@/lib/category-defaults';
import { CATEGORY_KEYWORDS } from '@/lib/category-keywords';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type CurrencyCode, type FxRatesResponse } from '@/lib/fx';
import { AccordionTabs, type AccordionTabItem } from '@/components/accordion-tabs';
import {
  formatConversionValue,
  formatScientificValue,
  getDecimalPrecisionFromInput,
  precisionBoostFromDecimalPlaces,
  type PrecisionMode,
} from '@/lib/number-format';

const formSchema = z.object({
  category: z.string().min(1, "Please select a category"),
  fromUnit: z.string().min(1, "Please select an input unit"),
  toUnit: z.string().min(1, "Please select an output unit"),
  value: z.union([
    z.literal(''),
    z.number(),
    z.nan(),
  ]).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface UnitConverterProps {
  className?: string;
  onResultCopied?: (data: {
    category: UnitCategory;
    fromValue: number;
    fromUnit: string;
    toValue: number;
    toUnit: string;
  }) => void;
  onSaveFavorite?: (favoriteData: Omit<FavoriteItem, 'id'>) => void;
  disableAddFavoriteButton?: boolean;
  initialCategory?: UnitCategory;
  initialFromUnit?: string;
  initialToUnit?: string;
  initialValue?: number;
  favorites?: FavoriteItem[];
  onToggleFavorite?: (favoriteData: Omit<FavoriteItem, 'id'>) => void;
}

export interface UnitConverterHandle {
  handlePresetSelect: (preset: Preset | FavoriteItem) => void;
  applyHistorySelect: (item: ConversionHistoryItem) => void;
  focusFinder: () => void;
}

const CATEGORY_TILE_TITLES: Partial<Record<UnitCategory, string>> = {
  'Fuel Economy': 'Fuel efficiency',
  'Data Transfer Rate': 'Bandwidth',
  Currency: 'Currency',
};

const CATEGORY_TILE_SECONDARY_LIMIT: Partial<Record<UnitCategory, number>> = {
  'Fuel Economy': 2,
  'Data Transfer Rate': 2,
};

const LONG_UNIT_NAMES = new Set([
  'Watt-hour per kilometer',
  'Watt-hour per mile',
  'Kilometer per kilowatt-hour',
  'Mile per kilowatt-hour',
  'Kilocalorie (food)',
]);

const MAX_UNIT_LABEL_LENGTH = 24;
const PREFER_ABBREVIATED_UNIT_LABELS = true;
const shouldAbbreviateUnit = (unit: { name: string; symbol: string }) => {
  return (
    unit.name.length > MAX_UNIT_LABEL_LENGTH ||
    LONG_UNIT_NAMES.has(unit.name)
  );
};

const FINDER_VALUE_EXAMPLES = ['12 kg in mg', '5 kPa to atm', '100 L in mL', '3 h in s', '110 USD to EUR'];

const FINDER_UNIT_EXAMPLES = [
  'mile to meter',
  'cm to ft',
  'psi to kPa',
  '°C to °F',
  'micro to milli',
  'mph to km/h',
  'EUR to GBP',
];

const FINDER_CATEGORY_EXAMPLES = ['energy', 'pressure', 'length', 'bitcoin', 'bandwidth', 'speed', 'currency'];

const formatNumber = (
  num: number,
  requestedFormat: NumberFormat = 'normal',
  precisionHint?: number | null,
  precisionMode: PrecisionMode = 'rounded',
): {
  formattedString: string;
  actualFormatUsed: NumberFormat;
  scientificReason: 'magnitude' | 'user_choice' | null;
  roundedValue: number | undefined;
} => {
  if (!isFinite(num)) {
    return { formattedString: '-', actualFormatUsed: requestedFormat, scientificReason: null, roundedValue: undefined };
  }

  if (requestedFormat === 'scientific') {
    return {
      formattedString: formatScientificValue(num, 7, 'e'),
      actualFormatUsed: 'scientific',
      scientificReason: 'user_choice',
      roundedValue: num,
    };
  }

  const precisionBoost = precisionBoostFromDecimalPlaces(precisionHint, 3);
  const { formatted, usedScientificNotation, roundedValue } = formatConversionValue(num, {
    precisionBoost,
    scientificStyle: 'e',
    precisionMode,
  });

  return {
    formattedString: formatted,
    actualFormatUsed: usedScientificNotation ? 'scientific' : 'normal',
    scientificReason: usedScientificNotation ? 'magnitude' : null,
    roundedValue: roundedValue ?? num,
  };
};

const formatFromValue = (num: number | undefined, precisionMode: PrecisionMode): string => {
  if (num === undefined || !isFinite(num)) {
    return '-';
  }
  return formatConversionValue(num, {
    precisionBoost: 0,
    scientificStyle: 'e',
    precisionMode,
  }).formatted;
};


export const UnitConverter = React.memo(forwardRef<UnitConverterHandle, UnitConverterProps>(function UnitConverterComponent(
  {
    className,
    onResultCopied,
    onSaveFavorite: onSaveFavoriteProp,
    disableAddFavoriteButton = false,
    initialCategory = 'Mass',
    initialFromUnit,
    initialToUnit,
    initialValue = 1,
    favorites = [],
    onToggleFavorite,
  },
  ref,
) {
  const defaultCategory = initialCategory as UnitCategory;
  const defaultUnits = getUnitsForCategory(defaultCategory);
  const resolvedFromUnit = initialFromUnit ?? defaultUnits[0]?.symbol ?? '';
  const resolvedToUnit = initialToUnit
    ?? defaultUnits.find((unit) => unit.symbol !== resolvedFromUnit)?.symbol
    ?? resolvedFromUnit;
  const resolvedValue = Number.isFinite(initialValue) ? initialValue : 1;

  const [selectedCategoryLocal, setSelectedCategoryLocal] = React.useState<UnitCategory | ''>(defaultCategory);
  const [ComboboxComponent, setComboboxComponent] = React.useState<React.ComponentType<ConversionComboboxProps> | null>(null);
  const initialConversion = React.useMemo(() =>
    convertUnitsDetailed({
      category: defaultCategory,
      fromUnit: resolvedFromUnit,
      toUnit: resolvedToUnit,
      value: resolvedValue,
    }), [defaultCategory, resolvedFromUnit, resolvedToUnit, resolvedValue]);

  const [conversionResult, setConversionResult] = React.useState<ConversionResult | null>(initialConversion);
  const [lastValidInputValue, setLastValidInputValue] = React.useState<number | undefined>(resolvedValue);
  const [numberFormat, setNumberFormat] = React.useState<NumberFormat>('normal');
  const [precisionMode, setPrecisionMode] = React.useState<PrecisionMode>('rounded');
  const [isNormalFormatDisabled, setIsNormalFormatDisabled] = React.useState<boolean>(false);
  const [fxRates, setFxRates] = React.useState<FxRatesResponse | null>(null);
  const [isFetchingFx, setIsFetchingFx] = React.useState(false);
  const fxErrorRef = React.useRef<string | null>(null);
  const fxLastAttemptRef = React.useRef<number | null>(null);
  const FX_RETRY_COOLDOWN_MS = 5000;
  const prefersTouch = useIsCoarsePointer();
  const isTouch = prefersTouch;
  const measurementCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const fromTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const toTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [abbreviateFromTrigger, setAbbreviateFromTrigger] = React.useState(false);
  const [abbreviateToTrigger, setAbbreviateToTrigger] = React.useState(false);
  const [fromTriggerWidth, setFromTriggerWidth] = React.useState<number | null>(null);
  const [toTriggerWidth, setToTriggerWidth] = React.useState<number | null>(null);
  const [fromMenuOpen, setFromMenuOpen] = React.useState(false);
  const [fromFieldFocused, setFromFieldFocused] = React.useState(false);
  const [fromCalcHover, setFromCalcHover] = React.useState(false);
  const [fromCalcButtonFocused, setFromCalcButtonFocused] = React.useState(false);
  const [fromMenuCategory, setFromMenuCategory] = React.useState<UnitCategory | null>(null);
  const [toMenuOpen, setToMenuOpen] = React.useState(false);
  const [toMenuCategory, setToMenuCategory] = React.useState<UnitCategory | null>(null);
  const [toFieldFocused, setToFieldFocused] = React.useState(false);
  const [toCopyHover, setToCopyHover] = React.useState(false);
  const [fromMenuMaxHeight, setFromMenuMaxHeight] = React.useState<number | null>(null);
  const [toMenuMaxHeight, setToMenuMaxHeight] = React.useState<number | null>(null);
  const [menuScrollState, setMenuScrollState] = React.useState({
    from: { atTop: true, atBottom: false, scrollable: false },
    to: { atTop: true, atBottom: false, scrollable: false },
  });
  const fromMenuListRef = React.useRef<HTMLDivElement | null>(null);
  const toMenuListRef = React.useRef<HTMLDivElement | null>(null);
  const [fromUnitFilter, setFromUnitFilter] = React.useState('');
  const [toUnitFilter, setToUnitFilter] = React.useState('');
  const [isSwapped, setIsSwapped] = React.useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    mode: 'onChange',
    defaultValues: {
      category: defaultCategory,
      fromUnit: resolvedFromUnit,
      toUnit: resolvedToUnit,
      value: resolvedValue,
    },
  });

  const { watch, setValue, reset, getValues, formState: { errors } } = form;
  const maybeApplyCurrencyConversion = React.useCallback((fxData: FxRatesResponse) => {
    const formValues = getValues();
    const { category, fromUnit, toUnit, value } = formValues;
    if (
      category !== 'Currency' ||
      !fromUnit ||
      !toUnit ||
      value === undefined ||
      value === null ||
      String(value).trim() === ''
    ) {
      return;
    }
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;
    const result = convertUnitsDetailed({
      category: 'Currency',
      fromUnit,
      toUnit,
      value: numericValue,
      fxContext: { base: fxData.base as CurrencyCode, rates: fxData.rates },
    });
    setConversionResult(result);
  }, [getValues]);
  const rhfCategory = watch("category") as UnitCategory | "";
  const rhfFromUnit = watch("fromUnit");
  const rhfToUnit = watch("toUnit");
  const fxStatusMessage = React.useMemo(() => {
    if (rhfCategory !== 'Currency') return null;
    if (fxErrorRef.current) return fxErrorRef.current;
    if (!fxRates) return 'Loading latest FX rates (Frankfurter, updated daily ~16:00 CET)...';
    return null;
  }, [fxRates, rhfCategory]);
  const computeMenuMaxHeight = React.useCallback((triggerEl: HTMLButtonElement | null) => {
    if (typeof window === 'undefined' || !triggerEl) return null;
    const rect = triggerEl.getBoundingClientRect();
    const padding = 16;
    const availableBelow = window.innerHeight - rect.bottom - padding;
    const availableAbove = rect.top - padding;
    const available = Math.max(availableBelow, availableAbove);
    const clamped = Math.max(240, Math.min(available, 520));
    return clamped;
  }, []);

  const updateMenuScrollState = React.useCallback((side: 'from' | 'to', target: HTMLElement) => {
    const atTop = target.scrollTop <= 1;
    const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 1;
    const scrollable = target.scrollHeight - target.clientHeight > 1;
    setMenuScrollState((prev) => ({
      ...prev,
      [side]: { atTop, atBottom, scrollable },
    }));
  }, []);

  const refreshMenuScrollState = React.useCallback(
    (side: 'from' | 'to') => {
      const ref = side === 'from' ? fromMenuListRef.current : toMenuListRef.current;
      if (ref) {
        updateMenuScrollState(side, ref);
      }
    },
    [updateMenuScrollState],
  );

  React.useEffect(() => {
    if (!fromMenuOpen) {
      setFromMenuMaxHeight(null);
      return;
    }
    const maxHeight = computeMenuMaxHeight(fromTriggerRef.current);
    setFromMenuMaxHeight(maxHeight);
    requestAnimationFrame(() => refreshMenuScrollState('from'));
  }, [fromMenuOpen, computeMenuMaxHeight, refreshMenuScrollState]);

  React.useEffect(() => {
    if (!toMenuOpen) {
      setToMenuMaxHeight(null);
      return;
    }
    const maxHeight = computeMenuMaxHeight(toTriggerRef.current);
    setToMenuMaxHeight(maxHeight);
    requestAnimationFrame(() => refreshMenuScrollState('to'));
  }, [toMenuOpen, computeMenuMaxHeight, refreshMenuScrollState]);
  const hasToggleFavorites = typeof onToggleFavorite === 'function';
  const getUnitDisplayName = React.useCallback(
    (category: UnitCategory | "", symbol: string) => {
      if (!category) return symbol;
      const units = unitData[category]?.units ?? [];
      return units.find((unit) => unit.symbol === symbol)?.name ?? symbol;
    },
    [],
  );
  const activeFavorite = React.useMemo(() => {
    if (!hasToggleFavorites || !rhfCategory || !rhfFromUnit || !rhfToUnit) {
      return undefined;
    }
    return favorites.find(
      (fav) =>
        fav.category === rhfCategory &&
        fav.fromUnit === rhfFromUnit &&
        fav.toUnit === rhfToUnit,
    );
  }, [favorites, hasToggleFavorites, rhfCategory, rhfFromUnit, rhfToUnit]);
  const baseSaveDisabled = !rhfCategory || !rhfFromUnit || !rhfToUnit;
  const finalSaveDisabled = hasToggleFavorites ? baseSaveDisabled : baseSaveDisabled || disableAddFavoriteButton;
  const favoriteButtonLabel = hasToggleFavorites
    ? activeFavorite
      ? 'Remove from favorites'
      : 'Save conversion to favorites'
    : 'Save conversion to favorites';
  const rhfValue = watch("value");
  const inputPrecisionHint = React.useMemo(
    () => getDecimalPrecisionFromInput(rhfValue),
    [rhfValue],
  );
  const [resultCopyState, setResultCopyState] = React.useState<'idle' | 'success'>('idle');
  const [resultHighlightPulse, setResultHighlightPulse] = React.useState(false);
  const resultInputRef = React.useRef<HTMLInputElement | null>(null);
  const resultHighlightTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAppliedHighlightRef = React.useRef(false);
  const [fromUnitHighlight, setFromUnitHighlight] = React.useState(false);
  const [toUnitHighlight, setToUnitHighlight] = React.useState(false);
  const unitHighlightTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [finderVersion, setFinderVersion] = React.useState(0);
  const [finderPresetQuery, setFinderPresetQuery] = React.useState<string | null>(null);
  const [shouldAutoFocusFinder, setShouldAutoFocusFinder] = React.useState(false);
  const finderAutoFocusRequestedRef = React.useRef(false);
  const pendingFinderSelectionRef = React.useRef(false);
  const finderExamples = React.useMemo(() => {
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    return {
      value: pick(FINDER_VALUE_EXAMPLES),
      units: pick(FINDER_UNIT_EXAMPLES),
      category: pick(FINDER_CATEGORY_EXAMPLES),
    };
  }, []);
  const focusFromValueInput = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => {
      const input = document.getElementById('value-input') as HTMLInputElement | null;
      input?.focus();
      input?.select?.();
    });
  }, []);

  const resetFinderInput = React.useCallback(() => {
    setFinderPresetQuery(null);
    setFinderVersion((prev) => prev + 1);
  }, []);
  const [textCopyState, setTextCopyState] = React.useState<'idle' | 'success'>('idle');
  const normalizeNumericInputValue = React.useCallback((value: number | undefined): string | number | undefined => {
    if (value === undefined || value === null) {
      return value;
    }
    if (!Number.isFinite(value)) {
      return value;
    }

    const absValue = Math.abs(value);
    const requiresScientific = absValue !== 0 && (absValue >= 1e8 || absValue < 1e-7);

    if (requiresScientific) {
      const scientific = value.toExponential(7);
      return scientific.replace(/(\.\d*?[1-9])0+(e.*)/i, '$1$2').replace(/\.0+(e.*)/i, '$1');
    }

    const fixed = value.toFixed(7);
    const trimmed = fixed.replace(/\.?0+$/, '');
    const [intPartRaw] = trimmed.split('.');
    if (intPartRaw.replace('-', '').length > 8) {
      const scientific = value.toExponential(7);
      return scientific.replace(/(\.\d*?[1-9])0+(e.*)/i, '$1$2').replace(/\.0+(e.*)/i, '$1');
    }
    return trimmed || '0';
  }, []);
  const currentConversionPairUrl = React.useMemo(() => {
    if (!rhfCategory || !rhfFromUnit || !rhfToUnit) {
      return null;
    }
    const rawValue = typeof rhfValue === 'number' ? String(rhfValue) : String(rhfValue ?? '');
    const trimmedValue = rawValue.trim();
    if (rhfCategory === 'SI Prefixes') {
      const params = new URLSearchParams({
        from: rhfFromUnit,
        to: rhfToUnit,
        value: trimmedValue,
      });
      return `/standards/nist-si-tenfold?${params.toString()}`;
    }
    const baseUrl = buildConversionPairUrl(rhfCategory as UnitCategory, rhfFromUnit, rhfToUnit);
    if (
      trimmedValue === '' ||
      trimmedValue === '-' ||
      trimmedValue === '.' ||
      trimmedValue === '-.' ||
      !Number.isFinite(Number(trimmedValue))
    ) {
      return baseUrl;
    }
    const params = new URLSearchParams({ value: trimmedValue });
    return `${baseUrl}?${params.toString()}`;
  }, [rhfCategory, rhfFromUnit, rhfToUnit, rhfValue]);

  React.useEffect(() => {
    if (!prefersTouch && ComboboxComponent && !finderAutoFocusRequestedRef.current) {
      finderAutoFocusRequestedRef.current = true;
      setShouldAutoFocusFinder(true);
    }
  }, [prefersTouch, ComboboxComponent]);

  React.useEffect(() => {
    let mounted = true;
    import('./combobox')
      .then((mod) => {
        if (mounted) {
          setComboboxComponent(() => mod.ConversionCombobox);
        }
      })
      .catch(() => {
        if (mounted) {
          setComboboxComponent(null);
        }
      });
    return () => {
      mounted = false;
    };
  }, [setComboboxComponent]);

const categoryOptions = React.useMemo<MeasurementCategoryOption[]>(() => {
    return categoryDisplayOrder
      .filter((category) => unitData[category])
      .map((category) => {
        const slug = getCategorySlug(category);
        const units = getUnitsForCategory(category);
        const secondaryLimit = CATEGORY_TILE_SECONDARY_LIMIT[category] ?? 3;
        const topUnits = units
          .slice(0, secondaryLimit)
          .map((unit) => unit.symbol)
          .join(', ');
        const keywords = new Set<string>();
        keywords.add(unitData[category].name.toLowerCase());
        keywords.add(category.toLowerCase());
        (CATEGORY_KEYWORDS[category] ?? []).forEach((keyword) =>
          keywords.add(keyword.toLowerCase()),
        );
        units.forEach((unit) => {
          keywords.add(unit.symbol.toLowerCase());
          keywords.add(unit.name.toLowerCase());
          if (unit.unitType) {
            keywords.add(unit.unitType.replace(/_/g, ' ').toLowerCase());
          }
        });
        if (category === 'SI Prefixes') {
          ALL_SI_PREFIXES.forEach((prefix) => {
            keywords.add(prefix.prefix.toLowerCase());
            keywords.add(prefix.symbol.toLowerCase());
          });
        }
        const href =
          category === 'SI Prefixes'
            ? '/standards/nist-si-tenfold'
            : `/measurements/${slug}`;
        const kind = category === 'SI Prefixes' ? 'si-prefix' : 'default';
        const title =
          category === 'SI Prefixes'
            ? 'SI Unit Prefixes'
            : CATEGORY_TILE_TITLES[category] ?? unitData[category].name;

        return {
          value: category,
          title,
          slug,
          href,
          topUnits: category === 'SI Prefixes' ? 'Decimal multiples & submultiples' : topUnits,
          keywords: Array.from(keywords),
          kind,
        };
      });
  }, []);

  const menuCategoryOptions = React.useMemo(() => {
    if (!rhfCategory) {
      return categoryOptions;
    }
    const current = categoryOptions.find((opt) => opt.value === rhfCategory);
    if (!current) {
      return categoryOptions;
    }
    const rest = categoryOptions.filter((opt) => opt.value !== rhfCategory);
    return [current, ...rest];
  }, [categoryOptions, rhfCategory]);

  const currentUnitsForCategory = React.useMemo(() => {
    if (!rhfCategory) return [];
    return getUnitsForCategory(rhfCategory);
  }, [rhfCategory]);

  const renderUnitMenuContent = (side: 'from' | 'to') => {
    const filter = side === 'from' ? fromUnitFilter : toUnitFilter;
    const setFilter = side === 'from' ? setFromUnitFilter : setToUnitFilter;
    const menuCategory = side === 'from' ? fromMenuCategory : toMenuCategory;
    const setMenuCategory = side === 'from' ? setFromMenuCategory : setToMenuCategory;
    const label = side === 'from' ? 'From unit' : 'To unit';
    const onUnitSelect =
      side === 'from' ? handleFromUnitMenuSelect : handleToUnitMenuSelect;

    const normalizeSearchString = (value: string, options: { compact?: boolean } = {}) => {
      const compact = options.compact ?? false;
      let normalized = value
        .trim()
        .toLowerCase()
        .replace(/µ/g, 'u')
        .replace(/²/g, '2')
        .replace(/³/g, '3')
        .replace(/[-_]/g, ' ');

      // add variant for " per " to "/"
      normalized = normalized.replace(/\s+per\s+/g, '/');

      if (compact) {
        normalized = normalized.replace(/[\s^]/g, '');
      }
      return normalized;
    };

    const buildFilterVariants = (raw: string) => {
      const base = normalizeSearchString(raw);
      const compactBase = normalizeSearchString(raw, { compact: true });
      const variants = new Set<string>([base]);
      if (compactBase !== base) {
        variants.add(compactBase);
      }

      // Add superscript variants for trailing digits (e.g., mm3 -> mm³, mm^3)
      const suffixMatch = base.match(/^([a-zµ]+)(\d)$/);
      if (suffixMatch) {
        const [, prefix, power] = suffixMatch;
        variants.add(`${prefix}${power}`);
        variants.add(`${prefix}^${power}`);
        if (power === '2') variants.add(`${prefix}²`);
        if (power === '3') variants.add(`${prefix}³`);
      }

      // Handle "sq"/"square" prefixes
      const sqMatch = base.match(/^sq(uare)?\s*(.*)$/);
      if (sqMatch) {
        const after = sqMatch[2] ?? '';
        variants.add(`square ${after}`.trim());
        variants.add(`sq ${after}`.trim());
      }

      // Handle "cu"/"cubic" prefixes
      const cuMatch = base.match(/^cu(bic)?\s*(.*)$/);
      if (cuMatch) {
        const after = cuMatch[2] ?? '';
        variants.add(`cubic ${after}`.trim());
        variants.add(`cu ${after}`.trim());
      }

      // Common aliases for kWh / kilowatt hour shorthand
      if (
        base === 'kwh' ||
        compactBase === 'kwh' ||
        base.includes('kilowat')
      ) {
        variants.add('kilowatt hour');
        variants.add('kilowatt-hour');
        variants.add('kwh');
      }

      // Handle caret inputs like "mm^" or "mm^2"
      if (base.includes('^')) {
        const caretStripped = base.replace(/\^+/g, '').trim();
        if (caretStripped) {
          variants.add(`${caretStripped}2`);
          variants.add(`${caretStripped}3`);
          variants.add(`square ${caretStripped}`);
          variants.add(`cubic ${caretStripped}`);
        }
      }

      return Array.from(variants).filter(Boolean);
    };

    const normalizedFilter = filter.trim().toLowerCase();
    const compactFilter = normalizeSearchString(filter, { compact: true });
    const filterVariants = buildFilterVariants(filter);

    const unitMatchesFilter = (unit: { symbol: string; name: string; keywords?: string[] }) => {
      if (!normalizedFilter) return true;
      const symbol = unit.symbol.toLowerCase();
      const name = unit.name.toLowerCase();
      const symbolPlain = normalizeSearchString(symbol, { compact: true });
      const namePlain = normalizeSearchString(name, { compact: true });
      const keywordStrings = (unit.keywords ?? []).map((k) => normalizeSearchString(k, { compact: true }));

      return filterVariants.some((variant) => {
        const variantCompact = normalizeSearchString(variant, { compact: true });
        const partial = variantCompact.length >= 4 ? variantCompact.slice(0, 4) : variantCompact;
        return (
          symbol.includes(variant) ||
          symbolPlain.includes(variant) ||
          symbolPlain.includes(partial) ||
          name.includes(variant) ||
          namePlain.includes(variant) ||
          namePlain.includes(partial) ||
          keywordStrings.some((kw) => kw.includes(variant) || kw.includes(variantCompact) || kw.includes(partial)) ||
          symbolPlain.startsWith(compactFilter) ||
          namePlain.startsWith(compactFilter)
        );
      });
    };
    const aliasCategoryHints: Record<string, UnitCategory[]> = {
      kwh: ['Energy', 'Fuel Economy'],
      kilow: ['Energy', 'Fuel Economy'],
      kilowat: ['Energy', 'Fuel Economy'],
      kilowatt: ['Energy', 'Fuel Economy'],
    };

    let filteredCategories = menuCategoryOptions
      .map((option) => {
        const units = getUnitsForCategory(option.value).filter((unit) => unitMatchesFilter(unit));
        return { option, units };
      })
      .filter(({ units }) => units.length > 0);

    // If some categories have no direct unit hits but the title/value matches, include them with full unit list.
    if (normalizedFilter) {
      menuCategoryOptions.forEach((option) => {
        const alreadyIncluded = filteredCategories.some(({ option: opt }) => opt.value === option.value);
        if (alreadyIncluded) return;
        const titleMatch = filterVariants.some((variant) => {
          const title = option.title.toLowerCase();
          const value = String(option.value).toLowerCase();
          return title.includes(variant) || value.includes(variant);
        });
        if (titleMatch) {
          filteredCategories.push({
            option,
            units: getUnitsForCategory(option.value),
          });
        }
      });
    }

    // Add alias-based category hints (e.g., kWh -> Energy and Fuel Economy)
    Object.entries(aliasCategoryHints).forEach(([hint, categories]) => {
      if (!compactFilter.includes(hint)) return;
      categories.forEach((cat) => {
        const exists = filteredCategories.some(({ option }) => option.value === cat);
        if (!exists) {
          const opt = menuCategoryOptions.find((o) => o.value === cat);
          if (opt) {
            filteredCategories.push({ option: opt, units: getUnitsForCategory(opt.value) });
          }
        }
      });
    });

    // If hints are present and any hinted categories have units, prefer only those.
    const activeHints = Object.entries(aliasCategoryHints)
      .filter(([hint]) => compactFilter.includes(hint))
      .flatMap(([, cats]) => cats);
    if (activeHints.length > 0) {
      const hinted = filteredCategories.filter(({ option }) => activeHints.includes(option.value as UnitCategory));
      if (hinted.length > 0) {
        filteredCategories = hinted;
      }
    }

    if (normalizedFilter) {
      filteredCategories = filteredCategories.sort((a, b) => {
        const countDiff = b.units.length - a.units.length;
        if (countDiff !== 0) return countDiff;
        const aTitleMatch = a.option.title.toLowerCase().includes(normalizedFilter) ? 1 : 0;
        const bTitleMatch = b.option.title.toLowerCase().includes(normalizedFilter) ? 1 : 0;
        if (aTitleMatch !== bTitleMatch) return bTitleMatch - aTitleMatch;
        if (rhfCategory) {
          if (a.option.value === rhfCategory) return -1;
          if (b.option.value === rhfCategory) return 1;
        }
        return 0;
      });
    }

    // If no units matched, fall back to the first category whose title/id matches the filter
    if (filteredCategories.length === 0 && normalizedFilter) {
      const categoryFallback = menuCategoryOptions.find((opt) =>
        filterVariants.some((variant) => {
          const title = opt.title.toLowerCase();
          const value = String(opt.value).toLowerCase();
          return title.includes(variant) || value.includes(variant);
        }),
      );
      if (categoryFallback) {
        filteredCategories = [
          {
            option: categoryFallback,
            units: getUnitsForCategory(categoryFallback.value),
          },
        ];
      }
    }

    const defaultOpenCategory =
      menuCategory ??
      (normalizedFilter
        ? filteredCategories[0]?.option.value ?? null
        : rhfCategory ?? filteredCategories[0]?.option.value ?? null);
    const menuCategoryValid = menuCategory
      ? filteredCategories.some(({ option }) => option.value === menuCategory)
      : false;
    const activeCategory = menuCategoryValid ? menuCategory : defaultOpenCategory;
    const activeCategoryEntry = filteredCategories.find(
      ({ option }) => option.value === activeCategory,
    );
    const activeCategoryUnits = activeCategoryEntry?.units ?? [];
    const fallbackCategory = filteredCategories[0];
    const displayUnitsCategory = activeCategoryEntry?.option.value ?? fallbackCategory?.option.value ?? null;
    const displayUnits =
      activeCategoryUnits.length > 0
        ? activeCategoryUnits
        : fallbackCategory?.units ?? [];
    const effectiveCategory = displayUnitsCategory;
    const selectedUnitSymbol = side === 'from' ? rhfFromUnit : rhfToUnit;

    const emptyState = (
      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={6}
        avoidCollisions={false}
        className="min-w-[14rem] max-h-[60vh] overflow-y-auto"
      >
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-1 pb-1">
          <Input
            autoFocus={!isTouch}
            placeholder="Search units…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            className="h-8 w-full rounded-md border border-border/60 bg-[hsl(var(--control-background))] px-2 text-xs"
          />
        </div>
        <div className="px-3 py-2 text-xs text-muted-foreground">No units found.</div>
      </DropdownMenuContent>
    );

    if (!filteredCategories.length) {
      return emptyState;
    }

    const menuMaxHeight = side === 'from' ? fromMenuMaxHeight : toMenuMaxHeight;
    const computedMaxHeight =
      menuMaxHeight !== null ? `${menuMaxHeight}px` : 'min(calc(100vh - 120px), 480px)';
    const listMaxHeight =
      menuMaxHeight !== null
        ? `${Math.max(menuMaxHeight - 120, 220)}px`
        : 'calc(min(calc(100vh - 120px), 480px) - 120px)';

    if (!isTouch) {
      return (
      <DropdownMenuContent
        side="bottom"
        align={side === 'from' ? 'start' : 'end'}
        sideOffset={8}
        collisionPadding={{ top: 12, bottom: 12, left: 16, right: 16 }}
        className="min-w-[30rem] overflow-visible"
        style={{ maxHeight: computedMaxHeight, maxWidth: 'calc(100vw - 32px)' }}
      >
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-1 pb-1">
          <Input
            autoFocus={!isTouch}
            placeholder="Search units…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            className="h-8 w-full rounded-md border border-border/60 bg-[hsl(var(--control-background))] px-2 text-xs"
          />
        </div>
        <div className="relative">
          <div className="flex gap-3" style={{ maxHeight: listMaxHeight }}>
            <div
              ref={side === 'from' ? fromMenuListRef : toMenuListRef}
              onScroll={(e) => updateMenuScrollState(side, e.currentTarget)}
              className="max-h-[60vh] w-[14rem] shrink-0 overflow-y-auto overflow-x-hidden pl-3 pr-2 pt-6 pb-6"
              style={{ maxHeight: listMaxHeight, scrollbarWidth: 'thin', direction: 'rtl' }}
            >
              <div style={{ direction: 'ltr' }}>
                <div className="px-1 pb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  Category
                </div>
                {filteredCategories.map(({ option }) => {
                  const isActiveCategory = option.value === (menuCategory ?? defaultOpenCategory);
                  return (
                    <DropdownMenuItem
                      key={`${side}-${option.value}`}
                      onSelect={(event) => {
                        event.preventDefault();
                        setMenuCategory(option.value);
                      }}
                      onMouseEnter={() => setMenuCategory(option.value)}
                      onFocus={() => setMenuCategory(option.value)}
                      data-current={option.value === rhfCategory || undefined}
                      className={cn(
                        'flex items-center justify-between gap-2',
                        option.value === rhfCategory && 'font-semibold text-primary',
                        isActiveCategory && 'bg-muted/40',
                      )}
                    >
                      <span>{option.title}</span>
                      <ChevronRight className="h-4 w-4 opacity-70" aria-hidden="true" />
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </div>
            <div
              className="relative w-[18rem] shrink-0 overflow-hidden rounded-lg border border-border/50 bg-[hsl(var(--card))]/70"
              style={{ maxHeight: listMaxHeight }}
            >
              <div
                className="h-full overflow-y-auto overflow-x-hidden px-3 py-6"
                style={{ scrollbarWidth: 'thin', direction: 'ltr' }}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 mb-2">
                  Units
                </div>
                {displayUnits.length > 0 ? (
                  displayUnits.map((unit) => (
                    <button
                      key={unit.symbol}
                      type="button"
                      onClick={() => {
                        if (!effectiveCategory) return;
                        onUnitSelect(effectiveCategory, unit.symbol);
                        if (side === 'from') {
                          setFromMenuOpen(false);
                        } else {
                          setToMenuOpen(false);
                        }
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-left transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                        unit.symbol === selectedUnitSymbol
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/40'
                          : undefined,
                      )}
                    >
                      <span className="whitespace-normal break-words leading-snug">{unit.name}</span>
                      <span className="ml-2 shrink-0 text-muted-foreground">({unit.symbol})</span>
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">No units found.</div>
                )}
              </div>
            </div>
          </div>
          {menuScrollState[side].scrollable && (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 flex h-6 items-center justify-center bg-[hsl(var(--card))]/95">
                <ChevronsUpDown
                  className={cn(
                    'h-4 w-4 transition-opacity',
                    menuScrollState[side].atTop ? 'opacity-20' : 'opacity-80 rotate-180',
                  )}
                  aria-hidden="true"
                />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-6 items-center justify-center bg-[hsl(var(--card))]/95">
                <ChevronsUpDown
                  className={cn(
                    'h-4 w-4 transition-opacity',
                    menuScrollState[side].atBottom ? 'opacity-20' : 'opacity-80',
                  )}
                  aria-hidden="true"
                />
              </div>
            </>
          )}
        </div>
      </DropdownMenuContent>
    );
  }

    return (
      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={6}
        avoidCollisions={false}
        className="min-w-[14rem] overflow-visible"
        style={{ maxHeight: computedMaxHeight }}
      >
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-1 pb-1">
          <Input
            autoFocus={!isTouch}
            placeholder="Search units…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            className="h-8 w-full rounded-md border border-border/60 bg-[hsl(var(--control-background))] px-2 text-xs"
          />
        </div>
        <div className="relative">
          <div
            ref={side === 'from' ? fromMenuListRef : toMenuListRef}
            onScroll={(e) => updateMenuScrollState(side, e.currentTarget)}
            className="max-h-[60vh] overflow-y-auto hide-scrollbar pt-5 pb-5"
            style={{ maxHeight: computedMaxHeight, scrollbarWidth: 'none' }}
          >
            {filteredCategories.map(({ option, units }) => {
              const isActiveCategory = option.value === rhfCategory;
              const isExpanded =
                menuCategory === option.value ||
                (normalizedFilter !== '' && menuCategory === null && option.value === filteredCategories[0]?.option.value) ||
                option.value === defaultOpenCategory;

              return (
                <div key={`${side}-${option.value}`} className="flex flex-col">
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      setMenuCategory((current) =>
                        current === option.value ? null : option.value,
                      );
                    }}
                    className={cn(
                      'flex items-center justify-between gap-2',
                      isActiveCategory && 'font-semibold text-primary',
                    )}
                  >
                    <span>{option.title}</span>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-transform',
                        isExpanded && 'translate-x-0.5',
                      )}
                      aria-hidden="true"
                    />
                  </DropdownMenuItem>
                  {isExpanded && (
                    <div className="ml-3 border-l border-border/60 pl-2">
                      {units.map((unit) => (
                        <DropdownMenuItem
                          key={unit.symbol}
                          onSelect={() => onUnitSelect(option.value, unit.symbol)}
                          className={cn(
                            "pl-4 text-sm",
                            unit.symbol === selectedUnitSymbol && "bg-primary/10 text-primary font-semibold",
                          )}
                        >
                          {unit.name} ({unit.symbol})
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {(!menuScrollState[side].atTop || !menuScrollState[side].atBottom) && (
            <>
              {!menuScrollState[side].atTop && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex h-5 items-center justify-center bg-[hsl(var(--card))]/95 text-muted-foreground/70">
                  <ChevronsUpDown className="h-4 w-4 rotate-180 opacity-80" />
                </div>
              )}
              {!menuScrollState[side].atBottom && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-5 items-center justify-center bg-[hsl(var(--card))]/95 text-muted-foreground/70">
                  <ChevronsUpDown className="h-4 w-4 opacity-80" />
                </div>
              )}
            </>
          )}
        </div>
      </DropdownMenuContent>
    );
  };

  const currentFromUnit = React.useMemo(
    () => currentUnitsForCategory.find((unit) => unit.symbol === rhfFromUnit),
    [currentUnitsForCategory, rhfFromUnit],
  );

  const currentToUnit = React.useMemo(
    () => currentUnitsForCategory.find((unit) => unit.symbol === rhfToUnit),
    [currentUnitsForCategory, rhfToUnit],
  );

  const measureLabelWidth = React.useCallback(
    (trigger: HTMLButtonElement | null, text: string) => {
      if (typeof window === 'undefined') return 0;
      if (!trigger || !text) return 0;
      if (!measurementCanvasRef.current) {
        measurementCanvasRef.current = document.createElement('canvas');
      }
      const context = measurementCanvasRef.current.getContext('2d');
      if (!context) {
        return 0;
      }
      const computed = window.getComputedStyle(trigger);
      const fontWeight = computed.fontWeight || '400';
      const fontSize = computed.fontSize || '14px';
      const fontFamily = computed.fontFamily || 'sans-serif';
      context.font = `${fontWeight} ${fontSize} ${fontFamily}`;
      const metrics = context.measureText(text);
      return metrics.width;
    },
    [],
  );

  const clampTriggerWidth = React.useCallback((textWidth: number) => {
    const padding = 40; // horizontal padding for text
    const caretSpace = 24; // space for chevrons and gap
    const desired = textWidth + padding + caretSpace;
    const minWidth = 128;
    const maxWidth = 460;
    return Math.max(minWidth, Math.min(desired, maxWidth));
  }, []);

  const evaluateLabelWidths = React.useCallback(() => {
    if (typeof window === 'undefined') return;

    if (currentFromUnit && fromTriggerRef.current) {
      const fullLabel = `${currentFromUnit.name} (${currentFromUnit.symbol})`;
      const displayText = PREFER_ABBREVIATED_UNIT_LABELS ? currentFromUnit.symbol : fullLabel;
      const measuredWidth = measureLabelWidth(fromTriggerRef.current, displayText);
      if (measuredWidth > 0) {
        setFromTriggerWidth(clampTriggerWidth(measuredWidth));
        setAbbreviateFromTrigger(PREFER_ABBREVIATED_UNIT_LABELS || shouldAbbreviateUnit(currentFromUnit));
      } else {
        setAbbreviateFromTrigger(false);
        setFromTriggerWidth(null);
      }
    } else {
      setAbbreviateFromTrigger(false);
      setFromTriggerWidth(null);
    }

    if (currentToUnit && toTriggerRef.current) {
      const fullLabel = `${currentToUnit.name} (${currentToUnit.symbol})`;
      const displayText = PREFER_ABBREVIATED_UNIT_LABELS ? currentToUnit.symbol : fullLabel;
      const measuredWidth = measureLabelWidth(toTriggerRef.current, displayText);
      if (measuredWidth > 0) {
        setToTriggerWidth(clampTriggerWidth(measuredWidth));
        setAbbreviateToTrigger(PREFER_ABBREVIATED_UNIT_LABELS || shouldAbbreviateUnit(currentToUnit));
      } else {
        setAbbreviateToTrigger(false);
        setToTriggerWidth(null);
      }
    } else {
      setAbbreviateToTrigger(false);
      setToTriggerWidth(null);
    }
  }, [clampTriggerWidth, currentFromUnit, currentToUnit, measureLabelWidth]);

  React.useLayoutEffect(() => {
    evaluateLabelWidths();
  }, [evaluateLabelWidths, rhfFromUnit, rhfToUnit]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleResize = () => evaluateLabelWidths();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [evaluateLabelWidths]);

  const unitConversionPairs = React.useMemo<ConversionComboboxItem[]>(() => {
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
              label: `${fromPrefix.prefix} → ${toPrefix.prefix}`,
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
            const label = `${fromUnit.symbol} \u2192 ${toUnit.symbol}`;
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
  }, []);

  const conversionPairs = unitConversionPairs;

  const conversionSources = React.useMemo(() => {
    if (!rhfCategory) {
      return [];
    }
    return getConversionSources(
      rhfCategory as UnitCategory,
      rhfFromUnit || undefined,
      rhfToUnit || undefined,
    );
  }, [rhfCategory, rhfFromUnit, rhfToUnit]);

  const multiplier = React.useMemo(() => {
    if (!rhfCategory || !currentFromUnit || !currentToUnit) {
      return null;
    }
    if (rhfCategory === 'Currency') {
      return null;
    }
    return convertNumericValue(
      rhfCategory as UnitCategory,
      currentFromUnit.symbol,
      currentToUnit.symbol,
      1,
    );
  }, [rhfCategory, currentFromUnit, currentToUnit]);

  const fetchFxRatesForToday = React.useCallback(() => {
    if (isFetchingFx) return;
    if (fxRates) return;

    const now = Date.now();
    if (fxLastAttemptRef.current && now - fxLastAttemptRef.current < FX_RETRY_COOLDOWN_MS) {
      return;
    }

    const currencyUnits = getUnitsForCategory('Currency').map((unit) => unit.symbol);
    const symbols = currencyUnits.filter((code) => code !== 'EUR').join(',');

    setIsFetchingFx(true);
    fxErrorRef.current = null;
    fxLastAttemptRef.current = now;

    const controller = new AbortController();

    fetch(`/api/fx?base=EUR${symbols ? `&symbols=${symbols}` : ''}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
        const data = (await res.json()) as FxRatesResponse;
        setFxRates(data);
        maybeApplyCurrencyConversion(data);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        console.error('FX fetch error', error);
        fxErrorRef.current = 'Live FX rates unavailable';
      })
      .finally(() => setIsFetchingFx(false));

    return () => controller.abort();
  }, [fxRates, isFetchingFx, maybeApplyCurrencyConversion]);

  React.useEffect(() => {
    if (rhfCategory !== 'Currency') {
      fxLastAttemptRef.current = null;
      return;
    }
    return fetchFxRatesForToday();
  }, [fetchFxRatesForToday, rhfCategory]);

  // Prefetch FX rates on initial load so currency queries can resolve immediately.
  React.useEffect(() => {
    if (!fxRates) {
      fetchFxRatesForToday();
    }
  }, [fetchFxRatesForToday, fxRates]);

  // When rates arrive (or change) with currency selected and inputs present, apply conversion immediately.
  React.useEffect(() => {
    if (!fxRates) return;
    if (rhfCategory !== 'Currency') return;
    if (!rhfFromUnit || !rhfToUnit || rhfValue === undefined || rhfValue === null) return;
    maybeApplyCurrencyConversion(fxRates);
  }, [fxRates, rhfCategory, rhfFromUnit, rhfToUnit, rhfValue, maybeApplyCurrencyConversion]);

  // Safety net: if we have FX rates and the current currency conversion has no result yet, recompute once.
  React.useEffect(() => {
    if (rhfCategory !== 'Currency') return;
    if (!fxRates) return;
    if (conversionResult) return;
    if (!rhfFromUnit || !rhfToUnit) return;
    const numericValue = Number(rhfValue);
    if (!Number.isFinite(numericValue)) return;
    const result = convertUnitsDetailed({
      category: 'Currency',
      fromUnit: rhfFromUnit,
      toUnit: rhfToUnit,
      value: numericValue,
      fxContext: { base: fxRates.base as CurrencyCode, rates: fxRates.rates },
    });
    if (result) {
      setConversionResult(result);
    }
  }, [conversionResult, fxRates, rhfCategory, rhfFromUnit, rhfToUnit, rhfValue]);

  // Always recompute currency conversions when any input changes and rates are ready.
  React.useEffect(() => {
    if (rhfCategory !== 'Currency') return;
    if (!fxRates) return;
    if (!rhfFromUnit || !rhfToUnit) return;
    const numericValue = Number(rhfValue);
    if (!Number.isFinite(numericValue)) return;
    const result = convertUnitsDetailed({
      category: 'Currency',
      fromUnit: rhfFromUnit,
      toUnit: rhfToUnit,
      value: numericValue,
      fxContext: { base: fxRates.base as CurrencyCode, rates: fxRates.rates },
    });
    setConversionResult(result);
  }, [fxRates, rhfCategory, rhfFromUnit, rhfToUnit, rhfValue]);

  const selectedConversionPairValue = React.useMemo(() => {
    if (!rhfCategory || !rhfFromUnit || !rhfToUnit) {
      return undefined;
    }
    return `${rhfCategory}:${rhfFromUnit}:${rhfToUnit}`;
  }, [rhfCategory, rhfFromUnit, rhfToUnit]);

  const convertUnits = React.useCallback((data: Partial<FormData>): ConversionResult | null => {
    const { category, fromUnit, toUnit, value } = data;
    if (
      !category ||
      !fromUnit ||
      !toUnit ||
      value === undefined ||
      value === null ||
      String(value).trim() === ''
    ) {
      return null;
    }

    if (category === 'Currency' && !fxRates) {
      return null; // avoid spinning while rates are loading
    }

    const fxContext =
      category === 'Currency' && fxRates
        ? { base: fxRates.base as CurrencyCode, rates: fxRates.rates }
        : undefined;

    const result = convertUnitsDetailed({
      category: category as UnitCategory,
      fromUnit,
      toUnit,
      value: Number(value),
      fxContext,
    });

    return result;
  }, [fxRates]);

  // Recompute currencies when fresh rates land
  React.useEffect(() => {
    if (rhfCategory !== 'Currency') return;
    if (!fxRates && !isFetchingFx) {
      fetchFxRatesForToday();
      return;
    }

    if (fxRates && rhfFromUnit && rhfToUnit && String(rhfValue ?? '').trim() !== '') {
      const result = convertUnits({
        category: rhfCategory,
        fromUnit: rhfFromUnit,
        toUnit: rhfToUnit,
        value: Number(rhfValue),
      });
      setConversionResult(result);
    }
  }, [
    fetchFxRatesForToday,
    fxRates,
    rhfCategory,
    rhfFromUnit,
    rhfToUnit,
    rhfValue,
    convertUnits,
    isFetchingFx,
  ]);

  const applyCategoryDefaults = React.useCallback(
    (category: UnitCategory, { forceDefaults }: { forceDefaults: boolean }) => {
      const availableUnits = getUnitsForCategory(category);
      if (availableUnits.length === 0) {
        setSelectedCategoryLocal(category);
        setValue('category', category, { shouldValidate: true });
        return;
      }

      const currentValues = getValues();
      let newFromUnitSymbol =
        typeof currentValues.fromUnit === 'string' ? currentValues.fromUnit : '';
      let newToUnitSymbol =
        typeof currentValues.toUnit === 'string' ? currentValues.toUnit : '';

      const fromValid = availableUnits.some((unit) => unit.symbol === newFromUnitSymbol);
      const toValid = availableUnits.some((unit) => unit.symbol === newToUnitSymbol);

      if (forceDefaults || !fromValid || !toValid) {
        const defaultPair = getCategoryDefaultPair(category);
        if (defaultPair) {
          newFromUnitSymbol = defaultPair.fromUnit;
          newToUnitSymbol = defaultPair.toUnit;
        } else {
          newFromUnitSymbol = availableUnits[0]?.symbol || '';
          const alternateUnit = availableUnits.find(
            (unit) => unit.symbol !== newFromUnitSymbol,
          );
          newToUnitSymbol = alternateUnit?.symbol || availableUnits[1]?.symbol || newFromUnitSymbol;
        }
      }

      if (!availableUnits.some((unit) => unit.symbol === newFromUnitSymbol)) {
        newFromUnitSymbol = availableUnits[0]?.symbol || '';
      }

      if (
        !availableUnits.some((unit) => unit.symbol === newToUnitSymbol) ||
        newFromUnitSymbol === newToUnitSymbol
      ) {
        const fallbackUnit = availableUnits.find(
          (unit) => unit.symbol !== newFromUnitSymbol,
        );
        newToUnitSymbol = fallbackUnit?.symbol || availableUnits[1]?.symbol || newFromUnitSymbol;
      }

      const currentValueRaw = currentValues.value;
      const numericValue =
        typeof currentValueRaw === 'number'
          ? currentValueRaw
          : Number(currentValueRaw);
      const shouldResetValue =
        forceDefaults ||
        !Number.isFinite(numericValue) ||
        String(currentValueRaw ?? '').trim() === '' ||
        String(currentValueRaw ?? '').trim() === '-';

      const finalValue = shouldResetValue ? 1 : numericValue;

      setSelectedCategoryLocal(category);
      setValue('category', category, { shouldDirty: true, shouldValidate: true });
      setValue('fromUnit', newFromUnitSymbol, { shouldDirty: true, shouldValidate: true });
      setValue('toUnit', newToUnitSymbol, { shouldDirty: true, shouldValidate: true });
      setValue('value', finalValue, { shouldDirty: true, shouldValidate: true });
      setLastValidInputValue(finalValue);
      setNumberFormat('normal');
      setIsNormalFormatDisabled(false);

      const conversion = convertUnits({
        category,
        fromUnit: newFromUnitSymbol,
        toUnit: newToUnitSymbol,
        value: finalValue,
      });

      setConversionResult(conversion);
    },
    [
      convertUnits,
      getValues,
      setConversionResult,
      setIsNormalFormatDisabled,
      setLastValidInputValue,
      setNumberFormat,
      setValue,
    ],
  );

  const updateUnitsForCategory = React.useCallback(
    (
      category: UnitCategory,
      overrides: {
        fromUnit?: string;
        toUnit?: string;
      },
    ) => {
      const availableUnits = getUnitsForCategory(category);
      if (availableUnits.length === 0) {
        setSelectedCategoryLocal(category);
        setValue('category', category, { shouldValidate: true });
        return;
      }

      const currentValues = getValues();
      const availableSymbols = availableUnits.map((unit) => unit.symbol);
      const defaultPair = getCategoryDefaultPair(category);

      let fromUnitSymbol: string | undefined =
        overrides.fromUnit && availableSymbols.includes(overrides.fromUnit)
          ? overrides.fromUnit
          : (typeof currentValues.fromUnit === 'string' &&
              availableSymbols.includes(currentValues.fromUnit)
            ? currentValues.fromUnit
            : undefined);

      let toUnitSymbol: string | undefined =
        overrides.toUnit && availableSymbols.includes(overrides.toUnit)
          ? overrides.toUnit
          : (typeof currentValues.toUnit === 'string' &&
              availableSymbols.includes(currentValues.toUnit)
            ? currentValues.toUnit
            : undefined);

      // If user explicitly chose the to-unit and it currently matches from,
      // clear from so we can pick a sensible counterpart (and vice versa).
      if (overrides.toUnit && fromUnitSymbol === overrides.toUnit) {
        fromUnitSymbol = undefined;
      }
      if (overrides.fromUnit && toUnitSymbol === overrides.fromUnit) {
        toUnitSymbol = undefined;
      }

      // Case 1: nothing valid yet -> seed from defaults or first two units.
      if (!fromUnitSymbol && !toUnitSymbol) {
        if (
          defaultPair &&
          availableSymbols.includes(defaultPair.fromUnit) &&
          availableSymbols.includes(defaultPair.toUnit)
        ) {
          fromUnitSymbol = defaultPair.fromUnit;
          toUnitSymbol = defaultPair.toUnit;
        } else {
          fromUnitSymbol = availableSymbols[0] ?? '';
          toUnitSymbol =
            availableSymbols.find((sym) => sym !== fromUnitSymbol) ??
            fromUnitSymbol;
        }
      }
      // Case 2: from is fixed (possibly by user), choose a matching to.
      else if (fromUnitSymbol && !toUnitSymbol) {
        if (defaultPair) {
          if (
            fromUnitSymbol === defaultPair.fromUnit &&
            availableSymbols.includes(defaultPair.toUnit)
          ) {
            toUnitSymbol = defaultPair.toUnit;
          } else if (
            fromUnitSymbol === defaultPair.toUnit &&
            availableSymbols.includes(defaultPair.fromUnit)
          ) {
            toUnitSymbol = defaultPair.fromUnit;
          }
        }
        if (!toUnitSymbol) {
          toUnitSymbol =
            availableSymbols.find((sym) => sym !== fromUnitSymbol) ??
            fromUnitSymbol;
        }
      }
      // Case 3: to is fixed (possibly by user), choose a matching from.
      else if (!fromUnitSymbol && toUnitSymbol) {
        if (defaultPair) {
          if (
            toUnitSymbol === defaultPair.toUnit &&
            availableSymbols.includes(defaultPair.fromUnit)
          ) {
            fromUnitSymbol = defaultPair.fromUnit;
          } else if (
            toUnitSymbol === defaultPair.fromUnit &&
            availableSymbols.includes(defaultPair.toUnit)
          ) {
            fromUnitSymbol = defaultPair.toUnit;
          }
        }
        if (!fromUnitSymbol) {
          fromUnitSymbol =
            availableSymbols.find((sym) => sym !== toUnitSymbol) ??
            toUnitSymbol;
        }
      }
      // Case 4: both defined but ended up equal -> adjust the non-overridden side.
      else if (fromUnitSymbol && toUnitSymbol && fromUnitSymbol === toUnitSymbol) {
        if (overrides.toUnit && !overrides.fromUnit) {
          // Respect result side; move input side.
          if (defaultPair) {
            if (
              toUnitSymbol === defaultPair.toUnit &&
              availableSymbols.includes(defaultPair.fromUnit)
            ) {
              fromUnitSymbol = defaultPair.fromUnit;
            } else if (
              toUnitSymbol === defaultPair.fromUnit &&
              availableSymbols.includes(defaultPair.toUnit)
            ) {
              fromUnitSymbol = defaultPair.toUnit;
            }
          }
          if (fromUnitSymbol === toUnitSymbol) {
            fromUnitSymbol =
              availableSymbols.find((sym) => sym !== toUnitSymbol) ??
              toUnitSymbol;
          }
        } else if (overrides.fromUnit && !overrides.toUnit) {
          // Respect input side; move result side.
          if (defaultPair) {
            if (
              fromUnitSymbol === defaultPair.fromUnit &&
              availableSymbols.includes(defaultPair.toUnit)
            ) {
              toUnitSymbol = defaultPair.toUnit;
            } else if (
              fromUnitSymbol === defaultPair.toUnit &&
              availableSymbols.includes(defaultPair.fromUnit)
            ) {
              toUnitSymbol = defaultPair.fromUnit;
            }
          }
          if (toUnitSymbol === fromUnitSymbol) {
            toUnitSymbol =
              availableSymbols.find((sym) => sym !== fromUnitSymbol) ??
              fromUnitSymbol;
          }
        } else if (defaultPair) {
          // No explicit override; fall back to default pair orientation.
          if (
            availableSymbols.includes(defaultPair.fromUnit) &&
            availableSymbols.includes(defaultPair.toUnit)
          ) {
            fromUnitSymbol = defaultPair.fromUnit;
            toUnitSymbol = defaultPair.toUnit;
          }
        }
      }

      // Final safety: ensure we have concrete symbols.
      const safeFrom = fromUnitSymbol ?? availableSymbols[0] ?? '';
      const safeTo =
        toUnitSymbol ??
        availableSymbols.find((sym) => sym !== safeFrom) ??
        safeFrom;

      const currentValueRaw = currentValues.value;
      const numericValue =
        typeof currentValueRaw === 'number'
          ? currentValueRaw
          : Number(currentValueRaw);
      const shouldResetValue =
        !Number.isFinite(numericValue) ||
        String(currentValueRaw ?? '').trim() === '' ||
        String(currentValueRaw ?? '').trim() === '-';

      const finalValue = shouldResetValue ? 1 : numericValue;

      setSelectedCategoryLocal(category);
      setValue('category', category, { shouldDirty: true, shouldValidate: true });
      setValue('fromUnit', safeFrom, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('toUnit', safeTo, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue('value', finalValue, { shouldDirty: true, shouldValidate: true });
      setLastValidInputValue(finalValue);
      setNumberFormat('normal');
      setIsNormalFormatDisabled(false);

      const conversion = convertUnits({
        category,
        fromUnit: safeFrom,
        toUnit: safeTo,
        value: finalValue,
      });

      setConversionResult(conversion);
    },
    [
      convertUnits,
      getValues,
      setConversionResult,
      setIsNormalFormatDisabled,
      setLastValidInputValue,
      setNumberFormat,
      setSelectedCategoryLocal,
      setValue,
    ],
  );

  const handleFromUnitMenuSelect = React.useCallback(
    (category: UnitCategory, unitSymbol: string) => {
      resetFinderInput();
      updateUnitsForCategory(category, { fromUnit: unitSymbol });
    },
    [resetFinderInput, updateUnitsForCategory],
  );

  const handleToUnitMenuSelect = React.useCallback(
    (category: UnitCategory, unitSymbol: string) => {
      resetFinderInput();
      updateUnitsForCategory(category, { toUnit: unitSymbol });
    },
    [resetFinderInput, updateUnitsForCategory],
  );

  const handleParsedConversion = React.useCallback(
    (payload: ParsedConversionPayload) => {
      pendingFinderSelectionRef.current = true;
      const focusResultField = () => {
        requestAnimationFrame(() => resultInputRef.current?.focus());
      };
      const finalizeFinderSelection = () => {
        pendingFinderSelectionRef.current = false;
        focusResultField();
      };

      const pulseUnitHighlight = () => {
        if (unitHighlightTimeoutRef.current) {
          clearTimeout(unitHighlightTimeoutRef.current);
          unitHighlightTimeoutRef.current = null;
        }
        setFromUnitHighlight(true);
        setToUnitHighlight(true);
        unitHighlightTimeoutRef.current = setTimeout(() => {
          setFromUnitHighlight(false);
          setToUnitHighlight(false);
          unitHighlightTimeoutRef.current = null;
        }, 900);
      };

      if (payload.kind === 'category') {
        setIsSwapped(false);
        applyCategoryDefaults(payload.category, { forceDefaults: true });
        pulseUnitHighlight();
        finalizeFinderSelection();
        return;
      }

      const resolveValueFromStrategy = (): number => {
        if (payload.valueStrategy === 'explicit') {
          return Number.isFinite(payload.value) ? payload.value : 1;
        }

        if (payload.valueStrategy === 'force-default') {
          return 1;
        }

        const currentValueRaw = getValues().value;
        const trimmed =
          typeof currentValueRaw === 'string'
            ? currentValueRaw.trim()
            : String(currentValueRaw ?? '').trim();
        const numericValue =
          typeof currentValueRaw === 'number'
            ? currentValueRaw
            : Number(currentValueRaw);

        if (
          trimmed &&
          trimmed !== '-' &&
          Number.isFinite(numericValue) &&
          numericValue !== 1
        ) {
          return numericValue;
        }

        return 1;
      };

      const resolvedValue = resolveValueFromStrategy();

      if (payload.kind === 'si-prefix') {
        setValue('category', 'SI Prefixes', { shouldValidate: true, shouldDirty: true });
        setSelectedCategoryLocal('SI Prefixes');
        setIsSwapped(false);

        Promise.resolve()
          .then(() => {
            setValue('fromUnit', payload.fromPrefixSymbol, { shouldValidate: true, shouldDirty: true });
            setValue('toUnit', payload.toPrefixSymbol, { shouldValidate: true, shouldDirty: true });
            setValue('value', resolvedValue, { shouldValidate: true, shouldDirty: true });
            setLastValidInputValue(resolvedValue);

            const conversion = convertUnits({
              category: 'SI Prefixes',
              fromUnit: payload.fromPrefixSymbol,
              toUnit: payload.toPrefixSymbol,
              value: resolvedValue,
            });

            setConversionResult(conversion);
          })
          .finally(() => {
            pulseUnitHighlight();
            finalizeFinderSelection();
          });
        return;
      }

      const { category, fromUnit, toUnit } = payload;
      setValue('category', category, { shouldValidate: true, shouldDirty: true });
      setSelectedCategoryLocal(category);

      Promise.resolve()
        .then(() => {
          setValue('fromUnit', fromUnit, { shouldValidate: true, shouldDirty: true });
          setValue('toUnit', toUnit, { shouldValidate: true, shouldDirty: true });
          setValue('value', resolvedValue, { shouldValidate: true, shouldDirty: true });
          setLastValidInputValue(resolvedValue);

          const conversion = convertUnits({
            category,
            fromUnit,
            toUnit,
            value: resolvedValue,
          });

          setConversionResult(conversion);
        })
        .finally(() => {
          pulseUnitHighlight();
          finalizeFinderSelection();
        });
    },
    [
      applyCategoryDefaults,
      convertUnits,
      getValues,
      setValue,
      setSelectedCategoryLocal,
      setLastValidInputValue,
      setConversionResult,
      setIsSwapped,
      pendingFinderSelectionRef,
      resultInputRef,
      unitHighlightTimeoutRef,
    ],
  );

  const handleParseError = React.useCallback(
    (message: string) => {
      toast({
        title: 'Could not parse that conversion',
        description: message,
        variant: 'destructive',
      });
    },
    [toast],
  );

  const handleFinderExampleSelect = React.useCallback(
    (example: string) => {
      const normalized = example.trim();
      if (!normalized) {
        return;
      }
      setFinderPresetQuery(normalized);
      setFinderVersion((prev) => prev + 1);

      const parsed = parseConversionQuery(normalized);
      if (parsed.ok) {
      handleParsedConversion(parsed);
    } else {
      handleParseError(parsed.error);
    }
  },
  [handleParsedConversion, handleParseError],
);

  const handleFinderAutoFocusComplete = React.useCallback(() => {
    finderAutoFocusRequestedRef.current = false;
    setShouldAutoFocusFinder(false);
  }, []);

  const handleFinderNumericValue = React.useCallback(
    (numericValue: number) => {
      if (!Number.isFinite(numericValue)) {
        return;
      }

      const normalizedValue = normalizeNumericInputValue(numericValue);
      const valueForForm = typeof normalizedValue === 'number' ? normalizedValue : numericValue;
      setValue('value', valueForForm, { shouldValidate: true, shouldDirty: true });
      setLastValidInputValue(numericValue);

      const currentValues = getValues();
      const currentCategory = (currentValues.category as UnitCategory) || '';
      const currentFromUnit = typeof currentValues.fromUnit === 'string' ? currentValues.fromUnit : '';
      const currentToUnit = typeof currentValues.toUnit === 'string' ? currentValues.toUnit : '';

      if (currentCategory && currentFromUnit && currentToUnit) {
        const conversion = convertUnits({
          category: currentCategory,
          fromUnit: currentFromUnit,
          toUnit: currentToUnit,
          value: numericValue,
        });
        setConversionResult(conversion);
      }

      focusFromValueInput();
    },
    [
      convertUnits,
      focusFromValueInput,
      getValues,
      normalizeNumericInputValue,
      setConversionResult,
      setLastValidInputValue,
      setValue,
    ],
  );


  const handleActualFormatChange = React.useCallback((
    actualFormat: NumberFormat,
    reason: 'magnitude' | 'user_choice' | null
  ) => {
    const magnitudeForcedScientific = actualFormat === 'scientific' && reason === 'magnitude';
    setIsNormalFormatDisabled(magnitudeForcedScientific);

    if (magnitudeForcedScientific && numberFormat === 'normal') {
        setNumberFormat('scientific');
    } else if (reason === 'user_choice') {
        if (actualFormat === 'normal' && !magnitudeForcedScientific) setNumberFormat('normal');
        else if (actualFormat === 'scientific') setNumberFormat('scientific');
    }
  }, [numberFormat]);


  React.useEffect(() => {
    if (pendingFinderSelectionRef.current) {
      return;
    }

    const categoryToProcess = rhfCategory as UnitCategory;
    if (!categoryToProcess) return;

    const availableUnits = getUnitsForCategory(categoryToProcess);
    if (availableUnits.length === 0) return;

    if (categoryToProcess !== selectedCategoryLocal) {
      applyCategoryDefaults(categoryToProcess, { forceDefaults: true });
      return;
    }

    const currentValues = getValues();
    const currentFrom =
      typeof currentValues.fromUnit === 'string' ? currentValues.fromUnit : '';
    const currentTo =
      typeof currentValues.toUnit === 'string' ? currentValues.toUnit : '';
    const fromValid = availableUnits.some((unit) => unit.symbol === currentFrom);
    const toValid = availableUnits.some((unit) => unit.symbol === currentTo);

    if (!fromValid || !toValid) {
      applyCategoryDefaults(categoryToProcess, { forceDefaults: true });
      return;
    }

    const numericValue =
      typeof currentValues.value === 'number'
        ? currentValues.value
        : Number(currentValues.value);

    if (Number.isFinite(numericValue)) {
      const conversion = convertUnits({
        category: categoryToProcess,
        fromUnit: currentFrom,
        toUnit: currentTo,
        value: numericValue,
      });
      setConversionResult(conversion);
      setLastValidInputValue(numericValue);
    }
  }, [
    applyCategoryDefaults,
    convertUnits,
    getValues,
    rhfCategory,
    selectedCategoryLocal,
    setConversionResult,
    setLastValidInputValue,
    pendingFinderSelectionRef,
  ]);


  React.useEffect(() => {
    if (rhfCategory === selectedCategoryLocal && rhfCategory !== "") {
        const formData = getValues();
        const { category, fromUnit, toUnit, value } = formData;
        const numericValue = Number(value);

        if (category && fromUnit && toUnit && String(value).trim() !== '' && !isNaN(numericValue) && isFinite(numericValue)) {
           setLastValidInputValue(numericValue);
           const result = convertUnits(formData);
           setConversionResult(result);
        } else if (category && fromUnit && toUnit && (String(value).trim() === '' || String(value).trim() === '-')) {
            setConversionResult(null);
        } else if (!category || !fromUnit || !toUnit) {
           setConversionResult(null);
        } else if (String(value).trim() !== '' && (isNaN(numericValue) || !isFinite(numericValue)) && !errors.value) {
            setConversionResult(null);
        }
    }
  }, [rhfValue, rhfFromUnit, rhfToUnit, rhfCategory, selectedCategoryLocal, getValues, convertUnits, errors.value]);

  React.useEffect(() => {
    return () => {
      if (unitHighlightTimeoutRef.current) {
        clearTimeout(unitHighlightTimeoutRef.current);
      }
    };
  }, []);


   React.useEffect(() => {
     if (selectedCategoryLocal === "") {
        const initialFormData = getValues();
        const initialCategory = initialFormData.category as UnitCategory;

        setSelectedCategoryLocal(initialCategory);

        const initialAvailableUnits = getUnitsForCategory(initialCategory);
        let initialFrom = initialFormData.fromUnit;
        let initialTo = initialFormData.toUnit;

        if (initialCategory === 'Mass' && initialFormData.fromUnit === 'kg' && initialFormData.toUnit !== 'g') {
           initialTo = 'g';
           setValue("toUnit", initialTo, { shouldValidate: false });
        } else {
            if (!initialAvailableUnits.some(u => u.symbol === initialFrom)) {
                initialFrom = initialAvailableUnits[0]?.symbol || "";
                setValue("fromUnit", initialFrom, { shouldValidate: false });
            }
            if (!initialAvailableUnits.some(u => u.symbol === initialTo) || initialFrom === initialTo) {
                initialTo = initialAvailableUnits.find(u => u.symbol !== initialFrom)?.symbol || initialFrom;
                if (initialFrom === initialTo && initialAvailableUnits.length > 1) {
                     initialTo = initialAvailableUnits[1]?.symbol || initialFrom;
                }
                setValue("toUnit", initialTo, { shouldValidate: false });
            }
        }

        const initialValue = (initialFormData.value === undefined || isNaN(Number(initialFormData.value))) ? 1 : Number(initialFormData.value);
        if (String(initialFormData.value) !== String(initialValue)) {
             setValue("value", initialValue, { shouldValidate: false });
        }
        setLastValidInputValue(initialValue);

        const initialResult = convertUnits({...initialFormData, category: initialCategory, fromUnit: initialFrom, toUnit: initialTo, value: initialValue });
        setConversionResult(initialResult);
        setNumberFormat('normal');
        setIsNormalFormatDisabled(false);
     }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);


  const internalHandlePresetSelect = React.useCallback((preset: Preset | FavoriteItem) => {
    resetFinderInput();
    const presetCategory = Object.keys(unitData).find(catKey => catKey === preset.category) as UnitCategory | undefined;
    if (!presetCategory) return;

    setValue("category", presetCategory, { shouldValidate: true, shouldDirty: true });

    Promise.resolve().then(() => {
        const availableUnits = getUnitsForCategory(presetCategory);
        const fromUnitValid = availableUnits.some(u => u.symbol === preset.fromUnit);
        const toUnitValid = availableUnits.some(u => u.symbol === preset.toUnit);

        const finalFromUnit = fromUnitValid ? preset.fromUnit : availableUnits[0]?.symbol || "";
        let finalToUnit = (toUnitValid && preset.toUnit !== finalFromUnit) ? preset.toUnit : (availableUnits.find(u => u.symbol !== finalFromUnit)?.symbol || finalFromUnit);

        if (finalFromUnit === finalToUnit && availableUnits.length > 1) {
          finalToUnit = availableUnits.find(u => u.symbol !== finalFromUnit)?.symbol || availableUnits[0]?.symbol || "";
        }

        setValue("fromUnit", finalFromUnit, { shouldValidate: true, shouldDirty: true });
        setValue("toUnit", finalToUnit, { shouldValidate: true, shouldDirty: true });
        
        const currentVal = getValues("value");
        const valToSet = (currentVal === '' || currentVal === undefined || isNaN(Number(currentVal))) ? lastValidInputValue : Number(currentVal);
        
        // Do not set value for presets
        // if (String(valToSet) !== String(currentVal)) {
        //  setValue("value", valToSet, { shouldValidate: true, shouldDirty: true });
        // }


        Promise.resolve().then(() => {
            const currentVals = getValues();
            const result = convertUnits({...currentVals, value: valToSet, category: presetCategory, fromUnit: finalFromUnit, toUnit: finalToUnit });
            setConversionResult(result);
            focusFromValueInput();
        });
    });
  }, [setValue, getValues, convertUnits, lastValidInputValue, resetFinderInput, focusFromValueInput]);

  const internalApplyHistorySelect = React.useCallback((item: ConversionHistoryItem) => {
    resetFinderInput();
    const { category, fromUnit, toUnit, fromValue } = item;

    setValue("category", category, { shouldValidate: true, shouldDirty: true });

    Promise.resolve().then(() => {
        const availableUnits = getUnitsForCategory(category);
        const fromUnitValid = availableUnits.some(u => u.symbol === fromUnit);
        const toUnitValid = availableUnits.some(u => u.symbol === toUnit);

        const finalFromUnit = fromUnitValid ? fromUnit : availableUnits[0]?.symbol || "";
        let finalToUnit = (toUnitValid && toUnit !== finalFromUnit) ? toUnit : (availableUnits.find(u => u.symbol !== finalFromUnit)?.symbol || finalFromUnit);
        if (finalFromUnit === finalToUnit && availableUnits.length > 1) {
             finalToUnit = availableUnits.find(u=> u.symbol !== finalFromUnit)?.symbol || availableUnits[0]?.symbol || "";
        }

        reset({
            category: category,
            fromUnit: finalFromUnit,
            toUnit: finalToUnit,
            value: fromValue,
        });
        setLastValidInputValue(fromValue);

        const absToValue = Math.abs(item.toValue);
        const historyValueForcesScientific = (absToValue > 1e9 || (absToValue < 1e-7 && absToValue !== 0));

        if (historyValueForcesScientific) {
            setNumberFormat('scientific');
            setIsNormalFormatDisabled(true);
        } else {
            setNumberFormat('normal');
            setIsNormalFormatDisabled(false);
        }

        Promise.resolve().then(() => {
           const newResult = convertUnits({...getValues(), category });
           setConversionResult(newResult);
          });
    });
  }, [setValue, reset, getValues, convertUnits, resetFinderInput]);


  const focusFinderInput = React.useCallback(() => {
    finderAutoFocusRequestedRef.current = true;
    setShouldAutoFocusFinder(true);
  }, []);

  useImperativeHandle(ref, () => ({
    handlePresetSelect: internalHandlePresetSelect,
    applyHistorySelect: internalApplyHistorySelect,
    focusFinder: focusFinderInput,
  }));


  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const currencyRatesReady = rhfCategory !== 'Currency' || Boolean(fxRates) || Boolean(fxErrorRef.current);
  const showPlaceholder = rhfValue === undefined || rhfFromUnit === '' || !conversionResult || String(rhfValue).trim() === '' || String(rhfValue) === '-' || !currencyRatesReady;
  const inputNumericValue = React.useMemo(() => {
    if (rhfValue === undefined || rhfValue === null) {
      return null;
    }
    const trimmed = String(rhfValue).trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
      return null;
    }
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }, [rhfValue]);
  const formatFormulaValue = React.useCallback(
    (value: number | null) =>
      formatConversionValue(value, { precisionBoost: 0, precisionMode }).formatted,
    [precisionMode],
  );
  React.useEffect(() => {
    if (!showPlaceholder) return;
    if (textCopyState !== 'idle') {
      setTextCopyState('idle');
    }
    if (resultCopyState !== 'idle') {
      setResultCopyState('idle');
    }
  }, [showPlaceholder, textCopyState, resultCopyState]);

  const {
    formattedString: formattedResultString,
    actualFormatUsed,
    scientificReason,
    roundedValue: roundedResultValue,
  } = React.useMemo(() => {
    return showPlaceholder || !conversionResult
      ? { formattedString: '-', actualFormatUsed: numberFormat, scientificReason: null, roundedValue: undefined }
      : formatNumber(conversionResult.value, numberFormat, inputPrecisionHint, precisionMode);
  }, [showPlaceholder, conversionResult, numberFormat, inputPrecisionHint, precisionMode]);

  React.useEffect(() => {
      handleActualFormatChange(actualFormatUsed, scientificReason);
  }, [actualFormatUsed, scientificReason, handleActualFormatChange]);

  React.useEffect(() => {
    setResultCopyState((state) => (state === 'success' ? 'idle' : state));
  }, [rhfCategory, rhfFromUnit, rhfToUnit, formattedResultString, rhfValue]);

  React.useEffect(() => {
    setTextCopyState((state) => (state === 'success' ? 'idle' : state));
  }, [rhfCategory, rhfFromUnit, rhfToUnit, formattedResultString, rhfValue, showPlaceholder]);

  const prevCalculatorOpenRef = React.useRef(isCalculatorOpen);
  React.useEffect(() => {
    if (prevCalculatorOpenRef.current && !isCalculatorOpen) {
      setFromCalcHover(false);
      setFromCalcButtonFocused(false);
      setFromFieldFocused(false);
    }
    prevCalculatorOpenRef.current = isCalculatorOpen;
  }, [isCalculatorOpen]);

  const resolveCurrencyPairRate = React.useCallback((): number | null => {
    if (rhfCategory !== 'Currency') return null;
    if (!fxRates || !rhfFromUnit || !rhfToUnit) return null;

    const base = (fxRates.base ?? 'EUR') as CurrencyCode;
    const getRate = (symbol: string): number | null => {
      if (symbol === base) return 1;
      const rate = fxRates.rates[symbol as CurrencyCode];
      return typeof rate === 'number' ? rate : null;
    };

    if (rhfFromUnit === rhfToUnit) return 1;

    const fromRate = getRate(rhfFromUnit);
    const toRate = getRate(rhfToUnit);
    if (fromRate === null || toRate === null || fromRate === 0) return null;

    if (rhfFromUnit === base) return toRate;
    if (rhfToUnit === base) return 1 / fromRate;
    return toRate / fromRate;
  }, [fxRates, rhfCategory, rhfFromUnit, rhfToUnit]);

  const generalFormula = React.useMemo(() => {
    if (rhfCategory === 'Currency') {
      if (!currentFromUnit || !currentToUnit) return null;
      const pairRate = resolveCurrencyPairRate();
      if (pairRate === null) return null;
      const dateNote = fxRates?.date ? ` (ECB/Frankfurter ${fxRates.date})` : '';
      return `${currentToUnit.symbol} = ${currentFromUnit.symbol} × ${formatFormulaValue(pairRate)}${dateNote}`;
    }

    if (!currentFromUnit || !currentToUnit || multiplier === null) {
      return null;
    }

    const fromSymbol = currentFromUnit.symbol;
    const toSymbol = currentToUnit.symbol;

    if (rhfCategory === 'Temperature') {
      if (fromSymbol === '°C' && toSymbol === '°F') {
        return '°F = °C × 9/5 + 32';
      } else if (fromSymbol === '°F' && toSymbol === '°C') {
        return '°C = (°F - 32) × 5/9';
      } else if (fromSymbol === '°C' && toSymbol === 'K') {
        return 'K = °C + 273.15';
      } else if (fromSymbol === 'K' && toSymbol === '°C') {
        return '°C = K - 273.15';
      } else if (fromSymbol === '°F' && toSymbol === 'K') {
        return 'K = (°F - 32) × 5/9 + 273.15';
      } else if (fromSymbol === 'K' && toSymbol === '°F') {
        return '°F = (K - 273.15) × 9/5 + 32';
      }
    }

    if (rhfCategory === 'Data Storage') {
      if (fromSymbol && toSymbol) {
        const power = Math.log(multiplier) / Math.log(1024);
        if (Number.isInteger(power)) {
          return `${toSymbol} = ${fromSymbol} × 1024${power > 1 ? '^' + power : ''}`;
        }
      }
    }

    if (rhfCategory === 'Data Transfer Rate') {
      if (
        (fromSymbol.includes('bps') && toSymbol.includes('/s')) ||
        (fromSymbol.includes('/s') && toSymbol.includes('bps'))
      ) {
        const base = multiplier / 8;
        if (base === 1) {
          return `${toSymbol} = ${fromSymbol} × 8`;
        } else if (base < 1) {
          return `${toSymbol} = ${fromSymbol} ÷ ${formatFormulaValue(1 / base)}`;
        }
        return `${toSymbol} = ${fromSymbol} × ${formatFormulaValue(multiplier)}`;
      }
    }

    if (rhfCategory === 'Fuel Economy') {
      if (
        (fromSymbol.includes('/100') && !toSymbol.includes('/100')) ||
        (!fromSymbol.includes('/100') && toSymbol.includes('/100'))
      ) {
        return `${toSymbol} = 100 ÷ (${fromSymbol} × ${formatFormulaValue(multiplier)})`;
      }
    }

    if (multiplier !== null) {
      if (multiplier === 1) {
        return `${toSymbol} = ${fromSymbol}`;
      } else if (multiplier < 1) {
        const inverse = multiplier === 0 ? Infinity : 1 / multiplier;
        return `${toSymbol} = ${fromSymbol} ÷ ${formatFormulaValue(inverse)}`;
      }
      return `${toSymbol} = ${fromSymbol} × ${formatFormulaValue(multiplier)}`;
    }

    return null;
  }, [rhfCategory, currentFromUnit, currentToUnit, multiplier, formatFormulaValue, resolveCurrencyPairRate, fxRates?.date]);

  const dynamicFormula = React.useMemo(() => {
    if (
      showPlaceholder ||
      !conversionResult ||
      !currentFromUnit ||
      !currentToUnit ||
      inputNumericValue === null
    ) {
      return null;
    }

    const inputFormatted = formatFromValue(inputNumericValue, precisionMode);
    if (rhfCategory === 'Currency') {
      const pairRate = resolveCurrencyPairRate();
      const dateNote = fxRates?.date ? ` (ECB/Frankfurter ${fxRates.date})` : '';
      if (pairRate !== null) {
        return `${inputFormatted} ${currentFromUnit.symbol} × ${formatFormulaValue(pairRate)} = ${formattedResultString} ${currentToUnit.symbol}${dateNote}`;
      }
      return `${inputFormatted} ${currentFromUnit.symbol} = ${formattedResultString} ${currentToUnit.symbol}${dateNote}`;
    }

    if (multiplier !== null) {
      return `${inputFormatted} ${currentFromUnit.symbol} × ${formatFormulaValue(multiplier)} = ${formattedResultString} ${currentToUnit.symbol}`;
    }
    return `${inputFormatted} ${currentFromUnit.symbol} = ${formattedResultString} ${currentToUnit.symbol}`;
  }, [
    showPlaceholder,
    conversionResult,
    currentFromUnit,
    currentToUnit,
    inputNumericValue,
    multiplier,
    precisionMode,
    formattedResultString,
    formatFormulaValue,
    rhfCategory,
    resolveCurrencyPairRate,
    fxRates?.date,
  ]);

  const handleCopyTextualResult = React.useCallback(async () => {
    const currentRawFormValue = getValues("value");
    const numericFromValue = Number(currentRawFormValue);

    const textToCopy = showPlaceholder || !conversionResult
      ? ''
      : `${formatFromValue(numericFromValue, precisionMode)} ${rhfFromUnit} = ${formattedResultString} ${rhfToUnit}`;

    if (!textToCopy) return;

    const copied = await copyTextToClipboard(textToCopy);
    if (copied) {
      setTextCopyState('success');
      if (
        onResultCopied &&
        rhfCategory &&
        conversionResult &&
        isFinite(numericFromValue) &&
        String(currentRawFormValue).trim() !== '' &&
        String(currentRawFormValue).trim() !== '-'
      ) {
        onResultCopied({
          category: rhfCategory,
          fromValue: numericFromValue,
          fromUnit: rhfFromUnit,
          toValue: conversionResult.value,
          toUnit: rhfToUnit,
        });
      }
    } else {
      toast({
        title: "Copy Failed",
        description: "Clipboard access is blocked. Please copy the text manually.",
        variant: "destructive",
      });
    }
  }, [
    showPlaceholder,
    conversionResult,
    formattedResultString,
    rhfToUnit,
    rhfFromUnit,
    getValues,
    toast,
    onResultCopied,
    rhfCategory,
    precisionMode,
  ]);

  const formulaContentNode = React.useMemo(() => {
    if (!generalFormula && !dynamicFormula) {
      return (
        <p className="text-xs text-muted-foreground">
          Formula is not available for this conversion.
        </p>
      );
    }
    return (
      <div className="space-y-2 text-xs text-muted-foreground">
        {generalFormula && (
          <p className="text-sm font-semibold text-foreground">{generalFormula}</p>
        )}
        {dynamicFormula && (
          <p>{dynamicFormula}</p>
        )}
      </div>
    );
  }, [generalFormula, dynamicFormula]);
  const formulaTabContent = React.useMemo(() => {
    if (showPlaceholder || !conversionResult || !rhfCategory || !rhfFromUnit || !rhfToUnit) {
      return (
        <p className="text-sm text-muted-foreground">
          Enter a value and pick both units to see the formula.
        </p>
      );
    }

    return (
      <div className="rounded-xl border border-border/60 bg-[hsl(var(--control-background))] px-3 py-3 md:px-2.5 md:py-2.5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Formula
        </div>
        {formulaContentNode}
      </div>
    );
  }, [
    conversionResult,
    formulaContentNode,
    rhfCategory,
    rhfFromUnit,
    rhfToUnit,
    showPlaceholder,
  ]);

  const sourcesTabContent = React.useMemo(() => {
    if (conversionSources.length === 0) return null;
    return (
      <ul className="space-y-3 text-xs text-muted-foreground">
        {conversionSources.map((source) => (
          <li key={source.id} className="leading-relaxed">
            <p className="text-sm font-semibold text-foreground">{source.title}</p>
            <p className="mt-1">
              <span className="font-medium text-foreground">{source.organization}</span>.{' '}
              {source.summary}{' '}
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                View source
              </a>
              {source.id === 'nist-guide-si' && (
                <>
                  {' '}·{' '}
                  <Link
                    href="/standards/nist-si-tenfold"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    View SI table
                  </Link>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    );
  }, [conversionSources]);

  const formattingTabContent = React.useMemo(() => (
    <div className="space-y-6 text-sm text-foreground">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Result format</p>
        <RadioGroup
          name="result-format"
          value={numberFormat}
          onValueChange={(value: string) => {
            setNumberFormat(value as NumberFormat);
            handleActualFormatChange(value as NumberFormat, 'user_choice');
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start"
          aria-label="Choose number format for the result"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value="normal"
              id="format-normal"
              disabled={isNormalFormatDisabled}
            />
            <Label
              htmlFor="format-normal"
              className={cn(
                'cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition',
                isNormalFormatDisabled ? 'cursor-not-allowed text-muted-foreground' : 'hover:text-primary',
              )}
            >
              Normal (e.g., 1,234.56)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="scientific" id="format-scientific" />
            <Label htmlFor="format-scientific" className="cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition hover:text-primary">Scientific (e.g., 1.23E+6)</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Precision</p>
        <RadioGroup
          name="precision-mode"
          value={precisionMode}
          onValueChange={(value: string) => setPrecisionMode(value as PrecisionMode)}
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start"
          aria-label="Choose precision mode"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="rounded" id="precision-rounded" />
            <Label htmlFor="precision-rounded" className="cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition hover:text-primary">
              Rounded (readable)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="full" id="precision-full" />
            <Label htmlFor="precision-full" className="cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition hover:text-primary">
              Full precision
            </Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          Rounded shows up to four decimals for clarity; Full precision shows the raw computed value when available.
        </p>
      </div>
    </div>
  ), [numberFormat, precisionMode, isNormalFormatDisabled, handleActualFormatChange]);

  const resultTabs = React.useMemo<AccordionTabItem[]>(() => {
    const tabs: AccordionTabItem[] = [
      {
        id: 'formula',
        label: 'Formula',
        content: formulaTabContent,
      },
    ];

    if (sourcesTabContent) {
      tabs.push({
        id: 'sources',
        label: 'Sources',
        content: sourcesTabContent,
      });
    }

    tabs.push({
      id: 'formatting',
      label: 'Formatting',
      content: formattingTabContent,
    });

    return tabs;
  }, [formulaTabContent, sourcesTabContent, formattingTabContent]);

 const handleSwapClick = React.useCallback(() => {
    const currentFromUnit = getValues("fromUnit");
    const currentToUnit = getValues("toUnit");
    const currentFromValueString = String(getValues("value"));
    let newInputValue: number | undefined;

    if (conversionResult && isFinite(conversionResult.value)) {
      newInputValue =
        roundedResultValue !== undefined && isFinite(roundedResultValue)
          ? roundedResultValue
          : conversionResult.value;
    } else if (currentFromValueString.trim() !== '' && !Number.isNaN(Number(currentFromValueString))) {
      newInputValue = Number(currentFromValueString);
    } else {
      newInputValue = lastValidInputValue;
    }

    const normalizedValue = normalizeNumericInputValue(newInputValue);
    const valueForForm =
      typeof normalizedValue === 'number'
        ? normalizedValue
        : typeof newInputValue === 'number'
          ? newInputValue
          : '';
    setValue("value", valueForForm, { shouldValidate: true, shouldDirty: true });
    if (newInputValue !== undefined) {
      setLastValidInputValue(newInputValue);
    }
    setValue("fromUnit", currentToUnit, { shouldValidate: true });
    setValue("toUnit", currentFromUnit, { shouldValidate: true });

    setIsSwapped((prev) => !prev);
  }, [getValues, conversionResult, roundedResultValue, lastValidInputValue, normalizeNumericInputValue, setValue]);

  React.useEffect(() => {
    if (!hasAppliedHighlightRef.current) {
      hasAppliedHighlightRef.current = true;
      return;
    }
    if (showPlaceholder) {
      return;
    }
    if (resultHighlightTimeoutRef.current) {
      clearTimeout(resultHighlightTimeoutRef.current);
      resultHighlightTimeoutRef.current = null;
    }
    setResultHighlightPulse(true);
    resultHighlightTimeoutRef.current = setTimeout(() => {
      setResultHighlightPulse(false);
      resultHighlightTimeoutRef.current = null;
    }, 1000);
  }, [formattedResultString, rhfFromUnit, rhfToUnit, rhfCategory, showPlaceholder]);

  React.useEffect(() => {
    return () => {
      if (resultHighlightTimeoutRef.current) {
        clearTimeout(resultHighlightTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = React.useCallback(async () => {
    const currentRawFormValue = getValues("value");
    const numericFromValue = Number(currentRawFormValue);

    const textToCopy = showPlaceholder || !conversionResult ? '' : `${formattedResultString} ${rhfToUnit}`;
    if (!textToCopy) return;

    const copied = await copyTextToClipboard(textToCopy);
    if (copied) {
        setResultCopyState('success');
        if (
            onResultCopied &&
            rhfCategory &&
            conversionResult &&
            isFinite(numericFromValue) &&
            String(currentRawFormValue).trim() !== '' && String(currentRawFormValue).trim() !== '-'
        ) {
            onResultCopied({
                category: rhfCategory,
                fromValue: numericFromValue,
                fromUnit: rhfFromUnit,
                toValue: conversionResult.value,
                toUnit: rhfToUnit,
            });
        }
    } else {
        toast({
            title: "Copy Failed",
            description: "Clipboard access is blocked. Please copy the text manually.",
            variant: "destructive",
        });
    }
  }, [showPlaceholder, conversionResult, formattedResultString, rhfToUnit, toast, onResultCopied, rhfCategory, rhfFromUnit, getValues]);


  const handleSaveToFavoritesInternal = React.useCallback(() => {
    if (!rhfCategory || !rhfFromUnit || !rhfToUnit) {
      toast({
        title: "Cannot Save Favorite",
        description: "Please select a category and both units before saving.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    if (onSaveFavoriteProp) {
      const currentCategoryUnits = getUnitsForCategory(rhfCategory);
      const fromUnitDetails = currentCategoryUnits.find(u => u.symbol === rhfFromUnit);
      const toUnitDetails = currentCategoryUnits.find(u => u.symbol === rhfToUnit);

      const fromUnitName = fromUnitDetails?.name || rhfFromUnit;
      const toUnitName = toUnitDetails?.name || rhfToUnit;
      const favoriteName = `${fromUnitName} to ${toUnitName}`;

      onSaveFavoriteProp({
        category: rhfCategory,
        fromUnit: rhfFromUnit,
        toUnit: rhfToUnit,
        name: favoriteName,
      });
      toast({
        title: "Favorite Saved!",
        description: `"${favoriteName}" added to your favorites.`,
        variant: "success",
        duration: 2000,
      });
    }
  }, [rhfCategory, rhfFromUnit, rhfToUnit, onSaveFavoriteProp, toast]);

  const handleToggleFavoriteInternal = React.useCallback(() => {
    if (!onToggleFavorite || !rhfCategory || !rhfFromUnit || !rhfToUnit) {
      handleSaveToFavoritesInternal();
      return;
    }

    const fromName = getUnitDisplayName(rhfCategory, rhfFromUnit);
    const toName = getUnitDisplayName(rhfCategory, rhfToUnit);

    onToggleFavorite({
      category: rhfCategory as UnitCategory,
      fromUnit: rhfFromUnit,
      toUnit: rhfToUnit,
      name: `${fromName} to ${toName}`,
    });
  }, [onToggleFavorite, rhfCategory, rhfFromUnit, rhfToUnit, handleSaveToFavoritesInternal, getUnitDisplayName]);

  const resultBanner = React.useMemo(() => {
    if (showPlaceholder || !conversionResult || !rhfCategory || !rhfFromUnit || !rhfToUnit) {
      return (
        <div className="rounded-xl border border-dashed border-border/60 bg-[hsl(var(--control-background))] px-3 py-3 text-sm text-muted-foreground">
          Enter a value and pick both units to see the result.
        </div>
      );
    }

    const fromUnitFull = getUnitDisplayName(rhfCategory, rhfFromUnit) ?? rhfFromUnit;
    const toUnitFull = getUnitDisplayName(rhfCategory, rhfToUnit) ?? rhfToUnit;

    return (
      <div className="relative">
        <div
          className={cn(
            "group relative flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-5 py-5 pr-16 text-base font-semibold text-primary transition-colors duration-700 sm:gap-4",
            resultHighlightPulse &&
              'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-[hsl(var(--control-background))] dark:text-primary'
          )}
        >
          {currentConversionPairUrl && (
            <Link
              href={currentConversionPairUrl}
              className="group/details absolute right-3 top-3 flex flex-row-reverse items-center gap-1.5 rounded-full border border-border/70 bg-[hsl(var(--control-background))] px-2 py-1 text-[11px] font-medium text-primary transition-all duration-200 hover:border-primary/60 hover:bg-primary/10"
              aria-label="Open detailed conversion page"
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-[11px] transition-all duration-200 ease-out group-hover/details:max-w-[72px] group-hover/details:pr-1 md:inline">
                Details
              </span>
            </Link>
          )}
          <div className="flex flex-1 flex-col gap-2.5 text-left">
            <span className="truncate">
              {formatFromValue(Number(rhfValue), precisionMode)}
              <span className="ml-1 hidden lg:inline">{fromUnitFull}</span>
              <span className="ml-1 lg:hidden">{rhfFromUnit}</span>
              {' = '}
              {formattedResultString}
              <span className="ml-1 hidden lg:inline">{toUnitFull}</span>
              <span className="ml-1 lg:hidden">{rhfToUnit}</span>
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyTextualResult}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-[hsl(var(--control-background))] px-2.5 text-[11px] font-medium text-primary transition hover:border-primary/60 hover:bg-primary/10"
                aria-label="Copy textual result to clipboard"
              >
                {textCopyState === 'success' ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span>Copy</span>
              </button>
              {(onSaveFavoriteProp || hasToggleFavorites) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={hasToggleFavorites ? () => handleToggleFavoriteInternal() : handleSaveToFavoritesInternal}
                  disabled={finalSaveDisabled || showPlaceholder}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-[hsl(var(--control-background))] px-2.5 text-[11px] font-medium text-primary transition hover:border-primary/60 hover:bg-primary/10 disabled:text-muted-foreground disabled:hover:bg-transparent",
                  )}
                  aria-label={favoriteButtonLabel}
                >
                  <Star className={cn('h-4 w-4', activeFavorite ? 'fill-primary text-primary' : (!finalSaveDisabled && !showPlaceholder) ? 'text-primary' : 'text-muted-foreground')} />
                  <span>{activeFavorite ? 'Saved' : 'Add to favorites'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    conversionResult,
    currentConversionPairUrl,
    formattedResultString,
    handleCopyTextualResult,
    precisionMode,
    resultHighlightPulse,
    activeFavorite,
    favoriteButtonLabel,
    finalSaveDisabled,
    handleSaveToFavoritesInternal,
    handleToggleFavoriteInternal,
    getUnitDisplayName,
    hasToggleFavorites,
    onSaveFavoriteProp,
    rhfCategory,
    rhfFromUnit,
    rhfToUnit,
    rhfValue,
    showPlaceholder,
    textCopyState,
  ]);

  const screenReaderText = showPlaceholder
    ? (rhfValue !== undefined && rhfFromUnit ? `Waiting for conversion of ${formatFromValue(Number(rhfValue), precisionMode)} ${rhfFromUnit}` : 'Enter a value and select units to convert')
    : `${formatFromValue(Number(rhfValue), precisionMode)} ${rhfFromUnit} = ${formattedResultString} ${rhfToUnit}`;

  const handleCalculatorValueSent = (valueFromCalculator: string) => {
    const numericValue = parseFloat(valueFromCalculator);
    if (!isNaN(numericValue)) {
      setValue("value", numericValue, { shouldValidate: true, shouldDirty: true });
      setLastValidInputValue(numericValue);
      const currentFormData = getValues();
      const result = convertUnits({ ...currentFormData, value: numericValue });
      setConversionResult(result);
    }
    setIsCalculatorOpen(false); 
  };

return (
  <>
    <GlobalStyles />
      <div className="w-full max-w-none mx-auto px-2 md:px-6">
      <Card
        id="converter"
        className={cn(
          "relative flex h-full w-full flex-col overflow-visible rounded-2xl border border-border/60 bg-card/90 shadow-lg backdrop-blur-sm",
          "sm:bg-card/90 sm:border-border/60 sm:shadow-lg sm:backdrop-blur-sm bg-transparent border-transparent shadow-none",
          className
        )}
        aria-labelledby="unit-converter-title"
      >
        <CardContent className={cn("flex flex-grow flex-col px-2 pt-5 pb-3 sm:px-2 sm:py-5 border border-transparent sm:border-border/60 bg-transparent sm:bg-transparent")}>
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {screenReaderText}
          </div>
          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="flex flex-1 flex-col gap-5 sm:gap-6">
              <div className="flex flex-1 flex-col gap-5 sm:gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={() => (
                    <FormItem>
                      <div className="rounded-2xl border border-primary/25 bg-primary/5 px-2 py-2 shadow-lg shadow-primary/10 sm:px-3 sm:py-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Label
                            htmlFor="conversion-search"
                            className="text-xs font-semibold uppercase tracking-[0.25em] text-primary"
                          >
                            Conversion finder
                          </Label>
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="hidden h-5 w-5 items-center justify-center rounded-full border border-primary/50 text-primary transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:inline-flex"
                                  aria-label="How the conversion finder understands your input"
                                >
                                  <Info className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                align="start"
                                sideOffset={10}
                                collisionPadding={{ top: 80, bottom: 16, left: 12, right: 12 }}
                                className="max-w-[320px] whitespace-normal break-words rounded-xl border border-border/60 bg-card/95 px-3 py-2 text-xs leading-relaxed shadow-lg z-[70]"
                              >
                                <div className="space-y-2">
                                  <div>
                                    <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                      Try conversions eg.
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleFinderExampleSelect(finderExamples.value)}
                                        className="rounded-full bg-border/70 px-2 py-0.5 text-[12px] font-medium text-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        aria-label={`Use ${finderExamples.value} in the conversion finder`}
                                      >
                                        {finderExamples.value}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleFinderExampleSelect(finderExamples.units)}
                                        className="rounded-full bg-border/70 px-2 py-0.5 text-[12px] font-medium text-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        aria-label={`Use ${finderExamples.units} in the conversion finder`}
                                      >
                                        {finderExamples.units}
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                      Or find category eg.
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleFinderExampleSelect(finderExamples.category)}
                                        className="rounded-full bg-border/70 px-2 py-0.5 text-[12px] font-medium text-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        aria-label={`Use ${finderExamples.category} as the category`}
                                      >
                                        {finderExamples.category}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="relative">
                          {ComboboxComponent ? (
                            <ComboboxComponent
                              key={finderVersion}
                              items={conversionPairs}
                              value={selectedConversionPairValue}
                              onChange={() => {
                                // Selection is handled via onParsedConversion; no-op here.
                              }}
                              placeholder={"Type '100 kg to g', unit(s), or a category"}
                              inputId="conversion-search"
                              onParsedConversion={handleParsedConversion}
                              onParseError={handleParseError}
                              presetQuery={finderPresetQuery}
                              autoFocusOnMount={shouldAutoFocusFinder}
                              onAutoFocusComplete={handleFinderAutoFocusComplete}
                              onNumericValue={handleFinderNumericValue}
                              prefixIcon={<Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                            />
                          ) : (
                            <Button
                              type="button"
                              id="conversion-search"
                              variant="outline"
                              disabled
                              className="h-11 w-full justify-between rounded-xl border border-border/60 bg-muted px-3 text-left text-sm font-medium text-muted-foreground"
                              aria-busy="true"
                            >
                              Loading conversions…
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-2xl border border-border/40 bg-transparent px-2 py-2 text-center sm:px-3 sm:py-3">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    OR
                  </div>
                  <p className="text-[13px] text-muted-foreground/80">
                    Enter a value, choose your units, and copy the result instantly.
                  </p>
                </div>

                {rhfCategory && (
                  <div className="flex flex-col gap-4">
                <div className="order-2 grid w-full gap-3 sm:grid-cols-[minmax(0,2fr)_auto_minmax(0,2fr)] xl:grid-cols-[minmax(0,2.5fr)_auto_minmax(0,2.5fr)]">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          From
                        </div>
                        <div className="grid min-w-0 grid-cols-[minmax(0,1.5fr)_auto] items-stretch rounded-2xl border border-border/60 bg-[hsl(var(--control-background))] shadow-sm transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/25 focus-within:ring-offset-2 focus-within:ring-offset-background">
                          <div
                            className="flex items-stretch border-r border-border/60"
                            onMouseEnter={() => setFromCalcHover(true)}
                            onMouseLeave={() => setFromCalcHover(false)}
                          >
                            <FormField
                              control={form.control}
                              name="value"
                              render={({ field }) => (
                                <FormItem className="flex flex-1 items-stretch space-y-0">
                                  <FormControl>
                                    <Input
                                      id="value-input"
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="Enter value"
                                      {...field}
                                      onFocus={() => setFromFieldFocused(true)}
                                      onBlur={() => setFromFieldFocused(false)}
                                      onChange={(e) => {
                                        const rawValue = e.target.value;
                                        if (
                                          rawValue === '' ||
                                          rawValue === '-' ||
                                          /^-?\d*\.?\d*([eE][-+]?\d*)?$/.test(rawValue) ||
                                          /^-?\d{1,8}(\.\d{0,7})?([eE][-+]?\d*)?$/.test(rawValue)
                                        ) {
                                          if (/([eE])/.test(rawValue)) {
                                            field.onChange(rawValue);
                                          } else {
                                            const parts = rawValue.split('.');
                                            if (
                                              parts[0].replace('-', '').length <= 8 &&
                                              (parts[1] === undefined || parts[1].length <= 7)
                                            ) {
                                              field.onChange(rawValue);
                                            } else if (parts[0].replace('-', '').length > 8 && parts[1] === undefined) {
                                              field.onChange(rawValue.slice(0, parts[0][0] === '-' ? 9 : 8));
                                            }
                                          }
                                        }
                                      }}
                                      value={field.value === undefined ? '' : String(field.value)}
                                      disabled={!rhfFromUnit || !rhfToUnit}
                                      aria-required="true"
                                      className="h-11 w-full rounded-none border-0 bg-transparent px-3 text-base font-medium text-foreground/80 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            {(fromFieldFocused || fromCalcHover || fromCalcButtonFocused) && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsCalculatorOpen(true)}
                                onMouseEnter={() => setFromCalcHover(true)}
                                onMouseLeave={() => setFromCalcHover(false)}
                                onMouseDown={() => setFromFieldFocused(true)}
                                onFocus={() => setFromCalcButtonFocused(true)}
                                onBlur={() => setFromCalcButtonFocused(false)}
                                className="h-11 w-9 shrink-0 rounded-none text-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none disabled:text-muted-foreground disabled:hover:bg-transparent"
                                aria-label="Open calculator"
                              >
                                <Calculator className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <FormField
                            control={form.control}
                            name="fromUnit"
                            render={() => (
                              <FormItem className="min-w-[112px] max-w-[320px] space-y-0">
                                <FormControl>
                                  <DropdownMenu
                                    open={fromMenuOpen}
                                    onOpenChange={(open) => {
                                      setFromMenuOpen(open);
                                      if (open) {
                                        setFromUnitFilter('');
                                        setFromMenuCategory(
                                          rhfCategory && typeof rhfCategory === 'string'
                                            ? (rhfCategory as UnitCategory)
                                            : null,
                                        );
                                      } else {
                                        setFromMenuCategory(null);
                                        setFromUnitFilter('');
                                      }
                                    }}
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        ref={fromTriggerRef}
                                        type="button"
                                        className="inline-flex h-11 items-center justify-between gap-2 border-0 bg-transparent px-3 text-left text-sm font-medium text-foreground/80 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 whitespace-nowrap"
                                        style={{
                                          width: fromTriggerWidth ? `${fromTriggerWidth}px` : undefined,
                                          maxWidth: '100%',
                                        }}
                                      >
                                        {rhfFromUnit && currentFromUnit ? (
                                          <span
                                            className={cn(
                                              'block',
                                              fromUnitHighlight &&
                                                'rounded-md bg-primary/10 px-1 py-0.5 text-primary',
                                            )}
                                            title={`${currentFromUnit.name} (${currentFromUnit.symbol})`}
                                          >
                                            {abbreviateFromTrigger
                                              ? currentFromUnit.symbol
                                              : `${currentFromUnit.name} (${currentFromUnit.symbol})`}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">Unit</span>
                                        )}
                                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    {renderUnitMenuContent('from')}
                                  </DropdownMenu>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <div className="flex w-full items-center justify-center pt-6 sm:w-auto">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleSwapClick}
                          disabled={!rhfFromUnit || !rhfToUnit}
                          className="h-11 w-full rounded-xl border border-border/60 p-0 text-primary transition hover:border-primary/60 hover:bg-primary/5 disabled:border-border/40 sm:w-14"
                          aria-label="Swap units"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className={cn('transition-transform text-primary', isSwapped && 'rotate-180 scale-x-[-1]')}
                            aria-hidden="true"
                          >
                            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                              <path d="M21 3v5h-5" />
                              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                              <path d="M8 16H3v5" />
                            </g>
                          </svg>
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          To
                        </div>
                        <div className="grid min-w-0 grid-cols-[minmax(0,1.5fr)_auto] items-stretch rounded-2xl border border-border/60 bg-secondary/60 shadow-sm transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/25 focus-within:ring-offset-2 focus-within:ring-offset-background">
                          <div
                            className="flex items-stretch border-r border-border/60"
                            onMouseEnter={() => setToCopyHover(true)}
                            onMouseLeave={() => setToCopyHover(false)}
                          >
                            <Input
                              id="conversion-result"
                              name="conversion-result"
                              ref={resultInputRef}
                              readOnly
                              value={showPlaceholder ? '-' : formattedResultString}
                              className={cn(
                                'h-11 w-full rounded-none border-0 bg-transparent px-3 text-base font-semibold text-foreground/80 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                                showPlaceholder && 'text-muted-foreground',
                              )}
                              onFocus={() => setToFieldFocused(true)}
                              onBlur={() => setToFieldFocused(false)}
                              aria-label="Conversion result"
                            />
                            {(toFieldFocused || toCopyHover) && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={handleCopy}
                                disabled={showPlaceholder}
                                className="h-11 w-9 shrink-0 rounded-none text-muted-foreground transition hover:bg-primary/10 hover:text-primary disabled:text-muted-foreground disabled:hover:bg-transparent"
                                aria-label="Copy numeric result to clipboard"
                              >
                                {resultCopyState === 'success' ? (
                                  <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                          <FormField
                            control={form.control}
                            name="toUnit"
                              render={() => (
                                <FormItem className="min-w-[112px] max-w-[320px] space-y-0 border-l border-border/60 pl-2">
                                  <FormControl>
                                  <DropdownMenu
                                    open={toMenuOpen}
                                    onOpenChange={(open) => {
                                      setToMenuOpen(open);
                                      if (open) {
                                        setToUnitFilter('');
                                        setToMenuCategory(
                                          rhfCategory && typeof rhfCategory === 'string'
                                            ? (rhfCategory as UnitCategory)
                                            : null,
                                        );
                                      } else {
                                        setToMenuCategory(null);
                                        setToUnitFilter('');
                                      }
                                    }}
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        ref={toTriggerRef}
                                        type="button"
                                        className="inline-flex h-11 items-center justify-between gap-2 border-0 bg-transparent px-3 text-left text-sm font-medium text-foreground/80 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 whitespace-nowrap"
                                        style={{
                                          width: toTriggerWidth ? `${toTriggerWidth}px` : undefined,
                                          maxWidth: '100%',
                                        }}
                                      >
                                        {rhfToUnit && currentToUnit ? (
                                          <span
                                            className={cn(
                                              'block',
                                              toUnitHighlight &&
                                                'rounded-md bg-primary/10 px-1 py-0.5 text-primary',
                                            )}
                                            title={`${currentToUnit.name} (${currentToUnit.symbol})`}
                                          >
                                            {abbreviateToTrigger
                                              ? currentToUnit.symbol
                                              : `${currentToUnit.name} (${currentToUnit.symbol})`}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">Unit</span>
                                        )}
                                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    {renderUnitMenuContent('to')}
                                  </DropdownMenu>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                    </div>
                    {/* End of from/to grid */}
                    </div>

                  </div>
                )}


                 {/* Textual Conversion Result Display */}
                <div className="mt-6">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Result
                  </div>
                  {resultBanner}
                </div>

                {fxStatusMessage && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {fxStatusMessage}
                  </div>
                )}

                {resultTabs.length > 0 && (
                  <AccordionTabs
                    tabs={resultTabs}
                    defaultTabId="formula"
                    initiallyOpen
                    className="mt-2"
                  />
                )}
                <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                  <DialogTrigger asChild>
                    <div />
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xs overflow-hidden rounded-2xl border border-border/60 bg-card p-0 shadow-xl">
                    <DialogHeader className="sr-only">
                      <DialogTitle>Calculator</DialogTitle>
                    </DialogHeader>
                    <SimpleCalculator onSendValue={handleCalculatorValueSent} onClose={() => setIsCalculatorOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
     </div>
  </>
  );
}));

UnitConverter.displayName = 'UnitConverter';

// Hide scrollbars for custom dropdowns
function GlobalStyles() {
  return (
    <style jsx global>{`
      .hide-scrollbar::-webkit-scrollbar {
        width: 0px;
        height: 0px;
      }
      .hide-scrollbar {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
    `}</style>
  );
}

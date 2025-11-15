
'use client';

import * as React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MeasurementCategoryDropdown, MeasurementCategoryOption } from '@/components/measurement-category-dropdown';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { unitData, getUnitsForCategory, categoryDisplayOrder } from '@/lib/unit-data';
import type { UnitCategory, ConversionResult, Preset, NumberFormat, ConversionHistoryItem, FavoriteItem } from '@/types';
import {
  ArrowRightLeft,
  FlaskConical,
  Copy,
  Star,
  Calculator,
  ChevronsUpDown,
  ArrowUpRight,
  Check,
  Info,
} from 'lucide-react';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsCoarsePointer } from '@/hooks/use-pointer-capabilities';
import { cn } from '@/lib/utils';
import { copyTextToClipboard } from '@/lib/copy-to-clipboard';
import { useImperativeHandle, forwardRef } from 'react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ConversionComboboxProps } from './combobox';
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
     z.coerce.number({ invalid_type_error: "Please enter a valid number" })
        .or(z.nan())
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
const shouldAbbreviateUnit = (unit: { name: string; symbol: string }) => {
  return (
    unit.name.length > MAX_UNIT_LABEL_LENGTH ||
    LONG_UNIT_NAMES.has(unit.name)
  );
};

const FINDER_VALUE_EXAMPLES = ['12 kg in mg', '5 kPa to atm', '100 L in mL', '3 h in s'];

const FINDER_UNIT_EXAMPLES = ['mile to meter', 'cm to ft', 'psi to kPa', '°C to °F', 'micro to milli', 'mph to km/h'];

const FINDER_CATEGORY_EXAMPLES = ['energy', 'pressure', 'length', 'bitcoin', 'bandwidth', 'speed'];

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
  const isFullPrecision = precisionMode === 'full';
  const isMobile = useIsMobile();
  const prefersTouch = useIsCoarsePointer();
  const measurementCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const fromTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const toTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [abbreviateFromTrigger, setAbbreviateFromTrigger] = React.useState(false);
  const [abbreviateToTrigger, setAbbreviateToTrigger] = React.useState(false);
  const [isSwapped, setIsSwapped] = React.useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      category: defaultCategory,
      fromUnit: resolvedFromUnit,
      toUnit: resolvedToUnit,
      value: resolvedValue,
    },
  });

  const { watch, setValue, reset, getValues, formState: { errors } } = form;
  const rhfCategory = watch("category") as UnitCategory | "";
  const rhfFromUnit = watch("fromUnit");
  const rhfToUnit = watch("toUnit");
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

  const currentUnitsForCategory = React.useMemo(() => {
    if (!rhfCategory) return [];
    return getUnitsForCategory(rhfCategory);
  }, [rhfCategory]);

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

  const evaluateLabelWidths = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    if (currentFromUnit && fromTriggerRef.current) {
      const triggerWidth = fromTriggerRef.current.clientWidth;
      if (triggerWidth > 0) {
        const labelText = `${currentFromUnit.name} (${currentFromUnit.symbol})`;
        const measuredWidth = measureLabelWidth(fromTriggerRef.current, labelText);
        setAbbreviateFromTrigger(
          measuredWidth > triggerWidth * 0.5 || shouldAbbreviateUnit(currentFromUnit),
        );
      } else {
        setAbbreviateFromTrigger(false);
      }
    } else {
      setAbbreviateFromTrigger(false);
    }

    if (currentToUnit && toTriggerRef.current) {
      const triggerWidth = toTriggerRef.current.clientWidth;
      if (triggerWidth > 0) {
        const labelText = `${currentToUnit.name} (${currentToUnit.symbol})`;
        const measuredWidth = measureLabelWidth(toTriggerRef.current, labelText);
        setAbbreviateToTrigger(
          measuredWidth > triggerWidth * 0.5 || shouldAbbreviateUnit(currentToUnit),
        );
      } else {
        setAbbreviateToTrigger(false);
      }
    } else {
      setAbbreviateToTrigger(false);
    }
  }, [currentFromUnit, currentToUnit, measureLabelWidth]);

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

  const unitConversionPairs = React.useMemo(() => {
    const orderedCategories: UnitCategory[] = [
      ...categoryDisplayOrder,
      ...Object.keys(unitData).filter(
        (category) => !categoryDisplayOrder.includes(category as UnitCategory),
      ),
    ]
      .filter((category, index, arr) => arr.indexOf(category) === index)
      .filter((category): category is UnitCategory => !!unitData[category]);

    return orderedCategories.flatMap((category) => {
      const data = unitData[category];
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
      return units.flatMap((fromUnit) =>
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
    return convertNumericValue(
      rhfCategory as UnitCategory,
      currentFromUnit.symbol,
      currentToUnit.symbol,
      1,
    );
  }, [rhfCategory, currentFromUnit, currentToUnit]);

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

    const result = convertUnitsDetailed({
      category: category as UnitCategory,
      fromUnit,
      toUnit,
      value: Number(value),
    });

    return result;
  }, []);

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

      if (payload.kind === 'category') {
        setIsSwapped(false);
        applyCategoryDefaults(payload.category, { forceDefaults: true });
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
      setValue('value', normalizedValue, { shouldValidate: true, shouldDirty: true });
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

  const showPlaceholder = rhfValue === undefined || rhfFromUnit === '' || !conversionResult || String(rhfValue).trim() === '' || String(rhfValue) === '-';
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

  const generalFormula = React.useMemo(() => {
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
  }, [rhfCategory, currentFromUnit, currentToUnit, multiplier, formatFormulaValue]);

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
  ]);
  const referenceTabs = React.useMemo<AccordionTabItem[]>(() => {
    const tabs: AccordionTabItem[] = [];
    if (generalFormula || dynamicFormula) {
      tabs.push({
        id: 'formula',
        label: 'Formula',
        content: (
          <div className="space-y-2 text-xs text-muted-foreground">
            {generalFormula && (
              <p className="text-sm font-semibold text-foreground">{generalFormula}</p>
            )}
            {dynamicFormula && (
              <p className="text-xs text-muted-foreground">{dynamicFormula}</p>
            )}
          </div>
        ),
      });
    }

    if (conversionSources.length > 0) {
      tabs.push({
        id: 'sources',
        label: 'Sources',
        content: (
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
                      {' '}
                      ·{' '}
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
        ),
      });
    }

    return tabs;
  }, [generalFormula, dynamicFormula, conversionSources]);
  const showPrecisionControls = false;
  const handlePrecisionToggle = React.useCallback(() => {
    setPrecisionMode((prev) => (prev === 'rounded' ? 'full' : 'rounded'));
  }, []);

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
    setValue("value", normalizedValue, { shouldValidate: true, shouldDirty: true });
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
  }, [showPlaceholder, conversionResult, formattedResultString, rhfToUnit, rhfFromUnit, getValues, toast, onResultCopied, rhfCategory, precisionMode]);


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

  const screenReaderText = showPlaceholder
    ? (rhfValue !== undefined && rhfFromUnit ? `Waiting for conversion of ${formatFromValue(Number(rhfValue), precisionMode)} ${rhfFromUnit}` : 'Enter a value and select units to convert')
    : `${formatFromValue(Number(rhfValue), precisionMode)} ${rhfFromUnit} = ${formattedResultString} ${rhfToUnit}`;

  const baseSaveDisabled = !rhfCategory || !rhfFromUnit || !rhfToUnit;
  const finalSaveDisabled = hasToggleFavorites ? baseSaveDisabled : baseSaveDisabled || disableAddFavoriteButton;
  const favoriteButtonLabel = hasToggleFavorites
    ? activeFavorite
      ? 'Remove from favorites'
      : 'Save conversion to favorites'
    : 'Save conversion to favorites';

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
     <Card
        id="converter"
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-lg backdrop-blur-sm",
          className
        )}
        aria-labelledby="unit-converter-title"
      >
        <CardHeader className="border-b border-border/60 px-5 py-5">
          <div className="flex items-center gap-3 text-xl font-semibold text-foreground" id="unit-converter-title">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FlaskConical className="h-5 w-5" aria-hidden="true" />
            </span>
            SwapUnits Converter
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter a value, choose your units, and copy the result instantly. History and favorites stay in sync automatically.
          </p>
        </CardHeader>
        <CardContent className={cn("flex flex-grow flex-col px-5 py-5")}>
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {screenReaderText}
          </div>
          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="flex flex-1 flex-col gap-6">
              <div className="flex flex-1 flex-col gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <div className="mb-1 flex items-center gap-2">
                        <Label
                          htmlFor="conversion-search"
                          className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground"
                        >
                          Conversion finder
                        </Label>
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                aria-label="How the conversion finder understands your input"
                              >
                                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              align="start"
                              className="max-w-[260px] whitespace-normal break-words text-xs leading-relaxed"
                            >
                              <div className="space-y-2">
                                <div>
                                  <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                                    TRY CONVERSIONS EG.
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
                                    OR FIND CATEGORY EG.
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
                      <div className="relative mb-6">
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
                      <FormLabel className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                        Measurement Category
                      </FormLabel>
                      <FormControl>
                        <MeasurementCategoryDropdown
                          options={categoryOptions}
                          value={(field.value as UnitCategory) ?? ''}
                          onSelect={(nextCategory) => {
                            if (typeof nextCategory !== 'string') {
                              return;
                            }
                            const normalizedCategory = nextCategory as UnitCategory;
                            field.onChange(normalizedCategory);
                            resetFinderInput();
                            applyCategoryDefaults(normalizedCategory, { forceDefaults: true });
                          }}
                          placeholder="Select a category"
                          triggerClassName="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {rhfCategory && (
                  <div className="flex flex-col gap-4">
                    {/* From Input Row */}
                    <div className="flex flex-wrap items-stretch gap-3">
                      <div className="flex min-w-0 flex-1">
                        <div className="flex w-full items-stretch divide-x divide-border/60 rounded-2xl border border-border/60 bg-[hsl(var(--control-background))] shadow-sm transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/25 focus-within:ring-offset-2 focus-within:ring-offset-background">
                          <FormField
                            control={form.control}
                            name="value"
                            render={({ field }) => (
                              <FormItem className="flex-1 space-y-0">
                                <FormControl>
                                  <Input
                                    id="value-input"
                                    name="from-value"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Enter value"
                                    {...field}
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
                                    className="h-11 w-full rounded-none border-0 bg-transparent px-3 text-base font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="fromUnit"
                            render={({ field }) => (
                              <FormItem className="min-w-[120px] space-y-0 md:min-w-[190px]">
                                <Select
                                  name="fromUnit"
                                  onValueChange={(value) => {
                                    resetFinderInput();
                                    field.onChange(value);
                                  }}
                                  value={field.value}
                                  disabled={!rhfCategory}
                                >
                                  <FormControl>
                                    <SelectTrigger
                                      ref={fromTriggerRef}
                                      className="h-11 rounded-none border-0 bg-transparent px-3 text-left text-sm font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                    >
                                      {field.value && currentFromUnit ? (
                                        (isMobile || abbreviateFromTrigger || shouldAbbreviateUnit(currentFromUnit)) ? (
                                          <span>({currentFromUnit.symbol})</span>
                                        ) : (
                                          <span>
                                            {currentFromUnit.name}{' '}
                                            ({currentFromUnit.symbol})
                                          </span>
                                        )
                                      ) : (
                                        <SelectValue placeholder="Unit" />
                                      )}
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent
                                    side="bottom"
                                    align="end"
                                    avoidCollisions={false}
                                    className="max-h-60 overflow-y-auto md:max-h-none md:overflow-y-visible"
                                  >
                                    {currentUnitsForCategory.map((unit) => (
                                      <SelectItem key={unit.symbol} value={unit.symbol} className="text-left">
                                        {unit.name} ({unit.symbol})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 shrink-0 rounded-xl border-0 bg-transparent text-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            aria-label="Open calculator"
                          >
                            <Calculator className="h-5 w-5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xs overflow-hidden rounded-2xl border border-border/60 bg-card p-0 shadow-xl">
                          <DialogHeader className="sr-only">
                            <DialogTitle>Calculator</DialogTitle>
                          </DialogHeader>
                          <SimpleCalculator onSendValue={handleCalculatorValueSent} onClose={() => setIsCalculatorOpen(false)} />
                        </DialogContent>
                      </Dialog>
                    </div>

                   {/* Middle Row - Swap and Favorite Buttons */}
                   <div className="flex flex-wrap items-stretch gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSwapClick}
                            disabled={!rhfFromUnit || !rhfToUnit}
                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border/60 bg-[hsl(var(--control-background))] text-sm font-medium transition hover:border-primary/60 hover:bg-primary/5 disabled:border-border/40"
                            aria-label="Swap from and to units"
                        >
                            <ArrowRightLeft className={cn("h-4 w-4 text-primary transition-transform", isSwapped && "rotate-180 scale-x-[-1]")} aria-hidden="true" />
                            <span className="hidden md:inline">Swap units</span>
                        </Button>

                         {(onSaveFavoriteProp || hasToggleFavorites) && (
                          <Button
                              type="button"
                              variant="ghost" 
                              onClick={hasToggleFavorites ? () => handleToggleFavoriteInternal() : handleSaveToFavoritesInternal}
                              disabled={finalSaveDisabled || showPlaceholder}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-sm font-medium transition hover:bg-primary/10 hover:text-primary disabled:text-muted-foreground disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              aria-label={favoriteButtonLabel}
                            >
                              <Star className={cn("h-4 w-4", activeFavorite ? "fill-primary text-primary" : (!finalSaveDisabled && !showPlaceholder) ? "text-primary" : "text-muted-foreground")} />
                          </Button>
                        )}
                    </div>


                    {/* To Result Row */}
                    <div className="flex flex-wrap items-stretch gap-3">
                      <div className="flex min-w-0 flex-1">
                        <div className="flex w-full items-stretch divide-x divide-border/60 rounded-2xl border border-border/60 bg-secondary/60 shadow-sm transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/25 focus-within:ring-offset-2 focus-within:ring-offset-background">
                          <div className="flex-1">
                            <Input
                              id="conversion-result"
                              name="conversion-result"
                              ref={resultInputRef}
                              readOnly
                              value={showPlaceholder ? '-' : formattedResultString}
                              className={cn(
                                "h-11 w-full rounded-none border-0 bg-transparent px-3 text-base font-semibold text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
                                showPlaceholder && 'text-muted-foreground'
                              )}
                              aria-label="Conversion result"
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="toUnit"
                            render={({ field }) => (
                              <FormItem className="min-w-[120px] space-y-0 md:min-w-[190px]">
                                <Select
                                  name="toUnit"
                                  onValueChange={(value) => {
                                    resetFinderInput();
                                    field.onChange(value);
                                  }}
                                  value={field.value}
                                  disabled={!rhfCategory}
                                >
                                  <FormControl>
                                    <SelectTrigger
                                      ref={toTriggerRef}
                                      className="h-11 rounded-none border-0 bg-transparent px-3 text-left text-sm font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                    >
                                      {field.value && currentToUnit ? (
                                        (isMobile || abbreviateToTrigger || shouldAbbreviateUnit(currentToUnit)) ? (
                                          <span>({currentToUnit.symbol})</span>
                                        ) : (
                                          <span>
                                            {currentToUnit.name}{' '}
                                            ({currentToUnit.symbol})
                                          </span>
                                        )
                                      ) : (
                                        <SelectValue placeholder="Unit" />
                                      )}
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent
                                    side="bottom"
                                    align="end"
                                    avoidCollisions={false}
                                    className="max-h-60 overflow-y-auto md:max-h-none md:overflow-y-visible"
                                  >
                                    {currentUnitsForCategory.map((unit) => (
                                      <SelectItem key={unit.symbol} value={unit.symbol} className="text-left">
                                        {unit.name} ({unit.symbol})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCopy}
                        disabled={showPlaceholder}
                        className="h-11 w-11 shrink-0 rounded-xl border-0 bg-transparent text-foreground transition hover:bg-primary/10 hover:text-primary disabled:text-muted-foreground disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        aria-label="Copy result to clipboard"
                      >
                        {resultCopyState === 'success' ? (
                          <Check className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {showPrecisionControls && !showPlaceholder && (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                              aria-label="How precision is calculated"
                            >
                              <Info className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="start"
                            sideOffset={6}
                            className="max-w-sm text-xs text-muted-foreground"
                          >
                            {actualFormatUsed === 'scientific'
                              ? 'Scientific notation already shows the exact value computed from our unit factors.'
                              : isFullPrecision
                                ? 'Full precision shows additional decimal places using the exact conversion factors from our standards-backed sources (NIST Guide to SI, ASTM, IEC, etc.).'
                                : 'Rounded results show up to four digits after the decimal for readability. Switch to full precision to inspect the raw calculation.'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span>{isFullPrecision ? 'Full precision result' : 'Rounded result (4 decimals max)'}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={handlePrecisionToggle}
                      disabled={actualFormatUsed === 'scientific'}
                    >
                      {isFullPrecision ? 'Show rounded' : 'Show full precision'}
                    </Button>
                  </div>
                )}
                
                 {/* Textual Conversion Result Display */}
                {!showPlaceholder && conversionResult && rhfCategory && rhfFromUnit && rhfToUnit && (
                  <div className="relative">
                    <div
                      className={cn(
                        "flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-3 text-base font-semibold text-primary transition-colors duration-700 sm:gap-3",
                        resultHighlightPulse &&
                          'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-[hsl(var(--control-background))] dark:text-primary'
                      )}
                    >
                      <div className="flex flex-1 items-center gap-2 text-left">
                        <span className="truncate">
                          {`${formatFromValue(Number(rhfValue), precisionMode)} ${rhfFromUnit} = ${formattedResultString} ${rhfToUnit}`}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyTextualResult}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--control-background))] text-primary transition hover:bg-primary/10"
                          aria-label="Copy textual result to clipboard"
                        >
                          {textCopyState === 'success' ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {currentConversionPairUrl && (
                        <Link
                          href={currentConversionPairUrl}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--control-background))] text-primary transition hover:bg-primary/10"
                          aria-label="Open detailed conversion page"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {referenceTabs.length > 0 && (
                  <AccordionTabs
                    tabs={referenceTabs}
                    initiallyOpen={false}
                    className="mt-2"
                  />
                )}

                <fieldset className="pt-1">
                   <legend className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Result formatting</legend>
                   <div className="rounded-xl border border-border/60 bg-[hsl(var(--control-background))] px-3 py-3">
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
                </fieldset>
                </div> 
            </form>
          </Form>
        </CardContent>
      </Card>
  </>
  );
}));

UnitConverter.displayName = 'UnitConverter';

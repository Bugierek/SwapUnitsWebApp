
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { unitData, getUnitsForCategory, categoryDisplayOrder } from '@/lib/unit-data';
import type { UnitCategory, Unit, ConversionResult, Preset, NumberFormat, ConversionHistoryItem, FavoriteItem, UnitData } from '@/types';
import {
  ArrowRightLeft,
  FlaskConical,
  Copy,
  Star,
  Calculator,
  ChevronsUpDown,
  ArrowUpRight,
  Check,
} from 'lucide-react';

import { UnitIcon } from './unit-icon';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
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
  DialogClose,
} from '@/components/ui/dialog';
import SimpleCalculator from '@/components/simple-calculator';
import { Separator } from './ui/separator';
import { getCategorySlug } from '@/lib/category-info';
import { convertUnitsDetailed } from '@/lib/conversion-math';
import { buildConversionPairUrl } from '@/lib/conversion-pairs';
import { getAliasesForUnit } from '@/lib/conversion-query-parser';
import { getConversionSources } from '@/lib/conversion-sources';

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
}

const CATEGORY_SEARCH_KEYWORDS: Partial<Record<UnitCategory, string[]>> = {
  Length: ['distance', 'height', 'width', 'depth', 'span'],
  Mass: ['weight', 'heaviness'],
  Temperature: ['heat', 'cold', 'climate', 'weather'],
  Time: ['duration', 'interval', 'schedule'],
  Pressure: ['barometric', 'atm', 'compression'],
  Area: ['surface', 'sq', 'square'],
  Volume: ['capacity', 'cubic', 'liters', 'gallons'],
  Energy: ['power', 'joules', 'calories'],
  Speed: ['velocity', 'pace', 'rate'],
  'Fuel Economy': ['fuel', 'mpg', 'efficiency', 'consumption', 'ev'],
  'Data Storage': ['storage', 'memory', 'drive', 'disk', 'files'],
  'Data Transfer Rate': ['bandwidth', 'network', 'internet', 'upload', 'download'],
  Bitcoin: ['crypto', 'cryptocurrency', 'btc', 'satoshi'],
};

const CATEGORY_TILE_TITLES: Partial<Record<UnitCategory, string>> = {
  'Fuel Economy': 'Fuel efficiency',
  'Data Transfer Rate': 'Bandwidth',
};

const CATEGORY_TILE_SECONDARY_LIMIT: Partial<Record<UnitCategory, number>> = {
  'Fuel Economy': 2,
  'Data Transfer Rate': 2,
};

const formatNumber = (num: number, requestedFormat: NumberFormat = 'normal'): {
    formattedString: string;
    actualFormatUsed: NumberFormat;
    scientificReason: 'magnitude' | 'user_choice' | null;
} => {
    if (!isFinite(num)) {
        return { formattedString: '-', actualFormatUsed: requestedFormat, scientificReason: null };
    }

    let actualFormatUsed: NumberFormat = requestedFormat;
    let formattedString: string;
    let scientificReason: 'magnitude' | 'user_choice' | null = null;

    const useScientificDueToMagnitude = (Math.abs(num) > 1e9 || (Math.abs(num) < 1e-7 && num !== 0));

    if (requestedFormat === 'scientific' || useScientificDueToMagnitude) {
        actualFormatUsed = 'scientific';
        scientificReason = useScientificDueToMagnitude ? 'magnitude' : (requestedFormat === 'scientific' ? 'user_choice' : null);

        let exponential = num.toExponential(7).replace('e', 'E');
        const match = exponential.match(/^(-?\d(?:\.\d*)?)(0*)(E[+-]\d+)$/);
        if (match) {
            let coefficient = match[1];
            const exponent = match[3];
            if (coefficient.includes('.')) {
                coefficient = coefficient.replace(/0+$/, '');
                coefficient = coefficient.replace(/\.$/, '');
            }
            formattedString = coefficient + exponent;
        } else {
            formattedString = exponential;
        }
    } else {
        const numRoundedForCheck = parseFloat(num.toFixed(7));
        if (numRoundedForCheck % 1 === 0) {
            formattedString = numRoundedForCheck.toLocaleString(undefined, { maximumFractionDigits: 0 });
        } else {
            let fixedStr = num.toFixed(7);
            fixedStr = fixedStr.replace(/(\.[0-9]*[1-9])0+$|\.0+$/, '$1');
            formattedString = parseFloat(fixedStr).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 7});
        }
         actualFormatUsed = 'normal';
    }

    return { formattedString, actualFormatUsed, scientificReason };
};

const formatFromValue = (num: number | undefined): string => {
    if (num === undefined || !isFinite(num)) {
        return '-';
    }
    const useScientificDueToMagnitude = (Math.abs(num) > 1e9 || (Math.abs(num) < 1e-7 && num !== 0));

    if (useScientificDueToMagnitude) {
        let exponential = num.toExponential(7).replace('e', 'E');
        const match = exponential.match(/^(-?\d(?:\.\d*)?)(0*)(E[+-]\d+)$/);
        if (match) {
            let coefficient = match[1];
            const exponent = match[3];
            if (coefficient.includes('.')) {
                coefficient = coefficient.replace(/0+$/, '');
                coefficient = coefficient.replace(/\.$/, '');
            }
            return coefficient + exponent;
        }
        return exponential;
    }
    const numRoundedForCheck = parseFloat(num.toFixed(7));
     if (numRoundedForCheck % 1 === 0) {
        return numRoundedForCheck.toLocaleString(undefined, { maximumFractionDigits: 0 });
    } else {
        let fixedStr = num.toFixed(7);
        fixedStr = fixedStr.replace(/(\.[0-9]*[1-9])0+$|\.0+$/, '$1');
        return parseFloat(fixedStr).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 7});
    }
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
  const [ComboboxComponent, setComboboxComponent] = React.useState<React.ComponentType<any> | null>(null);
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
  const [isNormalFormatDisabled, setIsNormalFormatDisabled] = React.useState<boolean>(false);
  const isMobile = useIsMobile();
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
  const [resultCopyState, setResultCopyState] = React.useState<'idle' | 'success'>('idle');
  const [textCopyState, setTextCopyState] = React.useState<'idle' | 'success'>('idle');
  const currentConversionPairUrl = React.useMemo(() => {
    if (!rhfCategory || !rhfFromUnit || !rhfToUnit) {
      return null;
    }
    return buildConversionPairUrl(rhfCategory as UnitCategory, rhfFromUnit, rhfToUnit);
  }, [rhfCategory, rhfFromUnit, rhfToUnit]);

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
        (CATEGORY_SEARCH_KEYWORDS[category] ?? []).forEach((keyword) =>
          keywords.add(keyword.toLowerCase()),
        );
        units.forEach((unit) => {
          keywords.add(unit.symbol.toLowerCase());
          keywords.add(unit.name.toLowerCase());
          if (unit.unitType) {
            keywords.add(unit.unitType.replace(/_/g, ' ').toLowerCase());
          }
        });
        return {
          value: category,
          title: CATEGORY_TILE_TITLES[category] ?? unitData[category].name,
          slug,
          topUnits,
          keywords: Array.from(keywords),
        };
      });
  }, []);

  const currentUnitsForCategory = React.useMemo(() => {
    if (!rhfCategory) return [];
    return getUnitsForCategory(rhfCategory);
  }, [rhfCategory]);

  const conversionPairs = React.useMemo(
    () =>
      (Object.entries(unitData) as [UnitCategory, UnitData][]).flatMap(
        ([category, data]) => {
          const units = getUnitsForCategory(category);
          return units.flatMap((fromUnit) =>
            units
              .filter((toUnit) => toUnit.symbol !== fromUnit.symbol)
              .map((toUnit) => {
                const label = `${fromUnit.symbol} \u2192 ${toUnit.symbol}`;
                const pairUrl = buildConversionPairUrl(
                  category,
                  fromUnit.symbol,
                  toUnit.symbol,
                );
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
                };
              }),
          );
      },
    ),
    [],
  );

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
        switch (category) {
          case 'Length':
            newFromUnitSymbol = 'm';
            newToUnitSymbol = 'ft';
            break;
          case 'Mass':
            newFromUnitSymbol = 'kg';
            newToUnitSymbol = 'g';
            break;
          case 'Temperature':
            newFromUnitSymbol = '°C';
            newToUnitSymbol = '°F';
            break;
          case 'Time':
            newFromUnitSymbol = 's';
            newToUnitSymbol = 'ms';
            break;
          case 'Pressure':
            newFromUnitSymbol = 'Pa';
            newToUnitSymbol = 'atm';
            break;
          case 'Area':
            newFromUnitSymbol = 'm²';
            newToUnitSymbol = 'ft²';
            break;
          case 'Volume':
            newFromUnitSymbol = 'L';
            newToUnitSymbol = 'mL';
            break;
          case 'Energy':
            newFromUnitSymbol = 'J';
            newToUnitSymbol = 'kJ';
            break;
          case 'Speed':
            newFromUnitSymbol = 'm/s';
            newToUnitSymbol = 'km/h';
            break;
          case 'Fuel Economy':
            newFromUnitSymbol = 'km/L';
            newToUnitSymbol = 'MPG (US)';
            break;
          case 'Data Storage':
            newFromUnitSymbol = 'GB';
            newToUnitSymbol = 'MB';
            break;
          case 'Data Transfer Rate':
            newFromUnitSymbol = 'Mbps';
            newToUnitSymbol = 'MB/s';
            break;
          case 'Bitcoin':
            newFromUnitSymbol = 'BTC';
            newToUnitSymbol = 'sat';
            break;
          default: {
            newFromUnitSymbol = availableUnits[0]?.symbol || '';
            const alternateUnit = availableUnits.find(
              (unit) => unit.symbol !== newFromUnitSymbol,
            );
            newToUnitSymbol = alternateUnit?.symbol || availableUnits[1]?.symbol || newFromUnitSymbol;
            break;
          }
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
    }) => {
      setValue('category', category, { shouldValidate: true, shouldDirty: true });
      setSelectedCategoryLocal(category);

      Promise.resolve().then(() => {
        setValue('fromUnit', fromUnit, { shouldValidate: true, shouldDirty: true });
        setValue('toUnit', toUnit, { shouldValidate: true, shouldDirty: true });
        setValue('value', parsedValue, { shouldValidate: true, shouldDirty: true });
        setLastValidInputValue(parsedValue);

        const conversion = convertUnits({
          category,
          fromUnit,
          toUnit,
          value: parsedValue,
        });

        setConversionResult(conversion);
      });
    },
    [
      convertUnits,
      setValue,
      setSelectedCategoryLocal,
      setLastValidInputValue,
      setConversionResult,
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
        });
    });
  }, [setValue, getValues, convertUnits, lastValidInputValue]);

  const internalApplyHistorySelect = React.useCallback((item: ConversionHistoryItem) => {
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
  }, [setValue, reset, getValues, convertUnits]);


  useImperativeHandle(ref, () => ({
    handlePresetSelect: internalHandlePresetSelect,
    applyHistorySelect: internalApplyHistorySelect,
  }));


 const handleSwapClick = React.useCallback(() => {
    const currentFromUnit = getValues("fromUnit");
    const currentToUnit = getValues("toUnit");
    const currentFromValueString = String(getValues("value"));
    let newInputValue: number | undefined = undefined;

    if (conversionResult && isFinite(conversionResult.value)) {
        newInputValue = conversionResult.value;
    } else if (currentFromValueString.trim() !== '' && !isNaN(Number(currentFromValueString))) {
        newInputValue = Number(currentFromValueString);
    } else {
        newInputValue = lastValidInputValue;
    }
    
    setValue("value", newInputValue, { shouldValidate: true, shouldDirty: true });
    if (newInputValue !== undefined) {
      setLastValidInputValue(newInputValue);
    }
    setValue("fromUnit", currentToUnit, { shouldValidate: true });
    setValue("toUnit", currentFromUnit, { shouldValidate: true });

    setIsSwapped((prev) => !prev); 

  }, [setValue, getValues, conversionResult, lastValidInputValue]);


  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const showPlaceholder = rhfValue === undefined || rhfFromUnit === '' || !conversionResult || String(rhfValue).trim() === '' || String(rhfValue) === '-';
  React.useEffect(() => {
    if (!showPlaceholder) return;
    if (textCopyState !== 'idle') {
      setTextCopyState('idle');
    }
    if (resultCopyState !== 'idle') {
      setResultCopyState('idle');
    }
  }, [showPlaceholder, textCopyState, resultCopyState]);

  const { formattedString: formattedResultString, actualFormatUsed, scientificReason } = React.useMemo(() => {
    return showPlaceholder || !conversionResult ? { formattedString: '-', actualFormatUsed: numberFormat, scientificReason: null } : formatNumber(conversionResult.value, numberFormat);
  }, [showPlaceholder, conversionResult, numberFormat]);

  React.useEffect(() => {
      handleActualFormatChange(actualFormatUsed, scientificReason);
  }, [actualFormatUsed, scientificReason, handleActualFormatChange]);

  React.useEffect(() => {
    if (resultCopyState === 'success') {
      setResultCopyState('idle');
    }
  }, [rhfCategory, rhfFromUnit, rhfToUnit, formattedResultString, rhfValue]);

  React.useEffect(() => {
    if (textCopyState === 'success') {
      setTextCopyState('idle');
    }
  }, [rhfCategory, rhfFromUnit, rhfToUnit, formattedResultString, rhfValue, showPlaceholder]);

  React.useEffect(() => {
    if (textCopyState === 'success') {
      setTextCopyState('idle');
    }
  }, [rhfCategory, rhfFromUnit, rhfToUnit, formattedResultString, rhfValue, showPlaceholder]);


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
        : `${formatFromValue(numericFromValue)} ${rhfFromUnit} = ${formattedResultString} ${rhfToUnit}`;
    
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
  }, [showPlaceholder, conversionResult, formattedResultString, rhfToUnit, rhfFromUnit, getValues, toast, onResultCopied, rhfCategory]);


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
    ? (rhfValue !== undefined && rhfFromUnit ? `Waiting for conversion of ${formatFromValue(Number(rhfValue))} ${rhfFromUnit}` : 'Enter a value and select units to convert')
    : `${formatFromValue(Number(rhfValue))} ${rhfFromUnit} = ${formattedResultString} ${rhfToUnit}`;

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
                      <Label htmlFor="conversion-search" className="mb-1 block text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                        Conversion finder
                      </Label>
                      <div className="relative mb-3">
                        {ComboboxComponent ? (
                          <ComboboxComponent
                            items={conversionPairs}
                            value={selectedConversionPairValue}
                            onChange={(nextValue: string) => {
                              const [category, from, to] = nextValue.split(':');
                              if (category && from && to) {
                                setValue('category', category as UnitCategory);
                                setValue('fromUnit', from);
                                setValue('toUnit', to);
                              }
                            }}
                            placeholder={'Type a phrase like "100 kg in g" to get a conversion'}
                            inputId="conversion-search"
                            onParsedConversion={handleParsedConversion}
                            onParseError={handleParseError}
                          />
                        ) : (
                          <Button
                            type="button"
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
                      <Label htmlFor="category-select" className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                        Measurement Category
                      </Label>
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
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                          <FormItem className="flex-grow">
                            <FormControl>
                              <Input
                                id="value-input"
                                type="text"
                                inputMode="decimal"
                                placeholder="Enter value"
                                {...field}
                                onChange={(e) => {
                                    const rawValue = e.target.value;
                                     if (rawValue === '' || rawValue === '-' || /^-?\d*\.?\d*([eE][-+]?\d*)?$/.test(rawValue) || /^-?\d{1,8}(\.\d{0,7})?([eE][-+]?\d*)?$/.test(rawValue)) {
                                        if (/([eE])/.test(rawValue)) {
                                            field.onChange(rawValue);
                                        } else {
                                            const parts = rawValue.split('.');
                                            if (parts[0].replace('-', '').length <= 8 && (parts[1] === undefined || parts[1].length <= 7)) {
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
                                className={cn(
                                  "h-11 w-full rounded-xl border border-border/60 bg-[hsl(var(--control-background))] px-3 text-base font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                )}
                              />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                          <DialogTrigger asChild>
                              <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-11 w-11 shrink-0 rounded-xl border-border/60 bg-[hsl(var(--control-background))] text-foreground transition hover:border-primary/60 hover:text-primary"
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
                      <FormField
                        control={form.control}
                        name="fromUnit"
                        render={({ field }) => (
                          <FormItem className="flex-shrink-0">
                            <Select
                              onValueChange={(value) => field.onChange(value)}
                              value={field.value}
                              disabled={!rhfCategory}
                            >
                              <FormControl>
                                <SelectTrigger
                                  className={cn(
                                    "h-11 min-w-[110px] rounded-xl border border-border/60 bg-[hsl(var(--control-background))] px-3 text-left text-sm font-medium transition hover:border-primary/50 focus-visible:border-primary/60 md:min-w-[180px]"
                                  )}
                                >
                                  {field.value && currentUnitsForCategory.find(u => u.symbol === field.value) ? (
                                    <>
                                      {isMobile ? (
                                        <span>({currentUnitsForCategory.find(u => u.symbol === field.value)!.symbol})</span>
                                      ) : (
                                        <span>
                                          {currentUnitsForCategory.find(u => u.symbol === field.value)!.name}{' '}
                                          ({currentUnitsForCategory.find(u => u.symbol === field.value)!.symbol})
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <SelectValue placeholder="Unit" />
                                  )}
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent side="bottom" align="end" avoidCollisions={false} className="max-h-60 overflow-y-auto md:max-h-none md:overflow-y-visible">
                                {currentUnitsForCategory.map((unit) => (
                                  <SelectItem key={unit.symbol} value={unit.symbol} className="text-left">
                                    {unit.name} ({unit.symbol})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                   {/* Middle Row - Swap and Favorite Buttons */}
                   <div className="flex w-full flex-col gap-3 md:flex-row">
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
                              variant="outline" 
                              onClick={hasToggleFavorites ? () => handleToggleFavoriteInternal() : handleSaveToFavoritesInternal}
                              disabled={finalSaveDisabled || showPlaceholder}
                              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border/60 bg-[hsl(var(--control-background))] text-sm font-medium transition hover:border-primary/60 hover:bg-primary/5 md:flex-none md:px-5"
                              aria-label={favoriteButtonLabel}
                            >
                              <Star className={cn("h-4 w-4", activeFavorite ? "fill-primary text-primary" : (!finalSaveDisabled && !showPlaceholder) ? "text-primary" : "text-muted-foreground")} />
                            </Button>
                        )}
                    </div>


                    {/* To Result Row */}
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                      <Input
                          readOnly
                          value={showPlaceholder ? '-' : formattedResultString}
                          className={cn(
                            "h-11 w-full rounded-xl border border-border/60 bg-secondary/60 px-3 text-base font-semibold text-foreground",
                            showPlaceholder && 'text-muted-foreground'
                          )}
                          aria-label="Conversion result"
                        />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopy}
                        disabled={showPlaceholder}
                        className="h-11 w-11 shrink-0 rounded-xl border border-border/60 bg-[hsl(var(--control-background))] text-foreground transition hover:border-primary/60 hover:text-primary disabled:bg-muted"
                        aria-label="Copy result to clipboard"
                      >
                        {resultCopyState === 'success' ? (
                          <Check className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </Button>
                      <FormField
                        control={form.control}
                        name="toUnit"
                        render={({ field }) => (
                          <FormItem className="flex-shrink-0">
                            <Select
                              onValueChange={(value) => field.onChange(value)}
                              value={field.value}
                              disabled={!rhfCategory}
                            >
                              <FormControl>
                                <SelectTrigger className={cn(
                                   "h-11 min-w-[110px] rounded-xl border border-border/60 bg-[hsl(var(--control-background))] px-3 text-left text-sm font-medium transition hover:border-primary/50 focus-visible:border-primary/60 md:min-w-[180px]"
                                  )}
                                 >
                                  {field.value && currentUnitsForCategory.find(u => u.symbol === field.value) ? (
                                    <>
                                      {isMobile ? (
                                        <span>({currentUnitsForCategory.find(u => u.symbol === field.value)!.symbol})</span>
                                      ) : (
                                        <span>
                                          {currentUnitsForCategory.find(u => u.symbol === field.value)!.name}{' '}
                                          ({currentUnitsForCategory.find(u => u.symbol === field.value)!.symbol})
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <SelectValue placeholder="Unit" />
                                  )}
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent side="bottom" align="end" avoidCollisions={false} className="max-h-60 overflow-y-auto md:max-h-none md:overflow-y-visible">
                                 {currentUnitsForCategory.map((unit) => (
                                  <SelectItem key={unit.symbol} value={unit.symbol} className="text-left">
                                    {unit.name} ({unit.symbol})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
                
                 {/* Textual Conversion Result Display */}
                {!showPlaceholder && conversionResult && rhfCategory && rhfFromUnit && rhfToUnit && (
                  <div className="relative">
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-3 text-sm font-medium text-primary sm:gap-3">
                      <div className="flex flex-1 items-center gap-2 text-left">
                        <span className="truncate">
                          {`${formatFromValue(Number(rhfValue))} ${rhfFromUnit} = ${formattedResultString} ${rhfToUnit}`}
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

                {conversionSources.length > 0 && (
                  <details className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-xs text-muted-foreground">
                    <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-foreground">
                      Conversion sources
                      <span className="text-xs font-normal text-muted-foreground">
                        Tap or click to view references
                      </span>
                    </summary>
                    <ul className="mt-3 space-y-3">
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
                  </details>
                )}

                <fieldset className="pt-1">
                   <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Result formatting</Label>
                   <div className="rounded-xl border border-border/60 bg-[hsl(var(--control-background))] px-3 py-3">
                   <RadioGroup
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
                           "cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition",
                            isNormalFormatDisabled && "text-muted-foreground cursor-not-allowed"
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
  );
}));

UnitConverter.displayName = 'UnitConverter';

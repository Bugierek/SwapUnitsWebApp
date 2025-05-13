
'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { unitData, getUnitsForCategoryAndMode } from '@/lib/unit-data';
import type { UnitCategory, Unit, ConversionResult, Preset, NumberFormat, ConversionHistoryItem, FavoriteItem } from '@/types';
import {
  ArrowRightLeft,
  FlaskConical,
  Copy,
  Star,
} from 'lucide-react';

import { UnitIcon } from './unit-icon';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useImperativeHandle, forwardRef } from 'react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

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
}

export interface UnitConverterHandle {
  handlePresetSelect: (preset: Preset | FavoriteItem) => void;
  applyHistorySelect: (item: ConversionHistoryItem) => void;
}

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
        actualFormatUsed = 'normal';
        const numRoundedForCheck = parseFloat(num.toFixed(7));
        if (numRoundedForCheck % 1 === 0) {
            formattedString = numRoundedForCheck.toLocaleString(undefined, { maximumFractionDigits: 0 });
        } else {
            let fixedStr = num.toFixed(7);
            fixedStr = fixedStr.replace(/(\.[0-9]*[1-9])0+$|\.0+$/, '$1');
            formattedString = parseFloat(fixedStr).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 7});
        }
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


export const UnitConverter = React.memo(forwardRef<UnitConverterHandle, UnitConverterProps>(function UnitConverterComponent({ className, onResultCopied, onSaveFavorite: onSaveFavoriteProp, disableAddFavoriteButton = false }, ref) {
  const [selectedCategoryLocal, setSelectedCategoryLocal] = React.useState<UnitCategory | "">("");
  const [conversionResult, setConversionResult] = React.useState<ConversionResult | null>(null);
  const [lastValidInputValue, setLastValidInputValue] = React.useState<number | undefined>(1);
  const [numberFormat, setNumberFormat] = React.useState<NumberFormat>('normal');
  const [isNormalFormatDisabled, setIsNormalFormatDisabled] = React.useState<boolean>(false);
  const isMobile = useIsMobile();
  const [isSwapped, setIsSwapped] = React.useState(false);
  const { toast } = useToast();


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      category: "Mass",
      fromUnit: "kg",
      toUnit: "g",
      value: 1,
    },
  });

  const { watch, setValue, reset, getValues, formState: { errors } } = form;
  const rhfCategory = watch("category") as UnitCategory | "";
  const rhfFromUnit = watch("fromUnit");
  const rhfToUnit = watch("toUnit");
  const rhfValue = watch("value");

  const categoriesForDropdown = React.useMemo(() => {
    return (Object.keys(unitData) as UnitCategory[]);
  }, []);
  
  const currentUnitsForCategory = React.useMemo(() => {
    if (!rhfCategory) return [];
    return getUnitsForCategoryAndMode(rhfCategory);
  }, [rhfCategory]);


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

  const convertUnits = React.useCallback((data: Partial<FormData>): ConversionResult | null => {
    const { category, fromUnit, toUnit, value } = data;
    const numericValue = Number(value);

    if (!category || !fromUnit || !toUnit || value === undefined || value === null || !isFinite(numericValue) || String(value).trim() === '') {
        return null;
    }

    const currentCategory = category as UnitCategory;
    const currentUnits = getUnitsForCategoryAndMode(currentCategory);
    const fromUnitData = currentUnits.find((u) => u.symbol === fromUnit);
    const toUnitData = currentUnits.find((u) => u.symbol === toUnit);

    if (!fromUnitData || !toUnitData) {
      return null;
    }
    let resultValue: number;

    if (currentCategory === "Temperature") {
      let tempInCelsius: number;
      if (fromUnitData.symbol === "°C") {
        tempInCelsius = numericValue;
      } else if (fromUnitData.symbol === "°F") {
        tempInCelsius = (numericValue - 32) * (5 / 9);
      } else { // Kelvin
        tempInCelsius = numericValue - 273.15;
      }

      if (toUnitData.symbol === "°C") {
        resultValue = tempInCelsius;
      } else if (toUnitData.symbol === "°F") {
        resultValue = tempInCelsius * (9 / 5) + 32;
      } else { // Kelvin
        resultValue = tempInCelsius + 273.15;
      }
    } else if (currentCategory === "Fuel Economy") {
        let valueInBaseUnit: number;
        if (fromUnitData.unitType === 'inverse_consumption') {
            if (numericValue === 0) return { value: Infinity, unit: toUnitData.symbol };
            valueInBaseUnit = fromUnitData.factor / numericValue;
        } else {
            valueInBaseUnit = numericValue * fromUnitData.factor;
        }

        if (toUnitData.unitType === 'inverse_consumption') {
            if (valueInBaseUnit === 0) return { value: Infinity, unit: toUnitData.symbol };
            resultValue = toUnitData.factor / valueInBaseUnit;
        } else {
            resultValue = valueInBaseUnit / toUnitData.factor;
        }
    } else {
      const valueInBaseUnit = numericValue * fromUnitData.factor;
      resultValue = valueInBaseUnit / toUnitData.factor;
    }
    return isFinite(resultValue) ? { value: resultValue, unit: toUnitData.symbol } : null;
  }, []);


 React.useEffect(() => {
    const categoryToProcess = rhfCategory as UnitCategory;
    if (!categoryToProcess) return;

    const categoryChangedSystemOrUser = categoryToProcess !== selectedCategoryLocal;

    if (categoryChangedSystemOrUser) {
        setSelectedCategoryLocal(categoryToProcess);

        const availableUnits = getUnitsForCategoryAndMode(categoryToProcess);
        if (availableUnits.length === 0) {
            return;
        }

        let newFromUnitSymbol = rhfFromUnit;
        let newToUnitSymbol = rhfToUnit;
        
        const fromUnitStillValidInNewContext = availableUnits.some(u => u.symbol === newFromUnitSymbol);
        const toUnitStillValidInNewContext = availableUnits.some(u => u.symbol === newToUnitSymbol);

        if (categoryToProcess !== selectedCategoryLocal || !fromUnitStillValidInNewContext || !toUnitStillValidInNewContext) {
            switch (categoryToProcess) {
                case 'Length': newFromUnitSymbol = 'm'; newToUnitSymbol = 'ft'; break;
                case 'Mass': newFromUnitSymbol = 'kg'; newToUnitSymbol = 'g'; break;
                case 'Temperature': newFromUnitSymbol = '°C'; newToUnitSymbol = '°F'; break;
                case 'Time': newFromUnitSymbol = 's'; newToUnitSymbol = 'ms'; break;
                case 'Pressure': newFromUnitSymbol = 'Pa'; newToUnitSymbol = 'kPa'; break;
                case 'Area': newFromUnitSymbol = 'm²'; newToUnitSymbol = 'ft²'; break;
                case 'Volume': newFromUnitSymbol = 'L'; newToUnitSymbol = 'mL'; break;
                case 'Energy': newFromUnitSymbol = 'J'; newToUnitSymbol = 'kJ'; break;
                case 'Speed': newFromUnitSymbol = 'm/s'; newToUnitSymbol = 'km/h'; break;
                case 'Fuel Economy': newFromUnitSymbol = 'km/L'; newToUnitSymbol = 'MPG (US)'; break;
                case 'Data Storage': newFromUnitSymbol = 'GB'; newToUnitSymbol = 'MB'; break;
                case 'Data Transfer Rate': newFromUnitSymbol = 'Mbps'; newToUnitSymbol = 'MB/s'; break;
                case 'Bitcoin': newFromUnitSymbol = 'BTC'; newToUnitSymbol = 'sat'; break;
                default:
                    newFromUnitSymbol = availableUnits[0]?.symbol || "";
                    newToUnitSymbol = availableUnits.length > 1 ? availableUnits[1]?.symbol : (availableUnits[0]?.symbol || "");
                    if (newFromUnitSymbol === newToUnitSymbol && availableUnits.length > 1) {
                         newToUnitSymbol = availableUnits[1]?.symbol || newFromUnitSymbol;
                    } else if (newFromUnitSymbol === newToUnitSymbol && availableUnits.length === 1) {
                        newToUnitSymbol = newFromUnitSymbol;
                    }
            }
            if (!availableUnits.some(u => u.symbol === newFromUnitSymbol)) {
                newFromUnitSymbol = availableUnits[0]?.symbol || "";
            }
            if (!availableUnits.some(u => u.symbol === newToUnitSymbol) || newFromUnitSymbol === newToUnitSymbol) {
                newToUnitSymbol = availableUnits.find(u => u.symbol !== newFromUnitSymbol)?.symbol || (availableUnits[0]?.symbol || "");
                 if (newFromUnitSymbol === newToUnitSymbol && availableUnits.length > 1) {
                    newToUnitSymbol = availableUnits[1]?.symbol || newFromUnitSymbol;
                }
            }

            setValue("fromUnit", newFromUnitSymbol, { shouldValidate: true, shouldDirty: true });
            setValue("toUnit", newToUnitSymbol, { shouldValidate: true, shouldDirty: true });
        }

        const formValues = getValues();
        if (formValues.fromUnit === newFromUnitSymbol && formValues.toUnit === newToUnitSymbol) {
            const currentVal = formValues.value;
            const valToSet = (currentVal === '' || currentVal === undefined || isNaN(Number(currentVal))) ? 1 : Number(currentVal);
            setValue("value", valToSet, { shouldValidate: true, shouldDirty: true });
            setLastValidInputValue(valToSet);
            setNumberFormat('normal'); 
            setIsNormalFormatDisabled(false);
        }


        Promise.resolve().then(() => {
            const currentVals = getValues();
            const valToConvert = (typeof currentVals.value === 'string' && (isNaN(parseFloat(currentVals.value)) || currentVals.value.trim() === '')) || currentVals.value === undefined ? 1 : Number(currentVals.value);

            const result = convertUnits({ ...currentVals, value: valToConvert, category: categoryToProcess });
            setConversionResult(result);
        });
    }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [rhfCategory, setValue, getValues, convertUnits]);


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

        const initialAvailableUnits = getUnitsForCategoryAndMode(initialCategory);
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

    const valueToKeep = getValues("value");

    setValue("category", presetCategory, { shouldValidate: true, shouldDirty: true });
    
    Promise.resolve().then(() => {
        const availableUnits = getUnitsForCategoryAndMode(presetCategory);
        const fromUnitValid = availableUnits.some(u => u.symbol === preset.fromUnit);
        const toUnitValid = availableUnits.some(u => u.symbol === preset.toUnit);

        const finalFromUnit = fromUnitValid ? preset.fromUnit : availableUnits[0]?.symbol || "";
        let finalToUnit = (toUnitValid && preset.toUnit !== finalFromUnit) ? preset.toUnit : (availableUnits.find(u => u.symbol !== finalFromUnit)?.symbol || finalFromUnit);
        
        if (finalFromUnit === finalToUnit && availableUnits.length > 1) {
          finalToUnit = availableUnits.find(u => u.symbol !== finalFromUnit)?.symbol || availableUnits[0]?.symbol || "";
        }
        
        setValue("fromUnit", finalFromUnit, { shouldValidate: true, shouldDirty: true });
        setValue("toUnit", finalToUnit, { shouldValidate: true, shouldDirty: true });
        
        const numericValueToKeep = Number(valueToKeep);
        if (isFinite(numericValueToKeep) && String(valueToKeep).trim() !== '') {
             // Keep existing valid value
             setValue("value", numericValueToKeep, { shouldValidate: true, shouldDirty: true });
        } else {
            // If current value is invalid or empty, set to 1 or keep last valid
            const newVal = lastValidInputValue !== undefined ? lastValidInputValue : 1;
            setValue("value", newVal, { shouldValidate: true, shouldDirty: true });
            setLastValidInputValue(newVal);
        }
        
        Promise.resolve().then(() => {
            const currentVals = getValues();
            const result = convertUnits({...currentVals, category: presetCategory });
            setConversionResult(result);
        });
    });
  }, [setValue, getValues, convertUnits, lastValidInputValue]);


  const internalApplyHistorySelect = React.useCallback((item: ConversionHistoryItem) => {
    const { category, fromUnit, toUnit, fromValue } = item;

    setValue("category", category, { shouldValidate: true, shouldDirty: true });

    Promise.resolve().then(() => {
        const availableUnits = getUnitsForCategoryAndMode(category);
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
    const currentFrom = getValues("fromUnit");
    const currentTo = getValues("toUnit");
    setValue("fromUnit", currentTo, { shouldValidate: true });
    setValue("toUnit", currentFrom, { shouldValidate: true });
    setIsSwapped((prev) => !prev);
  }, [setValue, getValues]);


  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const showPlaceholder = rhfValue === undefined || rhfFromUnit === '' || !conversionResult || String(rhfValue).trim() === '' || String(rhfValue) === '-';

  const { formattedString: formattedResultString, actualFormatUsed, scientificReason } = React.useMemo(() => {
    return showPlaceholder || !conversionResult ? { formattedString: '-', actualFormatUsed: numberFormat, scientificReason: null } : formatNumber(conversionResult.value, numberFormat);
  }, [showPlaceholder, conversionResult, numberFormat]);

  React.useEffect(() => {
      handleActualFormatChange(actualFormatUsed, scientificReason);
  }, [actualFormatUsed, scientificReason, handleActualFormatChange]);


  const handleCopy = React.useCallback(async () => {
    const currentRawFormValue = getValues("value");
    const numericFromValue = Number(currentRawFormValue);

    const textToCopy = showPlaceholder || !conversionResult ? '' : `${formattedResultString} ${rhfToUnit}`;
    if (!textToCopy || !navigator.clipboard) return;

    try {
        await navigator.clipboard.writeText(textToCopy);
        toast({
            title: "Copied!",
            description: `Result "${textToCopy}" copied to clipboard.`,
            variant: "confirmation",
            duration: 1500,
        });
         if (
            onResultCopied &&
            rhfCategory && rhfCategory !== "" &&
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
    } catch (err) {
        console.error('Failed to copy text: ', err);
        toast({
            title: "Copy Failed",
            description: "Could not copy result to clipboard.",
            variant: "destructive",
        });
    }
  }, [showPlaceholder, conversionResult, formattedResultString, rhfToUnit, toast, onResultCopied, rhfCategory, rhfFromUnit, getValues]);

  const handleSaveToFavoritesInternal = React.useCallback(() => {
    if (!rhfCategory || rhfCategory === "" || !rhfFromUnit || !rhfToUnit) {
      toast({
        title: "Cannot Save Favorite",
        description: "Please select a category and both units before saving.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    if (onSaveFavoriteProp) {
      const currentCategoryUnits = getUnitsForCategoryAndMode(rhfCategory);
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

  const screenReaderText = showPlaceholder
    ? (rhfValue !== undefined && rhfFromUnit ? `Waiting for conversion of ${formatFromValue(Number(rhfValue))} ${rhfFromUnit}` : 'Enter a value and select units to convert')
    : `${formatFromValue(Number(rhfValue))} ${rhfFromUnit} equals ${formattedResultString} ${rhfToUnit}`;
    
  const baseSaveDisabled = !rhfCategory || rhfCategory === "" || !rhfFromUnit || !rhfToUnit;
  const finalSaveDisabled = baseSaveDisabled || disableAddFavoriteButton;


  return (
     <Card className={cn("shadow-lg h-full flex flex-col", className)} aria-labelledby="unit-converter-title">
        <CardHeader className="relative pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle id="unit-converter-title" className="text-2xl font-bold text-primary flex items-center gap-2" as="h2">
              <FlaskConical
                className="h-6 w-6"
                aria-hidden="true"
              />
               Swap Units Converter
            </CardTitle>
          </div>
          <br className={cn(isMobile && "hidden")} />
           <p className={cn("text-sm text-muted-foreground mb-2 space-y-1")}>
             Quickly convert between units.
           </p>
           <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
             <li><span className="font-semibold text-primary">Select Category:</span> Choose the type of measurement (e.g., Length, Mass).</li>
             <li><span className="font-semibold text-primary">Choose Units &amp; Input Value:</span> Pick units, then enter value.</li>
             <li><span className="font-semibold text-primary">View Result:</span> The converted value appears automatically.</li>
           </ol>
        </CardHeader>
        <CardContent className={cn("pt-0 flex-grow flex flex-col")}>
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {screenReaderText}
          </div>
          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="flex-grow flex flex-col space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="category-select">Measurement Category</Label>
                    <Select
                      onValueChange={(value) => field.onChange(value)}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger id="category-select" aria-label="Select measurement category">
                           {field.value && unitData[field.value as UnitCategory] ? (
                             <div className="flex items-center gap-2">
                               <UnitIcon category={field.value as UnitCategory} className="h-4 w-4" aria-hidden="true"/>
                               {unitData[field.value as UnitCategory]?.name ?? 'Select Category'}
                             </div>
                           ) : (
                             <SelectValue placeholder="Select a category" />
                           )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent side="bottom" avoidCollisions={false} className="max-h-60 overflow-y-auto">
                        {categoriesForDropdown.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                             <div className="flex items-center gap-2">
                                <UnitIcon category={cat as UnitCategory} className="h-4 w-4" aria-hidden="true"/>
                                {unitData[cat as UnitCategory].name}
                             </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Select the type of unit you want to convert.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {rhfCategory && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 w-full">
                  {/* From Unit Section */}
                  <div className="flex items-stretch flex-grow-[2] basis-0">
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
                               value={(field.value === '' || field.value === '-') ? field.value : (isNaN(Number(field.value)) ? '' : String(field.value))}
                              disabled={!rhfFromUnit || !rhfToUnit}
                              aria-required="true"
                              className="rounded-r-none border-r-0 focus:z-10 relative h-10 text-left" 
                            />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fromUnit"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value}
                            disabled={!rhfCategory}
                          >
                            <FormControl>
                              <SelectTrigger 
                                className="rounded-l-none w-auto min-w-[80px] md:min-w-[100px] h-10 text-left"
                                
                              >
                                {(() => {
                                  const selectedUnitSymbol = field.value;
                                  const selectedUnit = currentUnitsForCategory.find(u => u.symbol === selectedUnitSymbol);
                                  if (selectedUnit) {
                                    return <span>({selectedUnit.symbol})</span>;
                                  }
                                  return <SelectValue placeholder="Unit" />;
                                })()}
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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

                   <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSwapClick}
                        disabled={!rhfFromUnit || !rhfToUnit}
                        className={cn(
                            "h-10 w-full sm:w-10 p-2 self-center sm:self-end group hover:bg-accent",
                            isMobile ? "mt-2 sm:mt-0" : ""
                        )}
                        aria-label="Swap from and to units"
                        >
                        <ArrowRightLeft className={cn("h-5 w-5 text-primary group-hover:text-accent-foreground", isSwapped && "rotate-180 scale-x-[-1]")} aria-hidden="true" />
                    </Button>

                  {/* To Unit Section with Integrated Copy Button */}
                  <div className="flex items-stretch flex-grow-[2] basis-0">
                    <FormItem className="flex-grow relative">
                      <Input
                        readOnly
                        value={showPlaceholder ? (rhfValue === '' || rhfValue === '-' ? '-' : '...') : formattedResultString}
                        className={cn(
                          "rounded-none border-l-0 border-r-0", 
                          "focus:z-10 relative h-10 text-left",
                          showPlaceholder ? "text-muted-foreground" : "text-purple-600 dark:text-purple-400 font-semibold"
                        )}
                        aria-label="Conversion result"
                      />
                       {onSaveFavoriteProp && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleSaveToFavoritesInternal}
                            disabled={finalSaveDisabled || showPlaceholder}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 h-7 w-7 group hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                            aria-label="Save conversion to favorites"
                        >
                            <Star className={cn("h-4 w-4", (!finalSaveDisabled && !showPlaceholder) ? "text-accent group-hover:fill-accent" : "text-muted-foreground/50")} />
                        </Button>
                        )}
                    </FormItem>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handleCopy} 
                      disabled={showPlaceholder} 
                      className="p-2 h-10 w-10 rounded-none border-l-0 border-r-0 hover:bg-muted/50 focus:z-10 shrink-0"
                      aria-label="Copy result to clipboard"
                    >
                      <Copy className="h-5 w-5" />
                    </Button>
                    <FormField
                      control={form.control}
                      name="toUnit"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value}
                            disabled={!rhfCategory}
                          >
                            <FormControl>
                               <SelectTrigger className={cn(
                                 "rounded-l-none border-l-0",
                                 "w-auto min-w-[70px] md:min-w-[90px] h-10 text-left focus:z-10"
                                )}
                                
                               >
                                {(() => {
                                  const selectedUnitSymbol = field.value;
                                  const selectedUnit = currentUnitsForCategory.find(u => u.symbol === selectedUnitSymbol);
                                  if (selectedUnit) {
                                    return <span>({selectedUnit.symbol})</span>;
                                  }
                                  return <SelectValue placeholder="Unit" />;
                                })()}
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
              
              <fieldset className="mt-auto pt-4">
                 <Label className="mb-2 block font-medium text-sm">Result Formatting</Label>
                 <RadioGroup
                   value={numberFormat}
                   onValueChange={(value: string) => {
                       setNumberFormat(value as NumberFormat);
                       handleActualFormatChange(value as NumberFormat, 'user_choice');
                   }}
                   className="flex flex-col sm:flex-row gap-4"
                   aria-label="Choose number format for the result"
                 >
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem
                       value="normal"
                       id="format-normal"
                       disabled={isNormalFormatDisabled}
                      />
                     <Label
                       htmlFor="format-normal"
                       className={cn(
                         "cursor-pointer text-sm",
                          isNormalFormatDisabled && "text-muted-foreground opacity-70 cursor-not-allowed"
                       )}
                     >
                       Normal (e.g., 1,234.56)
                     </Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <RadioGroupItem value="scientific" id="format-scientific" />
                     <Label htmlFor="format-scientific" className="cursor-pointer text-sm">Scientific (e.g., 1.23E+6)</Label>
                   </div>
                 </RadioGroup>
              </fieldset>
            </form>
          </Form>
        </CardContent>
      </Card>
  );
}));

UnitConverter.displayName = 'UnitConverter';

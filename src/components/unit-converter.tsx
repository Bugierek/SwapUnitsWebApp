

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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { unitData, getUnitsForCategoryAndMode } from '@/lib/unit-data';
import type { UnitCategory, Unit, ConversionResult, Preset, NumberFormat, ConverterMode } from '@/types';
import {
  ArrowRightLeft,
  FlaskConical,
} from 'lucide-react';

import { UnitIcon } from './unit-icon';
import { ConversionDisplay } from './conversion-display';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';


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
  converterMode: ConverterMode;
  setConverterMode: (mode: ConverterMode) => void;
}

export interface UnitConverterHandle {
  handlePresetSelect: (preset: Preset) => void;
}


export const UnitConverter = React.memo(forwardRef<UnitConverterHandle, UnitConverterProps>(function UnitConverterComponent({ className, converterMode, setConverterMode }, ref) {
  const [selectedCategoryLocal, setSelectedCategoryLocal] = React.useState<UnitCategory | "">("");
  const [conversionResult, setConversionResult] = React.useState<ConversionResult | null>(null);
  const [lastValidInputValue, setLastValidInputValue] = React.useState<number | undefined>(1);
  const [numberFormat, setNumberFormat] = React.useState<NumberFormat>('normal');
  const [isNormalFormatDisabled, setIsNormalFormatDisabled] = React.useState<boolean>(false);
  const isMobile = useIsMobile();
  const [prevConverterModeLocal, setPrevConverterModeLocal] = React.useState<ConverterMode>(converterMode);


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

  const { watch, setValue, reset, getValues } = form;
  const rhfCategory = watch("category") as UnitCategory;
  const rhfFromUnit = watch("fromUnit");
  const rhfToUnit = watch("toUnit");
  const rhfValue = watch("value");

  const categoriesForDropdown = React.useMemo(() => {
    return (Object.keys(unitData) as UnitCategory[]).filter(category => {
        const units = getUnitsForCategoryAndMode(category, converterMode);
        return units.length > 0;
    });
  }, [converterMode]);

  const handleActualFormatChange = React.useCallback((
    actualFormat: NumberFormat,
    reason: 'magnitude' | 'user_choice' | null
  ) => {
    const magnitudeForcedScientific = actualFormat === 'scientific' && reason === 'magnitude';
    setIsNormalFormatDisabled(magnitudeForcedScientific);

    if (magnitudeForcedScientific && numberFormat === 'normal') {
        setNumberFormat('scientific');
    } else if (!magnitudeForcedScientific && numberFormat === 'scientific' && reason !== 'user_choice') {
        // This callback primarily handles disabling the 'Normal' radio.
    }
  }, [numberFormat]);

  const convertUnits = React.useCallback((data: Partial<FormData>): ConversionResult | null => {
    const { category, fromUnit, toUnit, value } = data;
    const numericValue = Number(value);

    if (!category || !fromUnit || !toUnit || value === undefined || value === null || !isFinite(numericValue) || value === '') {
        return null;
    }

    const currentCategory = category as UnitCategory;
    const currentUnits = getUnitsForCategoryAndMode(currentCategory, converterMode);
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
        let valueInKmPerL: number;
        if (fromUnitData.symbol === 'L/100km') {
            if (numericValue === 0) return null; 
            valueInKmPerL = fromUnitData.factor / numericValue; 
        } else {
            valueInKmPerL = numericValue * fromUnitData.factor;
        }

        if (toUnitData.symbol === 'L/100km') {
            if (valueInKmPerL === 0) return null; 
            resultValue = toUnitData.factor / valueInKmPerL;
        } else {
            resultValue = valueInKmPerL / toUnitData.factor;
        }
    } else if (currentCategory === "EM Frequency" || currentCategory === "Sound Frequency") {
        const speed = currentCategory === "EM Frequency" ? 299792458 : 343; 
        const fromType = fromUnitData.unitType;
        const toType = toUnitData.unitType;

        if (fromType === 'frequency' && toType === 'frequency') {
            const valueInBaseUnit = numericValue * fromUnitData.factor; 
            resultValue = valueInBaseUnit / toUnitData.factor; 
        } else if (fromType === 'wavelength' && toType === 'wavelength') {
            const valueInBaseUnit = numericValue * fromUnitData.factor; 
            resultValue = valueInBaseUnit / toUnitData.factor; 
        } else if (fromType === 'frequency' && toType === 'wavelength') {
            if (numericValue === 0) return null;
            const freqInHz = numericValue * fromUnitData.factor;
            const wavelengthInMeters = speed / freqInHz;
            resultValue = wavelengthInMeters / toUnitData.factor;
        } else if (fromType === 'wavelength' && toType === 'frequency') {
            if (numericValue === 0) return null;
            const wavelengthInMeters = numericValue * fromUnitData.factor;
            if (wavelengthInMeters === 0) return null;
            const freqInHz = speed / wavelengthInMeters;
            resultValue = freqInHz / toUnitData.factor;
        } else {
             return null; 
        }
    } else {
      const valueInBaseUnit = numericValue * fromUnitData.factor;
      resultValue = valueInBaseUnit / toUnitData.factor;
    }
    return isFinite(resultValue) ? { value: resultValue, unit: toUnitData.symbol } : null;
  }, [converterMode]);


 React.useEffect(() => {
    const modeChanged = prevConverterModeLocal !== converterMode;
    let categoryToProcess = rhfCategory;

    if (modeChanged) {
        const isRhfCategoryValidInNewMode = getUnitsForCategoryAndMode(rhfCategory, converterMode).length > 0;
        if (!isRhfCategoryValidInNewMode) {
            categoryToProcess = categoriesForDropdown[0] || 'Mass'; 
            setValue("category", categoryToProcess, { shouldValidate: true, shouldDirty: true });
            // setSelectedCategoryLocal(categoryToProcess); // This will be handled by the main logic
        }
        // Ensure units are updated based on the new mode, even if category doesn't change
        // This will trigger the categoryChangedSystemOrUser logic below
    }

    // This condition now checks if category changed OR if mode changed (which might require unit updates)
    const categoryChangedSystemOrUser = categoryToProcess !== selectedCategoryLocal || modeChanged;

    if (categoryChangedSystemOrUser && categoryToProcess) {
        setSelectedCategoryLocal(categoryToProcess); // Update local selected category *before* processing units
        setPrevConverterModeLocal(converterMode); // Update local previous mode

        const availableUnits = getUnitsForCategoryAndMode(categoryToProcess, converterMode);
        if (availableUnits.length === 0) { 
            // This case should ideally not happen if categoryToProcess is derived from categoriesForDropdown
            // or if mode change logic correctly defaults to a valid category.
            // If it does, it means the category isn't valid for the current mode.
            // Consider if further action is needed, e.g., switching mode if possible or error handling.
            return; 
        }

        let newFromUnitSymbol = rhfFromUnit;
        let newToUnitSymbol = rhfToUnit;
        let resetValueToDefault = false;

        const fromUnitStillValidInNewContext = availableUnits.some(u => u.symbol === newFromUnitSymbol);
        const toUnitStillValidInNewContext = availableUnits.some(u => u.symbol === newToUnitSymbol);

        // Determine if units need to be reset to defaults
        // This happens if:
        // 1. Category actually changed
        // 2. Mode changed (even if category name is the same, its available units might differ)
        // 3. Current fromUnit is no longer valid in the new context
        // 4. Current toUnit is no longer valid in the new context
        if (categoryToProcess !== selectedCategoryLocal || modeChanged || !fromUnitStillValidInNewContext || !toUnitStillValidInNewContext) {
            resetValueToDefault = true; 
            switch (categoryToProcess) {
                case 'Length': newFromUnitSymbol = 'm'; newToUnitSymbol = 'ft'; break;
                case 'Mass': newFromUnitSymbol = 'kg'; newToUnitSymbol = 'g'; break;
                case 'Temperature': newFromUnitSymbol = '°C'; newToUnitSymbol = '°F'; break;
                case 'Time':
                    newFromUnitSymbol = 's';
                    newToUnitSymbol = converterMode === 'advanced' && availableUnits.some(u => u.symbol === 'fs') ? 'fs' : 'ms';
                    break;
                case 'Pressure': newFromUnitSymbol = 'Pa'; newToUnitSymbol = 'kPa'; break;
                case 'Area': newFromUnitSymbol = 'm²'; newToUnitSymbol = 'ft²'; break;
                case 'Volume': newFromUnitSymbol = 'L'; newToUnitSymbol = 'mL'; break;
                case 'Energy': newFromUnitSymbol = 'J'; newToUnitSymbol = 'kJ'; break;
                case 'Speed': newFromUnitSymbol = 'm/s'; newToUnitSymbol = 'km/h'; break;
                case 'Fuel Economy': newFromUnitSymbol = 'km/L'; newToUnitSymbol = 'MPG (US)'; break;
                case 'Data Storage': newFromUnitSymbol = 'GB'; newToUnitSymbol = 'MB'; break;
                case 'Data Transfer Rate': newFromUnitSymbol = 'Mbps'; newToUnitSymbol = 'MB/s'; break;
                case 'Bitcoin': newFromUnitSymbol = 'BTC'; newToUnitSymbol = 'sat'; break;
                case 'Ethereum': newFromUnitSymbol = 'ETH'; newToUnitSymbol = 'gwei'; break;
                case 'EM Frequency': newFromUnitSymbol = 'GHz'; newToUnitSymbol = 'nm (λ)'; break;
                case 'Sound Frequency': 
                    newFromUnitSymbol = 'Hz'; 
                    newToUnitSymbol = 'cm (λ)'; 
                    break;
                default: 
                    newFromUnitSymbol = availableUnits[0]?.symbol || "";
                    newToUnitSymbol = availableUnits.find(u => u.symbol !== newFromUnitSymbol)?.symbol || newFromUnitSymbol;
            }

            // Ensure the default units are actually available in the current mode for the category
            if (!availableUnits.some(u => u.symbol === newFromUnitSymbol)) {
                newFromUnitSymbol = availableUnits[0]?.symbol || "";
            }
            if (!availableUnits.some(u => u.symbol === newToUnitSymbol) || newFromUnitSymbol === newToUnitSymbol) {
                newToUnitSymbol = availableUnits.find(u => u.symbol !== newFromUnitSymbol)?.symbol || (availableUnits[0]?.symbol || "");
                 if (newFromUnitSymbol === newToUnitSymbol && availableUnits.length > 1) { 
                    newToUnitSymbol = availableUnits[1]?.symbol || "";
                } else if (newFromUnitSymbol === newToUnitSymbol && availableUnits.length === 1) { 
                    // If only one unit available (e.g. after filtering by mode), from and to might be same
                    newToUnitSymbol = newFromUnitSymbol; 
                }
            }
            setValue("fromUnit", newFromUnitSymbol, { shouldValidate: true, shouldDirty: true });
            setValue("toUnit", newToUnitSymbol, { shouldValidate: true, shouldDirty: true });
        }


        if (resetValueToDefault) {
            setValue("value", 1, { shouldValidate: true, shouldDirty: true });
            setLastValidInputValue(1);
            setNumberFormat('normal'); 
            setIsNormalFormatDisabled(false); 
        }
        
        // Trigger conversion with current/new values
        // Use a Promise.resolve().then() to ensure state updates from setValue are processed
        Promise.resolve().then(() => {
            const currentVals = getValues();
            // Ensure value to convert is a number, defaulting to 1 if input is invalid/empty
            const valToConvert = (typeof currentVals.value === 'string' && (isNaN(parseFloat(currentVals.value)) || currentVals.value.trim() === '')) || currentVals.value === undefined ? 1 : Number(currentVals.value);

            const result = convertUnits({ ...currentVals, value: valToConvert });
            setConversionResult(result);
        });
    }
 }, [rhfCategory, converterMode, setValue, getValues, convertUnits, selectedCategoryLocal, rhfFromUnit, rhfToUnit, prevConverterModeLocal, categoriesForDropdown, setConverterMode]);


  React.useEffect(() => {
    // This effect handles dynamic updates when input value, fromUnit, or toUnit change,
    // *without* a category or mode change (which is handled by the effect above).
    if (rhfCategory === selectedCategoryLocal && converterMode === prevConverterModeLocal) {
        const formData = getValues();
        const { category, fromUnit, toUnit, value } = formData;
        const numericValue = Number(value);

        if (category && fromUnit && toUnit && value !== '' && !isNaN(numericValue) && isFinite(numericValue)) {
           setLastValidInputValue(numericValue); 
           const result = convertUnits(formData);
           setConversionResult(result);
        } else if (category && fromUnit && toUnit && (value === '' || value === '-')) { 
            // If input is empty or just a minus sign, treat as placeholder state
            setConversionResult(null); 
        } else {
            // For any other invalid input that's not empty/minus
           setConversionResult(null);
        }
    }
  }, [rhfValue, rhfFromUnit, rhfToUnit, rhfCategory, converterMode, selectedCategoryLocal, prevConverterModeLocal, getValues, convertUnits]);


   React.useEffect(() => {
     // Initial setup effect (runs once on mount)
     if (selectedCategoryLocal === "") { // Ensures it only runs if not already set up
        const initialFormData = getValues();
        const initialCategory = initialFormData.category as UnitCategory;

        setSelectedCategoryLocal(initialCategory); // Set local state for category
        setPrevConverterModeLocal(converterMode); // Set local state for mode

        const initialAvailableUnits = getUnitsForCategoryAndMode(initialCategory, converterMode);
        let initialFrom = initialFormData.fromUnit;
        let initialTo = initialFormData.toUnit;

        // Specific default for Mass: kg to g
        if (initialCategory === 'Mass' && initialFormData.fromUnit === 'kg' && initialFormData.toUnit !== 'g') {
           initialTo = 'g';
           setValue("toUnit", initialTo, { shouldValidate: false }); // Silently update form value
        } else {
            // General default logic if units are not valid for the category/mode
            if (!initialAvailableUnits.some(u => u.symbol === initialFrom)) {
                initialFrom = initialAvailableUnits[0]?.symbol || "";
                setValue("fromUnit", initialFrom, { shouldValidate: false });
            }
            if (!initialAvailableUnits.some(u => u.symbol === initialTo) || initialFrom === initialTo) {
                initialTo = initialAvailableUnits.find(u => u.symbol !== initialFrom)?.symbol || initialFrom;
                // If still same and more units available, pick next
                if (initialFrom === initialTo && initialAvailableUnits.length > 1) { 
                     initialTo = initialAvailableUnits[1]?.symbol || initialFrom; 
                }
                setValue("toUnit", initialTo, { shouldValidate: false });
            }
        }

        // Ensure initial value is valid
        const initialValue = (initialFormData.value === undefined || isNaN(Number(initialFormData.value))) ? 1 : Number(initialFormData.value);
        if (String(initialFormData.value) !== String(initialValue)) { // Avoid unnecessary update if already correct
             setValue("value", initialValue, { shouldValidate: false });
        }
        setLastValidInputValue(initialValue); // Store the (potentially corrected) initial value

        // Perform initial conversion
        const initialResult = convertUnits({...initialFormData, category: initialCategory, fromUnit: initialFrom, toUnit: initialTo, value: initialValue });
        setConversionResult(initialResult);
        setNumberFormat('normal'); // Default number format
        setIsNormalFormatDisabled(false); // Ensure 'normal' format is initially enabled
     }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []); // Dependencies: empty array means it runs once after initial render


  const internalHandlePresetSelect = React.useCallback((preset: Preset) => {
    const presetCategory = Object.keys(unitData).find(catKey => catKey === preset.category) as UnitCategory | undefined;
    if (!presetCategory) return;

    const fromUnitInPreset = unitData[presetCategory]?.units.find(u => u.symbol === preset.fromUnit);
    const toUnitInPreset = unitData[presetCategory]?.units.find(u => u.symbol === preset.toUnit);

    let newMode = converterMode;
    // If any unit in the preset requires 'advanced' mode and current mode is 'basic', switch to 'advanced'
    if ((fromUnitInPreset?.mode === 'advanced' || toUnitInPreset?.mode === 'advanced') && converterMode === 'basic') {
        newMode = 'advanced';
        setConverterMode('advanced'); // This will trigger the useEffect for mode change
    }

    // Set category first. The useEffect for category/mode change will handle unit updates.
    setValue("category", presetCategory, { shouldValidate: true, shouldDirty: true });

    // Use a Promise to allow state updates (like mode change) to process before setting units
    Promise.resolve().then(() => {
        // Determine the mode that should be active *after* potential switch from setConverterMode
        const currentModeForPreset = newMode; 
        const availableUnits = getUnitsForCategoryAndMode(presetCategory, currentModeForPreset);

        const fromUnitValid = availableUnits.some(u => u.symbol === preset.fromUnit);
        const toUnitValid = availableUnits.some(u => u.symbol === preset.toUnit);

        const finalFromUnit = fromUnitValid ? preset.fromUnit : availableUnits[0]?.symbol || "";
        let finalToUnit = (toUnitValid && preset.toUnit !== finalFromUnit) ? preset.toUnit : (availableUnits.find(u => u.symbol !== finalFromUnit)?.symbol || finalFromUnit);
         // Ensure 'toUnit' is different from 'fromUnit' if possible
         if (finalFromUnit === finalToUnit && availableUnits.length > 1) {
             finalToUnit = availableUnits.find(u=> u.symbol !== finalFromUnit)?.symbol || availableUnits[0]?.symbol || ""; // Fallback to first if only one other option
         }

        // Reset form with preset values, including default value and number format
        reset({ 
            category: presetCategory,
            fromUnit: finalFromUnit,
            toUnit: finalToUnit,
            value: 1, // Default value for presets
        });
        setLastValidInputValue(1);
        setNumberFormat('normal'); // Reset number format to normal
        setIsNormalFormatDisabled(false); // Ensure normal format is enabled

        // Recalculate conversion result after form reset
        // Use another Promise.resolve().then() to ensure form reset is processed
        Promise.resolve().then(() => {
           const result = convertUnits(getValues());
           setConversionResult(result);
        });
    });

  }, [setValue, reset, getValues, convertUnits, converterMode, setConverterMode]);


  useImperativeHandle(ref, () => ({
    handlePresetSelect: internalHandlePresetSelect,
  }));


  const swapUnits = React.useCallback(() => {
    setValue("fromUnit", rhfToUnit, { shouldValidate: true });
    setValue("toUnit", rhfFromUnit, { shouldValidate: true });
  }, [rhfFromUnit, rhfToUnit, setValue]);


  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); 
  };


  return (
     <Card className={cn("shadow-lg flex flex-col", className)} aria-labelledby="unit-converter-title">
        <CardHeader className="relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle id="unit-converter-title" className="text-2xl font-bold text-primary flex items-center gap-2" as="h2">
              <FlaskConical
                className="h-6 w-6"
                aria-hidden="true"
              />
               Swap Units Converter
            </CardTitle>
          </div>
          
          <div className="flex justify-center items-center gap-2 py-3">
            <Button
              variant={converterMode === 'basic' ? 'default' : 'outline'}
              onClick={() => {
                if (converterMode !== 'basic') {
                  setConverterMode('basic');
                }
              }}
              aria-pressed={converterMode === 'basic'}
              className="px-5 text-sm"
            >
              Basic
            </Button>
            <Button
              variant={converterMode === 'advanced' ? 'default' : 'outline'}
              onClick={() => {
                if (converterMode !== 'advanced') {
                  setConverterMode('advanced');
                }
              }}
              aria-pressed={converterMode === 'advanced'}
              className="px-5 text-sm"
            >
              Advanced
            </Button>
          </div>

           <p className={cn("text-sm text-muted-foreground mb-2 space-y-1", isMobile && "hidden")}>
             Quickly convert between units.
           </p>
           <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
             <li><span className="font-semibold text-primary">Select Category:</span> Choose the type of measurement (e.g., Length, Mass).</li>
             <li><span className="font-semibold text-primary">Choose Units & Input Value:</span> Pick the 'From' and 'To' units, then enter the value you want to convert.</li>
             <li><span className="font-semibold text-primary">View Result:</span> The converted value appears automatically below.</li>
           </ol>
        </CardHeader>
        <CardContent className={cn("pt-0 flex-grow flex flex-col")}>
          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="flex-grow flex flex-col"> {/* Ensure form itself can grow */}
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="category-select">Measurement Category</FormLabel>
                      <Select
                        onValueChange={(value) => {
                            field.onChange(value);
                        }}
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
                        <SelectContent 
                          side="bottom" 
                          avoidCollisions={false}
                          className={cn(
                            converterMode === 'basic' ? 'max-h-[calc(100vh-200px)] sm:max-h-none' : 'max-h-[calc(100vh-200px)] overflow-y-auto' 
                          )}
                        >
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
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                    <FormField
                      control={form.control}
                      name="fromUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="from-unit-select">From Unit</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value}
                            disabled={!rhfCategory}
                          >
                            <FormControl>
                              <SelectTrigger id="from-unit-select" aria-label="Select the unit to convert from">
                                <SelectValue placeholder="Select input unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getUnitsForCategoryAndMode(rhfCategory, converterMode).map((unit) => (
                                <SelectItem key={unit.symbol} value={unit.symbol}>
                                  {unit.name} ({unit.symbol})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={swapUnits}
                      disabled={!rhfFromUnit || !rhfToUnit}
                      className="h-10 w-full sm:w-10 justify-self-center sm:justify-self-auto"
                      aria-label="Swap from and to units"
                    >
                      <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                    </Button>

                    <FormField
                      control={form.control}
                      name="toUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor="to-unit-select">To Unit</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value}
                            disabled={!rhfCategory}
                          >
                            <FormControl>
                              <SelectTrigger id="to-unit-select" aria-label="Select the unit to convert to">
                                <SelectValue placeholder="Select output unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getUnitsForCategoryAndMode(rhfCategory, converterMode).map((unit) => (
                                <SelectItem key={unit.symbol} value={unit.symbol}>
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
                )}

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="value-input">Value to Convert</FormLabel>
                      <FormControl>
                        <Input
                          id="value-input"
                          type="text" 
                          inputMode="decimal" 
                          placeholder="Enter value"
                          {...field}
                          onChange={(e) => {
                              const rawValue = e.target.value;
                               if (rawValue === '' || rawValue === '-' || /^-?\d*\.?\d*([eE][-+]?\d*)?$/.test(rawValue)) {
                                  field.onChange(rawValue);
                              }
                          }}
                           value={(field.value === '' || field.value === '-') ? field.value : (isNaN(Number(field.value)) ? '' : String(field.value))}
                          disabled={!rhfFromUnit || !rhfToUnit}
                          aria-required="true"
                          className="border-primary"
                        />
                      </FormControl>
                      <FormDescription>Enter the numerical value you wish to convert.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <ConversionDisplay
                  fromValue={lastValidInputValue} 
                  fromUnit={rhfFromUnit ?? ''} 
                  result={conversionResult} 
                  format={numberFormat} 
                  onActualFormatChange={handleActualFormatChange} 
                 />

                  <fieldset className="pt-4">
                    <legend className="mb-2 block font-medium text-sm">Result Formatting Options</legend>
                     <RadioGroup
                       value={numberFormat}
                       onValueChange={(value: string) => {
                           setNumberFormat(value as NumberFormat);
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
                </div>
                <div className="flex-grow"></div> {/* This div helps push content up if card height is fixed */}
            </form>
          </Form>
        </CardContent>
      </Card>
  );
}));

UnitConverter.displayName = 'UnitConverter';

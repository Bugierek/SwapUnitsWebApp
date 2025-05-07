
"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { unitData } from "@/lib/unit-data";
import type { UnitCategory, Unit, ConversionResult, Preset, NumberFormat } from "@/types";
import {
  ArrowRightLeft,
  FlaskConical,
} from "lucide-react";

import { UnitIcon } from "./unit-icon";
import { ConversionDisplay } from "./conversion-display";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useImperativeHandle, forwardRef } from 'react';


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
  className?: string; // Allow className to be passed for height matching
}

export interface UnitConverterHandle {
  handlePresetSelect: (preset: Preset) => void;
}


export const UnitConverter = React.memo(forwardRef<UnitConverterHandle, UnitConverterProps>(function UnitConverterComponent({ className, ...props }, ref) {
  const [selectedCategory, setSelectedCategory] = React.useState<UnitCategory | "">("");
  const [conversionResult, setConversionResult] = React.useState<ConversionResult | null>(null);
  const [lastValidInputValue, setLastValidInputValue] = React.useState<number | undefined>(1);
  const [numberFormat, setNumberFormat] = React.useState<NumberFormat>('normal');
  const [isNormalFormatDisabled, setIsNormalFormatDisabled] = React.useState<boolean>(false);
  const isMobile = useIsMobile();


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
  const currentCategory = watch("category");
  const fromUnitValue = watch("fromUnit");
  const toUnitValue = watch("toUnit");
  const inputValue = watch("value");

  const getUnitsForCategory = React.useCallback((category: UnitCategory | ""): Unit[] => {
    return category ? unitData[category as UnitCategory]?.units ?? [] : [];
  }, []);

  const convertUnits = React.useCallback((data: Partial<FormData>): ConversionResult | null => {
    const { category, fromUnit, toUnit, value } = data;
    const numericValue = Number(value);
    const refPressure = 20e-6; // 20 micropascals

    if (!category || !fromUnit || !toUnit || value === undefined || value === null || !isFinite(numericValue) || value === '') {
        return null;
    }

    const currentUnits = getUnitsForCategory(category as UnitCategory);
    const fromUnitData = currentUnits.find((u) => u.symbol === fromUnit);
    const toUnitData = currentUnits.find((u) => u.symbol === toUnit);

    if (!fromUnitData || !toUnitData) {
      return null;
    }

    if (category === "Temperature") {
      let tempInCelsius: number;
      if (fromUnitData.symbol === "°C") {
        tempInCelsius = numericValue;
      } else if (fromUnitData.symbol === "°F") {
        tempInCelsius = (numericValue - 32) * (5 / 9);
      } else { // Kelvin
        tempInCelsius = numericValue - 273.15;
      }

      let resultValue: number;
      if (toUnitData.symbol === "°C") {
        resultValue = tempInCelsius;
      } else if (toUnitData.symbol === "°F") {
        resultValue = tempInCelsius * (9 / 5) + 32;
      } else { // Kelvin
        resultValue = tempInCelsius + 273.15;
      }
      return isFinite(resultValue) ? { value: resultValue, unit: toUnitData.symbol } : null;
    }

    if (category === "Fuel Economy") {
        let valueInKmPerL: number;
        // If converting *from* L/100km, it's an inverse relationship to the base km/L
        if (fromUnitData.symbol === 'L/100km') {
            if (numericValue === 0) return null; // Avoid division by zero
            valueInKmPerL = fromUnitData.factor / numericValue; // factor is 100 for L/100km
        } else {
            valueInKmPerL = numericValue * fromUnitData.factor;
        }

        let resultValue: number;
        // If converting *to* L/100km
        if (toUnitData.symbol === 'L/100km') {
            if (valueInKmPerL === 0) return null; // Avoid division by zero
            resultValue = toUnitData.factor / valueInKmPerL; // factor is 100 for L/100km
        } else {
            resultValue = valueInKmPerL / toUnitData.factor;
        }
        return isFinite(resultValue) ? { value: resultValue, unit: toUnitData.symbol } : null;
    }
    
    if (category === "Pressure") {
        // Pa to dB SPL: L_p = 20 * log10(p / p_ref)
        if (toUnitData.symbol === 'dB SPL' && fromUnitData.symbol !== 'dB SPL') {
            const pressureInPascals = numericValue * fromUnitData.factor;
            if (pressureInPascals <= 0) return null; // log10 is undefined for non-positive values
            const resultValue = 20 * Math.log10(pressureInPascals / refPressure);
            return isFinite(resultValue) ? { value: resultValue, unit: toUnitData.symbol } : null;
        }
        // dB SPL to Pa: p = p_ref * 10^(L_p / 20)
        if (fromUnitData.symbol === 'dB SPL' && toUnitData.symbol !== 'dB SPL') {
            const pressureInPascals = refPressure * (10 ** (numericValue / 20));
            const resultValue = pressureInPascals / toUnitData.factor; // Convert from Pa to the target unit
            return isFinite(resultValue) ? { value: resultValue, unit: toUnitData.symbol } : null;
        }
        // dB SPL to dB SPL (no change)
        if (fromUnitData.symbol === 'dB SPL' && toUnitData.symbol === 'dB SPL') {
            return { value: numericValue, unit: 'dB SPL' };
        }
        // Standard pressure conversion (neither from nor to is dB SPL)
        // Fall through to general conversion logic
    }


    const valueInBaseUnit = numericValue * fromUnitData.factor;
    const resultValue = valueInBaseUnit / toUnitData.factor;
    return isFinite(resultValue) ? { value: resultValue, unit: toUnitData.symbol } : null;
  }, [getUnitsForCategory]);


 React.useEffect(() => {
    const isValidCategory = currentCategory && Object.keys(unitData).includes(currentCategory);
    const categoryChanged = currentCategory !== selectedCategory;

    if (isValidCategory && categoryChanged) {
        const newCategory = currentCategory as UnitCategory;
        setSelectedCategory(newCategory);

        const units = getUnitsForCategory(newCategory);
        let defaultFromUnit = units[0]?.symbol ?? "";
        let defaultToUnit = units.length > 1 ? (units[1]?.symbol ?? defaultFromUnit) : defaultFromUnit;

        // Set default units based on category
        switch (newCategory) {
            case 'Length': defaultFromUnit = 'm'; defaultToUnit = 'ft'; break;
            case 'Mass': defaultFromUnit = 'kg'; defaultToUnit = 'g'; break;
            case 'Temperature': defaultFromUnit = '°C'; defaultToUnit = '°F'; break;
            case 'Time': defaultFromUnit = 's'; defaultToUnit = 'ms'; break;
            case 'Pressure': defaultFromUnit = 'Pa'; defaultToUnit = 'kPa'; break;
            case 'Area': defaultFromUnit = 'm²'; defaultToUnit = 'ft²'; break;
            case 'Volume': defaultFromUnit = 'L'; defaultToUnit = 'mL'; break;
            case 'Energy': defaultFromUnit = 'J'; defaultToUnit = 'kJ'; break;
            case 'Speed': defaultFromUnit = 'm/s'; defaultToUnit = 'km/h'; break;
            case 'Fuel Economy': defaultFromUnit = 'km/L'; defaultToUnit = 'MPG (US)'; break;
            case 'Data Storage': defaultFromUnit = 'GB'; defaultToUnit = 'MB'; break;
            case 'Data Transfer Rate': defaultFromUnit = 'Mbps'; defaultToUnit = 'MB/s'; break;
            case 'Bitcoin': defaultFromUnit = 'BTC'; defaultToUnit = 'sat'; break;
        }

        setValue("fromUnit", defaultFromUnit, { shouldValidate: true, shouldDirty: true });
        setValue("toUnit", defaultToUnit, { shouldValidate: true, shouldDirty: true });
        setValue("value", 1, { shouldValidate: true, shouldDirty: true }); // Reset value to 1 on category change
        setLastValidInputValue(1); // Update last valid input value
        setNumberFormat('normal'); // Reset number format
        setIsNormalFormatDisabled(false); // Reset disabled state for normal format

        // Trigger conversion immediately after setting new defaults
        setTimeout(() => {
            const result = convertUnits(getValues());
            setConversionResult(result);
        }, 0);
    }
 }, [currentCategory, selectedCategory, setValue, getUnitsForCategory, getValues, convertUnits]);


  // Effect for handling input changes and triggering conversion
  React.useEffect(() => {
    const formData = getValues();
    const { category, fromUnit, toUnit, value } = formData;
    const numericValue = Number(value);

    if (category && fromUnit && toUnit && value !== '' && !isNaN(numericValue) && isFinite(numericValue)) {
       setLastValidInputValue(numericValue);
       const result = convertUnits(formData);
       setConversionResult(result);
    } else if (category && fromUnit && toUnit && value === '') {
        // If input is cleared, clear result and reset related states
        setConversionResult(null);
        setLastValidInputValue(undefined); // Or some other indicator of no input
        // Potentially re-enable normal format if it was disabled by a large number
        // The onActualFormatChange callback will handle this if a result comes back
        // but for an empty input, we can assume normal should be selectable if not inherently impossible.
        setIsNormalFormatDisabled(false);
    } else {
       // Handle invalid input (e.g., non-numeric text if not caught by schema)
       setConversionResult(null);
       // Same logic as empty input for format disabling
       setIsNormalFormatDisabled(false);
    }
  }, [inputValue, fromUnitValue, toUnitValue, currentCategory, convertUnits, getValues, lastValidInputValue]); // lastValidInputValue was missing, important for re-triggering


   // Initial load effect
   React.useEffect(() => {
     if (selectedCategory === "") { // Only run on initial load
        const initialFormData = getValues();
        if(initialFormData.category && initialFormData.fromUnit && initialFormData.toUnit && initialFormData.value !== undefined ) {
            const initialValue = (!isNaN(Number(initialFormData.value)) && isFinite(Number(initialFormData.value))) ? Number(initialFormData.value) : 1;
            // Ensure the form field is updated if initial value was not valid number
            if (initialValue !== initialFormData.value) {
                setValue("value", initialValue, { shouldValidate: false }); // No immediate validation needed
            }
            setLastValidInputValue(initialValue);
            setSelectedCategory(initialFormData.category as UnitCategory);

            // Ensure 'toUnit' is set to 'g' for 'Mass' category as per new requirement
            const initialToUnit = initialFormData.category === 'Mass' ? 'g' : initialFormData.toUnit;
            if(initialToUnit !== initialFormData.toUnit) {
                setValue("toUnit", initialToUnit, { shouldValidate: false });
            } else {
                 // If it's already correct, still good to ensure the state is aligned.
                 // This else might not be strictly necessary if getValues() is always accurate,
                 // but ensures consistency.
                 setValue("toUnit", initialToUnit, { shouldValidate: false });
            }


            // Trigger conversion with potentially updated 'toUnit'
            const initialResult = convertUnits({...initialFormData, value: initialValue, toUnit: initialToUnit });
            setConversionResult(initialResult);
            setNumberFormat('normal'); // Default format
            setIsNormalFormatDisabled(false); // Initially normal format is not disabled
        }
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []); // Empty dependency array: runs only once on mount


  // Function to handle preset selection (passed via ref)
  const internalHandlePresetSelect = React.useCallback((preset: Preset) => {
    const presetCategory = Object.keys(unitData).find(catKey => catKey === preset.category) as UnitCategory | undefined;

    if (!presetCategory) return; // Should not happen if presets are well-defined

    // First, set the category. This will trigger the category change effect.
    setValue("category", presetCategory, { shouldValidate: true, shouldDirty: true });

    // Use a timeout to allow the category change effect to update units before setting from/to units
    setTimeout(() => {
        reset({ // Reset form with preset values
            category: presetCategory, // Ensure category is part of reset
            fromUnit: preset.fromUnit,
            toUnit: preset.toUnit,
            value: 1, // Default value for presets
        });
        setLastValidInputValue(1);
        setNumberFormat('normal'); // Reset format
        setIsNormalFormatDisabled(false); // Reset format disable state

        // Trigger conversion after form reset
        setTimeout(() => {
           const result = convertUnits(getValues());
           setConversionResult(result);
        }, 0)
    }, 0);
  }, [setValue, reset, getValues, convertUnits]);

  // Expose handlePresetSelect via ref
  useImperativeHandle(ref, () => ({
    handlePresetSelect: internalHandlePresetSelect,
  }));


  // Function to swap From and To units
  const swapUnits = React.useCallback(() => {
    const currentFrom = fromUnitValue;
    const currentTo = toUnitValue;
    setValue("fromUnit", currentTo, { shouldValidate: true });
    setValue("toUnit", currentFrom, { shouldValidate: true });
    // Conversion will be re-triggered by the useEffect watching these values
  }, [fromUnitValue, toUnitValue, setValue]);

    // Callback for ConversionDisplay to inform about actual format used
    const handleActualFormatChange = React.useCallback((
        actualFormat: NumberFormat,
        reason: 'magnitude' | 'user_choice' | null
    ) => {
        // If magnitude forces scientific, disable 'normal' and switch to 'scientific' if 'normal' was selected
        const magnitudeForcedScientific = actualFormat === 'scientific' && reason === 'magnitude';
        setIsNormalFormatDisabled(magnitudeForcedScientific);

        if (magnitudeForcedScientific && numberFormat === 'normal') {
            setNumberFormat('scientific'); // Update radio button state
        }
    }, [numberFormat]); // Depend on numberFormat to correctly decide if a switch is needed

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission
  };


  return (
     <Card className={cn("shadow-lg h-full flex flex-col", className)} aria-labelledby="unit-converter-title">
        <CardHeader>
          <CardTitle id="unit-converter-title" className="text-2xl font-bold text-primary flex items-center gap-2" as="h2">
            <FlaskConical
              className="h-6 w-6"
              aria-hidden="true"
            />
             Swap Units Converter
          </CardTitle>
          <br />
           <p className="text-sm text-muted-foreground mt-1 mb-2 space-y-1">
             Quickly convert between common and specialized units.
           </p>
           <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
             <li><span className="font-semibold text-primary">Select Category:</span> Choose the type of measurement (e.g., Length, Mass).</li>
             <li><span className="font-semibold text-primary">Choose Units & Input Value:</span> Pick the 'From' and 'To' units, then enter the value you want to convert.</li>
             <li><span className="font-semibold text-primary">View Result:</span> The converted value appears automatically below.</li>
           </ol>
        </CardHeader>
        <CardContent className="pt-0 flex-grow">
          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="space-y-6" aria-live="polite">
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
                           {field.value ? (
                             <div className="flex items-center gap-2">
                               <UnitIcon category={field.value as UnitCategory} className="h-4 w-4" aria-hidden="true"/>
                               {unitData[field.value as UnitCategory]?.name ?? 'Select Category'}
                             </div>
                           ) : (
                             <SelectValue placeholder="Select a category" />
                           )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent side="bottom" avoidCollisions={false}>
                        {Object.keys(unitData).map((cat) => (
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

              {currentCategory && ( 
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
                          disabled={!currentCategory}
                        >
                          <FormControl>
                            <SelectTrigger id="from-unit-select" aria-label="Select the unit to convert from">
                              <SelectValue placeholder="Select input unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getUnitsForCategory(currentCategory as UnitCategory).map((unit) => (
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
                    disabled={!fromUnitValue || !toUnitValue}
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
                          disabled={!currentCategory}
                        >
                          <FormControl>
                            <SelectTrigger id="to-unit-select" aria-label="Select the unit to convert to">
                              <SelectValue placeholder="Select output unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getUnitsForCategory(currentCategory as UnitCategory).map((unit) => (
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
                        disabled={!fromUnitValue || !toUnitValue} 
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
                fromUnit={fromUnitValue ?? ''} 
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

            </form>
          </Form>
        </CardContent>
      </Card>
  );
}));

UnitConverter.displayName = 'UnitConverter';

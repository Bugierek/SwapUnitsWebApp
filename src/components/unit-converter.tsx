

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { unitData, getUnitsForCategoryAndMode } from "@/lib/unit-data"; // Added getUnitsForCategoryAndMode
import type { UnitCategory, Unit, ConversionResult, Preset, NumberFormat, ConverterMode } from "@/types"; // Added ConverterMode
import {
  ArrowRightLeft,
  FlaskConical,
} from "lucide-react";

import { UnitIcon } from "./unit-icon";
import { ConversionDisplay } from "./conversion-display";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label"; // For mode toggle
import { Switch } from "@/components/ui/switch"; // For mode toggle
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useImperativeHandle, forwardRef } from 'react';
import { Button } from "@/components/ui/button";


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


export const UnitConverter = React.memo(forwardRef<UnitConverterHandle, UnitConverterProps>(function UnitConverterComponent({ className, converterMode, setConverterMode, ...props }, ref) {
  const [selectedCategory, setSelectedCategory] = React.useState<UnitCategory | "">("");
  const [conversionResult, setConversionResult] = React.useState<ConversionResult | null>(null);
  const [lastValidInputValue, setLastValidInputValue] = React.useState<number | undefined>(1);
  const [numberFormat, setNumberFormat] = React.useState<NumberFormat>('normal');
  const [isNormalFormatDisabled, setIsNormalFormatDisabled] = React.useState<boolean>(false);
  const isMobile = useIsMobile();
  const [prevConverterMode, setPrevConverterMode] = React.useState<ConverterMode>(converterMode);


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


  const convertUnits = React.useCallback((data: Partial<FormData>): ConversionResult | null => {
    const { category, fromUnit, toUnit, value } = data;
    const numericValue = Number(value);

    if (!category || !fromUnit || !toUnit || value === undefined || value === null || !isFinite(numericValue) || value === '') {
        return null;
    }

    const currentUnits = getUnitsForCategoryAndMode(category as UnitCategory, converterMode); // Use mode here
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
        if (fromUnitData.symbol === 'L/100km') {
            if (numericValue === 0) return null; 
            valueInKmPerL = fromUnitData.factor / numericValue; 
        } else {
            valueInKmPerL = numericValue * fromUnitData.factor;
        }

        let resultValue: number;
        if (toUnitData.symbol === 'L/100km') {
            if (valueInKmPerL === 0) return null; 
            resultValue = toUnitData.factor / valueInKmPerL; 
        } else {
            resultValue = valueInKmPerL / toUnitData.factor;
        }
        return isFinite(resultValue) ? { value: resultValue, unit: toUnitData.symbol } : null;
    }
    
    const valueInBaseUnit = numericValue * fromUnitData.factor;
    const resultValue = valueInBaseUnit / toUnitData.factor;
    return isFinite(resultValue) ? { value: resultValue, unit: toUnitData.symbol } : null;
  }, [converterMode]);


 React.useEffect(() => {
    const categoryChanged = currentCategory !== selectedCategory;
    const modeActuallyChanged = prevConverterMode !== converterMode;

    if (currentCategory && (categoryChanged || modeActuallyChanged)) {
        const newCategory = currentCategory as UnitCategory;
        const availableUnits = getUnitsForCategoryAndMode(newCategory, converterMode);

        let newFromUnitSymbol = fromUnitValue;
        let newToUnitSymbol = toUnitValue;

        if (categoryChanged || modeActuallyChanged) {
            // Determine default units based on category and mode
            switch (newCategory) {
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
                default:
                    newFromUnitSymbol = availableUnits[0]?.symbol || "";
                    newToUnitSymbol = availableUnits.find(u => u.symbol !== newFromUnitSymbol)?.symbol || newFromUnitSymbol;
            }

            // Ensure chosen defaults are in availableUnits
            if (!availableUnits.some(u => u.symbol === newFromUnitSymbol)) {
                newFromUnitSymbol = availableUnits[0]?.symbol || "";
            }
            if (!availableUnits.some(u => u.symbol === newToUnitSymbol) || newFromUnitSymbol === newToUnitSymbol) {
                newToUnitSymbol = availableUnits.find(u => u.symbol !== newFromUnitSymbol)?.symbol || (availableUnits[0]?.symbol || "");
                 if (newFromUnitSymbol === newToUnitSymbol && availableUnits.length > 1) {
                    newToUnitSymbol = availableUnits[1]?.symbol || ""; 
                } else if (newFromUnitSymbol === newToUnitSymbol && availableUnits.length === 1) {
                    newToUnitSymbol = newFromUnitSymbol; // Only one unit available
                }
            }
        }
        
        setValue("fromUnit", newFromUnitSymbol, { shouldValidate: true, shouldDirty: true });
        setValue("toUnit", newToUnitSymbol, { shouldValidate: true, shouldDirty: true });
        
        if (categoryChanged || modeActuallyChanged) {
            setValue("value", 1, { shouldValidate: true, shouldDirty: true });
            setLastValidInputValue(1);
            setNumberFormat('normal');
            setIsNormalFormatDisabled(false);
        }
        
        setSelectedCategory(newCategory);
        setPrevConverterMode(converterMode);

        setTimeout(() => {
            const currentVals = getValues();
            const valToConvert = (typeof currentVals.value === 'string' && (isNaN(parseFloat(currentVals.value)) || currentVals.value.trim() === '')) || currentVals.value === undefined ? 1 : Number(currentVals.value);
            const result = convertUnits({...currentVals, value: valToConvert, fromUnit: newFromUnitSymbol, toUnit: newToUnitSymbol });
            setConversionResult(result);
        }, 0);
    }
 }, [currentCategory, converterMode, setValue, getValues, convertUnits, selectedCategory, fromUnitValue, toUnitValue, prevConverterMode]);


  React.useEffect(() => {
    const formData = getValues();
    const { category, fromUnit, toUnit, value } = formData;
    const numericValue = Number(value);

    if (category && fromUnit && toUnit && value !== '' && !isNaN(numericValue) && isFinite(numericValue)) {
       setLastValidInputValue(numericValue);
       const result = convertUnits(formData);
       setConversionResult(result);
    } else if (category && fromUnit && toUnit && (value === '' || value === '-')) {
        setConversionResult(null);
        // Keep lastValidInputValue as is, or set to undefined if strict reset on empty is desired
        // setLastValidInputValue(undefined); 
        setIsNormalFormatDisabled(false);
    } else {
       setConversionResult(null);
       setIsNormalFormatDisabled(false);
    }
  }, [inputValue, fromUnitValue, toUnitValue, currentCategory, convertUnits, getValues]);


   React.useEffect(() => {
     if (selectedCategory === "") { 
        const initialFormData = getValues();
        if(initialFormData.category && initialFormData.fromUnit && initialFormData.toUnit && initialFormData.value !== undefined ) {
            const initialValue = (!isNaN(Number(initialFormData.value)) && isFinite(Number(initialFormData.value))) ? Number(initialFormData.value) : 1;
            if (initialValue !== initialFormData.value) {
                setValue("value", initialValue, { shouldValidate: false }); 
            }
            setLastValidInputValue(initialValue);
            setSelectedCategory(initialFormData.category as UnitCategory);
            setPrevConverterMode(converterMode); // Initialize prevConverterMode

            const initialAvailableUnits = getUnitsForCategoryAndMode(initialFormData.category as UnitCategory, converterMode);
            let initialFrom = initialFormData.fromUnit;
            let initialTo = initialFormData.toUnit;

            if (initialFormData.category === 'Mass') initialTo = 'g';

            if (!initialAvailableUnits.some(u => u.symbol === initialFrom)) {
                initialFrom = initialAvailableUnits[0]?.symbol || "";
            }
            if (!initialAvailableUnits.some(u => u.symbol === initialTo) || initialFrom === initialTo) {
                initialTo = initialAvailableUnits.find(u => u.symbol !== initialFrom)?.symbol || initialFrom;
            }
            
            setValue("fromUnit", initialFrom, { shouldValidate: false });
            setValue("toUnit", initialTo, { shouldValidate: false });

            const initialResult = convertUnits({...initialFormData, value: initialValue, fromUnit: initialFrom, toUnit: initialTo });
            setConversionResult(initialResult);
            setNumberFormat('normal'); 
            setIsNormalFormatDisabled(false); 
        }
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []); 


  const internalHandlePresetSelect = React.useCallback((preset: Preset) => {
    const presetCategory = Object.keys(unitData).find(catKey => catKey === preset.category) as UnitCategory | undefined;
    if (!presetCategory) return;

    // Set category first, it will trigger the useEffect for category/mode changes
    setValue("category", presetCategory, { shouldValidate: true, shouldDirty: true });
    
    // The useEffect watching currentCategory and converterMode will handle setting
    // fromUnit, toUnit, and value based on the new category and current mode.
    // We ensure the preset's units are considered if available in the current mode.
    
    // We might need to slightly adjust the useEffect to prioritize preset units if they are valid for the mode.
    // For now, let the existing useEffect handle default unit selection for the new category and mode.
    // Then, if preset units are valid for the mode, apply them.

    setTimeout(() => {
        const availableUnits = getUnitsForCategoryAndMode(presetCategory, converterMode);
        const fromUnitValid = availableUnits.some(u => u.symbol === preset.fromUnit);
        const toUnitValid = availableUnits.some(u => u.symbol === preset.toUnit);

        const finalFromUnit = fromUnitValid ? preset.fromUnit : availableUnits[0]?.symbol || "";
        let finalToUnit = (toUnitValid && preset.toUnit !== finalFromUnit) ? preset.toUnit : (availableUnits.find(u => u.symbol !== finalFromUnit)?.symbol || finalFromUnit);
         if (finalFromUnit === finalToUnit && availableUnits.length > 1) {
             finalToUnit = availableUnits.find(u=> u.symbol !== finalFromUnit)?.symbol || availableUnits[0]?.symbol || "";
         }


        reset({ 
            category: presetCategory,
            fromUnit: finalFromUnit,
            toUnit: finalToUnit,
            value: 1, 
        });
        setLastValidInputValue(1);
        setNumberFormat('normal'); 
        setIsNormalFormatDisabled(false); 

        setTimeout(() => {
           const result = convertUnits(getValues());
           setConversionResult(result);
        }, 0)
    }, 50); // Increased timeout slightly to ensure category change effect completes

  }, [setValue, reset, getValues, convertUnits, converterMode]);


  useImperativeHandle(ref, () => ({
    handlePresetSelect: internalHandlePresetSelect,
  }));


  const swapUnits = React.useCallback(() => {
    const currentFrom = fromUnitValue;
    const currentTo = toUnitValue;
    setValue("fromUnit", currentTo, { shouldValidate: true });
    setValue("toUnit", currentFrom, { shouldValidate: true });
  }, [fromUnitValue, toUnitValue, setValue]);

    const handleActualFormatChange = React.useCallback((
        actualFormat: NumberFormat,
        reason: 'magnitude' | 'user_choice' | null
    ) => {
        const magnitudeForcedScientific = actualFormat === 'scientific' && reason === 'magnitude';
        setIsNormalFormatDisabled(magnitudeForcedScientific);

        if (magnitudeForcedScientific && numberFormat === 'normal') {
            setNumberFormat('scientific'); 
        }
    }, [numberFormat]); 

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); 
  };


  return (
     <Card className={cn("shadow-lg flex flex-col", className)} aria-labelledby="unit-converter-title">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle id="unit-converter-title" className="text-2xl font-bold text-primary flex items-center gap-2" as="h2">
              <FlaskConical
                className="h-6 w-6"
                aria-hidden="true"
              />
               Swap Units Converter
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <Label htmlFor="mode-toggle" className="text-sm font-medium whitespace-nowrap">
                Advanced Mode
              </Label>
              <Switch
                id="mode-toggle"
                checked={converterMode === 'advanced'}
                onCheckedChange={(checked) => {
                  setConverterMode(checked ? 'advanced' : 'basic');
                }}
                aria-label="Toggle advanced conversion mode"
              />
            </div>
          </div>
          <br />
           <p className="text-sm text-muted-foreground mt-1 mb-2 space-y-1">
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
            <form onSubmit={handleFormSubmit} className="flex-grow flex flex-col">
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
                              {getUnitsForCategoryAndMode(currentCategory as UnitCategory, converterMode).map((unit) => (
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
                              {getUnitsForCategoryAndMode(currentCategory as UnitCategory, converterMode).map((unit) => (
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
                </div> 
                <div className="flex-grow"></div> {/* This div will push the form content up if card height is larger */}
            </form>
          </Form>
        </CardContent>
      </Card>
  );
}));

UnitConverter.displayName = 'UnitConverter';

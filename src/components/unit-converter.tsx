
"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
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
import { unitData, presets } from "@/lib/unit-data";
import { type UnitCategory, type Unit, type ConversionResult, type Preset } from "@/types";
import {
  ArrowRightLeft,
} from "lucide-react";
import { PresetList } from "./preset-list";
import { UnitIcon } from "./unit-icon";
import { ConversionDisplay } from "./conversion-display";

// Schema allows empty string or a valid number (positive or not, allowing intermediates)
// Coercion happens, but NaN is possible during typing invalid input.
const formSchema = z.object({
  category: z.string().min(1, "Please select a category"),
  fromUnit: z.string().min(1, "Please select an input unit"),
  toUnit: z.string().min(1, "Please select an output unit"),
  value: z.union([
     z.literal(''), // Allow empty string explicitly
     z.coerce.number({ invalid_type_error: "Please enter a valid number" })
        .or(z.nan()) // Allow NaN during invalid typing stages
   ]).optional(), // Optional allows initial undefined state if needed
});


type FormData = z.infer<typeof formSchema>;

export function UnitConverter() {
  const [selectedCategory, setSelectedCategory] = React.useState<
    UnitCategory | ""
  >("");
  const [conversionResult, setConversionResult] =
    React.useState<ConversionResult | null>(null);
   const [lastValidInputValue, setLastValidInputValue] = React.useState<number | undefined>(1);


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange', // Validate on change for immediate feedback
    defaultValues: {
      category: "",
      fromUnit: "",
      toUnit: "",
      value: 1, // Default to 1
    },
  });

  const { watch, setValue, reset, getValues } = form;
  const currentCategory = watch("category");
  const fromUnitValue = watch("fromUnit");
  const toUnitValue = watch("toUnit");
  const inputValue = watch("value"); // This can be string, number, or NaN during input

  const getUnitsForCategory = React.useCallback((category: UnitCategory | ""): Unit[] => {
    return category ? unitData[category]?.units ?? [] : [];
  }, []); // Stable function based on imported data

  const convertUnits = React.useCallback((data: Partial<FormData>): ConversionResult | null => {
    const { category, fromUnit, toUnit, value } = data;
    const numericValue = Number(value); // Attempt to convert input value to number

    // Basic validation: ensure essential fields are present and value is a finite number
    if (!category || !fromUnit || !toUnit || value === undefined || value === null || !isFinite(numericValue) || value === '') {
        return null; // Cannot convert if data is missing or value isn't a finite number
    }

    const currentUnits = getUnitsForCategory(category as UnitCategory);
    const fromUnitData = currentUnits.find((u) => u.symbol === fromUnit);
    const toUnitData = currentUnits.find((u) => u.symbol === toUnit);

    if (!fromUnitData || !toUnitData) {
      return null; // Should not happen if form validation passes, but safety check
    }

    // --- Temperature Conversion ---
    if (category === "Temperature") {
      let tempInCelsius: number;
      // Convert input temperature to Celsius
      if (fromUnitData.symbol === "°C") {
        tempInCelsius = numericValue;
      } else if (fromUnitData.symbol === "°F") {
        tempInCelsius = (numericValue - 32) * (5 / 9);
      } else { // Kelvin
        tempInCelsius = numericValue - 273.15;
      }

      // Convert Celsius to the target unit
      let resultValue: number;
      if (toUnitData.symbol === "°C") {
        resultValue = tempInCelsius;
      } else if (toUnitData.symbol === "°F") {
        resultValue = tempInCelsius * (9 / 5) + 32;
      } else { // Kelvin
        resultValue = tempInCelsius + 273.15;
      }
      // Final check for temperature result validity
      return isFinite(resultValue) ? { value: resultValue, unit: toUnitData.symbol } : null;
    }

    // --- General Conversion (Factor-Based) ---
    const valueInBaseUnit = numericValue * fromUnitData.factor;
    const resultValue = valueInBaseUnit / toUnitData.factor;

    // Final check for general conversion result validity
    return isFinite(resultValue) ? { value: resultValue, unit: toUnitData.symbol } : null;

  }, [getUnitsForCategory]); // Dependency on getUnitsForCategory


  // Effect to handle category changes
  React.useEffect(() => {
    if (currentCategory !== selectedCategory) {
      setSelectedCategory(currentCategory as UnitCategory);
      setValue("fromUnit", "", { shouldValidate: true });
      setValue("toUnit", "", { shouldValidate: true });
      setConversionResult(null);
      // Reset value to 1 when category changes for predictability
      setValue("value", 1, { shouldValidate: true });
      setLastValidInputValue(1);
    }
  }, [currentCategory, selectedCategory, setValue]);


  // Effect for automatic conversion on relevant input changes
  React.useEffect(() => {
    const formData = getValues(); // Get latest values
    const { category, fromUnit, toUnit, value } = formData;
    const numericValue = Number(value); // Attempt conversion

    // Check if we have enough data and the value is a valid, finite number
    if (category && fromUnit && toUnit && value !== '' && !isNaN(numericValue) && isFinite(numericValue)) {
       setLastValidInputValue(numericValue); // Store the last valid numeric input
       const result = convertUnits(formData);
       setConversionResult(result);
    } else {
       // If input is invalid (empty, NaN, non-finite), clear the result
       setConversionResult(null);
    }
    // Dependencies: Trigger re-calculation whenever any of these watched values change
  }, [inputValue, fromUnitValue, toUnitValue, currentCategory, convertUnits, getValues]);


  const handlePresetSelect = (preset: Preset) => {
    reset({
      category: preset.category,
      fromUnit: preset.fromUnit,
      toUnit: preset.toUnit,
      value: 1, // Reset value to 1 for presets
    });
     setLastValidInputValue(1);
    // The useEffect for dependencies will trigger the calculation
  };

  const swapUnits = () => {
    const currentFrom = fromUnitValue;
    const currentTo = toUnitValue;
    setValue("fromUnit", currentTo, { shouldValidate: true });
    setValue("toUnit", currentFrom, { shouldValidate: true });
    // The useEffect for dependencies will trigger the calculation
  };

  return (
    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
      <Card className="md:col-span-2 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
             <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M21.178 14.147a1.5 1.5 0 0 0-2.356-2.356l-2.97 2.97a1.5 1.5 0 0 0 2.356 2.356l2.97-2.97Z"/>
              <path d="m17 10-1.5 1.5"/>
              <path d="M5 5h2v2"/>
              <path d="M17.03 7H12V2h5.031a1.969 1.969 0 0 1 2 1.969V7Z"/>
              <path d="M9 14a5 5 0 1 0 0-10H4v10a5 5 0 0 0 5 5h2V9.97"/>
              <path d="M17 17v-2h-2"/>
              <path d="M7.03 17H12v5H7.031a1.969 1.969 0 0 1-2-1.969V17Z"/>
            </svg>
            Unitopia - Unit Converter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              {/* Category Selector */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={(value) => {
                          field.onChange(value);
                          // Explicitly trigger dependent field updates and clear result
                          setValue("fromUnit", "", { shouldValidate: true });
                          setValue("toUnit", "", { shouldValidate: true });
                          setValue("value", 1, { shouldValidate: true }); // Reset value on category change
                          setLastValidInputValue(1);
                          setConversionResult(null);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                           {field.value ? (
                             <div className="flex items-center gap-2">
                               <UnitIcon category={field.value as UnitCategory} className="h-4 w-4"/>
                               {unitData[field.value as UnitCategory]?.name ?? 'Select Category'}
                             </div>
                           ) : (
                             <SelectValue placeholder="Select a category" />
                           )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.keys(unitData).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                             <div className="flex items-center gap-2">
                                <UnitIcon category={cat as UnitCategory} className="h-4 w-4"/>
                                {unitData[cat as UnitCategory].name}
                             </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit Selectors and Swap Button */}
              {selectedCategory && (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                  {/* From Unit */}
                  <FormField
                    control={form.control}
                    name="fromUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value)} // Let useEffect handle calculation
                          value={field.value}
                          disabled={!selectedCategory}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select input unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getUnitsForCategory(selectedCategory).map((unit) => (
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

                  {/* Swap Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={swapUnits}
                    disabled={!fromUnitValue || !toUnitValue}
                    className="mb-1" // Align vertically
                    aria-label="Swap units"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>

                  {/* To Unit */}
                  <FormField
                    control={form.control}
                    name="toUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value)} // Let useEffect handle calculation
                          value={field.value}
                          disabled={!selectedCategory}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select output unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getUnitsForCategory(selectedCategory).map((unit) => (
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

              {/* Value Input */}
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value to Convert</FormLabel>
                    <FormControl>
                      <Input
                        type="text" // Use text type to allow more flexible input during typing
                        inputMode="decimal" // Hint for numeric keyboard on mobile
                        placeholder="Enter value"
                        {...field}
                        onChange={(e) => {
                            const rawValue = e.target.value;
                            // Allow empty string, partial numbers (like "1.", "."), or valid numbers
                            if (rawValue === '' || /^-?\d*\.?\d*$/.test(rawValue)) {
                                field.onChange(rawValue); // Update form state immediately
                            }
                            // Let the useEffect handle the conversion logic based on the watched value
                        }}
                        disabled={!fromUnitValue || !toUnitValue}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

               {/* Conversion Result Display */}
               <ConversionDisplay
                fromValue={lastValidInputValue} // Display the last *valid* number entered
                fromUnit={fromUnitValue ?? ''}
                result={conversionResult}
               />

            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Preset List */}
      <PresetList onPresetSelect={handlePresetSelect} />
    </div>
  );
}

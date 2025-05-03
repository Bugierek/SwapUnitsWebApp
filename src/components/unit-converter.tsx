
"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription, // Import FormDescription
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
import { type UnitCategory, type Unit, type ConversionResult, type Preset, type NumberFormat } from "@/types";
import {
  ArrowRightLeft,
} from "lucide-react";
import { PresetList } from "./preset-list";
import { UnitIcon } from "./unit-icon";
import { ConversionDisplay } from "./conversion-display";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";


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
  >("Mass"); // Default category to Mass
  const [conversionResult, setConversionResult] =
    React.useState<ConversionResult | null>(null);
   const [lastValidInputValue, setLastValidInputValue] = React.useState<number | undefined>(1); // Default value to 1
   const [numberFormat, setNumberFormat] = React.useState<NumberFormat>('normal'); // Default format


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange', // Validate on change for immediate feedback
    defaultValues: {
      category: "Mass", // Default category
      fromUnit: "kg",  // Default from unit
      toUnit: "mg",    // Default to unit
      value: 1,        // Default value
    },
  });

  const { watch, setValue, reset, getValues } = form;
  const currentCategory = watch("category");
  const fromUnitValue = watch("fromUnit");
  const toUnitValue = watch("toUnit");
  const inputValue = watch("value"); // This can be string, number, or NaN during input

  const getUnitsForCategory = React.useCallback((category: UnitCategory | ""): Unit[] => {
    return category ? unitData[category as UnitCategory]?.units ?? [] : [];
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


  // Effect to handle category changes: Set default units when category changes
  React.useEffect(() => {
    // Only run if the category actually changed
    if (currentCategory && currentCategory !== selectedCategory) {
      setSelectedCategory(currentCategory as UnitCategory);
      const units = getUnitsForCategory(currentCategory as UnitCategory);

      const firstUnitSymbol = units[0]?.symbol ?? "";
      // Use second unit symbol if available, otherwise fallback to the first one
      const secondUnitSymbol = units[1]?.symbol ?? firstUnitSymbol;

      // Set the 'fromUnit' to the first unit and 'toUnit' to the second (or first)
      setValue("fromUnit", firstUnitSymbol, { shouldValidate: true });
      setValue("toUnit", secondUnitSymbol, { shouldValidate: true });
      setValue("value", 1, { shouldValidate: true }); // Reset value on category change
      setLastValidInputValue(1);
      setConversionResult(null); // Clear previous result
    }
  }, [currentCategory, selectedCategory, setValue, getUnitsForCategory]);



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
    // Also runs on initial mount due to default values
  }, [inputValue, fromUnitValue, toUnitValue, currentCategory, convertUnits, getValues]);

   // Effect to perform initial calculation on mount with default values
   React.useEffect(() => {
     const initialFormData = getValues();
     const initialResult = convertUnits(initialFormData);
     setConversionResult(initialResult);
     // Only run this on mount
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);


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
    // Use semantic main or section tag if appropriate, but div is okay here
    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Main converter card */}
      <Card className="md:col-span-2 shadow-lg" aria-labelledby="unit-converter-title">
        <CardHeader>
          {/* Use H1 for the main title of the component/page section */}
          <CardTitle id="unit-converter-title" className="text-2xl font-bold text-primary flex items-center gap-2">
             <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true" // Hide decorative icon from screen readers
            >
              <path d="M21.178 14.147a1.5 1.5 0 0 0-2.356-2.356l-2.97 2.97a1.5 1.5 0 0 0 2.356 2.356l2.97-2.97Z"/>
              <path d="m17 10-1.5 1.5"/>
              <path d="M5 5h2v2"/>
              <path d="M17.03 7H12V2h5.031a1.969 1.969 0 0 1 2 1.969V7Z"/>
              <path d="M9 14a5 5 0 1 0 0-10H4v10a5 5 0 0 0 5 5h2V9.97"/>
              <path d="M17 17v-2h-2"/>
              <path d="M7.03 17H12v5H7.031a1.969 1.969 0 0 1-2-1.969V17Z"/>
            </svg>
            Unitopia - Versatile Unit Converter
          </CardTitle>
           {/* Use paragraph for description */}
           <p className="text-sm text-muted-foreground mt-4 mb-2 space-y-1">
             Quickly convert between common and specialized units. Follow these simple steps:
           </p>
           {/* Ordered list for steps */}
           <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
             <li><span className="font-semibold text-primary">Select Category:</span> Choose the type of measurement (e.g., Length, Mass).</li>
             <li><span className="font-semibold text-primary">Choose Units & Input Value:</span> Pick the 'From' and 'To' units, then enter the value you want to convert.</li>
             <li><span className="font-semibold text-primary">View Result:</span> The converted value appears automatically below.</li>
           </ol>
        </CardHeader>
        <CardContent className="pt-0"> {/* Adjusted padding top */}
          <Form {...form}>
            {/* Use form tag semantically */}
            <form className="space-y-6" aria-live="polite"> {/* aria-live makes results announced */}
              {/* Category Selector */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="category-select">Measurement Category</FormLabel> {/* Use htmlFor */}
                    <Select
                      onValueChange={(value) => {
                          field.onChange(value);
                          // Triggering the effect by changing the category is enough
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        {/* Add aria-describedby if needed */}
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
                      <SelectContent>
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

              {/* Unit Selectors and Swap Button */}
              {selectedCategory && (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                  {/* From Unit */}
                  <FormField
                    control={form.control}
                    name="fromUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="from-unit-select">From Unit</FormLabel> {/* Use htmlFor */}
                        <Select
                          onValueChange={(value) => field.onChange(value)} // Let useEffect handle calculation
                          value={field.value}
                          disabled={!selectedCategory}
                        >
                          <FormControl>
                            <SelectTrigger id="from-unit-select" aria-label="Select the unit to convert from">
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
                    aria-label="Swap from and to units" // Descriptive aria-label
                  >
                    <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>

                  {/* To Unit */}
                  <FormField
                    control={form.control}
                    name="toUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="to-unit-select">To Unit</FormLabel> {/* Use htmlFor */}
                        <Select
                          onValueChange={(value) => field.onChange(value)} // Let useEffect handle calculation
                          value={field.value}
                          disabled={!selectedCategory}
                        >
                          <FormControl>
                            <SelectTrigger id="to-unit-select" aria-label="Select the unit to convert to">
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
                    <FormLabel htmlFor="value-input">Value to Convert</FormLabel> {/* Use htmlFor */}
                    <FormControl>
                      <Input
                        id="value-input" // Match htmlFor
                        type="text" // Use text type to allow more flexible input during typing
                        inputMode="decimal" // Hint for numeric keyboard on mobile
                        placeholder="Enter value"
                        {...field}
                        onChange={(e) => {
                            const rawValue = e.target.value;
                            // Allow empty string, partial numbers (like "1.", "."), or valid numbers
                            // Also allow negative sign at the start
                             if (rawValue === '' || rawValue === '-' || /^-?\d*\.?\d*$/.test(rawValue)) {
                                field.onChange(rawValue); // Update form state immediately
                            }
                            // Let the useEffect handle the conversion logic based on the watched value
                        }}
                        disabled={!fromUnitValue || !toUnitValue}
                        aria-required="true" // Indicate required field
                      />
                    </FormControl>
                    <FormDescription>Enter the numerical value you wish to convert.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

               {/* Conversion Result Display */}
               <ConversionDisplay
                fromValue={lastValidInputValue} // Display the last *valid* number entered
                fromUnit={fromUnitValue ?? ''}
                result={conversionResult}
                format={numberFormat} // Pass the selected format
               />

               {/* Number Formatting Options */}
                <fieldset className="pt-4"> {/* Use fieldset for grouping related radio buttons */}
                  <legend className="mb-2 block font-medium">Result Formatting Options</legend>
                   <RadioGroup
                     defaultValue="normal"
                     value={numberFormat}
                     onValueChange={(value: string) => setNumberFormat(value as NumberFormat)}
                     className="flex flex-col sm:flex-row gap-4"
                     aria-label="Choose number format for the result"
                   >
                     <div className="flex items-center space-x-2">
                       <RadioGroupItem value="normal" id="format-normal" />
                       <Label htmlFor="format-normal" className="cursor-pointer">Normal (e.g., 1,234.56)</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                       <RadioGroupItem value="scientific" id="format-scientific" />
                       <Label htmlFor="format-scientific" className="cursor-pointer">Scientific (e.g., 1.23E+6)</Label>
                     </div>
                   </RadioGroup>
                </fieldset>

            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Preset List - use aside or section if appropriate */}
      <aside className="md:col-span-1"> {/* Use aside for complementary content */}
        <PresetList onPresetSelect={handlePresetSelect} />
      </aside>

       {/* Potential future ad slot area - Consider semantic placement */}
       {/* <div className="md:col-span-3 mt-8 h-24 bg-muted/30 flex items-center justify-center text-muted-foreground rounded-md">
          (Future Ad Area 2)
       </div> */}
    </div>
  );
}

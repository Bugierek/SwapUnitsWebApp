

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
import type { UnitCategory, Unit, ConversionResult, Preset, NumberFormat } from "@/types";
import {
  ArrowRightLeft,
  FlaskConical, // Import the FlaskConical icon
} from "lucide-react";
import { PresetList } from "./preset-list";
import { UnitIcon } from "./unit-icon";
import { ConversionDisplay } from "./conversion-display";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { cn } from "@/lib/utils"; // Import cn utility


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

export const UnitConverter = React.memo(function UnitConverterComponent() {
  // State to track the *currently selected* category for logic purposes
  // This differs from form.watch("category") which reflects the form state immediately
  const [selectedCategory, setSelectedCategory] = React.useState<UnitCategory | "">("");
  const [conversionResult, setConversionResult] = React.useState<ConversionResult | null>(null);
  const [lastValidInputValue, setLastValidInputValue] = React.useState<number | undefined>(1); // Default value to 1
  const [numberFormat, setNumberFormat] = React.useState<NumberFormat>('normal'); // User's selected format preference
  // State to track if the 'normal' format option should be disabled (because magnitude forces scientific)
  const [isNormalFormatDisabled, setIsNormalFormatDisabled] = React.useState<boolean>(false);
  const isMobile = useIsMobile(); // Use the hook


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange', // Validate on change for immediate feedback
    defaultValues: {
      category: "Mass", // Default category on load
      fromUnit: "kg",  // Default from unit (Kilogram for Mass)
      toUnit: "g",    // Default to unit (Gram for Mass) - Updated as per user request
      value: 1,        // Default value
    },
  });

  const { watch, setValue, reset, getValues } = form;
  const currentCategory = watch("category"); // Watches the form state value for category
  const fromUnitValue = watch("fromUnit");
  const toUnitValue = watch("toUnit");
  const inputValue = watch("value"); // This can be string, number, or NaN during input

  // Memoize the getUnits function
  const getUnitsForCategory = React.useCallback((category: UnitCategory | ""): Unit[] => {
    return category ? unitData[category as UnitCategory]?.units ?? [] : [];
  }, []); // Stable function based on imported data

  // Memoize the conversion function
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

    // --- Fuel Economy Conversion (Special Handling) ---
    if (category === "Fuel Economy") {
        let valueInKmPerL: number;

        // Convert input to base unit (km/L)
        if (fromUnitData.symbol === 'L/100km') {
            if (numericValue === 0) return null; // Avoid division by zero
            valueInKmPerL = fromUnitData.factor / numericValue; // Inverse relationship
        } else {
            valueInKmPerL = numericValue * fromUnitData.factor;
        }

        // Convert base unit (km/L) to target unit
        let resultValue: number;
        if (toUnitData.symbol === 'L/100km') {
            if (valueInKmPerL === 0) return null; // Avoid division by zero
            resultValue = toUnitData.factor / valueInKmPerL; // Inverse relationship
        } else {
            resultValue = valueInKmPerL / toUnitData.factor;
        }

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
    const isValidCategory = currentCategory && Object.keys(unitData).includes(currentCategory);
    const categoryChanged = currentCategory !== selectedCategory;

    // Only proceed if the category is valid and has actually changed from the tracked state
    if (isValidCategory && categoryChanged) {
        const newCategory = currentCategory as UnitCategory;
        setSelectedCategory(newCategory); // Update the tracked state *after* checking for change

        const units = getUnitsForCategory(newCategory);
        let defaultFromUnit = units[0]?.symbol ?? ""; // Default to first unit
        let defaultToUnit = units.length > 1 ? (units[1]?.symbol ?? defaultFromUnit) : defaultFromUnit; // Default to second or first if available

        // Set specific, sensible defaults for each category
        switch (newCategory) {
            case 'Length':
                defaultFromUnit = units.find(u => u.symbol === 'm')?.symbol ?? units[0]?.symbol ?? "";
                defaultToUnit = units.find(u => u.symbol === 'ft')?.symbol ?? units[1]?.symbol ?? defaultFromUnit;
                break;
            case 'Mass':
                defaultFromUnit = units.find(u => u.symbol === 'kg')?.symbol ?? units[0]?.symbol ?? "";
                defaultToUnit = units.find(u => u.symbol === 'g')?.symbol ?? units[1]?.symbol ?? defaultFromUnit; // Set to grams
                break;
            case 'Temperature':
                defaultFromUnit = units.find(u => u.symbol === '°C')?.symbol ?? units[0]?.symbol ?? "";
                defaultToUnit = units.find(u => u.symbol === '°F')?.symbol ?? units[1]?.symbol ?? defaultFromUnit; // C to F
                break;
            case 'Time':
                defaultFromUnit = units.find(u => u.symbol === 's')?.symbol ?? units[0]?.symbol ?? "";
                defaultToUnit = units.find(u => u.symbol === 'ms')?.symbol ?? units[1]?.symbol ?? defaultFromUnit; // s to ms
                break;
            case 'Pressure':
                defaultFromUnit = units.find(u => u.symbol === 'Pa')?.symbol ?? units[0]?.symbol ?? "";
                defaultToUnit = units.find(u => u.symbol === 'kPa')?.symbol ?? units[1]?.symbol ?? defaultFromUnit; // Pa to kPa
                break;
            case 'Area':
                defaultFromUnit = units.find(u => u.symbol === 'm²')?.symbol ?? units[0]?.symbol ?? "";
                defaultToUnit = units.find(u => u.symbol === 'ft²')?.symbol ?? units[1]?.symbol ?? defaultFromUnit; // m2 to ft2
                break;
            case 'Volume':
                defaultFromUnit = units.find(u => u.symbol === 'L')?.symbol ?? units[0]?.symbol ?? "";
                defaultToUnit = units.find(u => u.symbol === 'mL')?.symbol ?? units[1]?.symbol ?? defaultFromUnit; // L to mL
                break;
            case 'Energy':
                defaultFromUnit = units.find(u => u.symbol === 'J')?.symbol ?? units[0]?.symbol ?? "";
                defaultToUnit = units.find(u => u.symbol === 'kJ')?.symbol ?? units[1]?.symbol ?? defaultFromUnit; // J to kJ
                break;
            case 'Speed':
                defaultFromUnit = units.find(u => u.symbol === 'm/s')?.symbol ?? units[0]?.symbol ?? "";
                defaultToUnit = units.find(u => u.symbol === 'km/h')?.symbol ?? units[1]?.symbol ?? defaultFromUnit; // m/s to km/h
                break;
            case 'Fuel Economy':
                defaultFromUnit = units.find(u => u.symbol === 'km/L')?.symbol ?? units[0]?.symbol ?? "";
                defaultToUnit = units.find(u => u.symbol === 'MPG (US)')?.symbol ?? units[1]?.symbol ?? defaultFromUnit; // km/L to MPG (US)
                break;
            case 'Data Storage':
                defaultFromUnit = units.find(u => u.symbol === 'GB')?.symbol ?? units[0]?.symbol ?? "";
                defaultToUnit = units.find(u => u.symbol === 'MB')?.symbol ?? units[1]?.symbol ?? defaultFromUnit; // GB to MB
                break;
            case 'Data Transfer Rate':
                defaultFromUnit = units.find(u => u.symbol === 'Mbps')?.symbol ?? units[0]?.symbol ?? "";
                defaultToUnit = units.find(u => u.symbol === 'MB/s')?.symbol ?? units[1]?.symbol ?? defaultFromUnit; // Mbps to MB/s
                break;
            // No default case needed as fallbacks are handled above
        }


        // Update the form values for fromUnit, toUnit, and reset the input value
        setValue("fromUnit", defaultFromUnit, { shouldValidate: true, shouldDirty: true });
        setValue("toUnit", defaultToUnit, { shouldValidate: true, shouldDirty: true });
        setValue("value", 1, { shouldValidate: true, shouldDirty: true }); // Reset value to 1
        setLastValidInputValue(1); // Reset the display value tracker
        setNumberFormat('normal'); // Reset format choice on category change
        setIsNormalFormatDisabled(false); // Re-enable normal format initially

        // Trigger recalculation after state updates settle
        // Use setTimeout to ensure state updates from setValue are processed before conversion
        setTimeout(() => {
            const result = convertUnits(getValues());
            setConversionResult(result);
        }, 0);
    }
 }, [currentCategory, selectedCategory, setValue, getUnitsForCategory, getValues, convertUnits]);


  // Effect for automatic conversion on relevant input changes (value, fromUnit, toUnit)
  React.useEffect(() => {
    const formData = getValues(); // Get latest values
    const { category, fromUnit, toUnit, value } = formData;
    const numericValue = Number(value); // Attempt conversion

    // Check if we have enough data and the value is a valid, finite number
    if (category && fromUnit && toUnit && value !== '' && !isNaN(numericValue) && isFinite(numericValue)) {
       setLastValidInputValue(numericValue); // Store the last valid numeric input
       const result = convertUnits(formData);
       setConversionResult(result);
       // Logic to enable/disable 'normal' format will be handled by handleActualFormatChange callback
    } else if (category && fromUnit && toUnit && value === '') {
        // Handle empty input: clear result but keep last valid input displayed
        setConversionResult(null);
        setLastValidInputValue(undefined); // Reset last valid input if input is empty
        setIsNormalFormatDisabled(false); // Ensure normal is enabled when input is empty
    }
     else {
       // If input is invalid (NaN, non-finite, but not empty), clear the result
       setConversionResult(null);
       // Keep the last valid input value displayed for context if available, else undefined
       // setLastValidInputValue(lastValidInputValue); // No change needed here
       setIsNormalFormatDisabled(false); // Ensure normal is enabled when input is invalid
    }
  }, [inputValue, fromUnitValue, toUnitValue, currentCategory, convertUnits, getValues]); // Add currentCategory


   // Effect to perform initial calculation on mount *only*
   React.useEffect(() => {
     // Check if it's the very first load (selectedCategory is empty) and we have initial form values
     if (selectedCategory === "") {
        const initialFormData = getValues(); // Get default values from useForm
        // Ensure all necessary initial values are present
        if(initialFormData.category && initialFormData.fromUnit && initialFormData.toUnit && initialFormData.value !== undefined ) {
            const initialValue = (!isNaN(Number(initialFormData.value)) && isFinite(Number(initialFormData.value))) ? Number(initialFormData.value) : 1;
            // Correct the form value if it somehow wasn't the default number
            if (initialValue !== initialFormData.value) {
                setValue("value", initialValue, { shouldValidate: false });
            }
            // Set the tracked states and perform initial conversion
            setLastValidInputValue(initialValue);
            setSelectedCategory(initialFormData.category as UnitCategory); // Track initial category

            // Ensure the correct toUnit is set for the initial conversion (it should match defaultValues)
            const initialToUnit = initialFormData.category === 'Mass' ? 'g' : initialFormData.toUnit;
            if(initialToUnit !== initialFormData.toUnit) {
                setValue("toUnit", initialToUnit, { shouldValidate: false });
            } else {
                 // If the initial toUnit IS 'g' (or whatever the default is supposed to be),
                 // still explicitly set it to ensure consistency, especially if defaultValues were dynamic.
                 setValue("toUnit", initialToUnit, { shouldValidate: false });
            }

            const initialResult = convertUnits({...initialFormData, value: initialValue, toUnit: initialToUnit }); // Use corrected initial value and ensure correct toUnit
            setConversionResult(initialResult);
            setNumberFormat('normal'); // Ensure default format is set
            setIsNormalFormatDisabled(false); // Ensure normal is enabled initially
        }
     }
     // This effect should run only once on mount
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []); // Empty dependency array ensures it runs only on mount


  const handlePresetSelect = React.useCallback((preset: Preset) => {
    // Find the actual category object based on the preset's category name/key
    const presetCategory = Object.keys(unitData).find(catKey => catKey === preset.category) as UnitCategory | undefined;

    if (!presetCategory) return; // Should not happen if presets are valid

    // Set the category first to trigger the category change effect
    setValue("category", presetCategory, { shouldValidate: true, shouldDirty: true });

    // Use setTimeout to allow the category change effect to run FIRST, then apply preset units/value
    // This prevents race conditions where units might not be ready
    setTimeout(() => {
        // Resetting with specific preset values *after* category effect has run
        reset({
            category: presetCategory, // Keep the category
            fromUnit: preset.fromUnit,
            toUnit: preset.toUnit,
            value: 1, // Reset value to 1 for presets
        });
        setLastValidInputValue(1);
        setNumberFormat('normal'); // Reset format on preset selection
        setIsNormalFormatDisabled(false); // Re-enable normal format on preset selection

        // Trigger final calculation after reset ensures correct values are used
        setTimeout(() => {
           const result = convertUnits(getValues());
           setConversionResult(result);
        }, 0)

    }, 0); // Small delay allows category effect to complete
  }, [setValue, reset, getValues, convertUnits]);


  const swapUnits = React.useCallback(() => {
    const currentFrom = fromUnitValue;
    const currentTo = toUnitValue;
    setValue("fromUnit", currentTo, { shouldValidate: true });
    setValue("toUnit", currentFrom, { shouldValidate: true });
    // The useEffect for input/unit changes will trigger the calculation automatically
  }, [fromUnitValue, toUnitValue, setValue]);

    // Callback function to update the numberFormat state and disable state based on ConversionDisplay feedback
    const handleActualFormatChange = React.useCallback((
        actualFormat: NumberFormat,
        reason: 'magnitude' | 'user_choice' | null
    ) => {
        const magnitudeForcedScientific = actualFormat === 'scientific' && reason === 'magnitude';

        // Disable the 'normal' option only if magnitude forces scientific notation
        setIsNormalFormatDisabled(magnitudeForcedScientific);

        // If magnitude forces scientific, update the user's selected format state to reflect this
        if (magnitudeForcedScientific && numberFormat === 'normal') {
            setNumberFormat('scientific');
        }
        // If magnitude no longer forces scientific, AND the user's *preference* isn't already scientific,
        // we don't automatically switch back to normal. The user preference stays unless they change it.
        // The 'normal' option just becomes enabled again.

    }, [numberFormat]); // Depend on the user's selected format preference


  return (
    // Use semantic main or section tag if appropriate, but div is okay here
    // Changed grid layout: col-span-full on mobile, md:col-span-2 on medium+
    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Main converter card */}
      {/* Adjust col-span: col-span-full on mobile, md:col-span-2 on medium screens and up */}
      <Card className="col-span-full md:col-span-2 shadow-lg" aria-labelledby="unit-converter-title">
        <CardHeader>
          {/* Use H1 for the main title of the component/page section */}
          <CardTitle id="unit-converter-title" className="text-2xl font-bold text-primary flex items-center gap-2">
            {/* Replace inline SVG with FlaskConical icon */}
            <FlaskConical
              className="h-6 w-6"
              aria-hidden="true" // Hide decorative icon from screen readers
            />
            {/* Conditionally render title based on mobile view */}
            {isMobile ? 'Unitopia - Unit Converter' : 'Unitopia - Versatile Unit Converter'}
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
                          // Directly update the form state.
                          // The category change useEffect will handle the rest (updating units, value, etc.)
                          field.onChange(value);
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
              {/* Conditionally render only when a category *form value* exists */}
              {currentCategory && (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end"> {/* Changed items-baseline to items-end */}
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
                          // Disable only if the form category value is empty (shouldn't normally happen with default)
                          disabled={!currentCategory}
                        >
                          <FormControl>
                            <SelectTrigger id="from-unit-select" aria-label="Select the unit to convert from">
                              <SelectValue placeholder="Select input unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                             {/* Get units based on the *form's current category value* */}
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

                  {/* Swap Button */}
                  <Button
                    type="button"
                    variant="outline"
                    // Removed size="icon", setting specific width/height
                    onClick={swapUnits}
                    disabled={!fromUnitValue || !toUnitValue}
                    // Make wider on mobile (sm:w-10), keep height consistent
                    className="justify-self-center sm:justify-self-auto h-10 w-full sm:w-10"
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
                          disabled={!currentCategory}
                        >
                          <FormControl>
                            <SelectTrigger id="to-unit-select" aria-label="Select the unit to convert to">
                              <SelectValue placeholder="Select output unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                             {/* Get units based on the *form's current category value* */}
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
                            // Also allow negative sign at the start, scientific 'e/E' notation
                            // Updated Regex: Allows optional negative, digits, optional dot, more digits, optional E/e, optional +/- sign, digits
                             if (rawValue === '' || rawValue === '-' || /^-?\d*\.?\d*([eE][-+]?\d*)?$/.test(rawValue)) {
                                field.onChange(rawValue); // Update form state immediately
                            }
                            // Let the useEffect handle the conversion logic based on the watched value
                        }}
                         // Control the display value to handle intermediate states like just '-' or empty string
                         value={(field.value === '' || field.value === '-') ? field.value : (isNaN(Number(field.value)) ? '' : String(field.value))}
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
                format={numberFormat} // Pass the user's selected format preference
                onActualFormatChange={handleActualFormatChange} // Pass callback to get feedback
               />

               {/* Number Formatting Options */}
                <fieldset className="pt-4"> {/* Use fieldset for grouping related radio buttons */}
                  <legend className="mb-2 block font-medium">Result Formatting Options</legend>
                   <RadioGroup
                     value={numberFormat} // Controlled by state (user's preference)
                     onValueChange={(value: string) => {
                         // User can always change their preference.
                         // The display might override it visually, but the preference is stored here.
                         setNumberFormat(value as NumberFormat);
                     }}
                     className="flex flex-col sm:flex-row gap-4"
                     aria-label="Choose number format for the result"
                   >
                     <div className="flex items-center space-x-2">
                       <RadioGroupItem
                         value="normal"
                         id="format-normal"
                         disabled={isNormalFormatDisabled} // Disable the item if magnitude forces scientific
                        />
                       <Label
                         htmlFor="format-normal"
                         className={cn(
                           "cursor-pointer",
                            isNormalFormatDisabled && "text-muted-foreground opacity-70 cursor-not-allowed" // Grey out label when disabled
                         )}
                       >
                         Normal (e.g., 1,234.56)
                       </Label>
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
      {/* Adjust col-span: hidden on mobile, md:col-span-1 on medium+ */}
      <aside className="hidden md:block md:col-span-1"> {/* Use aside for complementary content */}
        <PresetList onPresetSelect={handlePresetSelect} />
      </aside>

       {/* Potential future ad slot area - Consider semantic placement */}
       {/* <div className="md:col-span-3 mt-8 h-24 bg-muted/30 flex items-center justify-center text-muted-foreground rounded-md">
          (Future Ad Area 2)
       </div> */}
    </div>
  );
});

UnitConverter.displayName = 'UnitConverter';

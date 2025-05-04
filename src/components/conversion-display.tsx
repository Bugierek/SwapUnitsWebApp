
import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { ConversionResult, NumberFormat } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button'; // Import Button
import { Copy, Check } from 'lucide-react'; // Import Copy and Check icons
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface ConversionDisplayProps {
    fromValue: number | undefined; // Can be undefined if input is invalid/empty
    fromUnit: string;
    result: ConversionResult | null;
    format?: NumberFormat; // Add format prop, default to 'normal'
}

// Helper function for number formatting
const formatNumber = (num: number, format: NumberFormat = 'normal'): string => {
    if (!isFinite(num)) {
        return '-'; // Indicator for invalid numbers
    }
    if (format === 'scientific') {
        // Use scientific notation always if selected, limit to 7 fractional digits
        let exponential = num.toExponential(7).replace('e', 'E');
        // Refine: Remove trailing zeros after decimal, and the decimal itself if no digits follow
        const match = exponential.match(/^(-?\d(?:\.\d*)?)(0*)(E[+-]\d+)$/);
        if (match) {
            let coefficient = match[1]; // The number part (e.g., -1.23)
            const exponent = match[3]; // The E part (e.g., E+5)

            // If the coefficient includes a decimal point and ends with zeros
            if (coefficient.includes('.')) {
                // Remove trailing zeros
                coefficient = coefficient.replace(/0+$/, '');
                // If it now ends with just the decimal point, remove it
                coefficient = coefficient.replace(/\.$/, '');
            }
            return coefficient + exponent;
        }
        // Fallback if regex fails (shouldn't normally happen with toExponential)
        return exponential;
    }
    // Default 'normal' formatting
    // Use exponential notation for very large or very small non-zero numbers
    if ((Math.abs(num) > 1e9 || Math.abs(num) < 1e-7) && num !== 0) {
         // Use 7 fractional digits for consistency, remove trailing zeros
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
         return exponential; // Fallback
    }
    // Otherwise, format with commas and appropriate decimal places (up to 7)
    return num.toLocaleString(undefined, { maximumFractionDigits: 7 });
};

// Helper function to format the 'from' value display (always normal format)
const formatFromValue = (num: number | undefined): string => {
    if (num === undefined || !isFinite(num)) {
        return '-';
    }
    // Always use 'normal' formatting for the input value display
    if ((Math.abs(num) > 1e9 || Math.abs(num) < 1e-7) && num !== 0) {
        // Use 7 fractional digits for consistency, remove trailing zeros
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
        return exponential; // Fallback
    }
    // Use up to 7 decimal places for the input value display as well
    return num.toLocaleString(undefined, { maximumFractionDigits: 7 });
};

// Memoize the component to prevent re-renders if props haven't changed
export const ConversionDisplay = React.memo(function ConversionDisplayComponent({ fromValue, fromUnit, result, format = 'normal' }: ConversionDisplayProps) {
    const { toast } = useToast(); // Initialize toast hook

    // Determine if we should show the placeholder state
    const showPlaceholder = fromValue === undefined || fromUnit === '' || !result;

    // Text to be copied (only the result value and unit)
    const textToCopy = showPlaceholder ? '' : `${formatNumber(result.value, format)} ${result.unit}`;

    // Copy handler using useCallback to prevent recreation on every render
    const handleCopy = React.useCallback(async () => {
        if (!textToCopy || !navigator.clipboard) return; // Guard clause

        try {
            await navigator.clipboard.writeText(textToCopy);
            toast({
                // Remove Check icon here, Toaster component handles it for confirmation variant
                title: "Copied!",
                description: `Result "${textToCopy}" copied to clipboard.`,
                variant: "confirmation", // Use confirmation (green) variant
            });
        } catch (err) {
            console.error('Failed to copy text: ', err);
            toast({
                title: "Copy Failed",
                description: "Could not copy result to clipboard.",
                variant: "destructive",
            });
        }
    }, [textToCopy, toast]);


    // Prepare the text content for screen readers
    const screenReaderText = showPlaceholder
        ? (fromValue !== undefined && fromUnit ? `Waiting for conversion of ${formatFromValue(fromValue)} ${fromUnit}` : 'Enter a value and select units to convert')
        : `${formatFromValue(fromValue!)} ${fromUnit} equals ${formatNumber(result.value, format)} ${result.unit}`;

    return (
        <> {/* Wrap multiple sibling elements in a Fragment */}
            {/* Add aria-live region to announce changes */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {screenReaderText}
            </div>
            {/* The visual card remains separate */}
            <Card className={cn(
                "shadow-sm transition-opacity duration-300",
                showPlaceholder ? "bg-muted/50 border-muted opacity-60" : "bg-primary/10 border-primary/50"
            )}>
                <CardContent className="p-4">
                    <div className="text-center sm:text-left">
                        <p className="text-sm text-muted-foreground h-5">
                            {showPlaceholder
                             ? (fromValue !== undefined && fromUnit ? `${formatFromValue(fromValue)} ${fromUnit} equals...` : 'Enter a value to convert')
                             : `${formatFromValue(fromValue!)} ${fromUnit} equals`
                            }
                        </p>
                         {/* Flex container for result and copy button */}
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                             <p className={cn(
                                "text-2xl font-bold h-[32px] flex items-center", // Ensure consistent height and vertical alignment
                                showPlaceholder ? "text-muted-foreground" : "text-purple-600 dark:text-purple-400" // Purple color applied here
                             )}>
                               {showPlaceholder ? '-' : (
                                    <>
                                        {formatNumber(result.value, format)}{' '}
                                        <span className="text-lg font-medium text-purple-600 dark:text-purple-400 ml-1">{result.unit}</span>
                                    </>
                               )}
                            </p>
                            {/* Copy Button */}
                            {!showPlaceholder && (
                                <Button
                                    type="button" // Explicitly set type to button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" // Adjust size and styling
                                    onClick={handleCopy}
                                    aria-label="Copy result to clipboard"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
});

ConversionDisplay.displayName = 'ConversionDisplay';

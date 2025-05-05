
import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { ConversionResult, NumberFormat } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button'; // Import Button
import { Copy } from 'lucide-react'; // Import Copy icon
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface ConversionDisplayProps {
    fromValue: number | undefined; // Can be undefined if input is invalid/empty
    fromUnit: string;
    result: ConversionResult | null;
    format: NumberFormat; // Add format prop
    // Update callback to include the reason for the format used
    onActualFormatChange: (
        actualFormat: NumberFormat,
        reason: 'magnitude' | 'user_choice' | null
    ) => void;
}

// Helper function for number formatting - now returns object with actual format and reason
const formatNumber = (num: number, requestedFormat: NumberFormat = 'normal'): {
    formattedString: string;
    actualFormatUsed: NumberFormat;
    scientificReason: 'magnitude' | 'user_choice' | null; // Add reason
} => {
    if (!isFinite(num)) {
        return { formattedString: '-', actualFormatUsed: requestedFormat, scientificReason: null }; // Indicator for invalid numbers
    }

    let actualFormatUsed: NumberFormat = requestedFormat;
    let formattedString: string;
    let scientificReason: 'magnitude' | 'user_choice' | null = null; // Initialize reason

    // Determine if magnitude forces scientific notation
    const useScientificDueToMagnitude = (Math.abs(num) > 1e9 || Math.abs(num) < 1e-7) && num !== 0;

    if (requestedFormat === 'scientific' || useScientificDueToMagnitude) {
        actualFormatUsed = 'scientific';
        scientificReason = useScientificDueToMagnitude ? 'magnitude' : 'user_choice'; // Set the reason

        // Use scientific notation always if selected or needed due to magnitude, limit to 7 fractional digits
        let exponential = num.toExponential(7).replace('e', 'E'); // Use capital E

        // Refine: Remove trailing zeros after decimal, and the decimal itself if no digits follow
        const match = exponential.match(/^(-?\d(?:\.\d*)?)(0*)(E[+-]\d+)$/);
        if (match) {
            let coefficient = match[1]; // The number part (e.g., -1.23)
            const exponent = match[3]; // The E part (e.g., E+5)

            // If the coefficient includes a decimal point
            if (coefficient.includes('.')) {
                // Remove trailing zeros
                coefficient = coefficient.replace(/0+$/, '');
                // If it now ends with just the decimal point, remove it
                coefficient = coefficient.replace(/\.$/, '');
            }
            formattedString = coefficient + exponent;
        } else {
            // Fallback if regex fails (shouldn't normally happen with toExponential)
            formattedString = exponential;
        }
    } else {
        // Default 'normal' formatting
        actualFormatUsed = 'normal';
        // Format with commas and appropriate decimal places (up to 7)
        formattedString = num.toLocaleString(undefined, { maximumFractionDigits: 7 });
    }

    return { formattedString, actualFormatUsed, scientificReason }; // Return reason
};


// Helper function to format the 'from' value display (always tries normal first, doesn't affect radio buttons)
const formatFromValue = (num: number | undefined): string => {
    if (num === undefined || !isFinite(num)) {
        return '-';
    }
    // Apply formatting logic similar to formatNumber but *always* aiming for normal first
    const useScientificDueToMagnitude = (Math.abs(num) > 1e9 || Math.abs(num) < 1e-7) && num !== 0;

    if (useScientificDueToMagnitude) {
        // Use 7 fractional digits for consistency, remove trailing zeros
        let exponential = num.toExponential(7).replace('e', 'E'); // Use capital E
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
export const ConversionDisplay = React.memo(function ConversionDisplayComponent({ fromValue, fromUnit, result, format, onActualFormatChange }: ConversionDisplayProps) {
    const { toast } = useToast(); // Initialize toast hook

    // Determine if we should show the placeholder state
    const showPlaceholder = fromValue === undefined || fromUnit === '' || !result;

    // Format the result and get the actual format used and the reason
    const { formattedString: formattedResultString, actualFormatUsed, scientificReason } = React.useMemo(() => {
        return showPlaceholder ? { formattedString: '-', actualFormatUsed: format, scientificReason: null } : formatNumber(result.value, format);
    }, [showPlaceholder, result, format]);

    // Effect to inform the parent component about the actual format used and the reason
    React.useEffect(() => {
        // Pass the actual format used and the reason back to the parent
        onActualFormatChange(actualFormatUsed, scientificReason);
        // The parent (UnitConverter) will decide whether to update the radio button state
    }, [actualFormatUsed, scientificReason, onActualFormatChange]);


    // Text to be copied (only the result value and unit)
    const textToCopy = showPlaceholder ? '' : `${formattedResultString} ${result.unit}`;

    // Copy handler using useCallback to prevent recreation on every render
    const handleCopy = React.useCallback(async () => {
        if (!textToCopy || !navigator.clipboard) return; // Guard clause

        try {
            await navigator.clipboard.writeText(textToCopy);
            toast({
                title: "Copied!",
                description: `Result "${textToCopy}" copied to clipboard.`,
                variant: "confirmation", // Use confirmation (green) variant
                duration: 1500, // Set duration to 1.5 seconds (1500ms)
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
        : `${formatFromValue(fromValue!)} ${fromUnit} equals ${formattedResultString} ${result.unit}`;

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
                                        {formattedResultString}{' '}
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

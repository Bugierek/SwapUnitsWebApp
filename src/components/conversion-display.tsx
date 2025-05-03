
import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { ConversionResult, NumberFormat } from '@/types';
import { cn } from '@/lib/utils';

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
        // Use scientific notation always if selected, let JS determine precision
        // Replace 'e' with 'E'
        return num.toExponential().replace('e', 'E');
    }
    // Default 'normal' formatting
    // Use exponential notation for very large or very small non-zero numbers
    // Let JS determine precision for exponential notation here too
    if ((Math.abs(num) > 1e9 || Math.abs(num) < 1e-6) && num !== 0) {
         // Replace 'e' with 'E'
        return num.toExponential().replace('e', 'E');
    }
    // Otherwise, format with commas and appropriate decimal places (up to 6)
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
};


export function ConversionDisplay({ fromValue, fromUnit, result, format = 'normal' }: ConversionDisplayProps) {
    // Determine if we should show the placeholder state
    const showPlaceholder = fromValue === undefined || fromUnit === '' || !result;

    // Prepare the text content for screen readers
    const screenReaderText = showPlaceholder
        ? (fromValue !== undefined && fromUnit ? `Waiting for conversion of ${formatNumber(fromValue, 'normal')} ${fromUnit}` : 'Enter a value and select units to convert')
        : `${formatNumber(fromValue!, 'normal')} ${fromUnit} equals ${formatNumber(result.value, format)} ${result.unit}`;

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
                             ? (fromValue !== undefined && fromUnit ? `${formatNumber(fromValue, 'normal')} ${fromUnit} equals...` : 'Enter a value to convert')
                             : `${formatNumber(fromValue!, 'normal')} ${fromUnit} equals`
                            }
                        </p>
                        <p className={cn(
                            "text-2xl font-bold h-[32px]", // Ensure consistent height
                            showPlaceholder ? "text-muted-foreground" : "text-purple-600 dark:text-purple-400" // Purple color applied here
                        )}>
                           {showPlaceholder ? '-' : (
                                <>
                                    {formatNumber(result.value, format)}{' '}
                                    <span className="text-lg font-medium text-purple-600 dark:text-purple-400">{result.unit}</span>
                                </>
                           )}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}

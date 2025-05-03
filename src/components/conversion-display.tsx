
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

export function ConversionDisplay({ fromValue, fromUnit, result, format = 'normal' }: ConversionDisplayProps) {
    // Determine if we should show the placeholder state
    const showPlaceholder = fromValue === undefined || fromUnit === '' || !result;

    // Format numbers based on the selected format
    const formatNumber = (num: number): string => {
        if (!isFinite(num)) {
            return '-'; // Indicator for invalid numbers
        }
        if (format === 'scientific') {
            // Use scientific notation always if selected
            return num.toExponential(4);
        }
        // Default 'normal' formatting
        // Use exponential notation for very large or very small non-zero numbers
        if ((Math.abs(num) > 1e9 || Math.abs(num) < 1e-6) && num !== 0) {
            return num.toExponential(4);
        }
        // Otherwise, format with commas and appropriate decimal places (up to 6)
        return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
    };


    if (showPlaceholder) {
        // Placeholder state: Render dimmed card
        return (
            <Card className="bg-muted/50 border-muted shadow-sm opacity-60 transition-opacity duration-300">
                <CardContent className="p-4">
                    <div className="text-center sm:text-left">
                        <p className="text-sm text-muted-foreground h-5">
                             {/* Show "Enter value..." if no valid number yet, otherwise show the base part */}
                             {fromValue !== undefined && fromUnit ? `${formatNumber(fromValue)} ${fromUnit} equals...` : 'Enter a value to convert'}
                        </p>
                        <p className="text-2xl font-bold text-muted-foreground h-[32px]">
                           {/* Placeholder symbol */}
                           -
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Valid result state: Render highlighted card
    return (
        <Card className="bg-primary/10 border-primary/50 shadow-sm transition-opacity duration-300">
            <CardContent className="p-4">
                <div className="text-center sm:text-left">
                    <p className="text-sm text-muted-foreground">
                        {/* We know fromValue is defined here because showPlaceholder is false */}
                        {formatNumber(fromValue!)} {fromUnit} equals
                    </p>
                    {/* Apply purple color and ensure font-bold */}
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {/* We know result and result.value are defined here */}
                        {formatNumber(result.value)}{' '}
                        <span className="text-lg font-medium text-purple-600 dark:text-purple-400">{result.unit}</span>
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

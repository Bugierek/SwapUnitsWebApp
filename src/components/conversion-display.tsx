
import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { ConversionResult, NumberFormat, UnitCategory, FavoriteItem } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Copy, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUnitsForCategoryAndMode } from '@/lib/unit-data'; // For favorite name generation

interface ConversionDisplayProps {
    fromValue: number | undefined;
    fromUnit: string;
    toUnit: string; 
    result: ConversionResult | null;
    format: NumberFormat;
    onActualFormatChange: (
        actualFormat: NumberFormat,
        reason: 'magnitude' | 'user_choice' | null
    ) => void;
    category: UnitCategory | ""; 
    onResultCopied?: (data: { 
        category: UnitCategory;
        fromValue: number;
        fromUnit: string;
        toValue: number;
        toUnit: string;
    }) => void;
    onSaveFavorite?: (favoriteData: Omit<FavoriteItem, 'id'>) => void;
    isAddFavoriteDisabled?: boolean; 
}

const formatNumber = (num: number, requestedFormat: NumberFormat = 'normal'): {
    formattedString: string;
    actualFormatUsed: NumberFormat;
    scientificReason: 'magnitude' | 'user_choice' | null;
} => {
    if (!isFinite(num)) {
        return { formattedString: '-', actualFormatUsed: requestedFormat, scientificReason: null };
    }

    let actualFormatUsed: NumberFormat = requestedFormat;
    let formattedString: string;
    let scientificReason: 'magnitude' | 'user_choice' | null = null;

    const useScientificDueToMagnitude = (Math.abs(num) > 1e9 || Math.abs(num) < 1e-7) && num !== 0;

    if (requestedFormat === 'scientific' || useScientificDueToMagnitude) {
        actualFormatUsed = 'scientific';
        scientificReason = useScientificDueToMagnitude ? 'magnitude' : (requestedFormat === 'scientific' ? 'user_choice' : null);
        
        let exponential = num.toExponential(7).replace('e', 'E');
        const match = exponential.match(/^(-?\d(?:\.\d*)?)(0*)(E[+-]\d+)$/);
        if (match) {
            let coefficient = match[1];
            const exponent = match[3];
            if (coefficient.includes('.')) {
                coefficient = coefficient.replace(/0+$/, '');
                coefficient = coefficient.replace(/\.$/, '');
            }
            formattedString = coefficient + exponent;
        } else {
            formattedString = exponential;
        }
    } else {
        actualFormatUsed = 'normal';
        const numRoundedForCheck = parseFloat(num.toFixed(7));
        if (numRoundedForCheck % 1 === 0) {
            formattedString = numRoundedForCheck.toLocaleString(undefined, { maximumFractionDigits: 0 });
        } else {
            let fixedStr = num.toFixed(7);
            fixedStr = fixedStr.replace(/(\.[0-9]*[1-9])0+$|\.0+$/, '$1');
            formattedString = parseFloat(fixedStr).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 7});
        }
    }

    return { formattedString, actualFormatUsed, scientificReason };
};

const formatFromValue = (num: number | undefined): string => {
    if (num === undefined || !isFinite(num)) {
        return '-';
    }
    const useScientificDueToMagnitude = (Math.abs(num) > 1e9 || Math.abs(num) < 1e-7) && num !== 0;

    if (useScientificDueToMagnitude) {
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
        return exponential;
    }
    const numRoundedForCheck = parseFloat(num.toFixed(7));
     if (numRoundedForCheck % 1 === 0) {
        return numRoundedForCheck.toLocaleString(undefined, { maximumFractionDigits: 0 });
    } else {
        let fixedStr = num.toFixed(7);
        fixedStr = fixedStr.replace(/(\.[0-9]*[1-9])0+$|\.0+$/, '$1');
        return parseFloat(fixedStr).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 7});
    }
};

export const ConversionDisplay = React.memo(function ConversionDisplayComponent({ 
    fromValue, 
    fromUnit, 
    toUnit,
    result, 
    format, 
    onActualFormatChange,
    category, 
    onResultCopied,
    onSaveFavorite,
    isAddFavoriteDisabled = false
}: ConversionDisplayProps) {
    const { toast } = useToast();

    const showPlaceholder = fromValue === undefined || fromUnit === '' || !result;

    const { formattedString: formattedResultString, actualFormatUsed, scientificReason } = React.useMemo(() => {
        return showPlaceholder ? { formattedString: '-', actualFormatUsed: format, scientificReason: null } : formatNumber(result.value, format);
    }, [showPlaceholder, result, format]);

    React.useEffect(() => {
        onActualFormatChange(actualFormatUsed, scientificReason);
    }, [actualFormatUsed, scientificReason, onActualFormatChange]);

    const textToCopy = showPlaceholder ? '' : `${formattedResultString} ${result.unit}`;

    const handleCopy = React.useCallback(async () => {
        if (!textToCopy || !navigator.clipboard) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
            toast({
                title: "Copied!",
                description: `Result "${textToCopy}" copied to clipboard.`,
                variant: "confirmation",
                duration: 1500,
            });
            if (onResultCopied && category && category !== "" && fromValue !== undefined && result) {
                onResultCopied({
                    category: category,
                    fromValue: fromValue,
                    fromUnit: fromUnit,
                    toValue: result.value,
                    toUnit: result.unit,
                });
            }
        } catch (err) {
            console.error('Failed to copy text: ', err);
            toast({
                title: "Copy Failed",
                description: "Could not copy result to clipboard.",
                variant: "destructive",
            });
        }
    }, [textToCopy, toast, onResultCopied, category, fromValue, fromUnit, result]);

    const handleSaveToFavoritesInternal = React.useCallback(() => {
        if (!category || category === "" || !fromUnit || !toUnit) {
          toast({
            title: "Cannot Save Favorite",
            description: "Please select a category and both units before saving.",
            variant: "destructive",
            duration: 2000,
          });
          return;
        }
    
        if (onSaveFavorite) {
          const currentCategoryUnits = getUnitsForCategoryAndMode(category);
          const fromUnitDetails = currentCategoryUnits.find(u => u.symbol === fromUnit);
          const toUnitDetails = currentCategoryUnits.find(u => u.symbol === toUnit);

          const fromUnitName = fromUnitDetails?.name || fromUnit;
          const toUnitName = toUnitDetails?.name || toUnit;
          const favoriteName = `${fromUnitName} to ${toUnitName}`;
          
          onSaveFavorite({
            category: category,
            fromUnit: fromUnit,
            toUnit: toUnit,
            name: favoriteName,
          });
          toast({
            title: "Favorite Saved!",
            description: `"${favoriteName}" added to your favorites.`,
            variant: "success", 
            duration: 2000,
          });
        }
      }, [category, fromUnit, toUnit, onSaveFavorite, toast]);


    const screenReaderText = showPlaceholder
        ? (fromValue !== undefined && fromUnit ? `Waiting for conversion of ${formatFromValue(fromValue)} ${fromUnit}` : 'Enter a value and select units to convert')
        : `${formatFromValue(fromValue!)} ${fromUnit} equals ${formattedResultString} ${result.unit}`;
    
    const baseSaveDisabled = !category || category === "" || !fromUnit || !toUnit;
    const finalSaveDisabled = baseSaveDisabled || isAddFavoriteDisabled;

    return (
        <>
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {screenReaderText}
            </div>
            <Card className={cn(
                "relative shadow-sm transition-opacity duration-300", 
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
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                             <p className={cn(
                                "text-2xl font-bold h-[32px] flex items-center",
                                showPlaceholder ? "text-muted-foreground" : "text-purple-600 dark:text-purple-400"
                             )}>
                               {showPlaceholder ? '-' : (
                                    <>
                                        {formattedResultString}{' '}
                                        <span className="text-lg font-medium text-purple-600 dark:text-purple-400 ml-1">{result.unit}</span>
                                    </>
                               )}
                            </p>
                            {!showPlaceholder && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                    onClick={handleCopy}
                                    aria-label="Copy result to clipboard"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
                {onSaveFavorite && !showPlaceholder && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleSaveToFavoritesInternal}
                        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-accent focus:text-accent disabled:text-muted-foreground/50 disabled:hover:text-muted-foreground/50 group"
                        aria-label="Save conversion to favorites"
                        disabled={finalSaveDisabled}
                    >
                        <Star className={cn("h-5 w-5", !finalSaveDisabled ? "text-accent/80 group-hover:fill-current" : "text-muted-foreground/50")} />
                    </Button>
                )}
            </Card>
        </>
    );
});

ConversionDisplay.displayName = 'ConversionDisplay';

    

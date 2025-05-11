
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ConversionHistoryItem } from '@/types';
import { History as HistoryIconLucide, Copy } from 'lucide-react'; // Renamed to avoid conflict, Added Copy icon
import { UnitIcon } from './unit-icon';
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast'; // Added useToast

interface HistoryListProps {
    items: ConversionHistoryItem[];
    onHistorySelect: (item: ConversionHistoryItem) => void;
    onClearHistory?: () => void;
    className?: string;
}

const formatHistoryNumber = (num: number): string => {
  if (!isFinite(num)) return '-';
  const absNum = Math.abs(num);
  // Use scientific notation for very large or very small numbers, 4 decimal places for coefficient
  if (absNum > 1e7 || (absNum < 1e-5 && absNum !== 0)) {
    let exp = num.toExponential(4).replace('e', 'E');
    const match = exp.match(/^(-?\d(?:\.\d*)?)(0*)(E[+-]\d+)$/);
    if (match) {
        let coeff = match[1];
        const exponent = match[3];
        if (coeff.includes('.')) {
            coeff = coeff.replace(/0+$/, ''); // Remove trailing zeros after decimal
            coeff = coeff.replace(/\.$/, '');  // Remove decimal point if no digits follow
        }
        return coeff + exponent;
    }
    return exp; // Fallback
  }
  // For normal numbers, round to 5 decimal places and remove trailing zeros
  const rounded = parseFloat(num.toFixed(5));
  if (rounded % 1 === 0) { // If it's an integer after rounding
    return rounded.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  // Format with minimum 0 and maximum 5 decimal places
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 5 });
};

export const HistoryList = React.memo(function HistoryListComponent({ items, onHistorySelect, onClearHistory, className }: HistoryListProps) {
    const { toast } = useToast(); // Initialize toast

    const handleCopyHistoryItem = React.useCallback(async (item: ConversionHistoryItem) => {
        const textToCopy = `${formatHistoryNumber(item.fromValue)} ${item.fromUnit} → ${formatHistoryNumber(item.toValue)} ${item.toUnit}`;
        if (!textToCopy || !navigator.clipboard) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
            toast({
                title: "Copied!",
                description: `Conversion "${textToCopy}" copied to clipboard.`,
                variant: "confirmation",
                duration: 1500,
            });
        } catch (err) {
            console.error('Failed to copy history item: ', err);
            toast({
                title: "Copy Failed",
                description: "Could not copy conversion to clipboard.",
                variant: "destructive",
            });
        }
    }, [toast]);

    return (
        <Card className={cn("shadow-lg flex flex-col", className)} aria-label="Conversion History">
            <CardHeader className="flex-shrink-0">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
                        <HistoryIconLucide className="h-5 w-5" aria-hidden="true" />
                        History
                    </CardTitle>
                    {onClearHistory && items.length > 0 && (
                        <Button variant="outline" size="sm" onClick={onClearHistory} aria-label="Clear history">
                            Clear
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-2 flex-grow overflow-hidden">
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground h-full flex items-center justify-center">
                        Copied results will appear here.
                    </p>
                ) : (
                    <ScrollArea className="h-full">
                        <ul className="space-y-1 pr-3"> {/* Adjusted space-y */}
                            {items.map((item) => (
                                <li key={item.id} className="flex items-center justify-between gap-1 group/history-item">
                                  <Button
                                      variant="ghost"
                                      className="flex-grow justify-start text-left h-auto py-2 px-3 hover:bg-primary hover:text-primary-foreground overflow-hidden whitespace-normal flex items-start gap-2 text-sm"
                                      onClick={() => onHistorySelect(item)}
                                      aria-label={`Apply conversion: ${formatHistoryNumber(item.fromValue)} ${item.fromUnit} to ${formatHistoryNumber(item.toValue)} ${item.toUnit}`}
                                  >
                                      <UnitIcon category={item.category} className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                                      <div className="flex-1 min-w-0"> {/*  Ensure text wrapping */}
                                          <p className="font-medium break-words">
                                              {formatHistoryNumber(item.fromValue)} {item.fromUnit} → {formatHistoryNumber(item.toValue)} {item.toUnit}
                                          </p>
                                          <p className="text-xs text-muted-foreground break-words">
                                              {item.category} - {format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')}
                                          </p>
                                      </div>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover/history-item:opacity-100 focus:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent onHistorySelect from firing
                                        handleCopyHistoryItem(item);
                                    }}
                                    aria-label="Copy this history item to clipboard"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
});

HistoryList.displayName = 'HistoryList';

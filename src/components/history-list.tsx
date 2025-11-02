
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ConversionHistoryItem } from '@/types';
import { History as HistoryIconLucide, Copy } from 'lucide-react';
import { UnitIcon } from './unit-icon';
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast'; 
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress'; // Import Progress component
import { copyTextToClipboard } from '@/lib/copy-to-clipboard';

interface HistoryListProps {
    items: ConversionHistoryItem[];
    onHistorySelect: (item: ConversionHistoryItem) => void;
    onClearHistory?: () => void;
    className?: string;
    isLoading?: boolean; // Added isLoading prop
}

const formatHistoryNumber = (num: number): string => {
  if (!isFinite(num)) return '-';
  const absNum = Math.abs(num);
  if (absNum > 1e7 || (absNum < 1e-5 && absNum !== 0)) {
    let exp = num.toExponential(4).replace('e', 'E');
    const match = exp.match(/^(-?\d(?:\.\d*)?)(0*)(E[+-]\d+)$/);
    if (match) {
        let coeff = match[1];
        const exponent = match[3];
        if (coeff.includes('.')) {
            coeff = coeff.replace(/0+$/, ''); 
            coeff = coeff.replace(/\.$/, '');  
        }
        return coeff + exponent;
    }
    return exp; 
  }
  const rounded = parseFloat(num.toFixed(5));
  if (rounded % 1 === 0) { 
    return rounded.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 5 });
};

export const HistoryList = React.memo(function HistoryListComponent({ items, onHistorySelect, onClearHistory, className, isLoading }: HistoryListProps) {
    const { toast } = useToast(); 
    const [isClearDialogOpen, setIsClearDialogOpen] = React.useState(false);

    const handleCopyHistoryItem = React.useCallback(async (item: ConversionHistoryItem) => {
        const textToCopy = `${formatHistoryNumber(item.fromValue)} ${item.fromUnit} → ${formatHistoryNumber(item.toValue)} ${item.toUnit}`;
        if (!textToCopy) return;

        const copied = await copyTextToClipboard(textToCopy);
        if (copied) {
            toast({
                title: "Copied!",
                description: `Conversion "${textToCopy}" copied to clipboard.`,
                variant: "confirmation",
                duration: 1500,
            });
        } else {
            toast({
                title: "Copy Failed",
                description: "Clipboard access is blocked. Please copy the text manually.",
                variant: "destructive",
            });
        }
    }, [toast]);

    return (
        <Card className={cn("flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-md backdrop-blur-sm", className)} aria-label="Conversion History">
            <CardHeader className="flex-shrink-0 border-b border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <HistoryIconLucide className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        Recent conversions
                    </CardTitle>
                    {onClearHistory && items.length > 0 && !isLoading && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsClearDialogOpen(true)}
                                aria-label="Clear history"
                                className="h-7 rounded-full border-border/60 bg-white px-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                            >
                                Clear
                            </Button>

                            <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                                <DialogContent className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl">
                                    <DialogHeader>
                                        <DialogTitle>Clear conversion history?</DialogTitle>
                                        <DialogDescription>
                                            This will permanently remove all saved conversions from your local history. This cannot be undone.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                        <Button variant="outline" size="sm" onClick={() => setIsClearDialogOpen(false)} className="rounded-lg border-border/60 bg-white">Cancel</Button>
                                        <Button variant="destructive" size="sm" onClick={() => { setIsClearDialogOpen(false); onClearHistory?.(); }} className="rounded-lg">Yes, clear</Button>
                                    </DialogFooter>
                                    <DialogClose />
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow px-4 py-4">
                {isLoading ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-5 text-center">
                        <p className="text-sm font-medium text-muted-foreground">Loading your recent conversions…</p>
                        <Progress value={50} className="h-1.5 w-full rounded-full bg-secondary" aria-label="Loading progress" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-white px-4 py-8 text-center">
                        <p className="text-sm font-semibold text-foreground">Nothing here yet</p>
                        <p className="text-xs text-muted-foreground">Copy a result to add it to your history.</p>
                    </div>
                ) : (
                    <ScrollArea className="h-full pr-1">
                        <div className="space-y-1.5">
                            <ul className="space-y-1.5">
                                {items.map((item) => (
                                    <li key={item.id} className="group/history-item w-full">
                                      <div className="flex items-center gap-1.5">
                                        <Button
                                            variant="ghost"
                                            className="flex w-full flex-1 items-center gap-2 rounded-lg border border-transparent bg-white px-2.5 py-1.5 text-left text-[0.78rem] font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                                            onClick={() => onHistorySelect(item)}
                                            aria-label={`Apply conversion: ${formatHistoryNumber(item.fromValue)} ${item.fromUnit} to ${formatHistoryNumber(item.toValue)} ${item.toUnit}`}
                                        >
                                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <UnitIcon category={item.category} className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                            </span>
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                <p className="truncate text-[0.78rem] font-semibold leading-tight">
                                                    {formatHistoryNumber(item.fromValue)} {item.fromUnit} → {formatHistoryNumber(item.toValue)} {item.toUnit}
                                                </p>
                                                <p className="truncate text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                    {item.category} · {format(new Date(item.timestamp), 'MMM d, yyyy p')}
                                                </p>
                                            </div>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0 rounded-full border border-border/40 bg-white text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                                            onClick={(e) => {
                                                e.stopPropagation(); 
                                                handleCopyHistoryItem(item);
                                            }}
                                            aria-label="Copy this history item to clipboard"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
});

HistoryList.displayName = 'HistoryList';

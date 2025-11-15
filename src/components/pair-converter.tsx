"use client";

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeftRight, Copy, Check } from 'lucide-react';

import type { UnitCategory, ConversionHistoryItem } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { convertNumericValue } from '@/lib/conversion-math';
import { getConversionSources } from '@/lib/conversion-sources';
import { useToast } from '@/hooks/use-toast';

interface PairConverterProps {
  category: UnitCategory;
  fromUnit: { symbol: string; name: string };
  toUnit: { symbol: string; name: string };
  initialValue?: number;
  baseMultiplier?: number | null;
  onCopyResult?: (payload: {
    category: UnitCategory;
    fromValue: number;
    fromUnit: string;
    toValue: number;
    toUnit: string;
  }) => void;
}

export interface PairConverterHandle {
  applyHistorySelect: (item: ConversionHistoryItem) => boolean;
}

const formatResult = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) return '—';
  if (!Number.isFinite(value)) return '∞';
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 0.0001 || abs > 1_000_000)) {
    return value.toExponential(6).replace('e', '×10^');
  }
  return Intl.NumberFormat('en-US', {
    maximumFractionDigits: abs < 1 ? 8 : 6,
  }).format(value);
};

export const PairConverter = React.forwardRef<PairConverterHandle, PairConverterProps>(function PairConverter(
  {
    category,
    fromUnit,
    toUnit,
    initialValue = 1,
    baseMultiplier = null,
    onCopyResult,
  }: PairConverterProps,
  ref,
) {
  const [isSwapped, setIsSwapped] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>(String(initialValue));
  const [copyState, setCopyState] = React.useState<'idle' | 'success'>('idle');

  const activeFrom = isSwapped ? toUnit : fromUnit;
  const activeTo = isSwapped ? fromUnit : toUnit;
  const conversionSources = React.useMemo(
    () => getConversionSources(category, activeFrom.symbol, activeTo.symbol),
    [category, activeFrom.symbol, activeTo.symbol],
  );

  const parsedInput = React.useMemo(() => {
    const trimmed = inputValue.trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '.') return null;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }, [inputValue]);

  const result = React.useMemo(() => {
    if (parsedInput === null) return null;
    return convertNumericValue(
      category,
      activeFrom.symbol,
      activeTo.symbol,
      parsedInput,
    );
  }, [category, activeFrom.symbol, activeTo.symbol, parsedInput]);

  const multiplier = React.useMemo(() => {
    if (baseMultiplier === null || !Number.isFinite(baseMultiplier)) {
      return null;
    }
    if (isSwapped) {
      if (baseMultiplier === 0) return null;
      return 1 / baseMultiplier;
    }
    return baseMultiplier;
  }, [baseMultiplier, isSwapped]);



  const { toast } = useToast();

  const handleCopy = React.useCallback(async () => {
    if (parsedInput === null || result === null) return;
    const formatted = formatResult(result);
    try {
      await navigator.clipboard.writeText(`${formatted} ${activeTo.symbol}`);
      setCopyState('success');
      onCopyResult?.({
        category,
        fromValue: parsedInput,
        fromUnit: activeFrom.symbol,
        toValue: result,
        toUnit: activeTo.symbol,
      });
    } catch (error) {
      console.error('Failed to copy conversion result:', error);
      toast({
        variant: "destructive",
        description: "Failed to copy to clipboard",
        duration: 2000, // Show for 2 seconds
      });
    }
  }, [parsedInput, result, activeTo.symbol, activeFrom.symbol, category, onCopyResult, toast]);

  React.useEffect(() => {
    setCopyState('idle');
  }, [parsedInput, activeFrom.symbol, activeTo.symbol]);

  React.useEffect(() => {
    if (copyState !== 'success') {
      return;
    }
    const timeout = window.setTimeout(() => setCopyState('idle'), 1500);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const applyHistorySelect = React.useCallback((item: ConversionHistoryItem): boolean => {
    const matchesForward = item.fromUnit === fromUnit.symbol && item.toUnit === toUnit.symbol;
    const matchesReverse = item.fromUnit === toUnit.symbol && item.toUnit === fromUnit.symbol;
    if (!matchesForward && !matchesReverse) {
      return false;
    }

    setIsSwapped(matchesReverse);
    setInputValue(String(item.fromValue));
    return true;
  }, [fromUnit.symbol, toUnit.symbol]);

  React.useImperativeHandle(ref, () => ({
    applyHistorySelect,
  }), [applyHistorySelect]);

  const generalFormula = React.useMemo(() => {
    // Temperature conversions
    if (category === 'Temperature') {
      if (activeFrom.symbol === '°C' && activeTo.symbol === '°F') {
        return '°F = °C × 9/5 + 32';
      } else if (activeFrom.symbol === '°F' && activeTo.symbol === '°C') {
        return '°C = (°F - 32) × 5/9';
      } else if (activeFrom.symbol === '°C' && activeTo.symbol === 'K') {
        return 'K = °C + 273.15';
      } else if (activeFrom.symbol === 'K' && activeTo.symbol === '°C') {
        return '°C = K - 273.15';
      } else if (activeFrom.symbol === '°F' && activeTo.symbol === 'K') {
        return 'K = (°F - 32) × 5/9 + 273.15';
      } else if (activeFrom.symbol === 'K' && activeTo.symbol === '°F') {
        return '°F = (K - 273.15) × 9/5 + 32';
      }
    }

    // Data Storage (uses 1024 instead of 1000)
    if (category === 'Data Storage') {
      if (multiplier && (
        activeFrom.symbol === 'B' || activeFrom.symbol === 'KB' || 
        activeFrom.symbol === 'MB' || activeFrom.symbol === 'GB' || 
        activeFrom.symbol === 'TB'
      )) {
        const power = Math.log(multiplier) / Math.log(1024);
        if (Number.isInteger(power)) {
          return `${activeTo.symbol} = ${activeFrom.symbol} × 1024${power > 1 ? '^' + power : ''}`;
        }
      }
    }

    // Data Transfer Rate (handle bit/byte conversions)
    if (category === 'Data Transfer Rate' && multiplier !== null) {
      if (
        (activeFrom.symbol.includes('bps') && activeTo.symbol.includes('/s')) ||
        (activeFrom.symbol.includes('/s') && activeTo.symbol.includes('bps'))
      ) {
        const base = multiplier / 8;
        if (base === 1) {
          return `${activeTo.symbol} = ${activeFrom.symbol} × 8`;
        } else if (base < 1) {
          return `${activeTo.symbol} = ${activeFrom.symbol} ÷ ${formatResult(1/base)}`;
        } else {
          return `${activeTo.symbol} = ${activeFrom.symbol} × ${formatResult(multiplier)}`;
        }
      }
    }

    // Fuel Economy (handle inverse relationships)
    if (category === 'Fuel Economy' && multiplier !== null) {
      if (
        (activeFrom.symbol.includes('/100') && !activeTo.symbol.includes('/100')) ||
        (!activeFrom.symbol.includes('/100') && activeTo.symbol.includes('/100'))
      ) {
        // For conversions between direct and inverse units
        return `${activeTo.symbol} = 100 ÷ (${activeFrom.symbol} × ${formatResult(multiplier)})`;
      }
    }

    // For regular unit conversions, show the exact formula
    if (multiplier !== null) {
      if (multiplier === 1) {
        return `${activeTo.symbol} = ${activeFrom.symbol}`;
      } else if (multiplier < 1) {
        return `${activeTo.symbol} = ${activeFrom.symbol} ÷ ${formatResult(1/multiplier)}`;
      }
      return `${activeTo.symbol} = ${activeFrom.symbol} × ${formatResult(multiplier)}`;
    }
    
    return null;
  }, [category, activeTo.symbol, activeFrom.symbol, multiplier]);

  const dynamicFormula = React.useMemo(() => {
    if (parsedInput === null || result === null) {
      return null;
    }
    
    // For simple multiplier-based conversions, show the actual calculation
    if (multiplier !== null) {
      return `${formatResult(parsedInput)} ${activeFrom.symbol} × ${formatResult(multiplier)} = ${formatResult(result)} ${activeTo.symbol}`;
    }
    
    // For complex conversions (like temperature), show the actual values
    return `${formatResult(parsedInput)} ${activeFrom.symbol} = ${formatResult(result)} ${activeTo.symbol}`;
  }, [parsedInput, result, activeFrom.symbol, activeTo.symbol, multiplier]);

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-lg">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Convert</p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">
            {activeFrom.symbol} → {activeTo.symbol}
          </h2>
        </div>
      </div>

  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="order-1 grid gap-2">
          <div className="flex items-center justify-start gap-2">
            <span className="text-sm font-semibold text-muted-foreground">
              {activeFrom.name}
            </span>
          </div>
          {/* Input with inline unit at the end */}
          <div className="flex h-12 items-center rounded-xl border border-border/60 bg-background">
            <Input
              id="pair-converter-value"
              name="pair-converter-value"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={`Enter ${activeFrom.symbol}`}
              className="h-full bg-transparent border-0 px-3 text-lg font-semibold text-foreground flex-1"
            />
            <div className="flex items-center justify-center px-3 text-sm font-semibold text-muted-foreground border-l border-border/60">
              {activeFrom.symbol}
            </div>
          </div>
        </div>

  <div className="order-2 flex lg:self-end items-center justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSwapped((prev) => !prev)}
            className="flex h-12 w-12 items-center justify-center rounded-full border-border/60 text-foreground transition hover:border-primary/60 hover:text-primary"
            aria-label="Swap conversion direction"
          >
            <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="order-3 grid gap-2">
          <div className="flex items-center justify-start gap-2">
            <span className="text-sm font-semibold text-muted-foreground">
              {activeTo.name}
            </span>
          </div>
          {/* Result field with inline unit at the end */}
          <div className="flex h-12 items-center gap-2">
            <div className="flex h-full flex-1 items-center rounded-xl border border-border/60 bg-background">
              <div className="flex-1 px-3 text-lg font-semibold text-foreground">
                {parsedInput === null ? '—' : formatResult(result)}
              </div>
              <div className="flex items-center justify-center px-3 text-sm font-semibold text-muted-foreground border-l border-border/60">
                {activeTo.symbol}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl border-border/60"
              onClick={handleCopy}
              disabled={parsedInput === null}
              aria-label="Copy converted result"
            >
              {copyState === 'success' ? (
                <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {(dynamicFormula || generalFormula) && (
        <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-xs text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">Formula</p>
          {generalFormula && <p className="mt-2">{generalFormula}</p>}
          {dynamicFormula && <p className="mt-1 text-muted-foreground">{dynamicFormula}</p>}
        </div>
      )}

      {conversionSources.length > 0 && (
        <details className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-xs text-muted-foreground">
          <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold text-foreground">
            Conversion sources
            <span className="text-xs font-normal text-muted-foreground">
              Tap or click to view references
            </span>
          </summary>
          <ul className="mt-3 space-y-3">
            {conversionSources.map((source) => (
              <li key={source.id} className="leading-relaxed">
                <p className="text-sm font-semibold text-foreground">{source.title}</p>
                <p className="mt-1">
                  <span className="font-medium text-foreground">{source.organization}</span>.{' '}
                  {source.summary}{' '}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    View source
                  </a>
                  {source.id === 'nist-guide-si' && (
                    <>
                      {' '}
                      ·{' '}
                      <Link
                        href="/standards/nist-si-tenfold"
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        View SI table
                      </Link>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-muted-foreground">
        Results update as you type. Swap the direction to convert back from {activeTo.symbol} to{' '}
        {activeFrom.symbol}.
      </p>
    </div>
  );
});

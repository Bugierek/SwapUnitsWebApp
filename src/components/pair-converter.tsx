"use client";

import * as React from 'react';
import Link from 'next/link';
import { Copy, Check, Info, Calculator } from 'lucide-react';

import type { UnitCategory, ConversionHistoryItem } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { convertNumericValue } from '@/lib/conversion-math';
import { type CurrencyCode, type FxRatesResponse } from '@/lib/fx';
import { getUnitsForCategory } from '@/lib/unit-data';
import { getConversionSources } from '@/lib/conversion-sources';
import { useToast } from '@/hooks/use-toast';
import SimpleCalculator from '@/components/simple-calculator';
import {
  formatConversionValue,
  getDecimalPrecisionFromInput,
  precisionBoostFromDecimalPlaces,
  type FormatConversionValueOptions,
  type FormattedConversionValue,
  type PrecisionMode,
} from '@/lib/number-format';
import { cn } from '@/lib/utils';
import { useIsCoarsePointer } from '@/hooks/use-pointer-capabilities';

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
  const [precisionMode, setPrecisionMode] = React.useState<PrecisionMode>('rounded');
  const [fxRates, setFxRates] = React.useState<FxRatesResponse | null>(null);
  const [fxError, setFxError] = React.useState<string | null>(null);
  const [isFetchingFx, setIsFetchingFx] = React.useState(false);
  const isFullPrecision = precisionMode === 'full';
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const [fromFieldFocused, setFromFieldFocused] = React.useState(false);
  const [fromCalcHover, setFromCalcHover] = React.useState(false);
  const [fromCalcButtonFocused, setFromCalcButtonFocused] = React.useState(false);
  const isTouch = useIsCoarsePointer();

  const activeFrom = isSwapped ? toUnit : fromUnit;
  const activeTo = isSwapped ? fromUnit : toUnit;
  const conversionSources = React.useMemo(
    () => getConversionSources(category, activeFrom.symbol, activeTo.symbol),
    [category, activeFrom.symbol, activeTo.symbol],
  );
  const precisionBoost = React.useMemo(() => {
    const decimalPlaces = getDecimalPrecisionFromInput(inputValue);
    return precisionBoostFromDecimalPlaces(decimalPlaces);
  }, [inputValue]);

  const formatValue = React.useCallback(
    (value: number | null, extraOptions?: FormatConversionValueOptions): FormattedConversionValue =>
      formatConversionValue(value, { precisionBoost, precisionMode, ...extraOptions }),
    [precisionBoost, precisionMode],
  );

  const parsedInput = React.useMemo(() => {
    const trimmed = inputValue.trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '.') return null;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }, [inputValue]);

  const result = React.useMemo(() => {
    if (parsedInput === null) return null;
    const fxContext =
      category === 'Currency' && fxRates
        ? { base: fxRates.base as CurrencyCode, rates: fxRates.rates }
        : undefined;
    return convertNumericValue(
      category,
      activeFrom.symbol,
      activeTo.symbol,
      parsedInput,
      fxContext,
    );
  }, [category, activeFrom.symbol, activeTo.symbol, parsedInput, fxRates]);

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


  const handlePrecisionToggle = React.useCallback(() => {
    setPrecisionMode((prev) => (prev === 'rounded' ? 'full' : 'rounded'));
  }, []);

  const formattedResult = React.useMemo(() => formatValue(result), [formatValue, result]);
  const precisionToggleDisabled = formattedResult?.usedScientificNotation ?? false;
  const precisionTooltip = isFullPrecision
    ? 'Full precision shows more decimal places using the exact unit factors from our standards-backed database (NIST Guide to SI, ASTM, IEC, etc.).'
    : 'Rounded results show up to four digits after the decimal for readability. Switch to full precision to inspect the raw calculation.';

  const { toast } = useToast();

  const handleCopy = React.useCallback(async () => {
    if (parsedInput === null || result === null || !formattedResult) return;
    const formatted = formattedResult.formatted;
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
  }, [parsedInput, result, formattedResult, activeTo.symbol, activeFrom.symbol, category, onCopyResult, toast]);

  const fetchPairFxRates = React.useCallback(() => {
    if (isFetchingFx || fxRates) return;
    setIsFetchingFx(true);
    setFxError(null);
    const currencyUnits = getUnitsForCategory('Currency').map((unit) => unit.symbol);
    const symbols = currencyUnits.filter((code) => code !== 'EUR').join(',');
    fetch(`/api/fx?base=EUR${symbols ? `&symbols=${symbols}` : ''}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
        const data = (await res.json()) as FxRatesResponse;
        setFxRates(data);
      })
      .catch((error) => {
        console.error('FX fetch error (pair page):', error);
        setFxError('Live FX rates unavailable');
      })
      .finally(() => setIsFetchingFx(false));
  }, [fxRates, isFetchingFx]);

  // Fetch FX when on currency pages
  React.useEffect(() => {
    if (category !== 'Currency') return;
    fetchPairFxRates();
  }, [category, fetchPairFxRates]);

  // Prefetch once on mount for currency pages
  React.useEffect(() => {
    if (category !== 'Currency') return;
    fetchPairFxRates();
  }, [category, fetchPairFxRates]);

  // Ensure currency formula/result renders once rates arrive without needing a swap.
  React.useEffect(() => {
    if (category !== 'Currency') return;
    if (!fxRates) return;
    if (parsedInput === null) return;
    // trigger formula refresh when rates arrive
    setInputValue((prev) => prev); // no-op to ensure downstream memo runs with latest fxRates
  }, [category, fxRates, parsedInput]);

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

  const handleCalculatorValueSent = React.useCallback((valueFromCalculator: string) => {
    const numericValue = parseFloat(valueFromCalculator);
    if (!Number.isNaN(numericValue)) {
      setInputValue(String(numericValue));
      setCopyState('idle');
    }
    setIsCalculatorOpen(false);
  }, []);

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

  const resolveCurrencyPairRate = React.useCallback((): number | null => {
    if (category !== 'Currency') return null;
    if (!fxRates) return null;

    const base = fxRates.base as CurrencyCode;
    const getRate = (symbol: string): number | null => {
      if (symbol === base) return 1;
      const rate = fxRates.rates[symbol as CurrencyCode];
      return typeof rate === 'number' ? rate : null;
    };

    const from = activeFrom.symbol;
    const to = activeTo.symbol;
    if (from === to) return 1;

    const fromRate = getRate(from);
    const toRate = getRate(to);
    if (!fromRate || !toRate) return null;
    if (from === base) return toRate;
    if (to === base) return 1 / fromRate;
    return toRate / fromRate;
  }, [category, fxRates, activeFrom.symbol, activeTo.symbol]);

  const generalFormula = React.useMemo(() => {
    if (category === 'Currency') {
      const derivedRate =
        resolveCurrencyPairRate() ??
        (parsedInput !== null && parsedInput !== 0 && result !== null ? result / parsedInput : null);

      if (!fxRates && derivedRate === null) {
        return fxError ? 'Live FX rates unavailable' : 'Loading live FX rate…';
      }
      if (derivedRate === null) return fxError ? 'Live FX rates unavailable' : 'Awaiting live FX rate…';

      const dateNote = fxRates?.date ? ` (ECB/Frankfurter ${fxRates.date})` : '';
      const formattedRate = formatValue(derivedRate, { precisionBoost: 0 }).formatted;
      return `${activeTo.symbol} = ${activeFrom.symbol} × ${formattedRate}${dateNote}`;
    }

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
        return `${activeTo.symbol} = ${activeFrom.symbol} ÷ ${formatValue(1 / base, { precisionBoost: 0 }).formatted}`;
      } else {
          return `${activeTo.symbol} = ${activeFrom.symbol} × ${formatValue(multiplier, { precisionBoost: 0 }).formatted}`;
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
        return `${activeTo.symbol} = 100 ÷ (${activeFrom.symbol} × ${formatValue(multiplier, { precisionBoost: 0 }).formatted})`;
      }
    }

    // For regular unit conversions, show the exact formula
    if (multiplier !== null) {
      if (multiplier === 1) {
        return `${activeTo.symbol} = ${activeFrom.symbol}`;
      } else if (multiplier < 1) {
        return `${activeTo.symbol} = ${activeFrom.symbol} ÷ ${formatValue(1 / multiplier, { precisionBoost: 0 }).formatted}`;
      }
      return `${activeTo.symbol} = ${activeFrom.symbol} × ${formatValue(multiplier, { precisionBoost: 0 }).formatted}`;
    }
    
    return null;
  }, [
    category,
    activeTo.symbol,
    activeFrom.symbol,
    multiplier,
    formatValue,
    fxRates,
    fxError,
    resolveCurrencyPairRate,
    parsedInput,
    result,
  ]);

  const dynamicFormula = React.useMemo(() => {
    if (parsedInput === null || result === null) {
      return null;
    }
    
    // Currency: show rate application only (no literal result text)
    if (category === 'Currency') {
      return null; // avoid duplicating the general formula
    }
    
    // For simple multiplier-based conversions, show the actual calculation
    if (multiplier !== null) {
      const multiplierFormatted = formatValue(multiplier, { precisionBoost: 0 }).formatted;
      const inputFormatted = formatValue(parsedInput).formatted;
      return `${inputFormatted} ${activeFrom.symbol} × ${multiplierFormatted} = ${formattedResult?.formatted ?? '—'} ${activeTo.symbol}`;
    }
    
    // For complex conversions (like temperature), show the actual values
    const inputFormatted = formatValue(parsedInput).formatted;
    return `${inputFormatted} ${activeFrom.symbol} = ${formattedResult?.formatted ?? '—'} ${activeTo.symbol}`;
  }, [parsedInput, formattedResult, activeFrom.symbol, activeTo.symbol, multiplier, formatValue, result, category]);

  const showCalculatorButton = fromFieldFocused || fromCalcHover || fromCalcButtonFocused;

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
              onChange={(event) => {
                const raw = event.target.value;
                if (
                  raw === '' ||
                  raw === '-' ||
                  /^-?\d*\.?\d*([eE][-+]?\d*)?$/.test(raw)
                ) {
                  setInputValue(raw);
                  return;
                }
              }}
              placeholder={`Enter ${activeFrom.symbol}`}
              inputMode="decimal"
              enterKeyHint="done"
              onFocus={() => setFromFieldFocused(true)}
              onBlur={() => setFromFieldFocused(false)}
              onKeyDown={(event) => {
                if (isTouch && event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              className="h-full flex-1 border-0 bg-transparent px-3 text-lg font-semibold text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {showCalculatorButton && (
              <button
                type="button"
                onClick={() => setIsCalculatorOpen(true)}
                onMouseEnter={() => setFromCalcHover(true)}
                onMouseLeave={() => setFromCalcHover(false)}
                onFocus={() => setFromCalcButtonFocused(true)}
                onBlur={() => setFromCalcButtonFocused(false)}
                onMouseDown={(event) => event.preventDefault()}
                className="flex h-full items-center gap-2 border-l border-border/60 px-3 text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="Open calculator"
              >
                <Calculator className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <div className="flex items-center justify-center px-3 text-sm font-semibold text-muted-foreground border-l border-border/60">
              {activeFrom.symbol}
            </div>
          </div>
        </div>

        <div className="order-2 flex items-center justify-center lg:self-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsSwapped((prev) => !prev)}
            className="h-11 w-full rounded-xl border border-border/60 p-0 text-primary transition hover:border-primary/60 hover:bg-primary/5 disabled:border-border/40 sm:w-14"
            aria-label="Swap conversion direction"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={cn('transition-transform text-primary', isSwapped && 'rotate-180 scale-x-[-1]')}
              aria-hidden="true"
            >
              <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </g>
            </svg>
          </Button>
        </div>

        <div className="order-3 grid gap-2">
          <div className="flex items-center justify-start gap-2">
            <span className="text-sm font-semibold text-muted-foreground">
              {activeTo.name}
            </span>
          </div>
          {/* Result field with inline copy and unit */}
          <div className="flex h-12 items-center rounded-xl border border-border/60 bg-background">
            <div className="flex-1 px-3 text-lg font-semibold text-foreground">
              {parsedInput === null ? '—' : formattedResult?.formatted ?? '—'}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={parsedInput === null}
              className="flex h-full items-center border-l border-border/60 px-3 text-primary transition hover:bg-primary/10 disabled:text-muted-foreground disabled:hover:bg-transparent"
              aria-label="Copy converted result"
            >
              {copyState === 'success' ? (
                <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <div className="flex items-center justify-center border-l border-border/60 px-3 text-sm font-semibold text-muted-foreground">
              {activeTo.symbol}
            </div>
          </div>
        </div>
      </div>

      {parsedInput !== null && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                    aria-label="How precision is calculated"
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  sideOffset={6}
                  className="max-w-xs text-xs text-muted-foreground"
                >
                  {precisionTooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span>{isFullPrecision ? 'Full precision result' : 'Rounded result (4 decimals max)'}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={handlePrecisionToggle}
            disabled={precisionToggleDisabled}
          >
            {isFullPrecision ? 'Show rounded' : 'Show full precision'}
          </Button>
        </div>
      )}

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

      {isCalculatorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setIsCalculatorOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-border/60 bg-card p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <SimpleCalculator onSendValue={handleCalculatorValueSent} onClose={() => setIsCalculatorOpen(false)} />
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setIsCalculatorOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

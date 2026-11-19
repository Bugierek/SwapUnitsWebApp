"use client";

import * as React from 'react';
import Link from 'next/link';
import { Copy, Check, Info, Calculator } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

import type { UnitCategory, ConversionHistoryItem, ConversionHistoryMeta } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { convertNumericValue } from '@/lib/conversion-math';
import { type CurrencyCode, type FxRatesResponse } from '@/lib/fx';
import { getUnitsForCategory } from '@/lib/unit-data';
import { getConversionSources } from '@/lib/conversion-sources';
import { buildConversionPairUrl } from '@/lib/conversion-pairs';
import {
  buildConversionFormula,
  formatFxDateLabel,
  formatSignificant,
  getConversionRelation,
} from '@/lib/conversion-formula';
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
import { FxHistoryChart } from '@/components/fx-history-chart';
import { useIsCoarsePointer } from '@/hooks/use-pointer-capabilities';

interface PairConverterProps {
  category: UnitCategory;
  fromUnit: { symbol: string; name: string };
  toUnit: { symbol: string; name: string };
  initialValue?: number;
  initialFxDate?: Date | null;
  initialFxMode?: 'latest' | 'historical';
  /**
   * Latest FX rates already fetched on the server. Used as the initial rates (so the server HTML
   * shows the converted value) unless the page opens in historical mode.
   */
  initialFxRates?: FxRatesResponse | null;
  onCopyResult?: (payload: {
    category: UnitCategory;
    fromValue: number;
    fromUnit: string;
    toValue: number;
    toUnit: string;
    meta?: ConversionHistoryMeta;
  }) => void;
}

export interface PairConverterHandle {
  applyHistorySelect: (item: ConversionHistoryItem) => boolean;
  setValueForUnit: (unitSymbol: string, value: number) => void;
}

export const PairConverter = React.forwardRef<PairConverterHandle, PairConverterProps>(function PairConverter(
  {
    category,
    fromUnit,
    toUnit,
    initialValue = 1,
    initialFxDate = null,
    initialFxMode = 'latest',
    initialFxRates = null,
    onCopyResult,
  }: PairConverterProps,
  ref,
) {
  const [isSwapped, setIsSwapped] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>(String(initialValue));
  const [copyState, setCopyState] = React.useState<'idle' | 'success'>('idle');
  const [precisionMode, setPrecisionMode] = React.useState<PrecisionMode>('rounded');
  const todayKey = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  const initialHistorical = React.useMemo(() => {
    if (initialFxMode === 'historical' && initialFxDate) {
      return initialFxDate.toISOString().split('T')[0] !== todayKey;
    }
    return false;
  }, [initialFxDate, initialFxMode, todayKey]);
  // Server-provided latest rates are only valid as a starting point outside historical mode.
  const hasUsableInitialFxRates = category === 'Currency' && !initialHistorical && Boolean(initialFxRates);
  const [fxRates, setFxRates] = React.useState<FxRatesResponse | null>(
    hasUsableInitialFxRates ? initialFxRates : null,
  );
  const [fxError, setFxError] = React.useState<string | null>(null);
  const [isFetchingFx, setIsFetchingFx] = React.useState(false);
  const fxLastRequestedKeyRef = React.useRef<string | null>(null);
  const [selectedFxDate, setSelectedFxDate] = React.useState<Date | undefined>(
    initialHistorical && initialFxDate ? initialFxDate : undefined,
  );
  const [isHistoricalMode, setIsHistoricalMode] = React.useState(initialHistorical);
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
      formatConversionValue(value, { 
        precisionBoost, 
        precisionMode, 
        // Force normal (non-scientific) formatting for currency
        forceScientific: category === 'Currency' ? false : extraOptions?.forceScientific,
        ...extraOptions 
      }),
    [precisionBoost, precisionMode, category],
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

  // proportional / temperature / reciprocal / currency, shared with the page's title and table hint.
  const relation = React.useMemo(
    () =>
      getConversionRelation(
        category,
        activeFrom.symbol,
        activeTo.symbol,
        category === 'Currency' && fxRates
          ? { base: fxRates.base as CurrencyCode, rates: fxRates.rates }
          : null,
      ),
    [category, activeFrom.symbol, activeTo.symbol, fxRates],
  );

  const handlePrecisionToggle = React.useCallback(() => {
    setPrecisionMode((prev) => (prev === 'rounded' ? 'full' : 'rounded'));
  }, []);

  const formattedResult = React.useMemo(() => formatValue(result), [formatValue, result]);
  const [rateCopyState, setRateCopyState] = React.useState<'idle' | 'success'>('idle');
  const rateCopyResetRef = React.useRef<NodeJS.Timeout | null>(null);
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
        meta: category === 'Currency' && fxRates
          ? { kind: 'currency-fx-date', fxDateKey: fxRates.date, isHistorical: isHistoricalMode }
          : undefined,
      });
    } catch (error) {
      console.error('Failed to copy conversion result:', error);
      toast({
        variant: "destructive",
        description: "Failed to copy to clipboard",
        duration: 2000, // Show for 2 seconds
      });
    }
  }, [parsedInput, result, formattedResult, activeTo.symbol, activeFrom.symbol, category, onCopyResult, toast, fxRates, isHistoricalMode]);

  const fetchPairFxRates = React.useCallback((date?: Date, force = false) => {
    if (isFetchingFx) return;
    const targetKey = date ? date.toISOString().split('T')[0] : '';
    const currentKey = fxRates?.date ?? '';

    // Skip refetching if we already have the same date and not forced
    if (!force && fxRates) {
      if (!date && currentKey === todayKey) return;
      if (date && currentKey === targetKey) return;
    }

    setIsFetchingFx(true);
    setFxError(null);

    const isHistoricalTarget = Boolean(date) && targetKey !== todayKey;
    fxLastRequestedKeyRef.current = targetKey || todayKey;
    setSelectedFxDate(isHistoricalTarget ? date ?? undefined : undefined);
    setIsHistoricalMode(isHistoricalTarget);

    const currencyUnits = getUnitsForCategory('Currency').map((unit) => unit.symbol);
    const symbols = currencyUnits.filter((code) => code !== 'EUR').join(',');
    const baseUrl =
      isHistoricalTarget
        ? `/api/fx/historical?date=${targetKey}`
        : '/api/fx?base=EUR';
    const url = `${baseUrl}${symbols ? `&symbols=${symbols}` : ''}`;

    fetch(url, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
        const data = (await res.json()) as FxRatesResponse;
        setFxRates(data);
        const responseKey = data.date ?? '';
        const isHist = Boolean(date) && responseKey !== todayKey;
        const responseDate = responseKey ? new Date(`${responseKey}T00:00:00Z`) : undefined;
        setSelectedFxDate(isHist ? responseDate ?? date ?? undefined : undefined);
        setIsHistoricalMode(isHist);
      })
      .catch((error) => {
        console.error('FX fetch error (pair page):', error);
        setFxError('Live FX rates unavailable');
      })
      .finally(() => setIsFetchingFx(false));
  }, [fxRates, isFetchingFx, todayKey]);

  // Ensure currency formula/result renders once rates arrive without needing a swap.
  React.useEffect(() => {
    if (category !== 'Currency') return;
    if (!fxRates) return;
    if (parsedInput === null) return;
    // trigger formula refresh when rates arrive
    setInputValue((prev) => prev); // no-op to ensure downstream memo runs with latest fxRates
  }, [category, fxRates, parsedInput]);

  // Drive FX fetch based on selected date / latest
  React.useEffect(() => {
    if (category !== 'Currency') return;
    if (isFetchingFx) return;
    const targetKey = selectedFxDate ? selectedFxDate.toISOString().split('T')[0] : '';
    const currentKey = fxRates?.date ?? '';
    if (selectedFxDate) {
      if (fxRates && currentKey === targetKey) return;
      fetchPairFxRates(selectedFxDate, true);
    } else if (!fxRates) {
      fetchPairFxRates();
    } else {
      const hasFrom =
        activeFrom.symbol === fxRates.base ||
        fxRates.rates[activeFrom.symbol as CurrencyCode] !== undefined;
      const hasTo =
        activeTo.symbol === fxRates.base ||
        fxRates.rates[activeTo.symbol as CurrencyCode] !== undefined;
      if (!hasFrom || !hasTo) {
        fetchPairFxRates(undefined, true);
      }
    }
  }, [category, selectedFxDate, fxRates, fetchPairFxRates, isFetchingFx, activeFrom.symbol, activeTo.symbol]);

  const fxRateDateMessage = React.useMemo<React.ReactNode>(() => {
    if (category !== 'Currency' || !fxRates) return '';
    // Fixed locale + UTC: this now renders on the server too, so it must match on hydration.
    const dateLabel = formatFxDateLabel(fxRates.date);
    const usingHistorical = isHistoricalMode;
    return usingHistorical ? (
      <>
        Using <span className="font-semibold text-foreground">historical</span> ECB rates ({dateLabel})
      </>
    ) : (
      `Using latest ECB rates (${dateLabel})`
    );
  }, [category, fxRates, isHistoricalMode]);

  React.useEffect(() => {
    setCopyState('idle');
    setRateCopyState('idle');
  }, [parsedInput, activeFrom.symbol, activeTo.symbol]);

  React.useEffect(() => {
    if (copyState !== 'success') {
      return;
    }
    const timeout = window.setTimeout(() => setCopyState('idle'), 1500);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  React.useEffect(() => {
    return () => {
      if (rateCopyResetRef.current) {
        clearTimeout(rateCopyResetRef.current);
      }
    };
  }, []);

  // If arriving with an initial FX context, fetch accordingly once. Latest rates rendered on the
  // server are kept as-is (they come from the same hourly-cached source /api/fx uses), so there
  // is no refetch or "Updating rates…" flash right after hydration.
  React.useEffect(() => {
    if (category !== 'Currency') return;
    if (initialFxMode === 'historical' && initialFxDate && initialFxDate.toISOString().split('T')[0] !== todayKey) {
      fetchPairFxRates(initialFxDate, true);
    } else if (!hasUsableInitialFxRates) {
      fetchPairFxRates();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

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

  const setValueForUnit = React.useCallback((unitSymbol: string, value: number): void => {
    if (unitSymbol === toUnit.symbol && unitSymbol !== fromUnit.symbol) {
      setIsSwapped(true);
    } else if (unitSymbol === fromUnit.symbol) {
      setIsSwapped(false);
    }
    setInputValue(String(value));
  }, [fromUnit.symbol, toUnit.symbol]);

  React.useImperativeHandle(ref, () => ({
    applyHistorySelect,
    setValueForUnit,
  }), [applyHistorySelect, setValueForUnit]);

  // 1 activeFrom = currencyRate activeTo (null until rates for both currencies are loaded).
  const currencyRate = relation?.kind === 'currency' ? relation.rate : null;
  // FX rates use significant digits (6 rounded, 10 full) rather than fixed decimals, so small
  // cross rates such as IDR -> EUR don't collapse to 0.0001.
  const formatRate = React.useCallback(
    (rate: number) => formatSignificant(rate, isFullPrecision ? 10 : 6),
    [isFullPrecision],
  );

  // "lb = kg × 2.2046", "°F = °C × 9/5 + 32", "mi/kWh = 100 ÷ (kWh/100mi)" - built by the same
  // helper the page uses for its title and table hint.
  const generalFormula = React.useMemo(() => {
    if (category === 'Currency') {
      if (currencyRate === null) {
        if (fxError) return 'Live FX rates unavailable';
        return fxRates ? 'Awaiting live FX rate…' : 'Loading live FX rate…';
      }
      const dateNote = fxRates?.date ? ` (ECB/Frankfurter ${fxRates.date})` : '';
      return `${buildConversionFormula(relation, activeFrom.symbol, activeTo.symbol, formatRate)}${dateNote}`;
    }

    return buildConversionFormula(
      relation,
      activeFrom.symbol,
      activeTo.symbol,
      (value) => formatValue(value, { precisionBoost: 0 }).formatted,
      category,
    );
  }, [
    category,
    currencyRate,
    fxError,
    fxRates,
    relation,
    activeFrom.symbol,
    activeTo.symbol,
    formatRate,
    formatValue,
  ]);

  const dynamicFormula = React.useMemo(() => {
    if (parsedInput === null || result === null) {
      return null;
    }

    // Currency: the general formula already shows the rate being applied.
    if (category === 'Currency') {
      return null;
    }

    // The entered value and its result, e.g. "1 kg = 2.2046 lb" or "2 kWh/100mi = 50 mi/kWh".
    const inputFormatted = formatValue(parsedInput).formatted;
    return `${inputFormatted} ${activeFrom.symbol} = ${formattedResult?.formatted ?? '—'} ${activeTo.symbol}`;
  }, [parsedInput, formattedResult, activeFrom.symbol, activeTo.symbol, formatValue, result, category]);

  const showCalculatorButton = fromFieldFocused || fromCalcHover || fromCalcButtonFocused;
  // Canonical URL of the opposite pair page (relative to the page's own pair, not the swap state).
  const reversePairUrl = buildConversionPairUrl(category, toUnit.symbol, fromUnit.symbol);

  return (
    <div id="converter" className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-lg scroll-mt-20">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Convert</p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">
            {activeFrom.symbol} → {activeTo.symbol}
          </h2>
        </div>
      </div>

      {/* Chart: Mobile-only at top for currency */}
      {category === 'Currency' && (
        <div className="sm:hidden -mx-6 scroll-mt-20">
          <FxHistoryChart
            from={activeFrom.symbol}
            to={activeTo.symbol}
            inputValue={parsedInput ?? 1}
            highlightDate={
              selectedFxDate
                ? selectedFxDate
                : isHistoricalMode && fxRates
                  ? new Date(`${fxRates.date}T00:00:00Z`)
                  : null
            }
            onDateSelect={(date) => {
              setIsHistoricalMode(true);
              setSelectedFxDate(date);
              setFxRates(null);
              fetchPairFxRates(date, true);
            }}
          />
        </div>
      )}

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
            className="h-12 w-full rounded-[1.75rem] border-0 p-0 text-primary text-base font-semibold transition hover:bg-primary/5 disabled:text-muted-foreground sm:w-14"
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

      {/* Chart: Desktop version - shows after converter, before formula */}
      {category === 'Currency' && (
        <div className="hidden sm:block -mx-6 scroll-mt-20 lg:mx-0">
          <FxHistoryChart
            from={activeFrom.symbol}
            to={activeTo.symbol}
            inputValue={parsedInput ?? 1}
            highlightDate={
              selectedFxDate
                ? selectedFxDate
                : isHistoricalMode && fxRates
                  ? new Date(`${fxRates.date}T00:00:00Z`)
                  : null
            }
            onDateSelect={(date) => {
              setIsHistoricalMode(true);
              setSelectedFxDate(date);
              setFxRates(null);
              fetchPairFxRates(date, true);
            }}
          />
        </div>
      )}

      {(dynamicFormula || generalFormula) && (
        <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-xs text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">Formula</p>
          {generalFormula && <p className="mt-2">{generalFormula}</p>}
          {dynamicFormula && <p className="mt-1 text-muted-foreground">{dynamicFormula}</p>}
          {category === 'Currency' && fxRates && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{fxRateDateMessage}</span>
              <DatePicker
                date={selectedFxDate}
                onDateChange={(date) => {
                  if (!date) {
                    setSelectedFxDate(undefined);
                    setIsHistoricalMode(false);
                    setFxRates(null);
                    fetchPairFxRates(undefined, true);
                  } else {
                    const todayKey = new Date().toISOString().split('T')[0];
                    const pickedKey = date.toISOString().split('T')[0];
                    if (pickedKey === todayKey) {
                      setSelectedFxDate(undefined);
                      setIsHistoricalMode(false);
                      setFxRates(null);
                      fetchPairFxRates(undefined, true);
                    } else {
                      setIsHistoricalMode(true);
                      setSelectedFxDate(date);
                      setFxRates(null);
                      fetchPairFxRates(date, true);
                    }
                  }
                }}
                minDate={new Date('1999-01-04T00:00:00Z')}
                maxDate={new Date()}
                placeholder="Pick date"
                className="h-7 text-xs"
              />
            </div>
          )}
          {category === 'Currency' && isFetchingFx && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>Updating rates…</span>
              <div className="h-1 w-20 overflow-hidden rounded-full bg-border/60">
                <div className="h-full w-1/2 animate-pulse bg-primary/70" />
              </div>
            </div>
          )}
          {category === 'Currency' && fxRates && currencyRate !== null && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Rate:</span>
              <span className="font-semibold text-foreground">
                1 {activeFrom.symbol} = {formatRate(currencyRate)} {activeTo.symbol}
              </span>
              <button
                type="button"
                onClick={async () => {
                  if (currencyRate === null) return;
                  const rateString = `1 ${activeFrom.symbol} = ${formatRate(currencyRate)} ${activeTo.symbol}`;
                  try {
                    await navigator.clipboard.writeText(rateString);
                    setRateCopyState('success');
                    if (rateCopyResetRef.current) {
                      clearTimeout(rateCopyResetRef.current);
                    }
                    rateCopyResetRef.current = setTimeout(() => setRateCopyState('idle'), 1000);
                  } catch (error) {
                    console.error('Failed to copy FX rate:', error);
                    toast({
                      variant: "destructive",
                      description: "Failed to copy rate",
                      duration: 2000,
                    });
                  }
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="Copy FX rate"
              >
                {rateCopyState === 'success' ? (
                  <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          )}

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
        {activeFrom.symbol}, or open the{' '}
        <Link
          href={reversePairUrl}
          className="font-semibold text-primary underline-offset-2 hover:underline"
        >
          {toUnit.symbol} to {fromUnit.symbol} converter
        </Link>
        .
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

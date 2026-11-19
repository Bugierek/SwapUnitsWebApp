"use client";

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  /**
   * Latest FX rates already fetched on the server. Used as the initial rates, so the server HTML
   * shows the converted value. ?fxMode=historical&fxDate=... switches to that date after hydration.
   */
  initialFxRates?: FxRatesResponse | null;
  /** Date.now() when the server rendered initialFxRates; older than FX_RATES_MAX_AGE_MS -> refetch. */
  initialFxRatesRenderedAt?: number | null;
  /** Starting amount in the "from" unit (default 1). ?value= still replaces it after hydration. */
  initialValue?: number;
  onCopyResult?: (payload: {
    category: UnitCategory;
    fromValue: number;
    fromUnit: string;
    toValue: number;
    toUnit: string;
    meta?: ConversionHistoryMeta;
  }) => void;
}

const toDateKey = (date: Date): string => date.toISOString().split('T')[0];

// Server-rendered rates older than this are refetched after hydration. Matches the pair page's
// ISR revalidate (fetchFxRates' next.revalidate).
const FX_RATES_MAX_AGE_MS = 60 * 60 * 1000;

// Decimals for a currency result. Rounded: 4, like other units, but at least 4 significant digits.
// Full: 8 plus the input-precision boost (as formatConversionValue does), but at least 10 significant
// digits. Capped at formatConversionValue's 12-decimal limit.
const currencyFractionDigits = (
  value: number | null,
  mode: PrecisionMode,
  precisionBoost: number,
): number => {
  const baseDigits = mode === 'full' ? 8 + Math.min(Math.max(Math.floor(precisionBoost), 0), 4) : 4;
  if (value === null || !Number.isFinite(value) || value === 0) return baseDigits;
  const significantDigits = mode === 'full' ? 10 : 4;
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  return Math.min(12, Math.max(baseDigits, significantDigits - 1 - magnitude));
};

type PairQuery = { value: string | null; fxMode: string | null; fxDate: string | null };

// Hands the page's ?value=, ?fxMode= and ?fxDate= to PairConverter after hydration and again when
// a client-side navigation changes them. The page is pre-rendered without search params, so they
// can only be applied in the browser. Under the page's force-static, useSearchParams() doesn't
// bail out of static rendering; the Suspense boundary around this component keeps any bailout
// confined to it (it renders nothing) if that ever changes.
function PairQueryParams({ onChange }: { onChange: (query: PairQuery) => void }) {
  const searchParams = useSearchParams();
  const value = searchParams.get('value');
  const fxMode = searchParams.get('fxMode');
  const fxDate = searchParams.get('fxDate');
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });
  React.useEffect(() => {
    onChangeRef.current({ value, fxMode, fxDate });
  }, [value, fxMode, fxDate]);
  return null;
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
    initialFxRates = null,
    initialFxRatesRenderedAt = null,
    initialValue = 1,
    onCopyResult,
  }: PairConverterProps,
  ref,
) {
  const [isSwapped, setIsSwapped] = React.useState(false);
  // The page is static HTML, so it always renders initialValue (1 unless the page passes a
  // realistic starting value, as Fuel Economy pages do); ?value= is applied after hydration.
  const [inputValue, setInputValue] = React.useState<string>(String(initialValue));
  const [copyState, setCopyState] = React.useState<'idle' | 'success'>('idle');
  const [precisionMode, setPrecisionMode] = React.useState<PrecisionMode>('rounded');
  const todayKey = React.useMemo(() => toDateKey(new Date()), []);
  const hasUsableInitialFxRates = category === 'Currency' && Boolean(initialFxRates);
  const [fxRates, setFxRates] = React.useState<FxRatesResponse | null>(
    hasUsableInitialFxRates ? initialFxRates : null,
  );
  const [fxError, setFxError] = React.useState<string | null>(null);
  const [isFetchingFx, setIsFetchingFx] = React.useState(false);
  // The FX request in flight, if any. `key` is 'latest' or a historical 'YYYY-MM-DD'.
  const fxRequestRef = React.useRef<{ id: number; key: string } | null>(null);
  const fxRequestCounterRef = React.useRef(0);
  const [selectedFxDate, setSelectedFxDate] = React.useState<Date | undefined>(undefined);
  const [isHistoricalMode, setIsHistoricalMode] = React.useState(false);
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
    (value: number | null, extraOptions?: FormatConversionValueOptions): FormattedConversionValue => {
      if (category === 'Currency') {
        // Never scientific for currency. Fixed decimals alone would round small amounts to 0
        // (1 IDR = 0.0000513 EUR), so also keep at least 4 significant digits (10 in full precision).
        return formatConversionValue(value, {
          ...extraOptions,
          forceScientific: false,
          maxFractionDigits: currencyFractionDigits(value, precisionMode, precisionBoost),
        });
      }
      return formatConversionValue(value, { precisionBoost, precisionMode, ...extraOptions });
    },
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
    : category === 'Currency'
      ? 'Rounded results show up to four digits after the decimal, and at least four significant digits for small amounts, for readability. Switch to full precision to inspect the raw calculation.'
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

  // Loads latest rates (no date) or the rates for a historical date. Callers decide when a fetch
  // is needed. A request for the target already in flight is not repeated (the query params, the
  // chart and the mount effect can ask for the same rates in one commit, which used to send two
  // identical requests), and a response is dropped once a newer request has started, so the last
  // date picked always wins.
  const fetchPairFxRates = React.useCallback((date?: Date) => {
    const targetKey = date ? toDateKey(date) : '';
    const isHistoricalTarget = Boolean(date) && targetKey !== todayKey;
    const requestKey = isHistoricalTarget ? targetKey : 'latest';
    if (fxRequestRef.current?.key === requestKey) return;
    const requestId = ++fxRequestCounterRef.current;
    fxRequestRef.current = { id: requestId, key: requestKey };
    const isCurrentRequest = () => fxRequestRef.current?.id === requestId;

    setIsFetchingFx(true);
    setFxError(null);
    setSelectedFxDate(isHistoricalTarget ? date : undefined);
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
        if (!isCurrentRequest()) return;
        setFxRates(data);
        const responseKey = data.date ?? '';
        const isHist = isHistoricalTarget && responseKey !== todayKey;
        const responseDate = responseKey ? new Date(`${responseKey}T00:00:00Z`) : undefined;
        setSelectedFxDate(isHist ? responseDate ?? date ?? undefined : undefined);
        setIsHistoricalMode(isHist);
      })
      .catch((error) => {
        if (!isCurrentRequest()) return;
        console.error('FX fetch error (pair page):', error);
        setFxError('Live FX rates unavailable');
      })
      .finally(() => {
        if (!isCurrentRequest()) return;
        fxRequestRef.current = null;
        setIsFetchingFx(false);
      });
  }, [todayKey]);

  // Ensure currency formula/result renders once rates arrive without needing a swap.
  React.useEffect(() => {
    if (category !== 'Currency') return;
    if (!fxRates) return;
    if (parsedInput === null) return;
    // trigger formula refresh when rates arrive
    setInputValue((prev) => prev); // no-op to ensure downstream memo runs with latest fxRates
  }, [category, fxRates, parsedInput]);

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

  // Latest rates rendered on the server come from the same hourly-cached source /api/fx uses, so
  // they're kept as-is (no refetch or "Updating rates…" flash after hydration) unless the HTML is
  // older than the revalidate window: ISR serves a stale page once before regenerating it, and a
  // cold-started server begins with the build-time HTML. Without server rates, fetch them now.
  // PairQueryParams sits in its own Suspense boundary, so its effect may run before or after this
  // one. Either order works: if it already requested historical rates, nothing is fetched here,
  // and a historical request started later makes fetchPairFxRates ignore this latest response.
  React.useEffect(() => {
    if (category !== 'Currency' || fxRequestRef.current) return;
    const isStale =
      initialFxRatesRenderedAt === null || Date.now() - initialFxRatesRenderedAt > FX_RATES_MAX_AGE_MS;
    if (!hasUsableInitialFxRates || isStale) {
      fetchPairFxRates();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // ?value= sets the amount in the page's "from" unit. ?fxMode=historical&fxDate=YYYY-MM-DD loads
  // that date's rates; without it, a page left in historical mode by an earlier query (a
  // client-side navigation to the same pair) goes back to latest rates.
  const applyQueryParams = React.useCallback(
    ({ value, fxMode, fxDate }: PairQuery) => {
      const trimmedValue = value?.trim() ?? '';
      const numericValue = trimmedValue === '' ? NaN : Number(trimmedValue);
      if (Number.isFinite(numericValue)) {
        setIsSwapped(false);
        setInputValue(String(numericValue));
      }

      if (category !== 'Currency') return;
      const historicalDate =
        fxMode === 'historical' && fxDate && /^\d{4}-\d{2}-\d{2}$/.test(fxDate)
          ? new Date(`${fxDate}T00:00:00Z`)
          : null;
      if (historicalDate && !Number.isNaN(historicalDate.getTime()) && toDateKey(historicalDate) !== todayKey) {
        // Clear the latest rates so the converter shows "Loading" instead of the latest result
        // labelled as historical while the request is in flight.
        setFxRates(null);
        fetchPairFxRates(historicalDate);
      } else if (isHistoricalMode) {
        setFxRates(null);
        fetchPairFxRates();
      }
    },
    [category, fetchPairFxRates, isHistoricalMode, todayKey],
  );

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

  // Shared by both FxHistoryChart instances (mobile and desktop layouts).
  const chartHighlightDate = React.useMemo(
    () =>
      selectedFxDate
        ? selectedFxDate
        : isHistoricalMode && fxRates
          ? new Date(`${fxRates.date}T00:00:00Z`)
          : null,
    [selectedFxDate, isHistoricalMode, fxRates],
  );
  const handleChartDateSelect = React.useCallback(
    (date: Date) => {
      setIsHistoricalMode(true);
      setSelectedFxDate(date);
      setFxRates(null);
      fetchPairFxRates(date);
    },
    [fetchPairFxRates],
  );

  const showCalculatorButton = fromFieldFocused || fromCalcHover || fromCalcButtonFocused;
  // Canonical URL of the opposite pair page (relative to the page's own pair, not the swap state).
  const reversePairUrl = buildConversionPairUrl(category, toUnit.symbol, fromUnit.symbol);

  return (
    <div id="converter" className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-lg scroll-mt-20">
      <React.Suspense fallback={null}>
        <PairQueryParams onChange={applyQueryParams} />
      </React.Suspense>
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
            highlightDate={chartHighlightDate}
            onDateSelect={handleChartDateSelect}
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
            <span>
              {isFullPrecision
                ? 'Full precision result'
                : category === 'Currency'
                  ? 'Rounded result (4 decimals, at least 4 significant digits)'
                  : 'Rounded result (4 decimals max)'}
            </span>
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
            highlightDate={chartHighlightDate}
            onDateSelect={handleChartDateSelect}
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
                    fetchPairFxRates();
                  } else {
                    const todayKey = new Date().toISOString().split('T')[0];
                    const pickedKey = date.toISOString().split('T')[0];
                    if (pickedKey === todayKey) {
                      setSelectedFxDate(undefined);
                      setIsHistoricalMode(false);
                      setFxRates(null);
                      fetchPairFxRates();
                    } else {
                      setIsHistoricalMode(true);
                      setSelectedFxDate(date);
                      setFxRates(null);
                      fetchPairFxRates(date);
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

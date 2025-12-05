"use client";

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeftRight, Copy, Check } from 'lucide-react';
import { SiteTopbar } from '@/components/site-topbar';
import { Footer } from '@/components/footer';
import { useConversionHistory } from '@/hooks/use-conversion-history';
import type { ConversionHistoryItem } from '@/types';
import { SI_MULTIPLES, SI_SUBMULTIPLES, ALL_SI_PREFIXES } from '@/lib/si-prefixes';
import { getConversionSources } from '@/lib/conversion-sources';
import { formatConversionValue } from '@/lib/number-format';
import { cn } from '@/lib/utils';

const formatValue = (exp: number) => `10${exp >= 0 ? `^${exp}` : `^(${exp})`}`;

const formatNumber = (value: number): string =>
  formatConversionValue(value, { precisionBoost: 0 }).formatted;

export default function NistSiTenfoldPage() {
  const prefixOptions = React.useMemo(() => [...ALL_SI_PREFIXES].sort((a, b) => b.exponent - a.exponent), []);
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const { history, addHistoryItem, isLoading: isLoadingHistory } = useConversionHistory();
  const siHistory = React.useMemo(
    () => history.filter((item) => item.meta?.kind === 'si-prefix'),
    [history],
  );
  const [inputValue, setInputValue] = React.useState('1');
  const [fromPrefix, setFromPrefix] = React.useState(prefixOptions[8]); // kilo default
  const [toPrefix, setToPrefix] = React.useState(prefixOptions[prefixOptions.length - 3]); // milli default
  const [copyState, setCopyState] = React.useState<'idle' | 'success'>('idle');
  const [isSwapped, setIsSwapped] = React.useState(false);
  const numericValue = Number(inputValue);
  const isValueValid = Number.isFinite(numericValue);
  const conversionSources = React.useMemo(
    () => getConversionSources('SI Prefixes', fromPrefix.symbol, toPrefix.symbol),
    [fromPrefix.symbol, toPrefix.symbol],
  );
  const computed = React.useMemo(() => {
    if (!isValueValid) return null;
    const factor = Math.pow(10, fromPrefix.exponent - toPrefix.exponent);
    return numericValue * factor;
  }, [numericValue, fromPrefix.exponent, toPrefix.exponent, isValueValid]);

  const formattedInput = isValueValid
    ? formatNumber(numericValue)
    : inputValue.trim() === ''
      ? '—'
      : inputValue.trim();
  const formattedOutput = computed !== null && isValueValid ? formatNumber(computed) : '—';
  const fromValueFieldId = React.useId();
  const fromPrefixTriggerId = React.useId();
  const toPrefixTriggerId = React.useId();

  React.useEffect(() => {
    setCopyState('idle');
  }, [numericValue, fromPrefix.symbol, toPrefix.symbol, computed]);

  const handleHistorySelect = React.useCallback((item: ConversionHistoryItem) => {
    if (item.meta?.kind !== 'si-prefix') {
      return;
    }
    const fromMatch = prefixOptions.find((opt) => opt.symbol === item.meta.fromPrefixSymbol);
    if (fromMatch) {
      setFromPrefix(fromMatch);
    }
    const toMatch = prefixOptions.find((opt) => opt.symbol === item.meta.toPrefixSymbol);
    if (toMatch) {
      setToPrefix(toMatch);
    }
    const nextValue = item.meta.inputText ?? String(item.fromValue);
    setInputValue(nextValue);
  }, [prefixOptions]);

  React.useEffect(() => {
    if (!searchParamsKey) {
      return;
    }
    const params = new URLSearchParams(searchParamsKey);
    const fromParam = params.get('from');
    if (fromParam) {
      const match = prefixOptions.find((opt) => opt.symbol === fromParam);
      if (match) {
        setFromPrefix((current) => (current.symbol === match.symbol ? current : match));
      }
    }
    const toParam = params.get('to');
    if (toParam) {
      const match = prefixOptions.find((opt) => opt.symbol === toParam);
      if (match) {
        setToPrefix((current) => (current.symbol === match.symbol ? current : match));
      }
    }
    const valueParam = params.get('value');
    if (valueParam !== null) {
      setInputValue((current) => (current === valueParam ? current : valueParam));
    }
  }, [searchParamsKey, prefixOptions]);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.12),transparent_55%),_radial-gradient(ellipse_at_bottom,_rgba(14,165,233,0.08),transparent_60%)]" />

      <SiteTopbar
        history={siHistory}
        isLoadingHistory={isLoadingHistory}
        onHistorySelect={handleHistorySelect}
      />

      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-10">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="transition hover:text-primary">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span className="text-foreground">NIST SI prefix table</span>
              </li>
            </ol>
          </nav>

          <header className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">NIST SP 330</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Decimal Multiples & Submultiples of SI Units</h1>
            <p className="text-sm text-muted-foreground">
              Table 3 from the NIST Guide for the Use of the International System of Units (SI) lists precise decimal scaling factors. Use it whenever you need to convert between kilo-, milli-, micro-, or larger prefixes without guessing.
            </p>
          </header>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary"
            >
              Back to main converter
            </Link>
          </div>

          <section className="rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">Quick prefix converter</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a magnitude, pick any prefix on either side, and the converter will scale it using the
              exact powers of ten defined in Table 3.
            </p>
            <div className="mt-4 grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className="space-y-2">
                <label
                  htmlFor={fromValueFieldId}
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                >
                  From
                </label>
                <div className="flex h-12 items-center rounded-xl border border-border/60 bg-background">
                  <Input
                    id={fromValueFieldId}
                    name="si-prefix-value"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder="Enter number"
                    className="h-full flex-1 min-w-[160px] border-0 bg-transparent px-4 text-base font-semibold text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Select
                    name="si-prefix-from"
                    value={fromPrefix.symbol}
                    onValueChange={(symbol) => {
                      const match = prefixOptions.find((opt) => opt.symbol === symbol);
                      if (match) setFromPrefix(match);
                    }}
                  >
                    <SelectTrigger
                      id={fromPrefixTriggerId}
                      className="h-full min-w-[140px] rounded-none border-l border-border/60 bg-transparent px-4 text-sm font-semibold text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                      aria-label="Select the starting SI prefix"
                    >
                      <SelectValue placeholder="Prefix" />
                    </SelectTrigger>
                    <SelectContent>
                      {prefixOptions.map((opt) => (
                        <SelectItem key={opt.symbol} value={opt.symbol}>
                          {opt.prefix} ({opt.symbol}) · {formatValue(opt.exponent)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex w-full items-center justify-center pt-6 sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setFromPrefix(toPrefix);
                    setToPrefix(fromPrefix);
                    setIsSwapped((prev) => !prev);
                  }}
                  className="h-12 w-full inline-flex items-center justify-center rounded-[1.75rem] border-0 p-0 text-primary text-base font-semibold transition hover:bg-primary/5 sm:w-14"
                  aria-label="Swap prefixes"
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
                </button>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={toPrefixTriggerId}
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                >
                  To
                </label>
                <div className="flex h-12 items-center rounded-xl border border-border/60 bg-secondary/60">
                  <div className="flex-1 min-w-[160px] px-4 text-base font-semibold text-foreground">
                    {formattedOutput}
                  </div>
                  <Select
                    name="si-prefix-to"
                    value={toPrefix.symbol}
                    onValueChange={(symbol) => {
                      const match = prefixOptions.find((opt) => opt.symbol === symbol);
                      if (match) setToPrefix(match);
                    }}
                  >
                    <SelectTrigger
                      id={toPrefixTriggerId}
                      className="h-full min-w-[140px] rounded-none border-l border-border/60 bg-transparent px-4 text-sm font-semibold text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                      aria-label="Select the target SI prefix"
                    >
                      <SelectValue placeholder="Prefix" />
                    </SelectTrigger>
                    <SelectContent>
                      {prefixOptions.map((opt) => (
                        <SelectItem key={opt.symbol} value={opt.symbol}>
                          {opt.prefix} ({opt.symbol}) · {formatValue(opt.exponent)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm text-primary">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  {isValueValid
                    ? `${formattedInput} ${fromPrefix.prefix} = ${formattedOutput} ${toPrefix.prefix}`
                    : 'Enter a valid number to see the conversion.'}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                if (!isValueValid || computed === null) return;
                await navigator.clipboard.writeText(
                  `${formattedInput} ${fromPrefix.prefix} = ${formattedOutput} ${toPrefix.prefix}`,
                );
                addHistoryItem({
                  category: 'SI Prefixes',
                  fromValue: numericValue,
                  fromUnit: fromPrefix.symbol,
                  toValue: computed,
                  toUnit: toPrefix.symbol,
                  meta: {
                    kind: 'si-prefix',
                    route: '/standards/nist-si-tenfold',
                    fromPrefixSymbol: fromPrefix.symbol,
                    toPrefixSymbol: toPrefix.symbol,
                    inputText: inputValue,
                  },
                });
                setCopyState('success');
              }}
                  disabled={!isValueValid || computed === null}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Copy textual result"
                >
                  {copyState === 'success' ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            {conversionSources.length > 0 && (
              <details className="mt-5 rounded-2xl border border-border/60 bg-background px-4 py-3 text-xs text-muted-foreground">
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
          </section>

          <section className="rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">Decimal Multiples</h2>
            <table className="mt-4 w-full table-auto text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="py-2">Prefix</th>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Factor</th>
                </tr>
              </thead>
              <tbody>
            {SI_MULTIPLES.map((row) => (
                  <tr key={row.prefix} className="border-t border-border/40 text-sm">
                    <td className="py-2 font-medium text-foreground">{row.prefix}</td>
                    <td className="py-2 text-muted-foreground">{row.symbol}</td>
                    <td className="py-2 text-foreground">{formatValue(row.exponent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">Decimal Submultiples</h2>
            <table className="mt-4 w-full table-auto text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="py-2">Prefix</th>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Factor</th>
                </tr>
              </thead>
              <tbody>
            {SI_SUBMULTIPLES.map((row) => (
                  <tr key={row.prefix} className="border-t border-border/40 text-sm">
                    <td className="py-2 font-medium text-foreground">{row.prefix}</td>
                    <td className="py-2 text-muted-foreground">{row.symbol}</td>
                    <td className="py-2 text-foreground">{formatValue(row.exponent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="text-center text-xs text-muted-foreground">
            <p>
              Source: NIST Special Publication 330. Return to{' '}
              <Link href="https://www.nist.gov/pml/special-publication-330" className="text-primary underline-offset-2 hover:underline">
                nist.gov/pml/special-publication-330
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

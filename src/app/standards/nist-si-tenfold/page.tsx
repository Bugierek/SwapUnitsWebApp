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

const multiples = [
  { prefix: 'yotta', symbol: 'Y', exponent: 24 },
  { prefix: 'zetta', symbol: 'Z', exponent: 21 },
  { prefix: 'exa', symbol: 'E', exponent: 18 },
  { prefix: 'peta', symbol: 'P', exponent: 15 },
  { prefix: 'tera', symbol: 'T', exponent: 12 },
  { prefix: 'giga', symbol: 'G', exponent: 9 },
  { prefix: 'mega', symbol: 'M', exponent: 6 },
  { prefix: 'kilo', symbol: 'k', exponent: 3 },
  { prefix: 'hecto', symbol: 'h', exponent: 2 },
  { prefix: 'deca', symbol: 'da', exponent: 1 },
];

const subMultiples = [
  { prefix: 'deci', symbol: 'd', exponent: -1 },
  { prefix: 'centi', symbol: 'c', exponent: -2 },
  { prefix: 'milli', symbol: 'm', exponent: -3 },
  { prefix: 'micro', symbol: 'µ', exponent: -6 },
  { prefix: 'nano', symbol: 'n', exponent: -9 },
  { prefix: 'pico', symbol: 'p', exponent: -12 },
  { prefix: 'femto', symbol: 'f', exponent: -15 },
  { prefix: 'atto', symbol: 'a', exponent: -18 },
  { prefix: 'zepto', symbol: 'z', exponent: -21 },
  { prefix: 'yocto', symbol: 'y', exponent: -24 },
];

const formatValue = (exp: number) => `10${exp >= 0 ? `^${exp}` : `^(${exp})`}`;

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '∞';
  }

  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 0.0001 || abs > 1_000_000)) {
    return value.toExponential(4).replace('e', '×10^');
  }

  return Intl.NumberFormat('en-US', {
    maximumFractionDigits: abs < 1 ? 6 : 4,
  }).format(value);
};

export default function NistSiTenfoldPage() {
  const prefixOptions = React.useMemo(() => [...multiples, ...subMultiples].sort((a, b) => b.exponent - a.exponent), []);
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
  const numericValue = Number(inputValue);
  const isValueValid = Number.isFinite(numericValue);
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
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">From</label>
                <div className="flex h-12 items-center rounded-xl border border-border/60 bg-background">
                  <Input
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder="Enter number"
                    className="h-full flex-1 min-w-[160px] border-0 bg-transparent px-4 text-base font-semibold text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Select
                    value={fromPrefix.symbol}
                    onValueChange={(symbol) => {
                      const match = prefixOptions.find((opt) => opt.symbol === symbol);
                      if (match) setFromPrefix(match);
                    }}
                  >
                    <SelectTrigger className="h-full min-w-[140px] rounded-none border-l border-border/60 bg-transparent px-4 text-sm font-semibold text-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
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

              <div className="flex w-full justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setFromPrefix(toPrefix);
                    setToPrefix(fromPrefix);
                  }}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background text-foreground transition hover:border-primary/60 hover:text-primary"
                  aria-label="Swap prefixes"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">To</label>
                <div className="flex h-12 items-center rounded-xl border border-border/60 bg-secondary/60">
                  <div className="flex-1 min-w-[160px] px-4 text-base font-semibold text-foreground">
                    {formattedOutput}
                  </div>
                  <Select
                    value={toPrefix.symbol}
                    onValueChange={(symbol) => {
                      const match = prefixOptions.find((opt) => opt.symbol === symbol);
                      if (match) setToPrefix(match);
                    }}
                  >
                    <SelectTrigger className="h-full min-w-[140px] rounded-none border-l border-border/60 bg-transparent px-4 text-sm font-semibold text-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
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
                  category: 'Length',
                  fromValue: numericValue,
                  fromUnit: fromPrefix.prefix,
                  toValue: computed,
                  toUnit: toPrefix.prefix,
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
                {multiples.map((row) => (
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
                {subMultiples.map((row) => (
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

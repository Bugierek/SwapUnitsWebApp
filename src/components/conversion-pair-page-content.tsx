"use client";

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, RefreshCw } from 'lucide-react';

import type { CategoryInfo } from '@/lib/category-info';
import type { ConversionHistoryItem, Preset, UnitCategory } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SiteTopbar } from '@/components/site-topbar';
import { PairConverter, PairConverterHandle } from '@/components/pair-converter';
import { Footer } from '@/components/footer';
import { buildConversionPairUrl } from '@/lib/conversion-pairs';
import { useConversionHistory } from '@/hooks/use-conversion-history';
import { copyTextToClipboard } from '@/lib/copy-to-clipboard';
import { useToast } from '@/hooks/use-toast';

type ExampleRow = {
  input: number;
  output: number;
};

type SimpleUnit = {
  symbol: string;
  name: string;
};

type ConversionPairPageContentProps = {
  categoryInfo: CategoryInfo;
  fromSymbol: string;
  toSymbol: string;
  fromUnit: SimpleUnit;
  toUnit: SimpleUnit;
  formulaInsight: string;
  exampleRows: ExampleRow[];
  reverseExampleRows: ExampleRow[];
  otherUnits: SimpleUnit[];
  navbarPresets: Preset[];
};

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

const formatHistoryNumber = (num: number): string => {
  if (!isFinite(num)) return '-';
  const absNum = Math.abs(num);
  if (absNum > 1e4 || (absNum < 1e-3 && absNum !== 0)) {
    const exp = num.toExponential(2).replace('e', 'E');
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
  const rounded = parseFloat(num.toFixed(3));
  if (rounded % 1 === 0) {
    return rounded.toLocaleString(undefined, { maximumFractionDigits: 0, style: 'decimal' });
  }
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3, style: 'decimal' });
};

export function ConversionPairPageContent({
  categoryInfo,
  fromSymbol,
  toSymbol,
  fromUnit,
  toUnit,
  formulaInsight,
  exampleRows,
  reverseExampleRows,
  otherUnits,
  navbarPresets,
}: ConversionPairPageContentProps) {
  const { history, addHistoryItem, clearHistory, isLoading: isLoadingHistory } = useConversionHistory();
  const pairConverterRef = React.useRef<PairConverterHandle>(null);
  const { toast } = useToast();

  const handleHistorySelect = React.useCallback((item: ConversionHistoryItem) => {
    if (!pairConverterRef.current) return;
    const applied = pairConverterRef.current.applyHistorySelect(item);
    if (!applied) {
      toast({
        title: 'Pair mismatch',
        description: 'This history entry uses different units. Open it on the main converter to edit.',
        variant: 'default',
      });
    }
  }, [toast]);

  const handleCopyHistoryItem = React.useCallback(async (item: ConversionHistoryItem) => {
    const textToCopy = `${formatHistoryNumber(item.fromValue)} ${item.fromUnit} → ${formatHistoryNumber(item.toValue)} ${item.toUnit}`;
    if (!textToCopy) return;

    const copied = await copyTextToClipboard(textToCopy);
    if (copied) {
      toast({
        title: 'Copied!',
        description: `Conversion "${textToCopy}" copied to clipboard.`,
        variant: 'confirmation',
        duration: 1500,
      });
    } else {
      toast({
        title: 'Copy failed',
        description: 'Clipboard access is blocked. Please copy the text manually.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleCopyResult = React.useCallback((payload: {
    category: UnitCategory;
    fromValue: number;
    fromUnit: string;
    toValue: number;
    toUnit: string;
  }) => {
    addHistoryItem(payload);
  }, [addHistoryItem]);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.12),transparent_55%),_radial-gradient(ellipse_at_bottom,_rgba(14,165,233,0.08),transparent_60%)]" />

      <SiteTopbar
        presets={navbarPresets}
        history={history}
        isLoadingHistory={isLoadingHistory}
        onHistorySelect={handleHistorySelect}
        clearHistory={clearHistory}
        onCopyHistoryItem={handleCopyHistoryItem}
      />

      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-10 px-4 pb-16 pt-12 sm:px-6 lg:px-10">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="transition hover:text-primary">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/measurements/${categoryInfo.slug}`}
                  className="transition hover:text-primary"
                >
                  {categoryInfo.title}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span className="text-foreground">
                  {fromSymbol} → {toSymbol}
                </span>
              </li>
            </ol>
          </nav>

          <section className="space-y-5 rounded-3xl border border-border/60 bg-card px-6 py-8 shadow-lg">
            <div className="space-y-3">
              <Badge variant="outline" className="rounded-full border-border/60 bg-primary/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-primary">
                {categoryInfo.title}
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Convert {fromSymbol} to {toSymbol}
              </h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                Use the live converter below to translate between {fromUnit.name} ({fromSymbol}) and{' '}
                {toUnit.name} ({toSymbol}). Scroll further for quick examples, formula tips, and related units.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Formula insight:</span>{' '}
              {formulaInsight}
            </div>
          </section>

          <section>
            <PairConverter
              ref={pairConverterRef}
              category={categoryInfo.category}
              fromUnit={fromUnit}
              toUnit={toUnit}
              initialValue={1}
              onCopyResult={handleCopyResult}
            />
          </section>

          {exampleRows.length > 0 && (
            <section className="space-y-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {fromSymbol} to {toSymbol} quick table
                </h2>
                <p className="text-sm text-muted-foreground">
                  Multiply any row by the same factor to scale results. Use the converter above to enter exact values with your own units.
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{fromUnit.name} ({fromSymbol})</TableHead>
                    <TableHead>{toUnit.name} ({toSymbol})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exampleRows.map((row, index) => (
                    <TableRow key={`forward-${index}`}>
                      <TableCell className="font-medium text-foreground">
                        {formatNumber(row.input)} {fromSymbol}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatNumber(row.output)} {toSymbol}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}

          {reverseExampleRows.length > 0 && (
            <section className="space-y-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {toSymbol} back to {fromSymbol}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Keep the reciprocal handy when double-checking calculations or undoing a conversion.
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{toUnit.name} ({toSymbol})</TableHead>
                    <TableHead>{fromUnit.name} ({fromSymbol})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reverseExampleRows.map((row, index) => (
                    <TableRow key={`reverse-${index}`}>
                      <TableCell className="font-medium text-foreground">
                        {formatNumber(row.input)} {toSymbol}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatNumber(row.output)} {fromSymbol}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}

          {otherUnits.length > 0 && (
            <section className="space-y-4 rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground">Explore more {categoryInfo.title.toLowerCase()}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {otherUnits.slice(0, 6).map((unit) => (
                  <Link
                    key={unit.symbol}
                    href={buildConversionPairUrl(categoryInfo.category, fromSymbol, unit.symbol)}
                    className="group rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm transition hover:border-primary/60 hover:bg-primary/5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {fromSymbol} → {unit.symbol}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" aria-hidden="true" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Convert into {unit.name} without leaving SwapUnits.
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-primary/40 bg-primary/5 px-6 py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Compare all {categoryInfo.title.toLowerCase()}
                </h2>
                <p className="text-sm text-muted-foreground">
                  View the full unit roster, charts, and tips for {categoryInfo.title} conversions.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/measurements/${categoryInfo.slug}`}>
                  Open category guide
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Need a fresh start?</h2>
                <p className="text-sm text-muted-foreground">
                  Jump back to the home converter, reset the fields, or build new favorites for other unit pairs.
                </p>
              </div>
              <Button asChild>
                <Link href="/">
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Back to main converter
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

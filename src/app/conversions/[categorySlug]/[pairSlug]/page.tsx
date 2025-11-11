import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowUpRight, RefreshCw } from 'lucide-react';

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
import { getCategoryInfoBySlug } from '@/lib/category-info';
import { listAllConversionPairs, parseConversionPairSlug, buildConversionPairUrl } from '@/lib/conversion-pairs';
import { unitData, getUnitsForCategory, getPresetsForCategory } from '@/lib/unit-data';
import { convertNumericValue } from '@/lib/conversion-math';
import { SiteTopbar } from '@/components/site-topbar';
import type { UnitCategory } from '@/types';
import { PairConverter } from '@/components/pair-converter';
import { Footer } from '@/components/footer';

type PageParams = {
  categorySlug: string;
  pairSlug: string;
}

const sampleMultipliers: number[] = [0.25, 0.5, 1, 2, 5, 10, 25, 100];
const temperatureSampleSet: number[] = [-40, -10, 0, 32, 68, 100];
const fuelEconomySampleSet: number[] = [2, 4, 6, 8, 10, 15, 20];

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

const buildSampleValues = (category: UnitCategory): number[] => {
  if (category === 'Temperature') {
    return temperatureSampleSet;
  }
  if (category === 'Fuel Economy') {
    return fuelEconomySampleSet;
  }
  return sampleMultipliers;
};

const formulaDescription = (
  category: UnitCategory,
  fromSymbol: string,
  toSymbol: string,
): string => {
  if (category === 'Temperature') {
    // Temperature formula descriptions
    const formulas = {
      'C->F': '°F = °C × 9/5 + 32',
      'F->C': '°C = (°F - 32) × 5/9',
      'C->K': 'K = °C + 273.15',
      'K->C': '°C = K - 273.15',
      'F->K': 'K = (°F - 32) × 5/9 + 273.15',
      'K->F': '°F = (K - 273.15) × 9/5 + 32'
    };
    const key = `${fromSymbol[0]}->${toSymbol[0]}`;
    if (formulas[key as keyof typeof formulas]) {
      return `Use the formula: ${formulas[key as keyof typeof formulas]}`;
    }
    return 'Temperature conversions require special formulas with both multiplication and addition/subtraction steps.';
  }

  if (category === 'Data Storage') {
    return 'Data storage units use base-2 multipliers (powers of 1024) instead of base-10. For example, 1 KB = 1024 bytes.';
  }

  if (category === 'Fuel Economy') {
    if (fromSymbol.includes('/100') || toSymbol.includes('/100')) {
      return 'Converting between efficiency (km/L, MPG) and consumption (L/100km) units requires using the inverse relationship: consumption = 100 ÷ efficiency.';
    }
    return 'Direct fuel economy conversions use multiplication by the conversion factor to account for different distance and volume units.';
  }

  if (category === 'Data Transfer Rate') {
    if ((fromSymbol.includes('bps') && toSymbol.includes('/s')) || (fromSymbol.includes('/s') && toSymbol.includes('bps'))) {
      return 'When converting between bits (b) and bytes (B), remember that 1 byte = 8 bits.';
    }
  }

  return 'Most unit conversions use a simple multiplication or division by a conversion factor. The calculator shows the exact formula used.';
};

const buildFormulaText = (
  category: UnitCategory,
  fromUnit: { symbol: string; factor?: number; unitType?: string } | undefined,
  toUnit: { symbol: string; factor?: number; unitType?: string } | undefined,
  ratioForward: number | null,
): string | null => {
  if (!fromUnit || !toUnit) return null;

  const formatRatio = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    if (abs !== 0 && (abs < 0.0001 || abs > 1_000_000)) {
      return value.toExponential(6).replace('e', '×10^');
    }
    return Intl.NumberFormat('en-US', { maximumFractionDigits: abs < 1 ? 8 : 6 }).format(value);
  };

  if (category === 'Temperature') {
    if (fromUnit.symbol === '°C' && toUnit.symbol === '°F') {
      return '°F = °C × 9/5 + 32';
    }
    if (fromUnit.symbol === '°F' && toUnit.symbol === '°C') {
      return '°C = (°F - 32) × 5/9';
    }
    if (fromUnit.symbol === '°C' && toUnit.symbol === 'K') {
      return 'K = °C + 273.15';
    }
    if (fromUnit.symbol === 'K' && toUnit.symbol === '°C') {
      return '°C = K - 273.15';
    }
    if (fromUnit.symbol === '°F' && toUnit.symbol === 'K') {
      return 'K = (°F - 32) × 5/9 + 273.15';
    }
    if (fromUnit.symbol === 'K' && toUnit.symbol === '°F') {
      return '°F = (K - 273.15) × 9/5 + 32';
    }
  }

  if (ratioForward !== null) {
    // Handle special cases
    if (category === 'Data Storage') {
      const power = Math.log(ratioForward) / Math.log(1024);
      if (Number.isInteger(power)) {
        return `${toUnit.symbol} = ${fromUnit.symbol} × 1024${power > 1 ? '^' + power : ''}`;
      }
    }

    if (category === 'Fuel Economy' && (
      (fromUnit.symbol?.includes('/100') && !toUnit.symbol?.includes('/100')) ||
      (!fromUnit.symbol?.includes('/100') && toUnit.symbol?.includes('/100'))
    )) {
      return `${toUnit.symbol} = 100 ÷ (${fromUnit.symbol} × ${formatRatio(ratioForward)})`;
    }

    // For regular conversions, show simplified formula
    if (ratioForward === 1) {
      return `${toUnit.symbol} = ${fromUnit.symbol}`;
    } else if (ratioForward < 1) {
      return `${toUnit.symbol} = ${fromUnit.symbol} ÷ ${formatRatio(1/ratioForward)}`;
    }
    return `${toUnit.symbol} = ${fromUnit.symbol} × ${formatRatio(ratioForward)}`;
  }

  return null;
};

export function generateStaticParams() {
  return listAllConversionPairs().map(({ categorySlug, pairSlug }) => ({
    categorySlug,
    pairSlug,
  }));
}

type PageProps = {
  params: PageParams;
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Await params to ensure they are fully resolved
  const resolvedParams = await Promise.resolve(params);
  const { categorySlug, pairSlug } = resolvedParams;
  
  const categoryInfo = getCategoryInfoBySlug(categorySlug);
  if (!categoryInfo) {
    return {};
  }

  const pair = parseConversionPairSlug(pairSlug);
  if (!pair) {
    return {};
  }

  const { fromSymbol, toSymbol } = pair;
  const title = `${fromSymbol} ↔ ${toSymbol} Conversion | ${categoryInfo.title}`;
  const description = `Convert between ${fromSymbol} and ${toSymbol} with tables, quick examples, and an interactive calculator for ${categoryInfo.title.toLowerCase()}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/conversions/${categorySlug}/${pairSlug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

export default async function ConversionPairPage({ params }: PageProps) {
  // Await params to ensure they are fully resolved
  const resolvedParams = await Promise.resolve(params);
  const { categorySlug, pairSlug } = resolvedParams;

  const categoryInfo = getCategoryInfoBySlug(categorySlug);
  if (!categoryInfo) {
    notFound();
  }

  const pair = parseConversionPairSlug(pairSlug);
  if (!pair) {
    notFound();
  }

  const { fromSymbol, toSymbol } = pair;
  const unitEntry = unitData[categoryInfo.category];
  const units = unitEntry?.units ?? [];
  const fromUnitDetails = units.find((unit) => unit.symbol === fromSymbol);
  const toUnitDetails = units.find((unit) => unit.symbol === toSymbol);

  if (!fromUnitDetails || !toUnitDetails) {
    notFound();
  }

  const sampleInputs = buildSampleValues(categoryInfo.category);
  const exampleRows = sampleInputs
    .map((sample) => {
      const converted = convertNumericValue(categoryInfo.category, fromSymbol, toSymbol, sample);
      if (converted === null) return null;
      return {
        input: sample,
        output: converted,
      };
    })
    .filter((row): row is { input: number; output: number } => row !== null)
    .slice(0, 10);

  const reverseExampleRows = sampleInputs
    .map((sample) => {
      const converted = convertNumericValue(categoryInfo.category, toSymbol, fromSymbol, sample);
      if (converted === null) return null;
      return {
        input: sample,
        output: converted,
      };
    })
    .filter((row): row is { input: number; output: number } => row !== null)
    .slice(0, 10);

  const otherUnits = getUnitsForCategory(categoryInfo.category).filter(
    (unit) => unit.symbol !== fromSymbol && unit.symbol !== toSymbol,
  );

  const navbarPresets = getPresetsForCategory(categoryInfo.category).slice(0, 12);
  const ratioForward = convertNumericValue(categoryInfo.category, fromSymbol, toSymbol, 1);
  const formulaText = buildFormulaText(
    categoryInfo.category,
    fromUnitDetails,
    toUnitDetails,
    ratioForward,
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.12),transparent_55%),_radial-gradient(ellipse_at_bottom,_rgba(14,165,233,0.08),transparent_60%)]" />

      <SiteTopbar presets={navbarPresets} />

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
            Use the live converter below to translate between {fromUnitDetails.name} ({fromSymbol}) and{' '}
            {toUnitDetails.name} ({toSymbol}). Scroll further for quick examples, formula tips, and related units.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Formula insight:</span>{' '}
          {formulaDescription(categoryInfo.category, fromSymbol, toSymbol)}
        </div>
      </section>

      <section>
        <PairConverter
          category={categoryInfo.category}
          fromUnit={{ symbol: fromSymbol, name: fromUnitDetails.name }}
          toUnit={{ symbol: toSymbol, name: toUnitDetails.name }}
          initialValue={1}
          formulaText={formulaText}
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
                <TableHead>{fromUnitDetails.name} ({fromSymbol})</TableHead>
                <TableHead>{toUnitDetails.name} ({toSymbol})</TableHead>
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
                <TableHead>{toUnitDetails.name} ({toSymbol})</TableHead>
                <TableHead>{fromUnitDetails.name} ({fromSymbol})</TableHead>
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

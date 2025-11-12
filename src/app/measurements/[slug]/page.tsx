import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';

import { getCategoryInfoBySlug, categoryInfoList } from '@/lib/category-info';
import { getPresetsForCategory, unitData } from '@/lib/unit-data';
import { convertNumericValue } from '@/lib/conversion-math';
import { buildConversionPairUrl } from '@/lib/conversion-pairs';
import type { Unit, UnitCategory } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type CategoryPageProps = {
  params: {
    slug: string;
  };
};

const ratioFriendlyCategories: UnitCategory[] = [
  'Length',
  'Mass',
  'Time',
  'Pressure',
  'Area',
  'Volume',
  'Energy',
  'Speed',
  'Data Storage',
  'Data Transfer Rate',
  'Bitcoin',
];

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 6,
});

const largeNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

const decimalFormatter = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '—';
  }

  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 0.0001 || abs >= 1_000_000)) {
    return value.toExponential(4).replace('e', '×10^');
  }

  if (abs >= 1000) {
    return largeNumberFormatter.format(value);
  }

  return numberFormatter.format(value);
};

const isRatioConvertible = (category: UnitCategory): boolean =>
  ratioFriendlyCategories.includes(category);

const convertValue = (
  category: UnitCategory,
  value: number,
  fromSymbol: string,
  toSymbol: string,
): number | null => {
  const converted = convertNumericValue(category, fromSymbol, toSymbol, value);
  if (converted === null || !Number.isFinite(converted)) {
    return null;
  }
  return converted;
};

export function generateStaticParams(): Array<{ slug: string }> {
  return categoryInfoList.map((info) => ({ slug: info.slug }));
}

export function generateMetadata({ params }: CategoryPageProps): Metadata {
  const info = getCategoryInfoBySlug(params.slug);
  if (!info) {
    return {};
  }
  return {
    title: info.seo.title,
    description: info.seo.description,
    alternates: {
      canonical: `/measurements/${info.slug}`,
    },
    openGraph: {
      title: info.seo.title,
      description: info.seo.description,
      type: 'article',
    },
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const info = getCategoryInfoBySlug(params.slug);
  if (!info) {
    notFound();
  }

  const unitEntry = unitData[info.category];
  if (!unitEntry) {
    notFound();
  }

  const units = unitEntry.units ?? [];
  const baseUnit = units.find((unit) => unit.factor === 1) ?? units[0];
  const presets = getPresetsForCategory(info.category);
  const topPresets = presets.slice(0, 8);

  const ratioFriendly = isRatioConvertible(info.category);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="transition hover:text-primary">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <span className="text-foreground">{info.title}</span>
          </li>
        </ol>
      </nav>

      <section className="space-y-6 rounded-3xl border border-border/60 bg-card px-6 py-8 shadow-lg">
        <div className="space-y-3">
          <Badge variant="outline" className="rounded-full border-border/60 bg-primary/5 px-3 py-1 text-[0.7rem] font-semibold tracking-[0.25em] text-primary">
            {info.heroTagline}
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {info.title}
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">{info.description}</p>
          <p className="text-sm text-muted-foreground">{info.intro}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-5 py-4">
            <p className="text-xs tracking-[0.2em] text-primary">Base unit</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {baseUnit?.name ?? '—'}{' '}
              {baseUnit?.symbol && (
                <span className="text-sm font-medium text-muted-foreground">({baseUnit.symbol})</span>
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-5 py-4">
            <p className="text-xs tracking-[0.2em] text-primary">Units covered</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{units.length}</p>
          </div>
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-5 py-4">
            <p className="text-xs tracking-[0.2em] text-primary">Popular conversions</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{topPresets.length}</p>
          </div>
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-5 py-4">
            <p className="text-xs tracking-[0.2em] text-primary">Ready to convert</p>
            <Link
              href="/#converter"
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
            >
              Open live converter
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="space-y-4 rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Quick tips</h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {info.quickTips.map((tip, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="space-y-4 rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Where this category shows up</h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {info.useCases.map((useCase, index) => (
              <li key={index} className="flex items-start gap-3">
                <ArrowRight className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                <span>{useCase}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Unit breakdown</h2>
            <p className="text-sm text-muted-foreground">
              Every unit below references the SI base value so you can compare readings quickly.
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>1 unit in {baseUnit?.symbol ?? baseUnit?.name ?? 'base'}</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => {
              const relative = baseUnit
                ? unit.factor / (baseUnit.factor || 1)
                : unit.factor;
              const isBase = unit.symbol === baseUnit?.symbol;
              return (
                <TableRow key={unit.symbol}>
                  <TableCell className="font-medium text-foreground">{unit.name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{unit.symbol}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {isRatioConvertible(info.category) ? (
                      isBase ? (
                        `Reference unit`
                      ) : (
                        <>
                          {`1 ${unit.symbol} = ${decimalFormatter(relative)} ${baseUnit?.symbol ?? baseUnit?.name}`}
                        </>
                      )
                    ) : (
                      'See formulas below'
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {unit.unitType ? unit.unitType.replace(/_/g, ' ') : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      {topPresets.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Popular conversions</h2>
              <p className="text-sm text-muted-foreground">
                These presets mirror the quick actions available inside the SwapUnits converter.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/#converter">
                Launch converter
                <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conversion</TableHead>
                <TableHead>Example</TableHead>
                <TableHead>Reference page</TableHead>
                <TableHead>Why it matters</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPresets.map((preset) => {
                const exampleValue = convertValue(info.category, 1, preset.fromUnit, preset.toUnit);
                const exampleText = exampleValue !== null
                  ? `1 ${preset.fromUnit} = ${decimalFormatter(exampleValue)} ${preset.toUnit}`
                  : 'Uses a dedicated formula—open the converter to calculate.';
                const pairUrl = buildConversionPairUrl(preset.category, preset.fromUnit, preset.toUnit);
                return (
                  <TableRow key={`${preset.category}-${preset.fromUnit}-${preset.toUnit}`}>
                    <TableCell className="font-medium text-foreground">{preset.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{exampleText}</TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm" className="rounded-full border-border/60">
                        <Link href={pairUrl} className="inline-flex items-center gap-1 text-xs font-semibold tracking-[0.2em]">
                          Open
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      Ideal for quick checks inside the live converter.
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      )}

      {info.faq.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Frequently asked questions</h2>
          <div className="space-y-4">
            {info.faq.map((item, index) => (
              <details
                key={index}
                className="group rounded-2xl border border-border/60 bg-background/80 px-4 py-3 transition"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground">
                  <span>{item.question}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-primary/40 bg-primary/5 px-6 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Ready to convert right now?</h2>
            <p className="text-sm text-muted-foreground">
              Head back to the SwapUnits converter to crunch numbers instantly and save your favorite presets.
            </p>
          </div>
          <Button asChild>
            <Link href="/#converter">
              Open the converter
              <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

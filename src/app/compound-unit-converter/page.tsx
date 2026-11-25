import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { getCategoryPath } from '@/lib/category-info';
import {
  COMPOUND_CATEGORIES,
  COMPOUND_CONVERTER_PATH,
  PREFIXED_UNIT_SYMBOLS,
  compoundConverterHref,
  convertCompoundQuery,
  describeAnswerParts,
} from '@/lib/compound-units';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/footer';
import { CategoryTopbarBridge } from '@/components/category-topbar-bridge';
import { CompoundConverter } from '@/components/compound-converter';

// The compound unit converter: expressions like kN/cm² or BTU/(h·ft²), worked out by
// lib/compound-units.ts. Static: ?q= is applied in the browser by CompoundConverter, and the
// examples are worked out here when the page is pre-rendered, so they match the converter.

const path = COMPOUND_CONVERTER_PATH;
const title = 'Compound Unit Converter';
const description =
  'Convert units built from other units: kN/cm² to MPa, kg·m/s² to N, BTU/(h·ft²) to W/m², L/min to gal/h. See the working, and why two units don\'t convert when they measure different things.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: {
    title: `${title} | SwapUnits`,
    description,
    url: path,
    siteName: 'SwapUnits',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | SwapUnits`,
    description,
  },
};

const joinAnd = (items: string[]) => `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const EXAMPLES = [
  '3 kN/cm² to MPa',
  '250 N/mm² to psi',
  '1 kgf/cm² to bar',
  '50 ft·lbf to N·m',
  '10 L/min to gal/h',
  '1 BTU/(h·ft²) to W/m²',
  '9.81 m/s² to ft/s²',
  '1 t/m³ to lb/ft³',
  '0.2 kWh/km to Wh/mi',
  '1 mPa·s to lb/(ft·s)',
];

const SYNTAX: Array<{ what: string; examples: string[]; text: string }> = [
  { what: 'Multiply', examples: ['kN·m', 'kN*m', 'kN m'], text: 'A dot, an asterisk or a space.' },
  { what: 'Divide', examples: ['N/mm²', 'N per mm²'], text: 'Everything after / is divided, so W/m·K means W/(m·K).' },
  { what: 'Powers', examples: ['m²', 'm2', 'm^2', 's^-1', 'square metre'], text: 'Whole numbers, negative ones included.' },
  { what: 'Brackets', examples: ['BTU/(h·ft²)', 'lb/(ft·s)'], text: 'Round or square brackets.' },
  {
    what: 'Prefixes',
    examples: ['mN', 'GPa', 'daN·m', 'µg', 'ug'],
    text: `SI prefixes on ${joinAnd(PREFIXED_UNIT_SYMBOLS)}.`,
  },
  {
    what: 'Case',
    examples: ['mW', 'MW', 'mPa', 'MPa'],
    text: 'Read as typed. An all-lowercase symbol that could be either (mw) gets both answers.',
  },
  {
    what: 'Names',
    examples: ['newtons per square millimetre', 'cubic feet per minute'],
    text: 'Unit names and the other spellings the finder knows.',
  },
];

export default function CompoundUnitConverterPage() {
  return (
    <div className="min-h-screen bg-background">
      <CategoryTopbarBridge />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="transition hover:text-primary-text">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span className="text-foreground">Compound unit converter</span>
            </li>
          </ol>
        </nav>

        <section className="space-y-3">
          <Badge variant="outline" className="rounded-full border-border/60 bg-primary/5 px-3 py-1 text-[0.7rem] font-semibold tracking-[0.25em] text-primary-text">
            Tool
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Compound unit converter</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Convert units built from other units, such as kN/cm² to MPa, kg·m/s² to N or L/min to gal/h, including
            combinations the regular converter doesn&apos;t list. Type an expression and SwapUnits works out the result
            from each unit&apos;s definition, shows the working, and explains when the two sides measure different things.
          </p>
        </section>

        <CompoundConverter />

        <section aria-labelledby="compound-examples" className="space-y-3">
          <h2 id="compound-examples" className="text-xl font-semibold text-foreground">
            Examples
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {EXAMPLES.map((example) => {
              const result = convertCompoundQuery(example);
              const right = result.ok ? describeAnswerParts(result.answers[0]).right : null;
              return (
                <li key={example}>
                  <Link
                    href={compoundConverterHref(example)}
                    scroll={false}
                    className="flex flex-col rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm transition hover:border-primary/60 hover:bg-primary/5"
                  >
                    <span className="font-medium text-foreground">{example}</span>
                    {right && <span className="text-muted-foreground">= {right}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-4" aria-labelledby="compound-syntax">
          <h2 id="compound-syntax" className="text-xl font-semibold text-foreground">
            How to type an expression
          </h2>
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
            {SYNTAX.map((row) => (
              <li key={row.what} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[7rem_1fr]">
                <span className="font-medium text-foreground">{row.what}</span>
                <span className="text-muted-foreground">
                  {row.examples.map((example, index) => (
                    <React.Fragment key={example}>
                      {index > 0 && ', '}
                      <span className="font-semibold text-foreground">{example}</span>
                    </React.Fragment>
                  ))}
                  . {row.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4" aria-labelledby="compound-coverage">
          <h2 id="compound-coverage" className="text-xl font-semibold text-foreground">
            What it covers
          </h2>
          <div className="space-y-3 rounded-2xl border border-border/60 bg-card px-4 py-4 text-sm text-muted-foreground">
            <p>
              Units built from length, mass, time and temperature in kelvin: every unit in the{' '}
              {COMPOUND_CATEGORIES.map((category, index) => (
                <React.Fragment key={category}>
                  {index > 0 && (index === COMPOUND_CATEGORIES.length - 1 ? ' and ' : ', ')}
                  <Link href={getCategoryPath(category)} className="font-semibold text-primary-text transition hover:text-primary-text/80">
                    {category.toLowerCase()}
                  </Link>
                </React.Fragment>
              ))}{' '}
              converters, plus SI-prefixed units such as mN, GPa or mJ.
            </p>
            <p>Not covered, each for a reason:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                °C and °F, because their scales start at an offset (0 °C is 273.15 K), so they can&apos;t be multiplied or
                divided. Use K for temperature differences: a 1 °C step is 1 K and a 1 °F step is 5/9 K. The{' '}
                <Link href={getCategoryPath('Temperature')} className="font-semibold text-primary-text transition hover:text-primary-text/80">
                  temperature converter
                </Link>{' '}
                handles temperatures.
              </li>
              <li>
                Fuel economy. Distance per volume works here (mi/gal to km/L), but L/100 km and the EPA&apos;s energy
                equivalents belong to the{' '}
                <Link href={getCategoryPath('Fuel Economy')} className="font-semibold text-primary-text transition hover:text-primary-text/80">
                  fuel economy converter
                </Link>
                .
              </li>
              <li>Currencies and data units, which have their own converters.</li>
              <li>Electrical and other units (A, V, Hz, mol, rpm), which need more base units than these four.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="compound-how">
          <h2 id="compound-how" className="text-xl font-semibold text-foreground">
            How it works
          </h2>
          <div className="space-y-3 rounded-2xl border border-border/60 bg-card px-4 py-4 text-sm text-muted-foreground">
            <p>
              Each unit is replaced by its size in SI base units (metre, kilogram, second, kelvin), so 1 kN/cm² becomes
              1,000 N ÷ (0.01 m)² = 10,000,000 Pa. The factors are the same exact definitions the rest of SwapUnits uses
              (1 lb = 0.45359237 kg, standard gravity 9.80665 m/s², 1 in = 2.54 cm), as listed in NIST SP 811.
            </p>
            <p>
              Two sides convert only when they have the same dimensions. kg/cm² is a mass per area, not a pressure: for
              pressure the unit is kgf/cm² (kilogram-force), and the converter suggests it. kWh is energy and kW is power,
              so they don&apos;t convert either.
            </p>
            <p>
              Energy and torque share their dimensions, so their numbers convert, but they are different quantities.
              SwapUnits writes torque in N·m and energy in J; see{' '}
              <Link href="/unit-notations" className="font-semibold text-primary-text transition hover:text-primary-text/80">
                unit notations
              </Link>{' '}
              for this and other look-alikes.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text transition hover:text-primary-text/80"
          >
            Back to the unit converter
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
      <Footer />
    </div>
  );
}

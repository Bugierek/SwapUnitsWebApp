import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import type { UnitCategory } from '@/types';
import { unitData } from '@/lib/unit-data';
import { getCategoryPath, getCategorySlug } from '@/lib/category-info';
import { COMPOUND_CONVERTER_PATH } from '@/lib/compound-units';
import { getCategoryDefaultPair } from '@/lib/category-defaults';
import { buildConversionPairUrl } from '@/lib/conversion-pairs';
import { listNotationSections } from '@/lib/unit-notations';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/footer';
import { CategoryTopbarBridge } from '@/components/category-topbar-bridge';

// Reference page for unit notations: the same unit written another way (N/mm² = MPa, cc = cm³),
// built from the notations in unit-data.ts, plus a hand-written list of look-alike units that are
// not the same. Static: no search params, nothing per request.

const path = '/unit-notations';
const title = 'Unit Notations: Same Unit, Different Names';
const description =
  'N/mm² is the same as MPa, cc is a cubic centimetre, kph is km/h and J/s is a watt. A reference of alternative unit notations, and of look-alike units that are not the same.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: {
    title: `${title} | SwapUnits`,
    description,
    url: path,
    siteName: 'SwapUnits',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | SwapUnits`,
    description,
  },
};


// A pair page for the unit: to the category's usual partner unit (or from it, for that unit itself).
const unitPairUrl = (category: UnitCategory, symbol: string): string | null => {
  const pair = getCategoryDefaultPair(category);
  const partner = pair ? (pair.toUnit === symbol ? pair.fromUnit : pair.toUnit) : null;
  const other = partner && partner !== symbol
    ? partner
    : unitData[category].units.find((unit) => unit.symbol !== symbol)?.symbol;
  return other ? buildConversionPairUrl(category, symbol, other) : null;
};

type LookAlike = {
  title: string;
  text: string;
  link?: { label: string; href: string };
};

// Units that look or sound alike but are not the same. Values from the definitions in unit-data.ts.
const LOOK_ALIKES: LookAlike[] = [
  {
    title: 'N·m (torque) and J (energy)',
    text: 'Both are a newton times a metre, but torque is a turning force and energy is work done. The SI Brochure writes torque in N·m and never in joules, so SwapUnits keeps them in separate categories.',
    link: { label: 'Torque units', href: getCategoryPath('Torque') },
  },
  {
    title: 'kW (power) and kWh (energy)',
    text: 'A kilowatt is a rate. A kilowatt-hour is the energy used at 1 kW for one hour: a 2 kW heater running for 3 hours uses 6 kWh.',
    link: { label: 'Power units', href: getCategoryPath('Power') },
  },
  {
    title: 'mW and MW',
    text: 'A milliwatt is a thousandth of a watt and a megawatt a million watts, 10⁹ times more. Typed all in lowercase, "mw" means milliwatts on SwapUnits.',
    link: { label: 'mW to W', href: buildConversionPairUrl('Power', 'mW', 'W') },
  },
  {
    title: 'MB, Mb and Mbps',
    text: 'A capital B is the byte and a lowercase b the bit, 8 times smaller: 100 Mb/s (Mbps) moves 12.5 MB per second. Typed all in lowercase, "mb/s" means megabytes on SwapUnits.',
    link: { label: 'Mbps to MB/s', href: buildConversionPairUrl('Data Transfer Rate', 'Mbps', 'MB/s') },
  },
  {
    title: 'KB and KiB',
    text: '1 KB is 1,000 bytes and 1 KiB is 1,024 bytes. Drive makers use the first, Windows shows the second, which is why a 2 TB drive appears as about 1.82 TB.',
    link: { label: 'TB to GiB', href: buildConversionPairUrl('Data Storage', 'TB', 'GiB') },
  },
  {
    title: 'Cal, kcal and cal',
    text: 'The food Calorie (Cal, capital C) is a kilocalorie, 4,184 J. The small calorie (cal) is 1,000 times smaller.',
    link: { label: 'kcal to kJ', href: buildConversionPairUrl('Energy', 'kcal', 'kJ') },
  },
  {
    title: 'Tonne, short ton and long ton',
    text: 'A tonne (t) is 1,000 kg, a US short ton 907.18 kg and a UK long ton 1,016.05 kg.',
    link: { label: 'ton (US) to t', href: buildConversionPairUrl('Mass', 'ton (US)', 't') },
  },
  {
    title: 'US and imperial gallons, pints and fluid ounces',
    text: 'A US gallon is 3.785 L and an imperial gallon 4.546 L. A US fluid ounce is 29.57 mL and an imperial one 28.41 mL, so a US pint (16 fl oz) is 473 mL and an imperial pint (20 fl oz) 568 mL.',
    link: { label: 'gal (UK) to gal', href: buildConversionPairUrl('Volume', 'gal (UK)', 'gal') },
  },
  {
    title: 'MPG (US) and MPG (UK)',
    text: 'UK miles per gallon use the larger imperial gallon, so the same car scores about 20% higher: 30 MPG (US) is about 36 MPG (UK).',
    link: { label: 'MPG (US) to MPG (UK)', href: buildConversionPairUrl('Fuel Economy', 'MPG (US)', 'MPG (UK)') },
  },
  {
    title: 'mmHg and Torr',
    text: 'Nearly equal but not the same: 1 Torr is 1/760 of a standard atmosphere (133.322368 Pa) and 1 mmHg is 133.322387 Pa, about 0.14 parts per million more.',
    link: { label: 'mmHg to Torr', href: buildConversionPairUrl('Pressure', 'mmHg', 'Torr') },
  },
  {
    title: 'hp and PS',
    text: 'Mechanical horsepower (hp) is about 745.7 W and metric horsepower (PS, CV) 735.5 W, so 100 PS is about 98.6 hp.',
    link: { label: 'PS to hp', href: buildConversionPairUrl('Power', 'PS', 'hp') },
  },
];

export default function UnitNotationsPage() {
  const sections = listNotationSections();

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
              <span className="text-foreground">Unit notations</span>
            </li>
          </ol>
        </nav>

        <section className="space-y-3 rounded-3xl border border-border/60 bg-card px-6 py-8 shadow-lg">
          <Badge variant="outline" className="rounded-full border-border/60 bg-primary/5 px-3 py-1 text-[0.7rem] font-semibold tracking-[0.25em] text-primary-text">
            Reference
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Unit notations: same unit, different names
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Many units are written more than one way. N/mm² is exactly a megapascal, cc is a cubic centimetre and
            kph is km/h. These are the same units, not conversions, and the SwapUnits finder understands every
            notation below. Further down are units that look alike but are not the same.
          </p>
        </section>

        {sections.map(({ category, rows }) => {
          const categoryName = unitData[category].name;
          return (
            <section key={category} className="space-y-4" aria-labelledby={`notations-${getCategorySlug(category)}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id={`notations-${getCategorySlug(category)}`} className="text-xl font-semibold text-foreground">
                  {categoryName}
                </h2>
                <Link
                  href={getCategoryPath(category)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text transition hover:text-primary-text/80"
                >
                  {categoryName} converter
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
                {rows.map(({ unit, notations, sameAs }) => {
                  const pairUrl = unitPairUrl(category, unit.symbol);
                  return (
                    <li key={unit.symbol} className="space-y-2 px-4 py-3">
                      <p className="font-medium text-foreground">
                        {pairUrl ? (
                          <Link href={pairUrl} className="transition hover:text-primary-text">
                            {unit.name} ({unit.symbol})
                          </Link>
                        ) : (
                          `${unit.name} (${unit.symbol})`
                        )}
                      </p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {notations.map((notation) => (
                          <li key={notation.text}>
                            <span className="font-mono font-semibold text-foreground">{notation.text}</span>{' '}
                            {notation.why}
                          </li>
                        ))}
                        {sameAs.map((other) => (
                          <li key={other.symbol}>
                            Same unit as <span className="font-mono font-semibold text-foreground">{other.symbol}</span>{' '}
                            ({other.name}): 1 {unit.symbol} = 1 {other.symbol} exactly.
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <section className="space-y-4" aria-labelledby="look-alikes">
          <div className="space-y-1">
            <h2 id="look-alikes" className="text-xl font-semibold text-foreground">
              Look alike, but not the same
            </h2>
            <p className="text-sm text-muted-foreground">
              Units that are easy to mix up, and by how much they differ.
            </p>
          </div>
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
            {LOOK_ALIKES.map((item) => (
              <li key={item.title} className="space-y-1 px-4 py-3">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  {item.text}
                  {item.link && (
                    <>
                      {' '}
                      <Link href={item.link.href} className="font-semibold text-primary-text transition hover:text-primary-text/80">
                        {item.link.label}
                      </Link>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2 rounded-2xl border border-border/60 bg-card px-4 py-4 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">How the finder reads them</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Type a notation the way you would write it: &quot;5 N/mm2 to psi&quot;, &quot;250 cc to ml&quot;,
              &quot;100 kph to mph&quot;. Powers can be typed as 2 or ^2, and the dot in W·s as nothing, a space or *.
            </li>
            <li>
              Case matters where it changes the unit: Mb/s is megabits and MB/s megabytes, Cal is a kilocalorie and
              cal a calorie, mW is a milliwatt and MW a megawatt.
            </li>
            <li>
              Typed all in lowercase, an ambiguous symbol keeps one meaning: mb/s is megabytes, mw is milliwatts, mg is
              milligrams.
            </li>
            <li>
              For a unit built from others that isn&apos;t listed (kN/cm², BTU/(h·ft²), L/min), use the{' '}
              <Link href={COMPOUND_CONVERTER_PATH} className="font-semibold text-primary-text transition hover:text-primary-text/80">
                compound unit converter
              </Link>
              .
            </li>
          </ul>
        </section>
      </div>
      <Footer />
    </div>
  );
}

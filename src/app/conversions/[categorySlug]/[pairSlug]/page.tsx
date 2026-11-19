import * as React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  listAllConversionPairs,
  resolveConversionPairPage,
  type ResolvedConversionPairPage,
} from '@/lib/conversion-pairs';
import { getUnitsForCategory, getPresetsForCategory } from '@/lib/unit-data';
import { convertNumericValue } from '@/lib/conversion-math';
import { fetchFxRates, type CurrencyCode, type FxRatesResponse } from '@/lib/fx';
import { getConversionRelation, type FxContext } from '@/lib/conversion-formula';
import {
  buildCurrencyRateSentence,
  buildFormulaInsight,
  buildPairDescription,
  buildPairFaq,
  buildPairTitle,
  buildQuickTableHint,
  type PairCopyInput,
} from '@/lib/pair-metadata';
import type { UnitCategory } from '@/types';
import { ConversionPairPageContent } from '@/components/conversion-pair-page-content';
import { buildBreadcrumbJsonLd, buildFaqJsonLd } from '@/lib/structured-data';

type PageParams = {
  categorySlug: string;
  pairSlug: string;
}

const sampleMultipliers: number[] = [0.25, 0.5, 1, 2, 5, 10, 25, 100];
const temperatureSampleSet: number[] = [-40, -10, 0, 32, 68, 100];
const fuelEconomySampleSet: number[] = [2, 4, 6, 8, 10, 15, 20];
const currencySampleSet: number[] = [1, 5, 10, 20, 50, 100, 500, 1000];

const buildSampleValues = (category: UnitCategory): number[] => {
  if (category === 'Temperature') {
    return temperatureSampleSet;
  }
  if (category === 'Fuel Economy') {
    return fuelEconomySampleSet;
  }
  if (category === 'Currency') {
    return currencySampleSet;
  }
  return sampleMultipliers;
};

// Same symbol list (and order) PairConverter sends to /api/fx, so the server render and the
// API route share one cached Frankfurter response.
const FX_SYMBOLS = getUnitsForCategory('Currency')
  .map((unit) => unit.symbol as CurrencyCode)
  .filter((code) => code !== 'EUR');
const FX_TIMEOUT_MS = 3000;

// Latest ECB rates for currency pages. fetchFxRates caches for 1 hour (next.revalidate), so pages
// pick up new rates hourly. Any failure or a slow response falls back to client-side loading.
// cache() shares one request between generateMetadata and the page.
const getServerFxRates = React.cache(async (): Promise<FxRatesResponse | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), FX_TIMEOUT_MS);
    });
    const data = await Promise.race([fetchFxRates('EUR', FX_SYMBOLS), timeout]);
    if (!data || typeof data.date !== 'string' || !data.rates || typeof data.rates !== 'object') {
      return null;
    }
    return data;
  } catch (error) {
    console.error('Server FX fetch failed (pair page):', error);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
});

const buildPairCopyInput = async (resolved: ResolvedConversionPairPage): Promise<{
  copy: PairCopyInput;
  fxRates: FxRatesResponse | null;
}> => {
  const { categoryInfo, fromUnit, toUnit } = resolved;
  const category = categoryInfo.category;
  const fxRates = category === 'Currency' ? await getServerFxRates() : null;
  const fxContext: FxContext | null = fxRates
    ? { base: fxRates.base as CurrencyCode, rates: fxRates.rates }
    : null;
  return {
    fxRates,
    copy: {
      category,
      from: { symbol: fromUnit.symbol, name: fromUnit.name },
      to: { symbol: toUnit.symbol, name: toUnit.name },
      relation: getConversionRelation(category, fromUnit.symbol, toUnit.symbol, fxContext),
      reverseRelation: getConversionRelation(category, toUnit.symbol, fromUnit.symbol, fxContext),
      fxContext,
      fxDate: fxRates?.date ?? null,
    },
  };
};

// Every canonical pair page is pre-rendered at build time and served as static HTML:
// - force-static: the root layout reads the theme cookie, and any cookies() call makes a route
//   dynamic (rendered per request, "private, no-store"). Under force-static, cookies() returns
//   nothing here; the layout's inline theme script still applies the theme saved in localStorage
//   before first paint.
// - Nothing on this page reads searchParams. PairConverter applies ?value=, ?fxMode= and ?fxDate=
//   in the browser after hydration.
// - Currency pages are ISR: fetchFxRates uses next.revalidate = 3600, which caps those pages'
//   revalidate at 1 hour. Other pages fetch nothing and stay static until the next deploy.
// - dynamicParams = false: a slug that isn't canonical (degc-to-degf, usd-to-eur) or doesn't exist
//   isn't rendered here. Next falls through to ../[...slug]/page.tsx, which renders per request so
//   it can 308 to the canonical slug with the query string intact, or 404.
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return listAllConversionPairs().map(({ categorySlug, pairSlug }) => ({
    categorySlug,
    pairSlug,
  }));
}

// Next 15 passes params as a promise.
type PageProps = {
  params: Promise<PageParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug, pairSlug } = await params;
  const resolved = resolveConversionPairPage(categorySlug, pairSlug);
  if (!resolved) {
    return {};
  }

  const { copy } = await buildPairCopyInput(resolved);
  // The root layout's "%s | SwapUnits" template adds the brand to <title> only; the OG and
  // Twitter titles don't get the template, so they carry the brand explicitly.
  const title = buildPairTitle(copy);
  const brandedTitle = `${title} | SwapUnits`;
  const description = buildPairDescription(copy);

  return {
    title,
    description,
    alternates: {
      canonical: resolved.canonicalPath,
    },
    openGraph: {
      title: brandedTitle,
      description,
      url: resolved.canonicalPath,
      siteName: 'SwapUnits',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: brandedTitle,
      description,
    },
  };
}

export default async function ConversionPairPage({ params }: PageProps) {
  const { categorySlug, pairSlug } = await params;

  const resolved = resolveConversionPairPage(categorySlug, pairSlug);
  if (!resolved) {
    notFound();
  }

  // Only canonical slugs are rendered here (dynamicParams = false); variants such as degc-to-degf
  // are redirected, with their query string, by ../[...slug]/page.tsx. One exception: on a
  // case-insensitive filesystem (macOS, not the Linux servers App Hosting runs), a request for
  // degc-to-degf finds degC-to-degF's cached files, is served that page, and re-renders it in the
  // background under the lowercase slug. Whatever that render returned would be written over the
  // canonical page's cache files (a redirect would also lose its Location header in the cache),
  // so it fails instead: Next keeps the existing cache entry when a revalidation throws.
  if (!resolved.isCanonical) {
    throw new Error(`Pair page rendered for non-canonical slug "${pairSlug}" (expected "${resolved.canonicalSlug}")`);
  }

  const { categoryInfo, fromUnit: fromUnitDetails, toUnit: toUnitDetails, canonicalPath } = resolved;
  const category = categoryInfo.category;
  const { copy, fxRates } = await buildPairCopyInput(resolved);

  // Use the canonical symbols from our data so calculations resolve (e.g., µ-prefixed units).
  const resolvedFromSymbol = fromUnitDetails.symbol;
  const resolvedToSymbol = toUnitDetails.symbol;
  const fxContext = copy.fxContext ?? undefined;

  const buildRows = (from: string, to: string) =>
    buildSampleValues(category)
      .map((sample) => {
        const converted = convertNumericValue(category, from, to, sample, fxContext);
        if (converted === null) return null;
        return {
          input: sample,
          output: converted,
        };
      })
      .filter((row): row is { input: number; output: number } => row !== null)
      .slice(0, 10);

  const exampleRows = buildRows(resolvedFromSymbol, resolvedToSymbol);
  const reverseExampleRows = buildRows(resolvedToSymbol, resolvedFromSymbol);

  const otherUnits = getUnitsForCategory(category).filter(
    (unit) => unit.symbol !== resolvedFromSymbol && unit.symbol !== resolvedToSymbol,
  );

  const navbarPresets = getPresetsForCategory(category).slice(0, 12);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: categoryInfo.title, url: `/measurements/${categoryInfo.slug}` },
    { name: `${resolvedFromSymbol} to ${resolvedToSymbol}`, url: canonicalPath },
  ]);

  const faqJsonLd = buildFaqJsonLd(buildPairFaq(copy));

  // Latest rates seed the live converter, so the HTML shows the converted value. Historical links
  // (?fxMode=historical&fxDate=...) switch to their date in the browser.
  const initialFxRates = category === 'Currency' ? fxRates : null;
  // When this HTML was rendered. ISR serves a stale page once before regenerating it in the
  // background (and a cold-started server starts from the build-time HTML), so PairConverter
  // refetches rates when the page is older than the 1-hour revalidate window.
  const initialFxRatesRenderedAt = initialFxRates ? Date.now() : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <ConversionPairPageContent
        categoryInfo={categoryInfo}
        fromSymbol={resolvedFromSymbol}
        toSymbol={resolvedToSymbol}
        fromUnit={{ symbol: resolvedFromSymbol, name: fromUnitDetails.name }}
        toUnit={{ symbol: resolvedToSymbol, name: toUnitDetails.name }}
        formulaInsight={buildFormulaInsight(copy)}
        quickTableHint={buildQuickTableHint(copy)}
        rateSummary={category === 'Currency' ? buildCurrencyRateSentence(copy) : null}
        exampleRows={exampleRows}
        reverseExampleRows={reverseExampleRows}
        otherUnits={otherUnits.map((unit) => ({ symbol: unit.symbol, name: unit.name }))}
        navbarPresets={navbarPresets}
        initialFxRates={initialFxRates}
        initialFxRatesRenderedAt={initialFxRatesRenderedAt}
      />
    </>
  );
}

import * as React from 'react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getCategoryInfoBySlug, type CategoryInfo } from '@/lib/category-info';
import { listAllConversionPairs, resolveConversionPairSlug } from '@/lib/conversion-pairs';
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
import type { Unit, UnitCategory } from '@/types';
import { ConversionPairPageContent } from '@/components/conversion-pair-page-content';
import { buildBreadcrumbJsonLd, buildFaqJsonLd } from '@/lib/structured-data';

type PageParams = {
  categorySlug: string;
  pairSlug: string;
}

type SearchParamsInput = { [key: string]: string | string[] | undefined } | undefined;

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

type ResolvedPairPage = {
  categoryInfo: CategoryInfo;
  fromUnit: Unit;
  toUnit: Unit;
  canonicalSlug: string;
  canonicalPath: string;
  isCanonical: boolean;
};

// Shared by generateMetadata and the page so both resolve the same units and canonical slug.
const resolvePairPage = (categorySlug: string, pairSlug: string): ResolvedPairPage | null => {
  const categoryInfo = getCategoryInfoBySlug(categorySlug);
  if (!categoryInfo || categoryInfo.category === 'SI Prefixes') {
    return null;
  }
  const pair = resolveConversionPairSlug(categoryInfo.category, pairSlug);
  if (!pair) {
    return null;
  }
  return {
    categoryInfo,
    fromUnit: pair.fromUnit,
    toUnit: pair.toUnit,
    canonicalSlug: pair.canonicalSlug,
    canonicalPath: `/conversions/${categoryInfo.slug}/${pair.canonicalSlug}`,
    isCanonical: pair.isCanonical,
  };
};

const buildPairCopyInput = async (resolved: ResolvedPairPage): Promise<{
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

const readSearchParam = (searchParams: SearchParamsInput, key: string): string | undefined => {
  const raw = searchParams?.[key];
  return Array.isArray(raw) ? raw[0] : raw;
};

const toQueryString = (searchParams: SearchParamsInput): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value !== undefined) {
      query.append(key, value);
    }
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

export function generateStaticParams() {
  return listAllConversionPairs().map(({ categorySlug, pairSlug }) => ({
    categorySlug,
    pairSlug,
  }));
}

// Next 15 passes params and searchParams as promises.
type PageProps = {
  params: Promise<PageParams>;
  searchParams?: Promise<SearchParamsInput>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug, pairSlug } = await params;
  const resolved = resolvePairPage(categorySlug, pairSlug);
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

export default async function ConversionPairPage({ params, searchParams }: PageProps) {
  const { categorySlug, pairSlug } = await params;
  const resolvedSearchParams = await searchParams;

  const resolved = resolvePairPage(categorySlug, pairSlug);
  if (!resolved) {
    notFound();
  }

  // Lowercase, URL-encoded or raw-symbol variants (e.g. degc-to-degf, %C2%B5m-to-mm) 308 to the
  // one canonical slug, keeping the query string (value, fxDate, fxMode).
  if (!resolved.isCanonical) {
    permanentRedirect(`${resolved.canonicalPath}${toQueryString(resolvedSearchParams)}`);
  }

  const normalizedValue = readSearchParam(resolvedSearchParams, 'value');
  const parsedInitialValue = normalizedValue !== undefined ? Number(normalizedValue) : undefined;
  const initialValue = parsedInitialValue !== undefined && Number.isFinite(parsedInitialValue)
    ? parsedInitialValue
    : undefined;
  const initialFxDate = (() => {
    const raw = readSearchParam(resolvedSearchParams, 'fxDate');
    if (!raw) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const d = new Date(raw + 'T00:00:00Z');
    return Number.isNaN(d.getTime()) ? null : d;
  })();
  const initialFxMode = readSearchParam(resolvedSearchParams, 'fxMode') === 'historical' ? 'historical' : 'latest';

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

  // Only seed the live converter with server rates when it will show latest rates anyway;
  // historical links (?fxMode=historical&fxDate=...) keep loading their own date client-side.
  const initialFxRates = category === 'Currency' && initialFxMode === 'latest' && !initialFxDate
    ? fxRates
    : null;

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
        initialValue={initialValue}
        initialFxDate={initialFxDate}
        initialFxMode={initialFxMode}
        initialFxRates={initialFxRates}
      />
    </>
  );
}

import { notFound, permanentRedirect } from 'next/navigation';
import { resolveConversionPairPage } from '@/lib/conversion-pairs';

// Fallback for /conversions/<category>/<anything> that isn't a pre-rendered pair page.
// ../[pairSlug]/page.tsx sets dynamicParams = false, so a slug missing from its
// generateStaticParams isn't rendered there: Next moves on to the next matching route, which is
// this catch-all. It renders per request (it reads searchParams), so:
// - lowercase, URL-encoded or raw-symbol variants (degc-to-degf, usd-to-eur, %C2%B5m-to-mm) 308
//   to the canonical slug, keeping the query string (value, fxDate, fxMode);
// - anything else (unknown units or categories, extra path segments) gets the 404 page.

type SearchParamsInput = { [key: string]: string | string[] | undefined };

type PageProps = {
  params: Promise<{ categorySlug: string; slug: string[] }>;
  searchParams: Promise<SearchParamsInput>;
};

const toQueryString = (searchParams: SearchParamsInput): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value !== undefined) {
      query.append(key, value);
    }
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

export default async function ConversionPairFallbackPage({ params, searchParams }: PageProps) {
  const { categorySlug, slug } = await params;
  const resolved = slug.length === 1 ? resolveConversionPairPage(categorySlug, slug[0]) : null;

  // A canonical slug that lands here wasn't pre-rendered; redirecting it to itself would loop.
  if (!resolved || resolved.isCanonical) {
    notFound();
  }

  permanentRedirect(`${resolved.canonicalPath}${toQueryString(await searchParams)}`);
}

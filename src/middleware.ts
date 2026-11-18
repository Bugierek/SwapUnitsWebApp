import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { categoryInfoList } from '@/lib/category-info';

// Category subdomains are shortcuts, not separate sites:
//   length.swapunits.com/      -> 308 swapunits.com/measurements/length-conversion
//   <any subdomain>/some/path  -> 308 swapunits.com/some/path   (includes www and unknown names)
// Content deliberately lives only on the apex domain: localStorage (favorites, history, theme) is
// per hostname, and canonicals, the sitemap and internal links all point at the apex.
//
// Requires, per base domain: a wildcard `*` A record at the DNS provider pointing at the App
// Hosting IP, and `*.<domain>` connected as a custom domain on the App Hosting backend.
//
// This file must stay in src/ - with a src/app layout, Next ignores a root-level middleware.ts.
//
// No *.localhost support: Next turns redirects to localhost into relative URLs, which would
// loop on length.localhost. To test locally, send the header instead:
//   curl -sI -H "X-Forwarded-Host: length.swapunits.com" http://localhost:3000/

const BASE_DOMAINS = ['swapunits.com', 'unitswap.xyz'] as const;

const CONVERSION_SUFFIX = '-conversion';

// "length" -> "length-conversion", "fuel-economy" -> "fuel-economy-conversion", ...
const CATEGORY_SLUG_BY_SUBDOMAIN = new Map(
  categoryInfoList
    .filter((info) => info.slug.endsWith(CONVERSION_SUFFIX))
    .map((info) => [info.slug.slice(0, -CONVERSION_SUFFIX.length), info.slug]),
);

function getPublicHost(req: NextRequest): string {
  // App Hosting passes the hostname the visitor used in X-Forwarded-Host.
  const raw = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
  return raw.split(',')[0].trim().toLowerCase();
}

export function middleware(req: NextRequest) {
  const hostname = getPublicHost(req).split(':')[0];
  const base = BASE_DOMAINS.find((domain) => hostname === domain || hostname.endsWith(`.${domain}`));

  // Apex requests, and hosts that aren't ours (e.g. the *.hosted.app default URL), pass through.
  if (!base || hostname === base) {
    return NextResponse.next();
  }

  const subdomain = hostname.slice(0, -(base.length + 1));
  const { pathname, search } = req.nextUrl;
  const categorySlug = CATEGORY_SLUG_BY_SUBDOMAIN.get(subdomain);
  const targetPath = categorySlug && pathname === '/' ? `/measurements/${categorySlug}` : pathname;

  // Redirect targets are always one of BASE_DOMAINS, never the incoming host, so a spoofed
  // header can't turn this into an open redirect.
  return NextResponse.redirect(`https://${base}${targetPath}${search}`, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

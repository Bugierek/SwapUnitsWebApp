import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { categoryInfoList } from './src/lib/category-info';

// Hosts that should not be rewritten (root/main domains)
const MAIN_HOSTS = new Set([
  'swapunits.com',
  'www.swapunits.com',
  'unitswap.xyz',
  'www.unitswap.xyz',
  'localhost',
  '127.0.0.1',
]);

// Build allowed category slugs from existing data
const CATEGORY_SLUGS = new Set(categoryInfoList.map((c) => c.slug.toLowerCase()));

export function middleware(req: NextRequest) {
  const hostname = req.nextUrl.hostname.toLowerCase();
  const path = req.nextUrl.pathname.toLowerCase();

  // Determine the base domain for redirects
  const getBaseDomain = (host: string): string => {
    if (host.includes('unitswap.xyz')) return 'unitswap.xyz';
    if (host.includes('swapunits.com')) return 'swapunits.com';
    return 'swapunits.com'; // fallback
  };

  // If on the primary domain and user hits a category path, redirect to the subdomain so the URL shows e.g. mass.unitswap.xyz
  if (MAIN_HOSTS.has(hostname)) {
    const match = path.match(/^\/measurements\/([^/]+)(\/.*)?$/);
    if (match) {
      const slug = match[1];
      if (CATEGORY_SLUGS.has(slug)) {
        const baseDomain = getBaseDomain(hostname);
        const redirectUrl = new URL(req.url);
        redirectUrl.hostname = `${slug}.${baseDomain}`;
        redirectUrl.pathname = '/';
        return NextResponse.redirect(redirectUrl, 308);
      }
    }
    return NextResponse.next();
  }

  // Extract subdomain (e.g., "mass" from mass.unitswap.xyz)
  const parts = hostname.split('.');
  // Handle both mass.unitswap.xyz (3 parts) and mass.localhost (2 parts for local dev)
  const subdomain = parts.length >= 3 ? parts[0] : (parts.length === 2 && !MAIN_HOSTS.has(hostname) ? parts[0] : null);
  
  if (subdomain && CATEGORY_SLUGS.has(subdomain)) {
    const url = req.nextUrl.clone();
    url.pathname = `/measurements/${subdomain}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

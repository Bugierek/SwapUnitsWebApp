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
        // Strip "-conversion" suffix for subdomain (mass-conversion -> mass)
        const subdomainName = slug.replace(/-conversion$/, '');
        redirectUrl.hostname = `${subdomainName}.${baseDomain}`;
        redirectUrl.pathname = '/';
        return NextResponse.redirect(redirectUrl, 308);
      }
    }
    return NextResponse.next();
  }

  // Extract subdomain (e.g., "mass" from mass.unitswap.xyz)
  const parts = hostname.split('.');
  let subdomain: string | null = null;
  
  // For 3+ parts (mass.unitswap.xyz, mass.swapunits.com), subdomain is first part
  if (parts.length >= 3) {
    const candidate = parts[0];
    // Exclude www subdomain
    if (candidate !== 'www') {
      subdomain = candidate;
    }
  }
  // For 2 parts in local dev (mass.localhost), subdomain is first part
  else if (parts.length === 2 && !MAIN_HOSTS.has(hostname)) {
    subdomain = parts[0];
  }
  
  if (subdomain) {
    // Add "-conversion" suffix to match category slug format
    const fullSlug = `${subdomain}-conversion`;
    
    if (CATEGORY_SLUGS.has(fullSlug)) {
      // Only rewrite root path (/) to /measurements/[slug]
      // Allow other paths like /conversions/..., /widget, etc. to work normally
      if (path === '/' || path === '') {
        const url = req.nextUrl.clone();
        url.pathname = `/measurements/${fullSlug}`;
        return NextResponse.rewrite(url);
      }
      // For other paths on valid category subdomains, just pass through
      return NextResponse.next();
    }
    
    // If subdomain doesn't match a category, redirect to main domain
    const baseDomain = getBaseDomain(hostname);
    const redirectUrl = new URL(req.url);
    redirectUrl.hostname = baseDomain;
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

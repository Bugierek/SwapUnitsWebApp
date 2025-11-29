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

  if (MAIN_HOSTS.has(hostname)) {
    return NextResponse.next();
  }

  // Extract subdomain (e.g., "mass" from mass.swapunits.com)
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    if (CATEGORY_SLUGS.has(sub)) {
      const url = req.nextUrl.clone();
      url.pathname = `/measurements/${sub}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getCategoryInfo } from '@/lib/category-info';

// page.tsx reads query params with useSearchParams() during render. Statically prerendered, that
// would bail out to client-only rendering (empty server HTML), so keep this route per-request.
export const dynamic = 'force-dynamic';

// page.tsx is a client component, so the route's metadata lives here. Without it this page
// inherited the homepage's title and canonical. Copy comes from the SI Prefixes category info.
const { seo } = getCategoryInfo('SI Prefixes');
const path = '/standards/nist-si-tenfold';

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  keywords: seo.keywords,
  alternates: { canonical: path },
  openGraph: {
    title: `${seo.title} | SwapUnits`,
    description: seo.description,
    url: path,
    siteName: 'SwapUnits',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${seo.title} | SwapUnits`,
    description: seo.description,
  },
};

export default function SiTenfoldLayout({ children }: { children: ReactNode }) {
  return children;
}

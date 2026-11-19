import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildWidgetBuilderJsonLd } from '@/lib/structured-data';

// page.tsx is a client component, so the route's metadata lives here. (The old head.tsx was
// ignored by the App Router, so this page used to inherit the homepage's title and canonical,
// and its SoftwareApplication JSON-LD never rendered.)
const title = 'Build a Custom Unit Converter Widget';
const description =
  'Select categories and units to generate an embeddable SwapUnits widget. Copy the iframe code and add a Powered by SwapUnits badge.';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://swapunits.com';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/widget-builder' },
  openGraph: {
    title: `${title} | SwapUnits`,
    description,
    url: '/widget-builder',
    siteName: 'SwapUnits',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | SwapUnits`,
    description,
  },
};

export default function WidgetBuilderLayout({ children }: { children: ReactNode }) {
  const jsonLd = buildWidgetBuilderJsonLd(`${siteUrl}/widget-builder`);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}

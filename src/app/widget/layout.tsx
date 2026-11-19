import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// page.tsx is a client component, so the route's metadata lives here. (The old head.tsx was
// ignored by the App Router, so this page used to inherit the homepage's title and canonical.)
const title = 'Embeddable Unit Converter Widget';
const description =
  'Lightweight widget to embed unit conversions on your site. Choose categories and units, swap quickly, and copy results.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/widget' },
  openGraph: {
    title: `${title} | SwapUnits`,
    description,
    url: '/widget',
    siteName: 'SwapUnits',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | SwapUnits`,
    description,
  },
};

export default function WidgetLayout({ children }: { children: ReactNode }) {
  return children;
}

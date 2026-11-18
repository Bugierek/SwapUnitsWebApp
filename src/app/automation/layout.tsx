import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

// The /automation page is a UI for scripts/automation/add-conversion-pair.mjs (via
// /api/automation), which only works against a local checkout. page.tsx is a client
// component, so the dev-only gate lives here in a server layout instead.
export default function AutomationLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }
  return children;
}

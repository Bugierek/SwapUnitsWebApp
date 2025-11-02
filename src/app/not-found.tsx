'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you are trying to reach doesn&apos;t exist. Check the address or head back to the converter.
      </p>
      <Button asChild>
        <Link href="/">Return to SwapUnits</Link>
      </Button>
    </main>
  );
}

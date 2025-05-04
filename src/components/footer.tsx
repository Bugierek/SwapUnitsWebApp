
import * as React from 'react';
import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-muted/40 mt-auto"> {/* Use mt-auto if layout uses flex column */}
      <div className="container mx-auto py-6 px-4 md:px-6 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear} Unitopia. All rights reserved.</p>
        {/* Optional: Add more links if needed */}
        {/* <div className="flex justify-center gap-4 mt-2">
          <Link href="/privacy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
        </div> */}
      </div>
    </footer>
  );
}

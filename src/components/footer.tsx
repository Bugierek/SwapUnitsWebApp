
'use client'; // Convert to client component for useEffect and useState

import * as React from 'react';
import Link from 'next/link';
import { useState, useEffect } from 'react'; // Import hooks

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [visitCount, setVisitCount] = useState<number | null>(null);

  useEffect(() => {
    // Ensure this code runs only on the client
    if (typeof window !== 'undefined') {
      let count = 0;
      try {
        const storedCount = localStorage.getItem('unitopiaVisitCount');
        count = storedCount ? parseInt(storedCount, 10) : 0;
        if (isNaN(count)) {
            count = 0; // Reset if parsing fails
        }
      } catch (error) {
        console.error("Error reading localStorage:", error);
        count = 0; // Fallback if localStorage is restricted or fails
      }

      // Increment count for the new visit
      const newCount = count + 1;

      // Update state and store the new count
      setVisitCount(newCount);
      try {
        localStorage.setItem('unitopiaVisitCount', String(newCount));
      } catch (error) {
        console.error("Error writing to localStorage:", error);
        // Continue without storing if localStorage fails
      }
    }
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <footer className="w-full border-t bg-muted/40 mt-auto"> {/* Use mt-auto if layout uses flex column */}
      <div className="container mx-auto py-6 px-4 md:px-6 text-center text-sm text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-2">
        <p>&copy; {currentYear} Unitopia. All rights reserved.</p>
        {/* Display Visit Counter */}
        <div>
          {visitCount !== null ? (
            <p>Visits: {visitCount.toLocaleString()}</p>
          ) : (
            <p>Loading visits...</p> // Placeholder while loading
          )}
        </div>
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

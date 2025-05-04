

import { UnitConverter } from "@/components/unit-converter";
import type { Metadata } from 'next';
import Script from 'next/script';
import { BookmarkButton } from '@/components/bookmark-button'; // Import the new component
import { Toaster } from '@/components/ui/toaster'; // Import Toaster here
import { RefreshCw } from 'lucide-react'; // Import swap/refresh icon
import Link from 'next/link'; // Import Link
import { Footer } from "@/components/footer"; // Import the Footer component

// Page-specific metadata
export const metadata: Metadata = {
  title: "Unitopia - Accurate & Fast Unit Conversion Online", // Slightly different title for variety
  description: "Convert various engineering and everyday units like meters to feet, kg to lbs, Celsius to Fahrenheit, and more. Unitopia offers a simple interface for quick conversions.",
  alternates: {
    canonical: '/', // Assuming this is the canonical URL
  },
};

// JSON-LD Structured Data for WebApplication
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Unitopia - Unit Converter',
  description: 'A free online tool to convert between various units of measurement including length, mass, temperature, time, pressure, area, volume, and energy.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any', // Web-based
  url: 'https://YOUR_APP_URL_HERE', // Replace with the actual deployed URL
  featureList: [
    'Unit Conversion',
    'Length Conversion',
    'Mass Conversion',
    'Temperature Conversion',
    'Time Conversion',
    'Pressure Conversion',
    'Area Conversion',
    'Volume Conversion',
    'Energy Conversion',
    'Metric Units',
    'Imperial Units',
    'Scientific Notation Option',
    'Common Presets',
  ],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  keywords: "unit converter, measurement converter, convert units, online converter, free tool, calculator, length, mass, temperature, time, pressure, area, volume, energy",
};


export default function Home() {
  return (
    <>
      {/* Add JSON-LD structured data to the head */}
      <Script
        id="unit-converter-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Non-Sticky Header */}
      <header className="bg-background p-3 border-b flex items-center justify-between shadow-sm relative"> {/* Removed sticky and related classes */}
          {/* Spacer to help center the logo */}
          <div className="w-auto"></div>
          {/* Centered Logo and Text - Wrapped in Link */}
          {/* Removed 'cursor-default', added hover effect */}
          <Link href="/" className="group flex items-center gap-2 absolute left-1/2 -translate-x-1/2 hover:opacity-80 transition-opacity">
            {/* Added transition and group-hover:rotate-180 for animation */}
            <RefreshCw
              className="h-5 w-5 text-primary transition-transform duration-300 ease-in-out group-hover:rotate-180"
              aria-hidden="true"
            />
            <span className="font-bold text-lg text-foreground">UNITOPIA</span>
          </Link>
          {/* Bookmark Button on the right */}
          <BookmarkButton />
      </header>


      {/* Use grid layout for ad placeholder and main content */}
      {/* Removed padding top as header is no longer sticky */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 w-full max-w-7xl mx-auto p-4 sm:p-8 md:p-12 lg:p-16 xl:p-20 items-start min-h-screen"> {/* Added min-h-screen to push footer down */}
        {/* Left Sidebar Ad Placeholder - Optimized for 160x600 Skyscraper Ad */}
        {/* Adjusted sticky top to account for header height (approximate) */}
        <aside className="w-full lg:w-[200px] h-auto lg:min-h-[600px] bg-muted/30 border rounded-md p-4 text-center text-muted-foreground flex items-center justify-center order-1 lg:sticky lg:top-[1rem]"> {/* Adjusted sticky top */}
          {/* Content for the ad placeholder */}
          <div>Ad Placeholder (160x600)</div>
        </aside>

        {/* Main Content Area - Removed position: relative */}
        <main className="flex flex-col items-center w-full order-2">
           {/* Toaster moved outside main content to be globally positioned */}
           <Toaster />

           {/* Removed introductory paragraph */}
           <UnitConverter />
            {/* Potential future ad slot area - styled minimally for now */}
            {/* <div className="mt-12 w-full max-w-4xl h-24 bg-muted/30 flex items-center justify-center text-muted-foreground rounded-md">
              (Future Ad Area)
            </div> */}
        </main>
      </div>

      {/* Add Footer */}
      <Footer />
    </>
  );
}

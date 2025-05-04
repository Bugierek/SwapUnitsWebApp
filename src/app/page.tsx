
import { UnitConverter } from "@/components/unit-converter";
import type { Metadata } from 'next';
import Script from 'next/script';
import { BookmarkButton } from '@/components/bookmark-button'; // Import the new component
import { Toaster } from '@/components/ui/toaster'; // Import Toaster here

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

      {/* Sticky Header for Bookmark Button */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 border-b flex justify-end shadow-sm">
          <BookmarkButton />
      </header>


      {/* Use grid layout for ad placeholder and main content */}
      {/* Removed min-h-screen from grid container, added padding top to account for sticky header */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 w-full max-w-7xl mx-auto p-4 sm:p-8 md:p-12 lg:p-16 xl:p-20 pt-8 items-start">
        {/* Left Sidebar Ad Placeholder - Optimized for 160x600 Skyscraper Ad */}
        {/* Adjust sticky top to account for header height (approximate) */}
        <aside className="w-full lg:w-[200px] h-auto lg:min-h-[600px] bg-muted/30 border rounded-md p-4 text-center text-muted-foreground flex items-center justify-center order-1 lg:sticky lg:top-[calc(3.5rem+1rem)]"> {/* Header height (approx 3.5rem) + some gap (1rem) */}
          {/* Content for the ad placeholder */}
          <div>Ad Placeholder (160x600)</div>
        </aside>

        {/* Main Content Area - Removed position: relative */}
        <main className="flex flex-col items-center w-full order-2">
           {/* Toaster moved outside main content to be globally positioned */}
           <Toaster />
           {/* Header Section with Title and Bookmark Button - REMOVED Button from here */}
          {/* <div className="flex flex-col sm:flex-row justify-end items-center w-full mb-8 gap-4"> */}
             {/* H1 Removed Here */}
            {/* <BookmarkButton /> */} {/* Button moved to sticky header */}
          {/* </div> */}

          {/* Optional: Add a brief introductory text before the converter */}
          <p className="text-center text-muted-foreground mb-8 max-w-3xl">
            Welcome to Unitopia, your reliable partner for seamless unit conversions. Whether you need to convert measurements for science, engineering, cooking, or everyday tasks, our intuitive tool provides fast and accurate results across various categories.
          </p>
          <UnitConverter />
           {/* Potential future ad slot area - styled minimally for now */}
           {/* <div className="mt-12 w-full max-w-4xl h-24 bg-muted/30 flex items-center justify-center text-muted-foreground rounded-md">
              (Future Ad Area)
           </div> */}
        </main>
      </div>
    </>
  );
}

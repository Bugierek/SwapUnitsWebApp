import { UnitConverter } from "@/components/unit-converter";
import type { Metadata } from 'next';
import Script from 'next/script';

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
      {/* Use grid layout for ad placeholder and main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 w-full max-w-7xl mx-auto p-4 sm:p-8 md:p-12 lg:p-16 xl:p-20 min-h-screen items-start">
        {/* Left Sidebar Ad Placeholder - Optimized for 160x600 Skyscraper Ad */}
        {/* Added lg:sticky lg:top-8 back to make it sticky */}
        <aside className="w-full lg:w-[200px] h-auto lg:min-h-[600px] bg-muted/30 border rounded-md p-4 text-center text-muted-foreground flex items-center justify-center order-1 lg:sticky lg:top-8">
          {/* Content for the ad placeholder */}
          <div>Ad Placeholder (160x600)</div>
        </aside>

        {/* Main Content Area */}
        <main className="flex flex-col items-center w-full order-2">
          {/* Optional: Add a brief introductory text before the converter */}
          <h1 className="text-3xl font-bold text-center mb-4 text-primary">Unitopia</h1>
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

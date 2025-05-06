
import { UnitConverter } from "@/components/unit-converter";
import type { Metadata } from 'next';
import Script from 'next/script';
import { BookmarkButton } from '@/components/bookmark-button'; // Import the new component
import { Toaster } from '@/components/ui/toaster'; // Import Toaster here
import { RefreshCw } from 'lucide-react'; // Import swap/refresh icon
import Link from 'next/link'; // Import Link
import { Footer } from "@/components/footer"; // Import the Footer component

// Page-specific metadata (can override layout defaults or add specifics)
export const metadata: Metadata = {
  title: "SwapUnits - Fast & Accurate Online Unit Converter", // Optimized title
  description: "Free online tool to instantly convert common and specialized units: length (m, ft), mass (kg, lb), temp (°C, °F), time, pressure, area, volume, energy, speed, fuel economy, data storage & transfer. Simple & precise.", // Optimized description
  alternates: {
    canonical: '/', // Set the canonical URL for the homepage
  },
  keywords: "unit converter, online unit converter, free unit converter, measurement converter, metric conversion, imperial conversion, length converter, mass converter, temperature converter, time converter, pressure converter, area converter, volume converter, energy converter, speed converter, fuel economy converter, data storage converter, data transfer converter, m to ft, kg to lbs, C to F", // Expanded keywords
};

// JSON-LD Structured Data for WebApplication
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'SwapUnits - Free Online Unit Converter',
  description: 'A free online tool to convert between various units of measurement including length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, and data transfer rate.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any', // Web-based
  // !! IMPORTANT: Replace this placeholder with your actual deployed application URL !!
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com', // Use environment variable or placeholder
  featureList: [
    'Unit Conversion',
    'Length Conversion (m, ft, km, mi, in, cm)',
    'Mass Conversion (kg, lb, g, oz, t)',
    'Temperature Conversion (°C, °F, K)',
    'Time Conversion (s, min, hr, day, ms)',
    'Pressure Conversion (Pa, kPa, bar, atm, psi, dB SPL)',
    'Area Conversion (m², ft², km², mi², ha, acre)',
    'Volume Conversion (L, mL, m³, ft³, gal, qt, pt)',
    'Energy Conversion (J, kJ, cal, kcal, kWh, BTU)',
    'Speed Conversion (m/s, km/h, mph, kn)',
    'Fuel Economy Conversion (km/L, L/100km, MPG US, MPG UK)',
    'Data Storage Conversion (B, KB, MB, GB, TB)',
    'Data Transfer Rate Conversion (bps, Kbps, Mbps, Gbps, B/s, MB/s)',
    'Bitcoin Conversion (BTC, sat)',
    'Metric Units',
    'Imperial Units',
    'Scientific Notation Option',
    'Common Conversion Presets',
    'Copy to Clipboard',
    'Responsive Design',
  ],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  // Optional: Add provider/author information if relevant
  // provider: {
  //   '@type': 'Organization',
  //   name: 'Your Company Name',
  //   url: 'https://yourcompany.com'
  // },
  keywords: "unit converter, measurement converter, convert units, online converter, free tool, calculator, length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, data transfer, bitcoin, metric, imperial, scientific notation, presets", // Synced with meta keywords
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
            {/* Use H1 for the site name/logo in the header for global context */}
            <h1 className="font-bold text-lg text-foreground">SWAPUNITS</h1>
          </Link>
          {/* Bookmark Button on the right */}
          <BookmarkButton />
      </header>


      {/* Use grid layout for ad placeholder and main content */}
      {/* Halved the top padding: p-4 -> pt-2, sm:p-8 -> sm:pt-4, etc. */}
      {/* Use flex-grow to make this section fill available space */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 w-full max-w-7xl mx-auto pt-2 pb-4 px-4 sm:pt-4 sm:pb-8 sm:px-8 md:pt-6 md:pb-12 md:px-12 lg:pt-8 lg:pb-16 lg:px-16 xl:pt-10 xl:pb-20 xl:px-20 items-start"> {/* Removed min-h-screen */}
        {/* Left Sidebar Ad Placeholder - Optimized for 160x600 Skyscraper Ad */}
        {/* Adjusted sticky top to account for header height (approximate) */}
        <aside className="w-full lg:w-[200px] h-auto lg:min-h-[600px] bg-muted/30 border rounded-md p-4 text-center text-muted-foreground flex items-center justify-center order-1 lg:sticky lg:top-[calc(var(--header-height,60px)+1rem)]"> {/* Adjusted sticky top calculation */}
          {/* Content for the ad placeholder */}
          {/* It's crucial to use real ad code here for SEO and revenue */}
          <div aria-label="Advertisement">Ad Placeholder (160x600)</div>
        </aside>

        {/* Main Content Area - Removed position: relative */}
        {/* Use <main> tag for the primary content of the page */}
        <main className="flex flex-col items-center w-full order-2" role="main">
           {/* Toaster moved outside main content to be globally positioned */}
           <Toaster />

           {/* UnitConverter component contains the H2 heading now */}
           <UnitConverter />
            {/* Potential future ad slot area - styled minimally for now */}
            {/*
            <div className="mt-12 w-full max-w-4xl h-24 bg-muted/30 flex items-center justify-center text-muted-foreground rounded-md" aria-label="Advertisement">
              (Future Ad Area)
            </div>
            */}
        </main>
      </div>

      {/* Footer sticks to the bottom because of flex-grow on the container div and min-h-screen on body */}
      <Footer />
    </>
  );
}

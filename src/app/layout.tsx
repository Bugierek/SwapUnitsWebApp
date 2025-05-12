
import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter font
import "./globals.css";
import { cn } from "@/lib/utils"; // Import cn utility
import { GoogleAnalytics } from "@/components/google-analytics"; // Import GoogleAnalytics

// Use Inter font - known for readability
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

// Replace with your actual deployed URL
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002'; // Fallback for local dev

// SVG data URI for the RefreshCw icon with primary color stroke
const refreshCwIconDataUri = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233498db' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'/%3E%3Cpath d='M21 3v5h-5'/%3E%3Cpath d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'/%3E%3Cpath d='M3 21v-5h5'/%3E%3C/svg%3E`;

export const metadata: Metadata = {
  // Define metadataBase for resolving relative paths, especially for images
  metadataBase: new URL(siteUrl),
  title: {
    default: "SwapUnits | Free Online Unit Converter Tool",
    template: "%s | SwapUnits", // Allows pages to set their own title part
  },
  description: "Instantly convert length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, and data transfer units with SwapUnits. Fast, free, and easy-to-use online converter.",
  keywords: "unit converter, measurement converter, convert units, online converter, free converter, length, mass, temperature, time, pressure, area, volume, energy, speed, fuel economy, data storage, data transfer, metric, imperial, calculator, bitcoin, satoshi, Pa, psi, atm, kg, lb", 
  alternates: {
    canonical: '/',
  },
  // Open Graph metadata for social sharing previews
  openGraph: {
    title: "SwapUnits | Free Online Unit Converter Tool",
    description: "Instantly convert length, mass, temperature, time, pressure, and more units with SwapUnits.", // Simplified description
    url: siteUrl,
    siteName: 'SwapUnits',
    locale: 'en_US',
    type: 'website',
  },
  // Twitter card metadata
  twitter: {
    card: 'summary_large_image',
    title: "SwapUnits | Free Online Unit Converter Tool",
    description: "Instantly convert length, mass, temperature, time, pressure, and more units with SwapUnits.", // Simplified description
  },
  // Add Google AdSense account meta tag
  other: {'google-adsense-account': 'ca-pub-3730679326380863'},
  // Robots directives
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
   // Set the RefreshCw icon as the favicon using the data URI
   icons: {
     icon: refreshCwIconDataUri,
     // You could add other sizes/types here if needed, e.g., apple-touch-icon
     // apple: 'url-to-apple-icon.png',
   },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">{/* Add scroll-smooth - Removed whitespace after tag */}
      <body
        className={cn(
          `${inter.variable} antialiased font-sans`, // Apply Inter font
          "min-h-screen bg-background flex flex-col" // Ensure body takes full height and uses flex column
          )}
      >
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}

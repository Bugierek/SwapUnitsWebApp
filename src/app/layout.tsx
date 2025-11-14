
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google"; // Using Inter font
import "./globals.css";
import { cn } from "@/lib/utils"; // Import cn utility
import { GoogleAnalytics } from "@/components/google-analytics"; // Import GoogleAnalytics
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

// Use Inter font - known for readability
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

// Replace with your actual deployed URL
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002'; // Fallback for local dev

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
  // Set favicon and PWA icons to the SwapUnits refresh logo
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/swapunits-logo.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  manifest: '/site.webmanifest',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b1221' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
};

const LIGHT_BG = '#f8fafc';
const DARK_BG = '#050714';

const themeInitScript = `
(function () {
  try {
    var storageKey = 'swapunits-theme';
    var storedPreference = window.localStorage.getItem(storageKey) || document.documentElement.dataset.themePreference || 'system';
    var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    var isDark = storedPreference === 'dark' || (storedPreference !== 'light' && mediaQuery.matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.themePreference = storedPreference;
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (error) {
    console.warn('[swapunits] theme init failed', error);
  }
})();
`;

const backgroundStyle = `
  html {
    background-color: ${LIGHT_BG};
    color: #020617;
  }
  body {
    background-color: inherit;
    color: inherit;
  }
  html[data-theme-preference="dark"] {
    background-color: ${DARK_BG};
    color: #e2e8f0;
  }
  @media (prefers-color-scheme: dark) {
    html:not([data-theme-preference="light"]) {
      background-color: ${DARK_BG};
      color: #e2e8f0;
    }
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialPreference = cookies().get('swapunits-theme')?.value ?? 'system';
  const initialClass = initialPreference === 'dark' ? 'dark' : '';

  return (
    <html
      lang="en"
      className={cn("scroll-smooth", initialClass)}
      data-theme-preference={initialPreference}
      suppressHydrationWarning
    >
      <head>
        <style id="swapunits-theme-base" dangerouslySetInnerHTML={{ __html: backgroundStyle }} />
        <script
          id="swapunits-theme-init"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body
        className={cn(
          `${inter.variable} antialiased font-sans`, // Apply Inter font
          "min-h-screen bg-background flex flex-col" // Ensure body takes full height and uses flex column
          )}
      >
        <ThemeProvider>
          <GoogleAnalytics />
          <Toaster />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

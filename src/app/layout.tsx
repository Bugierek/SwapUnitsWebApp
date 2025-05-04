import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter font
import "./globals.css";
// Removed: import { Toaster } from "@/components/ui/toaster";

// Use Inter font - known for readability
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});


export const metadata: Metadata = {
  title: "Unitopia | Free Online Unit Converter Tool",
  description: "Instantly convert length, mass, temperature, time, pressure, area, volume, and energy units with Unitopia. Fast, free, and easy-to-use online converter.",
  keywords: "unit converter, measurement converter, convert units, online converter, free converter, length, mass, temperature, time, pressure, area, volume, energy, metric, imperial, calculator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased font-sans`} // Apply Inter font
      >
        {children}
        {/* Removed: <Toaster /> */}
      </body>
    </html>
  );
}

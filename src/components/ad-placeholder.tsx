
'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

declare global {
  interface Window {
    adsbygoogle?: { [key: string]: unknown }[];
  }
}

const AdPlaceholder = () => {
  const isMobile = useIsMobile();
  const adClient = "ca-pub-3730679326380863";
  const adSlot = "7981151502"; // User-provided Slot ID for SwapUnits_Disp_flex

  useEffect(() => {
    // This ensures adsbygoogle.push is called after the component mounts
    // and the adsbygoogle script should have loaded.
    // Only attempt to push if in production environment.
    if (process.env.NODE_ENV === 'production') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error("AdSense push error:", err);
      }
    }
  }, []); // Empty dependency array ensures this runs once on mount

  // In development, show a visual placeholder. In production, render the ad unit.
  if (process.env.NODE_ENV !== 'production') {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/30 border border-dashed border-muted-foreground/50 text-muted-foreground text-xs w-full mx-auto my-4 p-4 text-center",
          isMobile ? "h-[60px] max-h-[60px]" : "h-[90px] min-h-[90px] max-w-4xl" // Example desktop dimensions
        )}
        aria-label="Advertisement Placeholder"
      >
        <div>
          <p>Advertisement Placeholder</p>
          <p>(Ads will display in production environment)</p>
          <p>Slot ID: {adSlot}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* AdSense script, loads after interactive elements */}
      <Script
        id="adsbygoogle-script"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`}
        strategy="afterInteractive"
        crossOrigin="anonymous"
        onError={(e) => {
          console.error('AdSense script failed to load', e);
        }}
      />
      {/* Ad slot container */}
      <div
        className={cn(
          "text-center w-full mx-auto my-4",
          // Apply mobile-specific height constraints
          isMobile ? "max-h-[60px] h-[60px] overflow-hidden flex justify-center items-center" : "min-h-[90px]" 
        )}
      >
        <ins
          className="adsbygoogle"
          style={{ 
            display: 'block', 
            width: '100%', 
            height: isMobile ? '60px' : 'auto' // Fixed height for mobile, auto for AdSense to decide on desktop/other sizes
          }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
          aria-label="Advertisement"
        ></ins>
      </div>
    </>
  );
};

export default AdPlaceholder;

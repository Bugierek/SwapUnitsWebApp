
'use client';

import Script from 'next/script';
import * as React from 'react';

export function GoogleAnalytics() {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-BTT0H5FGMD";

  // Only render in production or if GA_MEASUREMENT_ID is explicitly set for dev (useful for testing)
  if (process.env.NODE_ENV !== 'production' && gaMeasurementId === "G-BTT0H5FGMD" && !process.env.NEXT_PUBLIC_FORCE_GA_DEV) {
    return null;
  }
  
  if (!gaMeasurementId) {
    console.warn("Google Analytics Measurement ID is not set. Analytics will not be active.");
    return null;
  }

  return (
    <>
      <Script
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaMeasurementId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

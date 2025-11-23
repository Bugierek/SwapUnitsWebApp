import React from "react";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://swapunits.com";

export default function Head() {
  const title = "Embeddable Unit Converter Widget | SwapUnits";
  const description = "Lightweight widget to embed unit conversions on your site. Choose categories and units, swap quickly, and copy results.";
  const url = `${baseUrl}/widget`;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="SwapUnits" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </>
  );
}

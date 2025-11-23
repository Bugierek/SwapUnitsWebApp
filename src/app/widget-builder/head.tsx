import React from "react";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://swapunits.com";

export default function Head() {
  const title = "Build a Custom Unit Converter Widget | SwapUnits";
  const description =
    "Select categories and units to generate an embeddable SwapUnits widget. Copy the iframe code and add a Powered by SwapUnits badge.";
  const url = `${baseUrl}/widget-builder`;
  const jsonLd = buildWidgetBuilderJsonLd(url);

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
import { buildWidgetBuilderJsonLd } from "@/lib/structured-data";

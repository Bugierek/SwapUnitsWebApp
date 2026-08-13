import type { MetadataRoute } from "next";
import { categoryDisplayOrder } from "@/lib/unit-data";
import { getCategorySlug } from "@/lib/category-info";
import { listAllConversionPairs } from "@/lib/conversion-pairs";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://swapunits.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // Deliberately no lastModified: we don't track real per-page content-change dates, and
  // stamping every URL with the current build time on every entry is worse than omitting
  // it - Google explicitly distrusts sitemaps where every URL shares the same/current
  // timestamp and may start ignoring the field entirely.
  const entries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/` },
    { url: `${baseUrl}/widget` },
    { url: `${baseUrl}/widget-builder` },
  ];

  categoryDisplayOrder.forEach((category) => {
    const slug = getCategorySlug(category);
    entries.push({
      url: `${baseUrl}/measurements/${slug}`,
    });
  });

  // Individual conversion pair pages (e.g. /conversions/length-conversion/m-to-ft) - these are
  // what actually drive search traffic, but were previously undiscoverable via the sitemap.
  // ~710 pairs at time of writing, well under the 50,000-URL single-sitemap limit.
  listAllConversionPairs().forEach(({ categorySlug, pairSlug }) => {
    entries.push({
      url: `${baseUrl}/conversions/${categorySlug}/${pairSlug}`,
    });
  });

  return entries;
}

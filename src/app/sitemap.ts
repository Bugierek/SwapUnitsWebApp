import type { MetadataRoute } from "next";
import { categoryDisplayOrder } from "@/lib/unit-data";
import { getCategorySlug } from "@/lib/category-info";
import { listAllConversionPairs } from "@/lib/conversion-pairs";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://swapunits.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now },
    { url: `${baseUrl}/widget`, lastModified: now },
    { url: `${baseUrl}/widget-builder`, lastModified: now },
  ];

  categoryDisplayOrder.forEach((category) => {
    const slug = getCategorySlug(category);
    entries.push({
      url: `${baseUrl}/measurements/${slug}`,
      lastModified: now,
    });
  });

  // Individual conversion pair pages (e.g. /conversions/length-conversion/m-to-ft) - these are
  // what actually drive search traffic, but were previously undiscoverable via the sitemap.
  // ~710 pairs at time of writing, well under the 50,000-URL single-sitemap limit.
  listAllConversionPairs().forEach(({ categorySlug, pairSlug }) => {
    entries.push({
      url: `${baseUrl}/conversions/${categorySlug}/${pairSlug}`,
      lastModified: now,
    });
  });

  return entries;
}

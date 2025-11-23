import type { MetadataRoute } from "next";
import { categoryDisplayOrder } from "@/lib/unit-data";
import { getCategorySlug } from "@/lib/category-info";

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

  return entries;
}

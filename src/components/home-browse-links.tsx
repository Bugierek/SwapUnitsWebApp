import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { UnitIcon } from '@/components/unit-icon';
import { getCategorySlug } from '@/lib/category-info';
import { buildConversionPairUrl } from '@/lib/conversion-pairs';
import { allPresets, categoryDisplayOrder, unitData } from '@/lib/unit-data';
import type { UnitCategory } from '@/types';

// Plain links with no hooks or state, so they are part of the server-rendered HTML and
// crawlers can reach every category page and the most-used pair pages from the homepage.

type CategoryLink = {
  category: UnitCategory;
  label: string;
  detail: string;
  href: string;
};

type PairLink = {
  category: UnitCategory;
  label: string;
  symbols: string;
  href: string;
};

const countNoun = (category: UnitCategory): string => {
  if (category === 'Currency') return 'currencies';
  if (category === 'SI Prefixes') return 'prefixes';
  return 'units';
};

const categoryLinks: CategoryLink[] = categoryDisplayOrder
  .filter((category) => unitData[category])
  .map((category) => {
    const slug = getCategorySlug(category);
    const unitCount = unitData[category].units.length;
    return {
      category,
      label: unitData[category].name,
      detail: `${unitCount} ${countNoun(category)}`,
      // SI Prefixes has no /measurements page: its slug is the path of the standalone standards page.
      href: category === 'SI Prefixes' ? `/${slug}` : `/measurements/${slug}`,
    };
  });

const hasUnit = (category: UnitCategory, symbol: string): boolean =>
  unitData[category]?.units.some((unit) => unit.symbol === symbol) ?? false;

const pairLinks: PairLink[] = (() => {
  const seen = new Set<string>();
  const links: PairLink[] = [];
  for (const preset of allPresets) {
    // SI Prefixes has no pair pages (see listAllConversionPairs).
    if (preset.category === 'SI Prefixes') continue;
    if (!hasUnit(preset.category, preset.fromUnit) || !hasUnit(preset.category, preset.toUnit)) continue;
    const href = buildConversionPairUrl(preset.category, preset.fromUnit, preset.toUnit);
    if (seen.has(href)) continue;
    seen.add(href);
    const name = preset.name.replace(/\s*\(Adv\)\s*$/, '').trim();
    links.push({
      category: preset.category,
      label: name || `${preset.fromUnit} to ${preset.toUnit}`,
      symbols: `${preset.fromUnit} → ${preset.toUnit}`,
      href,
    });
  }
  // Group by category in display order; the sort is stable, so presets keep their order within a category.
  return links.sort(
    (a, b) => categoryDisplayOrder.indexOf(a.category) - categoryDisplayOrder.indexOf(b.category),
  );
})();

const cardClassName =
  'rounded-2xl border border-border/60 bg-card/90 px-4 py-5 shadow-md backdrop-blur-sm sm:px-6 sm:py-6';
const tileClassName =
  'group flex h-full items-center gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 text-left shadow-sm transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

function SectionHeader({ id, title, description, count }: { id: string; title: string; description: string; count: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
      <div className="space-y-1">
        <h2 id={id} className="text-xl font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">{count}</span>
    </div>
  );
}

export function HomeBrowseLinks() {
  return (
    // Horizontal padding lines the cards up with the converter card (px-2 md:px-6 wrapper) and,
    // from xl, with the right edge of the history/favorites sidebar, which has no padding.
    <div className="flex w-full flex-col gap-5 px-2 md:px-6 xl:pr-0">
      <section aria-labelledby="home-browse-categories" className={cardClassName}>
        <SectionHeader
          id="home-browse-categories"
          title="Browse by category"
          description="Reference tables, popular pairs and FAQs for each type of measurement."
          count={`${categoryLinks.length} categories`}
        />
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {categoryLinks.map((link) => (
            <li key={link.category}>
              <Link href={link.href} className={tileClassName}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UnitIcon category={link.category} className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold leading-tight text-foreground transition group-hover:text-primary">
                    {link.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{link.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="home-popular-conversions" className={cardClassName}>
        <SectionHeader
          id="home-popular-conversions"
          title="Popular conversions"
          description="Jump straight to a dedicated page with a calculator, reference table and worked examples."
          count={`${pairLinks.length} pairs`}
        />
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {pairLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={tileClassName}>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold leading-tight text-foreground transition group-hover:text-primary">
                    {link.label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UnitIcon category={link.category} className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden="true" />
                    <span className="truncate">{link.symbols}</span>
                  </span>
                </span>
                <ArrowRight
                  className="hidden h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary sm:block"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

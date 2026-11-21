import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { listAllConversionPairs, resolveConversionPairPage } from '@/lib/conversion-pairs';

// Every pair URL that existed when this fixture was written (all of them are in the sitemap and
// indexed). Pair URLs are built from unit symbols, so renaming a symbol or changing the slug rules
// silently breaks them. New units may add URLs; none of these may disappear. To add the new ones
// to the fixture, regenerate it from listAllConversionPairs().
const KNOWN_URLS = readFileSync(fileURLToPath(new URL('./fixtures/pair-urls.txt', import.meta.url)), 'utf8')
  .split('\n')
  .filter(Boolean);

const currentPairs = listAllConversionPairs();
const currentUrls = new Set(currentPairs.map((pair) => `/conversions/${pair.categorySlug}/${pair.pairSlug}`));

describe('pair page URLs', () => {
  it('keeps every previously published pair URL', () => {
    expect(KNOWN_URLS.length).toBeGreaterThan(2000);
    expect(KNOWN_URLS.filter((url) => !currentUrls.has(url))).toEqual([]);
  });

  it('resolves every canonical slug to itself and to the units it was built from', () => {
    const problems: string[] = [];
    for (const pair of currentPairs) {
      const resolved = resolveConversionPairPage(pair.categorySlug, pair.pairSlug);
      if (
        !resolved ||
        !resolved.isCanonical ||
        resolved.fromUnit.symbol !== pair.fromSymbol ||
        resolved.toUnit.symbol !== pair.toSymbol
      ) {
        problems.push(`${pair.categorySlug}/${pair.pairSlug}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('resolves lowercase variants to the same canonical page (the [...slug] route 308s them there)', () => {
    const problems: string[] = [];
    for (const pair of currentPairs) {
      const lower = pair.pairSlug.toLowerCase();
      if (lower === pair.pairSlug) continue;
      const resolved = resolveConversionPairPage(pair.categorySlug, lower);
      if (!resolved || resolved.isCanonical || resolved.canonicalSlug !== pair.pairSlug) {
        problems.push(`${pair.categorySlug}/${lower}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('has no pair pages for same-unit pairs or SI prefixes', () => {
    expect(currentPairs.filter((pair) => pair.fromSymbol === pair.toSymbol)).toEqual([]);
    expect(resolveConversionPairPage('standards/nist-si-tenfold', 'k-to-M')).toBeNull();
  });
});

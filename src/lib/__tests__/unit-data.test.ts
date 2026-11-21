import { describe, expect, it } from 'vitest';

import { getCategoryDefaultPair } from '@/lib/category-defaults';
import { getCategoryInfo } from '@/lib/category-info';
import { getConversionSources } from '@/lib/conversion-sources';
import { allPresets, categoryDisplayOrder, unitData } from '@/lib/unit-data';
import type { UnitCategory } from '@/types';

// Consistency checks across the files a new unit or category has to be added to.

const allCategories = Object.keys(unitData) as UnitCategory[];
const hasUnit = (category: UnitCategory, symbol: string) =>
  unitData[category].units.some((unit) => unit.symbol === symbol);

describe('unit data', () => {
  it('lists every category exactly once in categoryDisplayOrder', () => {
    expect([...categoryDisplayOrder].sort()).toEqual([...allCategories].sort());
  });

  it.each(allCategories)('%s: unique symbols, names, and positive finite factors', (category) => {
    const units = unitData[category].units;
    expect(units.length).toBeGreaterThan(0);
    expect(new Set(units.map((unit) => unit.symbol)).size).toBe(units.length);
    for (const unit of units) {
      expect(unit.name.trim()).not.toBe('');
      expect(Number.isFinite(unit.factor) && unit.factor > 0).toBe(true);
    }
  });

  it.each(allCategories)('%s: has page copy and at least one source', (category) => {
    const info = getCategoryInfo(category);
    expect(info?.seo.title).toBeTruthy();
    expect(info?.seo.description).toBeTruthy();
    expect(info?.faq.length).toBeGreaterThan(0);
    expect(getConversionSources(category).length).toBeGreaterThan(0);
  });

  it.each(allCategories)('%s: default pair, if any, uses two different existing units', (category) => {
    const pair = getCategoryDefaultPair(category);
    if (!pair) return;
    expect(hasUnit(category, pair.fromUnit)).toBe(true);
    expect(hasUnit(category, pair.toUnit)).toBe(true);
    expect(pair.fromUnit).not.toBe(pair.toUnit);
  });

  it('presets only use existing units', () => {
    const broken = allPresets.filter(
      (preset) => !hasUnit(preset.category, preset.fromUnit) || !hasUnit(preset.category, preset.toUnit),
    );
    expect(broken).toEqual([]);
  });
});

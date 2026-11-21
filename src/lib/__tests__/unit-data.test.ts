import { describe, expect, it } from 'vitest';

import { getCategoryDefaultPair } from '@/lib/category-defaults';
import { parseConversionQuery, rewriteCaseExactNotations } from '@/lib/conversion-query-parser';
import { describePairNotations, describeUnitNotes, getSameUnits } from '@/lib/unit-notations';
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

// Other notations for a unit (unit-data.ts UNIT_NOTATIONS).
const allNotations = allCategories.flatMap((category) =>
  unitData[category].units.flatMap((unit) =>
    (unit.alsoWrittenAs ?? []).map((notation) => ({ category, symbol: unit.symbol, ...notation })),
  ),
);
const allSymbols = new Set(allCategories.flatMap((category) => unitData[category].units.map((unit) => unit.symbol)));

describe('unit notations', () => {
  it('each one parses to its own unit, as written', () => {
    const wrong = allNotations
      .filter(({ text, symbol, category }) => {
        const result = parseConversionQuery(`5 ${text}`);
        return !result.ok || result.kind !== 'unit' || result.fromUnit !== symbol || result.category !== category;
      })
      .map(({ text }) => text);
    expect(wrong).toEqual([]);
  });

  it('none is another unit\'s symbol, and none is listed twice', () => {
    expect(allNotations.filter(({ text }) => allSymbols.has(text)).map(({ text }) => text)).toEqual([]);
    const texts = allNotations.map(({ text }) => text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('only these mean their unit in exactly this case (their lowercase is another unit)', () => {
    const exact = allNotations
      .filter(({ text }) => rewriteCaseExactNotations(`5 ${text}`) !== `5 ${text}`)
      .map(({ text }) => text)
      .sort();
    expect(exact).toEqual(['Bps', 'Cal', 'Gb/s', 'KBps', 'Kb/s', 'MBps', 'Mb/s'].sort());
  });

  it('every one has a reason for the notations page', () => {
    expect(allNotations.filter(({ why }) => why.trim().length < 10).map(({ text }) => text)).toEqual([]);
  });
});

describe('same unit under two names', () => {
  it('pairs exactly the listed units that are equal', () => {
    const groups = allCategories.flatMap((category) =>
      unitData[category].units
        .map((unit) => [unit.symbol, ...getSameUnits(category, unit.symbol).map((other) => other.symbol)])
        .filter((group) => group.length > 1)
        .map((group) => `${category}: ${group.join(' = ')}`),
    );
    expect(groups.sort()).toEqual(
      [
        'Pressure: hPa = mbar',
        'Pressure: mbar = hPa',
        'Volume: mL = cm³',
        'Volume: cm³ = mL',
        'Density: kg/m³ = g/L',
        'Density: g/L = kg/m³',
        'Density: g/cm³ = g/mL = kg/L',
        'Density: g/mL = g/cm³ = kg/L',
        'Density: kg/L = g/cm³ = g/mL',
      ].sort(),
    );
  });

  it('describes them on the category table and pair pages', () => {
    const notes = (category: UnitCategory, symbol: string) =>
      describeUnitNotes(category, unitData[category].units.find((unit) => unit.symbol === symbol)!);
    expect(notes('Volume', 'cm³')).toBe('Also written cc. Same unit as mL');
    expect(notes('Pressure', 'MPa')).toBe('Also written N/mm² or MN/m²');
    expect(notes('Fuel Economy', 'L/100km')).toBe('Lower is more efficient');
    expect(notes('Length', 'm')).toBeNull();
    expect(describePairNotations('Volume', 'mL', 'cm³')).toEqual([
      'mL and cm³ are the same unit under two names: 1 mL = 1 cm³ exactly.',
      'cm³ is also written cc.',
    ]);
    expect(describePairNotations('Pressure', 'MPa', 'psi')).toEqual([
      'MPa is also written N/mm² or MN/m².',
      'psi is also written lbf/in² or lb/in².',
    ]);
    expect(describePairNotations('Length', 'm', 'ft')).toEqual([]);
  });
});

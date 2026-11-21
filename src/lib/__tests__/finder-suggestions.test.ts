import { describe, expect, it } from 'vitest';

import {
  buildFinderItems,
  filterFinderItems,
  getFinderItemNote,
  getFinderReadings,
  getSameUnitMessage,
  normalizeFinderInput,
  orderFinderCategories,
  sortFinderItems,
} from '@/lib/finder-suggestions';
import { unitData } from '@/lib/unit-data';
import type { UnitCategory } from '@/types';

// The finder's suggestion list (the dropdown under the search box), run the way the combobox runs
// it. The first row is what Enter picks, so for a complete "A to B" query it must be the pair the
// parser reads.

const items = buildFinderItems();
const orderedCategories = orderFinderCategories(items);

const suggest = (query: string) => {
  const normalized = normalizeFinderInput(query);
  return sortFinderItems(filterFinderItems(items, normalized), orderedCategories, normalized);
};
const first = (query: string) => suggest(query)[0]?.value ?? null;
const firstNote = (query: string) => {
  const normalized = normalizeFinderInput(query);
  const row = suggest(query)[0];
  return row ? getFinderItemNote(row, getFinderReadings(normalized)) : null;
};

describe('finder list: first row for a complete query', () => {
  it.each([
    // Notations and aliases typed in full list their unit (they used to show "No conversion found").
    ['5 N/mm2 to psi', 'Pressure:MPa:psi'],
    ['250 cc to ml', 'Volume:cm³:mL'],
    ['100 kph to mph', 'Speed:km/h:mph'],
    ['5 feet to m', 'Length:ft:m'],
    ['10 pounds to kg', 'Mass:lb:kg'],
    ['5 lbs to kg', 'Mass:lb:kg'],
    ['3600 Ws to Wh', 'Energy:J:Wh'],
    ['500 Cal to kJ', 'Energy:kcal:kJ'],
    // Milliwatt vs megawatt: exact case, and all-lowercase "mw" means milliwatts.
    ['5 kW to MW', 'Power:kW:MW'],
    ['5 kW to mW', 'Power:kW:mW'],
    ['5 kW to mw', 'Power:kW:mW'],
    ['5 MW to W', 'Power:MW:W'],
    ['5 mw to w', 'Power:mW:W'],
    // A pair from a higher-ranked category whose symbols only start the same way used to win.
    ['5 hp to PS', 'Power:hp:PS'],
    ['5 W to kW', 'Power:W:kW'],
    ['5 kilowatt to watt', 'Power:kW:W'],
    ['5 B to MB', 'Data Storage:B:MB'],
    ['5 Mg to kg', 'Mass:mg:kg'],
  ])('%s', (query, expected) => {
    expect(first(query)).toBe(expected);
  });

  it('every ordered pair of unit symbols lists that pair first', () => {
    const mismatches: string[] = [];
    for (const category of Object.keys(unitData) as UnitCategory[]) {
      if (category === 'SI Prefixes') continue;
      const units = unitData[category].units;
      for (const from of units) {
        for (const to of units) {
          if (from.symbol === to.symbol) continue;
          const query = `5 ${from.symbol} to ${to.symbol}`;
          if (first(query) !== `${category}:${from.symbol}:${to.symbol}`) mismatches.push(query);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe('finder list: matching', () => {
  it('lists a unit typed as a bare notation', () => {
    expect(suggest('cc').every((row) => row.fromSymbol === 'cm³')).toBe(true);
    expect(suggest('kph').length).toBeGreaterThan(0);
    expect(suggest('5 N/mm2')[0]?.fromSymbol).toBe('MPa');
  });

  it('never matches a notation from partial text', () => {
    // "d" must not list litres because of "dm³", nor "n/m" pascals because of "N/m²".
    expect(suggest('d').some((row) => row.fromSymbol === 'L')).toBe(false);
    expect(suggest('n/m')).toEqual([]);
    expect(suggest('N/mm')).toEqual([]);
    // "meter" is also the SI prefix m's alias; prefix rows still match by prefix only.
    expect(suggest('5 meter').some((row) => row.kind === 'si-prefix')).toBe(false);
  });

  it('lists nothing for an exact-case milli symbol the site does not have', () => {
    expect(suggest('5 mJ to J')).toEqual([]);
    expect(suggest('mPa')).toEqual([]);
    expect(first('5 mj to j')).toBe('Energy:MJ:J');
  });
});

describe('finder list: hints', () => {
  it('explains a row listed because of a notation, in the notation as written', () => {
    expect(firstNote('5 N/mm2 to psi')).toBe('N/mm² = MPa');
    expect(firstNote('5 n/mm^2 to psi')).toBe('N/mm² = MPa');
    expect(firstNote('250 cc to ml')).toBe('cc = cm³');
    expect(firstNote('5 kg to pounds')).toBe('pounds = lb');
    expect(firstNote('5 lbf/in2 to N/mm2')).toBe('lbf/in² = psi · N/mm² = MPa');
  });

  it('adds nothing when a unit is typed as (the start of) its symbol or name', () => {
    expect(firstNote('5 MPa to psi')).toBeNull();
    expect(firstNote('5 kilo')).toBeNull();
    expect(firstNote('5 kg to lb')).toBeNull();
  });

  it('says when both sides are the same unit instead of "No conversion found"', () => {
    expect(getSameUnitMessage(normalizeFinderInput('5 N/mm2 to MPa'))).toBe(
      'N/mm² and MPa are the same unit (1 N/mm² = 1 MPa). Press Enter to convert.',
    );
    expect(getSameUnitMessage(normalizeFinderInput('5 kg to kg'))).toBe('Both sides are the same unit. Press Enter to convert.');
    expect(getSameUnitMessage(normalizeFinderInput('5 kg to g'))).toBeNull();
  });
});

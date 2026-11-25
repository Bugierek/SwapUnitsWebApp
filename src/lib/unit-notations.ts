// Other ways of writing a unit ("N/mm²" for MPa) and listed units that are the same unit under
// two names (mL and cm³), for the category tables, the pair pages and /unit-notations. The
// notations themselves live in unit-data.ts (UNIT_NOTATIONS), next to the units.
import type { Unit, UnitCategory, UnitNotation } from '@/types';
import { categoryDisplayOrder, unitData } from '@/lib/unit-data';

// Categories where an equal factor doesn't mean an equal unit: currencies all carry a placeholder
// factor of 1, temperatures use formulas, and MPGe shares MPG (US)'s factor without being it.
const NOT_RATIO_CATEGORIES = new Set<UnitCategory>(['Currency', 'Temperature', 'Fuel Economy', 'SI Prefixes']);

const findUnit = (category: UnitCategory, symbol: string): Unit | undefined =>
  unitData[category]?.units.find((unit) => unit.symbol === symbol);

export function getUnitNotations(category: UnitCategory, symbol: string): UnitNotation[] {
  return findUnit(category, symbol)?.alsoWrittenAs ?? [];
}

/** Typed text with case, joiners and the way powers are written evened out ("n/mm2" = "N/mm²"). */
export const squashNotation = (text: string) =>
  text.toLowerCase().replace(/[·*.\-\s^]/g, '').replace(/²/g, '2').replace(/³/g, '3').replace(/μ/g, 'µ');

/** The unit's notation that `typed` is a way of writing ("n/mm2" -> "N/mm²"), if any. */
export function findNotationAsTyped(category: UnitCategory, symbol: string, typed: string): UnitNotation | undefined {
  return getUnitNotations(category, symbol).find((notation) => squashNotation(notation.text) === squashNotation(typed));
}

/** Other listed units that are exactly this unit (hPa and mbar, mL and cm³). */
export function getSameUnits(category: UnitCategory, symbol: string): Unit[] {
  if (NOT_RATIO_CATEGORIES.has(category)) return [];
  const unit = findUnit(category, symbol);
  if (!unit) return [];
  return unitData[category].units.filter(
    (other) => other.symbol !== symbol && other.factor === unit.factor,
  );
}

const joinOr = (items: string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;

/** The Notes cell of a category page's unit table, or null for "—". */
export function describeUnitNotes(category: UnitCategory, unit: Unit): string | null {
  const parts: string[] = [];
  const notations = unit.alsoWrittenAs ?? [];
  if (notations.length > 0) {
    parts.push(`Also written ${joinOr(notations.map((notation) => notation.text))}`);
  }
  const same = getSameUnits(category, unit.symbol);
  if (same.length > 0) {
    parts.push(`Same unit as ${joinOr(same.map((other) => other.symbol))}`);
  }
  if (unit.unitType === 'direct_efficiency') {
    parts.push('Higher is more efficient');
  } else if (unit.unitType === 'inverse_consumption') {
    parts.push('Lower is more efficient');
  }
  return parts.length > 0 ? parts.join('. ') : null;
}

/**
 * Sentences for a pair page: "mL and cm³ are the same unit under two names: 1 mL = 1 cm³
 * exactly.", "MPa is also written N/mm² or MN/m².", "hPa is the same unit as mbar." Empty when
 * neither unit has another notation or name.
 */
export function describePairNotations(category: UnitCategory, fromSymbol: string, toSymbol: string): string[] {
  const sentences: string[] = [];
  const pairIsOneUnit = getSameUnits(category, fromSymbol).some((unit) => unit.symbol === toSymbol);
  if (pairIsOneUnit) {
    sentences.push(`${fromSymbol} and ${toSymbol} are the same unit under two names: 1 ${fromSymbol} = 1 ${toSymbol} exactly.`);
  }
  [fromSymbol, toSymbol].forEach((symbol) => {
    const notations = getUnitNotations(category, symbol);
    if (notations.length > 0) {
      sentences.push(`${symbol} is also written ${joinOr(notations.map((notation) => notation.text))}.`);
    }
    const same = getSameUnits(category, symbol).filter(
      (unit) => !pairIsOneUnit || (unit.symbol !== fromSymbol && unit.symbol !== toSymbol),
    );
    if (same.length > 0) {
      sentences.push(`${symbol} is the same unit as ${joinOr(same.map((unit) => unit.symbol))}.`);
    }
  });
  return sentences;
}

export type NotationRow = {
  unit: Unit;
  notations: UnitNotation[];
  sameAs: Unit[];
};

export type NotationSection = {
  category: UnitCategory;
  rows: NotationRow[];
};

/** Every unit with another notation or name, by category in display order (for /unit-notations). */
export function listNotationSections(): NotationSection[] {
  return categoryDisplayOrder
    .map((category) => ({
      category,
      rows: (unitData[category]?.units ?? [])
        .map((unit) => ({
          unit,
          notations: unit.alsoWrittenAs ?? [],
          sameAs: getSameUnits(category, unit.symbol),
        }))
        .filter((row) => row.notations.length > 0 || row.sameAs.length > 0),
    }))
    .filter((section) => section.rows.length > 0);
}

/** Whether a category has anything for /unit-notations (the category page links there if so). */
export function categoryHasNotations(category: UnitCategory): boolean {
  return listNotationSections().some((section) => section.category === category);
}

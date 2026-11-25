// Compound unit expressions ("kN/cm²", "kg·m/s²", "W/(m·K)"): each unit in the expression is
// looked up, the expression is reduced to SI base dimensions (length, mass, time, temperature),
// and two sides convert when their dimensions match. Factors come from unit-data.ts (each
// category's base unit in SI) plus SI prefixes on the units that take them, so a value here
// agrees with the category converters.
//
// Single units are read the way the finder reads them (the parser's aliases and notations:
// "feet", "kp", "Cal", "kmh"), and case is kept as typed: "mW" and "MW" are different units, an
// all-lowercase "mw" could be either and gets both answers.
//
// Not covered: °C/°F (they have an offset), currency, data units, fuel economy (reciprocal and
// energy-equivalent scales) and units outside mechanics (A, V, Hz, mol, ...). Used by
// /compound-unit-converter and the finder's hand-off row (compound-handoff.ts).
import type { UnitCategory } from '@/types';
import { unitData } from '@/lib/unit-data';
import { ALL_SI_PREFIXES } from '@/lib/si-prefixes';
import { findNotationAsTyped } from '@/lib/unit-notations';
import {
  escapeRegex,
  findConnectorMatches,
  findUnlistedExactSymbol,
  getCaseExactUnitMatch,
  resolveUnitCandidates,
  rewriteCaseExactNotations,
} from '@/lib/conversion-query-parser';

/** Exponents of length, mass, time and temperature: [L, M, T, Θ]. */
export type Dimensions = [number, number, number, number];

const LENGTH: Dimensions = [1, 0, 0, 0];
const MASS: Dimensions = [0, 1, 0, 0];
const TIME: Dimensions = [0, 0, 1, 0];
const TEMPERATURE: Dimensions = [0, 0, 0, 1];
const AREA: Dimensions = [2, 0, 0, 0];
const VOLUME: Dimensions = [3, 0, 0, 0];
const SPEED: Dimensions = [1, 0, -1, 0];
const ACCELERATION: Dimensions = [1, 0, -2, 0];
const FORCE: Dimensions = [1, 1, -2, 0];
const PRESSURE: Dimensions = [-1, 1, -2, 0];
const ENERGY: Dimensions = [2, 1, -2, 0];
const POWER: Dimensions = [2, 1, -3, 0];
const DENSITY: Dimensions = [-3, 1, 0, 0];

// The categories whose units can appear in an expression, with their dimensions and the size of
// the category's base unit in SI (every base unit is coherent SI except the litre).
const CATEGORY_DIMENSIONS: Partial<Record<UnitCategory, { dims: Dimensions; scale: number }>> = {
  Length: { dims: LENGTH, scale: 1 },
  Mass: { dims: MASS, scale: 1 },
  Time: { dims: TIME, scale: 1 },
  // Kelvin only: °C and °F have an offset, so they can't be multiplied or divided.
  Temperature: { dims: TEMPERATURE, scale: 1 },
  Area: { dims: AREA, scale: 1 },
  Volume: { dims: VOLUME, scale: 1e-3 },
  Speed: { dims: SPEED, scale: 1 },
  Pressure: { dims: PRESSURE, scale: 1 },
  Energy: { dims: ENERGY, scale: 1 },
  Power: { dims: POWER, scale: 1 },
  Force: { dims: FORCE, scale: 1 },
  Torque: { dims: ENERGY, scale: 1 },
  Density: { dims: DENSITY, scale: 1 },
};

/** Categories whose every unit works in an expression (Temperature only in kelvin, so not it). */
export const COMPOUND_CATEGORIES = (Object.keys(CATEGORY_DIMENSIONS) as UnitCategory[]).filter(
  (category) => category !== 'Temperature',
);

/** Whether a category's units are built from others (pressure, energy ...), not a base unit. */
export function isDerivedCategory(category: UnitCategory): boolean {
  const dims = CATEGORY_DIMENSIONS[category]?.dims;
  return Boolean(dims) && dims!.reduce((total, power) => total + Math.abs(power), 0) > 1;
}

export type CompoundAtom = {
  symbol: string;
  name: string;
  /** One of this unit in SI base units (m, kg, s, K). */
  factor: number;
  dims: Dimensions;
  /** The category that lists it, or null for units only this engine knows (mN, GPa, ozf). */
  category: UnitCategory | null;
};

// Units that take SI prefixes here. The gram, not the kilogram, takes them (SI Brochure 3.2).
// "fl" would be a femtolitre, so the litre stops at nano. A prefixed symbol the finder reads as a
// different listed unit is skipped (see getTables): "Mg", "Ms", "Mm" are milli to the finder.
const ALL_PREFIXES = ALL_SI_PREFIXES.map((prefix) => prefix.symbol);
const PREFIXABLE: Array<{ category: UnitCategory; unit: string; name: string; prefixes: string[] }> = [
  { category: 'Length', unit: 'm', name: 'meter', prefixes: ALL_PREFIXES },
  { category: 'Mass', unit: 'g', name: 'gram', prefixes: ALL_PREFIXES },
  { category: 'Time', unit: 's', name: 'second', prefixes: ALL_PREFIXES },
  { category: 'Temperature', unit: 'K', name: 'kelvin', prefixes: ['n', 'µ', 'm'] },
  { category: 'Pressure', unit: 'Pa', name: 'pascal', prefixes: ALL_PREFIXES },
  { category: 'Pressure', unit: 'bar', name: 'bar', prefixes: ['µ', 'm', 'k', 'M'] },
  { category: 'Energy', unit: 'J', name: 'joule', prefixes: ALL_PREFIXES },
  { category: 'Energy', unit: 'eV', name: 'electronvolt', prefixes: ALL_PREFIXES },
  { category: 'Energy', unit: 'Wh', name: 'watt hour', prefixes: ['m', 'k', 'M', 'G', 'T'] },
  { category: 'Power', unit: 'W', name: 'watt', prefixes: ALL_PREFIXES },
  { category: 'Force', unit: 'N', name: 'newton', prefixes: ALL_PREFIXES },
  { category: 'Volume', unit: 'L', name: 'liter', prefixes: ['n', 'µ', 'm', 'c', 'd', 'da', 'h', 'k', 'M', 'G'] },
];

/** The unit symbols that take SI prefixes here, for the page that explains the syntax. */
export const PREFIXED_UNIT_SYMBOLS = PREFIXABLE.map((entry) => entry.unit);

// Symbols of units outside this converter, refused by name rather than read as something else
// ("A" would otherwise be taken as the year, "T" as the tonne). Ones marked true also take a
// prefix (mA, kV, MHz, mAh).
const UNSUPPORTED_SYMBOLS: Record<string, [string, boolean]> = {
  A: ['ampere', true], V: ['volt', true], Ω: ['ohm', true], ohm: ['ohm', false], ohms: ['ohm', false],
  Hz: ['hertz', true], Wb: ['weber', true], T: ['tesla', true], mol: ['mole', true],
  cd: ['candela', false], lm: ['lumen', false], lx: ['lux', false], Gy: ['gray', true], Sv: ['sievert', true],
  Bq: ['becquerel', true], rad: ['radian', false], sr: ['steradian', false], rpm: ['revolutions per minute', false],
  Ah: ['ampere hour', true], VA: ['volt-ampere', true],
};

// A mass unit that has a force counterpart, for the "did you mean kgf?" hint.
const FORCE_FOR_MASS: Record<string, string> = { kg: 'kgf', lb: 'lbf', oz: 'ozf' };

type Tables = {
  /** Every unit by its symbol, case as written. */
  exact: Map<string, CompoundAtom>;
  /** The units listed in unit-data, by `${category}:${symbol}`. */
  byUnit: Map<string, CompoundAtom>;
  /** Units only this engine knows, by lowercase symbol (for "mn" -> mN / MN). */
  folded: Map<string, CompoundAtom[]>;
  /** Symbols with spaces ("fl oz (UK)", "ton (US)"), longest first. */
  multiword: Array<{ pattern: RegExp; atom: CompoundAtom }>;
};

let cachedTables: Tables | null = null;

const unitKey = (category: UnitCategory, symbol: string) => `${category}:${symbol}`;
const sameDims = (a: Dimensions, b: Dimensions) => a.every((value, index) => value === b[index]);
const addDims = (a: Dimensions, b: Dimensions, times = 1): Dimensions =>
  [a[0] + b[0] * times, a[1] + b[1] * times, a[2] + b[2] * times, a[3] + b[3] * times];
const sameSize = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function getTables(): Tables {
  if (cachedTables) return cachedTables;

  const exact = new Map<string, CompoundAtom>();
  const byUnit = new Map<string, CompoundAtom>();
  const folded = new Map<string, CompoundAtom[]>();

  (Object.keys(CATEGORY_DIMENSIONS) as UnitCategory[]).forEach((category) => {
    const { dims, scale } = CATEGORY_DIMENSIONS[category]!;
    unitData[category].units.forEach((unit) => {
      if (category === 'Temperature' && unit.symbol !== 'K') return;
      const atom: CompoundAtom = { symbol: unit.symbol, name: unit.name, factor: unit.factor * scale, dims, category };
      byUnit.set(unitKey(category, unit.symbol), atom);
      if (!exact.has(unit.symbol)) exact.set(unit.symbol, atom);
    });
  });

  const addEngineUnit = (symbol: string, name: string, factor: number, dims: Dimensions) => {
    if (exact.has(symbol)) return;
    const atom: CompoundAtom = { symbol, name, factor, dims, category: null };
    exact.set(symbol, atom);
    const key = symbol.toLowerCase();
    folded.set(key, [...(folded.get(key) ?? []), atom]);
  };

  // A prefixed symbol the finder already reads as a listed unit of another size ("Ms" is ms, "Mm"
  // is mm, "Mbar" is mbar, "Ps" is ps: a capital from a phone keyboard) is left out, so this page
  // and the finder agree. mJ and mPa stay: the finder refuses them instead of misreading them.
  const readAsOtherUnit = (symbol: string, factor: number) =>
    !findUnlistedExactSymbol(symbol) &&
    resolveUnitCandidates(symbol).some((entry) => {
      if (entry.category === 'SI Prefixes') return false;
      const listed = byUnit.get(unitKey(entry.category, entry.symbol));
      return !listed || !sameSize(listed.factor, factor);
    });

  PREFIXABLE.forEach(({ category, unit, name, prefixes }) => {
    const base = byUnit.get(unitKey(category, unit))!;
    prefixes.forEach((prefixSymbol) => {
      const prefix = ALL_SI_PREFIXES.find((candidate) => candidate.symbol === prefixSymbol)!;
      const symbol = `${prefixSymbol}${unit}`;
      // Number('1e-6') is the exact decimal, where 10 ** -6 can be off in the last bit.
      const factor = Number(`1e${prefix.exponent}`) * base.factor;
      if (exact.has(symbol) || readAsOtherUnit(symbol, factor)) return;
      addEngineUnit(symbol, `${capitalize(prefix.prefix)}${name}`, factor, base.dims);
    });
  });

  // Ounce-force (1/16 lbf), for ozf·in written inside a longer expression.
  const lbf = byUnit.get(unitKey('Force', 'lbf'))!;
  addEngineUnit('ozf', 'Ounce-force', lbf.factor / 16, FORCE);

  // Other spellings of the same unit: "u" for micro on keyboards without µ (uN, ug), and the
  // lowercase l the SI allows for the litre (l, ml, dl). Shown as µN, mL and so on.
  const addSpelling = (typed: string, atom: CompoundAtom) => {
    if (typed !== atom.symbol && !exact.has(typed)) exact.set(typed, atom);
  };
  Array.from(exact.values()).forEach((atom) => addSpelling(atom.symbol.replace(/µ/g, 'u'), atom));
  Array.from(exact.entries()).forEach(([typed, atom]) => {
    if (atom.category === 'Volume' || (atom.category === null && sameDims(atom.dims, VOLUME))) {
      if (typed.endsWith('L')) addSpelling(`${typed.slice(0, -1)}l`, atom);
    }
  });

  const multiword = Array.from(byUnit.values())
    .filter((atom) => /\s/.test(atom.symbol))
    .sort((a, b) => b.symbol.length - a.symbol.length)
    .map((atom) => ({
      pattern: new RegExp(`^${atom.symbol.split(/\s+/).map(escapeRegex).join('\\s*')}(?![A-Za-zµ])`, 'i'),
      atom,
    }));

  cachedTables = { exact, byUnit, folded, multiword };
  return cachedTables;
}

/** Every unit symbol the engine reads exactly as written (for tests). */
export function listCompoundAtoms(): CompoundAtom[] {
  return Array.from(getTables().exact.values());
}

// --- Quantities -------------------------------------------------------------------------------

export type CompoundQuantity = {
  dims: Dimensions;
  /** As used in a sentence: "pressure or stress". */
  name: string;
  /** The coherent SI unit, as SwapUnits writes it. */
  si: string;
  /** Categories with a converter for it; energy and torque share their dimensions. */
  categories: UnitCategory[];
};

const QUANTITIES: CompoundQuantity[] = [
  { dims: [0, 0, 0, 0], name: 'a ratio (no unit)', si: '', categories: [] },
  { dims: LENGTH, name: 'length', si: 'm', categories: ['Length'] },
  { dims: MASS, name: 'mass', si: 'kg', categories: ['Mass'] },
  { dims: TIME, name: 'time', si: 's', categories: ['Time'] },
  { dims: TEMPERATURE, name: 'temperature (kelvin)', si: 'K', categories: ['Temperature'] },
  { dims: AREA, name: 'area (also volume per distance)', si: 'm²', categories: ['Area'] },
  { dims: VOLUME, name: 'volume', si: 'm³', categories: ['Volume'] },
  { dims: SPEED, name: 'speed', si: 'm/s', categories: ['Speed'] },
  { dims: ACCELERATION, name: 'acceleration', si: 'm/s²', categories: [] },
  { dims: [0, 0, -1, 0], name: 'frequency (per unit time)', si: 's⁻¹', categories: [] },
  { dims: FORCE, name: 'force (also energy per distance)', si: 'N', categories: ['Force'] },
  { dims: PRESSURE, name: 'pressure or stress', si: 'Pa', categories: ['Pressure'] },
  { dims: ENERGY, name: 'energy or torque', si: 'J', categories: ['Energy', 'Torque'] },
  { dims: POWER, name: 'power', si: 'W', categories: ['Power'] },
  { dims: DENSITY, name: 'density', si: 'kg/m³', categories: ['Density'] },
  { dims: [3, 0, -1, 0], name: 'volume flow rate', si: 'm³/s', categories: [] },
  { dims: [0, 1, -1, 0], name: 'mass flow rate', si: 'kg/s', categories: [] },
  { dims: [-2, 1, 0, 0], name: 'area density (mass per area)', si: 'kg/m²', categories: [] },
  { dims: [-1, 1, 0, 0], name: 'linear density (mass per length)', si: 'kg/m', categories: [] },
  { dims: [1, 1, -1, 0], name: 'momentum or impulse', si: 'N·s', categories: [] },
  { dims: [0, 1, -2, 0], name: 'force per length (stiffness, surface tension)', si: 'N/m', categories: [] },
  { dims: [-2, 1, -2, 0], name: 'force per volume (specific weight)', si: 'N/m³', categories: [] },
  { dims: [-1, 1, -1, 0], name: 'dynamic viscosity', si: 'Pa·s', categories: [] },
  { dims: [2, 0, -1, 0], name: 'kinematic viscosity or diffusivity', si: 'm²/s', categories: [] },
  { dims: [0, 1, -3, 0], name: 'power per area (heat flux, irradiance)', si: 'W/m²', categories: [] },
  { dims: [-1, 1, -3, 0], name: 'power per volume', si: 'W/m³', categories: [] },
  { dims: [2, 0, -2, 0], name: 'energy per mass (specific energy)', si: 'J/kg', categories: [] },
  { dims: [2, 0, -3, 0], name: 'power per mass', si: 'W/kg', categories: [] },
  { dims: [3, -1, 0, 0], name: 'specific volume', si: 'm³/kg', categories: [] },
  { dims: [2, 1, 0, 0], name: 'moment of inertia', si: 'kg·m²', categories: [] },
  { dims: [2, 1, -1, 0], name: 'angular momentum or action', si: 'J·s', categories: [] },
  { dims: [1, 1, -3, -1], name: 'thermal conductivity', si: 'W/(m·K)', categories: [] },
  { dims: [0, 1, -3, -1], name: 'heat transfer coefficient', si: 'W/(m²·K)', categories: [] },
  { dims: [2, 0, -2, -1], name: 'specific heat capacity', si: 'J/(kg·K)', categories: [] },
  { dims: [2, 1, -2, -1], name: 'heat capacity or entropy', si: 'J/K', categories: [] },
  { dims: [0, -1, 3, 1], name: 'thermal insulance (R-value)', si: 'm²·K/W', categories: [] },
  { dims: [-2, -1, 3, 1], name: 'thermal resistance', si: 'K/W', categories: [] },
  { dims: [0, 0, 0, -1], name: 'per kelvin (expansion coefficient)', si: 'K⁻¹', categories: [] },
  { dims: [-1, 0, 0, 1], name: 'temperature gradient', si: 'K/m', categories: [] },
  { dims: [-1, 0, 0, 0], name: 'per length', si: 'm⁻¹', categories: [] },
  // Fuel economy as plain dimensions. The Fuel Economy converter does the reciprocal units
  // (L/100 km) and the EPA energy equivalence; here it's only distance per volume or energy.
  { dims: [-2, 0, 0, 0], name: 'distance per volume (fuel economy)', si: 'm⁻²', categories: ['Fuel Economy'] },
  { dims: [-1, -1, 2, 0], name: 'distance per energy (EV efficiency)', si: 'm/J', categories: ['Fuel Economy'] },
];

function findQuantity(dims: Dimensions): CompoundQuantity | null {
  return QUANTITIES.find((quantity) => sameDims(quantity.dims, dims)) ?? null;
}

// --- Display ----------------------------------------------------------------------------------

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const toSuperscript = (value: number): string =>
  String(value).replace(/-/g, '⁻').replace(/\d/g, (digit) => SUPERSCRIPT_DIGITS[Number(digit)]);

type Term = { symbol: string; power: number };

/** "kg·m/s²", "W/(m·K)", "1/s" from units and their powers. */
export function renderUnitTerms(terms: Term[]): string {
  const several = terms.length > 1;
  const bracket = (symbol: string, power: number) =>
    /[/·]/.test(symbol) && (several || Math.abs(power) !== 1) ? `(${symbol})` : symbol;
  const show = ({ symbol, power }: Term) =>
    Math.abs(power) === 1 ? bracket(symbol, power) : `${bracket(symbol, power)}${toSuperscript(Math.abs(power))}`;
  const numerator = terms.filter((term) => term.power > 0).map(show);
  const denominator = terms.filter((term) => term.power < 0).map(show);
  if (denominator.length === 0) return numerator.join('·');
  // "s⁻¹" rather than "1/s", so a value reads "60 min⁻¹" and not "60 1/min".
  if (numerator.length === 0) {
    return terms.map(({ symbol, power }) => `${bracket(symbol, power)}${toSuperscript(power)}`).join('·');
  }
  const top = numerator.join('·');
  return denominator.length > 1 ? `${top}/(${denominator.join('·')})` : `${top}/${denominator[0]}`;
}

/** SI base units for some dimensions: [-1, 1, -2, 0] -> "kg/(m·s²)". */
export function renderDimensions(dims: Dimensions): string {
  return renderUnitTerms(
    (['m', 'kg', 's', 'K'] as const)
      .map((symbol, index) => ({ symbol, power: dims[index] }))
      // kg first, the way SI writes it: kg·m/s².
      .sort((a, b) => (a.symbol === 'kg' ? -1 : b.symbol === 'kg' ? 1 : 0))
      .filter((term) => term.power !== 0),
  );
}

// Built once: constructing an Intl.NumberFormat costs about 50 times more than using one.
const SIGNIFICANT = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 7 });
const WHOLE = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * 7 significant digits with thousands separators, but never rounding away whole digits
 * (123,456,789 stays as it is); ×10ⁿ outside 10⁻⁶ … 10¹².
 */
export function formatCompoundNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e12 || abs < 1e-6) {
    const [mantissa, exponent] = value.toExponential(6).split('e');
    const trimmed = mantissa.includes('.') ? mantissa.replace(/0+$/, '').replace(/\.$/, '') : mantissa;
    return `${trimmed} × 10${toSuperscript(Number(exponent))}`;
  }
  return (abs >= 1e7 ? WHOLE : SIGNIFICANT).format(value);
}

/** The value for copying: up to 12 significant digits, no separators. */
export function formatCompoundPlain(value: number): string {
  return String(Number(value.toPrecision(12)));
}

// --- Reading single units ---------------------------------------------------------------------

type Part = { atom: CompoundAtom; power: number };

/**
 * One way to read a typed unit. Lower rank is preferred: 0 = exactly a symbol, name, alias or
 * notation; 1 = a listed unit's symbol in another case ("KN"); 2 = an engine-only unit in another
 * case ("mn"); 3 = symbols run together or hyphenated ("kgm", "kg-m" as kg·m). A power typed after
 * it applies to the last part ("kgm2" = kg·m²).
 */
type TokenReading = { parts: Part[]; rank: number };

type TextResolution = {
  readings: TokenReading[];
  /** Units on the site that this converter doesn't cover ("MB", "USD", "°C"). */
  excluded: Array<{ symbol: string; category: UnitCategory }>;
  unsupported: string | null;
};

const isCaseFold = (typed: string, symbol: string) =>
  typed !== symbol &&
  (typed.toLowerCase() === symbol.toLowerCase() || typed.toLowerCase() === symbol.replace(/·/g, '').toLowerCase());

// A prefixed match ("mA", "kHz") only counts when nothing else reads the text, so "PA" in
// capitals is still the pascal and not a petaampere.
function findUnsupported(typed: string, withPrefixes: boolean): string | null {
  const direct = UNSUPPORTED_SYMBOLS[typed];
  if (direct) return `${typed} (${direct[0]})`;
  if (!withPrefixes) return null;
  for (const prefix of [...ALL_PREFIXES, 'u']) {
    if (!typed.startsWith(prefix)) continue;
    const entry = UNSUPPORTED_SYMBOLS[typed.slice(prefix.length)];
    if (entry && entry[1]) return `${typed} (${entry[0]})`;
  }
  return null;
}

function resolveText(typed: string, asToken: boolean): TextResolution {
  const tables = getTables();
  const readings: TokenReading[] = [];
  const add = (atom: CompoundAtom | undefined, rank: number, power = 1) => {
    if (!atom) return;
    if (readings.some((reading) => reading.parts.length === 1 && reading.parts[0].atom === atom && reading.parts[0].power === power)) return;
    readings.push({ parts: [{ atom, power }], rank });
  };

  add(tables.exact.get(typed), 0);
  // "Cal" is a kilocalorie only in that case (the parser's exact-case notations).
  const rewritten = rewriteCaseExactNotations(typed);
  if (rewritten !== typed) add(tables.exact.get(rewritten), 0);
  // "Nm" (N·m without the dot), "kN", "PS": a symbol whose lowercase form is another unit.
  const caseExact = getCaseExactUnitMatch(typed);
  if (caseExact) add(tables.byUnit.get(unitKey(caseExact.category, caseExact.symbol)), 0);

  const excluded: TextResolution['excluded'] = [];
  resolveUnitCandidates(rewritten).forEach((entry) => {
    if (entry.category === 'SI Prefixes') return;
    const atom = tables.byUnit.get(unitKey(entry.category, entry.symbol));
    if (!atom) {
      excluded.push(entry);
      return;
    }
    add(atom, isCaseFold(typed, entry.symbol) ? 1 : 0);
  });

  (tables.folded.get(typed.toLowerCase()) ?? []).forEach((atom) => {
    if (atom.symbol !== typed) add(atom, 2);
  });

  if (!asToken) {
    return { readings: readings.sort((a, b) => a.rank - b.rank), excluded, unsupported: null };
  }

  const unsupported = readings.some((reading) => reading.rank === 0) ? null : findUnsupported(typed, readings.length === 0);
  if (unsupported) return { readings: [], excluded, unsupported };

  // "sqft", "cuin": a power word run into the unit.
  if (readings.length === 0) {
    const powerWord = typed.match(/^(sq|cu)(.+)$/i);
    if (powerWord) {
      const inner = resolveText(powerWord[2], false).readings.filter((reading) => reading.rank === 0);
      inner.forEach((reading) => add(reading.parts[0].atom, 0, powerWord[1].toLowerCase() === 'sq' ? 2 : 3));
    }
  }

  // Two symbols run together ("Pas" = Pa·s, "kNm" = kN·m), as a last resort: only when nothing
  // reads the text exactly or only a compound unit does ("kgm" is kgf·m, but kg·m in "kgm/s²"),
  // so "mm" is never m·m. Never for text that names a unit this converter doesn't cover ("mpg").
  const exactReadings = readings.filter((reading) => reading.rank === 0);
  const onlyCompound = exactReadings.every((reading) => /[·/]/.test(reading.parts[0].atom.symbol));
  if (excluded.length === 0 && onlyCompound) {
    const hyphenated = typed.split('-').map((piece) => tables.exact.get(piece));
    if (hyphenated.length > 1 && hyphenated.every(Boolean)) {
      // "kg-m" is kgf·m to the finder, but kg·m in "kg-m/s²".
      readings.push({ parts: hyphenated.map((atom) => ({ atom: atom!, power: 1 })), rank: 3 });
    }
    for (let cut = 1; cut < typed.length; cut += 1) {
      const left = tables.exact.get(typed.slice(0, cut));
      const right = tables.exact.get(typed.slice(cut));
      if (left && right) readings.push({ parts: [{ atom: left, power: 1 }, { atom: right, power: 1 }], rank: 3 });
    }
  }

  return { readings: readings.sort((a, b) => a.rank - b.rank), excluded, unsupported: null };
}

// --- Tokenizing and parsing an expression -----------------------------------------------------

export type CompoundErrorKind = 'empty' | 'syntax' | 'unknown' | 'unsupported' | 'excluded' | 'temperature' | 'mismatch';

export type CompoundError = {
  kind: CompoundErrorKind;
  message: string;
  /** A category page that does convert it (Temperature, Currency, Fuel Economy ...). */
  category?: UnitCategory;
  /** A corrected query ("kgf/cm²" for "kg/cm²"), why, and its answer ("1 kgf/cm² = 0.980665 bar"). */
  suggestion?: { query: string; reason: string; preview: string };
};

type Token =
  | { kind: 'word'; text: string; start: number; end: number }
  | { kind: 'mul' }
  | { kind: 'div' }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'pow'; value: number }
  | { kind: 'one' }
  | { kind: 'modifier'; value: number };

const WORD_CHAR = /[A-Za-zµ°Ω]/;
const SUPERSCRIPT_RUN = /^[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+/;

const syntaxError = (message: string): CompoundError => ({ kind: 'syntax', message });
const NUMBER_INSIDE = 'Numbers inside a unit aren\'t supported, except powers (m², s^-1) and 1/… (1/s).';

function tokenize(text: string): Token[] | CompoundError {
  const tokens: Token[] = [];
  const { multiword } = getTables();
  let index = 0;

  const canTakePower = () => {
    const previous = tokens[tokens.length - 1];
    return previous !== undefined && (previous.kind === 'word' || previous.kind === 'rparen');
  };

  while (index < text.length) {
    const char = text[index];
    // Written against the previous token, with no space: "m2" is m², "m 2" is not.
    const glued = index > 0 && !/\s/.test(text[index - 1]);

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (WORD_CHAR.test(char)) {
      const rest = text.slice(index);
      const multi = multiword.find(({ pattern }) => pattern.test(rest));
      if (multi) {
        const length = rest.match(multi.pattern)![0].length;
        tokens.push({ kind: 'word', text: multi.atom.symbol, start: index, end: index + length });
        index += length;
        continue;
      }

      let end = index;
      while (end < text.length && WORD_CHAR.test(text[end])) end += 1;
      // Hyphenated words stay together for now ("pound-force", "lb-ft"); one that isn't a unit is
      // split into a product later ("kW-h").
      while (text[end] === '-' && WORD_CHAR.test(text[end + 1] ?? '')) {
        end += 1;
        while (end < text.length && WORD_CHAR.test(text[end])) end += 1;
      }
      const word = text.slice(index, end);
      const lower = word.toLowerCase();
      if (lower === 'per') {
        tokens.push({ kind: 'div' });
      } else if (lower === 'square' || lower === 'sq' || lower === 'cubic' || lower === 'cu') {
        tokens.push({ kind: 'modifier', value: lower.startsWith('s') ? 2 : 3 });
        if (text[end] === '.') end += 1;
      } else if ((lower === 'squared' || lower === 'cubed') && canTakePower()) {
        tokens.push({ kind: 'pow', value: lower === 'squared' ? 2 : 3 });
      } else if (word === 'x' && tokens.length > 0) {
        tokens.push({ kind: 'mul' });
      } else {
        tokens.push({ kind: 'word', text: word, start: index, end });
      }
      index = end;
      continue;
    }

    if (/\d/.test(char)) {
      const digits = text.slice(index).match(/^\d+/)![0];
      if (glued && canTakePower()) {
        tokens.push({ kind: 'pow', value: Number(digits) });
      } else if (digits === '1' && /^\s*(\/|÷|per\b)/i.test(text.slice(index + 1))) {
        tokens.push({ kind: 'one' });
      } else {
        return syntaxError(NUMBER_INSIDE);
      }
      index += digits.length;
      continue;
    }

    if (char === '-' && glued && canTakePower() && /\d/.test(text[index + 1] ?? '')) {
      const digits = text.slice(index + 1).match(/^\d+/)![0];
      tokens.push({ kind: 'pow', value: -Number(digits) });
      index += 1 + digits.length;
      continue;
    }

    if (char === '^') {
      const match = text.slice(index + 1).match(/^\s*\(?\s*([-+]?)\s*(\d+)\s*\)?/);
      if (!match || !canTakePower()) {
        return syntaxError('Put a whole number after ^, for example m^2 or s^-1.');
      }
      tokens.push({ kind: 'pow', value: (match[1] === '-' ? -1 : 1) * Number(match[2]) });
      index += 1 + match[0].length;
      continue;
    }

    const superscript = text.slice(index).match(SUPERSCRIPT_RUN);
    if (superscript) {
      if (!canTakePower()) return syntaxError('A power (² or ³) needs a unit before it.');
      const digits = superscript[0].replace(/[⁻⁺]/g, '').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (digit) => String(SUPERSCRIPT_DIGITS.indexOf(digit)));
      tokens.push({ kind: 'pow', value: (superscript[0].startsWith('⁻') ? -1 : 1) * Number(digits) });
      index += superscript[0].length;
      continue;
    }

    if ('·⋅∙•*×.-'.includes(char)) {
      if (char === '.' && /\d/.test(text[index + 1] ?? '')) return syntaxError(NUMBER_INSIDE);
      tokens.push({ kind: 'mul' });
    } else if (char === '/' || char === '÷') {
      tokens.push({ kind: 'div' });
    } else if (char === '(' || char === '[') {
      tokens.push({ kind: 'lparen' });
    } else if (char === ')' || char === ']') {
      tokens.push({ kind: 'rparen' });
    } else {
      return syntaxError(`"${char}" isn't part of a unit expression.`);
    }
    index += 1;
  }

  return tokens;
}

/** A unit as it appears in the expression: its own power (m²) and the power from where it sits. */
type Occurrence = { token: number; own: number; outer: number };

function parseTokens(tokens: Token[]): Occurrence[] | CompoundError {
  let position = 0;
  const occurrences: Occurrence[] = [];
  const peek = () => tokens[position];

  const startsFactor = (token: Token | undefined) =>
    token !== undefined && (token.kind === 'word' || token.kind === 'lparen' || token.kind === 'one' || token.kind === 'modifier');

  const takePowers = (): number => {
    let power = 1;
    while (peek()?.kind === 'pow') {
      power *= (peek() as { value: number }).value;
      position += 1;
    }
    return power;
  };

  const parseFactor = (outer: number): CompoundError | null => {
    let modifier = 1;
    const first = peek();
    if (first?.kind === 'modifier') {
      modifier = first.value;
      position += 1;
    }
    const token = peek();
    if (token?.kind === 'word') {
      const tokenIndex = position;
      position += 1;
      occurrences.push({ token: tokenIndex, own: modifier * takePowers(), outer });
      return null;
    }
    if (token?.kind === 'lparen') {
      position += 1;
      const start = occurrences.length;
      const inner = parseExpression(1);
      if (inner) return inner;
      if (peek()?.kind !== 'rparen') return syntaxError('A bracket is opened but not closed.');
      position += 1;
      const power = modifier * takePowers();
      for (let index = start; index < occurrences.length; index += 1) {
        occurrences[index].outer *= power * outer;
      }
      return null;
    }
    if (token?.kind === 'one') {
      position += 1;
      takePowers();
      return null;
    }
    return syntaxError(token?.kind === 'rparen' ? 'A bracket is closed but never opened.' : 'A unit is missing.');
  };

  // Factors joined by ·, * or nothing at all ("kN m").
  const parseTerm = (outer: number): CompoundError | null => {
    const first = parseFactor(outer);
    if (first) return first;
    for (;;) {
      if (peek()?.kind === 'mul') position += 1;
      else if (!startsFactor(peek())) return null;
      const next = parseFactor(outer);
      if (next) return next;
    }
  };

  // Multiplication binds tighter than division: "W/m·K" is W/(m·K) and "J/kg/K" is J/(kg·K).
  function parseExpression(outer: number): CompoundError | null {
    if (peek()?.kind !== 'div') {
      const first = parseTerm(outer);
      if (first) return first;
    }
    while (peek()?.kind === 'div') {
      position += 1;
      const next = parseTerm(-outer);
      if (next) return next;
    }
    return null;
  }

  const error = parseExpression(1);
  if (error) return error;
  if (position < tokens.length) {
    return syntaxError(peek()?.kind === 'rparen' ? 'A bracket is closed but never opened.' : 'Part of the expression couldn\'t be read.');
  }
  if (occurrences.length === 0) return syntaxError('A unit is missing.');
  if (occurrences.some((occurrence) => Math.abs(occurrence.own * occurrence.outer) > 12)) {
    return syntaxError('Powers above 12 aren\'t supported.');
  }
  return occurrences;
}

// --- Reading a side ---------------------------------------------------------------------------

export type CompoundTokenReading = {
  /** As typed: "KN", "feet", "kgm". */
  typed: string;
  /** The units it was read as (two for "kgm" = kg·m). */
  atoms: CompoundAtom[];
  rank: number;
  /** The exact reading passed over for this one, if any ("kn" is the knot, read as kN for lbf). */
  exact?: CompoundAtom[];
};

export type CompoundSide = {
  /** As SwapUnits writes it: "kN/cm²", "psi". */
  display: string;
  /** One of this unit in SI base units. */
  factor: number;
  dims: Dimensions;
  rank: number;
  terms: Part[];
  readings: CompoundTokenReading[];
  /**
   * Read as one listed unit, by its symbol, alias or notation ("lb/in²" is psi, "lb ft" is
   * lbf·ft), rather than unit by unit. Preferred over a literal reading of the same rank.
   */
  listed: boolean;
};

function tokenError(typed: string, resolution: TextResolution): CompoundError {
  if (resolution.unsupported) {
    return {
      kind: 'unsupported',
      message: `${resolution.unsupported} isn't covered: this converter works with length, mass, time and temperature in kelvin, and units built from them.`,
    };
  }
  const temperature = resolution.excluded.find((entry) => entry.category === 'Temperature');
  if (temperature) {
    return {
      kind: 'temperature',
      message: `${temperature.symbol} has an offset (0 °C is 273.15 K), so it can't be multiplied or divided like other units. Use K for temperature differences (a 1 °C step is 1 K, a 1 °F step is 5/9 K), or the temperature converter for temperatures.`,
      category: 'Temperature',
    };
  }
  const other = resolution.excluded[0];
  if (other) {
    const what: Partial<Record<UnitCategory, string>> = {
      Currency: 'a currency',
      'Data Storage': 'a data storage unit',
      'Data Transfer Rate': 'a data rate unit',
      'Fuel Economy': 'a fuel economy unit',
      Bitcoin: 'a Bitcoin unit',
    };
    return {
      kind: 'excluded',
      message: `${typed} is ${what[other.category] ?? 'a unit'} (${other.symbol}), which this converter doesn't combine with other units. Its own converter handles it.`,
      category: other.category,
    };
  }
  return { kind: 'unknown', message: `"${typed}" isn't a unit SwapUnits knows.` };
}

type ParsedSide = { tokens: Token[]; occurrences: Occurrence[]; resolutions: Map<number, TokenReading[]> };

function parseSide(sideText: string): ParsedSide | CompoundError {
  let text = sideText;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const tokens = tokenize(text);
    if (!Array.isArray(tokens)) return tokens;
    const occurrences = parseTokens(tokens);
    if (!Array.isArray(occurrences)) return occurrences;

    const resolutions = new Map<number, TokenReading[]>();
    let rewritten: string | null = null;
    for (const { token: tokenIndex } of occurrences) {
      if (resolutions.has(tokenIndex)) continue;
      const token = tokens[tokenIndex] as Extract<Token, { kind: 'word' }>;
      const resolution = resolveText(token.text, true);
      if (resolution.readings.length > 0) {
        resolutions.set(tokenIndex, resolution.readings);
        continue;
      }
      if (token.text.includes('-') && !resolution.unsupported) {
        // "kW-h": not a unit as a whole, so the hyphens join units.
        rewritten = `${text.slice(0, token.start)}${token.text.replace(/-/g, '·')}${text.slice(token.end)}`;
        break;
      }
      return tokenError(token.text, resolution);
    }
    if (rewritten === null) return { tokens, occurrences, resolutions };
    text = rewritten;
  }
  return syntaxError('Part of the expression couldn\'t be read.');
}

const MAX_COMBINATIONS = 256;

/** A side from its units; `listedAs` is given for a side read as one listed unit. */
function buildSide(terms: Part[], rank: number, readings: CompoundTokenReading[], listedAs?: string): CompoundSide {
  const factor = terms.reduce((total, { atom, power }) => total * atom.factor ** power, 1);
  const dims = terms.reduce<Dimensions>((total, { atom, power }) => addDims(total, atom.dims, power), [0, 0, 0, 0]);
  return {
    display: listedAs ?? (renderUnitTerms(terms.map(({ atom, power }) => ({ symbol: atom.symbol, power }))) || '1'),
    factor,
    dims,
    rank,
    terms,
    readings,
    listed: listedAs !== undefined,
  };
}

function combineReadings(parsed: ParsedSide): CompoundSide[] {
  const tokenIndexes = Array.from(parsed.resolutions.keys());
  const typedOf = (tokenIndex: number) => (parsed.tokens[tokenIndex] as Extract<Token, { kind: 'word' }>).text;
  const exactOf = new Map(
    tokenIndexes.map((tokenIndex) => [tokenIndex, parsed.resolutions.get(tokenIndex)!.find((reading) => reading.rank === 0)]),
  );

  // Every way to read the words, best-ranked readings first, at most MAX_COMBINATIONS of them.
  let choices: TokenReading[][] = [[]];
  tokenIndexes.forEach((tokenIndex) => {
    choices = choices
      .flatMap((choice) => parsed.resolutions.get(tokenIndex)!.map((reading) => [...choice, reading]))
      .slice(0, MAX_COMBINATIONS);
  });

  return choices.map((choice) => {
    const chosen = new Map(tokenIndexes.map((tokenIndex, position) => [tokenIndex, choice[position]]));
    const terms: Part[] = [];
    parsed.occurrences.forEach(({ token, own, outer }) => {
      const { parts } = chosen.get(token)!;
      parts.forEach((part, index) => {
        // A power written after a run-together reading belongs to its last unit ("kgm2" = kg·m²).
        const power = (index === parts.length - 1 ? part.power * own : part.power) * outer;
        const existing = terms.find((term) => term.atom === part.atom);
        if (existing) existing.power += power;
        else terms.push({ atom: part.atom, power });
      });
    });
    const readings = tokenIndexes.map((tokenIndex): CompoundTokenReading => {
      const reading = chosen.get(tokenIndex)!;
      const exact = exactOf.get(tokenIndex);
      return {
        typed: typedOf(tokenIndex),
        atoms: reading.parts.map((part) => part.atom),
        rank: reading.rank,
        exact: reading.rank > 0 && exact ? exact.parts.map((part) => part.atom) : undefined,
      };
    });
    const rank = choice.reduce((total, reading) => total + reading.rank, 0);
    return buildSide(terms.filter((term) => term.power !== 0), rank, readings);
  });
}

const sideKey = (side: CompoundSide) => `${side.dims.join(',')}:${side.factor.toPrecision(9)}`;

const isTorqueLike = (side: CompoundSide) =>
  side.terms.some(({ atom }) => atom.category === 'Torque') ||
  (side.terms.length === 2 &&
    side.terms.every(({ power }) => power === 1) &&
    side.terms.some(({ atom }) => sameDims(atom.dims, FORCE)) &&
    side.terms.some(({ atom }) => sameDims(atom.dims, LENGTH)));

/** The categories to link for a side's quantity, the likelier one first (torque for N·m). */
function categoriesFor(side: CompoundSide, other?: CompoundSide | null): UnitCategory[] {
  const quantity = findQuantity(side.dims);
  if (!quantity) return [];
  if (sameDims(side.dims, ENERGY) && (isTorqueLike(side) || (other ? isTorqueLike(other) : false))) {
    return ['Torque', 'Energy'];
  }
  return quantity.categories;
}

/** Listed units exactly this size (N/mm² -> MPa), in the likelier category only (N·m isn't J). */
function findSameAs(side: CompoundSide): string[] {
  const [category] = categoriesFor(side);
  return Array.from(getTables().byUnit.values())
    .filter((atom) => atom.category === category && atom.symbol !== side.display && sameSize(atom.factor, side.factor))
    .map((atom) => atom.symbol);
}

/** A listed unit shown the way it was typed when that's one of its notations ("kg·m/s²" for N). */
function listedDisplay(typed: string, atom: CompoundAtom): string {
  return (atom.category && findNotationAsTyped(atom.category, atom.symbol, typed)?.text) || atom.symbol;
}

function resolveSide(sideText: string): { sides: CompoundSide[] } | { error: CompoundError } {
  const listedSide = (typed: string, reading: TokenReading, readings?: CompoundTokenReading[]): CompoundSide => {
    const atom = reading.parts[0].atom;
    return buildSide(reading.parts, reading.rank, readings ?? [{ typed, atoms: [atom], rank: reading.rank }], listedDisplay(typed, atom));
  };

  const parsed = parseSide(sideText);
  // "A", "T", "Hz": refused even though the alias list would read "A" as the year.
  if (!('tokens' in parsed) && parsed.kind === 'unsupported') return { error: parsed };

  // The whole side as one unit: "lb ft" (lbf·ft), "fl oz (UK)", "N/mm²" (MPa), "kph".
  const wholeResolution = resolveText(sideText, false);
  const whole = wholeResolution.readings.map((reading) => listedSide(sideText, reading));

  if (!('tokens' in parsed) && whole.length === 0) {
    // "L/100km", "deg C": a unit the site converts elsewhere explains better than a syntax error.
    return { error: wholeResolution.excluded.length > 0 ? tokenError(sideText, wholeResolution) : parsed };
  }
  const combined = 'tokens' in parsed ? combineReadings(parsed) : [];

  // An expression that is itself a listed unit's notation: "pounds per square inch" reads as
  // lb/in², which unit-data says is psi (the pound there is the pound-force).
  const viaNotation = combined
    .filter((side) => side.terms.length > 1 || side.terms.some(({ power }) => power !== 1))
    .flatMap((side) =>
      resolveText(side.display, false).readings
        .filter((reading) => reading.rank === 0)
        .map((reading) => ({ ...listedSide(side.display, reading, side.readings), rank: side.rank })),
    );

  // One side per size; the best rank wins, and a listed reading of the same rank marks it listed.
  const merged = new Map<string, CompoundSide>();
  [...combined, ...whole, ...viaNotation].forEach((side) => {
    const key = sideKey(side);
    const existing = merged.get(key);
    if (!existing || side.rank < existing.rank) merged.set(key, side);
    else if (side.listed && side.rank === existing.rank) existing.listed = true;
  });
  return { sides: Array.from(merged.values()).sort((a, b) => a.rank - b.rank) };
}

// --- Converting -------------------------------------------------------------------------------

export type CompoundAnswer = {
  /** The amount typed (1 when none was). */
  value: number;
  from: CompoundSide;
  to: CompoundSide | null;
  /** The typed amount in SI base units. */
  siValue: number;
  result: number | null;
  quantity: CompoundQuantity | null;
  categories: UnitCategory[];
  /** The SI unit the working goes through ("Pa", "N·m"). */
  siUnit: string;
  notes: string[];
};

export type CompoundResult =
  | { ok: true; answers: CompoundAnswer[]; ambiguity: string | null }
  | { ok: false; error: CompoundError };

function normalizeQuery(raw: string): string {
  let text = raw
    .replace(/μ/g, 'µ')
    .replace(/[−–]/g, '-')
    .replace(/℃/g, '°C')
    .replace(/℉/g, '°F')
    .replace(/º/g, '°')
    .replace(/\s*(?:→|⟶|->|=>|=)\s*/g, ' to ')
    .replace(/\?+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  const leadIn = /^(?:please\s+)?(?:convert|calculate|calc|what\s+is|what's|whats|how\s+much\s+is)\s+/i;
  while (leadIn.test(text)) text = text.replace(leadIn, '');
  return text;
}

function takeValue(text: string): { value: number; valueTyped: boolean; rest: string } {
  const match = text.match(/^[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d+)?(?:e[-+]?\d+)?/i);
  const token = match?.[0] ?? '';
  const value = Number(token.replace(/,/g, ''));
  if (!/\d/.test(token) || !Number.isFinite(value)) {
    return { value: 1, valueTyped: false, rest: text };
  }
  const rest = text.slice(token.length).trim();
  // "10/s" is 10 of 1/s (and "1/s" one of them), not 10 followed by "/s".
  return { value, valueTyped: true, rest: rest.startsWith('/') ? `1${rest}` : rest };
}

type Split = { from: string; to: string };

// "to" / "into" first, then "in" (which is also the inch); the parser's connector rule, so the
// "in" of "lbf·in" or "in²" is never one. The whole text without a target last ("plain"), and
// only when no connector works.
function candidateSplits(rest: string): { connectors: Split[]; plain: string } {
  const matches = findConnectorMatches(rest);
  const ordered = [
    ...matches.filter((match) => match.word.toLowerCase() !== 'in'),
    ...matches.filter((match) => match.word.toLowerCase() === 'in'),
  ];
  const connectors: Split[] = [];
  let plain = rest;
  ordered.forEach(({ index, word }) => {
    const from = rest.slice(0, index).trim();
    const to = rest.slice(index + word.length).trim();
    if (from && to) connectors.push({ from, to });
    // "3 kN/cm² to" with nothing after it yet: no target.
    else if (from && !to && word.toLowerCase() !== 'in') plain = from;
  });
  return { connectors, plain };
}

const pickBest = (sides: CompoundSide[]) =>
  [...sides].sort((a, b) => a.rank - b.rank || Number(Boolean(findQuantity(b.dims))) - Number(Boolean(findQuantity(a.dims))))[0];

/** The SI unit for some dimensions, N·m rather than J where it's torque. */
function siUnitFor(dims: Dimensions, torque: boolean): string {
  if (torque && sameDims(dims, ENERGY)) return 'N·m';
  return findQuantity(dims)?.si ?? renderDimensions(dims);
}

function describeName(atoms: CompoundAtom[]): string {
  return atoms.length === 1 ? `${atoms[0].symbol} (${atoms[0].name.toLowerCase()})` : atoms.map((atom) => atom.symbol).join('·');
}

function readingNotes(side: CompoundSide, hasOtherSide: boolean): string[] {
  return side.readings.flatMap((reading) => {
    if (reading.rank === 0) return [];
    const shown = describeName(reading.atoms);
    const why = hasOtherSide ? ' to match the other side' : '';
    return reading.exact
      ? [`${reading.typed} on its own is ${describeName(reading.exact)}; here it's read as ${shown}${why}.`]
      : [`${reading.typed} is read as ${shown}.`];
  });
}

function buildAnswer(value: number, from: CompoundSide, to: CompoundSide | null): CompoundAnswer {
  const categories = categoriesFor(from, to);
  const notes: string[] = [...readingNotes(from, Boolean(to)), ...(to ? readingNotes(to, true) : [])];
  if (sameDims(from.dims, ENERGY)) {
    notes.push('Energy and torque have the same dimensions (kg·m²/s²), so the numbers convert either way, but they are different quantities: SwapUnits writes torque in N·m and energy in J.');
  }
  [from, to].forEach((side) => {
    const sameAs = side ? findSameAs(side) : [];
    if (side && sameAs.length > 0) notes.push(`${side.display} is the same unit as ${sameAs.join(', ')}.`);
  });
  const siValue = value * from.factor;
  return {
    value,
    from,
    to,
    siValue,
    result: to ? siValue / to.factor : null,
    quantity: findQuantity(from.dims),
    categories,
    siUnit: siUnitFor(from.dims, categories[0] === 'Torque'),
    notes,
  };
}

/** "mw can mean mW (milliwatt) or MW (megawatt)" for answers that differ in how a word was read. */
function describeAmbiguity(answers: CompoundAnswer[], sideText: string): string {
  const typedWords = new Map<string, Set<string>>();
  answers.forEach((answer) => {
    [answer.from, answer.to].forEach((side) => {
      side?.readings.forEach((reading) => {
        const set = typedWords.get(reading.typed) ?? new Set<string>();
        set.add(describeName(reading.atoms));
        typedWords.set(reading.typed, set);
      });
    });
  });
  const differing = Array.from(typedWords.entries()).filter(([, readings]) => readings.size > 1);
  if (differing.length === 1) {
    const [typed, readings] = differing[0];
    return `${typed} can mean ${Array.from(readings).join(' or ')}.`;
  }
  return `${sideText} can be read ${answers.length} ways.`;
}

function describeDifference(from: CompoundSide, to: CompoundSide): string {
  const difference = addDims(from.dims, to.dims, -1);
  if (difference.every((value) => value === 0)) return '';
  // Shown the way round that has a name ("m/s² (acceleration)", not "s²/m"), else with more
  // positive powers ("m", not "m⁻¹").
  const inverse = difference.map((value) => -value) as Dimensions;
  const sum = (dims: Dimensions) => dims.reduce((total, value) => total + value, 0);
  const named = (dims: Dimensions) => Number(findQuantity(dims) !== null);
  const shown =
    named(inverse) - named(difference) > 0 || (named(inverse) === named(difference) && sum(inverse) > sum(difference))
      ? inverse
      : difference;
  const quantity = findQuantity(shown);
  return ` They differ by ${renderDimensions(shown)}${quantity ? ` (${shortName(quantity)})` : ''}, so one can't be converted into the other.`;
}

const shortName = (quantity: CompoundQuantity) => quantity.name.replace(/ \(.*\)$/, '');

function measures(side: CompoundSide): string {
  const quantity = findQuantity(side.dims);
  const base = renderDimensions(side.dims) || 'no unit';
  return quantity ? `${side.display} measures ${shortName(quantity)} (${base})` : `${side.display} has dimensions ${base}`;
}

/** A query with the mass unit swapped for its force unit, when that makes the sides match. */
function suggestForce(value: number, valueTyped: boolean, split: Split, from: CompoundSide, to: CompoundSide): { query: string; reason: string } | undefined {
  const tryFix = (side: CompoundSide, sideText: string, other: CompoundSide): { text: string; reason: string } | null => {
    if (!sameDims(addDims(side.dims, ACCELERATION), other.dims)) return null;
    const massReading = side.readings.find((reading) => reading.atoms.length === 1 && FORCE_FOR_MASS[reading.atoms[0].symbol]);
    if (!massReading) return null;
    const mass = massReading.atoms[0].symbol;
    const force = getTables().exact.get(FORCE_FOR_MASS[mass])!;
    const pattern = new RegExp(`(^|[^A-Za-zµ])${escapeRegex(massReading.typed)}(?![A-Za-zµ])`);
    if (!pattern.test(sideText)) return null;
    return {
      text: sideText.replace(pattern, `$1${force.symbol}`),
      reason: `${massReading.typed} is a mass. For the force of that mass under standard gravity, use ${force.symbol} (${force.name.toLowerCase()}): 1 ${force.symbol} = ${formatCompoundNumber(force.factor)} N.`,
    };
  };
  const prefix = valueTyped ? `${formatCompoundPlain(value)} ` : '';
  const fromFix = tryFix(from, split.from, to);
  if (fromFix) return { query: `${prefix}${fromFix.text} to ${split.to}`, reason: fromFix.reason };
  const toFix = tryFix(to, split.to, from);
  if (toFix) return { query: `${prefix}${split.from} to ${toFix.text}`, reason: toFix.reason };
  return undefined;
}

function mismatchError(value: number, valueTyped: boolean, split: Split, fromSides: CompoundSide[], toSides: CompoundSide[]): CompoundError {
  const from = pickBest(fromSides);
  const to = pickBest(toSides);
  let message = `${measures(from)}, but ${measures(to)}.${describeDifference(from, to)}`;
  const timeApart = sameDims(addDims(from.dims, to.dims, -1), [0, 0, 1, 0]) || sameDims(addDims(from.dims, to.dims, -1), [0, 0, -1, 0]);
  if (timeApart && [from.dims, to.dims].some((dims) => sameDims(dims, ENERGY)) && [from.dims, to.dims].some((dims) => sameDims(dims, POWER))) {
    message += ' Energy is power × time: 1 kW for 1 hour is 1 kWh.';
  }
  const suggestion = suggestForce(value, valueTyped, split, from, to);
  if (suggestion) {
    const check = convertCompoundQuery(suggestion.query);
    if (check.ok && check.answers.length === 1) {
      return { kind: 'mismatch', message, suggestion: { ...suggestion, preview: describeAnswer(check.answers[0]) } };
    }
  }
  return { kind: 'mismatch', message };
}

export function convertCompoundQuery(rawQuery: string): CompoundResult {
  const text = normalizeQuery(rawQuery ?? '');
  const { value, valueTyped, rest } = takeValue(text);
  const fail = (error: CompoundError): CompoundResult => ({ ok: false, error });
  if (!text) return fail({ kind: 'empty', message: 'Type a unit expression, for example "3 kN/cm² to MPa".' });
  if (!rest) return fail({ kind: 'syntax', message: 'Add a unit after the number.' });

  const { connectors, plain } = candidateSplits(rest);
  let firstError: CompoundError | null = null;
  let firstMismatch: { split: Split; from: CompoundSide[]; to: CompoundSide[] } | null = null;

  for (const split of connectors) {
    const from = resolveSide(split.from);
    if ('error' in from) {
      firstError ??= from.error;
      continue;
    }
    const to = resolveSide(split.to);
    if ('error' in to) {
      firstError ??= to.error;
      continue;
    }
    const pairs = from.sides.flatMap((fromSide) =>
      to.sides.filter((toSide) => sameDims(fromSide.dims, toSide.dims)).map((toSide) => ({ fromSide, toSide, rank: fromSide.rank + toSide.rank })),
    );
    if (pairs.length === 0) {
      firstMismatch ??= { split, from: from.sides, to: to.sides };
      continue;
    }
    const bestRank = Math.min(...pairs.map((pair) => pair.rank));
    const best = pairs.filter((pair) => pair.rank === bestRank);
    const listed = best.filter((pair) => pair.fromSide.listed && pair.toSide.listed);
    const answers: CompoundAnswer[] = [];
    (listed.length > 0 ? listed : best).forEach(({ fromSide, toSide }) => {
      const answer = buildAnswer(value, fromSide, toSide);
      if (!answers.some((other) => sameSize(other.result!, answer.result!))) answers.push(answer);
    });
    return { ok: true, answers, ambiguity: answers.length > 1 ? describeAmbiguity(answers, rest) : null };
  }

  if (firstMismatch) {
    return fail(mismatchError(value, valueTyped, firstMismatch.split, firstMismatch.from, firstMismatch.to));
  }
  if (firstError) return fail(firstError);

  const from = resolveSide(plain);
  if ('error' in from) return fail(from.error);
  const named = from.sides.filter((side) => findQuantity(side.dims));
  const pool = named.length > 0 ? named : from.sides;
  const bestRank = Math.min(...pool.map((side) => side.rank));
  const best = pool.filter((side) => side.rank === bestRank);
  const listed = best.filter((side) => side.listed);
  const answers = (listed.length > 0 ? listed : best).map((side) => buildAnswer(value, side, null));
  return { ok: true, answers, ambiguity: answers.length > 1 ? describeAmbiguity(answers, plain) : null };
}

// --- Describing an answer ---------------------------------------------------------------------

/** "1,000 N" for a unit in SI (N·m rather than J where it's torque); null for an SI unit itself. */
function atomInSi(atom: CompoundAtom, torque = atom.category === 'Torque'): string | null {
  const si = siUnitFor(atom.dims, torque);
  return atom.factor === 1 && si === atom.symbol ? null : `${formatCompoundNumber(atom.factor)} ${si}`;
}

/** "1,000 N ÷ (0.01 m)²": each unit replaced by its size in SI. */
function describeFactors(side: CompoundSide, torque: boolean): string {
  const show = ({ atom, power }: Part) => {
    const base = atomInSi(atom, torque) ?? atom.symbol;
    if (Math.abs(power) === 1) return base;
    return /\s/.test(base) ? `(${base})${toSuperscript(Math.abs(power))}` : `${base}${toSuperscript(Math.abs(power))}`;
  };
  const top = side.terms.filter((term) => term.power > 0).map(show);
  const bottom = side.terms.filter((term) => term.power < 0).map(show);
  const numerator = top.length > 0 ? top.join(' × ') : '1';
  if (bottom.length === 0) return numerator;
  return `${numerator} ÷ ${bottom.length > 1 ? `(${bottom.join(' × ')})` : bottom[0]}`;
}

/** "1 kN = 1,000 N", or "SI unit" for one that is its own SI value (m, kg, N). */
export function describeAtomValue(atom: CompoundAtom): string {
  const inSi = atomInSi(atom);
  return inSi ? `1 ${atom.symbol} = ${inSi}` : 'SI unit';
}

/** An SI unit that needs no working: "N", "N·m", or J in an answer about torque. */
const isPlainSi = (side: CompoundSide, siUnit: string) =>
  sameSize(side.factor, 1) &&
  (side.display === siUnit ||
    (side.terms.length === 1 && side.terms[0].power === 1 && atomInSi(side.terms[0].atom) === null));

const withUnit = (number: number, unit: string) => `${formatCompoundNumber(number)}${unit ? ` ${unit}` : ''}`;

/** The working, one step per line: the from side in SI, the to side in SI, and the division. */
export function describeWorking(answer: CompoundAnswer): string[] {
  const { value, from, to, siUnit, siValue, result } = answer;
  const torque = siUnit === 'N·m';
  const lines: string[] = [];
  if (!isPlainSi(from, siUnit)) {
    const factors = describeFactors(from, torque);
    const times = value === 1 ? '' : `${formatCompoundNumber(value)} × `;
    const middle = factors === withUnit(from.factor, siUnit) && value === 1 ? '' : ` = ${times}${factors}`;
    lines.push(`${formatCompoundNumber(value)} ${from.display}${middle} = ${withUnit(siValue, siUnit)}`);
  }
  if (to && result !== null && !isPlainSi(to, siUnit)) {
    const factors = describeFactors(to, torque);
    const inSi = withUnit(to.factor, siUnit);
    lines.push(factors === inSi ? `1 ${to.display} = ${factors}` : `1 ${to.display} = ${factors} = ${inSi}`);
    lines.push(`${withUnit(siValue, siUnit)} ÷ ${inSi} per ${to.display} = ${formatCompoundNumber(result)} ${to.display}`);
  }
  return lines;
}

/** For an answer without a target: the amount in every unit of its category. */
export function listCategoryValues(answer: CompoundAnswer): Array<{ symbol: string; name: string; value: number }> {
  const category = answer.categories[0];
  if (!category || category === 'Temperature') return [];
  return Array.from(getTables().byUnit.values())
    .filter((atom) => atom.category === category)
    .map((atom) => ({ symbol: atom.symbol, name: atom.name, value: answer.siValue / atom.factor }));
}

/** The two halves of the result: "3 kN/cm²" and "4,351.132 psi" (null for an SI unit on its own). */
export function describeAnswerParts(answer: CompoundAnswer): { left: string; right: string | null } {
  const left = `${formatCompoundNumber(answer.value)} ${answer.from.display}`;
  if (answer.to && answer.result !== null) return { left, right: `${formatCompoundNumber(answer.result)} ${answer.to.display}` };
  return { left, right: isPlainSi(answer.from, answer.siUnit) ? null : withUnit(answer.siValue, answer.siUnit) };
}

/** One line for the result: "3 kN/cm² = 4,351.132 psi" or "1 kN/cm² = 10,000,000 Pa". */
export function describeAnswer(answer: CompoundAnswer): string {
  const { left, right } = describeAnswerParts(answer);
  return right ? `${left} = ${right}` : left;
}

export const COMPOUND_CONVERTER_PATH = '/compound-unit-converter';

export const compoundConverterHref = (query: string) =>
  `${COMPOUND_CONVERTER_PATH}?q=${encodeURIComponent(query.trim())}`;

/** What the finder's hand-off row says about a query, or null when there's nothing to offer. */
export function summarizeCompoundResult(result: CompoundResult): { title: string; detail: string } | null {
  if (result.ok) {
    if (result.answers.length > 1) {
      return { title: result.ambiguity ?? 'More than one reading', detail: `${result.answers.length} answers in the compound unit converter` };
    }
    const [answer] = result.answers;
    const quantity = answer.quantity ? `${shortName(answer.quantity)} · ` : '';
    return { title: describeAnswer(answer), detail: `${capitalize(quantity)}compound unit converter` };
  }
  const { suggestion } = result.error;
  return suggestion ? { title: `Did you mean ${suggestion.preview}?`, detail: suggestion.reason } : null;
}

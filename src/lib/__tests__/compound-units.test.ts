import { describe, expect, it } from 'vitest';

import {
  convertCompoundQuery,
  describeAnswer,
  describeWorking,
  formatCompoundNumber,
  listCategoryValues,
  listCompoundAtoms,
  renderDimensions,
  renderUnitTerms,
  type CompoundResult,
} from '@/lib/compound-units';
import { convertNumericValue } from '@/lib/conversion-math';
import { getCompoundHandoff } from '@/lib/compound-handoff';
import { unitData } from '@/lib/unit-data';
import type { UnitCategory } from '@/types';

// Exact definitions, independent of unit-data.ts.
const LB = 0.45359237; // kg
const G = 9.80665; // m/s²
const LBF = LB * G; // N
const IN = 0.0254; // m
const FT = 0.3048; // m
const MI = 1609.344; // m
const US_GAL = 3.785411784; // L
const BTU = 1055.05585262; // J
const PSI = LBF / IN ** 2; // Pa
const EV = 1.602176634e-19; // J

const close = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThan(1e-9);

function single(query: string) {
  const result = convertCompoundQuery(query);
  if (!result.ok) throw new Error(`${query}: ${result.error.message}`);
  expect(result.answers, query).toHaveLength(1);
  return { answer: result.answers[0] };
}

function failure(query: string) {
  const result = convertCompoundQuery(query);
  if (result.ok) throw new Error(`${query} should fail, got ${describeAnswer(result.answers[0])}`);
  return result.error;
}

describe('compound unit values', () => {
  // [query, expected result]
  const CASES: [string, number][] = [
    ['3 kN/cm2 to MPa', 30],
    ['3 kN/cm² to psi', 3e7 / PSI],
    ['250 N/mm2 to psi', 250e6 / PSI],
    ['1 kg·m/s² to N', 1],
    ['kg*m/s^2 to N', 1],
    ['1 g·cm/s² to N', 1e-5],
    ['50 ft·lbf to N·m', 50 * FT * LBF],
    ['1 kN·m to lbf·ft', 1000 / (LBF * FT)],
    ['1 kWh/km to Wh/mi', 1000 * MI / 1000],
    ['10 L/min to gal/h', (10 * 60) / US_GAL],
    ['1 BTU/(h·ft²) to W/m²', BTU / 3600 / FT ** 2],
    ['1 t/m3 to lb/ft3', (1000 * FT ** 3) / LB],
    ['9.81 m/s2 to ft/s2', 9.81 / FT],
    ['1 mPa·s to lb/(ft·s)', (0.001 * FT) / LB],
    ['5 mW/cm2 to W/m2', 50],
    ['1 kgf/cm2 to bar', 0.980665],
    ['1 kp/cm2 to bar', 0.980665],
    ['1 kip/in2 to MPa', (1000 * PSI) / 1e6],
    ['1 m3/s to L/min', 60000],
    ['1 J/(kg·K) to J/(g·K)', 0.001],
    ['1 W/m·K to W/(cm·K)', 0.01],
    ['1 J/kg/K to J/(kg·K)', 1],
    ['60 1/min to 1/s', 1],
    ['10/s to 1/min', 600],
    ['1 per hour to 1/s', 1 / 3600],
    ['1 lb/in2 to kPa', PSI / 1000],
    ['1 pounds per square inch to kPa', PSI / 1000],
    ['1 lb/in2 to kg/m2', LB / IN ** 2],
    ['1 newtons per square millimeter to psi', 1e6 / PSI],
    ['1 meters per second squared to ft/s2', 1 / FT],
    ['1 cubic feet per minute to L/s', (FT ** 3 * 1000) / 60],
    ['1 m²·K/W to ft²·h·K/BTU', BTU / (FT ** 2 * 3600)],
    ['1 hp/t to kW/t', (550 * FT * LBF) / 1000],
    ['5 eV to J', 5 * EV],
    ['5eV to J', 5 * EV],
    ['250 cc to in3', 250 / (IN * 100) ** 3],
    ['1 Cal/g to kJ/kg', 4184],
    ['1 kcal/h to W', 4184 / 3600],
    ['1 ug/m3 to mg/m3', 0.001],
    ['1 µN·m to N·m', 1e-6],
    ['1 daN·m to N·m', 10],
    ['1 kNm to Nm', 1000],
    ['2 gal (UK)/h to L/h', 9.09218],
    ['1 fl oz/min to mL/s', (US_GAL * 1000) / 128 / 60],
    ['1 ton (US)/h to kg/s', (2000 * LB) / 3600],
    ['1 mi/gal to km/L', MI / 1000 / US_GAL],
    ['1 Wh/km to Wh/mi', MI / 1000],
    ['5 mJ to J', 0.005],
    ['5 mPa to Pa', 0.005],
    ['1 kW-h to J', 3.6e6],
    ['1 pound-force to N', LBF],
    ['1 sqft to m2', FT ** 2],
    ['1 sq. ft to m2', FT ** 2],
    ['1 kg m to J', G],
    ['1 kg-m/s2 to N', 1],
    ['1 PA to Pa', 1],
    ['1 lbs/ft2 to kg/m2', LB / FT ** 2],
    ['1 N·s/m2 to Pa·s', 1],
    ['1 km/hr/s to m/s2', 1000 / 3600],
    ['3,000 N to kN', 3],
    ['1e3 N to kN', 1],
    ['-5 N to lbf', -5 / LBF],
    ['convert 3 kN/cm2 to MPa?', 30],
    ['3 kN/cm2 → MPa', 30],
    ['3 kN/cm2 = MPa', 30],
    ['3 kN/cm2 into MPa', 30],
    ['5 N in lbf', 5 / LBF],
    ['5 in to cm', 12.7],
    ['1 lbf in to N m', LBF * IN],
    ['1 lbf·in in N·m', LBF * IN],
    ['1 m/ft to mm/m', (1 / FT) * 1000],
  ];

  it.each(CASES)('%s', (query, expected) => {
    const { answer } = single(query);
    close(answer.result as number, expected);
  });

  it('gives the SI value when there is no target', () => {
    close(single('kN/cm2').answer.siValue, 1e7);
    close(single('3 kN/cm2 to').answer.siValue, 3e7);
    close(single('mN').answer.siValue, 1e-3);
    close(single('lb ft').answer.siValue, LBF * FT);
    close(single('m/ft').answer.siValue, 1 / FT);
  });
});

describe('every listed unit and notation reads as itself', () => {
  const categories = (Object.keys(unitData) as UnitCategory[]).filter((category) =>
    ['Length', 'Mass', 'Time', 'Pressure', 'Area', 'Volume', 'Energy', 'Speed', 'Power', 'Force', 'Torque', 'Density'].includes(category),
  );

  // Agrees with the category converters for every ordered pair of listed units.
  const pairs = categories.flatMap((category) =>
    unitData[category].units.flatMap((from) =>
      unitData[category].units
        .filter((to) => to.symbol !== from.symbol)
        .map((to) => [category, from.symbol, to.symbol] as const),
    ),
  );

  it.each(pairs)('%s: 1 %s to %s', (category, from, to) => {
    const { answer } = single(`1 ${from} to ${to}`);
    close(answer.result as number, convertNumericValue(category, from, to, 1) as number);
  });

  const notations = categories.flatMap((category) =>
    unitData[category].units.flatMap((unit) => (unit.alsoWrittenAs ?? []).map((notation) => [notation.text, unit.symbol] as const)),
  );

  it.each(notations)('%s is %s', (notation, symbol) => {
    close(single(`1 ${notation} to ${symbol}`).answer.result as number, 1);
  });

  it('takes SI prefixes only where they belong', () => {
    const symbols = new Set(listCompoundAtoms().map((atom) => atom.symbol));
    ['mN', 'MN', 'GPa', 'daN', 'mJ', 'mPa', 'µg', 'µPa', 'MWh', 'keV', 'mK', 'dL', 'ozf', 'Gm'].forEach((symbol) =>
      expect(symbols.has(symbol), symbol).toBe(true),
    );
    // Read by the finder as another listed unit (Mg = mg, Ms = ms, Mm = mm, ML = mL, Mbar = mbar,
    // Ps = ps), so not a separate unit here; the femtolitre would turn "fl" (fl oz) into a unit.
    ['Mg', 'Ms', 'Mm', 'ML', 'Mbar', 'Ps', 'fL', 'fl', 'kkg'].forEach((symbol) => expect(symbols.has(symbol), symbol).toBe(false));
  });

  it('never changes the size of a listed unit', () => {
    const atoms = new Map(listCompoundAtoms().map((atom) => [atom.symbol, atom]));
    categories.forEach((category) => {
      unitData[category].units.forEach((unit) => {
        const atom = atoms.get(unit.symbol);
        expect(atom?.category, unit.symbol).toBe(category);
      });
    });
  });
});

describe('reading case and context', () => {
  it('reads case exactly and shows both answers for an ambiguous lowercase symbol', () => {
    const result = convertCompoundQuery('5 mw to W') as Extract<CompoundResult, { ok: true }>;
    expect(result.ok).toBe(true);
    expect(result.answers.map((answer) => answer.result)).toEqual([0.005, 5e6]);
    expect(result.ambiguity).toBe('mw can mean mW (milliwatt) or MW (megawatt).');
    close(single('5 mW to W').answer.result as number, 0.005);
    close(single('5 MW to W').answer.result as number, 5e6);
    expect((convertCompoundQuery('mn') as Extract<CompoundResult, { ok: true }>).answers).toHaveLength(2);
  });

  it('prefers the units SwapUnits lists over prefixed ones in another case', () => {
    expect(single('mpa').answer.from.display).toBe('MPa');
    expect(single('MPA to psi').answer.from.display).toBe('MPa');
    expect(single('MM to m').answer.from.display).toBe('mm');
  });

  it('uses the other side to choose between readings', () => {
    const { answer } = single('kn to lbf');
    expect(answer.from.display).toBe('kN');
    expect(answer.notes[0]).toContain('knot');
    expect(single('100 KN to lbf').answer.from.display).toBe('kN');
    expect(single('kn to mph').answer.from.display).toBe('kn');
  });

  it('reads a capital M the way the finder does, where the finder reads it', () => {
    const { answer } = single('1 Mg/L to mg/L');
    expect(answer.result).toBe(1);
    expect(answer.notes).toContain('Mg is read as mg (milligram).');
    close(single('5 Ms to s').answer.result as number, 0.005);
    close(single('5 Mm to km').answer.result as number, 5e-6);
    close(single('5 ML to L').answer.result as number, 0.005);
    close(single('5 Mbar to bar').answer.result as number, 0.005);
    // The finder refuses mJ and mPa rather than reading them as MJ and MPa, so they're SI here.
    close(single('5 mJ to J').answer.result as number, 0.005);
  });

  it('reads the litre with a lowercase l as the listed unit', () => {
    expect(single('5 ml to l').answer.from.display).toBe('mL');
    expect(single('5 ml to l').answer.notes).toEqual(['mL is the same unit as cm³.']);
    expect(single('1 kg/l to kg/m3').answer.result).toBeCloseTo(1000, 9);
  });

  it('takes sec, hr and yr from the finder\'s aliases', () => {
    close(single('5 km/hr to m/s').answer.result as number, 5 / 3.6);
    close(single('1 gal/hr to L/s').answer.result as number, US_GAL / 3600);
    close(single('1 m/yr to mm/d').answer.result as number, 1000 / 365.25);
  });

  it('prefers a listed unit\'s notation over a literal reading', () => {
    // unit-data: lb/in² is psi (the pound there is the pound-force).
    const { answer } = single('lb/in2');
    expect(answer.from.display).toBe('lb/in²');
    expect(answer.quantity?.name).toBe('pressure or stress');
    expect(single('kg m').answer.from.display).toBe('kgf·m');
    expect(single('lb ft').answer.from.display).toBe('lbf·ft');
    const notation = single('kgm/s2 to N').answer;
    expect(notation.from.display).toBe('kg·m/s²');
    expect(notation.notes).toContain('kg·m/s² is the same unit as N.');
  });

  it('splits symbols run together only as a last resort', () => {
    expect(single('Pas').answer.from.display).toBe('Pa·s');
    expect(single('kgm2').answer.quantity?.name).toBe('moment of inertia');
    expect(single('kmh').answer.from.display).toBe('km/h');
    expect(failure('mm to m2').kind).toBe('mismatch');
    expect(failure('ms to m·s').kind).toBe('mismatch');
  });

  it('shows micro with µ however it was typed', () => {
    expect(single('uN').answer.from.display).toBe('µN');
    expect(single('ug/m3 to mg/m3').answer.from.display).toBe('µg/m³');
  });
});

describe('explanations', () => {
  it('explains a mismatch and suggests the force unit for a mass', () => {
    const error = failure('1 kg/cm2 to bar');
    expect(error.kind).toBe('mismatch');
    expect(error.message).toBe(
      'kg/cm² measures area density (kg/m²), but bar measures pressure or stress (kg/(m·s²)). They differ by m/s² (acceleration), so one can\'t be converted into the other.',
    );
    expect(error.suggestion?.query).toBe('1 kgf/cm2 to bar');
    expect(failure('N to kg').suggestion?.query).toBe('N to kgf');
    expect(failure('5 kg to N').suggestion?.query).toBe('5 kgf to N');
    expect(failure('lbs/ft2 to kPa').suggestion?.query).toBe('lbf/ft2 to kPa');
    expect(failure('mm to m2').suggestion).toBeUndefined();
  });

  it('explains energy versus power', () => {
    expect(failure('5 kW to kWh').message).toContain('Energy is power × time');
  });

  it('refuses temperatures with an offset', () => {
    ['1 °C to K', 'J/(kg·°C)', '5 degF to K', 'C', 'deg C'].forEach((query) => {
      const error = failure(query);
      expect(error.kind, query).toBe('temperature');
      expect(error.category).toBe('Temperature');
    });
    close(single('300 K to mK').answer.result as number, 300000);
  });

  it('points units covered elsewhere to their converter', () => {
    expect(failure('5 USD/kg').category).toBe('Currency');
    expect(failure('L/100km to mpg').category).toBe('Fuel Economy');
    expect(failure('mpg').category).toBe('Fuel Economy');
    expect(failure('5 MB/s to kB/s').category).toBe('Data Transfer Rate');
  });

  it('refuses units outside mechanics by name', () => {
    expect(failure('5 A to mA').message).toContain('A (ampere)');
    expect(failure('kHz').message).toContain('kHz (hertz)');
    expect(failure('T').message).toContain('T (tesla)');
    expect(failure('5 mAh to Wh').kind).toBe('unsupported');
    expect(failure('rpm').kind).toBe('unsupported');
    expect(failure('mol/L').kind).toBe('unsupported');
  });

  it('reports unknown units and syntax errors', () => {
    expect(failure('xyz').kind).toBe('unknown');
    expect(failure('').kind).toBe('empty');
    expect(failure('kg/(m').message).toBe('A bracket is opened but not closed.');
    expect(failure('kg/m)').message).toBe('A bracket is closed but never opened.');
    expect(failure('kg/m^').kind).toBe('syntax');
    expect(failure('kg/1000 m').kind).toBe('syntax');
    expect(failure('m^13').kind).toBe('syntax');
  });

  it('notes torque versus energy and units that are the same', () => {
    expect(single('1 ft·lbf to J').answer.notes.some((note) => note.startsWith('Energy and torque'))).toBe(true);
    expect(single('1 kN·m to lbf·ft').answer.categories).toEqual(['Torque', 'Energy']);
    expect(single('1 kWh to MJ').answer.categories).toEqual(['Energy', 'Torque']);
    expect(single('250 N/mm2 to psi').answer.notes).toContain('N/mm² is the same unit as MPa.');
    expect(single('1 t/m3 to kg/m3').answer.notes).toContain('t/m³ is the same unit as g/cm³, g/mL, kg/L.');
  });
});

describe('display', () => {
  it('shows the working', () => {
    const { answer } = single('3 kN/cm2 to psi');
    expect(describeAnswer(answer)).toBe('3 kN/cm² = 4,351.132 psi');
    expect(describeWorking(answer)).toEqual([
      '3 kN/cm² = 3 × 1,000 N ÷ (0.01 m)² = 30,000,000 Pa',
      '1 psi = 6,894.757 Pa',
      '30,000,000 Pa ÷ 6,894.757 Pa per psi = 4,351.132 psi',
    ]);
    const force = single('1 kg·m/s² to N');
    expect(describeWorking(force.answer)).toEqual(['1 kg·m/s² = kg × m ÷ s² = 1 N']);
    // One SI unit for the whole working, N·m where it's about torque.
    expect(describeWorking(single('5 N·m to J').answer)).toEqual([]);
    expect(describeWorking(single('5 kWh to N·m').answer)).toEqual(['5 kWh = 5 × 3,600,000 N·m = 18,000,000 N·m']);
  });

  it('lists a quantity in every unit of its category', () => {
    const rows = listCategoryValues(single('kN/cm2').answer);
    expect(rows.find((row) => row.symbol === 'MPa')?.value).toBeCloseTo(10, 9);
    expect(rows.find((row) => row.symbol === 'bar')?.value).toBeCloseTo(100, 9);
    expect(listCategoryValues(single('N/m').answer)).toEqual([]);
  });

  it('formats numbers and units', () => {
    expect(formatCompoundNumber(30000000)).toBe('30,000,000');
    expect(formatCompoundNumber(123456789)).toBe('123,456,789');
    expect(formatCompoundNumber(4351.13213)).toBe('4,351.132');
    expect(formatCompoundNumber(0.000671969)).toBe('0.000671969');
    expect(formatCompoundNumber(5 * EV)).toBe('8.010883 × 10⁻¹⁹');
    expect(formatCompoundNumber(5e12)).toBe('5 × 10¹²');
    expect(renderUnitTerms([{ symbol: 'W', power: 1 }, { symbol: 'm', power: -1 }, { symbol: 'K', power: -1 }])).toBe('W/(m·K)');
    expect(renderUnitTerms([{ symbol: 's', power: -1 }])).toBe('s⁻¹');
    expect(renderUnitTerms([{ symbol: 'gal (UK)', power: 1 }, { symbol: 'h', power: -1 }])).toBe('gal (UK)/h');
    expect(renderDimensions([-1, 1, -2, 0])).toBe('kg/(m·s²)');
    expect(renderDimensions([2, 1, -2, -1])).toBe('kg·m²/(s²·K)');
  });
});

describe('finder hand-off', () => {
  it('offers the compound converter for queries the finder can\'t read', () => {
    expect(getCompoundHandoff('3 kN/cm2 to psi')).toEqual({
      href: '/compound-unit-converter?q=3%20kN%2Fcm2%20to%20psi',
      title: '3 kN/cm² = 4,351.132 psi',
      detail: 'Pressure or stress · compound unit converter',
    });
    // The finder refuses mJ (no millijoule unit); the compound converter has SI prefixes.
    expect(getCompoundHandoff('5 mJ to J')?.title).toBe('5 mJ = 0.005 J');
    expect(getCompoundHandoff('1 kg/cm2 to bar')?.title).toBe('Did you mean 1 kgf/cm² = 0.980665 bar?');
  });

  it('stays quiet while a query is still being typed', () => {
    // "5 nm t" on the way to "5 nm to ft"; "gall" on the way to "gallon"; "kilo" to "kilogram".
    ['5 nm t', '5 kN/cm2 to', '5 kN/cm2 in', '5 mile per gall', '5 square kilo', '5 mw t'].forEach((query) =>
      expect(getCompoundHandoff(query), query).toBeNull(),
    );
    // Read by case or by splitting: fine on the page, not offered from the finder.
    ['5 KN/cm2 to MPa', '5 mw/cm2 to W/m2', 'kNm to N·m'].forEach((query) => expect(getCompoundHandoff(query), query).toBeNull());
    expect(getCompoundHandoff('kN/cm2')?.title).toBe('1 kN/cm² = 10,000,000 Pa');
  });

  it('stays out of the way of everything the finder reads', () => {
    ['5 kg to lb', '100 kg in g', '5 N/mm2 to psi', '5 ft 7 in', 'pressure', '20', 'xyz', ''].forEach((query) =>
      expect(getCompoundHandoff(query), query).toBeNull(),
    );
    (Object.keys(unitData) as UnitCategory[]).forEach((category) => {
      if (category === 'SI Prefixes') return;
      const units = unitData[category].units;
      units.forEach((from) => {
        units.forEach((to) => {
          if (from.symbol !== to.symbol) expect(getCompoundHandoff(`1 ${from.symbol} to ${to.symbol}`), `${from.symbol} to ${to.symbol}`).toBeNull();
        });
      });
    });
  });
});

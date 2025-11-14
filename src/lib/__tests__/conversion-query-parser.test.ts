import { describe, expect, it } from 'vitest';
import { parseConversionQuery } from '../conversion-query-parser';

describe('parseConversionQuery', () => {
  const successCases = [
    ['100 kg in g', { value: 100, fromUnit: 'kg', toUnit: 'g', category: 'Mass' }],
    ['250 us to ms', { value: 250, fromUnit: 'µs', toUnit: 'ms', category: 'Time' }],
    ['0.003 um in mm', { value: 0.003, fromUnit: 'µm', toUnit: 'mm', category: 'Length' }],
    ['5 mm2 to m2', { value: 5, fromUnit: 'mm²', toUnit: 'm²', category: 'Area' }],
    ['12 cm^3 in m^3', { value: 12, fromUnit: 'cm³', toUnit: 'm³', category: 'Volume' }],
    ['750 mm3 to mL', { value: 750, fromUnit: 'mm³', toUnit: 'mL', category: 'Volume' }],
    ['22 in to nm', { value: 22, fromUnit: 'in', toUnit: 'nm', category: 'Length' }],
    ['1.5e3 g to kg', { value: 1.5e3, fromUnit: 'g', toUnit: 'kg', category: 'Mass' }],
    ['10deg C in deg F', { value: 10, fromUnit: '°C', toUnit: '°F', category: 'Temperature' }],
    ['1 year to min', { value: 1, fromUnit: 'a', toUnit: 'min', category: 'Time' }],
    ['1 minute in s', { value: 1, fromUnit: 'min', toUnit: 's', category: 'Time' }],
    ['2 mins into hours', { value: 2, fromUnit: 'min', toUnit: 'h', category: 'Time' }],
    ['0.5 ton to kg', { value: 0.5, fromUnit: 't', toUnit: 'kg', category: 'Mass' }],
  ] as const;

  successCases.forEach(([query, expected]) => {
    it(`parses "${query}" correctly`, () => {
      const result = parseConversionQuery(query);
      expect(result).toMatchObject({ ok: true, ...expected });
    });
  });

  it('falls back to ASCII micro prefixes', () => {
    const result = parseConversionQuery('5 us in ms');
    expect(result).toMatchObject({ ok: true, fromUnit: 'µs', toUnit: 'ms' });
  });

  it('accepts textual squared notation', () => {
    const result = parseConversionQuery('3 square meter to m2');
    expect(result).toMatchObject({ ok: true, fromUnit: 'm²', toUnit: 'm²' });
  });

  it('defaults value to 1 when only units are provided', () => {
    const result = parseConversionQuery('kPa to atm');
    expect(result).toMatchObject({
      ok: true,
      value: 1,
      fromUnit: 'kPa',
      toUnit: 'atm',
      valueStrategy: 'force-default',
    });
  });

  it('infers missing to-unit from category defaults when only one unit is provided', () => {
    const result = parseConversionQuery('kPa');
    expect(result).toMatchObject({
      ok: true,
      value: 1,
      fromUnit: 'kPa',
      toUnit: 'atm',
      category: 'Pressure',
      valueStrategy: 'preserve-existing',
    });
  });

  it('avoids identical from/to units when using inferred defaults', () => {
    const result = parseConversionQuery('atm');
    expect(result).toMatchObject({
      ok: true,
      fromUnit: 'atm',
      toUnit: 'Pa',
      category: 'Pressure',
    });
  });

  it('identifies category-only queries', () => {
    const result = parseConversionQuery('time');
    expect(result).toMatchObject({
      ok: true,
      kind: 'category',
      category: 'Time',
    });
  });

  it('matches category aliases with extra words', () => {
    const result = parseConversionQuery('time conversions');
    expect(result).toMatchObject({
      ok: true,
      kind: 'category',
      category: 'Time',
    });
  });

  it('requires SI directive to parse prefix conversions', () => {
    const result = parseConversionQuery('si micro to milli');
    expect(result).toMatchObject({
      ok: true,
      kind: 'si-prefix',
      fromPrefixSymbol: 'µ',
      toPrefixSymbol: 'm',
    });
  });

  it('extracts numeric values after the SI directive', () => {
    const result = parseConversionQuery('SI 5 kilo to milli');
    expect(result).toMatchObject({
      ok: true,
      kind: 'si-prefix',
      value: 5,
      fromPrefixSymbol: 'k',
      toPrefixSymbol: 'm',
    });
  });
});

import type { UnitCategory } from '@/types';
import { getUnitsForCategory } from '@/lib/unit-data';
import { convertNumericValue } from '@/lib/conversion-math';
import type { CurrencyCode, FxRatesResponse } from '@/lib/fx';
import { formatConversionValue } from '@/lib/number-format';

// Shared classification of how two units relate, plus the formula strings built from it.
// Used by the pair page (titles, descriptions, table hints) and by PairConverter (formula line),
// so the server-rendered copy and the live converter can never disagree.

export type FxContext = { base: CurrencyCode; rates: FxRatesResponse['rates'] };

export type ConversionRelation =
  /** to = from × factor (linear through zero). */
  | { kind: 'proportional'; factor: number }
  /** Affine (different zero points): to = from × scale + offset. `formula` is human-readable. */
  | { kind: 'temperature'; formula: string; scale: number; offset: number }
  /** Inverse: to = constant ÷ from (fuel economy, consumption <-> efficiency). */
  | { kind: 'reciprocal'; constant: number }
  /** to = from × rate, with the rate taken from FX data (null while unavailable). */
  | { kind: 'currency'; rate: number | null };

const TEMPERATURE_FORMULAS: Record<string, string> = {
  '°C->°F': '°F = °C × 9/5 + 32',
  '°F->°C': '°C = (°F - 32) × 5/9',
  '°C->K': 'K = °C + 273.15',
  'K->°C': '°C = K - 273.15',
  '°F->K': 'K = (°F - 32) × 5/9 + 273.15',
  'K->°F': '°F = (K - 273.15) × 9/5 + 32',
};

export type NumberFormatter = (value: number) => string;

/** Formats with at least `significantDigits` significant digits (integer digits are never rounded away). */
export const formatSignificant = (value: number, significantDigits = 6): string => {
  if (!Number.isFinite(value)) {
    return formatConversionValue(value).formatted;
  }
  if (value === 0) {
    return '0';
  }
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const fractionDigits = Math.max(0, significantDigits - 1 - magnitude);
  const { formatted, usedScientificNotation } = formatConversionValue(value, {
    maxFractionDigits: fractionDigits,
    scientificDigits: significantDigits,
  });
  // formatScientificValue leaves all-zero fractions ("1.00000×10^-9"); trim them to "1×10^-9".
  return usedScientificNotation ? formatted.replace(/\.0+(?=×|E)/, '') : formatted;
};

/** 'YYYY-MM-DD' -> 'November 18, 2026'. Fixed locale and UTC, so server and client render the same text. */
export const formatFxDateLabel = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

export const getConversionRelation = (
  category: UnitCategory,
  fromSymbol: string,
  toSymbol: string,
  fxContext?: FxContext | null,
): ConversionRelation | null => {
  const units = getUnitsForCategory(category);
  const fromUnit = units.find((unit) => unit.symbol === fromSymbol);
  const toUnit = units.find((unit) => unit.symbol === toSymbol);
  if (!fromUnit || !toUnit) {
    return null;
  }

  if (category === 'Currency') {
    const rate = fxContext
      ? convertNumericValue(category, fromSymbol, toSymbol, 1, fxContext)
      : null;
    return { kind: 'currency', rate };
  }

  const atOne = convertNumericValue(category, fromSymbol, toSymbol, 1);
  if (atOne === null) {
    return null;
  }

  if (fromSymbol === toSymbol) {
    return { kind: 'proportional', factor: 1 };
  }

  if (category === 'Temperature') {
    const atZero = convertNumericValue(category, fromSymbol, toSymbol, 0);
    if (atZero === null) {
      return null;
    }
    const scale = atOne - atZero;
    const formula =
      TEMPERATURE_FORMULAS[`${fromSymbol}->${toSymbol}`] ??
      `${toSymbol} = ${fromSymbol} × ${formatSignificant(scale)} ${atZero < 0 ? '-' : '+'} ${formatSignificant(Math.abs(atZero))}`;
    return { kind: 'temperature', formula, scale, offset: atZero };
  }

  if (category === 'Fuel Economy') {
    const fromInverse = fromUnit.unitType === 'inverse_consumption';
    const toInverse = toUnit.unitType === 'inverse_consumption';
    if (fromInverse !== toInverse) {
      // to = K ÷ from, so converting 1 yields K itself.
      return { kind: 'reciprocal', constant: atOne };
    }
  }

  return { kind: 'proportional', factor: atOne };
};

/** True when scaling the input scales the output by the same factor (so table rows can be multiplied). */
export const isProportionalRelation = (relation: ConversionRelation | null): boolean =>
  relation !== null && (relation.kind === 'proportional' || relation.kind === 'currency');

// Wrap compound symbols when they are a divisor: "100 ÷ (kWh/100mi)", not "100 ÷ kWh/100mi".
const asDivisor = (symbol: string): string => (symbol.includes('/') ? `(${symbol})` : symbol);

const binaryPower = (value: number): number | null => {
  if (!(value > 1)) return null;
  const power = Math.log(value) / Math.log(1024);
  const rounded = Math.round(power);
  return rounded >= 1 && Math.abs(power - rounded) < 1e-9 ? rounded : null;
};

/**
 * Formula for converting `fromSymbol` into `toSymbol`, e.g. "lb = kg × 2.20462",
 * "°F = °C × 9/5 + 32" or "mi/kWh = 100 ÷ (kWh/100mi)". Returns null when the
 * relation can't be expressed yet (currency without a rate).
 */
export const buildConversionFormula = (
  relation: ConversionRelation | null,
  fromSymbol: string,
  toSymbol: string,
  formatNumber: NumberFormatter,
  category?: UnitCategory,
): string | null => {
  if (!relation) return null;

  switch (relation.kind) {
    case 'temperature':
      return relation.formula;
    case 'reciprocal':
      return `${toSymbol} = ${formatNumber(relation.constant)} ÷ ${asDivisor(fromSymbol)}`;
    case 'currency':
      return relation.rate === null
        ? null
        : `${toSymbol} = ${fromSymbol} × ${formatNumber(relation.rate)}`;
    case 'proportional': {
      const { factor } = relation;
      if (factor === 1) {
        return `${toSymbol} = ${fromSymbol}`;
      }
      const isDivision = factor < 1;
      const operand = isDivision ? 1 / factor : factor;
      const operator = isDivision ? '÷' : '×';
      if (category === 'Data Storage') {
        const power = binaryPower(operand);
        if (power !== null) {
          return `${toSymbol} = ${fromSymbol} ${operator} 1024${power > 1 ? `^${power}` : ''}`;
        }
      }
      return `${toSymbol} = ${fromSymbol} ${operator} ${formatNumber(operand)}`;
    }
    default:
      return null;
  }
};

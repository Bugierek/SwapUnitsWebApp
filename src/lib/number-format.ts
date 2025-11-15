const SCIENTIFIC_LOWER_BOUND = 1e-7;
const SCIENTIFIC_UPPER_BOUND = 1e9;

export type PrecisionMode = 'rounded' | 'full';

export type ScientificStyle = 'unicode' | 'e';

export type FormatConversionValueOptions = {
  /**
   * Optional hint for how many extra decimal places should be shown.
   * Useful for propagating the user's input precision.
   */
  precisionBoost?: number;
  minFractionDigits?: number;
  maxFractionDigits?: number;
  useGrouping?: boolean;
  forceScientific?: boolean;
  scientificDigits?: number;
  scientificStyle?: ScientificStyle;
  fallback?: string;
  precisionMode?: PrecisionMode;
};

export type FormattedConversionValue = {
  formatted: string;
  usedScientificNotation: boolean;
  roundedValue: number | null;
  fractionDigitsUsed: number | null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const formatScientificValue = (
  value: number,
  significantDigits: number,
  style: ScientificStyle,
): string => {
  const exponentValue = value.toExponential(significantDigits - 1);
  const match = exponentValue.match(/^(-?\d(?:\.\d+)?)[eE]([+\-]\d+)$/);
  if (!match) {
    return style === 'e' ? exponentValue.replace('e', 'E') : exponentValue.replace('e', '×10^');
  }

  let coefficient = match[1];
  if (coefficient.includes('.')) {
    coefficient = coefficient.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.$/, '');
  }

  const rawExponent = match[2];
  const normalizedExponent = rawExponent.startsWith('-')
    ? `-${rawExponent.slice(1).replace(/^0+/, '') || '0'}`
    : rawExponent.replace(/^\+/, '').replace(/^0+/, '') || '0';

  if (style === 'e') {
    const sign = normalizedExponent.startsWith('-') ? '-' : '+';
    const unsigned = normalizedExponent.startsWith('-')
      ? normalizedExponent.slice(1)
      : normalizedExponent;
    return `${coefficient}E${sign}${unsigned}`;
  }

  return `${coefficient}×10^${normalizedExponent}`;
};

export const formatConversionValue = (
  value: number | null,
  options: FormatConversionValueOptions = {},
): FormattedConversionValue => {
  if (value === null || Number.isNaN(value)) {
    return {
      formatted: options.fallback ?? '—',
      usedScientificNotation: false,
      roundedValue: null,
      fractionDigitsUsed: null,
    };
  }

  if (!Number.isFinite(value)) {
    if (value === Infinity) {
      return { formatted: '∞', usedScientificNotation: false, roundedValue: value, fractionDigitsUsed: null };
    }
    if (value === -Infinity) {
      return { formatted: '-∞', usedScientificNotation: false, roundedValue: value, fractionDigitsUsed: null };
    }
    return {
      formatted: options.fallback ?? '—',
      usedScientificNotation: false,
      roundedValue: value,
      fractionDigitsUsed: null,
    };
  }

  const abs = Math.abs(value);
  const autoScientific =
    abs !== 0 && (abs < SCIENTIFIC_LOWER_BOUND || abs >= SCIENTIFIC_UPPER_BOUND);

  const shouldUseScientific = options.forceScientific ?? autoScientific;
  if (shouldUseScientific) {
    const digits = clamp(Math.round(options.scientificDigits ?? 6), 3, 10);
    return {
      formatted: formatScientificValue(value, digits, options.scientificStyle ?? 'unicode'),
      usedScientificNotation: true,
      roundedValue: value,
      fractionDigitsUsed: null,
    };
  }

  const precisionMode = options.precisionMode ?? 'rounded';
  const hasExplicitMax = typeof options.maxFractionDigits === 'number';
  const baseFractionDigits = hasExplicitMax
    ? clamp(Math.floor(options.maxFractionDigits as number), 0, 12)
    : precisionMode === 'full'
      ? 8
      : 4;
  const boostLimit = hasExplicitMax ? 0 : precisionMode === 'full' ? 4 : 0;
  const boost = clamp(Math.floor(options.precisionBoost ?? 0), 0, boostLimit);
  const maxFractionDigits = clamp(baseFractionDigits + boost, 0, 12);
  const minFractionDigits = clamp(options.minFractionDigits ?? 0, 0, maxFractionDigits);

  const roundingFactor = Math.pow(10, maxFractionDigits);
  const roundedValue = Math.round(value * roundingFactor) / roundingFactor;

  return {
    formatted: Intl.NumberFormat('en-US', {
      useGrouping: options.useGrouping ?? true,
      maximumFractionDigits: maxFractionDigits,
      minimumFractionDigits: minFractionDigits,
    }).format(roundedValue),
    usedScientificNotation: false,
    roundedValue,
    fractionDigitsUsed: maxFractionDigits,
  };
};

export const getDecimalPrecisionFromInput = (
  rawValue: string | number | null | undefined,
): number | null => {
  if (typeof rawValue !== 'string') {
    return null;
  }
  const trimmed = rawValue.trim();
  if (trimmed === '' || /[eE]/.test(trimmed)) {
    return null;
  }
  const decimalMatch = trimmed.match(/\.(\d+)/);
  return decimalMatch ? decimalMatch[1].length : 0;
};

export const precisionBoostFromDecimalPlaces = (
  decimalPlaces: number | null | undefined,
  maxBoost = 4,
): number => {
  if (decimalPlaces === null || decimalPlaces === undefined) {
    return 0;
  }
  return clamp(decimalPlaces - 1, 0, maxBoost);
};

export const scientificBounds = {
  lower: SCIENTIFIC_LOWER_BOUND,
  upper: SCIENTIFIC_UPPER_BOUND,
};

import type { UnitCategory } from '@/types';
import { convertNumericValue } from '@/lib/conversion-math';
import {
  buildConversionFormula,
  formatFxDateLabel,
  formatSignificant,
  type ConversionRelation,
  type FxContext,
} from '@/lib/conversion-formula';
import { defaultFaqForPair, type FAQItem } from '@/lib/structured-data';

// Copy for conversion pair pages (title, meta description, table hints, FAQ), all derived from
// the shared ConversionRelation so it matches the formula PairConverter shows.

type PairUnit = { symbol: string; name: string };

export type PairCopyInput = {
  category: UnitCategory;
  from: PairUnit;
  to: PairUnit;
  /** from -> to */
  relation: ConversionRelation | null;
  /** to -> from */
  reverseRelation: ConversionRelation | null;
  /** FX rates used for currency pages (null when unavailable). */
  fxContext?: FxContext | null;
  /** 'YYYY-MM-DD' date of the FX rates, when available. */
  fxDate?: string | null;
};

// Titles longer than this (before the "| SwapUnits" template) drop the "(kg to lb)" part.
const MAX_TITLE_LENGTH = 65;

// Water's freezing and boiling points, used as worked examples for temperature pages.
const TEMPERATURE_EXAMPLES: Record<string, [number, number]> = {
  '°C': [0, 100],
  '°F': [32, 212],
  K: [273.15, 373.15],
};
const RECIPROCAL_EXAMPLES: [number, number] = [10, 20];

const sig = (value: number): string => formatSignificant(value, 6);

export const formatPairFormula = (
  relation: ConversionRelation | null,
  fromSymbol: string,
  toSymbol: string,
  category?: UnitCategory,
): string | null => buildConversionFormula(relation, fromSymbol, toSymbol, sig, category);

const convertExample = (input: PairCopyInput, value: number): string | null => {
  const converted = convertNumericValue(
    input.category,
    input.from.symbol,
    input.to.symbol,
    value,
    input.fxContext ?? undefined,
  );
  return converted === null ? null : `${sig(value)} ${input.from.symbol} = ${sig(converted)} ${input.to.symbol}`;
};

const examplePair = (input: PairCopyInput, values: [number, number]): string | null => {
  const first = convertExample(input, values[0]);
  const second = convertExample(input, values[1]);
  return first && second ? `${first} and ${second}` : null;
};

const temperatureExamples = (input: PairCopyInput): string | null =>
  examplePair(input, TEMPERATURE_EXAMPLES[input.from.symbol] ?? [0, 100]);

const proportionalFactor = (relation: ConversionRelation | null): number | null => {
  if (!relation) return null;
  if (relation.kind === 'proportional') return relation.factor;
  if (relation.kind === 'currency') return relation.rate;
  return null;
};

/** "1 USD = 0.924898 EUR · 1 EUR = 1.0812 USD" (null unless both directions are known). */
export const buildRatePairText = (input: PairCopyInput, separator = ' · '): string | null => {
  const forward = proportionalFactor(input.relation);
  const reverse = proportionalFactor(input.reverseRelation);
  if (forward === null || reverse === null) return null;
  return `1 ${input.from.symbol} = ${sig(forward)} ${input.to.symbol}${separator}1 ${input.to.symbol} = ${sig(reverse)} ${input.from.symbol}`;
};

/** Server-rendered answer line for currency pages; null when no rate is available. */
export const buildCurrencyRateSentence = (input: PairCopyInput): string | null => {
  const rates = buildRatePairText(input);
  if (!rates) return null;
  return input.fxDate
    ? `${rates} (ECB reference rate, ${formatFxDateLabel(input.fxDate)})`
    : `${rates} (ECB reference rate)`;
};

const titleAnswer = (input: PairCopyInput): string | null => {
  const { relation, from, to, category } = input;
  if (!relation) return null;
  switch (relation.kind) {
    case 'currency':
      return 'Exchange Rate';
    case 'proportional':
      return `1 ${from.symbol} = ${sig(relation.factor)} ${to.symbol}`;
    case 'temperature':
    case 'reciprocal':
      return formatPairFormula(relation, from.symbol, to.symbol, category);
    default:
      return null;
  }
};

export const buildPairTitle = (input: PairCopyInput): string => {
  const { from, to } = input;
  const names = `${from.name} to ${to.name}`;
  const withSymbols = `${names} (${from.symbol} to ${to.symbol})`;
  const answer = titleAnswer(input);
  if (!answer) {
    return withSymbols;
  }
  const full = `${withSymbols} – ${answer}`;
  return full.length > MAX_TITLE_LENGTH ? `${names} – ${answer}` : full;
};

export const buildPairDescription = (input: PairCopyInput): string => {
  const { relation, from, to, category } = input;
  const names = `${from.name} to ${to.name}`;

  if (relation?.kind === 'currency') {
    const rates = buildRatePairText(input, ' and ');
    if (rates) {
      const source = input.fxDate
        ? `ECB reference rate, ${formatFxDateLabel(input.fxDate)}`
        : 'ECB reference rate';
      return `Convert ${names}: ${rates} (${source}). Live and historical exchange rates, a quick conversion table and a free converter.`;
    }
    // No rates: the quick table isn't rendered either, so don't promise one.
    return `Convert ${names} (${from.symbol} to ${to.symbol}) with daily ECB reference exchange rates, historical rates and a free live converter.`;
  }

  if (relation?.kind === 'temperature') {
    const formula = formatPairFormula(relation, from.symbol, to.symbol, category);
    const examples = temperatureExamples(input);
    return `${names} formula: ${formula}${examples ? `, so ${examples}` : ''}. Quick conversion table and a free live converter.`;
  }

  if (relation?.kind === 'reciprocal') {
    const formula = formatPairFormula(relation, from.symbol, to.symbol, category);
    const examples = examplePair(input, RECIPROCAL_EXAMPLES);
    return `${names} formula: ${formula}. Inverse relationship, so doubling one halves the other${examples ? `: ${examples}` : ''}. Quick table and a free live converter.`;
  }

  const rates = buildRatePairText(input, ' and ');
  if (rates) {
    return `Convert ${names}: ${rates}. Exact formula, quick conversion table and a free live converter.`;
  }
  return `Convert ${names} (${from.symbol} to ${to.symbol}) with the exact formula, a quick conversion table and a free live converter.`;
};

export const buildQuickTableHint = (input: PairCopyInput): string => {
  const { relation, from, to, category } = input;
  const formula = formatPairFormula(relation, from.symbol, to.symbol, category);

  if (relation?.kind === 'temperature') {
    return `${from.name} and ${to.name} have different zero points, so rows don't scale by a single factor (doubling ${from.symbol} doesn't double ${to.symbol}). Use the formula ${formula}, or the converter above for exact values.`;
  }

  if (relation?.kind === 'reciprocal') {
    return `${from.symbol} and ${to.symbol} are inversely related (${formula}), so doubling one halves the other instead of doubling it. Use the converter above for exact values.`;
  }

  return 'Multiply any row by the same factor to scale results. Use the converter above to enter exact values with your own units.';
};

export const buildFormulaInsight = (input: PairCopyInput): string => {
  const { relation, from, to, category } = input;
  const formula = formatPairFormula(relation, from.symbol, to.symbol, category);

  if (relation?.kind === 'temperature') {
    return `Use the formula: ${formula}. The two scales have different zero points, so the conversion needs an offset as well as a multiplication.`;
  }

  if (relation?.kind === 'reciprocal') {
    return `One unit measures consumption (energy or fuel per distance) and the other efficiency (distance per unit of energy or fuel), so they are inversely related: ${formula}.`;
  }

  if (relation?.kind === 'currency') {
    return 'Rates are the European Central Bank\'s daily reference rates (via Frankfurter), published every working day. Cross rates between two non-euro currencies are calculated through the euro.';
  }

  if (category === 'Data Storage') {
    return `Data storage units here use base-2 multipliers (powers of 1024) instead of base-10, so 1 KB = 1024 bytes.${formula ? ` Formula: ${formula}.` : ''}`;
  }

  if (
    category === 'Data Transfer Rate' &&
    ((from.symbol.includes('bps') && to.symbol.includes('/s')) ||
      (from.symbol.includes('/s') && to.symbol.includes('bps')))
  ) {
    return `When converting between bits (b) and bytes (B), remember that 1 byte = 8 bits.${formula ? ` Formula: ${formula}.` : ''}`;
  }

  if (category === 'Fuel Economy' && formula) {
    return `Both units measure fuel economy the same way round, so the conversion is a plain multiplication: ${formula}.`;
  }

  return formula
    ? `This conversion uses a single multiplication or division by a conversion factor: ${formula}.`
    : 'Most unit conversions use a simple multiplication or division by a conversion factor. The calculator shows the exact formula used.';
};

const formulaFaqAnswer = (input: PairCopyInput): string | null => {
  const { relation, from, to, category } = input;
  if (!relation) return null;
  const formula = formatPairFormula(relation, from.symbol, to.symbol, category);

  switch (relation.kind) {
    case 'temperature': {
      const examples = temperatureExamples(input);
      return `${formula}. The scales have different zero points, so the conversion needs an offset as well as a multiplication${examples ? `: ${examples}` : ''}.`;
    }
    case 'reciprocal': {
      const examples = examplePair(input, RECIPROCAL_EXAMPLES);
      return `${formula}. ${from.symbol} and ${to.symbol} are inversely related, so doubling one halves the other${examples ? `: ${examples}` : ''}.`;
    }
    case 'currency': {
      if (!formula) {
        return `${to.symbol} = ${from.symbol} × the current exchange rate. SwapUnits uses the European Central Bank's daily reference rates.`;
      }
      return input.fxDate
        ? `${formula}, using the ECB reference rate from ${formatFxDateLabel(input.fxDate)}. Rates update every working day.`
        : `${formula}, using the latest ECB reference rate. Rates update every working day.`;
    }
    case 'proportional': {
      const rates = buildRatePairText(input, ' and ');
      return `${formula}${rates ? `, so ${rates}` : ''}.`;
    }
    default:
      return null;
  }
};

/** FAQ for the pair's JSON-LD: the generic questions, with an accurate formula answer. */
export const buildPairFaq = (input: PairCopyInput): FAQItem[] => {
  const faq = defaultFaqForPair(input.from.symbol, input.to.symbol, input.category);
  const formulaAnswer = formulaFaqAnswer(input);
  if (!formulaAnswer) return faq;
  return faq.map((item) =>
    item.question.startsWith('What is the formula') ? { ...item, answer: formulaAnswer } : item,
  );
};

// The finder's row for the compound unit converter. Its own module, imported only by the
// lazy-loaded combobox, so the compound engine stays out of the homepage's first JavaScript
// (finder-suggestions.ts is imported statically by unit-converter.tsx).
import { parseConversionQuery, stripConnectorWords } from '@/lib/conversion-query-parser';
import { LETTER_REGEX, normalizeFinderInput } from '@/lib/finder-suggestions';
import {
  compoundConverterHref,
  convertCompoundQuery,
  summarizeCompoundResult,
  type CompoundAnswer,
} from '@/lib/compound-units';

export type CompoundHandoff = { href: string; title: string; detail: string };

// Without a target, only a quantity with a name: "5 square kilo" (kg²) is someone typing.
const isDoubtful = (answer: CompoundAnswer) =>
  answer.from.rank > 0 || (answer.to ? answer.to.rank > 0 : answer.quantity === null);

/**
 * The row shown instead of "No conversion found." when the finder can't read a query but the
 * compound unit converter can ("3 kN/cm2 to psi", "5 mJ to J"), or can suggest a fix ("kg/cm2 to
 * bar" -> kgf/cm²). Null whenever the parser reads the query, so nothing the finder converts
 * today changes. The combobox only asks when its list is empty.
 *
 * Stricter than the converter page, because this runs on every keystroke: nothing while a
 * connector is half typed ("5 nm t" on the way to "5 nm to ft" would be nm·tonne), only readings
 * where every unit was read exactly, not by case or by splitting ("5 mile per gall" on the way to
 * "gallon" would be mi/(gal·L)), and without a target only a quantity that has a name.
 */
export function getCompoundHandoff(rawQuery: string): CompoundHandoff | null {
  const trimmed = rawQuery.trim();
  if (!trimmed || /\s(?:t|to|i|in|int|into)$/i.test(trimmed)) return null;
  const normalized = normalizeFinderInput(trimmed);
  if (!LETTER_REGEX.test(stripConnectorWords(normalized))) return null;
  if (parseConversionQuery(normalized).ok) return null;
  const result = convertCompoundQuery(trimmed);
  if (result.ok && result.answers.some(isDoubtful)) return null;
  const summary = summarizeCompoundResult(result);
  return summary ? { href: compoundConverterHref(trimmed), ...summary } : null;
}

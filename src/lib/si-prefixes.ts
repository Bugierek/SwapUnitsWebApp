"use client";

export type SiPrefix = {
  prefix: string;
  symbol: string;
  exponent: number;
  category: 'multiple' | 'submultiple';
  aliases: string[];
};

const multipleDefinitions: Array<Omit<SiPrefix, 'category'>> = [
  { prefix: 'yotta', symbol: 'Y', exponent: 24, aliases: ['yotta', 'y'] },
  { prefix: 'zetta', symbol: 'Z', exponent: 21, aliases: ['zetta', 'z'] },
  { prefix: 'exa', symbol: 'E', exponent: 18, aliases: ['exa', 'e'] },
  { prefix: 'peta', symbol: 'P', exponent: 15, aliases: ['peta', 'p'] },
  { prefix: 'tera', symbol: 'T', exponent: 12, aliases: ['tera', 't'] },
  { prefix: 'giga', symbol: 'G', exponent: 9, aliases: ['giga', 'g'] },
  { prefix: 'mega', symbol: 'M', exponent: 6, aliases: ['mega', 'm'] },
  { prefix: 'kilo', symbol: 'k', exponent: 3, aliases: ['kilo', 'k'] },
  { prefix: 'hecto', symbol: 'h', exponent: 2, aliases: ['hecto', 'h'] },
  { prefix: 'deca', symbol: 'da', exponent: 1, aliases: ['deca', 'deka', 'da'] },
];

const subMultipleDefinitions: Array<Omit<SiPrefix, 'category'>> = [
  { prefix: 'deci', symbol: 'd', exponent: -1, aliases: ['deci', 'd'] },
  { prefix: 'centi', symbol: 'c', exponent: -2, aliases: ['centi', 'c'] },
  { prefix: 'milli', symbol: 'm', exponent: -3, aliases: ['milli', 'm'] },
  { prefix: 'micro', symbol: 'µ', exponent: -6, aliases: ['micro', 'µ', 'u'] },
  { prefix: 'nano', symbol: 'n', exponent: -9, aliases: ['nano', 'n'] },
  { prefix: 'pico', symbol: 'p', exponent: -12, aliases: ['pico', 'p'] },
  { prefix: 'femto', symbol: 'f', exponent: -15, aliases: ['femto', 'f'] },
  { prefix: 'atto', symbol: 'a', exponent: -18, aliases: ['atto', 'a'] },
  { prefix: 'zepto', symbol: 'z', exponent: -21, aliases: ['zepto', 'z'] },
  { prefix: 'yocto', symbol: 'y', exponent: -24, aliases: ['yocto', 'y'] },
];

const normalizeAlias = (alias: string): string =>
  alias
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]/g, '');

const enhanceDefinition = (def: Omit<SiPrefix, 'category'>, category: 'multiple' | 'submultiple'): SiPrefix => {
  const aliasSet = new Set<string>();
  def.aliases.forEach((alias) => aliasSet.add(normalizeAlias(alias)));
  aliasSet.add(normalizeAlias(def.prefix));
  aliasSet.add(normalizeAlias(def.symbol));

  // Include variants with trailing hyphen (e.g., kilo-)
  def.aliases.forEach((alias) => aliasSet.add(normalizeAlias(`${alias}-`)));

  return {
    ...def,
    category,
    aliases: Array.from(aliasSet),
  };
};

export const SI_MULTIPLES: SiPrefix[] = multipleDefinitions.map((def) => enhanceDefinition(def, 'multiple'));
export const SI_SUBMULTIPLES: SiPrefix[] = subMultipleDefinitions.map((def) => enhanceDefinition(def, 'submultiple'));
export const ALL_SI_PREFIXES: SiPrefix[] = [...SI_MULTIPLES, ...SI_SUBMULTIPLES];

const ALL_ALIASES_SORTED = ALL_SI_PREFIXES.map((prefix) => ({
  prefix,
  aliases: [...prefix.aliases].sort((a, b) => b.length - a.length),
}));

const collapseToken = (token: string): string =>
  token.trim().replace(/[\s\-_]/g, '').replace(/μ/g, 'µ');

export function matchSiPrefixToken(raw: string): SiPrefix | null {
  const collapsed = collapseToken(raw);
  if (!collapsed) {
    return null;
  }
  const lowerCandidate = collapsed.toLowerCase();

  for (const entry of ALL_ALIASES_SORTED) {
    for (const alias of entry.aliases) {
      if (!alias) continue;
      if (lowerCandidate === alias) {
        return entry.prefix;
      }
    }
  }
  return null;
}

export function getSiPrefixBySymbol(symbol: string): SiPrefix | undefined {
  const normalized = symbol.trim();
  return ALL_SI_PREFIXES.find(
    (prefix) => prefix.symbol === normalized || prefix.symbol.toLowerCase() === normalized.toLowerCase(),
  );
}

export type CurrencyCode =
  | 'EUR'
  | 'USD'
  | 'GBP'
  | 'CHF'
  | 'JPY'
  | 'PLN'
  | 'CAD'
  | 'AUD'
  | 'NZD'
  | 'SEK'
  | 'NOK'
  | 'DKK';

export type FxRatesResponse = {
  base: CurrencyCode;
  date: string; // YYYY-MM-DD in UTC
  rates: Record<CurrencyCode, number>;
};

const FRANKFURTER_BASE_URL = process.env.FRANKFURTER_BASE_URL?.trim()
  || 'https://api.frankfurter.dev/v1';

export async function fetchFxRates(
  base: CurrencyCode = 'EUR',
  symbols?: CurrencyCode[],
): Promise<FxRatesResponse> {
  // Frankfurter uses `base` in docs; keep it predictable.
  const params = new URLSearchParams({ base });
  if (symbols && symbols.length > 0) {
    params.set('symbols', symbols.join(','));
  }

  const res = await fetch(`${FRANKFURTER_BASE_URL}/latest?${params.toString()}`, {
    // Cache at the edge; we only need daily updates
    next: { revalidate: 60 * 60 * 24 }, // 24 hours
  });

  if (!res.ok) {
    throw new Error(`FX API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return json as FxRatesResponse;
}

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  base: CurrencyCode,
  rates: FxRatesResponse['rates'],
): number {
  if (from === to) return amount;

  if (from === base) {
    const rTo = rates[to];
    if (!rTo) throw new Error(`Missing FX rate for ${to}`);
    return amount * rTo;
  }

  if (to === base) {
    const rFrom = rates[from];
    if (!rFrom) throw new Error(`Missing FX rate for ${from}`);
    return amount / rFrom;
  }

  const rFrom = rates[from];
  const rTo = rates[to];
  if (!rFrom || !rTo) throw new Error(`Missing FX rate(s) for ${from} or ${to}`);

  const amountInBase = amount / rFrom;
  return amountInBase * rTo;
}

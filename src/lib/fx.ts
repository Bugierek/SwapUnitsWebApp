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
  // Frankfurter latest automatically returns the most recent business-day rate (e.g., Friday on weekends/holidays)
  // Frankfurter uses `base` in docs; keep it predictable.
  const params = new URLSearchParams({ base });
  if (symbols && symbols.length > 0) {
    params.set('symbols', symbols.join(','));
  }

  const res = await fetch(`${FRANKFURTER_BASE_URL}/latest?${params.toString()}`, {
    // Short cache to get fresh data multiple times per day
    next: { revalidate: 60 * 60 }, // 1 hour
  });

  if (!res.ok) {
    throw new Error(`FX API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return json as FxRatesResponse;
}

export async function fetchHistoricalFxRates(
  date: Date | string,
  base: CurrencyCode = 'EUR',
  symbols?: CurrencyCode[],
): Promise<FxRatesResponse> {
  // Format date as YYYY-MM-DD in UTC
  const dateStr = typeof date === 'string' 
    ? date 
    : date.toISOString().split('T')[0];
  
  // Validate date range (Frankfurter has data from 1999-01-04)
  const minDate = new Date('1999-01-04');
  const maxDate = new Date();
  maxDate.setHours(0, 0, 0, 0); // Today at midnight UTC
  
  const requestDate = new Date(dateStr + 'T00:00:00Z');
  if (requestDate < minDate || requestDate > maxDate) {
    throw new Error(`Date must be between 1999-01-04 and today`);
  }

  const params = new URLSearchParams({ base });
  if (symbols && symbols.length > 0) {
    params.set('symbols', symbols.join(','));
  }

  const res = await fetch(
    `${FRANKFURTER_BASE_URL}/${dateStr}?${params.toString()}`, 
    {
      // Cache historical rates more aggressively (they don't change)
      next: { revalidate: 60 * 60 * 24 * 7 }, // 7 days
    }
  );

  if (!res.ok) {
    throw new Error(`Historical FX API error: ${res.status} ${res.statusText}`);
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

import { NextResponse } from 'next/server';
import type { CurrencyCode } from '@/lib/fx';

type FrankfurterResponse = {
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
};

// Ensure each query is handled dynamically (don’t freeze the first render)
export const dynamic = 'force-dynamic';

const VALID_CODES: CurrencyCode[] = [
  'EUR','USD','GBP','CHF','JPY','PLN','CAD','AUD','NZD','SEK','NOK','DKK'
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = (searchParams.get('from') ?? 'EUR').toUpperCase();
  const to = (searchParams.get('to') ?? 'USD').toUpperCase();
  const rawDays = Number(searchParams.get('days') ?? '7');
  const isAllRange = Number.isFinite(rawDays) && rawDays > 365 * 5; // "All" button sends 8y sentinel
  const days = isAllRange
    ? 365 * 8
    : Number.isFinite(rawDays) && rawDays > 0
      ? Math.min(rawDays, 365 * 5)
      : 7;

  if (
    !VALID_CODES.includes(from as CurrencyCode) ||
    !VALID_CODES.includes(to as CurrencyCode)
  ) {
    return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 });
  }

  // For "All" we fetch everything Frankfurter has (from 1999-01-04). Otherwise, fetch a window with buffer.
  const startStr = (() => {
    if (isAllRange) return '1999-01-04';
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const start = new Date(todayStr);
    start.setDate(start.getDate() - (days + 10)); // buffer for weekends/holidays
    return start.toISOString().slice(0, 10);
  })();

  const apiUrl = new URL(`https://api.frankfurter.dev/v1/${startStr}..`);
  apiUrl.searchParams.set('base', from);
  apiUrl.searchParams.set('symbols', to);

  const res = await fetch(apiUrl.toString(), {
    cache: 'no-store',
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch FX history' }, { status: 502 });
  }

  const data = (await res.json()) as FrankfurterResponse;
  const points = Object.entries(data.rates)
    .map(([date, obj]) => ({ date, value: obj[to] }))
    .filter((p) => typeof p.value === 'number')
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(isAllRange ? undefined : -days);

  return NextResponse.json({
    base: from,
    quote: to,
    start_date: data.start_date,
    end_date: data.end_date,
    points,
  });
}

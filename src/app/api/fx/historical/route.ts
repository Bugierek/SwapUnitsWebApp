import { NextResponse } from 'next/server';

import { fetchHistoricalFxRates, type CurrencyCode } from '@/lib/fx';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const base = (searchParams.get('base') || 'EUR').toUpperCase() as CurrencyCode;
  const symbolsParam = searchParams.get('symbols');
  const symbols = symbolsParam
    ? (symbolsParam.split(',').map((s) => s.toUpperCase()) as CurrencyCode[])
    : undefined;

  if (!date) {
    return NextResponse.json(
      { error: 'Date parameter is required (YYYY-MM-DD format)' },
      { status: 400 }
    );
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  try {
    const data = await fetchHistoricalFxRates(date, base, symbols);

    return NextResponse.json(data, {
      headers: {
        // Cache historical rates aggressively (they never change)
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error: unknown) {
    console.error('Historical FX API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Historical FX API error' },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';

import { fetchFxRates, type CurrencyCode } from '@/lib/fx';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const base = (searchParams.get('base') || 'EUR').toUpperCase() as CurrencyCode;
  const symbolsParam = searchParams.get('symbols');
  const symbols = symbolsParam
    ? (symbolsParam.split(',').map((s) => s.toUpperCase()) as CurrencyCode[])
    : undefined;

  try {
    const data = await fetchFxRates(base, symbols);

    return NextResponse.json(data, {
      headers: {
        // Shorter cache for latest rates to get fresh data more often
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error: unknown) {
    console.error('FX API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'FX API error' },
      { status: 500 },
    );
  }
}

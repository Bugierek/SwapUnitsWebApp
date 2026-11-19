'use client';

import { useEffect, useState } from 'react';

export type FxPoint = { date: string; value: number };

// Requests shared by every useFxHistory caller on the page. PairConverter renders two
// FxHistoryCharts (mobile and desktop layouts, one hidden by CSS) and the widget can show a chart
// and a sparkline; identical from/to/days requests share one /api/fx-history call instead of one
// each. ECB rates change once per working day, so a finished response is reused for a while
// (switching ranges back and forth, swapping the pair) before it's fetched again.
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;

type CacheEntry = { promise: Promise<FxPoint[]>; createdAt: number };
const historyCache = new Map<string, CacheEntry>();

const loadFxHistory = (from: string, to: string, days: number): Promise<FxPoint[]> => {
  const key = `${from}|${to}|${days}`;
  const cached = historyCache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.promise;
  }

  const promise = fetch(
    `/api/fx-history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&days=${days}`,
  )
    .then((res) => {
      if (!res.ok) throw new Error('Network error');
      return res.json();
    })
    .then((json) => (json.points as FxPoint[]) ?? []);

  historyCache.set(key, { promise, createdAt: Date.now() });
  // Failures aren't cached: the next caller retries.
  promise.catch(() => {
    if (historyCache.get(key)?.promise === promise) historyCache.delete(key);
  });
  // Map iteration follows insertion order, so the first key is the oldest entry.
  while (historyCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = historyCache.keys().next().value;
    if (oldestKey === undefined) break;
    historyCache.delete(oldestKey);
  }
  return promise;
};

export function useFxHistory(from: string, to: string, days: number) {
  const [data, setData] = useState<FxPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // FxSparkline calls the hook unconditionally, with empty codes when it has no pair to show.
    if (!from || !to) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadFxHistory(from, to, days)
      .then((points) => {
        if (cancelled) return;
        setData(points);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError((err as Error).message ?? 'Failed to load');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [from, to, days]);

  return { data, loading, error };
}

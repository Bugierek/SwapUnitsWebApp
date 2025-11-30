'use client';

import { useEffect, useState } from 'react';

export type FxPoint = { date: string; value: number };

export function useFxHistory(from: string, to: string, days: number) {
  const [data, setData] = useState<FxPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/fx-history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&days=${days}`)
      .then((res) => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData((json.points as FxPoint[]) ?? []);
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

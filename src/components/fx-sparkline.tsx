'use client';

import * as React from 'react';
import { useFxHistory } from '@/hooks/use-fx-history';
import { cn } from '@/lib/utils';

export function FxSparkline({
  from,
  to,
  days = 7,
  className,
}: {
  from?: string;
  to?: string;
  days?: number;
  className?: string;
}) {
  const hasPair = Boolean(from && to);
  const { data, loading, error } = useFxHistory(from ?? '', to ?? '', days);

  if (!hasPair) return null;

  if (loading) return <div className={cn('h-10 w-24 rounded bg-muted animate-pulse', className)} />;
  if (error || !data.length) return <div className={cn('h-10 w-24 text-xs text-muted-foreground', className)}>No data</div>;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 120;
  const height = 40;
  const points = data.map((d, idx) => {
    const x = (idx / Math.max(1, data.length - 1)) * width;
    const y = height - ((d.value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[11px] text-muted-foreground">Last 7 days</span>
      <div className="flex items-center gap-2">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          <polyline
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            points={points}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={width} cy={height - ((values[values.length - 1] - min) / range) * height} r="3" fill="hsl(var(--primary))" />
        </svg>
      </div>
    </div>
  );
}

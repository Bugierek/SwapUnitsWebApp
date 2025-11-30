'use client';

import * as React from 'react';
import { useFxHistory } from '@/hooks/use-fx-history';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const TIMEFRAMES = [
  { label: '7D', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
  { label: '5Y', days: 365 * 5 },
  { label: 'All', days: 365 * 8 }, // fallback when date is older than 5y
];

type FxHistoryChartProps = {
  from: string;
  to: string;
  className?: string;
  highlightDate?: Date | null;
};

export function FxHistoryChart({ from, to, className, highlightDate }: FxHistoryChartProps) {
  const { toast } = useToast();
  const [days, setDays] = React.useState(30);
  const [autoFrameKey, setAutoFrameKey] = React.useState<string>('');
  const { data, loading, error } = useFxHistory(from, to, days);
  const [lastHighlightKey, setLastHighlightKey] = React.useState<string>('');

  // Auto-pick timeframe when a historical date is provided (e.g., from datepicker)
  React.useEffect(() => {
    if (!highlightDate) return;
    const key = highlightDate.toISOString().slice(0, 10);
    if (autoFrameKey === key) return; // already framed for this date; allow user changes afterward
    const today = new Date();
    const diffDays = Math.max(0, Math.floor((today.getTime() - highlightDate.getTime()) / (1000 * 60 * 60 * 24)));
    const desired =
      diffDays <= 7 ? 7 :
      diffDays <= 30 ? 30 :
      diffDays <= 90 ? 90 :
      diffDays <= 365 ? 365 :
      diffDays <= 365 * 5 ? 365 * 5 :
      365 * 8; // "All"
    if (desired !== days) setDays(desired);
    setAutoFrameKey(key);
  }, [highlightDate, days, autoFrameKey]);

  const values = data.map((d) => d.value);
  const minRaw = values.length ? Math.min(...values) : 0;
  const maxRaw = values.length ? Math.max(...values) : 1;
  const baseRange = maxRaw - minRaw || 1;
  const pad = baseRange * 0.05;
  const min = minRaw - pad;
  const max = maxRaw + pad;
  const range = max - min || 1;
  const width = 640;
  const marginLeft = 44;
  const plotWidth = width - marginLeft;
  const height = 260;
  const points = data.map((d, idx) => {
    const x = marginLeft + (idx / Math.max(1, data.length - 1)) * plotWidth;
    const y = height - ((d.value - min) / range) * height;
    return { x, y, ...d };
  });
  const highlightIdx = React.useMemo(() => {
    if (!highlightDate || !points.length) return null;
    const targetTs = highlightDate.getTime();
    return points.reduce(
      (acc, p, idx) => {
        const ts = new Date(`${p.date}T00:00:00Z`).getTime();
        const dist = Math.abs(ts - targetTs);
        return dist < acc.dist ? { idx, dist } : acc;
      },
      { idx: points.length - 1, dist: Infinity }
    ).idx;
  }, [highlightDate, points]);

  // Compute tick positions for the X axis (major/minor) based on range
  const buildTicks = () => {
    if (!data.length) return { major: [] as number[], minor: [] as number[] };
    let stepMajor = 1;
    let stepMinor = 1;
    if (days <= 7) {
      stepMajor = 1;
      stepMinor = 1;
    } else if (days <= 90) {
      stepMajor = 5; // roughly weekly for business days
      stepMinor = 2;
    } else {
      stepMajor = 20; // roughly monthly for business days
      stepMinor = 10;
    }
    const major = [] as number[];
    const minor = [] as number[];
    for (let i = 0; i < data.length; i += stepMinor) {
      minor.push(i);
      if (i % stepMajor === 0) major.push(i);
    }
    if (!major.includes(data.length - 1)) major.push(data.length - 1);
    if (!minor.includes(data.length - 1)) minor.push(data.length - 1);
    return { major, minor };
  };
  const { major: majorTicks, minor: minorTicks } = buildTicks();

  // Basic tooltip
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const activePoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1] ?? null;

  const copyActivePoint = React.useCallback(async (point: typeof activePoint) => {
    if (!point) return;
    try {
      const value = point.value.toFixed(6);
      await navigator.clipboard.writeText(`${point.date}: ${from}/${to} = ${value}`);
      toast({ description: 'Rate copied to clipboard', duration: 1800, variant: 'success' });
    } catch {
      toast({ variant: 'destructive', description: 'Copy failed', duration: 1800 });
    }
  }, [from, to, toast]);

  // When data loads, select the nearest point to the highlighted date (or the last point)
  React.useEffect(() => {
    if (!data.length) return;

    const highlightKey = highlightDate ? highlightDate.toISOString().slice(0, 10) : '';
    if (highlightKey && highlightKey !== lastHighlightKey && highlightIdx !== null) {
      setHoverIndex(highlightIdx);
      setLastHighlightKey(highlightKey);
    } else if (!highlightKey && hoverIndex === null) {
      setHoverIndex(points.length - 1);
    }
  }, [data.length, highlightDate, points, lastHighlightKey, hoverIndex, highlightIdx]);

  return (
    <div className={cn('space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4', className)}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Timeframe:</span>
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.days}
            onClick={() => setDays(tf.days)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition',
              days === tf.days
                ? 'border-primary/70 bg-primary/10 text-primary'
                : 'border-border/60 text-muted-foreground hover:text-foreground'
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="h-64 rounded-lg bg-muted/50 animate-pulse" />
          <div className="h-1 w-full overflow-hidden rounded-full bg-border/60">
            <div className="h-full w-1/2 animate-[pulse_1s_ease-in-out_infinite] bg-primary/70" />
          </div>
        </div>
      )}
      {error && <div className="text-sm text-destructive">{error}</div>}

      {!loading && !error && data.length > 1 && (
        <div className="overflow-hidden rounded-lg bg-background">
          <div className="relative">
            <svg
              width="100%"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              className="block w-full touch-pan-y"
              onMouseLeave={() => setHoverIndex(null)}
              onMouseMove={(e) => {
                const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                const xRel = ((e.clientX - rect.left) / rect.width) * width;
                const closest = points.reduce(
                  (acc, p, idx) => {
                    const dist = Math.abs(p.x - xRel);
                    return dist < acc.dist ? { idx, dist } : acc;
                  },
                  { idx: 0, dist: Infinity },
                );
                setHoverIndex(closest.idx);
              }}
              onClick={(e) => {
                const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                const xRel = ((e.clientX - rect.left) / rect.width) * width;
                const closest = points.reduce(
                  (acc, p, idx) => {
                    const dist = Math.abs(p.x - xRel);
                    return dist < acc.dist ? { idx, dist } : acc;
                  },
                  { idx: 0, dist: Infinity },
                );
                setHoverIndex(closest.idx);
                copyActivePoint(points[closest.idx]);
              }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                if (!touch) return;
                const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                const xRel = ((touch.clientX - rect.left) / rect.width) * width;
                const closest = points.reduce(
                  (acc, p, idx) => {
                    const dist = Math.abs(p.x - xRel);
                    return dist < acc.dist ? { idx, dist } : acc;
                  },
                  { idx: 0, dist: Infinity },
                );
                setHoverIndex(closest.idx);
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                if (!touch) return;
                const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                const xRel = ((touch.clientX - rect.left) / rect.width) * width;
                const closest = points.reduce(
                  (acc, p, idx) => {
                    const dist = Math.abs(p.x - xRel);
                    return dist < acc.dist ? { idx, dist } : acc;
                  },
                  { idx: 0, dist: Infinity },
                );
                setHoverIndex(closest.idx);
              }}
              onTouchEnd={() => {
                if (hoverIndex !== null) {
                  copyActivePoint(points[hoverIndex]);
                }
              }}
            >
            {/* Y axis ticks/labels */}
            {[max, (max + min) / 2, min].map((v, idx) => {
              const y = height - ((v - min) / range) * height;
              return (
                <g key={`y-${idx}`}>
                  <line x1={marginLeft - 4} x2={width} y1={y} y2={y} stroke="hsl(var(--muted-foreground))" strokeOpacity="0.08" strokeWidth="1" />
                  <text
                    x={marginLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="8"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {v.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Minor grid */}
            {minorTicks.map((idx) => {
              const x = marginLeft + (idx / Math.max(1, data.length - 1)) * plotWidth;
              return <line key={`minor-${idx}`} x1={x} x2={x} y1={0} y2={height} stroke="hsl(var(--muted-foreground))" strokeOpacity="0.1" strokeWidth="1" />;
            })}
            {/* Major grid */}
            {majorTicks.map((idx) => {
              const x = marginLeft + (idx / Math.max(1, data.length - 1)) * plotWidth;
              return <line key={`major-${idx}`} x1={x} x2={x} y1={0} y2={height} stroke="hsl(var(--muted-foreground))" strokeOpacity="0.18" strokeWidth="1" />;
            })}

            {highlightIdx !== null && points[highlightIdx] && (
              <line
                x1={points[highlightIdx].x}
                x2={points[highlightIdx].x}
                y1={0}
                y2={height}
                stroke="#10b981"
                strokeOpacity="0.35"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
            )}

            <polyline
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, idx) => {
              const isHighlighted = highlightIdx === idx;
              const fillColor = isHighlighted ? '#10b981' : 'hsl(var(--primary))';
              return (
                <circle
                  key={p.date}
                  cx={p.x}
                  cy={p.y}
                  r={hoverIndex === idx ? 3.8 : 2.2}
                  fill={fillColor}
                  onMouseEnter={() => setHoverIndex(idx)}
                />
              );
            })}
            {activePoint && (
              <g>
                <line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1={0}
                  y2={height}
                  stroke="hsl(var(--primary))"
                  strokeOpacity="0.3"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
                <circle cx={activePoint.x} cy={activePoint.y} r={4} fill="hsl(var(--primary))" />
              </g>
            )}
            </svg>
            {activePoint && (
              <div
                className="absolute rounded-md border border-border/60 bg-card px-2 py-1 text-[11px] text-foreground shadow-sm"
                style={{
                  left: `${(activePoint.x / width) * 100}%`,
                  top: `${(activePoint.y / height) * 100}%`,
                  transform: 'translate(-50%, -120%)',
                  pointerEvents: 'none',
                  minWidth: '110px',
                }}
              >
                <div className="font-semibold">{activePoint.value.toFixed(4)}</div>
                <div className="text-muted-foreground">{activePoint.date}</div>
              </div>
            )}
          </div>
          <div className="flex justify-between px-1 py-1 text-[11px] text-muted-foreground">
            <span>{data[0]?.date}</span>
            <span>{data[data.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {!loading && !error && data.length <= 1 && (
        <div className="text-sm text-muted-foreground">Not enough data for this range.</div>
      )}
    </div>
  );
}

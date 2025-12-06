'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
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

const formatDate = (dateStr: string, days: number): string => {
  const date = new Date(dateStr + 'T00:00:00Z');
  if (days <= 7) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (days <= 90) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
};

type FxHistoryChartProps = {
  from: string;
  to: string;
  className?: string;
  highlightDate?: Date | null;
  onDateSelect?: (date: Date) => void;
  inputValue?: number; // The value being converted (e.g., 20 for "20 GBP")
};

export function FxHistoryChart({ from, to, className, highlightDate, onDateSelect, inputValue = 1 }: FxHistoryChartProps) {
  const { toast } = useToast();
  const [days, setDays] = React.useState(365);
  const userSelectedRangeRef = React.useRef(false);
  const lastHighlightDateRef = React.useRef<Date | null>(null);
  
  // Expand chart range if selected date is older than current range
  React.useEffect(() => {
    if (highlightDate) {
      const now = new Date();
      const daysDiff = Math.ceil((now.getTime() - highlightDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if this is a new date selection (not just a re-render)
      const isNewDate = lastHighlightDateRef.current?.getTime() !== highlightDate.getTime();
      
      // Reset user selection flag when a new date is picked
      if (isNewDate) {
        userSelectedRangeRef.current = false;
      }
      
      lastHighlightDateRef.current = highlightDate;
      
      // Only auto-expand if it's a new date and user hasn't manually selected a range
      if (isNewDate && !userSelectedRangeRef.current && daysDiff > days) {
        // Expand to next level: 7 -> 30 -> 90 -> 365 -> all
        if (days < 30) {
          setDays(30);
        } else if (days < 90) {
          setDays(90);
        } else if (days < 365) {
          setDays(365);
        } else {
          setDays(Math.min(daysDiff + 30, 9999));
        }
      }
    }
  }, [highlightDate, days]);
  
  const { data, loading, error } = useFxHistory(from, to, days);
  const [lastHighlightKey, setLastHighlightKey] = React.useState<string>('');

  const values = data.map((d) => d.value);
  const minRaw = values.length ? Math.min(...values) : 0;
  const maxRaw = values.length ? Math.max(...values) : 1;
  const baseRange = maxRaw - minRaw || 1;
  const pad = baseRange * 0.08; // Slightly more padding
  const min = minRaw - pad;
  const max = maxRaw + pad;
  const range = max - min || 1;
  const width = 700;
  const marginLeft = 8;
  const marginRight = 50; // For price scale (reduced for tighter spacing)
  const plotWidth = width - marginLeft - marginRight;
  const height = 300;
  const points = data.map((d, idx) => {
    const x = marginLeft + (idx / Math.max(1, data.length - 1)) * plotWidth;
    const y = height - ((d.value - min) / range) * height;
    return { x, y, ...d };
  });
  const highlightIdx = React.useMemo(() => {
    if (!highlightDate || !points.length) return null;
    const targetTs = highlightDate.getTime();
    
    // Check if highlightDate is within the visible range
    const oldestPointDate = new Date(`${points[0].date}T00:00:00Z`).getTime();
    const newestPointDate = new Date(`${points[points.length - 1].date}T00:00:00Z`).getTime();
    
    // If the selected date is outside the visible range, don't show highlight
    if (targetTs < oldestPointDate || targetTs > newestPointDate) {
      return null;
    }
    
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

  // Enhanced tooltip with crosshair
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [mouseY, setMouseY] = React.useState<number | null>(null);
  const [mouseX, setMouseX] = React.useState<number | null>(null);
  const activePoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1] ?? null;
  
  // Track last tapped point for double-tap behavior on mobile
  const lastTapRef = React.useRef<{ idx: number; timestamp: number } | null>(null);
  const isTouchDeviceRef = React.useRef(false);

  const handleDateClick = React.useCallback(async (point: typeof activePoint, pointIdx: number, isMobile = false) => {
    if (!point || !onDateSelect) return;
    
    const selectedDate = new Date(point.date + 'T00:00:00Z');
    const convertedValue = inputValue * point.value;
    
    // Format numbers to avoid scientific notation and use proper decimal places
    const fromValue = inputValue.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    const toValue = convertedValue.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    const fullResult = `${fromValue} ${from} = ${toValue} ${to}`;
    
    // Detect mobile: check explicit flag OR screen width (< 1024px = mobile/tablet)
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1024;
    const isMobileDevice = isMobile || isTouchDeviceRef.current || isSmallScreen;
    
    // On mobile: require double-tap to copy
    if (isMobileDevice) {
      const now = Date.now();
      const lastTap = lastTapRef.current;
      
      // Check if this is a double-tap (same point within 500ms)
      if (lastTap && lastTap.idx === pointIdx && now - lastTap.timestamp < 500) {
        // Double-tap: copy to clipboard
        try {
          await navigator.clipboard.writeText(fullResult);
          toast({ 
            description: (
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Copied "{fullResult}"</span>
              </div>
            ), 
            duration: 2500,
            className: 'border-emerald-500/50'
          });
        } catch (err) {
          toast({ 
            description: `Could not copy to clipboard`, 
            duration: 2000 
          });
        }
        lastTapRef.current = null; // Reset after successful double-tap
      } else {
        // First tap: just select the date (no copy)
        lastTapRef.current = { idx: pointIdx, timestamp: now };
        onDateSelect(selectedDate);
      }
    } else {
      // Desktop: copy immediately on click
      try {
        await navigator.clipboard.writeText(fullResult);
        toast({ 
          description: (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              <span>Copied "{fullResult}" • Converting at rate from {point.date}</span>
            </div>
          ), 
          duration: 2500,
          className: 'border-emerald-500/50'
        });
      } catch (err) {
        toast({ 
          description: `Converting at rate from ${point.date}`, 
          duration: 2000 
        });
      }
      onDateSelect(selectedDate);
    }
  }, [onDateSelect, toast, inputValue, from, to]);

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
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.days}
            onClick={() => {
              userSelectedRangeRef.current = true;
              setDays(tf.days);
            }}
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
        <div className="overflow-hidden rounded-xl border border-border/50 bg-zinc-50 dark:bg-black shadow-sm">
          <div className="relative">
            {/* Y-axis price labels overlay */}
            {Array.from({ length: 5 }).map((_, idx) => {
              const y = (idx / 4) * 100;
              const value = max - (range / 4) * idx;
              return (
                <div
                  key={`price-label-${idx}`}
                  className="pointer-events-none absolute right-1 text-xs text-muted-foreground"
                  style={{
                    top: `${y}%`,
                    transform: 'translateY(-50%)',
                  }}
                >
                  {value.toFixed(4)}
                </div>
              );
            })}
            <svg
              width="100%"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              className="block w-full touch-pan-y"
              onMouseLeave={() => {
                setHoverIndex(null);
                setMouseY(null);
                setMouseX(null);
              }}
              onMouseMove={(e) => {
                const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                const xRel = ((e.clientX - rect.left) / rect.width) * width;
                const yRel = ((e.clientY - rect.top) / rect.height) * height;
                setMouseY(yRel);
                setMouseX(xRel);
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
                // Prevent onClick from firing on touch devices (touch events handle it)
                if (isTouchDeviceRef.current) return;
                
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
                handleDateClick(points[closest.idx], closest.idx, false);
              }}
              onTouchStart={(e) => {
                isTouchDeviceRef.current = true; // Mark as touch device
                const touch = e.touches[0];
                if (!touch) return;
                const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                const xRel = ((touch.clientX - rect.left) / rect.width) * width;
                const yRel = ((touch.clientY - rect.top) / rect.height) * height;
                setMouseY(yRel);
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
                const yRel = ((touch.clientY - rect.top) / rect.height) * height;
                setMouseY(yRel);
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
                  handleDateClick(points[hoverIndex], hoverIndex, true);
                }
                setMouseY(null);
                setMouseX(null);
              }}
            >
            {/* Gradient definition for area fill */}
            <defs>
              <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Horizontal grid lines */}
            {Array.from({ length: 5 }).map((_, idx) => {
              const y = (height / 4) * idx;
              const value = max - (range / 4) * idx;
              return (
                <g key={`h-grid-${idx}`}>
                  <line 
                    x1={marginLeft} 
                    x2={width - marginRight} 
                    y1={y} 
                    y2={y} 
                    stroke="hsl(var(--border))" 
                    strokeOpacity="0.3" 
                    strokeWidth="1" 
                    strokeDasharray="3 3"
                  />
                </g>
              );
            })}

            {/* Vertical grid - Major ticks only */}
            {majorTicks.map((idx) => {
              const x = marginLeft + (idx / Math.max(1, data.length - 1)) * plotWidth;
              return (
                <line 
                  key={`v-grid-${idx}`} 
                  x1={x} 
                  x2={x} 
                  y1={0} 
                  y2={height} 
                  stroke="hsl(var(--border))" 
                  strokeOpacity="0.2" 
                  strokeWidth="1" 
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Highlight vertical line for selected date */}
            {highlightIdx !== null && points[highlightIdx] && (
              <line
                x1={points[highlightIdx].x}
                x2={points[highlightIdx].x}
                y1={0}
                y2={height}
                stroke="#10b981"
                strokeOpacity="0.5"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            )}

            {/* Area fill under the line */}
            <polygon
              fill="url(#chartGradient)"
              points={`
                ${marginLeft},${height} 
                ${points.map((p) => `${p.x},${p.y}`).join(' ')} 
                ${width - marginRight},${height}
              `}
            />

            {/* Main line chart */}
            <polyline
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))' }}
            />

            {/* Crosshair on hover */}
            {activePoint && hoverIndex !== null && (
              <g>
                {/* Vertical crosshair */}
                <line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1={0}
                  y2={height}
                  stroke="hsl(var(--foreground))"
                  strokeOpacity="0.2"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                {/* Horizontal crosshair - snaps to data point */}
                <line
                  x1={marginLeft}
                  x2={width - marginRight}
                  y1={activePoint.y}
                  y2={activePoint.y}
                  stroke="hsl(var(--foreground))"
                  strokeOpacity="0.2"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                {/* Active point dot */}
                <circle 
                  cx={activePoint.x} 
                  cy={activePoint.y} 
                  r={5} 
                  fill="hsl(var(--background))" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="2.5"
                />
              </g>
            )}

            {/* Highlighted date marker and horizontal line */}
            {highlightIdx !== null && points[highlightIdx] && (
              <g>
                {/* Horizontal green dashed line at selected point */}
                <line
                  x1={marginLeft}
                  x2={width - marginRight}
                  y1={points[highlightIdx].y}
                  y2={points[highlightIdx].y}
                  stroke="#10b981"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                {/* Green marker dot */}
                <circle 
                  cx={points[highlightIdx].x} 
                  cy={points[highlightIdx].y} 
                  r={4} 
                  fill="#10b981"
                  style={{ filter: 'drop-shadow(0 0 4px rgb(16 185 129 / 0.6))' }}
                />
              </g>
            )}



            {/* Hover price indicator */}
            {activePoint && hoverIndex !== null && (
              <g>
                <rect
                  x={width - marginRight}
                  y={activePoint.y - 8}
                  width={marginRight - 2}
                  height="16"
                  fill="hsl(var(--primary))"
                  rx="3"
                />
                <text
                  x={width - marginRight + (marginRight - 2) / 2}
                  y={activePoint.y + 3.5}
                  textAnchor="middle"
                  style={{ fontSize: '10px' }}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="600"
                  fill="hsl(var(--primary-foreground))"
                  className="select-none"
                >
                  {activePoint.value.toFixed(4)}
                </text>
              </g>
            )}

            {/* Green price indicator for highlighted date */}
            {highlightIdx !== null && points[highlightIdx] && (
              <g>
                <rect
                  x={width - marginRight}
                  y={points[highlightIdx].y - 8}
                  width={marginRight - 2}
                  height="16"
                  fill="#10b981"
                  rx="3"
                />
                <text
                  x={width - marginRight + (marginRight - 2) / 2}
                  y={points[highlightIdx].y + 3.5}
                  textAnchor="middle"
                  style={{ fontSize: '10px' }}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="600"
                  fill="white"
                  className="select-none"
                >
                  {points[highlightIdx].value.toFixed(4)}
                </text>
              </g>
            )}
            </svg>
            {activePoint && hoverIndex !== null && (
              <div
                className="absolute flex flex-col items-center gap-0.5 rounded-md border border-border bg-popover px-2 py-1 text-popover-foreground shadow-lg backdrop-blur-sm"
                style={{
                  left: `${(activePoint.x / width) * 100}%`,
                  top: `${(activePoint.y / height) * 100}%`,
                  transform: activePoint.y < height / 2 ? 'translate(-50%, 10px)' : 'translate(-50%, -100%)',
                  pointerEvents: 'none',
                  zIndex: 50,
                }}
              >
                <span className="font-mono text-xs font-semibold">{activePoint.value.toFixed(6)}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {inputValue.toFixed(2)} {from} = {(inputValue * activePoint.value).toFixed(2)} {to}
                </span>
                {onDateSelect && (
                  <span className="text-[10px] text-muted-foreground/70">Click to copy & convert</span>
                )}
              </div>
            )}
          </div>
          {/* Date labels at bottom */}
          <div className="relative flex justify-between border-t border-border/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="min-w-[80px]">{formatDate(data[0]?.date || '', days)}</span>
            <span className="text-center text-[10px] min-w-[60px]">{from}/{to}</span>
            <span className="min-w-[80px] text-right">{formatDate(data[data.length - 1]?.date || '', days)}</span>
            
            {/* X-axis date tooltip (TradingView style) */}
            {activePoint && hoverIndex !== null && mouseX !== null && (
              <div
                className="absolute -top-1 rounded border border-border bg-popover px-2 py-0.5 text-[10px] font-medium text-popover-foreground shadow-md"
                style={{
                  left: `${(activePoint.x / width) * 100}%`,
                  transform: 'translate(-50%, -100%)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {new Date(activePoint.date + 'T00:00:00Z').toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && data.length <= 1 && (
        <div className="text-sm text-muted-foreground">Not enough data for this range.</div>
      )}
    </div>
  );
}

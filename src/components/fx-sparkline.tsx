'use client';

import * as React from 'react';
import Link from 'next/link';
import { useFxHistory } from '@/hooks/use-fx-history';
import { cn } from '@/lib/utils';

export function FxSparkline({
  from,
  to,
  days = 7,
  className,
  linkUrl,
}: {
  from?: string;
  to?: string;
  days?: number;
  className?: string;
  linkUrl?: string;
}) {
  const hasPair = Boolean(from && to);
  const { data, loading, error } = useFxHistory(from ?? '', to ?? '', days);

  if (!hasPair) return null;

  if (loading) return <div className={cn('h-12 w-32 rounded-md bg-muted/50 animate-pulse', className)} />;
  if (error || !data.length) return <div className={cn('h-12 w-32 text-xs text-muted-foreground', className)}>No data</div>;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = range * 0.1;
  const paddedMin = min - pad;
  const paddedMax = max + pad;
  const paddedRange = paddedMax - paddedMin;
  
  const width = 140;
  const height = 48;
  
  const points = data.map((d, idx) => {
    const x = (idx / Math.max(1, data.length - 1)) * width;
    const y = height - ((d.value - paddedMin) / paddedRange) * height;
    return { x, y, value: d.value };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;
  
  const lastValue = values[values.length - 1];
  const firstValue = values[0];
  const change = lastValue - firstValue;
  const isPositive = change >= 0;

  const content = (
    <>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium text-muted-foreground">Last 7 days</span>
        <span className={cn(
          'text-[10px] font-semibold',
          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        )}>
          {isPositive ? '↗' : '↘'} {Math.abs((change / firstValue) * 100).toFixed(2)}%
        </span>
      </div>
      <div className="relative flex items-center">
        <svg 
          width={width} 
          height={height} 
          viewBox={`0 0 ${width} ${height}`} 
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`sparkGradient-${from}-${to}`} x1="0" x2="0" y1="0" y2="1">
              <stop 
                offset="0%" 
                stopColor={isPositive ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)'} 
                stopOpacity="0.2" 
              />
              <stop 
                offset="100%" 
                stopColor={isPositive ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)'} 
                stopOpacity="0.01" 
              />
            </linearGradient>
          </defs>
          
          {/* Area fill */}
          <polygon
            fill={`url(#sparkGradient-${from}-${to})`}
            points={areaPoints}
          />
          
          {/* Line */}
          <polyline
            fill="none"
            stroke={isPositive ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)'}
            strokeWidth="2"
            points={linePoints}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))' }}
          />
          
          {/* End point */}
          <circle 
            cx={points[points.length - 1].x} 
            cy={points[points.length - 1].y} 
            r="3" 
            fill={isPositive ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)'}
            stroke="hsl(var(--background))"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </>
  );

  if (linkUrl) {
    return (
      <Link 
        href={linkUrl} 
        className={cn('flex flex-col gap-1.5 transition hover:opacity-80', className)}
        title="View detailed chart"
      >
        {content}
      </Link>
    );
  }

  return <div className={cn('flex flex-col gap-1.5', className)}>{content}</div>;
}

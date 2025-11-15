import * as React from 'react';
import { cn } from '@/lib/utils';

type ResponsiveFavoriteLabelProps = {
  fullLabel: string;
  compactLabel: string;
  className?: string;
};

export function ResponsiveFavoriteLabel({
  fullLabel,
  compactLabel,
  className,
}: ResponsiveFavoriteLabelProps) {
  const spanRef = React.useRef<HTMLSpanElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [useCompact, setUseCompact] = React.useState(false);

  const evaluate = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    const span = spanRef.current;
    if (!span) return;
    const available = span.clientWidth;
    if (available <= 0) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    const computed = window.getComputedStyle(span);
    const fontWeight = computed.fontWeight || '400';
    const fontSize = computed.fontSize || '14px';
    const fontFamily = computed.fontFamily || 'sans-serif';
    context.font = `${fontWeight} ${fontSize} ${fontFamily}`;

    const fullWidth = context.measureText(fullLabel).width;
    const compactWidth = context.measureText(compactLabel).width;

    if (fullWidth <= available) {
      setUseCompact(false);
      return;
    }
    if (compactWidth <= available) {
      setUseCompact(true);
      return;
    }
    setUseCompact(true);
  }, [fullLabel, compactLabel]);

  React.useLayoutEffect(() => {
    evaluate();
  }, [evaluate, fullLabel, compactLabel]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const span = spanRef.current;
    if (!span) return;
    const parent = span.parentElement ?? span;
    const observer = new ResizeObserver(() => evaluate());
    observer.observe(parent);
    return () => observer.disconnect();
  }, [evaluate]);

  return (
    <span
      ref={spanRef}
      className={cn('block min-w-0 truncate text-sm font-semibold', className)}
      title={fullLabel}
    >
      {useCompact ? compactLabel : fullLabel}
    </span>
  );
}

'use client';

import * as React from 'react';

type ScrollIntoViewOnMountProps = {
  targetId: string;
  behavior?: ScrollBehavior;
  offset?: number;
};

export function ScrollIntoViewOnMount({ targetId, behavior = 'smooth', offset = 80 }: ScrollIntoViewOnMountProps) {
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(targetId);
    if (el) {
      window.requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const absoluteTop = rect.top + window.scrollY;
        window.scrollTo({
          top: Math.max(0, absoluteTop - offset),
          behavior,
        });
      });
    }
  }, [targetId, behavior, offset]);

  return null;
}

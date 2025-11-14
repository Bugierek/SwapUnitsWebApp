'use client';

import * as React from 'react';

const isCoarsePointer = () => {
  if (typeof window === 'undefined') return false;
  const mediaQuery = window.matchMedia('(pointer: coarse)');
  if (mediaQuery && typeof mediaQuery.matches === 'boolean') {
    return mediaQuery.matches;
  }
  if (typeof navigator !== 'undefined') {
    return navigator.maxTouchPoints > 0;
  }
  return false;
};

const subscribe = (listener: () => void) => {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(pointer: coarse)');
  const handler = () => listener();
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
};

export function useIsCoarsePointer(): boolean {
  return React.useSyncExternalStore(subscribe, isCoarsePointer, () => false);
}


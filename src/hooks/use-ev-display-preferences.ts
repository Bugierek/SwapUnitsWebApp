'use client';

import * as React from 'react';

import {
  EV_ESTIMATOR_DEFAULTS,
  isEvCurrencySymbol,
  isEvUnitSystem,
  type EvCurrencySymbol,
  type EvUnitSystem,
} from '@/lib/ev-cost-estimator';

// Units (mi/US or km/metric) and currency label shared by the EV estimator and the EV table.
// The server always renders US/$; the stored choice is applied after mount, so the first client
// render matches the server HTML. Instances on the same page stay in sync through a window event
// (and other tabs through the storage event).

export type EvDisplayPreferences = {
  system: EvUnitSystem;
  currency: EvCurrencySymbol;
};

const STORAGE_KEY = 'swapunits:ev-display-preferences';
const CHANGE_EVENT = 'swapunits:ev-display-preferences-change';

const DEFAULT_PREFERENCES: EvDisplayPreferences = {
  system: 'us',
  currency: EV_ESTIMATOR_DEFAULTS.us.currency,
};

const readStoredPreferences = (): EvDisplayPreferences | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { system, currency } = parsed as Record<string, unknown>;
    if (!isEvUnitSystem(system)) return null;
    return {
      system,
      currency: isEvCurrencySymbol(currency) ? currency : EV_ESTIMATOR_DEFAULTS[system].currency,
    };
  } catch {
    return null;
  }
};

const writeStoredPreferences = (preferences: EvDisplayPreferences) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage blocked (private mode, disabled site data): the choice just won't persist.
  }
  window.dispatchEvent(new CustomEvent<EvDisplayPreferences>(CHANGE_EVENT, { detail: preferences }));
};

export function useEvDisplayPreferences() {
  const [preferences, setPreferences] = React.useState<EvDisplayPreferences>(DEFAULT_PREFERENCES);

  React.useEffect(() => {
    const stored = readStoredPreferences();
    if (stored) setPreferences(stored);

    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<EvDisplayPreferences>).detail;
      if (detail) setPreferences(detail);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setPreferences(readStoredPreferences() ?? DEFAULT_PREFERENCES);
    };
    window.addEventListener(CHANGE_EVENT, handleChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  /** Switching units also switches the currency label to that system's default ($ or €). */
  const setSystem = React.useCallback((system: EvUnitSystem) => {
    writeStoredPreferences({ system, currency: EV_ESTIMATOR_DEFAULTS[system].currency });
  }, []);

  const setCurrency = React.useCallback(
    (currency: EvCurrencySymbol) => {
      writeStoredPreferences({ system: preferences.system, currency });
    },
    [preferences.system],
  );

  return { ...preferences, setSystem, setCurrency };
}

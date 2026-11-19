'use client';

import * as React from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EV_CURRENCY_SYMBOLS, isEvCurrencySymbol, type EvCurrencySymbol, type EvUnitSystem } from '@/lib/ev-cost-estimator';
import { cn } from '@/lib/utils';

// Units toggle and currency selector shared by the EV estimator and the EV efficiency table.

const UNIT_SYSTEM_OPTIONS: { value: EvUnitSystem; label: string; title: string }[] = [
  { value: 'us', label: 'mi · US', title: 'Miles, kWh/100mi, MPG and gallons' },
  { value: 'metric', label: 'km · metric', title: 'Kilometers, kWh/100km, L/100km and liters' },
];

export function EvUnitSystemToggle({
  value,
  onChange,
  className,
}: {
  value: EvUnitSystem;
  onChange: (system: EvUnitSystem) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Units"
      className={cn('inline-flex rounded-full border border-border/60 bg-background p-0.5', className)}
    >
      {UNIT_SYSTEM_OPTIONS.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-9 rounded-full px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function EvCurrencySelect({
  value,
  onChange,
  id = 'ev-currency',
}: {
  value: EvCurrencySymbol;
  onChange: (currency: EvCurrencySymbol) => void;
  id?: string;
}) {
  return (
    // `name` labels the hidden native <select> Radix renders on the server, which otherwise trips
    // Chrome's "form field should have an id or name" issue.
    <Select
      name="ev-currency"
      value={value}
      onValueChange={(next) => {
        if (isEvCurrencySymbol(next)) onChange(next);
      }}
    >
      <SelectTrigger
        id={id}
        aria-label="Currency symbol"
        className="h-9 w-[5.5rem] rounded-full border-border/60 px-3 text-xs font-semibold sm:h-8"
      >
        <SelectValue>{value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {EV_CURRENCY_SYMBOLS.map((symbol) => (
          <SelectItem key={symbol} value={symbol}>
            {symbol}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

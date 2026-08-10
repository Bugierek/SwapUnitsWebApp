'use client';

import * as React from 'react';
import { Car } from 'lucide-react';

import type { VehiclePreset } from '@/types';
import { evModels, getVehiclePresetValueForUnit } from '@/lib/ev-models';
import { cn } from '@/lib/utils';

interface VehiclePresetChipsProps {
  unitSymbol: string;
  selectedId?: string;
  onSelect: (preset: VehiclePreset, value: number) => void;
}

export function VehiclePresetChips({ unitSymbol, selectedId, onSelect }: VehiclePresetChipsProps) {
  return (
    <section className="space-y-3 rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Car className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Try a real EV</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Pick a model to fill in its EPA-rated efficiency.
      </p>
      <div className="flex flex-wrap gap-2">
        {evModels.map((preset) => {
          const value = getVehiclePresetValueForUnit(preset, unitSymbol);
          if (value === null) return null;
          const isSelected = preset.id === selectedId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset, value)}
              className={cn(
                'rounded-2xl border border-border/60 bg-background px-4 py-3 text-left text-sm transition hover:border-primary/60 hover:bg-primary/5',
                isSelected && 'border-primary/60 bg-primary/5',
              )}
            >
              <span className="block font-semibold text-foreground">
                {preset.make} {preset.model}
                {preset.trim ? ` ${preset.trim}` : ''}
              </span>
              <span className="text-xs text-muted-foreground">
                {value.toLocaleString(undefined, { maximumFractionDigits: 2 })} {unitSymbol}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

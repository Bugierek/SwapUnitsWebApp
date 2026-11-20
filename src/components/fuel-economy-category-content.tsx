import { Zap } from 'lucide-react';

import type { VehiclePreset } from '@/types';
import { EvEfficiencyTable } from '@/components/ev-efficiency-table';
import { formatFxDateLabel } from '@/lib/conversion-formula';
import { EV_DATA_PULLED_ON, EV_DATA_SOURCE_LABEL } from '@/lib/ev-models';

interface FuelEconomyCategoryContentProps {
  models: VehiclePreset[];
}

export function FuelEconomyCategoryContent({ models }: FuelEconomyCategoryContentProps) {
  return (
    <section className="space-y-4 rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-foreground">EV efficiency by model</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        EPA combined efficiency and range for popular EVs. Select a model to open it in the converter.
      </p>
      <EvEfficiencyTable models={models} />
      <p className="text-xs text-muted-foreground">
        Source: {EV_DATA_SOURCE_LABEL} vehicle data, retrieved {formatFxDateLabel(EV_DATA_PULLED_ON)}. EPA measures
        kWh/100mi at the wall, so it includes charging losses; MPGe uses EPA&apos;s 33.7 kWh per gallon of gasoline.
      </p>
    </section>
  );
}

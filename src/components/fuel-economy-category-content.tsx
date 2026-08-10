import { Zap } from 'lucide-react';

import type { VehiclePreset } from '@/types';
import { EvEfficiencyTable } from '@/components/ev-efficiency-table';

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
        EPA-rated combined efficiency for popular EVs. Click any row to prefill the converter.
      </p>
      <EvEfficiencyTable models={models} />
    </section>
  );
}

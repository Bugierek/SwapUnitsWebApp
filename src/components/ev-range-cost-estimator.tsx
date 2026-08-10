'use client';

import * as React from 'react';
import { Zap, Fuel } from 'lucide-react';

import type { VehiclePreset } from '@/types';
import { evModels } from '@/lib/ev-models';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  estimateRangeMiles,
  estimateCostPerMile,
  estimateCostPerCharge,
  estimateGasCostPerMile,
} from '@/lib/ev-cost-estimator';

interface EvRangeCostEstimatorProps {
  initialVehicle?: VehiclePreset;
}

const DEFAULT_BATTERY_KWH = 75;
const DEFAULT_PRICE_PER_KWH = 0.16;
const DEFAULT_PRICE_PER_GALLON = 3.5;
const DEFAULT_GAS_MPG = 30;

export function EvRangeCostEstimator({ initialVehicle }: EvRangeCostEstimatorProps) {
  const vehicle = initialVehicle ?? evModels[0];
  const [batteryKwh, setBatteryKwh] = React.useState(String(DEFAULT_BATTERY_KWH));
  const [pricePerKwh, setPricePerKwh] = React.useState(String(DEFAULT_PRICE_PER_KWH));
  const [compareToGas, setCompareToGas] = React.useState(false);
  const [pricePerGallon, setPricePerGallon] = React.useState(String(DEFAULT_PRICE_PER_GALLON));
  const [gasMpg, setGasMpg] = React.useState(String(DEFAULT_GAS_MPG));

  const batteryKwhNum = Number(batteryKwh);
  const pricePerKwhNum = Number(pricePerKwh);
  const kwhPer100mi = vehicle.epaCombinedKwhPer100mi;

  const rangeMiles = estimateRangeMiles(batteryKwhNum, kwhPer100mi);
  const costPerMile = estimateCostPerMile(kwhPer100mi, pricePerKwhNum);
  const costPerCharge = estimateCostPerCharge(batteryKwhNum, pricePerKwhNum);

  const gasMpgNum = Number(gasMpg);
  const pricePerGallonNum = Number(pricePerGallon);
  const gasCostPerMile = compareToGas ? estimateGasCostPerMile(gasMpgNum, pricePerGallonNum) : null;

  const formatMoney = (value: number | null, digits = 2) =>
    value === null ? '—' : `$${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

  return (
    <section className="space-y-5 rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Range & charging cost estimator</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Based on {vehicle.make} {vehicle.model}{vehicle.trim ? ` ${vehicle.trim}` : ''} ({kwhPer100mi.toLocaleString()} kWh/100mi, EPA-rated).
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ev-battery-kwh">Usable battery (kWh)</Label>
          <Input
            id="ev-battery-kwh"
            type="number"
            inputMode="decimal"
            min={0}
            value={batteryKwh}
            onChange={(e) => setBatteryKwh(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-price-per-kwh">Electricity price ($/kWh)</Label>
          <Input
            id="ev-price-per-kwh"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={pricePerKwh}
            onChange={(e) => setPricePerKwh(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-border/60 bg-background px-4 py-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated range</p>
          <p className="text-xl font-semibold text-foreground">
            {rangeMiles === null ? '—' : `${Math.round(rangeMiles).toLocaleString()} mi`}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cost per charge</p>
          <p className="text-xl font-semibold text-foreground">{formatMoney(costPerCharge)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cost per mile</p>
          <p className="text-xl font-semibold text-foreground">{formatMoney(costPerMile, 3)}</p>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setCompareToGas((prev) => !prev)}
        className={cn(
          'rounded-full border-border/60',
          compareToGas && 'border-primary/60 bg-primary/5 text-primary',
        )}
      >
        <Fuel className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Compare to a gas car
      </Button>

      {compareToGas && (
        <div className="space-y-4 rounded-2xl border border-border/60 bg-background px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ev-gas-mpg">Gas vehicle MPG</Label>
              <Input
                id="ev-gas-mpg"
                type="number"
                inputMode="decimal"
                min={0}
                value={gasMpg}
                onChange={(e) => setGasMpg(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-price-per-gallon">Gas price ($/gallon)</Label>
              <Input
                id="ev-price-per-gallon"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={pricePerGallon}
                onChange={(e) => setPricePerGallon(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="text-sm text-muted-foreground">
              EV: <span className="font-semibold text-foreground">{formatMoney(costPerMile, 3)}/mi</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Gas: <span className="font-semibold text-foreground">{formatMoney(gasCostPerMile, 3)}/mi</span>
            </p>
            {costPerMile !== null && gasCostPerMile !== null && (
              <p className="text-sm font-semibold text-primary">
                {gasCostPerMile >= costPerMile
                  ? `EV saves ${formatMoney(gasCostPerMile - costPerMile, 3)}/mi`
                  : `Gas saves ${formatMoney(costPerMile - gasCostPerMile, 3)}/mi`}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

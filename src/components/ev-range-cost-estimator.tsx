'use client';

import * as React from 'react';
import { ExternalLink, Fuel, Info, Zap } from 'lucide-react';

import type { VehiclePreset } from '@/types';
import { evModels, formatEvModelName, getReferenceEvModel } from '@/lib/ev-models';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EvCurrencySelect, EvUnitSystemToggle } from '@/components/ev-display-controls';
import { useEvDisplayPreferences } from '@/hooks/use-ev-display-preferences';
import { cn } from '@/lib/utils';
import {
  CHARGING_EFFICIENCY,
  DEFAULT_CHARGE_WINDOW,
  chargeWindowFraction,
  EV_ESTIMATOR_DEFAULTS,
  consumptionInSystem,
  consumptionToPer100mi,
  distanceInSystem,
  estimateCharge,
  evCostPer100,
  gasCostPer100,
  type EvCurrencySymbol,
  type EvUnitSystem,
} from '@/lib/ev-cost-estimator';

interface EvRangeCostEstimatorProps {
  /** Set by the "Try a real EV" chips; the estimator switches to that model when it changes. */
  initialVehicle?: VehiclePreset;
}

const CUSTOM_VEHICLE = 'custom';
const DEFAULT_CUSTOM_BATTERY_KWH = 75;

const CHARGE_WINDOW_PRESETS: { fromPct: number; toPct: number }[] = [
  { fromPct: 10, toPct: 80 },
  { fromPct: 20, toPct: 80 },
  { fromPct: 0, toPct: 100 },
];

// Fixed locale, so the server HTML and the first client render format numbers identically.
const formatFixed = (value: number, digits: number): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const formatMoney = (value: number | null, currency: EvCurrencySymbol, digits = 2): string => {
  if (value === null || !Number.isFinite(value)) return '—';
  const amount = formatFixed(Math.abs(value), digits);
  const sign = value < 0 ? '-' : '';
  if (currency === 'zł') return `${sign}${amount} zł`;
  if (currency === 'CHF') return `${sign}CHF ${amount}`;
  return `${sign}${currency}${amount}`;
};

const roundTo = (value: number, digits: number): number => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

const parseNumber = (raw: string): number => (raw.trim() === '' ? NaN : Number(raw));

const vehicleLabel = (preset: VehiclePreset): string => `${preset.modelYear} ${formatEvModelName(preset)}`;

function ResultTile({ label, value, detail }: { label: string; value: string; detail?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export function EvRangeCostEstimator({ initialVehicle }: EvRangeCostEstimatorProps) {
  const { system, currency, setSystem, setCurrency } = useEvDisplayPreferences();
  const defaults = EV_ESTIMATOR_DEFAULTS[system];
  const distanceUnit = system === 'metric' ? 'km' : 'mi';
  const consumptionUnit = system === 'metric' ? 'kWh/100km' : 'kWh/100mi';

  const [selection, setSelection] = React.useState<string>(initialVehicle?.id ?? getReferenceEvModel().id);
  const [fromPct, setFromPct] = React.useState(String(DEFAULT_CHARGE_WINDOW.fromPct));
  const [toPct, setToPct] = React.useState(String(DEFAULT_CHARGE_WINDOW.toPct));
  const [pricePerKwh, setPricePerKwh] = React.useState(String(EV_ESTIMATOR_DEFAULTS.us.pricePerKwh));
  const [customConsumption, setCustomConsumption] = React.useState(
    String(getReferenceEvModel().epaCombinedKwhPer100mi),
  );
  const [customBatteryKwh, setCustomBatteryKwh] = React.useState(String(DEFAULT_CUSTOM_BATTERY_KWH));
  const [compareToGas, setCompareToGas] = React.useState(false);
  const [fuelPrice, setFuelPrice] = React.useState(String(EV_ESTIMATOR_DEFAULTS.us.fuelPrice));
  const [fuelEconomy, setFuelEconomy] = React.useState(String(EV_ESTIMATOR_DEFAULTS.us.fuelEconomy));

  // A chip picked above the estimator selects that model here.
  React.useEffect(() => {
    if (initialVehicle) setSelection(initialVehicle.id);
  }, [initialVehicle]);

  // On a units switch (including the stored preference applied after mount), prices and the gas
  // car go back to that region's example values; a custom EV's consumption is converted.
  const previousSystemRef = React.useRef<EvUnitSystem>(system);
  React.useEffect(() => {
    const previousSystem = previousSystemRef.current;
    if (previousSystem === system) return;
    previousSystemRef.current = system;
    const next = EV_ESTIMATOR_DEFAULTS[system];
    setPricePerKwh(String(next.pricePerKwh));
    setFuelPrice(String(next.fuelPrice));
    setFuelEconomy(String(next.fuelEconomy));
    setCustomConsumption((current) => {
      const value = parseNumber(current);
      if (!Number.isFinite(value)) return current;
      return String(roundTo(consumptionInSystem(consumptionToPer100mi(value, previousSystem), system), 1));
    });
  }, [system]);

  const isCustom = selection === CUSTOM_VEHICLE;
  const vehicle = isCustom ? null : evModels.find((model) => model.id === selection) ?? getReferenceEvModel();

  const fromPctNum = parseNumber(fromPct);
  const toPctNum = parseNumber(toPct);
  const pricePerKwhNum = parseNumber(pricePerKwh);
  const customKwhPer100mi = consumptionToPer100mi(parseNumber(customConsumption), system);
  const customBatteryNum = parseNumber(customBatteryKwh);
  const wallKwhPer100mi = vehicle ? vehicle.epaCombinedKwhPer100mi : customKwhPer100mi;

  const estimate = vehicle
    ? estimateCharge({
        mode: 'model',
        epaRangeMiles: vehicle.epaRangeMiles,
        wallKwhPer100mi,
        fromPct: fromPctNum,
        toPct: toPctNum,
        pricePerKwh: pricePerKwhNum,
      })
    : estimateCharge({
        mode: 'custom',
        usableBatteryKwh: customBatteryNum,
        wallKwhPer100mi,
        fromPct: fromPctNum,
        toPct: toPctNum,
        pricePerKwh: pricePerKwhNum,
        chargingEfficiency: CHARGING_EFFICIENCY,
      });

  const evCostPer100Distance = evCostPer100(wallKwhPer100mi, pricePerKwhNum, system);
  const gasCostPer100Distance = compareToGas
    ? gasCostPer100(parseNumber(fuelEconomy), parseNumber(fuelPrice), system)
    : null;
  const isWindowValid = chargeWindowFraction(fromPctNum, toPctNum) !== null;
  const consumptionShown = consumptionInSystem(wallKwhPer100mi, system);

  const formatDistance = (miles: number | null): string =>
    miles === null ? '—' : `${Math.round(distanceInSystem(miles, system)).toLocaleString('en-US')} ${distanceUnit}`;
  const formatEnergy = (kwh: number | null): string => (kwh === null ? '—' : `${formatFixed(kwh, 1)} kWh`);
  const windowLabel =
    Number.isFinite(fromPctNum) && Number.isFinite(toPctNum) ? `${fromPctNum}→${toPctNum}%` : 'charge';

  return (
    <section className="space-y-5 rounded-3xl border border-border/60 bg-card px-6 py-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground">Range & charging cost estimator</h2>
        </div>
        <div className="flex items-center gap-2">
          <EvUnitSystemToggle value={system} onChange={setSystem} />
          <EvCurrencySelect value={currency} onChange={setCurrency} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ev-estimator-vehicle">Vehicle</Label>
          <Select name="ev-vehicle" value={selection} onValueChange={setSelection}>
            <SelectTrigger id="ev-estimator-vehicle" className="h-10">
              <SelectValue>{vehicle ? vehicleLabel(vehicle) : 'Custom vehicle'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {evModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {vehicleLabel(model)}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_VEHICLE}>Custom vehicle</SelectItem>
            </SelectContent>
          </Select>
          {vehicle ? (
            <p className="text-xs text-muted-foreground">
              EPA combined: {formatFixed(consumptionInSystem(vehicle.epaCombinedKwhPer100mi, system), 1)} {consumptionUnit}
              {' · '}
              {vehicle.epaCombinedMpge} MPGe
              {' · '}
              {formatDistance(vehicle.epaRangeMiles)} range
              {' · '}
              <a
                href={vehicle.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary-text underline-offset-2 hover:underline"
              >
                fueleconomy.gov
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </p>
          ) : null}
        </div>

        {isCustom ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="ev-custom-consumption">Efficiency ({consumptionUnit}, at the wall)</Label>
              <Input
                id="ev-custom-consumption"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={customConsumption}
                onChange={(e) => setCustomConsumption(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-custom-battery">Usable battery (kWh)</Label>
              <Input
                id="ev-custom-battery"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={customBatteryKwh}
                onChange={(e) => setCustomBatteryKwh(e.target.value)}
              />
            </div>
          </>
        ) : null}

        <div role="group" aria-labelledby="ev-charge-window-label" className="space-y-1.5">
          {/* Inline span in a block, like the <label>s beside it, so both columns line up. */}
          <div>
            <span id="ev-charge-window-label" className="text-sm font-medium leading-none text-foreground">
              Charge from / to
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="ev-charge-from"
              aria-label="Charge from (%)"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={fromPct}
              onChange={(e) => setFromPct(e.target.value)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">% to</span>
            <Input
              id="ev-charge-to"
              aria-label="Charge to (%)"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={toPct}
              onChange={(e) => setToPct(e.target.value)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {CHARGE_WINDOW_PRESETS.map((preset) => {
              const isActive = fromPctNum === preset.fromPct && toPctNum === preset.toPct;
              return (
                <button
                  key={`${preset.fromPct}-${preset.toPct}`}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setFromPct(String(preset.fromPct));
                    setToPct(String(preset.toPct));
                  }}
                  className={cn(
                    'h-9 rounded-full border border-border/60 bg-background px-3 text-xs font-semibold text-muted-foreground transition hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8',
                    isActive && 'border-primary/60 bg-primary/5 text-primary-text',
                  )}
                >
                  {preset.fromPct}→{preset.toPct}%
                </button>
              );
            })}
          </div>
          {!isWindowValid ? (
            <p className="text-xs text-destructive">Use a start below the end, both between 0 and 100%.</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ev-price-per-kwh">Electricity price ({currency}/kWh)</Label>
          <Input
            id="ev-price-per-kwh"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={pricePerKwh}
            onChange={(e) => setPricePerKwh(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Example price ({formatMoney(defaults.pricePerKwh, currency)}/kWh); replace it with your own rate.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border/60 bg-background px-4 py-4 lg:grid-cols-4">
        <ResultTile
          label={vehicle ? 'EPA range' : 'Estimated range'}
          value={formatDistance(estimate.fullRangeMiles)}
          detail={
            vehicle
              ? 'Full charge, EPA combined'
              : estimate.fullChargeWallKwh === null
                ? `Assumes ${Math.round(CHARGING_EFFICIENCY * 100)}% charging efficiency`
                : `Full charge: ${formatEnergy(estimate.fullChargeWallKwh)} from the wall`
          }
        />
        <ResultTile
          label={`Range added (${windowLabel})`}
          value={formatDistance(estimate.rangeAddedMiles)}
        />
        <ResultTile
          label="Cost of this charge"
          value={formatMoney(estimate.chargeCost, currency)}
          detail={estimate.wallEnergyKwh === null ? undefined : `${formatEnergy(estimate.wallEnergyKwh)} from the wall`}
        />
        <ResultTile
          label={`Cost per 100 ${distanceUnit}`}
          value={formatMoney(evCostPer100Distance, currency)}
          detail={Number.isFinite(consumptionShown) ? `${formatFixed(consumptionShown, 1)} ${consumptionUnit}` : undefined}
        />
      </div>

      <p className="flex gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          EPA kWh/100mi figures are measured at the wall, so they already include charging losses.
          {isCustom
            ? ` For a custom vehicle, enter consumption measured the same way; the estimate assumes ${Math.round(CHARGING_EFFICIENCY * 100)}% of the energy from the wall reaches the battery.`
            : ''}
          {' '}The currency symbol is only a label; amounts aren&apos;t converted.
        </span>
      </p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={compareToGas}
        onClick={() => setCompareToGas((prev) => !prev)}
        className={cn(
          'h-9 rounded-full border-border/60',
          compareToGas && 'border-primary/60 bg-primary/5 text-primary-text',
        )}
      >
        <Fuel className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Compare to a gas car
      </Button>

      {compareToGas && (
        <div className="space-y-4 rounded-2xl border border-border/60 bg-background px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ev-gas-economy">
                {system === 'metric' ? 'Gas car consumption (L/100km)' : 'Gas car fuel economy (MPG)'}
              </Label>
              <Input
                id="ev-gas-economy"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={fuelEconomy}
                onChange={(e) => setFuelEconomy(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-gas-price">
                Fuel price ({currency}/{system === 'metric' ? 'L' : 'gal'})
              </Label>
              <Input
                id="ev-gas-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Example price ({formatMoney(defaults.fuelPrice, currency)}/{system === 'metric' ? 'L' : 'gal'}); replace it
                with yours.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="text-sm text-muted-foreground">
              EV:{' '}
              <span className="font-semibold text-foreground">
                {formatMoney(evCostPer100Distance, currency)} per 100 {distanceUnit}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Gas:{' '}
              <span className="font-semibold text-foreground">
                {formatMoney(gasCostPer100Distance, currency)} per 100 {distanceUnit}
              </span>
            </p>
            {evCostPer100Distance !== null && gasCostPer100Distance !== null && (
              <p className="text-sm font-semibold text-primary-text">
                {gasCostPer100Distance >= evCostPer100Distance
                  ? `EV saves ${formatMoney(gasCostPer100Distance - evCostPer100Distance, currency)} per 100 ${distanceUnit}`
                  : `Gas saves ${formatMoney(evCostPer100Distance - gasCostPer100Distance, currency)} per 100 ${distanceUnit}`}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

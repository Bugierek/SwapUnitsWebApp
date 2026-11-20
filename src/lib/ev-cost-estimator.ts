// Pure math for the EV range & charging cost estimator (src/components/ev-range-cost-estimator.tsx).
// Every function returns null for inputs it can't use (non-numbers, negatives, zero divisors).
//
// EPA's kWh/100mi figures are measured at the wall, so they already include charging losses:
// distance × kWh/100mi is the energy you pay for. Only the custom-vehicle mode, which starts from
// a battery size, needs a charging efficiency to get from battery energy to wall energy.

export type EvUnitSystem = 'us' | 'metric';

export const EV_UNIT_SYSTEMS: readonly EvUnitSystem[] = ['us', 'metric'];

/** Labels only: amounts are never converted between currencies. */
export const EV_CURRENCY_SYMBOLS = ['$', '€', '£', 'zł', 'CHF'] as const;
export type EvCurrencySymbol = (typeof EV_CURRENCY_SYMBOLS)[number];

export const isEvUnitSystem = (value: unknown): value is EvUnitSystem =>
  value === 'us' || value === 'metric';

export const isEvCurrencySymbol = (value: unknown): value is EvCurrencySymbol =>
  typeof value === 'string' && (EV_CURRENCY_SYMBOLS as readonly string[]).includes(value);

export const MILES_TO_KM = 1.609344;

/** Share of the energy drawn from the wall that reaches the battery (η), for custom vehicles. */
export const CHARGING_EFFICIENCY = 0.85;

export type EvEstimatorDefaults = {
  currency: EvCurrencySymbol;
  /** Price per kWh of electricity. */
  pricePerKwh: number;
  /** Per US gallon (us) or per liter (metric). */
  fuelPrice: number;
  /** MPG (US) for us, L/100km for metric. */
  fuelEconomy: number;
};

/** Example prices for the UI to start from; users are told to replace them with their own. */
export const EV_ESTIMATOR_DEFAULTS: Record<EvUnitSystem, EvEstimatorDefaults> = {
  us: { currency: '$', pricePerKwh: 0.16, fuelPrice: 3.5, fuelEconomy: 30 },
  metric: { currency: '€', pricePerKwh: 0.3, fuelPrice: 1.75, fuelEconomy: 6.5 },
};

export const DEFAULT_CHARGE_WINDOW = { fromPct: 10, toPct: 80 } as const;

const isNonNegative = (value: number): boolean => Number.isFinite(value) && value >= 0;
const isPositive = (value: number): boolean => Number.isFinite(value) && value > 0;

export const milesToKm = (miles: number): number => miles * MILES_TO_KM;
export const kmToMiles = (km: number): number => km / MILES_TO_KM;

/** kWh/100mi -> kWh/100km (25 -> 15.534). */
export const kwhPer100miToPer100km = (kwhPer100mi: number): number => kwhPer100mi / MILES_TO_KM;
/** kWh/100km -> kWh/100mi (15.534 -> 25). */
export const kwhPer100kmToPer100mi = (kwhPer100km: number): number => kwhPer100km * MILES_TO_KM;

/** Distance in the given system's unit (mi or km) from miles. */
export const distanceInSystem = (miles: number, system: EvUnitSystem): number =>
  system === 'metric' ? milesToKm(miles) : miles;

/** kWh per 100 of the system's distance unit, from kWh/100mi. */
export const consumptionInSystem = (kwhPer100mi: number, system: EvUnitSystem): number =>
  system === 'metric' ? kwhPer100miToPer100km(kwhPer100mi) : kwhPer100mi;

/** kWh/100mi from kWh per 100 of the system's distance unit. */
export const consumptionToPer100mi = (kwhPer100: number, system: EvUnitSystem): number =>
  system === 'metric' ? kwhPer100kmToPer100mi(kwhPer100) : kwhPer100;

/**
 * Share of a full battery added by charging from `fromPct` to `toPct` (10 -> 80 gives 0.7).
 * Null unless 0 <= fromPct < toPct <= 100.
 */
export function chargeWindowFraction(fromPct: number, toPct: number): number | null {
  if (!Number.isFinite(fromPct) || !Number.isFinite(toPct)) return null;
  if (fromPct < 0 || toPct > 100 || toPct <= fromPct) return null;
  return (toPct - fromPct) / 100;
}

/** Range added by a charge window, as a share of the full range (0.7 × 321 mi = 224.7 mi). */
export function rangeAdded(fullRange: number, fromPct: number, toPct: number): number | null {
  const fraction = chargeWindowFraction(fromPct, toPct);
  if (fraction === null || !isNonNegative(fullRange)) return null;
  return fraction * fullRange;
}

/** Energy drawn from the wall to drive `miles` at a wall-measured kWh/100mi (224.7 mi × 0.25 = 56.2 kWh). */
export function wallEnergyForDistanceKwh(miles: number, wallKwhPer100mi: number): number | null {
  if (!isNonNegative(miles) || !isNonNegative(wallKwhPer100mi)) return null;
  return (miles * wallKwhPer100mi) / 100;
}

export function energyCost(kwh: number, pricePerKwh: number): number | null {
  if (!isNonNegative(kwh) || !isNonNegative(pricePerKwh)) return null;
  return kwh * pricePerKwh;
}

/**
 * Electricity cost per 100 mi (us) or per 100 km (metric). EPA's kWh/100mi is wall energy, which
 * is what you pay for, so no efficiency factor applies: 25 kWh/100mi × $0.16 = $4.00 per 100 mi.
 */
export function evCostPer100(wallKwhPer100mi: number, pricePerKwh: number, system: EvUnitSystem): number | null {
  if (!isNonNegative(wallKwhPer100mi) || !isNonNegative(pricePerKwh)) return null;
  return consumptionInSystem(wallKwhPer100mi, system) * pricePerKwh;
}

/**
 * Custom vehicle: full-battery range. Wall consumption × η is what the battery supplies per mile,
 * so range = battery ÷ (wall kWh per mile × η): 75 kWh ÷ (0.25 × 0.85) = 352.9 mi.
 */
export function customFullRangeMiles(
  usableBatteryKwh: number,
  wallKwhPer100mi: number,
  chargingEfficiency: number = CHARGING_EFFICIENCY,
): number | null {
  if (!isNonNegative(usableBatteryKwh) || !isPositive(wallKwhPer100mi)) return null;
  if (!isPositive(chargingEfficiency) || chargingEfficiency > 1) return null;
  return usableBatteryKwh / ((wallKwhPer100mi / 100) * chargingEfficiency);
}

/** Custom vehicle: wall energy for a full (0-100%) charge = battery ÷ η (75 ÷ 0.85 = 88.2 kWh). */
export function customFullChargeWallKwh(
  usableBatteryKwh: number,
  chargingEfficiency: number = CHARGING_EFFICIENCY,
): number | null {
  if (!isNonNegative(usableBatteryKwh)) return null;
  if (!isPositive(chargingEfficiency) || chargingEfficiency > 1) return null;
  return usableBatteryKwh / chargingEfficiency;
}

/**
 * Gasoline cost per 100 mi (us: MPG (US) and price per US gallon) or per 100 km (metric: L/100km
 * and price per liter). 30 MPG at $3.50 = $11.67 per 100 mi; 6.5 L/100km at €1.75 = €11.38 per 100 km.
 */
export function gasCostPer100(fuelEconomy: number, fuelPrice: number, system: EvUnitSystem): number | null {
  if (!isNonNegative(fuelPrice)) return null;
  if (system === 'metric') {
    if (!isNonNegative(fuelEconomy)) return null;
    return fuelEconomy * fuelPrice;
  }
  if (!isPositive(fuelEconomy)) return null;
  return (100 / fuelEconomy) * fuelPrice;
}

export type ChargeEstimateInput =
  | {
      mode: 'model';
      /** EPA combined range on a full charge. */
      epaRangeMiles: number;
      /** EPA combined kWh/100mi (wall energy). */
      wallKwhPer100mi: number;
      fromPct: number;
      toPct: number;
      pricePerKwh: number;
    }
  | {
      mode: 'custom';
      usableBatteryKwh: number;
      /** Wall-measured kWh/100mi, like EPA's figures. */
      wallKwhPer100mi: number;
      fromPct: number;
      toPct: number;
      pricePerKwh: number;
      chargingEfficiency?: number;
    };

export type ChargeEstimate = {
  /** Full-charge range in miles: EPA's figure (model) or the custom estimate. */
  fullRangeMiles: number | null;
  /** Wall energy for a 0-100% charge. */
  fullChargeWallKwh: number | null;
  /** Range added by the fromPct -> toPct window, in miles. */
  rangeAddedMiles: number | null;
  /** Wall energy for that window (what the meter or charger bills). */
  wallEnergyKwh: number | null;
  /** wallEnergyKwh × pricePerKwh. */
  chargeCost: number | null;
};

/**
 * One charging session. Model mode: range added = window × EPA range, wall energy = range added ×
 * kWh/100mi ÷ 100. Custom mode: the full range comes from customFullRangeMiles, then the same
 * formulas apply (which works out to window × battery ÷ η of wall energy).
 */
export function estimateCharge(input: ChargeEstimateInput): ChargeEstimate {
  const fullRangeMiles =
    input.mode === 'model'
      ? isNonNegative(input.epaRangeMiles)
        ? input.epaRangeMiles
        : null
      : customFullRangeMiles(input.usableBatteryKwh, input.wallKwhPer100mi, input.chargingEfficiency);
  const fullChargeWallKwh =
    fullRangeMiles === null ? null : wallEnergyForDistanceKwh(fullRangeMiles, input.wallKwhPer100mi);
  const rangeAddedMiles =
    fullRangeMiles === null ? null : rangeAdded(fullRangeMiles, input.fromPct, input.toPct);
  const wallEnergyKwh =
    rangeAddedMiles === null ? null : wallEnergyForDistanceKwh(rangeAddedMiles, input.wallKwhPer100mi);
  const chargeCost = wallEnergyKwh === null ? null : energyCost(wallEnergyKwh, input.pricePerKwh);
  return { fullRangeMiles, fullChargeWallKwh, rangeAddedMiles, wallEnergyKwh, chargeCost };
}

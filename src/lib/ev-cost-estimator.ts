export function estimateRangeMiles(usableBatteryKwh: number, kwhPer100mi: number): number | null {
  if (!Number.isFinite(usableBatteryKwh) || !Number.isFinite(kwhPer100mi) || kwhPer100mi <= 0) return null;
  return (usableBatteryKwh / kwhPer100mi) * 100;
}

export function estimateCostPerMile(kwhPer100mi: number, pricePerKwh: number): number | null {
  if (!Number.isFinite(kwhPer100mi) || !Number.isFinite(pricePerKwh)) return null;
  return (kwhPer100mi / 100) * pricePerKwh;
}

export function estimateCostPerCharge(usableBatteryKwh: number, pricePerKwh: number): number | null {
  if (!Number.isFinite(usableBatteryKwh) || !Number.isFinite(pricePerKwh)) return null;
  return usableBatteryKwh * pricePerKwh;
}

export function estimateGasCostPerMile(mpg: number, pricePerGallon: number): number | null {
  if (!Number.isFinite(mpg) || mpg <= 0 || !Number.isFinite(pricePerGallon)) return null;
  return pricePerGallon / mpg;
}

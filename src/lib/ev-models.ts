import type { VehiclePreset } from '@/types';
import { convertNumericValue } from '@/lib/conversion-math';

/**
 * Curated EV efficiency reference data. epaCombinedKwhPer100mi = 33,705 / epaCombinedMpge (EPA's
 * own consumer-label constant, see EPA_MPGE_WH_PER_GALLON in unit-data.ts), rounded to 1 decimal.
 * Every epaCombinedMpge figure below was verified via search against EPA-sourced reporting
 * (fueleconomy.gov / InsideEVs / Edmunds / manufacturer EPA-certified data) at time of writing.
 * This is a small, hand-maintained list by design (see project decision) - refresh against
 * fueleconomy.gov each model year rather than treating it as permanently authoritative.
 */
export const evModels: VehiclePreset[] = [
  { id: 'tesla-model-3-rwd', make: 'Tesla', model: 'Model 3', trim: 'RWD', modelYear: 2024, epaCombinedKwhPer100mi: 25.7, epaCombinedMpge: 131 },
  { id: 'tesla-model-y-rwd', make: 'Tesla', model: 'Model Y', trim: 'RWD', modelYear: 2024, epaCombinedKwhPer100mi: 28.1, epaCombinedMpge: 120 },
  { id: 'tesla-model-s', make: 'Tesla', model: 'Model S', trim: 'Long Range AWD, 19"', modelYear: 2024, epaCombinedKwhPer100mi: 27.6, epaCombinedMpge: 122 },
  { id: 'chevrolet-bolt-euv', make: 'Chevrolet', model: 'Bolt EUV', trim: 'LT', modelYear: 2023, epaCombinedKwhPer100mi: 29, epaCombinedMpge: 115 },
  { id: 'hyundai-ioniq-5-rwd', make: 'Hyundai', model: 'Ioniq 5', trim: 'SE Standard Range RWD', modelYear: 2024, epaCombinedKwhPer100mi: 30.6, epaCombinedMpge: 110 },
  { id: 'hyundai-ioniq-6-rwd', make: 'Hyundai', model: 'Ioniq 6', trim: 'SE RWD Long Range, 18"', modelYear: 2023, epaCombinedKwhPer100mi: 24.1, epaCombinedMpge: 140 },
  { id: 'kia-ev6-rwd', make: 'Kia', model: 'EV6', trim: 'Light RWD', modelYear: 2025, epaCombinedKwhPer100mi: 28.8, epaCombinedMpge: 117 },
  { id: 'ford-mustang-mach-e-rwd', make: 'Ford', model: 'Mustang Mach-E', trim: 'Standard Range RWD, 19"', modelYear: 2024, epaCombinedKwhPer100mi: 33, epaCombinedMpge: 102 },
  { id: 'ford-f150-lightning-sr', make: 'Ford', model: 'F-150 Lightning', trim: 'Standard Range', modelYear: 2024, epaCombinedKwhPer100mi: 50, epaCombinedMpge: 68 },
  { id: 'rivian-r1t-quad', make: 'Rivian', model: 'R1T', trim: 'Quad-Motor', modelYear: 2022, epaCombinedKwhPer100mi: 48, epaCombinedMpge: 70 },
  { id: 'nissan-leaf-s', make: 'Nissan', model: 'Leaf', trim: 'S', modelYear: 2024, epaCombinedKwhPer100mi: 30.4, epaCombinedMpge: 111 },
  { id: 'volkswagen-id4-rwd', make: 'Volkswagen', model: 'ID.4', trim: 'Standard RWD, 82 kWh', modelYear: 2026, epaCombinedKwhPer100mi: 29.8, epaCombinedMpge: 113 },
  { id: 'bmw-i4-edrive35', make: 'BMW', model: 'i4', trim: 'eDrive35, 18"', modelYear: 2024, epaCombinedKwhPer100mi: 28.1, epaCombinedMpge: 120 },
];

export function getEvModels(): VehiclePreset[] {
  return evModels;
}

export function getVehiclePresetValueForUnit(preset: VehiclePreset, unitSymbol: string): number | null {
  return convertNumericValue('Fuel Economy', 'kWh/100mi', unitSymbol, preset.epaCombinedKwhPer100mi);
}

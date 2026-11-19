import type { VehiclePreset } from '@/types';
import { convertNumericValue } from '@/lib/conversion-math';

/**
 * EV reference data from the EPA's official fuel economy dataset: fueleconomy.gov's vehicles.csv
 * (https://www.fueleconomy.gov/feg/download.shtml), pulled on 2026-11-19. One row per model: the
 * latest model year in the file, in a comparable base trim.
 *
 * Field mapping (vehicles.csv column -> VehiclePreset):
 * - `id` -> epaId (also used for sourceUrl, fueleconomy.gov's side-by-side page for that vehicle)
 * - `combE` -> epaCombinedKwhPer100mi, rounded to 1 decimal. EPA measures this at the wall, so it
 *   already includes charging losses.
 * - `comb08` -> epaCombinedMpge
 * - `range` -> epaRangeMiles (EPA combined range on a full charge)
 *
 * The kWh/100mi values are EPA's own `combE`, not 33,705 ÷ MPGe (the previous hand-typed list
 * derived them that way, which doesn't match EPA's figures). EPA rounds MPGe and kWh/100mi
 * separately, so converting one into the other won't reproduce the label exactly: 25.0 kWh/100mi
 * converts to 134.8 MPGe, while the Model 3 RWD's label says 137.
 *
 * To refresh: download vehicles.csv again, filter `atvType == 'EV'`, and copy these four columns
 * for the same models' newest year.
 */
export const EV_DATA_PULLED_ON = '2026-11-19';
export const EV_DATA_SOURCE_LABEL = 'fueleconomy.gov (U.S. EPA)';

const fuelEconomyGovUrl = (epaId: number): string =>
  `https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=${epaId}`;

type EvModelRow = Omit<VehiclePreset, 'sourceUrl'>;

const evModelRows: EvModelRow[] = [
  { id: 'tesla-model-3-rwd', epaId: 51067, make: 'Tesla', model: 'Model 3', trim: 'RWD', modelYear: 2027, epaCombinedKwhPer100mi: 25.0, epaCombinedMpge: 137, epaRangeMiles: 321 },
  { id: 'tesla-model-y-rwd', epaId: 51072, make: 'Tesla', model: 'Model Y', trim: 'RWD', modelYear: 2027, epaCombinedKwhPer100mi: 25.0, epaCombinedMpge: 136, epaRangeMiles: 321 },
  { id: 'tesla-model-s-awd', epaId: 49741, make: 'Tesla', model: 'Model S', trim: 'AWD', modelYear: 2026, epaCombinedKwhPer100mi: 27.1, epaCombinedMpge: 124, epaRangeMiles: 410 },
  { id: 'chevrolet-bolt', epaId: 50372, make: 'Chevrolet', model: 'Bolt', modelYear: 2027, epaCombinedKwhPer100mi: 28.2, epaCombinedMpge: 120, epaRangeMiles: 262 },
  { id: 'hyundai-ioniq-5-rwd', epaId: 50645, make: 'Hyundai', model: 'Ioniq 5', trim: 'RWD', modelYear: 2027, epaCombinedKwhPer100mi: 30.0, epaCombinedMpge: 114, epaRangeMiles: 318 },
  { id: 'hyundai-ioniq-6-rwd', epaId: 48362, make: 'Hyundai', model: 'Ioniq 6', trim: 'RWD, 18" wheels', modelYear: 2025, epaCombinedKwhPer100mi: 26.0, epaCombinedMpge: 132, epaRangeMiles: 342 },
  { id: 'kia-ev6-standard-range-rwd', epaId: 51032, make: 'Kia', model: 'EV6', trim: 'Standard Range RWD', modelYear: 2027, epaCombinedKwhPer100mi: 29.2, epaCombinedMpge: 115, epaRangeMiles: 237 },
  { id: 'ford-mustang-mach-e-rwd', epaId: 50204, make: 'Ford', model: 'Mustang Mach-E', trim: 'RWD', modelYear: 2026, epaCombinedKwhPer100mi: 31.4, epaCombinedMpge: 107, epaRangeMiles: 260 },
  { id: 'ford-f150-lightning-4wd-sr', epaId: 48707, make: 'Ford', model: 'F-150 Lightning', trim: '4WD Standard Range', modelYear: 2025, epaCombinedKwhPer100mi: 49.4, epaCombinedMpge: 68, epaRangeMiles: 240 },
  { id: 'rivian-r1t-premium', epaId: 50681, make: 'Rivian', model: 'R1T', trim: 'Premium, 20" wheels', modelYear: 2027, epaCombinedKwhPer100mi: 42.9, epaCombinedMpge: 79, epaRangeMiles: 300 },
  { id: 'nissan-leaf-75kwh', epaId: 49974, make: 'Nissan', model: 'Leaf', trim: '75 kWh, 18" alloy wheels', modelYear: 2026, epaCombinedKwhPer100mi: 30.0, epaCombinedMpge: 114, epaRangeMiles: 288 },
  { id: 'volkswagen-id4-rwd', epaId: 49987, make: 'Volkswagen', model: 'ID.4', trim: 'RWD', modelYear: 2026, epaCombinedKwhPer100mi: 29.8, epaCombinedMpge: 113, epaRangeMiles: 291 },
  { id: 'bmw-i4-edrive40', epaId: 50188, make: 'BMW', model: 'i4', trim: 'eDrive40 Gran Coupe, 18" wheels', modelYear: 2026, epaCombinedKwhPer100mi: 28.5, epaCombinedMpge: 118, epaRangeMiles: 333 },
];

export const evModels: VehiclePreset[] = evModelRows.map((row) => ({
  ...row,
  sourceUrl: fuelEconomyGovUrl(row.epaId),
}));

/** The car used for defaults (pair-page starting values, the estimator's initial model). */
export const REFERENCE_EV_MODEL_ID = 'tesla-model-3-rwd';

export function getEvModels(): VehiclePreset[] {
  return evModels;
}

export function getReferenceEvModel(): VehiclePreset {
  return evModels.find((model) => model.id === REFERENCE_EV_MODEL_ID) ?? evModels[0];
}

/** "Tesla Model 3 RWD" */
export function formatEvModelName(preset: VehiclePreset): string {
  return `${preset.make} ${preset.model}${preset.trim ? ` ${preset.trim}` : ''}`;
}

/**
 * The model's EPA figure in `unitSymbol`: EPA's own MPGe for MPGe (137 for the Model 3 RWD, not
 * the 134.8 that 25.0 kWh/100mi converts to), otherwise its kWh/100mi converted into that unit.
 */
export function getVehiclePresetValueForUnit(preset: VehiclePreset, unitSymbol: string): number | null {
  if (unitSymbol === 'MPGe') return preset.epaCombinedMpge;
  return convertNumericValue('Fuel Economy', 'kWh/100mi', unitSymbol, preset.epaCombinedKwhPer100mi);
}

/** A typical gasoline car, used for the starting value of the liquid-fuel units. */
const TYPICAL_ICE_MPG_US = 30;

const ICE_FUEL_ECONOMY_SYMBOLS = new Set(['km/L', 'L/100km', 'L/100mi', 'MPG (US)', 'MPG (UK)']);

/** Under 100: one decimal; 100 and up: whole numbers. 15.534 -> 15.5, 134.82 -> 135, 4.0 -> 4. */
const roundDefaultValue = (value: number): number =>
  Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;

/**
 * Starting value for a Fuel Economy pair page whose "from" unit is `unitSymbol`: the reference EV
 * (Tesla Model 3 RWD, 25.0 kWh/100mi) for EV units including MPGe, or a 30 MPG (US) gasoline car
 * for liquid-fuel units, converted into that unit and rounded. Null for unknown symbols.
 */
export function getFuelEconomyDefaultValue(unitSymbol: string): number | null {
  const converted = ICE_FUEL_ECONOMY_SYMBOLS.has(unitSymbol)
    ? convertNumericValue('Fuel Economy', 'MPG (US)', unitSymbol, TYPICAL_ICE_MPG_US)
    : convertNumericValue('Fuel Economy', 'kWh/100mi', unitSymbol, getReferenceEvModel().epaCombinedKwhPer100mi);
  return converted === null ? null : roundDefaultValue(converted);
}


/** Another exact way of writing a unit ("N/mm²" for MPa, "cc" for cm³). Not a separate unit. */
export type UnitNotation = {
  /** As it's written, e.g. "N/mm²". */
  text: string;
  /** Why it's the same unit, one line; shown on the /unit-notations page. */
  why: string;
  /**
   * Only exactly this case means the unit. Set automatically when the lowercase form already
   * means another listed unit ("Cal" vs "cal", "Mb/s" vs "mb/s"); set it here when the lowercase
   * form would mean a unit the site doesn't list ("Gb/s": "GB/s" is gigabytes per second).
   */
  exactCase?: boolean;
};

export type Unit = {
  name: string;
  symbol: string;
  factor: number; // Factor to convert from this unit to the base unit of the category
  unitType?: 'frequency' | 'wavelength' | 'direct_efficiency' | 'inverse_consumption';
  /** Other exact notations for this unit; see UnitNotation. */
  alsoWrittenAs?: UnitNotation[];
};

export type UnitCategory =
  | 'Length'
  | 'Mass'
  | 'Temperature'
  | 'Time'
  | 'Pressure'
  | 'Area'
  | 'Volume'
  | 'Energy'
  | 'Speed'
  | 'Power'
  | 'Force'
  | 'Torque'
  | 'Density'
  | 'Fuel Economy'
  | 'Data Storage'
  | 'Data Transfer Rate'
  | 'Bitcoin'
  | 'SI Prefixes'
  | 'Currency';
  // Removed: | 'Ethereum' | 'EM Frequency' | 'Sound Frequency'

export type UnitData = {
  name: string;
  units: Unit[];
};

export type ConversionResult = {
  value: number;
  unit: string;
};

export type Preset = {
    category: UnitCategory;
    fromUnit: string;
    toUnit: string;
    name: string;
};

export type FavoriteItem = {
  id: string;
  category: UnitCategory;
  fromUnit: string;
  toUnit: string;
  name: string;
};

// One EV from fueleconomy.gov's vehicles.csv; see src/lib/ev-models.ts for the field mapping.
export type VehiclePreset = {
  id: string;
  /** fueleconomy.gov vehicle id (vehicles.csv `id`). */
  epaId: number;
  make: string;
  model: string;
  trim?: string;
  modelYear: number;
  /** EPA combined kWh/100mi (`combE`), measured at the wall, so charging losses are included. */
  epaCombinedKwhPer100mi: number;
  /** EPA combined MPGe (`comb08`). */
  epaCombinedMpge: number;
  /** EPA combined range in miles (`range`). */
  epaRangeMiles: number;
  sourceUrl: string;
};

export type NumberFormat = 'normal' | 'scientific';

export type ConversionHistoryMeta =
  | {
      kind: 'si-prefix';
      route: string;
      fromPrefixSymbol: string;
      toPrefixSymbol: string;
      inputText?: string;
    }
  | {
      kind: 'currency-fx-date';
      fxDateKey: string; // 'YYYY-MM-DD', the actual rate date used (FxRatesResponse.date)
      isHistorical: boolean; // true if the user explicitly picked a historical date, false if "latest"
    };

export type ConversionHistoryItem = {
  id: string;
  category: UnitCategory;
  fromValue: number;
  fromUnit: string;
  toValue: number;
  toUnit: string;
  timestamp: number;
  meta?: ConversionHistoryMeta;
};

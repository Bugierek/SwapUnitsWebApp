
export type Unit = {
  name: string;
  symbol: string;
  factor: number; // Factor to convert from this unit to the base unit of the category
  unitType?: 'frequency' | 'wavelength' | 'direct_efficiency' | 'inverse_consumption';
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

export type VehiclePreset = {
  id: string;
  make: string;
  model: string;
  trim?: string;
  modelYear: number;
  epaCombinedKwhPer100mi: number; // EPA's own label unit; see src/lib/ev-models.ts
  epaCombinedMpge?: number;
  sourceUrl?: string;
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

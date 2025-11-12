
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
  | 'Bitcoin';
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

export type NumberFormat = 'normal' | 'scientific';

export type ConversionHistoryMeta =
  | {
      kind: 'si-prefix';
      route: string;
      fromPrefixSymbol: string;
      toPrefixSymbol: string;
      inputText?: string;
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

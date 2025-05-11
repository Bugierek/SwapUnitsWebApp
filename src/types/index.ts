

export type Unit = {
  name: string;
  symbol: string;
  factor: number; // Factor to convert from this unit to the base unit of the category
  mode?: 'basic' | 'advanced' | 'all'; // To distinguish units by mode
  unitType?: 'frequency' | 'wavelength'; // To distinguish unit types within a category
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
  | 'Ethereum'
  | 'EM Frequency' 
  | 'Sound Frequency'; 

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

export type NumberFormat = 'normal' | 'scientific';

// Removed ConverterMode type
// export type ConverterMode = 'basic' | 'advanced';

export type ConversionHistoryItem = {
  id: string;
  category: UnitCategory;
  fromValue: number;
  fromUnit: string;
  toValue: number;
  toUnit: string;
  timestamp: number;
};


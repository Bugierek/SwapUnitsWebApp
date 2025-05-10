

export type Unit = {
  name: string;
  symbol: string;
  factor: number; // Factor to convert from this unit to the base unit of the category
  mode?: 'basic' | 'advanced' | 'all'; // To distinguish units by mode
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


export type UnitData = {
  name: string;
  units: Unit[];
};

export type ConversionResult = {
  value: number;
  unit: string;
};

// Ensure Preset type matches the structure used in unit-data.ts and components
export type Preset = {
    category: UnitCategory;
    fromUnit: string;
    toUnit: string;
    name: string;
};

// Type for number formatting options
export type NumberFormat = 'normal' | 'scientific';

// Type for converter mode
export type ConverterMode = 'basic' | 'advanced';

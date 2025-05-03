

export type Unit = {
  name: string;
  symbol: string;
  factor: number; // Factor to convert from this unit to the base unit of the category
};

export type UnitCategory =
  | 'Length'
  | 'Mass'
  | 'Temperature'
  | 'Time'
  | 'Pressure'
  | 'Area'
  | 'Volume'
  | 'Energy';


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

import { getUnitsForCategory } from '@/lib/unit-data';
import type { UnitCategory } from '@/types';
import { convertCurrency, type FxRatesResponse, type CurrencyCode } from '@/lib/fx';

export function convertNumericValue(
  category: UnitCategory,
  fromUnitSymbol: string,
  toUnitSymbol: string,
  numericValue: number,
  fxContext?: { base: CurrencyCode; rates: FxRatesResponse['rates'] },
): number | null {
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  const currentUnits = getUnitsForCategory(category);
  const fromUnitData = currentUnits.find((unit) => unit.symbol === fromUnitSymbol);
  const toUnitData = currentUnits.find((unit) => unit.symbol === toUnitSymbol);

  if (!fromUnitData || !toUnitData) {
    return null;
  }

  let resultValue: number;

  if (category === 'Currency') {
    if (!fxContext) return null;
    try {
      resultValue = convertCurrency(
        numericValue,
        fromUnitSymbol as CurrencyCode,
        toUnitSymbol as CurrencyCode,
        fxContext.base,
        fxContext.rates,
      );
    } catch {
      return null;
    }
  } else if (category === 'Temperature') {
    let tempInCelsius: number;
    if (fromUnitData.symbol === '°C') {
      tempInCelsius = numericValue;
    } else if (fromUnitData.symbol === '°F') {
      tempInCelsius = (numericValue - 32) * (5 / 9);
    } else {
      tempInCelsius = numericValue - 273.15;
    }

    if (toUnitData.symbol === '°C') {
      resultValue = tempInCelsius;
    } else if (toUnitData.symbol === '°F') {
      resultValue = tempInCelsius * (9 / 5) + 32;
    } else {
      resultValue = tempInCelsius + 273.15;
    }
  } else if (category === 'Fuel Economy') {
    let valueInBaseUnit: number;
    if (fromUnitData.unitType === 'inverse_consumption') {
      if (numericValue === 0) return Infinity;
      valueInBaseUnit = fromUnitData.factor / numericValue;
    } else {
      valueInBaseUnit = numericValue * fromUnitData.factor;
    }

    if (toUnitData.unitType === 'inverse_consumption') {
      if (valueInBaseUnit === 0) return Infinity;
      resultValue = toUnitData.factor / valueInBaseUnit;
    } else {
      resultValue = valueInBaseUnit / toUnitData.factor;
    }
  } else {
    const valueInBaseUnit = numericValue * fromUnitData.factor;
    resultValue = valueInBaseUnit / toUnitData.factor;
  }

  return Number.isFinite(resultValue) ? resultValue : null;
}

export type ConvertUnitsDetailedArgs = {
  category: UnitCategory;
  fromUnit: string;
  toUnit: string;
  value: number;
  fxContext?: { base: CurrencyCode; rates: FxRatesResponse['rates'] };
};

export function convertUnitsDetailed({
  category,
  fromUnit,
  toUnit,
  value,
  fxContext,
}: ConvertUnitsDetailedArgs): { value: number; unit: string } | null {
  const numericValue = Number(value);
  if (
    !category ||
    !fromUnit ||
    !toUnit ||
    value === undefined ||
    value === null ||
    !Number.isFinite(numericValue)
  ) {
    return null;
  }

  const result = convertNumericValue(category, fromUnit, toUnit, numericValue, fxContext);
  return result !== null ? { value: result, unit: toUnit } : null;
}

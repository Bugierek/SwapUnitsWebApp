import { describe, expect, it } from 'vitest';

import {
  findConnectorMatches,
  getCaseExactUnitMatch,
  parseConversionQuery,
  resolveUnitText,
  rewriteCaseExactNotations,
  stripConnectorWords,
  toSuperscriptPowers,
} from '@/lib/conversion-query-parser';
import { unitData } from '@/lib/unit-data';
import type { UnitCategory } from '@/types';

// Expected parser results for queries that matter. Each was checked by hand when its behavior
// was added (new units, name clashes, notation fixes), so a failure here means a behavior change:
// make sure it is intended before updating the expectation.
const CASES: Array<[string, Record<string, unknown>]> = [
  ["5 us dollar to euro", { kind: "unit", value: 5, fromUnit: "USD", toUnit: "EUR", category: "Currency" }],
  ["5 us dollars to eur", { kind: "unit", value: 5, fromUnit: "USD", toUnit: "EUR", category: "Currency" }],
  ["250 us to ms", { kind: "unit", value: 250, fromUnit: "µs", toUnit: "ms", category: "Time" }],
  ["100 MBps to Mbps", { kind: "unit", value: 100, fromUnit: "MB/s", toUnit: "Mbps", category: "Data Transfer Rate" }],
  ["100 Mb/s to MB/s", { kind: "unit", value: 100, fromUnit: "Mbps", toUnit: "MB/s", category: "Data Transfer Rate" }],
  ["100 MB/s to Mb/s", { kind: "unit", value: 100, fromUnit: "MB/s", toUnit: "Mbps", category: "Data Transfer Rate" }],
  ["1 Gb/s to MB/s", { kind: "unit", value: 1, fromUnit: "Gbps", toUnit: "MB/s", category: "Data Transfer Rate" }],
  ["100 Kb/s to KB/s", { kind: "unit", value: 100, fromUnit: "Kbps", toUnit: "KB/s", category: "Data Transfer Rate" }],
  ["100 kb/s to KB/s", { kind: "unit", value: 100, fromUnit: "KB/s", toUnit: "KB/s", category: "Data Transfer Rate" }],
  ["100 mb/s to mbps", { kind: "unit", value: 100, fromUnit: "MB/s", toUnit: "Mbps", category: "Data Transfer Rate" }],
  ["100Mb/s to MB/s", { kind: "unit", value: 100, fromUnit: "Mbps", toUnit: "MB/s", category: "Data Transfer Rate" }],
  ["Mb/s", { kind: "unit", value: 1, fromUnit: "Mbps", toUnit: "MB/s", category: "Data Transfer Rate" }],
  // "Mg" (megagram) was read as a tonne in stage 1; reverted in stage B: on a general converter a
  // capital-M "Mg" is a milligram typed with a capital (phone keyboards, labels printed "MG").
  ["1 t to Mg", { kind: "unit", value: 1, fromUnit: "t", toUnit: "mg", category: "Mass" }],
  ["5 Mg to kg", { kind: "unit", value: 5, fromUnit: "mg", toUnit: "kg", category: "Mass" }],
  ["5 MG to g", { kind: "unit", value: 5, fromUnit: "mg", toUnit: "g", category: "Mass" }],
  ["5 mg to g", { kind: "unit", value: 5, fromUnit: "mg", toUnit: "g", category: "Mass" }],
  ["Mg", { kind: "unit", value: 1, fromUnit: "mg", toUnit: "g", category: "Mass" }],
  // Stage B: other notations for the same unit (unit-data.ts UNIT_NOTATIONS).
  ["5 N/mm2 to psi", { kind: "unit", value: 5, fromUnit: "MPa", toUnit: "psi", category: "Pressure" }],
  ["5 n/mm^2 to psi", { kind: "unit", value: 5, fromUnit: "MPa", toUnit: "psi", category: "Pressure" }],
  ["5 N/mm² to MPa", { kind: "unit", value: 5, fromUnit: "MPa", toUnit: "MPa", category: "Pressure" }],
  ["5 MN/m2 to kPa", { kind: "unit", value: 5, fromUnit: "MPa", toUnit: "kPa", category: "Pressure" }],
  ["5 N/m2 to kPa", { kind: "unit", value: 5, fromUnit: "Pa", toUnit: "kPa", category: "Pressure" }],
  ["5 kN/m2 to psi", { kind: "unit", value: 5, fromUnit: "kPa", toUnit: "psi", category: "Pressure" }],
  ["5 lbf/in2 to kPa", { kind: "unit", value: 5, fromUnit: "psi", toUnit: "kPa", category: "Pressure" }],
  ["5 lb/in² to kPa", { kind: "unit", value: 5, fromUnit: "psi", toUnit: "kPa", category: "Pressure" }],
  ["250 cc to ml", { kind: "unit", value: 250, fromUnit: "cm³", toUnit: "mL", category: "Volume" }],
  ["3 dm3 to l", { kind: "unit", value: 3, fromUnit: "L", toUnit: "L", category: "Volume" }],
  ["5 ul to mm3", { kind: "unit", value: 5, fromUnit: "mm³", toUnit: "mm³", category: "Volume" }],
  ["5 µL to mL", { kind: "unit", value: 5, fromUnit: "mm³", toUnit: "mL", category: "Volume" }],
  ["5 cu in to cm3", { kind: "unit", value: 5, fromUnit: "in³", toUnit: "cm³", category: "Volume" }],
  ["2 hm2 to ha", { kind: "unit", value: 2, fromUnit: "ha", toUnit: "ha", category: "Area" }],
  ["5 ac to ha", { kind: "unit", value: 5, fromUnit: "acre", toUnit: "ha", category: "Area" }],
  ["3600 W·s to Wh", { kind: "unit", value: 3600, fromUnit: "J", toUnit: "Wh", category: "Energy" }],
  ["3600 Ws to Wh", { kind: "unit", value: 3600, fromUnit: "J", toUnit: "Wh", category: "Energy" }],
  ["3600 W*s to Wh", { kind: "unit", value: 3600, fromUnit: "J", toUnit: "Wh", category: "Energy" }],
  ["5 kW·h to MJ", { kind: "unit", value: 5, fromUnit: "kWh", toUnit: "MJ", category: "Energy" }],
  ["500 Cal to kJ", { kind: "unit", value: 500, fromUnit: "kcal", toUnit: "kJ", category: "Energy" }],
  ["500 cal to kJ", { kind: "unit", value: 500, fromUnit: "cal", toUnit: "kJ", category: "Energy" }],
  ["500 CAL to J", { kind: "unit", value: 500, fromUnit: "cal", toUnit: "J", category: "Energy" }],
  ["60 J/s to W", { kind: "unit", value: 60, fromUnit: "W", toUnit: "W", category: "Power" }],
  ["5 kJ/s to hp", { kind: "unit", value: 5, fromUnit: "kW", toUnit: "hp", category: "Power" }],
  ["10 kg·m/s2 to N", { kind: "unit", value: 10, fromUnit: "N", toUnit: "N", category: "Force" }],
  ["10 kg*m/s^2 to lbf", { kind: "unit", value: 10, fromUnit: "N", toUnit: "lbf", category: "Force" }],
  ["10 kg m/s2 to N", { kind: "unit", value: 10, fromUnit: "N", toUnit: "N", category: "Force" }],
  ["5 g·cm/s2 to dyn", { kind: "unit", value: 5, fromUnit: "dyn", toUnit: "dyn", category: "Force" }],
  ["10 kp to N", { kind: "unit", value: 10, fromUnit: "kgf", toUnit: "N", category: "Force" }],
  ["5 klbf to kN", { kind: "unit", value: 5, fromUnit: "kip", toUnit: "kN", category: "Force" }],
  ["5 ft·lbf to N·m", { kind: "unit", value: 5, fromUnit: "lbf·ft", toUnit: "N·m", category: "Torque" }],
  ["5 in·ozf to N·cm", { kind: "unit", value: 5, fromUnit: "ozf·in", toUnit: "N·cm", category: "Torque" }],
  ["100 kph to mph", { kind: "unit", value: 100, fromUnit: "km/h", toUnit: "mph", category: "Speed" }],
  ["100 kmh to mph", { kind: "unit", value: 100, fromUnit: "km/h", toUnit: "mph", category: "Speed" }],
  ["100 km/hr to mph", { kind: "unit", value: 100, fromUnit: "km/h", toUnit: "mph", category: "Speed" }],
  ["60 mi/h to km/h", { kind: "unit", value: 60, fromUnit: "mph", toUnit: "km/h", category: "Speed" }],
  ["62.4 pcf to kg/m3", { kind: "unit", value: 62.4, fromUnit: "lb/ft³", toUnit: "kg/m³", category: "Density" }],
  ["100 Mbit/s to MB/s", { kind: "unit", value: 100, fromUnit: "Mbps", toUnit: "MB/s", category: "Data Transfer Rate" }],
  ["100 kbit/s to Kbps", { kind: "unit", value: 100, fromUnit: "Kbps", toUnit: "Kbps", category: "Data Transfer Rate" }],
  ["1 Gbit/s to MB/s", { kind: "unit", value: 1, fromUnit: "Gbps", toUnit: "MB/s", category: "Data Transfer Rate" }],
  ["100 bit/s to B/s", { kind: "unit", value: 100, fromUnit: "bps", toUnit: "B/s", category: "Data Transfer Rate" }],
  ["100 KBps to Kbps", { kind: "unit", value: 100, fromUnit: "KB/s", toUnit: "Kbps", category: "Data Transfer Rate" }],
  // Milliwatt (stage B): exact case picks between mW and MW; all-lowercase "mw" is milliwatts.
  ["5 mW to W", { kind: "unit", value: 5, fromUnit: "mW", toUnit: "W", category: "Power" }],
  ["5 mw to w", { kind: "unit", value: 5, fromUnit: "mW", toUnit: "W", category: "Power" }],
  ["5 MW to W", { kind: "unit", value: 5, fromUnit: "MW", toUnit: "W", category: "Power" }],
  ["5 kW to MW", { kind: "unit", value: 5, fromUnit: "kW", toUnit: "MW", category: "Power" }],
  ["5 kW to mw", { kind: "unit", value: 5, fromUnit: "kW", toUnit: "mW", category: "Power" }],
  ["5 MW to mW", { kind: "unit", value: 5, fromUnit: "MW", toUnit: "mW", category: "Power" }],
  ["5 mw", { kind: "unit", value: 5, fromUnit: "mW", toUnit: "W", category: "Power" }],
  ["5 milliwatts to watts", { kind: "unit", value: 5, fromUnit: "mW", toUnit: "W", category: "Power" }],
  ["5 mj to j", { kind: "unit", value: 5, fromUnit: "MJ", toUnit: "J", category: "Energy" }],
  ["5 mpa to psi", { kind: "unit", value: 5, fromUnit: "MPa", toUnit: "psi", category: "Pressure" }],
  ["mg", { kind: "unit", value: 1, fromUnit: "mg", toUnit: "g", category: "Mass" }],
  ["1e3 g to kg", { kind: "unit", value: 1000, fromUnit: "g", toUnit: "kg", category: "Mass" }],
  ["1.5e3 g to kg", { kind: "unit", value: 1500, fromUnit: "g", toUnit: "kg", category: "Mass" }],
  ["2.5e2 kg to g", { kind: "unit", value: 250, fromUnit: "kg", toUnit: "g", category: "Mass" }],
  ["1e2 m2 to ft2", { kind: "unit", value: 100, fromUnit: "m²", toUnit: "ft²", category: "Area" }],
  ["3e3 m", { kind: "unit", value: 3000, fromUnit: "m", toUnit: "ft", category: "Length" }],
  ["si micro to milli", { kind: "si-prefix", value: 1, fromPrefixSymbol: "µ", toPrefixSymbol: "m" }],
  ["SI 5 kilo to milli", { kind: "si-prefix", value: 5, fromPrefixSymbol: "k", toPrefixSymbol: "m" }],
  ["30 uk mpg to l/100km", { kind: "unit", value: 30, fromUnit: "MPG (UK)", toUnit: "L/100km", category: "Fuel Economy" }],
  ["30 imperial mpg to l/100km", { kind: "unit", value: 30, fromUnit: "MPG (UK)", toUnit: "L/100km", category: "Fuel Economy" }],
  ["30 mpg to l/100km", { kind: "unit", value: 30, fromUnit: "MPG (US)", toUnit: "L/100km", category: "Fuel Economy" }],
  ["30 mpg uk to l/100km", { kind: "unit", value: 30, fromUnit: "MPG (UK)", toUnit: "L/100km", category: "Fuel Economy" }],
  ["30 l/100km to uk mpg", { kind: "unit", value: 30, fromUnit: "L/100km", toUnit: "MPG (UK)", category: "Fuel Economy" }],
  ["30 mpg", { kind: "unit", value: 30, fromUnit: "MPG (US)", toUnit: "L/100km", category: "Fuel Economy" }],
  ["5 ft 7 in", { kind: "unit", value: 5.583333333333333, fromUnit: "ft", toUnit: "m", category: "Length" }],
  ["1 h 32 min 15 sec", { kind: "unit", value: 1.5375, fromUnit: "h", toUnit: "s", category: "Time" }],
  ["10deg C in deg F", { kind: "unit", value: 10, fromUnit: "°C", toUnit: "°F", category: "Temperature" }],
  ["100 km/h to mph", { kind: "unit", value: 100, fromUnit: "km/h", toUnit: "mph", category: "Speed" }],
  ["7 l/100km to mpg", { kind: "unit", value: 7, fromUnit: "L/100km", toUnit: "MPG (US)", category: "Fuel Economy" }],
  ["25 kwh/100mi to mi/kwh", { kind: "unit", value: 25, fromUnit: "kWh/100mi", toUnit: "mi/kWh", category: "Fuel Economy" }],
  ["120 mpge to kwh/100mi", { kind: "unit", value: 120, fromUnit: "MPGe", toUnit: "kWh/100mi", category: "Fuel Economy" }],
  ["kwh/100mi", { kind: "unit", value: 1, fromUnit: "kWh/100mi", toUnit: "mi/kWh", category: "Fuel Economy" }],
  ["l/100km", { kind: "unit", value: 1, fromUnit: "L/100km", toUnit: "L/100mi", category: "Fuel Economy" }],
  ["5 m2 to ft2", { kind: "unit", value: 5, fromUnit: "m²", toUnit: "ft²", category: "Area" }],
  ["12 cm^3 in m^3", { kind: "unit", value: 12, fromUnit: "cm³", toUnit: "m³", category: "Volume" }],
  ["100 kg to g", { kind: "unit", value: 100, fromUnit: "kg", toUnit: "g", category: "Mass" }],
  ["speed", { kind: "category", category: "Speed" }],
  ["fuel economy", { kind: "category", category: "Fuel Economy" }],
  ["1e5 m to km", { kind: "unit", value: 100000, fromUnit: "m", toUnit: "km", category: "Length" }],
  ["-40 c to f", { kind: "unit", value: -40, fromUnit: "°C", toUnit: "°F", category: "Temperature" }],
  ["50 usd to eur", { kind: "unit", value: 50, fromUnit: "USD", toUnit: "EUR", category: "Currency" }],
  ["10 knots to km/h", { kind: "unit", value: 10, fromUnit: "kn", toUnit: "km/h", category: "Speed" }],
  ["2 GB to MB", { kind: "unit", value: 2, fromUnit: "GB", toUnit: "MB", category: "Data Storage" }],
  ["100 Mbps to MB/s", { kind: "unit", value: 100, fromUnit: "Mbps", toUnit: "MB/s", category: "Data Transfer Rate" }],
  ["1 btc to sat", { kind: "unit", value: 1, fromUnit: "BTC", toUnit: "sat", category: "Bitcoin" }],
  ["10 pounds to kg", { kind: "unit", value: 10, fromUnit: "lb", toUnit: "kg", category: "Mass" }],
  ["10 pound to kg", { kind: "unit", value: 10, fromUnit: "lb", toUnit: "kg", category: "Mass" }],
  ["10 kg in pounds", { kind: "unit", value: 10, fromUnit: "kg", toUnit: "lb", category: "Mass" }],
  ["10 kg to pounds", { kind: "unit", value: 10, fromUnit: "kg", toUnit: "lb", category: "Mass" }],
  ["5 pounds to usd", { kind: "unit", value: 5, fromUnit: "GBP", toUnit: "USD", category: "Currency" }],
  ["100 pounds in euros", { kind: "unit", value: 100, fromUnit: "GBP", toUnit: "EUR", category: "Currency" }],
  ["100 kn to mph", { kind: "unit", value: 100, fromUnit: "kn", toUnit: "mph", category: "Speed" }],
  ["100 kn to lbf", { kind: "unit", value: 100, fromUnit: "kN", toUnit: "lbf", category: "Force" }],
  ["100 kN to lbf", { kind: "unit", value: 100, fromUnit: "kN", toUnit: "lbf", category: "Force" }],
  ["100 kN", { kind: "unit", value: 100, fromUnit: "kN", toUnit: "lbf", category: "Force" }],
  ["100 kn", { kind: "unit", value: 100, fromUnit: "kn", toUnit: "km/h", category: "Speed" }],
  ["5 PS to kW", { kind: "unit", value: 5, fromUnit: "PS", toUnit: "kW", category: "Power" }],
  ["5 ps to kw", { kind: "unit", value: 5, fromUnit: "PS", toUnit: "kW", category: "Power" }],
  ["5 PS", { kind: "unit", value: 5, fromUnit: "PS", toUnit: "kW", category: "Power" }],
  ["5 ps", { kind: "unit", value: 5, fromUnit: "ps", toUnit: "ms", category: "Time" }],
  ["150 hp", { kind: "unit", value: 150, fromUnit: "hp", toUnit: "kW", category: "Power" }],
  ["150 hp to kw", { kind: "unit", value: 150, fromUnit: "hp", toUnit: "kW", category: "Power" }],
  ["150 bhp to ps", { kind: "unit", value: 150, fromUnit: "hp", toUnit: "PS", category: "Power" }],
  ["50 Nm to lb ft", { kind: "unit", value: 50, fromUnit: "N·m", toUnit: "lbf·ft", category: "Torque" }],
  ["50 nm to lb ft", { kind: "unit", value: 50, fromUnit: "N·m", toUnit: "lbf·ft", category: "Torque" }],
  ["50 Nm", { kind: "unit", value: 50, fromUnit: "N·m", toUnit: "lbf·ft", category: "Torque" }],
  ["50 nm", { kind: "unit", value: 50, fromUnit: "nm", toUnit: "ft", category: "Length" }],
  ["50 N·m to lbf·ft", { kind: "unit", value: 50, fromUnit: "N·m", toUnit: "lbf·ft", category: "Torque" }],
  ["50 N m to ft lbs", { kind: "unit", value: 50, fromUnit: "N·m", toUnit: "lbf·ft", category: "Torque" }],
  ["50 n-m to ft-lb", { kind: "unit", value: 50, fromUnit: "N·m", toUnit: "lbf·ft", category: "Torque" }],
  ["100 ft lb to nm", { kind: "unit", value: 100, fromUnit: "lbf·ft", toUnit: "N·m", category: "Torque" }],
  ["100 ft-lbs to nm", { kind: "unit", value: 100, fromUnit: "lbf·ft", toUnit: "N·m", category: "Torque" }],
  ["100 lb-ft to Nm", { kind: "unit", value: 100, fromUnit: "lbf·ft", toUnit: "N·m", category: "Torque" }],
  ["100 lb ft to n m", { kind: "unit", value: 100, fromUnit: "lbf·ft", toUnit: "N·m", category: "Torque" }],
  ["100 lbft to nm", { kind: "unit", value: 100, fromUnit: "lbf·ft", toUnit: "N·m", category: "Torque" }],
  ["120 in lb to nm", { kind: "unit", value: 120, fromUnit: "lbf·in", toUnit: "N·m", category: "Torque" }],
  ["120 in-lb to nm", { kind: "unit", value: 120, fromUnit: "lbf·in", toUnit: "N·m", category: "Torque" }],
  ["120 in lbs to nm", { kind: "unit", value: 120, fromUnit: "lbf·in", toUnit: "N·m", category: "Torque" }],
  ["120 lb in to nm", { kind: "unit", value: 120, fromUnit: "lbf·in", toUnit: "N·m", category: "Torque" }],
  ["120 lb-in to nm", { kind: "unit", value: 120, fromUnit: "lbf·in", toUnit: "N·m", category: "Torque" }],
  ["120 lbf·in to N·m", { kind: "unit", value: 120, fromUnit: "lbf·in", toUnit: "N·m", category: "Torque" }],
  ["10 nm to in lb", { kind: "unit", value: 10, fromUnit: "N·m", toUnit: "lbf·in", category: "Torque" }],
  ["10 nm to in-lb", { kind: "unit", value: 10, fromUnit: "N·m", toUnit: "lbf·in", category: "Torque" }],
  ["25 kgm to nm", { kind: "unit", value: 25, fromUnit: "kgf·m", toUnit: "N·m", category: "Torque" }],
  ["25 kgf m to nm", { kind: "unit", value: 25, fromUnit: "kgf·m", toUnit: "N·m", category: "Torque" }],
  ["10 kgcm to ncm", { kind: "unit", value: 10, fromUnit: "kgf·cm", toUnit: "N·cm", category: "Torque" }],
  ["50 oz in to n cm", { kind: "unit", value: 50, fromUnit: "ozf·in", toUnit: "N·cm", category: "Torque" }],
  ["50 oz-in to ncm", { kind: "unit", value: 50, fromUnit: "ozf·in", toUnit: "N·cm", category: "Torque" }],
  ["5 in2 to cm2", { kind: "unit", value: 5, fromUnit: "in²", toUnit: "cm²", category: "Area" }],
  ["5 in² to cm²", { kind: "unit", value: 5, fromUnit: "in²", toUnit: "cm²", category: "Area" }],
  ["5 sq in to cm2", { kind: "unit", value: 5, fromUnit: "in²", toUnit: "cm²", category: "Area" }],
  ["5 cm2 to in2", { kind: "unit", value: 5, fromUnit: "cm²", toUnit: "in²", category: "Area" }],
  ["5 square inches to cm2", { kind: "unit", value: 5, fromUnit: "in²", toUnit: "cm²", category: "Area" }],
  ["2 cu in to ml", { kind: "unit", value: 2, fromUnit: "in³", toUnit: "mL", category: "Volume" }],
  ["2 in3 to ml", { kind: "unit", value: 2, fromUnit: "in³", toUnit: "mL", category: "Volume" }],
  ["2 in³ to cm³", { kind: "unit", value: 2, fromUnit: "in³", toUnit: "cm³", category: "Volume" }],
  ["2 cu yd to m3", { kind: "unit", value: 2, fromUnit: "yd³", toUnit: "m³", category: "Volume" }],
  ["3 cups to ml", { kind: "unit", value: 3, fromUnit: "cup", toUnit: "mL", category: "Volume" }],
  ["3 cup to ml", { kind: "unit", value: 3, fromUnit: "cup", toUnit: "mL", category: "Volume" }],
  ["2 tbsp to tsp", { kind: "unit", value: 2, fromUnit: "tbsp", toUnit: "tsp", category: "Volume" }],
  ["2 tablespoons to ml", { kind: "unit", value: 2, fromUnit: "tbsp", toUnit: "mL", category: "Volume" }],
  ["8 fl oz to ml", { kind: "unit", value: 8, fromUnit: "fl oz", toUnit: "mL", category: "Volume" }],
  ["8 floz to ml", { kind: "unit", value: 8, fromUnit: "fl oz", toUnit: "mL", category: "Volume" }],
  ["8 fluid ounces to ml", { kind: "unit", value: 8, fromUnit: "fl oz", toUnit: "mL", category: "Volume" }],
  ["8 fl oz uk to ml", { kind: "unit", value: 8, fromUnit: "fl oz (UK)", toUnit: "mL", category: "Volume" }],
  ["1 pint to ml", { kind: "unit", value: 1, fromUnit: "pt", toUnit: "mL", category: "Volume" }],
  ["1 uk pint to ml", { kind: "unit", value: 1, fromUnit: "pt (UK)", toUnit: "mL", category: "Volume" }],
  ["1 imperial pint to ml", { kind: "unit", value: 1, fromUnit: "pt (UK)", toUnit: "mL", category: "Volume" }],
  ["1 gallon to liters", { kind: "unit", value: 1, fromUnit: "gal", toUnit: "L", category: "Volume" }],
  ["1 imperial gallon to liters", { kind: "unit", value: 1, fromUnit: "gal (UK)", toUnit: "L", category: "Volume" }],
  ["1 quart to liters", { kind: "unit", value: 1, fromUnit: "qt", toUnit: "L", category: "Volume" }],
  ["1 qt to l", { kind: "unit", value: 1, fromUnit: "qt", toUnit: "L", category: "Volume" }],
  ["5 stone to kg", { kind: "unit", value: 5, fromUnit: "st", toUnit: "kg", category: "Mass" }],
  ["11 st to lb", { kind: "unit", value: 11, fromUnit: "st", toUnit: "lb", category: "Mass" }],
  ["1 short ton to kg", { kind: "unit", value: 1, fromUnit: "ton (US)", toUnit: "kg", category: "Mass" }],
  ["1 long ton to kg", { kind: "unit", value: 1, fromUnit: "ton (UK)", toUnit: "kg", category: "Mass" }],
  ["1 ton to kg", { kind: "unit", value: 1, fromUnit: "t", toUnit: "kg", category: "Mass" }],
  ["1013 hpa to inhg", { kind: "unit", value: 1013, fromUnit: "hPa", toUnit: "inHg", category: "Pressure" }],
  ["29.92 inhg to hpa", { kind: "unit", value: 29.92, fromUnit: "inHg", toUnit: "hPa", category: "Pressure" }],
  ["29.92 in hg to hpa", { kind: "unit", value: 29.92, fromUnit: "inHg", toUnit: "hPa", category: "Pressure" }],
  ["29.92 inches of mercury to hpa", { kind: "unit", value: 29.92, fromUnit: "inHg", toUnit: "hPa", category: "Pressure" }],
  ["760 mmhg to kpa", { kind: "unit", value: 760, fromUnit: "mmHg", toUnit: "kPa", category: "Pressure" }],
  ["760 mm hg to atm", { kind: "unit", value: 760, fromUnit: "mmHg", toUnit: "atm", category: "Pressure" }],
  ["760 torr to atm", { kind: "unit", value: 760, fromUnit: "Torr", toUnit: "atm", category: "Pressure" }],
  ["1000 mbar to hpa", { kind: "unit", value: 1000, fromUnit: "mbar", toUnit: "hPa", category: "Pressure" }],
  ["1 mpa to psi", { kind: "unit", value: 1, fromUnit: "MPa", toUnit: "psi", category: "Pressure" }],
  ["1 kwh to wh", { kind: "unit", value: 1, fromUnit: "kWh", toUnit: "Wh", category: "Energy" }],
  ["1 wh to j", { kind: "unit", value: 1, fromUnit: "Wh", toUnit: "J", category: "Energy" }],
  ["1 mj to kwh", { kind: "unit", value: 1, fromUnit: "MJ", toUnit: "kWh", category: "Energy" }],
  ["1 ev to j", { kind: "unit", value: 1, fromUnit: "eV", toUnit: "J", category: "Energy" }],
  ["1 therm to kwh", { kind: "unit", value: 1, fromUnit: "thm", toUnit: "kWh", category: "Energy" }],
  ["100 therms to kwh", { kind: "unit", value: 100, fromUnit: "thm", toUnit: "kWh", category: "Energy" }],
  ["10 ft/s to m/s", { kind: "unit", value: 10, fromUnit: "ft/s", toUnit: "m/s", category: "Speed" }],
  ["10 feet per second to mph", { kind: "unit", value: 10, fromUnit: "ft/s", toUnit: "mph", category: "Speed" }],
  ["1 tb to gib", { kind: "unit", value: 1, fromUnit: "TB", toUnit: "GiB", category: "Data Storage" }],
  ["1 TB to GiB", { kind: "unit", value: 1, fromUnit: "TB", toUnit: "GiB", category: "Data Storage" }],
  ["1 gib to gb", { kind: "unit", value: 1, fromUnit: "GiB", toUnit: "GB", category: "Data Storage" }],
  ["1 kib to kb", { kind: "unit", value: 1, fromUnit: "KiB", toUnit: "KB", category: "Data Storage" }],
  ["1 mib to mb", { kind: "unit", value: 1, fromUnit: "MiB", toUnit: "MB", category: "Data Storage" }],
  ["500 GB to GiB", { kind: "unit", value: 500, fromUnit: "GB", toUnit: "GiB", category: "Data Storage" }],
  ["1 kw to hp", { kind: "unit", value: 1, fromUnit: "kW", toUnit: "hp", category: "Power" }],
  ["1 kW to PS", { kind: "unit", value: 1, fromUnit: "kW", toUnit: "PS", category: "Power" }],
  ["1000 w to btu/h", { kind: "unit", value: 1000, fromUnit: "W", toUnit: "BTU/h", category: "Power" }],
  ["12000 btu/h to kw", { kind: "unit", value: 12000, fromUnit: "BTU/h", toUnit: "kW", category: "Power" }],
  // All-lowercase "mw" was megawatts until milliwatt was added (stage B); it now means milliwatts.
  ["1 mw to kw", { kind: "unit", value: 1, fromUnit: "mW", toUnit: "kW", category: "Power" }],
  ["1 gw to mw", { kind: "unit", value: 1, fromUnit: "GW", toUnit: "mW", category: "Power" }],
  ["10 n to lbf", { kind: "unit", value: 10, fromUnit: "N", toUnit: "lbf", category: "Force" }],
  ["10 N to lbf", { kind: "unit", value: 10, fromUnit: "N", toUnit: "lbf", category: "Force" }],
  ["10 N", { kind: "unit", value: 10, fromUnit: "N", toUnit: "lbf", category: "Force" }],
  ["1 N", { kind: "unit", value: 1, fromUnit: "N", toUnit: "lbf", category: "Force" }],
  ["10 newtons to pounds force", { kind: "unit", value: 10, fromUnit: "N", toUnit: "lbf", category: "Force" }],
  ["10 kgf to n", { kind: "unit", value: 10, fromUnit: "kgf", toUnit: "N", category: "Force" }],
  ["10 kp to n", { kind: "unit", value: 10, fromUnit: "kgf", toUnit: "N", category: "Force" }],
  ["1 kip to kn", { kind: "unit", value: 1, fromUnit: "kip", toUnit: "kN", category: "Force" }],
  ["1 dyn to n", { kind: "unit", value: 1, fromUnit: "dyn", toUnit: "N", category: "Force" }],
  ["1 g/cm3 to kg/m3", { kind: "unit", value: 1, fromUnit: "g/cm³", toUnit: "kg/m³", category: "Density" }],
  ["1 g/cc to kg/m3", { kind: "unit", value: 1, fromUnit: "g/cm³", toUnit: "kg/m³", category: "Density" }],
  ["1000 kg/m3 to lb/ft3", { kind: "unit", value: 1000, fromUnit: "kg/m³", toUnit: "lb/ft³", category: "Density" }],
  ["62.4 lb/ft3 to kg/m3", { kind: "unit", value: 62.4, fromUnit: "lb/ft³", toUnit: "kg/m³", category: "Density" }],
  ["62.4 pcf to kg/m3", { kind: "unit", value: 62.4, fromUnit: "lb/ft³", toUnit: "kg/m³", category: "Density" }],
  ["1 lb/in3 to g/cm3", { kind: "unit", value: 1, fromUnit: "lb/in³", toUnit: "g/cm³", category: "Density" }],
  ["8.34 lb/gal to kg/l", { kind: "unit", value: 8.34, fromUnit: "lb/gal", toUnit: "kg/L", category: "Density" }],
  ["1 g/ml to g/cm3", { kind: "unit", value: 1, fromUnit: "g/mL", toUnit: "g/cm³", category: "Density" }],
  ["1 kg/l to g/ml", { kind: "unit", value: 1, fromUnit: "kg/L", toUnit: "g/mL", category: "Density" }],
  ["power", { kind: "category", category: "Power" }],
  ["force", { kind: "category", category: "Force" }],
  ["torque", { kind: "category", category: "Torque" }],
  ["density", { kind: "category", category: "Density" }],
  ["energy", { kind: "category", category: "Energy" }],
  ["volume", { kind: "category", category: "Volume" }],
  ["watts", { kind: "unit", value: 1, fromUnit: "W", toUnit: "hp", category: "Power" }],
  ["horsepower", { kind: "unit", value: 1, fromUnit: "hp", toUnit: "kW", category: "Power" }],
  ["newton meter", { kind: "unit", value: 1, fromUnit: "N·m", toUnit: "lbf·ft", category: "Torque" }],
  ["pound-force", { kind: "unit", value: 1, fromUnit: "lbf", toUnit: "N", category: "Force" }],
  ["cups", { kind: "unit", value: 1, fromUnit: "cup", toUnit: "mL", category: "Volume" }],
  ["5 in to cm", { kind: "unit", value: 5, fromUnit: "in", toUnit: "cm", category: "Length" }],
  ["in to cm", { kind: "unit", value: 1, fromUnit: "in", toUnit: "cm", category: "Length" }],
  ["5 in in cm", { kind: "unit", value: 5, fromUnit: "in", toUnit: "cm", category: "Length" }],
  ["5 cm in in", { kind: "unit", value: 5, fromUnit: "cm", toUnit: "in", category: "Length" }],
  ["12 in in ft", { kind: "unit", value: 12, fromUnit: "in", toUnit: "ft", category: "Length" }],
  ["5 km in mi", { kind: "unit", value: 5, fromUnit: "km", toUnit: "mi", category: "Length" }],
  ["100 kg in lbs", { kind: "unit", value: 100, fromUnit: "kg", toUnit: "lb", category: "Mass" }],
  ["5 lb in oz", { kind: "unit", value: 5, fromUnit: "lb", toUnit: "oz", category: "Mass" }],
  ["5 lb in kg", { kind: "unit", value: 5, fromUnit: "lb", toUnit: "kg", category: "Mass" }],
  ["nm", { kind: "unit", value: 1, fromUnit: "nm", toUnit: "ft", category: "Length" }],
  ["Nm", { kind: "unit", value: 1, fromUnit: "N·m", toUnit: "lbf·ft", category: "Torque" }],
  ["kn", { kind: "unit", value: 1, fromUnit: "kn", toUnit: "km/h", category: "Speed" }],
  ["kN", { kind: "unit", value: 1, fromUnit: "kN", toUnit: "lbf", category: "Force" }],
  ["ps", { kind: "unit", value: 1, fromUnit: "ps", toUnit: "ms", category: "Time" }],
  ["PS", { kind: "unit", value: 1, fromUnit: "PS", toUnit: "kW", category: "Power" }],
  ["lbf·in", { kind: "unit", value: 1, fromUnit: "lbf·in", toUnit: "N·m", category: "Torque" }],
  ["lbf·ft", { kind: "unit", value: 1, fromUnit: "lbf·ft", toUnit: "N·m", category: "Torque" }],
  ["N·m", { kind: "unit", value: 1, fromUnit: "N·m", toUnit: "lbf·ft", category: "Torque" }],
  ["in²", { kind: "unit", value: 1, fromUnit: "in²", toUnit: "ft²", category: "Area" }],
  ["in³", { kind: "unit", value: 1, fromUnit: "in³", toUnit: "cm³", category: "Volume" }],
  ["5 lbs to kg", { kind: "unit", value: 5, fromUnit: "lb", toUnit: "kg", category: "Mass" }],
  ["1 uk gallon to l", { kind: "unit", value: 1, fromUnit: "gal (UK)", toUnit: "L", category: "Volume" }],
  ["5 us to ms", { kind: "unit", value: 5, fromUnit: "µs", toUnit: "ms", category: "Time" }],
  ["50 um to mm", { kind: "unit", value: 50, fromUnit: "µm", toUnit: "mm", category: "Length" }],
  ["100 KBps to Kbps", { kind: "unit", value: 100, fromUnit: "KB/s", toUnit: "Kbps", category: "Data Transfer Rate" }],
  ["100 Bps to bps", { kind: "unit", value: 100, fromUnit: "B/s", toUnit: "bps", category: "Data Transfer Rate" }],
  ["100 mbps to MB/s", { kind: "unit", value: 100, fromUnit: "Mbps", toUnit: "MB/s", category: "Data Transfer Rate" }],
  ["100 kbps to KB/s", { kind: "unit", value: 100, fromUnit: "Kbps", toUnit: "KB/s", category: "Data Transfer Rate" }],
  ["100 bps to B/s", { kind: "unit", value: 100, fromUnit: "bps", toUnit: "B/s", category: "Data Transfer Rate" }],
];

describe('finder: curated queries', () => {
  it.each(CASES)('%s', (query, expected) => {
    expect(parseConversionQuery(query)).toMatchObject({ ok: true, ...expected });
  });
});

describe('finder: all-lowercase input keeps its old meaning where case would change it', () => {
  // Deliberate: typed all in lowercase these are ambiguous, so they keep what they meant before
  // the case-exact notations were added ("Mb/s" = megabits, "mb/s" = megabytes as before).
  it.each([
    ['100 mb/s to mbps', 'MB/s'],
    ['100 kb/s to KB/s', 'KB/s'],
    ['5 mg to g', 'mg'],
    ['100 mbps to MB/s', 'Mbps'],
    ['100 bps to B/s', 'bps'],
  ])('%s', (query, fromUnit) => {
    expect(parseConversionQuery(query)).toMatchObject({ ok: true, fromUnit });
  });
});

const categories = (Object.keys(unitData) as UnitCategory[]).filter((category) => category !== 'SI Prefixes');

describe('finder: every unit and every pair', () => {
  it.each(categories)('every ordered pair of %s symbols parses to exactly that pair', (category) => {
    const units = unitData[category].units;
    const mismatches: string[] = [];
    for (const from of units) {
      for (const to of units) {
        if (from.symbol === to.symbol) continue;
        const result = parseConversionQuery(`5 ${from.symbol} to ${to.symbol}`);
        if (!result.ok || result.kind !== 'unit' || result.fromUnit !== from.symbol || result.toUnit !== to.symbol || result.value !== 5) {
          mismatches.push(`${from.symbol} to ${to.symbol}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it.each(categories)('every ordered pair of %s unit names parses to exactly that pair', (category) => {
    const units = unitData[category].units;
    const mismatches: string[] = [];
    for (const from of units) {
      for (const to of units) {
        if (from.symbol === to.symbol) continue;
        const result = parseConversionQuery(`5 ${from.name.toLowerCase()} to ${to.name.toLowerCase()}`);
        if (!result.ok || result.kind !== 'unit' || result.fromUnit !== from.symbol || result.toUnit !== to.symbol) {
          mismatches.push(`${from.name} to ${to.name}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('every unit symbol on its own parses to that unit', () => {
    // A bare "in" (inch) is the one exception: on its own it reads as the connector word.
    const mismatches: string[] = [];
    for (const category of categories) {
      for (const unit of unitData[category].units) {
        if (unit.symbol === 'in') continue;
        const result = parseConversionQuery(`5 ${unit.symbol}`);
        if (!result.ok || result.kind !== 'unit' || result.fromUnit !== unit.symbol || result.category !== category) {
          mismatches.push(`${category}: ${unit.symbol}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe('shared normalization helpers (used by both the parser and the combobox)', () => {
  it('rewrites case-sensitive notations only in exactly that case', () => {
    expect(rewriteCaseExactNotations('100 Mb/s to MB/s')).toBe('100 Mbps to MB/s');
    expect(rewriteCaseExactNotations('100Kb/s')).toBe('100Kbps');
    expect(rewriteCaseExactNotations('5 Mg to kg')).toBe('5 Mg to kg');
    expect(rewriteCaseExactNotations('500 Cal to kJ')).toBe('500 kcal to kJ');
    expect(rewriteCaseExactNotations('500 cal to kJ')).toBe('500 cal to kJ');
    expect(rewriteCaseExactNotations('1 Gb/s to GB/s')).toBe('1 Gbps to GB/s');
    expect(rewriteCaseExactNotations('7 Bps, 9 KBps')).toBe('7 B/s, 9 KB/s');
    expect(rewriteCaseExactNotations('100 MBps to Mbps')).toBe('100 MB/s to Mbps');
    expect(rewriteCaseExactNotations('100 mb/s to mg')).toBe('100 mb/s to mg');
    expect(rewriteCaseExactNotations('5 Mgal')).toBe('5 Mgal');
  });

  it('turns powers into superscripts but leaves scientific notation alone', () => {
    expect(toSuperscriptPowers('5 m2 to ft^2')).toBe('5 m² to ft²');
    expect(toSuperscriptPowers('12 cm^3 in m3')).toBe('12 cm³ in m³');
    expect(toSuperscriptPowers('1e3 g to kg')).toBe('1e3 g to kg');
    expect(toSuperscriptPowers('2.5e2 kg')).toBe('2.5e2 kg');
  });

  it('does not treat an "in" that belongs to a unit symbol as the connector', () => {
    const words = (text: string) => findConnectorMatches(text).map((match) => match.word);
    expect(words('5 in² to cm²')).toEqual(['to']);
    expect(words('120 lbf·in to N·m')).toEqual(['to']);
    expect(words('120 in-lb to nm')).toEqual(['to']);
    expect(words('1 lb/in³ in g/cm³')).toEqual(['in']);
    expect(stripConnectorWords('in² to cm²').replace(/\s+/g, ' ').trim()).toBe('in² cm²');
  });
});

describe('milli symbols the site does not list', () => {
  // "mJ" and "mPa" in exactly this case are milli units; read as MJ / MPa they'd be 10^9 too large.
  it.each(['5 mJ to J', 'mJ', '5 mPa to Pa', '20 mPa'])('%s is refused with an explanation', (query) => {
    const result = parseConversionQuery(query);
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toMatch(/^m(J|Pa) means milli/);
  });
});

describe('symbols that clash once lowercased', () => {
  it('resolve by exact case', () => {
    expect(getCaseExactUnitMatch('kN')).toEqual({ symbol: 'kN', category: 'Force' });
    expect(getCaseExactUnitMatch('kn')).toEqual({ symbol: 'kn', category: 'Speed' });
    expect(getCaseExactUnitMatch('PS')).toEqual({ symbol: 'PS', category: 'Power' });
    expect(getCaseExactUnitMatch('ps')).toEqual({ symbol: 'ps', category: 'Time' });
    expect(getCaseExactUnitMatch('Nm')).toEqual({ symbol: 'N\u00B7m', category: 'Torque' });
    expect(getCaseExactUnitMatch('nm')).toEqual({ symbol: 'nm', category: 'Length' });
    // Only clashes with the SI prefix "n", which the finder list doesn't rank by case.
    expect(getCaseExactUnitMatch('N')).toBeNull();
    expect(getCaseExactUnitMatch('kg')).toBeNull();
    expect(getCaseExactUnitMatch('mW')).toEqual({ symbol: 'mW', category: 'Power' });
    expect(getCaseExactUnitMatch('MW')).toEqual({ symbol: 'MW', category: 'Power' });
  });

  it('give the finder list the same default reading as the parser', () => {
    expect(resolveUnitText('mpg')).toEqual({ symbol: 'MPG (US)', category: 'Fuel Economy' });
    expect(resolveUnitText('fl oz')).toEqual({ symbol: 'fl oz', category: 'Volume' });
    expect(resolveUnitText('watts')).toEqual({ symbol: 'W', category: 'Power' });
  });
});

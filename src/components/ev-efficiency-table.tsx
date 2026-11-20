'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from 'lucide-react';

import type { VehiclePreset } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { EvUnitSystemToggle } from '@/components/ev-display-controls';
import { useEvDisplayPreferences } from '@/hooks/use-ev-display-preferences';
import { buildConversionPairUrl } from '@/lib/conversion-pairs';
import { formatEvModelName } from '@/lib/ev-models';
import { distanceInSystem, kwhPer100miToPer100km, type EvUnitSystem } from '@/lib/ev-cost-estimator';

interface EvEfficiencyTableProps {
  models: VehiclePreset[];
}

type SortKey = 'model' | 'consumption' | 'mpge' | 'range';

// Fixed locale, so the server HTML and the first client render match.
const formatFixed = (value: number, digits: number): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const roundTo1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Converter page a row opens, prefilled with the model's consumption. The server render (US) links
 * kWh/100mi -> mi/kWh; in metric mode rows open kWh/100km -> km/kWh instead.
 */
const buildRowHref = (vehicle: VehiclePreset, system: EvUnitSystem): string =>
  system === 'metric'
    ? `${buildConversionPairUrl('Fuel Economy', 'kWh/100km', 'km/kWh')}?value=${roundTo1(kwhPer100miToPer100km(vehicle.epaCombinedKwhPer100mi))}`
    : `${buildConversionPairUrl('Fuel Economy', 'kWh/100mi', 'mi/kWh')}?value=${vehicle.epaCombinedKwhPer100mi}`;

const sortValue = (vehicle: VehiclePreset, key: Exclude<SortKey, 'model'>): number => {
  if (key === 'consumption') return vehicle.epaCombinedKwhPer100mi;
  if (key === 'mpge') return vehicle.epaCombinedMpge;
  return vehicle.epaRangeMiles;
};

export function EvEfficiencyTable({ models }: EvEfficiencyTableProps) {
  const { system, setSystem } = useEvDisplayPreferences();
  const [sortKey, setSortKey] = React.useState<SortKey>('consumption');
  const [sortAsc, setSortAsc] = React.useState(true);

  const sortedModels = React.useMemo(() => {
    const copy = [...models];
    copy.sort((a, b) => {
      const result =
        sortKey === 'model'
          ? formatEvModelName(a).localeCompare(formatEvModelName(b), 'en-US')
          : sortValue(a, sortKey) - sortValue(b, sortKey);
      return sortAsc ? result : -result;
    });
    return copy;
  }, [models, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const ariaSort = (key: SortKey): React.AriaAttributes['aria-sort'] =>
    sortKey === key ? (sortAsc ? 'ascending' : 'descending') : undefined;

  const sortHeaderButton = (key: SortKey, label: string) => {
    const SortIcon = sortKey !== key ? ArrowUpDown : sortAsc ? ArrowUp : ArrowDown;
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => toggleSort(key)}
        className="h-auto whitespace-nowrap p-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-transparent hover:text-foreground"
      >
        {label}
        <SortIcon className="ml-1 h-3 w-3" aria-hidden="true" />
      </Button>
    );
  };

  const distanceUnit = system === 'metric' ? 'km' : 'mi';
  // Both consumption columns are always shown; the active system's comes first, so it's visible
  // without scrolling the table sideways on a phone.
  const consumptionColumns: { label: string; format: (vehicle: VehiclePreset) => string }[] = [
    { label: 'kWh/100mi', format: (vehicle) => formatFixed(vehicle.epaCombinedKwhPer100mi, 1) },
    {
      label: 'kWh/100km',
      format: (vehicle) => formatFixed(kwhPer100miToPer100km(vehicle.epaCombinedKwhPer100mi), 1),
    },
  ];
  if (system === 'metric') consumptionColumns.reverse();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <EvUnitSystemToggle value={system} onChange={setSystem} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead aria-sort={ariaSort('model')}>{sortHeaderButton('model', 'Model')}</TableHead>
            {consumptionColumns.map((column) => (
              <TableHead key={column.label} aria-sort={ariaSort('consumption')}>
                {sortHeaderButton('consumption', column.label)}
              </TableHead>
            ))}
            <TableHead aria-sort={ariaSort('mpge')}>{sortHeaderButton('mpge', 'MPGe')}</TableHead>
            <TableHead aria-sort={ariaSort('range')}>{sortHeaderButton('range', `EPA range (${distanceUnit})`)}</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedModels.map((vehicle) => (
            // The model link stretches over the whole row (after:inset-0), so any cell opens it;
            // the source link sits above that overlay (relative z-10).
            <TableRow key={vehicle.id} className="relative">
              <TableCell className="min-w-[12rem] font-medium text-foreground">
                <Link
                  href={buildRowHref(vehicle, system)}
                  className="after:absolute after:inset-0 hover:text-primary-text focus-visible:outline-none focus-visible:after:rounded-sm focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                >
                  <span className="text-muted-foreground">{vehicle.modelYear}</span> {vehicle.make} {vehicle.model}
                  {vehicle.trim ? <span className="text-muted-foreground"> {vehicle.trim}</span> : null}
                </Link>
              </TableCell>
              {consumptionColumns.map((column) => (
                <TableCell key={column.label} className="text-muted-foreground">
                  {column.format(vehicle)}
                </TableCell>
              ))}
              <TableCell className="text-muted-foreground">{vehicle.epaCombinedMpge}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {Math.round(distanceInSystem(vehicle.epaRangeMiles, system)).toLocaleString('en-US')} {distanceUnit}
              </TableCell>
              <TableCell>
                <a
                  href={vehicle.sourceUrl}
                  target="_blank"
                  rel="noopener"
                  title="EPA listing on fueleconomy.gov"
                  className="relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/5 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">
                    {vehicle.modelYear} {formatEvModelName(vehicle)} on fueleconomy.gov (opens in a new tab)
                  </span>
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

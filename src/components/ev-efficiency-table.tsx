'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';

import type { VehiclePreset } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { buildConversionPairUrl } from '@/lib/conversion-pairs';

interface EvEfficiencyTableProps {
  models: VehiclePreset[];
}

type SortKey = 'model' | 'epaCombinedKwhPer100mi' | 'epaCombinedMpge';

export function EvEfficiencyTable({ models }: EvEfficiencyTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = React.useState<SortKey>('epaCombinedKwhPer100mi');
  const [sortAsc, setSortAsc] = React.useState(true);

  const sortedModels = React.useMemo(() => {
    const copy = [...models];
    copy.sort((a, b) => {
      let result: number;
      if (sortKey === 'model') {
        result = `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
      } else {
        const aValue = a[sortKey] ?? 0;
        const bValue = b[sortKey] ?? 0;
        result = aValue - bValue;
      }
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

  const sortHeaderButton = (key: SortKey, label: string) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => toggleSort(key)}
      className="h-auto p-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" aria-hidden="true" />
    </Button>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{sortHeaderButton('model', 'Model')}</TableHead>
          <TableHead>{sortHeaderButton('epaCombinedKwhPer100mi', 'kWh/100mi')}</TableHead>
          <TableHead>{sortHeaderButton('epaCombinedMpge', 'MPGe')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedModels.map((vehicle) => (
          <TableRow
            key={vehicle.id}
            className="cursor-pointer"
            onClick={() =>
              router.push(
                `${buildConversionPairUrl('Fuel Economy', 'kWh/100mi', 'mi/kWh')}?value=${vehicle.epaCombinedKwhPer100mi}`,
              )
            }
          >
            <TableCell className="font-medium text-foreground">
              {vehicle.make} {vehicle.model}
              {vehicle.trim ? <span className="text-muted-foreground"> {vehicle.trim}</span> : null}
            </TableCell>
            <TableCell className="text-muted-foreground">{vehicle.epaCombinedKwhPer100mi.toLocaleString()}</TableCell>
            <TableCell className="text-muted-foreground">{vehicle.epaCombinedMpge?.toLocaleString() ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { UnitConverter, type UnitConverterHandle } from '@/components/unit-converter';
import { FxHistoryChart } from '@/components/fx-history-chart';
import type { UnitCategory } from '@/types';

type CurrencyCategoryContentProps = {
  category: UnitCategory;
  initialFromUnit: string;
  initialToUnit: string;
  categoryTitle: string;
};

export function CurrencyCategoryContent({
  category,
  initialFromUnit,
  initialToUnit,
  categoryTitle,
}: CurrencyCategoryContentProps) {
  const [selectedFrom, setSelectedFrom] = React.useState(initialFromUnit);
  const [selectedTo, setSelectedTo] = React.useState(initialToUnit);
  const [highlightDate, setHighlightDate] = React.useState<Date | null>(null);
  const converterRef = React.useRef<UnitConverterHandle>(null);

  const handleUnitsChange = React.useCallback(
    (from: string, to: string) => {
      setSelectedFrom(from);
      setSelectedTo(to);
    },
    []
  );

  const handleDateSelect = React.useCallback((date: Date) => {
    setHighlightDate(date);
    converterRef.current?.setHistoricalDate(date);
  }, []);

  return (
    <>
      <section
        id="category-locked-converter"
        className="space-y-4 rounded-3xl border border-border/60 bg-card px-4 py-5 shadow-sm sm:px-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Convert {categoryTitle.toLowerCase()} instantly</h2>
            <p className="text-sm text-muted-foreground">
              This converter is focused on {categoryTitle.toLowerCase()} only. Pick any units in this category and get results immediately.
            </p>
          </div>
          <Link href="/#converter" className="text-sm font-semibold text-primary transition hover:text-primary/80">
            Open full converter
          </Link>
        </div>
        <UnitConverter
          ref={converterRef}
          lockedCategory={category}
          initialCategory={category}
          initialFromUnit={initialFromUnit}
          initialToUnit={initialToUnit}
          initialValue={1}
          hideFinder
          enableQuickstartTour={false}
          onUnitsChange={handleUnitsChange}
        />
      </section>

      <section className="-mx-6 scroll-mt-20 lg:mx-0">
        <div className="space-y-4 rounded-3xl border border-border/60 bg-card px-4 py-5 shadow-sm sm:px-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Historical exchange rates</h2>
            <p className="text-sm text-muted-foreground">
              Track how {selectedFrom} to {selectedTo} rates have changed over time. Click on any point to select a historical date.
            </p>
          </div>
          <FxHistoryChart
            from={selectedFrom}
            to={selectedTo}
            className="mt-4"
            highlightDate={highlightDate}
            onDateSelect={handleDateSelect}
          />
        </div>
      </section>
    </>
  );
}

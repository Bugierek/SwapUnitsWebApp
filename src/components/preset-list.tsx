import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getFilteredAndSortedPresets } from "@/lib/unit-data"; // Keep import to get presets data
import { type Preset } from '@/types';
import { List } from 'lucide-react';
import { UnitIcon } from './unit-icon';
import { cn } from "@/lib/utils";

interface PresetListProps {
    onPresetSelect: (preset: Preset) => void;
}

export const PresetList = React.memo(function PresetListComponent({ onPresetSelect }: PresetListProps) {
    // Get presets directly, sorting/filtering logic is in the utility function
    const displayPresets = getFilteredAndSortedPresets();

    return (
        <Card className={cn("shadow-lg hidden md:block")} aria-label="Common Unit Conversion Presets">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
                    <List className="h-5 w-5" aria-hidden="true" />
                    Common Conversions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {displayPresets.map((preset, index) => (
                        <li key={`${preset.category}-${preset.name}-${index}`}>
                          <Button
                              variant="ghost"
                              className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-primary hover:text-primary-foreground overflow-hidden whitespace-normal flex items-center gap-2 text-sm" // Added text-sm
                              onClick={() => onPresetSelect(preset)} // Use prop directly
                              aria-label={`Select preset: ${preset.name}`}
                          >
                              <UnitIcon category={preset.category} className="h-4 w-4 shrink-0" aria-hidden="true" />
                              <span className="flex-1">{preset.name}</span>
                          </Button>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
});

PresetList.displayName = 'PresetList';
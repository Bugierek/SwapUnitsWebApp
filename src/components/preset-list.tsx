
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { presets as allPresets } from "@/lib/unit-data"; // Renamed import
import { type Preset, type UnitCategory } from '@/types'; // Import UnitCategory type
import { List } from 'lucide-react';
import { UnitIcon } from './unit-icon'; // Import the UnitIcon component
import { cn } from "@/lib/utils"; // Import cn

interface PresetListProps {
    onPresetSelect: (preset: Preset) => void;
}

// Function to filter and limit presets
const getFilteredPresets = (): Preset[] => {
    const presetsByCategory: Record<string, Preset[]> = {};
    allPresets.forEach(preset => {
        if (!presetsByCategory[preset.category]) {
            presetsByCategory[preset.category] = [];
        }
        if (presetsByCategory[preset.category].length < 2) {
            presetsByCategory[preset.category].push(preset);
        }
    });

    // Flatten the grouped presets and limit to 15
    const filtered = Object.values(presetsByCategory).flat();
    return filtered.slice(0, 15);
};

// Memoize the component to prevent unnecessary re-renders
export const PresetList = React.memo(function PresetListComponent({ onPresetSelect }: PresetListProps) {
    // Get the filtered list of presets
    const displayPresets = React.useMemo(() => getFilteredPresets(), []);

    return (
        // Add aria-label for better context
        // Add hidden md:block to hide on mobile and show on medium screens and up
        <Card className={cn("shadow-lg hidden md:block")} aria-label="Common Unit Conversion Presets">
            <CardHeader>
                {/* Use H2 for secondary headings on the page */}
                <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
                    <List className="h-5 w-5" aria-hidden="true" />
                    Common Conversions {/* Changed text */}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Removed ScrollArea and fixed height */}
                {/* Use a list for semantic structure */}
                <ul className="space-y-2">
                    {/* Map over the filtered and limited presets */}
                    {displayPresets.map((preset, index) => (
                        <li key={index}> {/* Wrap button in li */}
                          <Button
                              variant="ghost"
                              // Added overflow-hidden and whitespace-normal, flex, items-center, gap-2
                              className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-primary hover:text-primary-foreground overflow-hidden whitespace-normal flex items-center gap-2"
                              onClick={() => onPresetSelect(preset)}
                              aria-label={`Select preset: ${preset.name}`} // More descriptive label
                          >
                              {/* Add UnitIcon before the preset name */}
                              <UnitIcon category={preset.category} className="h-4 w-4 shrink-0" aria-hidden="true" />
                              <span className="flex-1">{preset.name}</span> {/* Wrap name in span for flex control */}
                          </Button>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
});

PresetList.displayName = 'PresetList';

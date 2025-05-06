
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { presets as allPresets, unitData } from "@/lib/unit-data"; // Import unitData as well
import { type Preset, type UnitCategory } from '@/types'; // Import UnitCategory type
import { List } from 'lucide-react';
import { UnitIcon } from './unit-icon'; // Import the UnitIcon component
import { cn } from "@/lib/utils"; // Import cn

interface PresetListProps {
    onPresetSelect: (preset: Preset) => void;
}

// Function to filter and limit presets: Ensure at least one per category, max 2 per category, max 15 total.
const getFilteredPresets = (): Preset[] => {
    const categories = Object.keys(unitData) as UnitCategory[];
    const finalPresets: Preset[] = [];
    const categoryCounts: Record<string, number> = {}; // Tracks count per category added to finalPresets

    // --- Pass 1: Ensure at least one preset per category (if available in allPresets) ---
    categories.forEach(category => {
        // Find the first preset available for this category
        const presetForCategory = allPresets.find(p => p.category === category);
        if (presetForCategory && finalPresets.length < 15) {
            // Check if this specific preset instance is already added (handles duplicates in allPresets if any)
             const isAlreadyAdded = finalPresets.some(fp =>
                fp.name === presetForCategory.name && fp.category === presetForCategory.category
             );
             if (!isAlreadyAdded) {
                finalPresets.push(presetForCategory);
                categoryCounts[category] = 1; // Mark one added for this category
             }
        }
    });

    // --- Pass 2: Add a second preset per category if available and limit not reached ---
    allPresets.forEach(preset => {
        if (finalPresets.length >= 15) return; // Stop if limit reached

        const currentCount = categoryCounts[preset.category] || 0;

        // Check if this preset is already added in finalPresets
        const isAlreadyAdded = finalPresets.some(fp =>
           fp.name === preset.name && fp.category === preset.category
        );


        // If not already added and we have less than 2 for this category
        if (!isAlreadyAdded && currentCount < 2) {
            finalPresets.push(preset);
            categoryCounts[preset.category] = currentCount + 1; // Increment count
        }
    });

    // Final slice to ensure the 15 limit is strictly enforced
    return finalPresets.slice(0, 15);
};


// Memoize the component to prevent unnecessary re-renders
export const PresetList = React.memo(function PresetListComponent({ onPresetSelect }: PresetListProps) {
    // Get the filtered list of presets using the updated logic
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
                        <li key={`${preset.category}-${preset.name}-${index}`}> {/* More unique key */}
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

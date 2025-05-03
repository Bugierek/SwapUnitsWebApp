
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { presets } from "@/lib/unit-data";
import { type Preset } from '@/types';
import { List } from 'lucide-react';

interface PresetListProps {
    onPresetSelect: (preset: Preset) => void;
}

// Memoize the component to prevent unnecessary re-renders
export const PresetList = React.memo(function PresetListComponent({ onPresetSelect }: PresetListProps) {
    return (
        // Add aria-label for better context
        <Card className="shadow-lg" aria-label="Common Unit Conversion Presets">
            <CardHeader>
                {/* Use H2 for secondary headings on the page */}
                <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
                    <List className="h-5 w-5" aria-hidden="true" />
                    Common Presets
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Removed ScrollArea and fixed height */}
                {/* Use a list for semantic structure */}
                <ul className="space-y-2">
                    {presets.map((preset, index) => (
                        <li key={index}> {/* Wrap button in li */}
                          <Button
                              variant="ghost"
                              className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-primary hover:text-primary-foreground" // Changed hover background to primary and text to primary-foreground
                              onClick={() => onPresetSelect(preset)}
                              aria-label={`Select preset: ${preset.name}`} // More descriptive label
                          >
                              {preset.name}
                          </Button>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
});

PresetList.displayName = 'PresetList';

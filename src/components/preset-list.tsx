import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { presets } from "@/lib/unit-data";
import { type Preset } from '@/types';
import { List } from 'lucide-react';

interface PresetListProps {
    onPresetSelect: (preset: Preset) => void;
}

export function PresetList({ onPresetSelect }: PresetListProps) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Common Presets
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Removed ScrollArea and fixed height */}
                <div className="space-y-2">
                    {presets.map((preset, index) => (
                        <Button
                            key={index}
                            variant="ghost"
                            className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-accent/10"
                            onClick={() => onPresetSelect(preset)}
                        >
                            {preset.name}
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

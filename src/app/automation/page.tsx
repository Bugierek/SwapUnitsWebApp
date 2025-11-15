"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categoryDisplayOrder } from '@/lib/unit-data';
import { Plus, Trash2 } from 'lucide-react';

type UnitForm = {
  id: string;
  name: string;
  symbol: string;
  factorExpression: string;
  unitType: string;
};

type PresetForm = {
  id: string;
  fromUnit: string;
  toUnit: string;
  name: string;
};

type SynonymForm = {
  id: string;
  symbol: string;
  values: string;
};

type TargetForm = {
  id: string;
  symbol: string;
  targets: string;
};

type ConversionSourceForm = {
  id: string;
  constantName: string;
  units: string;
};

type ReferenceForm = {
  id: string;
  description: string;
  url: string;
};

type AutomationResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

type AutomationConfig = {
  category: string;
  units: Array<{
    name: string;
    symbol: string;
    factorExpression: string;
    unitType?: string;
  }>;
  presets?: Array<{
    category: string;
    fromUnit: string;
    toUnit: string;
    name: string;
  }>;
  keywordAdditions?: string[];
  synonyms?: Record<string, string[]>;
  unitTargets?: Record<string, string[]>;
  tooltipExamples?: string[];
  conversionSourceUpdates?: Array<{
    constantName: string;
    units: string[];
  }>;
  references?: Array<{
    description: string;
    url: string;
  }>;
};

const createId = () => Math.random().toString(36).slice(2);

const emptyUnit = (): UnitForm => ({
  id: createId(),
  name: '',
  symbol: '',
  factorExpression: '',
  unitType: '',
});

const emptyPreset = (): PresetForm => ({
  id: createId(),
  fromUnit: '',
  toUnit: '',
  name: '',
});

const emptySynonym = (): SynonymForm => ({
  id: createId(),
  symbol: '',
  values: '',
});

const emptyTarget = (): TargetForm => ({
  id: createId(),
  symbol: '',
  targets: '',
});

const emptyConversionSource = (): ConversionSourceForm => ({
  id: createId(),
  constantName: '',
  units: '',
});

const emptyReference = (): ReferenceForm => ({
  id: createId(),
  description: '',
  url: '',
});

const splitList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

export default function AutomationPage() {
  const [category, setCategory] = React.useState('');
  const [units, setUnits] = React.useState<UnitForm[]>([emptyUnit()]);
  const [presets, setPresets] = React.useState<PresetForm[]>([]);
  const [keywords, setKeywords] = React.useState('');
  const [tooltipExamples, setTooltipExamples] = React.useState('');
  const [synonyms, setSynonyms] = React.useState<SynonymForm[]>([]);
  const [unitTargets, setUnitTargets] = React.useState<TargetForm[]>([]);
  const [conversionSources, setConversionSources] = React.useState<ConversionSourceForm[]>([]);
  const [references, setReferences] = React.useState<ReferenceForm[]>([emptyReference()]);
  const [confirmReferences, setConfirmReferences] = React.useState(false);
  const [result, setResult] = React.useState<AutomationResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const existingCategoryValue = React.useMemo(() => {
    const trimmed = category.trim();
    return categoryDisplayOrder.includes(
      trimmed as (typeof categoryDisplayOrder)[number],
    )
      ? trimmed
      : '';
  }, [category]);

  const config = React.useMemo<AutomationConfig>(() => {
    const payload: AutomationConfig = {
      category: category.trim(),
      units: units
        .filter(
          (unit) =>
            unit.name.trim() && unit.symbol.trim() && unit.factorExpression.trim(),
        )
        .map((unit) => ({
          name: unit.name.trim(),
          symbol: unit.symbol.trim(),
          factorExpression: unit.factorExpression.trim(),
          ...(unit.unitType.trim() ? { unitType: unit.unitType.trim() } : {}),
        })),
    };

    const presetPayload = presets
      .filter((preset) => preset.fromUnit.trim() && preset.toUnit.trim())
      .map((preset) => ({
        category: category.trim(),
        fromUnit: preset.fromUnit.trim(),
        toUnit: preset.toUnit.trim(),
        name: preset.name.trim() || `${preset.fromUnit.trim()} to ${preset.toUnit.trim()}`,
      }));
    if (presetPayload.length) {
      payload.presets = presetPayload;
    }

    const keywordList = splitList(keywords);
    if (keywordList.length) {
      payload.keywordAdditions = keywordList;
    }

    const synonymsMap = synonyms.reduce<Record<string, string[]>>((acc, entry) => {
      const values = splitList(entry.values);
      if (entry.symbol.trim() && values.length) {
        acc[entry.symbol.trim()] = values;
      }
      return acc;
    }, {});
    if (Object.keys(synonymsMap).length) {
      payload.synonyms = synonymsMap;
    }

    const targetMap = unitTargets.reduce<Record<string, string[]>>((acc, entry) => {
      const targets = splitList(entry.targets);
      if (entry.symbol.trim() && targets.length) {
        acc[entry.symbol.trim()] = targets;
      }
      return acc;
    }, {});
    if (Object.keys(targetMap).length) {
      payload.unitTargets = targetMap;
    }

    const tooltipList = splitList(tooltipExamples);
    if (tooltipList.length) {
      payload.tooltipExamples = tooltipList;
    }

    const sourcePayload = conversionSources
      .filter((source) => source.constantName.trim())
      .map((source) => ({
        constantName: source.constantName.trim(),
        units: splitList(source.units),
      }))
      .filter((entry) => entry.units.length);
    if (sourcePayload.length) {
      payload.conversionSourceUpdates = sourcePayload;
    }

    const referencePayload = references
      .map((ref) => ({
        description: ref.description.trim(),
        url: ref.url.trim(),
      }))
      .filter((ref) => ref.description || ref.url);
    if (referencePayload.length) {
      payload.references = referencePayload;
    }

    return payload;
  }, [
    category,
    units,
    presets,
    keywords,
    tooltipExamples,
    synonyms,
    unitTargets,
    conversionSources,
    references,
  ]);

  const configValid =
    Boolean(config.category) && Array.isArray(config.units) && config.units.length > 0;
  const configPreview = React.useMemo(
    () => JSON.stringify(config, null, 2),
    [config],
  );

  const handleUnitChange = (id: string, field: keyof UnitForm, value: string) => {
    setUnits((prev) =>
      prev.map((unit) => (unit.id === id ? { ...unit, [field]: value } : unit)),
    );
  };

  const handlePresetChange = (
    id: string,
    field: keyof PresetForm,
    value: string,
  ) => {
    setPresets((prev) =>
      prev.map((preset) =>
        preset.id === id ? { ...preset, [field]: value } : preset,
      ),
    );
  };

  const handleSynonymChange = (
    id: string,
    field: keyof SynonymForm,
    value: string,
  ) => {
    setSynonyms((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const handleTargetChange = (
    id: string,
    field: keyof TargetForm,
    value: string,
  ) => {
    setUnitTargets((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const handleSourceChange = (
    id: string,
    field: keyof ConversionSourceForm,
    value: string,
  ) => {
    setConversionSources((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const handleReferenceChange = (
    id: string,
    field: keyof ReferenceForm,
    value: string,
  ) => {
    setReferences((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const removeEntry = <T extends { id: string }>(
    list: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: string,
  ) => {
    setter(list.length > 1 ? list.filter((entry) => entry.id !== id) : list);
  };

  const runAutomation = async () => {
    if (!configValid || !confirmReferences) {
      return;
    }
    setIsRunning(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch('/api/automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config, skipConfirm: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Automation script failed.');
      }
      setResult({
        stdout: data.stdout ?? '',
        stderr: data.stderr ?? '',
        exitCode: data.exitCode ?? 0,
      });
    } catch (automationError) {
      setError(
        automationError instanceof Error
          ? automationError.message
          : 'Unknown automation error.',
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Automation Console</h1>
        <p className="text-sm text-muted-foreground">
          Build a configuration for <code>scripts/automation/add-conversion-pair.mjs</code>,
          review the reference checklist, and run the script directly from the browser.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid gap-2 md:grid-cols-[minmax(0,320px)_1fr]">
              <Select
                value={existingCategoryValue}
                onValueChange={(value) => setCategory(value)}
              >
                <SelectTrigger className="h-11 rounded-xl border border-border/60 bg-background text-left">
                  <SelectValue placeholder="Select existing category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryDisplayOrder.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="category"
                placeholder="Or type a new category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use the dropdown to avoid typos for existing categories, or type a new one if needed.
            </p>
          </div>

          <section className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Units</h3>
              <p className="text-sm text-muted-foreground">
                Provide the unit name, symbol, and factor expression in base units.
              </p>
            </div>
            <div className="space-y-4">
              {units.map((unit, index) => (
                <div
                  key={unit.id}
                  className="rounded-2xl border border-border/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-muted-foreground">
                      Unit {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={units.length === 1}
                      onClick={() => removeEntry(units, setUnits, unit.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input
                        value={unit.name}
                        onChange={(event) =>
                          handleUnitChange(unit.id, 'name', event.target.value)
                        }
                        placeholder="Kilometer per Liter"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Symbol</Label>
                      <Input
                        value={unit.symbol}
                        onChange={(event) =>
                          handleUnitChange(unit.id, 'symbol', event.target.value)
                        }
                        placeholder="km/L"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Factor Expression</Label>
                      <Input
                        value={unit.factorExpression}
                        onChange={(event) =>
                          handleUnitChange(
                            unit.id,
                            'factorExpression',
                            event.target.value,
                          )
                        }
                        placeholder="e.g., 7 * 24 * 60 * 60"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Unit Type (optional)</Label>
                      <Input
                        value={unit.unitType}
                        onChange={(event) =>
                          handleUnitChange(unit.id, 'unitType', event.target.value)
                        }
                        placeholder="direct_efficiency, inverse_consumption, etc."
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setUnits((prev) => [...prev, emptyUnit()])}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Unit
              </Button>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Presets</h3>
                <p className="text-sm text-muted-foreground">
                  Optional preset tiles to highlight the new pair.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPresets((prev) => [...prev, emptyPreset()])}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Preset
              </Button>
            </div>
            <div className="space-y-4">
              {presets.length === 0 && (
                <p className="text-sm text-muted-foreground">No presets added.</p>
              )}
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="grid gap-3 rounded-2xl border border-border/60 p-4 sm:grid-cols-3"
                >
                  <div className="space-y-1">
                    <Label>From Unit</Label>
                    <Input
                      value={preset.fromUnit}
                      onChange={(event) =>
                        handlePresetChange(preset.id, 'fromUnit', event.target.value)
                      }
                      placeholder="Wh/km"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>To Unit</Label>
                    <Input
                      value={preset.toUnit}
                      onChange={(event) =>
                        handlePresetChange(preset.id, 'toUnit', event.target.value)
                      }
                      placeholder="Wh/mi"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input
                      value={preset.name}
                      onChange={(event) =>
                        handlePresetChange(preset.id, 'name', event.target.value)
                      }
                      placeholder="Preset label"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(presets, setPresets, preset.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove preset
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="keywords">Keyword Additions</Label>
              <Textarea
                id="keywords"
                placeholder="Comma or newline separated keywords"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Example: <code>watt-hour</code>, <code>watt hour</code>, <code>wh per km</code>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tooltipExamples">Finder Examples</Label>
              <Textarea
                id="tooltipExamples"
                placeholder="e.g., 250 Wh/km to Wh/mi"
                value={tooltipExamples}
                onChange={(event) => setTooltipExamples(event.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple examples with commas or new lines.
              </p>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Synonyms</h3>
                <p className="text-sm text-muted-foreground">
                  Map unit symbols to comma/newline separated alias lists.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSynonyms((prev) => [...prev, emptySynonym()])}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Synonym
              </Button>
            </div>
            <div className="space-y-4">
              {synonyms.length === 0 && (
                <p className="text-sm text-muted-foreground">No synonyms added.</p>
              )}
              {synonyms.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-3 rounded-2xl border border-border/60 p-4 md:grid-cols-[220px_1fr]"
                >
                  <div className="space-y-1">
                    <Label>Symbol</Label>
                    <Input
                      value={entry.symbol}
                      onChange={(event) =>
                        handleSynonymChange(entry.id, 'symbol', event.target.value)
                      }
                      placeholder="Wh/km"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Synonyms</Label>
                    <Textarea
                      value={entry.values}
                      onChange={(event) =>
                        handleSynonymChange(entry.id, 'values', event.target.value)
                      }
                      rows={3}
                      placeholder="watt hour per kilometer, watt-hour per km..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(synonyms, setSynonyms, entry.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove entry
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Unit Targets</h3>
                <p className="text-sm text-muted-foreground">
                  Define the fallback target when a user types only one unit.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setUnitTargets((prev) => [...prev, emptyTarget()])}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Target
              </Button>
            </div>
            <div className="space-y-4">
              {unitTargets.length === 0 && (
                <p className="text-sm text-muted-foreground">No targets defined.</p>
              )}
              {unitTargets.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-3 rounded-2xl border border-border/60 p-4 md:grid-cols-[220px_1fr]"
                >
                  <div className="space-y-1">
                    <Label>Symbol</Label>
                    <Input
                      value={entry.symbol}
                      onChange={(event) =>
                        handleTargetChange(entry.id, 'symbol', event.target.value)
                      }
                      placeholder="Wh/km"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Target Units</Label>
                    <Textarea
                      value={entry.targets}
                      onChange={(event) =>
                        handleTargetChange(entry.id, 'targets', event.target.value)
                      }
                      rows={3}
                      placeholder="Wh/mi, mi/kWh"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(unitTargets, setUnitTargets, entry.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove entry
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Conversion Sources</h3>
                <p className="text-sm text-muted-foreground">
                  Assign units to existing reference constants in <code>conversion-sources.ts</code>.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setConversionSources((prev) => [...prev, emptyConversionSource()])
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add Source
              </Button>
            </div>
            <div className="space-y-4">
              {conversionSources.length === 0 && (
                <p className="text-sm text-muted-foreground">No sources added.</p>
              )}
              {conversionSources.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-border/60 p-4 space-y-3"
                >
                  <div className="space-y-1">
                    <Label>Constant Name</Label>
                    <Input
                      value={entry.constantName}
                      onChange={(event) =>
                        handleSourceChange(entry.id, 'constantName', event.target.value)
                      }
                      placeholder="DOE_AFDC_FUEL_PROPERTIES"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Units</Label>
                    <Textarea
                      value={entry.units}
                      onChange={(event) =>
                        handleSourceChange(entry.id, 'units', event.target.value)
                      }
                      rows={3}
                      placeholder="Wh/km, Wh/mi"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      removeEntry(conversionSources, setConversionSources, entry.id)
                    }
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remove source
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">References</h3>
                <p className="text-sm text-muted-foreground">
                  List every authoritative source backing the new units.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReferences((prev) => [...prev, emptyReference()])}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Reference
              </Button>
            </div>
            <div className="space-y-4">
              {references.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-border/60 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
                    <span>Reference {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={references.length === 1}
                      onClick={() =>
                        removeEntry(references, setReferences, entry.id)
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input
                      value={entry.description}
                      onChange={(event) =>
                        handleReferenceChange(entry.id, 'description', event.target.value)
                      }
                      placeholder="DOE AFDC – Fuel Properties Comparison"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>URL</Label>
                    <Input
                      value={entry.url}
                      onChange={(event) =>
                        handleReferenceChange(entry.id, 'url', event.target.value)
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review & Run</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Configuration Preview</Label>
              <ScrollArea className="h-64 rounded-2xl border border-border/60 bg-muted/40 p-3 text-xs">
                <pre className="whitespace-pre-wrap">{configPreview}</pre>
              </ScrollArea>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reference Confirmation</Label>
                <div className="flex items-start gap-3 rounded-2xl border border-border/60 p-4">
                  <Checkbox
                    id="confirm-references"
                    checked={confirmReferences}
                    onCheckedChange={(checked) => setConfirmReferences(Boolean(checked))}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      I have verified the sources listed above.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Required before running the automation script.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={!configValid || !confirmReferences || isRunning}
                onClick={runAutomation}
              >
                {isRunning ? 'Running…' : 'Run Automation Script'}
              </Button>
              {!configValid && (
                <p className="text-sm text-destructive">
                  Provide a category and at least one fully defined unit before running.
                </p>
              )}
            </div>
          </div>
          {error && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result ? (
            <>
              <p className="text-sm text-muted-foreground">
                Exit code: <span className="font-semibold text-foreground">{result.exitCode}</span>
              </p>
              <div className="space-y-2">
                <Label>Stdout</Label>
                <ScrollArea className="h-48 rounded-2xl border border-border/60 bg-muted/40 p-3 text-xs">
                  <pre className="whitespace-pre-wrap">{result.stdout || '—'}</pre>
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <Label>Stderr</Label>
                <ScrollArea className="h-48 rounded-2xl border border-border/60 bg-muted/40 p-3 text-xs">
                  <pre className="whitespace-pre-wrap">{result.stderr || '—'}</pre>
                </ScrollArea>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Run the automation script to see stdout/stderr output here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

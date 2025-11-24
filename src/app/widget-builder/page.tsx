"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { unitData, categoryDisplayOrder, getFilteredAndSortedPresets } from "@/lib/unit-data";
import type { UnitCategory } from "@/types";
import { SiteTopbar } from "@/components/site-topbar";
import { Footer } from "@/components/footer";
import { useConversionHistory } from "@/hooks/use-conversion-history";
import { useFavorites } from "@/hooks/use-favorites";
import { buildConversionPairUrl } from "@/lib/conversion-pairs";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Copy } from "lucide-react";
import { UnitIcon } from "@/components/unit-icon";

export default function WidgetBuilderPage() {
  const router = useRouter();
  const { history, clearHistory, isLoading: isLoadingHistory } = useConversionHistory();
  const { favorites, removeFavorite, clearAllFavorites, isLoadingFavorites } = useFavorites();

  const topbarPresets = React.useMemo(
    () => getFilteredAndSortedPresets(favorites).slice(0, 10),
    [favorites],
  );

  const navigateToPair = React.useCallback(
    (category: UnitCategory, from: string, to: string, value?: number | string | null) => {
      const base = buildConversionPairUrl(category, from, to);
      const qs = value !== undefined && value !== null ? `?value=${encodeURIComponent(String(value))}` : "";
      router.push(`${base}${qs}`);
    },
    [router],
  );

  const handleHistorySelect = React.useCallback(
    (item: any) => {
      if (item.meta?.kind === "si-prefix") {
        const params = new URLSearchParams({
          from: item.meta.fromPrefixSymbol,
          to: item.meta.toPrefixSymbol,
          value: item.meta.inputText ?? String(item.fromValue),
        });
        router.push(`${item.meta.route}?${params.toString()}`);
        return;
      }
      navigateToPair(item.category as UnitCategory, item.fromUnit, item.toUnit, item.fromValue);
    },
    [navigateToPair, router],
  );

  const handleFavoriteSelect = React.useCallback(
    (fav: any) => {
      navigateToPair(fav.category, fav.fromUnit, fav.toUnit, 1);
    },
    [navigateToPair],
  );

  const handlePresetSelect = React.useCallback(
    (preset: any) => {
      navigateToPair(preset.category, preset.fromUnit, preset.toUnit, 1);
    },
    [navigateToPair],
  );

  const builderCategories = React.useMemo(() => categoryDisplayOrder, []);

  const categoryIcons: Partial<Record<UnitCategory, React.ReactNode>> = {};
  const [selectedCategories, setSelectedCategories] = React.useState<Record<UnitCategory, boolean>>(() => {
    const initial = {} as Record<UnitCategory, boolean>;
    builderCategories.forEach((cat) => {
      initial[cat as UnitCategory] = true;
    });
    return initial;
  });

  const [selectedUnits, setSelectedUnits] = React.useState<Record<string, boolean>>(() => {
    // Keyed as `${category}:${symbol}`; empty means "include all units" for that category.
    return {};
  });
  const [width, setWidth] = React.useState("100%");
  const [height, setHeight] = React.useState("550px");

  const toggleCategory = (cat: UnitCategory) => {
    setSelectedCategories((prev) => {
      const selectedCount = Object.values(prev).filter(Boolean).length;
      // Keep at least one category selected
      if (prev[cat] && selectedCount <= 1) {
        return prev;
      }
      return { ...prev, [cat]: !prev[cat] };
    });
  };

  const toggleUnit = (cat: UnitCategory, unitSymbol: string) => {
    const key = `${cat}:${unitSymbol}`;
    setSelectedUnits((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const chosenCategories = builderCategories.filter((cat) => selectedCategories[cat as UnitCategory]);
  const effectiveUnits = React.useMemo(() => {
    const finalUnits: string[] = [];
    chosenCategories.forEach((cat) => {
      const availableUnits = unitData[cat as UnitCategory].units;
      const checked = availableUnits.filter((u) => selectedUnits[`${cat}:${u.symbol}`]);
      if (checked.length > 0) {
        finalUnits.push(...checked.map((u) => `${cat}:${u.symbol}`));
      }
      // If none are checked for this category, we send nothing; widget will include all units for that category by default.
    });
    return finalUnits;
  }, [chosenCategories, selectedUnits]);

  const query = React.useMemo(() => {
    const params = new URLSearchParams();
    if (chosenCategories.length) params.set("categories", chosenCategories.join(","));
    if (effectiveUnits.length) params.set("units", effectiveUnits.join(","));
    if (width.trim()) params.set("width", width.trim());
    if (height.trim()) params.set("height", height.trim());
    return params.toString();
  }, [chosenCategories, effectiveUnits]);

  const embedBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://swapunits.com').replace(/\/$/, '');
  const iframeSrc = `${embedBaseUrl}/widget?${query}`;

  const normalizeDimension = (val: string) => {
    if (!val) return undefined;
    return val.trim();
  };

  const normalizedWidth = normalizeDimension(width) ?? "100%";
  const normalizedHeight = normalizeDimension(height) ?? "550px";
  const heightPx = Number.parseFloat(normalizedHeight);
  const previewMinHeight = Math.max(heightPx && heightPx > 0 ? heightPx : 0, 550);
  const previewContainerMinHeight = previewMinHeight + 96; // extra room for padding/borders
  const heightStyle = /[a-zA-Z%]/.test(normalizedHeight) ? normalizedHeight : undefined;

  const [copyState, setCopyState] = React.useState<"idle" | "success">("idle");

  const iframeCode = `<iframe src="${iframeSrc}" width="${normalizedWidth}" height="${normalizedHeight}" style="border:0; border-radius:16px;" loading="lazy" title="SwapUnits widget"></iframe>`;
  const [previewSrc, setPreviewSrc] = React.useState<string>(() => `/widget?${query}`);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setPreviewSrc(`${window.location.origin}/widget?${query}`);
    } else {
      setPreviewSrc(`/widget?${query}`);
    }
  }, [query]);

  return (
    <>
      <SiteTopbar
        history={history}
        isLoadingHistory={isLoadingHistory}
        onHistorySelect={handleHistorySelect}
        clearHistory={clearHistory}
        favorites={favorites}
        isLoadingFavorites={isLoadingFavorites}
        onFavoriteSelect={handleFavoriteSelect}
        onRemoveFavorite={removeFavorite}
        onClearAllFavorites={clearAllFavorites}
        presets={topbarPresets}
        onPresetSelect={handlePresetSelect}
      />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-12 pt-8 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-3 text-left">
          <h1 className="text-2xl font-semibold text-foreground">Widget builder</h1>
          <p className="text-sm text-muted-foreground">
            Build a customized SwapUnits widget. Choose categories and units to include, adjust the size, then copy the iframe code.{" "}
            <span className="font-semibold text-primary">Powered by SwapUnits</span> branding is included automatically.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[3.2fr_2.3fr] xl:grid-cols-[3.6fr_2.6fr]">
          <Card className="border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle>Configure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Categories</h3>
                <label className="flex items-center gap-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={chosenCategories.length === builderCategories.length}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedCategories((prev) => {
                        const next = { ...prev };
                        builderCategories.forEach((cat) => {
                          next[cat as UnitCategory] = checked;
                        });
                        // Keep Length always selected
                        next['Length'] = true;
                        return next;
                      });
                    }}
                    className="h-4 w-4"
                  />
                  <span className="font-semibold">All</span>
                </label>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {builderCategories.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm text-foreground transition hover:border-primary/60"
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedCategories[cat as UnitCategory]}
                      onChange={() => toggleCategory(cat as UnitCategory)}
                      className="h-4 w-4"
                    />
                    <span className="flex items-center gap-2">
                      <UnitIcon category={cat as UnitCategory} className="h-4 w-4 text-primary" aria-hidden="true" />
                      {unitData[cat as UnitCategory].name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Units (optional)</h3>
              <p className="text-xs text-muted-foreground">
                Leave all unchecked to include every unit in the selected categories. Checkboxes narrow the list.
              </p>
              <div className="space-y-3 overflow-y-auto rounded-lg border border-border/50 p-3" style={{ maxHeight: '29em' }}>
                {categoryDisplayOrder
                  .filter((cat) => selectedCategories[cat])
                  .map((cat) => (
                    <div key={`units-${cat}`} className="space-y-1">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        <UnitIcon category={cat as UnitCategory} className="h-4 w-4 text-primary" aria-hidden="true" />
                        {unitData[cat as UnitCategory].name}
                      </p>
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {unitData[cat as UnitCategory].units.map((u) => (
                          <label
                            key={u.symbol}
                            className={
                              "flex items-center gap-2 rounded border border-border/40 px-2 py-1 text-sm transition hover:border-primary/60" +
                              (selectedUnits[`${cat}:${u.symbol}`] ? " border-primary/60 bg-primary/5" : "")
                            }
                          >
                            <input
                              type="checkbox"
                              checked={!!selectedUnits[`${cat}:${u.symbol}`]}
                              onChange={() => toggleUnit(cat as UnitCategory, u.symbol)}
                              className="h-4 w-4"
                            />
                            <span className="truncate">
                              {u.name} ({u.symbol})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Widget size</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-foreground">
                  Width
                  <Input value={width} onChange={(e) => setWidth(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-sm text-foreground">
                  Height
                  <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="550" />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-border/60 bg-card/90">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Embed code</CardTitle>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(iframeCode);
                      setCopyState("success");
                      setTimeout(() => setCopyState("idle"), 1200);
                    } catch {
                      // ignore
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
                  aria-label="Copy iframe code"
                >
                  {copyState === "success" ? (
                    <>
                      <span className="text-emerald-500">✓</span>
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={iframeCode} readOnly className="h-40 text-xs font-mono" />
              <p className="text-xs text-muted-foreground">Powered by SwapUnits</p>
            </CardContent>
          </Card>

          <Card className="border-dashed border-primary/40 bg-card/70">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const widthValue = normalizedWidth;
                const pxMatch = widthValue.match(/^(\d+(?:\.\d+)?)px$/);
                const iframeWidth = pxMatch ? `${Number(pxMatch[1])}px` : widthValue;
                return (
                  <div className="flex justify-center">
                    <div
                      className="w-full overflow-hidden rounded-2xl border border-border/60 bg-[hsl(var(--control-background))]"
                      style={{
                        maxWidth: pxMatch ? `${Number(pxMatch[1]) + 48}px` : "680px",
                        minWidth: "320px",
                        minHeight: `${previewContainerMinHeight}px`,
                        padding: "16px",
                      }}
                    >
                      <iframe
                        key={query}
                        src={previewSrc}
                        title="Widget preview"
                        scrolling="no"
                        style={{
                          width: iframeWidth,
                          maxWidth: "100%",
                          height: heightStyle ?? `${previewMinHeight}px`,
                          minHeight: `${previewMinHeight}px`,
                          display: "block",
                          border: "0",
                          borderRadius: "16px",
                          margin: "0 auto",
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
              <p className="text-xs text-muted-foreground">
                This is the live widget with your current selections.
              </p>
              <p className="text-xs text-muted-foreground">
                To embed: copy the iframe code above and paste it into your site where you want the converter to appear. The width/height and selected
                categories/units are encoded in the iframe URL.
              </p>
              <div className="flex justify-end">
                <a
                  href={previewSrc}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm font-medium text-primary transition hover:border-primary/70 hover:bg-primary/5"
                >
                  Open full preview
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
      <Footer />
    </>
  );
}

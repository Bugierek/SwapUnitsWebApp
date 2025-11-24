"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { unitData, categoryDisplayOrder } from "@/lib/unit-data";
import type { UnitCategory } from "@/types";
import { convertUnitsDetailed } from "@/lib/conversion-math";
import type { FxRatesResponse, CurrencyCode } from "@/lib/fx";
import { Copy as CopyIcon, Check as CheckIcon, RefreshCw, ChevronDown } from "lucide-react";

type AllowedUnitsMap = Record<UnitCategory, { symbol: string; name: string }[]>;
type UnitLookup = { symbol: string; name: string; category: UnitCategory };

type UnitFilters = {
  byCategory?: Map<UnitCategory, Set<string>>;
  legacy?: Set<string> | null;
};

const parseParams = (search: URLSearchParams) => {
  const catParam = search.get("categories");
  const unitParam = search.get("units");
  const finder = false;
  const width = search.get("width") ?? "";
  const height = search.get("height") ?? "";

  const categories = (catParam ? catParam.split(",") : categoryDisplayOrder)
    .map((c) => c.trim())
    .filter((c): c is UnitCategory => c in unitData);

  const byCategory = new Map<UnitCategory, Set<string>>();
  const legacyUnits = new Set<string>();
  if (unitParam) {
    unitParam.split(",").forEach((raw) => {
      const u = raw.trim();
      if (!u) return;
      const colonIndex = u.indexOf(":");
      if (colonIndex > 0) {
        const cat = u.slice(0, colonIndex) as UnitCategory;
        const sym = u.slice(colonIndex + 1);
        if (cat && sym && (cat in unitData)) {
          if (!byCategory.has(cat)) byCategory.set(cat, new Set());
          byCategory.get(cat)?.add(sym);
          return;
        }
      }
      legacyUnits.add(u);
    });
  }

  return {
    categories,
    unitFilters: {
      byCategory: byCategory.size ? byCategory : undefined,
      legacy: legacyUnits.size ? legacyUnits : null,
    } as UnitFilters,
    finder,
    width,
    height,
  };
};

const buildAllowedUnits = (cats: UnitCategory[], filters: UnitFilters): AllowedUnitsMap => {
  const map: AllowedUnitsMap = {} as AllowedUnitsMap;
  cats.forEach((cat) => {
    const all = unitData[cat]?.units ?? [];
    let filtered = all;
    const catUnits = filters.byCategory?.get(cat);
    if (catUnits) {
      filtered = all.filter((u) => catUnits.has(u.symbol));
    } else if (filters.legacy) {
      filtered = all.filter((u) => filters.legacy?.has(u.symbol));
    }
    if (filtered.length > 0) {
      map[cat] = filtered;
    }
  });
  return map;
};

const buildUnitLookup = (allowed: AllowedUnitsMap): UnitLookup[] => {
  const out: UnitLookup[] = [];
  Object.entries(allowed).forEach(([cat, units]) => {
    units.forEach((u) => out.push({ ...u, category: cat as UnitCategory }));
  });
  return out;
};

const normalizeUnitTerm = (term: string) => {
  return term
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\^2|\*\*2/g, "²")
    .replace(/\^3|\*\*3/g, "³");
};

const parseDimension = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
};

export default function WidgetPage() {
  const search = useSearchParams();
  const { categories, unitFilters, width: widthParam, height: heightParam } = React.useMemo(() => parseParams(search), [search]);
  const allowedUnits = React.useMemo(
    () => buildAllowedUnits(categories, unitFilters),
    [categories, unitFilters],
  );
  const unitLookup = React.useMemo(() => buildUnitLookup(allowedUnits), [allowedUnits]);

  const availableCategories = React.useMemo(
    () => categories.filter((cat) => allowedUnits[cat]?.length),
    [categories, allowedUnits],
  );

  const initialCategory = availableCategories[0] ?? null;
  const initialUnits = initialCategory ? allowedUnits[initialCategory] ?? [] : [];
  const [category, setCategory] = React.useState<UnitCategory | null>(initialCategory);
  const categoryUnits = React.useMemo(() => {
    const unitsForCategory = category ? allowedUnits[category] ?? [] : [];
    if (unitsForCategory.length) return unitsForCategory;
    // Fallback to the first available category units to avoid empty dropdowns.
    const firstCat = availableCategories[0];
    return firstCat ? allowedUnits[firstCat] ?? [] : [];
  }, [allowedUnits, category, availableCategories]);
  const [fromUnit, setFromUnit] = React.useState<string>(initialUnits[0]?.symbol ?? "");
  const [toUnit, setToUnit] = React.useState<string>(initialUnits[1]?.symbol ?? initialUnits[0]?.symbol ?? "");
  const [value, setValue] = React.useState("1");
  const [copyStateValue, setCopyStateValue] = React.useState<"idle" | "success">("idle");
  const [copyStateFull, setCopyStateFull] = React.useState<"idle" | "success">("idle");
  const widthStyle = React.useMemo(() => parseDimension(widthParam), [widthParam]);
  const heightStyle = React.useMemo(() => parseDimension(heightParam), [heightParam]);
  const [fxRates, setFxRates] = React.useState<FxRatesResponse | null>(null);
  const [fxStatus, setFxStatus] = React.useState<string | null>(null);
  const [fxLoading, setFxLoading] = React.useState(false);

  React.useEffect(() => {
    if (category && !availableCategories.includes(category)) {
      setCategory(availableCategories[0] ?? null);
    }
  }, [category, availableCategories]);

  // Fetch FX rates when needed (currency conversions)
  React.useEffect(() => {
    const hasCurrency = availableCategories.includes("Currency");
    if (!hasCurrency || fxRates || fxLoading) return;
    setFxLoading(true);
    setFxStatus("Loading live FX rates…");
    fetch("/api/fx?base=EUR")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed FX fetch");
        const data: FxRatesResponse = await res.json();
        setFxRates(data);
        setFxStatus(null);
      })
      .catch(() => {
        setFxStatus("Live FX rates unavailable");
      })
      .finally(() => setFxLoading(false));
  }, [availableCategories, fxRates, fxLoading]);

  React.useEffect(() => {
    const units = category ? allowedUnits[category] ?? [] : [];
    if (units.length) {
      setFromUnit((prev) => (prev && units.some((u) => u.symbol === prev) ? prev : units[0].symbol));
      setToUnit((prev) => (prev && units.some((u) => u.symbol === prev) ? prev : units[1]?.symbol ?? units[0].symbol));
    } else {
      setFromUnit("");
      setToUnit("");
    }
  }, [category, allowedUnits]);

  const formatNumber = (num: number | null) => {
    if (num === null) return "";
    const abs = Math.abs(num);
    // Two decimals for values >= 1, but allow more precision for tiny numbers.
    const maximumFractionDigits = abs >= 1 ? 2 : Math.min(6, Math.max(3, Math.ceil(-Math.log10(abs)) + 2));
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    });
  };

  const result = React.useMemo(() => {
    const numeric = Number(value);
    if (!category || !fromUnit || !toUnit || !Number.isFinite(numeric)) return null;
    const fxContext =
      category === "Currency" && fxRates
        ? { base: fxRates.base as CurrencyCode, rates: fxRates.rates }
        : undefined;
    return convertUnitsDetailed({
      category,
      fromUnit,
      toUnit,
      value: numeric,
      fxContext,
    });
  }, [category, fromUnit, toUnit, value, fxRates]);

  const handleCopyValue = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`${formatNumber(result.value)} ${toUnit}`);
      setCopyStateValue("success");
      setTimeout(() => setCopyStateValue("idle"), 1200);
    } catch {
      // ignore
    }
  };

  const handleCopyFull = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(
        `${fromValueDisplay} ${fromUnitName} = ${formatNumber(result.value)} ${toUnitName}`,
      );
      setCopyStateFull("success");
      setTimeout(() => setCopyStateFull("idle"), 1200);
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    setCopyStateValue("idle");
    setCopyStateFull("idle");
  }, [value, fromUnit, toUnit, category]);

  const findUnit = (term: string) => {
    const normalized = normalizeUnitTerm(term);
    if (!normalized) return null;
    return (
      unitLookup.find((u) => {
        const symbol = normalizeUnitTerm(u.symbol);
        const name = normalizeUnitTerm(u.name);
        return normalized === symbol || normalized === name || name.includes(normalized) || normalized.includes(symbol);
      }) ?? null
    );
  };

  const fromUnitName = React.useMemo(() => {
    const scoped = category ? allowedUnits[category]?.find((u) => u.symbol === fromUnit)?.name : undefined;
    if (scoped) return scoped;
    return unitLookup.find((u) => u.symbol === fromUnit)?.name ?? fromUnit;
  }, [category, allowedUnits, fromUnit, unitLookup]);

  const toUnitName = React.useMemo(() => {
    const scoped = category ? allowedUnits[category]?.find((u) => u.symbol === toUnit)?.name : undefined;
    if (scoped) return scoped;
    return unitLookup.find((u) => u.symbol === toUnit)?.name ?? toUnit;
  }, [category, allowedUnits, toUnit, unitLookup]);
  const fromValueDisplay = React.useMemo(() => {
    const n = Number(value);
    return Number.isFinite(n) ? formatNumber(n) : "";
  }, [value]);

  return (
    <div className="min-h-screen bg-background px-4 py-5 text-foreground">
      <div
        className="mx-auto w-full space-y-4 overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm"
        style={{
          width: widthStyle ?? undefined,
          maxWidth: widthStyle ?? "640px",
          minHeight: heightStyle ?? undefined,
          height: heightStyle ?? undefined,
        }}
      >
        <div className="flex items-center justify-end gap-3">
          <RefreshCw className="h-4 w-4 text-primary" aria-hidden="true" />
          <a
            href="https://swapunits.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Powered by SwapUnits
          </a>
        </div>

        <div className="space-y-4 rounded-xl border border-border/60 bg-[hsl(var(--control-background))] px-4 py-4">
          {availableCategories.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Category</label>
              <div className="relative">
                <select
                  value={category ?? ""}
                  onChange={(e) => setCategory(e.target.value as UnitCategory)}
                  className="h-11 w-full appearance-none rounded-md border border-border/60 bg-card px-3 pr-12 text-sm"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {unitData[cat].name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">From</label>
            <div className="flex overflow-hidden rounded-xl border border-border/60 bg-card pr-1">
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-11 flex-1 rounded-none border-0 bg-transparent px-4 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Value"
              />
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                className="h-11 min-w-[104px] max-w-[168px] border-l border-border/60 bg-card px-3 pr-8 text-sm"
              >
                {categoryUnits.map((u) => (
                  <option key={u.symbol} value={u.symbol}>
                    {u.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-11 rounded-full border border-border/60 text-primary transition-transform duration-400 hover:border-primary/60 hover:bg-primary/10 hover:-rotate-90"
              onClick={() => {
                setFromUnit(toUnit);
                setToUnit(fromUnit);
              }}
              aria-label="Swap units"
            >
              <RefreshCw className="h-4 w-4 transition-transform duration-400" aria-hidden="true" />
            </Button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">To</label>
            <div className="flex overflow-hidden rounded-xl border border-border/60 bg-card pr-1">
              <Input
                value={result ? formatNumber(result.value) : ""}
                readOnly
                className="h-11 flex-1 rounded-none border-0 bg-transparent px-4 text-base font-semibold text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Result"
              />
              <button
                type="button"
                onClick={handleCopyValue}
                disabled={!result}
                className="flex h-11 items-center border-l border-border/60 px-3 text-primary transition hover:bg-primary/10 disabled:opacity-50"
                aria-label="Copy result value"
              >
                {copyStateValue === "success" ? (
                  <CheckIcon className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                ) : (
                  <CopyIcon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <select
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
                className="h-11 min-w-[104px] max-w-[168px] rounded-none border-l border-border/60 bg-card px-3 pr-8 text-sm"
              >
                {categoryUnits.map((u) => (
                  <option key={u.symbol} value={u.symbol}>
                    {u.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-primary/60 bg-primary/5 px-4 py-3 text-sm text-foreground">
          {result ? (
            <span className="font-semibold">
              {fromValueDisplay} {fromUnitName} = {formatNumber(result.value)} {toUnitName}
            </span>
          ) : (
            <span className="text-muted-foreground">Enter a value to see the full result.</span>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full rounded-full border-primary/50 px-4 py-3 text-primary hover:border-primary hover:bg-primary/10"
          onClick={handleCopyFull}
          disabled={!result}
        >
          {copyStateFull === "success" ? (
            <>
              <CheckIcon className="h-4 w-4 text-emerald-500" /> Copied!
            </>
          ) : (
            <>
              <CopyIcon className="h-4 w-4" /> Copy
            </>
          )}
        </Button>
        {fxStatus && <div className="text-center text-xs text-muted-foreground">{fxStatus}</div>}
      </div>
    </div>
  );
}

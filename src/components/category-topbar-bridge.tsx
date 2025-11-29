"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SiteTopbar } from "@/components/site-topbar";
import { useConversionHistory } from "@/hooks/use-conversion-history";
import { useFavorites } from "@/hooks/use-favorites";
import { buildConversionPairUrl } from "@/lib/conversion-pairs";
import type { ConversionHistoryItem, FavoriteItem, Preset, UnitCategory } from "@/types";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

type Props = {
  presets?: Preset[];
};

export function CategoryTopbarBridge({ presets = [] }: Props) {
  const router = useRouter();
  const { history, clearHistory, isLoading: isLoadingHistory } = useConversionHistory();
  const { favorites, removeFavorite, clearAllFavorites, isLoadingFavorites } = useFavorites();

  const navigateToPair = React.useCallback(
    (category: UnitCategory, from: string, to: string, value?: number | string | null) => {
      const base = buildConversionPairUrl(category, from, to);
      const qs = value !== undefined && value !== null ? `?value=${encodeURIComponent(String(value))}` : "";
      router.push(`${base}${qs}`);
    },
    [router],
  );

  const handleHistorySelect = React.useCallback(
    (item: ConversionHistoryItem) => {
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
    (fav: FavoriteItem) => {
      navigateToPair(fav.category, fav.fromUnit, fav.toUnit, 1);
    },
    [navigateToPair],
  );

  const handlePresetSelect = React.useCallback(
    (preset: Preset | FavoriteItem) => {
      navigateToPair(preset.category, preset.fromUnit, preset.toUnit, 1);
    },
    [navigateToPair],
  );

  const handleCopyHistoryItem = React.useCallback(async (item: ConversionHistoryItem) => {
    const textToCopy = `${item.fromValue} ${item.fromUnit} → ${item.toValue} ${item.toUnit}`;
    if (!textToCopy) return;
    await copyTextToClipboard(textToCopy);
  }, []);

  return (
    <SiteTopbar
      history={history}
      isLoadingHistory={isLoadingHistory}
      onHistorySelect={handleHistorySelect}
      clearHistory={clearHistory}
      onCopyHistoryItem={handleCopyHistoryItem}
      favorites={favorites}
      isLoadingFavorites={isLoadingFavorites}
      onFavoriteSelect={handleFavoriteSelect}
      onRemoveFavorite={removeFavorite}
      onClearAllFavorites={clearAllFavorites}
      presets={presets}
      onPresetSelect={handlePresetSelect}
    />
  );
}

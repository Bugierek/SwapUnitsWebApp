## Repo quick orientation

This repository is a Next.js (app directory) single-page app for a unit converter. Key places to look:

- `src/app/` — Next.js app routes and layouts (Root layout in `src/app/layout.tsx`, page in `src/app/page.tsx`).
- `src/components/` — UI components and app-level components; primitives are under `src/components/ui/`.
- `src/lib/unit-data.ts` — canonical source of units, conversion factors and `allPresets` (edit this to add/remove units or presets).
- `src/hooks/` — client hooks managing localStorage-backed state (history, favorites). See `use-conversion-history.ts` and `use-favorites.ts` for keys and limits.
- `src/types/` — important TypeScript types (Unit, UnitCategory, Preset, FavoriteItem, ConversionHistoryItem).

## How the app is structured (big picture)

- Next.js `app/` layout renders client components. Many pages/components are marked `"use client"` and rely on browser APIs (localStorage, `navigator.clipboard`, `crypto.randomUUID`).
- Conversion logic: `src/lib/unit-data.ts` holds unit metadata and preset lists. Conversion uses unit `factor` relative to a category base unit; Temperature has special handling (see file comments).
- UI state: history and favorites are localStorage-driven via `src/hooks/use-conversion-history.ts` and `src/hooks/use-favorites.ts`. LocalStorage keys: `swapUnitsConversionHistory` and `swapUnitsFavorites`.

## Important developer workflows / commands

- Dev server: `npm run dev` (uses `next dev --turbopack`).
- Genkit (AI flows): `npm run genkit:dev` or `npm run genkit:watch` — these run `src/ai/dev.ts` via `genkit`/`genkit-cli` and rely on `src/ai/ai-instance.ts`.
- Build: `npm run build`; Start: `npm run start`.
- Lint: `npm run lint`; Typecheck: `npm run typecheck` (runs `tsc --noEmit`).

Note: `next.config.ts` currently sets `typescript.ignoreBuildErrors = true` and `eslint.ignoreDuringBuilds = true`, so builds may succeed even with type/eslint issues — be cautious when changing core types or lint rules.

## Project-specific conventions & gotchas

- Path alias: `@/` maps to `src/` (see `tsconfig.json`) — import using `@/lib/...`, `@/components/...`.
- Max counts are enforced in hooks:
  - History: max 8 items (`MAX_HISTORY_ITEMS` in `src/hooks/use-conversion-history.ts`).
  - Favorites: max 6 items (`MAX_FAVORITE_ITEMS` in `src/hooks/use-favorites.ts`).
- LocalStorage keys are authoritative; tests or scripts that reset state should clear these keys.
- When adding units or presets, update both `unitData` and `allPresets` in `src/lib/unit-data.ts`. Preset filtering logic lives in `getFilteredAndSortedPresets` in the same file.
- Many components expect preset/unit symbols (e.g., `kg`, `m`, `°C`) to match `symbol` values in `unitData` — keep symbols stable.

## Integration points & external deps

- GenKit + Google GenAI: `src/ai/ai-instance.ts` configures `genkit` with the `@genkit-ai/googleai` plugin. Set `GOOGLE_GENAI_API_KEY` in the environment for local genkit runs (do not commit secrets).
- Environment variables used by app: `NEXT_PUBLIC_SITE_URL` (sets canonical metadata base) and the GenAI API key above.
- Firebase and React Query are present as dependencies but the app uses localStorage for history/favorites; external backend wiring may be present elsewhere (check for `firebase` usage before adding server-side features).

## Quick editing checklist for common tasks

- Add new unit: edit `src/lib/unit-data.ts` → add unit to `unitData[Category].units` with `symbol` and `factor`. Keep `mode` consistent (`all`/`advanced`).
- Add a preset: append to `allPresets` in `src/lib/unit-data.ts` (use symbols exactly as in unit data).
- Change UI primitive: edit `src/components/ui/*` (these are shared across app components).
- Fix local state bug: check `src/hooks/*` for localStorage handling and `isLoading` flags.

## What to avoid / watch for

- Don't assume server-side rendering for client-only hooks/components — many files use `use client` and browser APIs.
- Avoid changing unit `symbol` values without migrating associated presets and favorites (localStorage entries depend on symbols).
- Do not commit API keys or secrets. Genkit relies on `GOOGLE_GENAI_API_KEY` and local genkit plugins (`genkit-cli` is a devDependency).

## If you need more context

- Start at `src/app/page.tsx` to see how components, hooks and `unitData` are wired together during runtime.
- For conversion rules and ordering, read `src/lib/unit-data.ts` (category order, custom sorting for fuel economy, and preset selection logic).

If any section is unclear or you'd like more examples (e.g., a checklist for safely renaming a unit symbol), tell me which area to expand and I will iterate.

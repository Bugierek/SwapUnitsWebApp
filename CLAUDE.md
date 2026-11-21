# SwapUnits — project notes

The **Architecture** section describes the code and applies to any clone. Everything after it is specific to Bugierek/SwapUnitsWebApp's own deployment (domains, Firebase project, this machine's local VS Code settings). This repo is public and forkable - if you forked it, those sections describe the original owner's setup, not yours.

## Architecture

Next.js 15 App Router, React 18, Tailwind + shadcn primitives (`src/components/ui/`). No database: history and favorites live in `localStorage` (`src/hooks/use-conversion-history.ts`, `use-favorites.ts`).

### Data and math (`src/lib/`)
- `unit-data.ts`: the single source of units, presets (`allPresets`) and `categoryDisplayOrder`. Each unit's `factor` is relative to its category's base unit (base units are listed in the file header).
- `conversion-math.ts`: `convertNumericValue()` computes `value × from.factor ÷ to.factor`, with three exceptions: Temperature (hard-coded °C/°F/K formulas), Fuel Economy (`unitType: 'inverse_consumption'` inverts the value) and Currency (`factor` is a placeholder `1`; live rates arrive via `fxContext`).
- `fx.ts`: Frankfurter v1 API (ECB reference rates, EUR base), served through `/api/fx` and `/api/fx/historical`. `/api/fx-history` calls Frankfurter directly and bypasses `fx.ts`.
- `category-info.ts`: per-category slug, SEO copy and FAQ. `conversion-sources.ts`: the citations shown under results.
- `conversion-formula.ts`: classifies a pair as proportional / temperature / reciprocal (exactly one side `inverse_consumption`) / currency and builds the displayed formula. Used by the homepage converter, pair pages (formula line, titles, table hints) and `pair-metadata.ts`, so they can't disagree. Don't hand-write formula strings elsewhere.

### Surfaces
| Surface | Entry | Converter UI |
|---|---|---|
| Homepage | `app/page.tsx` | `UnitConverter` (`components/unit-converter.tsx`, ~4k lines) |
| Category pages | `app/measurements/[slug]` | `UnitConverter` + category content |
| Pair pages (SEO) | `app/conversions/[categorySlug]/[pairSlug]` | `PairConverter` |
| Embeddable widget | `app/widget/page.tsx` | standalone; uses neither converter |
| Widget builder | `app/widget-builder/page.tsx` | config UI for the widget |
| Browser extensions | `extensions/chrome`, `extensions/firefox` | plain JS; shares nothing with `src/` |

- **Finder** = `unit-converter.tsx` + `combobox.tsx` + `lib/conversion-query-parser.ts`. The combobox is lazy-loaded (`import('./combobox')`), so it won't show up as a static import. The combobox and the parser each have their own µ/sq/^2 normalization, so a matching change needs to go into both. The exception is connector words ("to"/"in"/"into"): both use the parser's exported `findConnectorMatches` / `stripConnectorWords` / `spaceConnectorWords`, which ignore an "in" glued to `·`, `-`, `/`, `²`, `³` (so `lbf·in`, `in-lb`, `in²`, `lb/in³` stay whole). Also shared: `toSuperscriptPowers` (m2 → m², but not the `e3` of scientific notation) and `rewriteCaseExactNotations` (`Mb/s`/`Kb/s`/`Gb/s` → bits, `Mg` → tonne; only in that exact case, since lowercase `mb/s`, `kb/s`, `mg` already mean other units).
- **Widget** shares `unit-data`, `conversion-math`, `UnitIcon`, `FxHistoryChart` and `FxSparkline`. Logic written inside `unit-converter.tsx` or `pair-converter.tsx` does not reach it, so decide each time whether to port it.
- **Extensions** have their own regex detection, their own fallback factor tables and a different FX provider. Fixing a unit in `src/lib` doesn't fix them.

### Routing and SEO
- Category subdomains are **shortcuts**, implemented as host-based `redirects()` in `next.config.ts` (built from `categoryInfoList`). `length.swapunits.com/` 308-redirects to `swapunits.com/measurements/length-conversion`; any other subdomain or path (including `www`) 308-redirects to the same path on the apex. Content deliberately stays on the apex: `localStorage` (favorites, history, theme) is per hostname, and canonicals, the sitemap and internal links all use the apex. Hosts other than swapunits.com/unitswap.xyz (e.g. the `*.hosted.app` default URL) pass through. Each rule matches the hostname in either `Host` or `X-Forwarded-Host`.
- **Don't add Next middleware.** Firebase App Hosting never CDN-caches routes that middleware touches, and the subdomain logic previously lived in a `src/middleware.ts` matching every route, which made every page `no-store` at the CDN. (Also: middleware only works in `src/`; a root-level `middleware.ts` is silently ignored with a `src/app` layout.)
- Subdomains need, per domain, `*.<domain>` connected on the App Hosting backend (both already are; their certificates cover the wildcard) and a `*` A record at Namecheap pointing at the same IP as the apex. Test locally with `curl -sI -H "X-Forwarded-Host: length.swapunits.com" http://localhost:3000/`.
- Pair pages are pre-built at build time (`force-static`, `dynamicParams = false`) for **every ordered pair** of units in each category except SI Prefixes (`listAllConversionPairs()`), and `sitemap.ts` uses the same list. Adding a unit to an n-unit category adds 2n pages. Currency pairs revalidate hourly (server-fetched ECB rates); the rest are cached until the next deploy. The page never reads `searchParams`: `?value=`, `?fxMode=`, `?fxDate=` are applied client-side in `PairConverter`. Pair URLs are built from unit **symbols** (`normalizeUnitForSlug`: `/` → `-per-`, `°` → `deg`, `·` → `-`, so `N·m` → `N-m`), so renaming a symbol breaks indexed URLs and users' saved favorites and history.
- Non-canonical pair slugs (other capitalisations, `%C2%B5m`) fall through to the `[...slug]` catch-all route, which 308s to the canonical slug keeping the query, or 404s. **On macOS, `next start` serves case variants as 200** (the case-insensitive disk matches the pre-built file), so verify those redirects on unitswap.xyz (Linux), not locally.
- `next.config.ts` sets `htmlLimitedBots: /.*/` so `<title>`, description and canonical render in `<head>`; without it Next 15 streams them into `<body>` for Googlebot too. Don't remove it.
- The root layout must not read `cookies()`/`headers()`: that makes every route render per request (`no-store`) and uncacheable at the CDN. The theme is applied before first paint by the inline `themeInitScript` from localStorage (the server always renders `data-theme-preference="system"`). Homepage, category pages, `/widget-builder` and pair pages are pre-built; `/standards/nist-si-tenfold` and `/widget` are `force-dynamic` because they call `useSearchParams()` during render (prerendering would empty their server HTML).

### Adding units
Use `scripts/automation/add-conversion-pair.mjs` (documented in `docs/conversion-pair-automation.md`). It edits `unit-data`, `category-keywords`, `conversion-query-parser`, `conversion-sources` and `unit-converter` in one pass. `/automation` is a browser UI for the same script, running it through `/api/automation`. Both only work under `npm run dev`; in any production build (so on both live sites) they return 404.

The finder's alias index is lowercase and follows `unitData`'s key order, so when two units share an alias (`kn` = knot and kN, `ps` = picosecond and PS, `nm` = nanometer and N·m, `pounds` = GBP and lb) the earlier category's unit is the default. New categories go at the end of `unitData` for that reason. Two things then pick the other unit: a symbol typed in its exact case (`getCaseExactForms`, derived from the data, so `kN`, `PS`, `Nm`, `N` work; the dropdown applies it only to unit-vs-unit clashes), and context (the parser's second pass takes the reading that shares a category with the other side, so "100 kn to lbf" and "10 pounds to kg" work). Imperial volumes are named "Imperial …" so plain "pint"/"fluid ounce" stay US. Don't add aliases containing a standalone "us": the micro rewrite reads it as µs.

Before/after-check any finder change by running `parseConversionQuery` over every unit pair (symbols, lowercase, names) plus hand-written cases, against the old code: nothing that parsed should change unless intended.

### Verifying changes
- `next.config.ts` sets `ignoreBuildErrors` and `ignoreDuringBuilds`, so a passing `npm run build` proves nothing. Run `npx tsc --noEmit`, `npm run lint` and `npm test`. `tsc` already reports errors in untouched files (`src/ai/` and a few components; 7 as of 2026-11-21) and lint 19, so compare against those baselines rather than expecting zero.
- `npm test` runs vitest (`vitest.config.mts`, Node environment) over `src/lib/__tests__/`. Tests don't run on deploy. vitest is pinned to 4.1.12: vitest 5 requires `@types/node` 22+, and the project is on `@types/node` 20.
  - `finder-regression.test.ts`: hand-checked parser results for ~200 queries, plus every ordered pair of unit symbols and of unit names in every category, plus the shared normalization helpers. A failing case means the finder's behavior changed; update the expectation only if that's intended.
  - `unit-values.test.ts`: factors against exact values derived from the definitions (to 1e-9). Add a case when adding a unit.
  - `unit-data.test.ts`: every category has copy, sources, a valid default pair; presets and symbols are consistent.
  - `pair-urls.test.ts`: every URL in `fixtures/pair-urls.txt` (all pair pages as of 2026-11-21, identical to the sitemap) must still exist, and canonical/lowercase slugs must resolve. New units may add URLs; regenerate the fixture to include them.

### Stale or leftover files
- `.github/copilot-instructions.md` describes genkit, a `typecheck` script, turbopack, Firebase and React Query. None of those are in `package.json` anymore.
- `src/ai/` imports genkit, which isn't installed, and nothing imports `src/ai/`.
- `docs/blueprint.md` (the original scaffold spec), `tmp/popover-debug.tsx` and `src/components/SwapUnitsWebApp.code-workspace` are leftovers.

## Branches and domains

- `dev` → deploys to **unitswap.xyz**
- `master` → deploys to **swapunits.com** (production)

This is the correct mapping — treat it as reliable. (A 2026-08-13 session briefly concluded both domains deploy from `master`, based on seeing unitswap.xyz redeploy right after a `master`-only push. That was wrong: `dev` had actually also been pushed to `origin/dev` around the same time via VS Code's Source Control "Sync Changes," not via any explicit `git push` command — see the gotcha below. Once that's accounted for, the simple one-branch-per-domain mapping fully explains what was observed, with no need for a shared-branch/multiple-backend theory.)

Firebase App Hosting (`apphosting.yaml`, Cloud Run) — not Vercel, no GitHub Actions workflow. Firebase watches each branch and auto-builds/deploys on push. Pushing `origin/master` redeploys production (swapunits.com) only.

## Gotcha: VS Code can push without anyone running `git push`

This machine's global VS Code settings have `git.confirmSync: false`. That means the Source Control panel's "Sync Changes" button pushes (and pulls) **with no confirmation prompt**, and it does so entirely inside the editor UI — invisible to anything that only checks terminal/Bash command history. Don't conclude "I never pushed branch X" just because you can't find a `git push` command for it — check `git log origin/<branch> -1` directly instead. This is likely what pushed `dev` to `origin/dev` during the 2026-08-13 session even though no explicit push command for it was ever run.

## apphosting.yaml domain switching

`apphosting.yaml`'s committed `NEXT_PUBLIC_SITE_URL` differs between the `dev` and `master` branches (`unitswap.xyz` vs `swapunits.com`) in the git history, and two git hooks (`.husky/post-checkout`, `.husky/post-merge`, wired via `git config core.hooksPath=.husky`) auto-correct that value to match whichever branch you're on, every time you checkout or merge. That mechanism works correctly for **local `git merge`** — verified directly on 2026-08-13 (hook fired, file content checked after). It does **not** fire for GitHub-UI/`gh pr merge` merges, since those happen server-side with no local hook involved — the one PR merge in this repo's history (`66e41ac`, "Merge pull request #1 from Bugierek/deployUnitswapXyz") is exactly that case, and is why a past session found the hook "broken" and started manually pre-correcting the domain on a branch before merging instead.

Keep using `git merge` locally (not a GitHub PR button) when merging into `master` — the hook is a real, working safety net for this value, confirmed working on 2026-08-13.

## Merging dev → master

```
git checkout master
git merge dev
# resolve the apphosting.yaml conflict (if any) by keeping master's swapunits.com value —
# post-merge hook will also force it back to swapunits.com regardless
git push origin master
```

Pushing to `master` deploys to production immediately — always confirm with the user before pushing, even if the merge itself is already staged locally.

## Why two domains exist

swapunits.com is the current primary brand; unitswap.xyz is the original domain, still used as the Resend "from" address for transactional email since swapunits.com isn't yet a verified Resend sending domain (see commit `a3e14eb`).

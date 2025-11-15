# Conversion Pair Automation Script

The `scripts/automation/add-conversion-pair.mjs` helper keeps the work required for a “please add unit X to category Y” request consistent. It applies all of the edits we typically touch (unit data, presets, parser aliases, finder hints, and conversion-source metadata), runs lint, and prints a manual follow-up checklist.

## 1. Prepare a config file

Use `scripts/automation/examples/add-wh-pair.json` as a template. Key fields:

- `category`: Matches an entry in `UnitCategory`.
- `units`: Each object needs `name`, `symbol`, `factorExpression` (raw TS expression that evaluates to the base-unit factor), and `unitType`.
- `presets`: Optional preset tiles that should surface once the units exist.
- `keywordAdditions`: Category-level keywords that make the finder/category filter understand new vocabulary.
- `synonyms`: Extra alias strings per symbol for the conversion parser.
- `unitTargets`: Optional overrides so “single unit” queries jump to a logical counterpart (e.g., `Wh/km → Wh/mi`).
- `tooltipExamples`: Finder tooltip tags to showcase the new conversions.
- `conversionSourceUpdates`: Which `ConversionSource` constant should list the new units in its `appliesToUnits`.
- `references`: An array of `{ description, url }` entries. These are shown before any files change so the reviewer can confirm the source material.

## 2. Run the script

```
node scripts/automation/add-conversion-pair.mjs path/to/config.json
```

Add `--yes` if you need to skip the interactive “type YES to confirm references” prompt (useful for CI or scripted workflows).

The script updates these files when needed:

- `src/lib/unit-data.ts`
- `src/lib/category-keywords.ts`
- `src/lib/conversion-query-parser.ts`
- `src/lib/conversion-sources.ts`
- `src/components/unit-converter.tsx`

After the edits it automatically runs `npm run lint`. If lint fails, the script stops so you can fix issues before continuing. When everything passes, the tool prints:

1. A log of which files were touched.
2. A manual follow-up checklist (category copy, formula descriptions, testing reminders, etc.).

## 3. Verify

After the script runs:

1. Inspect the git diff to confirm the generated edits look correct.
2. (Optional) Run any additional tests beyond `npm run lint`.
3. Work through the printed checklist—update category copy, add parser tests, capture release notes, etc.
4. Manually exercise the new pair in the app (finder, dropdowns, category page, pair subpage).

This workflow is forward-compatible with a future admin interface: the admin tool can collect the same JSON payload the script expects and call it server-side or translate the automation logic into back-end code.

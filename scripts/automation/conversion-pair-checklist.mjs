#!/usr/bin/env node
/**
 * Generates a checklist/prompt bundle for manual follow-up work when adding new units.
 *
 * Usage:
 *   node scripts/conversion-pair-checklist.mjs path/to/config.json
 *
 * The config format mirrors scripts/automation/add-conversion-pair.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';

const CONFIG_PATH = process.argv[2];

if (!CONFIG_PATH) {
  console.error('Usage: node scripts/conversion-pair-checklist.mjs path/to/config.json');
  process.exit(1);
}

const repoRoot = process.cwd();

let config;
try {
  config = JSON.parse(fs.readFileSync(path.resolve(repoRoot, CONFIG_PATH), 'utf8'));
} catch (error) {
  console.error(`Failed to read config at ${CONFIG_PATH}:`, error.message);
  process.exit(1);
}

const category = config.category;
const units = config.units ?? [];
const presets = config.presets ?? [];

const unitList = units.map((unit) => `${unit.name} (${unit.symbol})`).join(', ');
const presetList = presets.map((preset) => `${preset.fromUnit} → ${preset.toUnit}`).join(', ');

const divider = () => console.log('\n' + '-'.repeat(70) + '\n');

console.log('Conversion Pair Checklist\n');
console.log(`Category: ${category}`);
console.log(`Units:   ${unitList || '—'}`);
console.log(`Presets: ${presetList || '—'}`);
divider();

console.log('1. Category Reference Copy (src/lib/category-info.ts)');
console.log('   - Update hero description, quick tips, and FAQ if the new units deserve mention.');
console.log('   - Ensure SEO keywords reflect any new terms (e.g., watt-hour, month, etc.).');
divider();

console.log('2. Conversion Pair Formula Insight (ConversionPairPageContent)');
console.log('   - If the generic formulaDescription helper is insufficient, add a specific clause.');
console.log('   - Provide plain-language explanation (e.g., “Wh/km converts by multiplying by 1.609344”).');
divider();

console.log('3. Example Tables & Samples');
console.log('   - Decide whether fuelEconomySampleSet / temperatureSampleSet need tweaks for this category.');
console.log('   - If unique sample values are required, extend buildSampleValues in src/app/conversions/[categorySlug]/[pairSlug]/page.tsx.');
divider();

console.log('4. Category Tiles & Marketing Surfaces');
console.log('   - Check src/app/page.tsx hero copy, docs content, and preset highlights.');
console.log('   - Update docs/blueprint.md or other marketing material if necessary.');
divider();

console.log('5. Parser / Finder Sanity');
console.log('   - Confirm synonyms cover all real-world phrases (inspect scripts config if more needed).');
console.log('   - Ensure UNIT_SPECIFIC_TARGETS includes sensible “default pair” fallbacks.');
divider();

console.log('6. Conversion Sources');
console.log('   - Verify each new unit is backed by a citation. If none exist, add a new entry in src/lib/conversion-sources.ts.');
console.log('   - Double-check that appliesToUnits references all new symbols.');
divider();

console.log('7. Assets & Icons');
console.log('   - If the category’s icon needs to reflect new semantics (unlikely, but check), edit src/components/unit-icon.tsx.');
divider();

console.log('8. Testing');
console.log('   - Add parser tests (if available) for representative phrases:');
units.forEach((unit) => {
  console.log(`       • "${unit.symbol.toLowerCase()} to ???"`);
});
console.log('   - Exercise /conversions/... deep-links to ensure share URLs resolve.');
divider();

console.log('9. Internationalization & Formatting');
console.log('   - Confirm formatNumber / formatResult produce readable strings for expected value ranges.');
divider();

console.log('10. Deployment Notes');
console.log('   - Capture screenshots or release notes highlighting the new units.');
console.log('\nDone. Use this checklist to drive manual polish after the automation script runs.\n');

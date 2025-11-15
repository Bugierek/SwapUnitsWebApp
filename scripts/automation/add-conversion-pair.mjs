#!/usr/bin/env node
/**
 * Adds/extends a conversion pair definition across the codebase, runs lint, and prints a manual follow-up checklist.
 *
 * Usage:
 *   node scripts/automation/add-conversion-pair.mjs path/to/config.json
 *
 * See scripts/automation/examples/add-wh-pair.json for the expected config shape.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline';

const CONFIG_PATH = process.argv[2];
const SKIP_CONFIRM = process.argv.includes('--yes');

if (!CONFIG_PATH) {
  console.error('Usage: node scripts/automation/add-conversion-pair.mjs path/to/config.json');
  process.exit(1);
}

const repoRoot = process.cwd();

const config = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(repoRoot, CONFIG_PATH), 'utf8'));
  } catch (error) {
    console.error(`Failed to read config at ${CONFIG_PATH}:`, error.message);
    process.exit(1);
  }
})();

if (!config.category || !Array.isArray(config.units) || config.units.length === 0) {
  console.error('Config must include a category and at least one unit definition.');
  process.exit(1);
}

const addLog = [];

function updateFile(relativePath, updater) {
  const targetPath = path.resolve(repoRoot, relativePath);
  const original = fs.readFileSync(targetPath, 'utf8');
  const updated = updater(original);
  if (updated !== original) {
    fs.writeFileSync(targetPath, updated);
    addLog.push(`Updated ${relativePath}`);
  } else {
    addLog.push(`Skipped ${relativePath} (no changes needed)`);
  }
}

const ensureArrayValues = (text, values) => {
  const existing = new Set(Array.from(text.matchAll(/'([^']+)'/g)).map(([, item]) => item));
  values.forEach((value) => existing.add(value));
  return Array.from(existing);
};

const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function findCategoryToken(source, category) {
  const candidates = [`'${category}': {`, `"${category}": {`, `${category}: {`];
  for (const token of candidates) {
    const idx = source.indexOf(token);
    if (idx !== -1) {
      return { index: idx };
    }
  }
  return null;
}

function findMatchingBrace(source, startIndex) {
  let depth = 0;
  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findMatchingBracket(source, startIndex) {
  let depth = 0;
  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i];
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function detectIndent(source, index) {
  const lastNewline = source.lastIndexOf('\n', index);
  if (lastNewline === -1) return '';
  const line = source.slice(lastNewline + 1, index);
  const match = line.match(/^\s*/);
  return match ? match[0] : '';
}

function insertUnitsIntoCategory(source) {
  const tokenInfo = findCategoryToken(source, config.category);
  if (!tokenInfo) {
    console.warn(`Could not locate category "${config.category}" in unit-data.ts`);
    return source;
  }
  const blockStart = source.indexOf('{', tokenInfo.index);
  const blockEnd = findMatchingBrace(source, blockStart);
  if (blockStart === -1 || blockEnd === -1) {
    console.warn(`Failed to parse block for category "${config.category}"`);
    return source;
  }
  const unitsIdx = source.indexOf('units', blockStart);
  if (unitsIdx === -1 || unitsIdx > blockEnd) {
    console.warn(`No units[] definition found for "${config.category}"`);
    return source;
  }
  const arrayStart = source.indexOf('[', unitsIdx);
  const arrayEnd = findMatchingBracket(source, arrayStart);
  if (arrayStart === -1 || arrayEnd === -1) {
    console.warn(`Unable to locate units array for "${config.category}"`);
    return source;
  }

  const existingBlock = source.slice(arrayStart + 1, arrayEnd);
  const existingSymbols = new Set(
    Array.from(existingBlock.matchAll(/symbol:\s*'([^']+)'/g)).map(([, symbol]) => symbol),
  );
  const entryIndent = `${detectIndent(source, arrayStart)}  `;

  let insertion = '';
  config.units.forEach((unit) => {
    if (!unit.symbol || !unit.name || !unit.factorExpression) {
      console.warn(`Skipping unit with missing data: ${JSON.stringify(unit)}`);
      return;
    }
    if (existingSymbols.has(unit.symbol)) return;
    const unitTypeSegment = unit.unitType ? `, unitType: '${unit.unitType}'` : '';
    insertion += `${entryIndent}{ name: '${unit.name}', symbol: '${unit.symbol}', factor: ${unit.factorExpression}${unitTypeSegment} },\n`;
  });

  if (!insertion) return source;

  const before = source.slice(0, arrayEnd);
  const after = source.slice(arrayEnd);
  const needsLeadingNewline = existingBlock.trim().length === 0 || !existingBlock.trim().endsWith(',');
  const formattedInsertion = `${needsLeadingNewline ? '\n' : ''}${insertion}`;
  return `${before}${formattedInsertion}${after}`;
}

function addPresets(source) {
  if (!Array.isArray(config.presets) || config.presets.length === 0) {
    return source;
  }
  const anchor = '\n\n// Additional high-precision presets';
  const idx = source.indexOf(anchor);
  const insertPos = idx === -1 ? source.length : idx;
  let insertion = '';
  config.presets.forEach((preset) => {
    const signature = `{ category: '${preset.category}', fromUnit: '${preset.fromUnit}', toUnit: '${preset.toUnit}'`;
    if (source.includes(signature)) return;
    insertion += `  { category: '${preset.category}', fromUnit: '${preset.fromUnit}', toUnit: '${preset.toUnit}', name: '${preset.name}' },\n`;
  });
  if (!insertion) return source;
  return `${source.slice(0, insertPos)}${insertion}${source.slice(insertPos)}`;
}

function injectKeywords(source) {
  if (!Array.isArray(config.keywordAdditions) || config.keywordAdditions.length === 0) {
    return source;
  }
  const categoryRegex = new RegExp(`'${escapeForRegExp(config.category)}': \\[(.*?)\\],`, 's');
  const match = source.match(categoryRegex);
  if (!match) return source;
  const existingBlock = match[0];
  const values = ensureArrayValues(match[1], config.keywordAdditions);
  const formatted = values.map((value) => `    '${value}',`).join('\n');
  const replacement = `'${config.category}': [\n${formatted}\n  ],`;
  return source.replace(existingBlock, replacement);
}

function injectSynonyms(source) {
  if (!config.synonyms) return source;
  let updated = source;
  Object.entries(config.synonyms).forEach(([symbol, list]) => {
    if (!Array.isArray(list) || list.length === 0) return;
    const entryRegex = new RegExp(`'${escapeForRegExp(symbol)}': \\[(.*?)\\],`, 's');
    const match = updated.match(entryRegex);
    if (match) {
      const existing = ensureArrayValues(match[1], list);
      const block = `'${symbol}': [\n  ${existing.map((value) => `'${value}'`).join(',\n  ')}\n],`;
      updated = updated.replace(match[0], block);
    } else {
      const insertRegex = /const EXTRA_UNIT_SYNONYMS: Record<string, string\[]> = {\n/;
      const insertMatch = updated.match(insertRegex);
      if (!insertMatch) return;
      const block = `  '${symbol}': [\n  ${list.map((value) => `'${value}'`).join(',\n  ')}\n  ],\n`;
      const idx = insertMatch.index + insertMatch[0].length;
      updated = `${updated.slice(0, idx)}${block}${updated.slice(idx)}`;
    }
  });
  return updated;
}

function injectSpecificTargets(source) {
  if (!config.unitTargets) return source;
  let updated = source;
  Object.entries(config.unitTargets).forEach(([symbol, targets]) => {
    if (!Array.isArray(targets) || targets.length === 0) return;
    const entryRegex = new RegExp(`'${escapeForRegExp(symbol)}': \\[(.*?)\\],`, 's');
    const match = updated.match(entryRegex);
    if (match) {
      const existing = ensureArrayValues(match[1], targets);
      const block = `  '${symbol}': ['${existing.join("', '")}'],`;
      updated = updated.replace(match[0], block);
    } else {
      const insertRegex = /const UNIT_SPECIFIC_TARGETS: Record<string, string\[]> = {\n/;
      const insertMatch = updated.match(insertRegex);
      if (!insertMatch) return;
      const block = `  '${symbol}': ['${targets.join("', '")}'],\n`;
      const idx = insertMatch.index + insertMatch[0].length;
      updated = `${updated.slice(0, idx)}${block}${updated.slice(idx)}`;
    }
  });
  return updated;
}

function extendConversionSources(source) {
  if (!Array.isArray(config.conversionSourceUpdates)) {
    return source;
  }
  let updated = source;
  config.conversionSourceUpdates.forEach(({ constantName, units }) => {
    if (!constantName || !Array.isArray(units) || units.length === 0) return;
    const regex = new RegExp(`const ${escapeForRegExp(constantName)}:[\\s\\S]*?appliesToUnits: \\[(.*?)\\],`, 's');
    const match = updated.match(regex);
    if (!match) {
      console.warn(`Could not locate conversion source ${constantName}`);
      return;
    }
    const replacementValues = ensureArrayValues(match[1], units);
    const replacement = match[0].replace(/\[.*?\]/s, `[${replacementValues.map((value) => `'${value}'`).join(', ')}]`);
    updated = updated.replace(match[0], replacement);
  });
  return updated;
}

function updateFinderExamples(source) {
  if (!Array.isArray(config.tooltipExamples) || config.tooltipExamples.length === 0) {
    return source;
  }
  const match = source.match(/const FINDER_CONVERSION_EXAMPLES = \[(.*?)\];/s);
  if (!match) return source;
  const updatedValues = ensureArrayValues(match[1], config.tooltipExamples);
  const replacement = `const FINDER_CONVERSION_EXAMPLES = ['${updatedValues.join("', '")}'];`;
  return source.replace(match[0], replacement);
}

async function confirmReferences() {
  console.log('\nReference confirmation');
  console.log('-----------------------');
  const references = Array.isArray(config.references) ? config.references : [];
  if (references.length === 0) {
    console.warn('No references were provided in the config. Ensure you have vetted sources before continuing.');
  } else {
    references.forEach((ref, idx) => {
      const label = ref.description || ref.source || `Reference ${idx + 1}`;
      const url = ref.url || 'No URL provided';
      console.log(`${idx + 1}. ${label} — ${url}`);
    });
  }
  if (SKIP_CONFIRM) {
    console.log('Skipping interactive confirmation (--yes detected).');
    return;
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise((resolve) =>
    rl.question('Type YES to confirm these references are vetted (anything else aborts): ', resolve),
  );
  rl.close();
  if ((answer || '').trim().toUpperCase() !== 'YES') {
    console.log('Aborting per user input. No files were modified.');
    process.exit(0);
  }
}

await confirmReferences();

updateFile('src/lib/unit-data.ts', (source) => addPresets(insertUnitsIntoCategory(source)));
updateFile('src/lib/category-keywords.ts', (source) => injectKeywords(source));
updateFile('src/lib/conversion-query-parser.ts', (source) => injectSpecificTargets(injectSynonyms(source)));
updateFile('src/lib/conversion-sources.ts', (source) => extendConversionSources(source));
updateFile('src/components/unit-converter.tsx', (source) => updateFinderExamples(source));

console.log('Structured updates complete.');
addLog.forEach((line) => console.log(`• ${line}`));

const lintRun = spawnSync('npm', ['run', 'lint'], { cwd: repoRoot, stdio: 'inherit' });
if (lintRun.status !== 0) {
  console.error('npm run lint failed; please fix the issues above before proceeding.');
  process.exit(lintRun.status ?? 1);
}

console.log('\nLint passed. Review checklist below to finish manual steps.\n');

const unitsList = config.units.map((unit) => `${unit.name} (${unit.symbol})`).join(', ');
const presetList = (config.presets ?? []).map((preset) => `${preset.fromUnit} → ${preset.toUnit}`).join(', ');
const divider = () => console.log('\n' + '-'.repeat(70) + '\n');

divider();
console.log('Manual Follow-up Checklist');
divider();
console.log(`Category: ${config.category}`);
console.log(`Units:    ${unitsList || '—'}`);
console.log(`Presets:  ${presetList || '—'}`);

divider();
console.log('1. Category reference copy (src/lib/category-info.ts)');
console.log('   • Mention new units in hero text, quick tips, and FAQ if appropriate.');
console.log('   • Update SEO keywords to include new terminology.');

divider();
console.log('2. Conversion pair formula insight (src/app/conversions/.../page.tsx and ConversionPairPageContent)');
console.log('   • If the generic description is insufficient, add a branch to formulaDescription.');
console.log('   • Draft a plain-language explanation for the new pair.');

divider();
console.log('3. Example tables & sample values');
console.log('   • Decide whether buildSampleValues needs category-specific entries for these units.');
console.log('   • Adjust sample arrays if the new units require different magnitudes.');

divider();
console.log('4. Category tiles & marketing surfaces');
console.log('   • Review home page hero text, preset highlights, docs, and marketing assets so they mention the new units when relevant.');

divider();
console.log('5. Parser / finder sanity');
console.log('   • Confirm synonyms cover real-world phrasing (update config if more are needed).');
console.log('   • Ensure UNIT_SPECIFIC_TARGETS includes sensible defaults for “single unit” queries.');

divider();
console.log('6. Conversion sources');
console.log('   • Verify every new unit is backed by an existing citation or add a new entry in src/lib/conversion-sources.ts.');
console.log('   • Double-check appliesToUnits includes each symbol.');

divider();
console.log('7. Assets & icons');
console.log('   • If the category icon or badges need an update based on the new units, adjust src/components/unit-icon.tsx or related assets.');

divider();
console.log('8. Testing');
console.log('   • Add/extend parser tests for representative phrases (e.g., “100 newunit to otherunit”).');
console.log('   • Manually exercise /conversions/... links and history/favorites flows.');

divider();
console.log('9. Formatting & internationalization');
console.log('   • Confirm result formatting (normal/scientific) looks good for the expected value ranges.');

divider();
console.log('10. Release notes');
console.log('   • Capture screenshots or add release-note entries highlighting the addition.');

console.log('\nAll done. Finish any checklist items before shipping.\n');

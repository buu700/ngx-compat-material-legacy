#!/usr/bin/env node
/**
 * Compare all-legacy-component-themes membership and order with Material 16.2.14.
 * The owned-only aggregate must not include the ordinary companions.
 *
 *   node scripts/compare-legacy-aggregate.mjs
 */
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const historicalPath = join(root, 'compatibility/rc/oracles/material-16.2.14-all-legacy-theme.scss');
const ownedPath = join(root, 'projects/ngx-material-legacy/styles/legacy-core/theming/_all-theme.scss');
const ownedOnlyPath = join(root, 'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss');
const reportPath = join(root, 'compatibility/rc/reports/legacy-aggregate.json');
const companions = [
  'badge-theme', 'bottom-sheet-theme', 'button-toggle-theme', 'datepicker-theme',
  'divider-theme', 'expansion-theme', 'grid-list-theme', 'icon-theme', 'sidenav-theme',
  'stepper-theme', 'sort-theme', 'toolbar-theme', 'tree-theme',
];

function mixinBody(text, name) {
  const start = text.indexOf(`@mixin ${name}`);
  if (start < 0) return null;
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return null;
}

function includes(body) {
  return [...body.matchAll(/@include\s+([.\w-]+)\.theme\s*\(/g)].map(match => match[1]);
}

const historicalText = readFileSync(historicalPath, 'utf8');
const ownedText = readFileSync(ownedPath, 'utf8');
const ownedOnlyText = readFileSync(ownedOnlyPath, 'utf8');
const historicalIncludes = includes(mixinBody(historicalText, 'all-legacy-component-themes'));
const ownedIncludes = includes(mixinBody(ownedText, 'all-legacy-component-themes'));
const ownedOnlyIncludes = includes(mixinBody(ownedOnlyText, 'all-owned-component-themes'));
const companionHits = companions.filter(name => ownedOnlyIncludes.includes(name));
const sameOrder = JSON.stringify(historicalIncludes) === JSON.stringify(ownedIncludes);
const report = {
  schema_version: 1,
  role: 'all-legacy aggregate membership',
  historical_sha256: createHash('sha256').update(historicalText).digest('hex'),
  historical_includes: historicalIncludes,
  owned_includes: ownedIncludes,
  same_order: sameOrder,
  owned_only_includes: ownedOnlyIncludes,
  companions_in_owned_only: companionHits,
  limitations: [
    'Include order only. The mixins were not compiled.',
    'This is not RC-05-A03.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
if (!sameOrder || companionHits.length || !historicalIncludes.length) {
  console.error(JSON.stringify({sameOrder, companionHits, historical: historicalIncludes.length}, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  members: historicalIncludes.length,
  owned_only: ownedOnlyIncludes.length,
}, null, 2));

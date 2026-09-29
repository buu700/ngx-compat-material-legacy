#!/usr/bin/env node
/**
 * Compare named @forward show members in the owned facade with Material 16.2.14.
 *
 *   node scripts/inventory-sass-facade.mjs
 */
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ownedPath = join(root, 'projects/ngx-material-legacy/_index.scss');
const historicalPath = join(root, 'compatibility/rc/oracles/material-16.2.14-index.scss');
const reportPath = join(root, 'compatibility/rc/reports/sass-facade-inventory.json');

function parseForwards(text) {
  const source = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*?$/gm, '$1');
  const shown = [];
  const wildcards = [];
  for (const match of source.matchAll(/@forward\s+[^;]*;/g)) {
    const clause = match[0];
    const show = clause.match(/\bshow\s+([\s\S]*)$/);
    if (!show) {
      wildcards.push(clause.replace(/\s+/g, ' ').trim());
      continue;
    }
    for (const name of show[1].replace(/;/g, '').split(',')) {
      const token = name.trim();
      if (token) shown.push(token);
    }
  }
  return {shown, wildcards};
}

const ownedText = readFileSync(ownedPath, 'utf8');
const historicalText = readFileSync(historicalPath, 'utf8');
const owned = parseForwards(ownedText);
const historical = parseForwards(historicalText);
const ownedSet = new Set(owned.shown);
const historicalSet = new Set(historical.shown);
const missing = [...historicalSet].filter(name => !ownedSet.has(name)).sort();
const extra = [...ownedSet].filter(name => !historicalSet.has(name)).sort();
const report = {
  schema_version: 1,
  role: 'named Sass facade inventory',
  historical_sha256: createHash('sha256').update(historicalText).digest('hex'),
  historical_tag: '16.2.14',
  named_historical: historicalSet.size,
  named_owned: ownedSet.size,
  missing_from_owned: missing,
  extra_in_owned: extra,
  unresolved_wildcard_forwards: {
    historical: historical.wildcards,
    owned: owned.wildcards,
  },
  limitations: [
    'Named show-list members only. Wildcard forwards are listed and not expanded.',
    'This is not a compiled Sass seal and not G06.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
if (missing.length) {
  console.error(`Missing historical members: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  named_historical: historicalSet.size,
  named_owned: ownedSet.size,
  extra: extra.length,
  wildcards: owned.wildcards.length,
}, null, 2));

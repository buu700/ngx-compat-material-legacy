#!/usr/bin/env node
/**
 * Map the thirteen companion bridges to public *-overrides mixins.
 *
 *   node scripts/map-companion-bridges.mjs [--line21 <worktree>]
 */
import {mkdirSync, readFileSync, existsSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(root, 'compatibility/rc/reports/companion-bridges.json');
const names = [
  'badge', 'bottom-sheet', 'button-toggle', 'datepicker', 'divider', 'expansion',
  'grid-list', 'icon', 'sidenav', 'stepper', 'sort', 'toolbar', 'tree',
];

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

let line21 = '/home/parallels/ngx-compat-material-legacy-21';
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === '--line21') {
    const value = process.argv[i + 1];
    if (!value || value.startsWith('-')) fail(2, '--line21 requires a path');
    line21 = resolve(value);
    i += 1;
    continue;
  }
  fail(2, `Unknown argument: ${arg}`);
}

function peer(materialRoot) {
  const indexPath = join(materialRoot, '_index.scss');
  const manifestPath = join(materialRoot, 'package.json');
  if (!existsSync(indexPath) || !existsSync(manifestPath)) return {present: false};
  const index = readFileSync(indexPath, 'utf8');
  const version = JSON.parse(readFileSync(manifestPath, 'utf8')).version;
  const rows = names.map(name => {
    const themePath = join(materialRoot, name, `_${name}-theme.scss`);
    const theme = existsSync(themePath) ? readFileSync(themePath, 'utf8') : '';
    return {
      component: name,
      public_name: `${name}-overrides`,
      forwarded: index.includes(`${name}-overrides`),
      local_mixin: theme.includes('@mixin overrides'),
    };
  });
  return {present: true, version, rows};
}

const bridge = readFileSync(join(root, 'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss'), 'utf8');
const calls = names.map(name => ({
  component: name,
  calls_public_override: bridge.includes(`mat.${name}-overrides`),
}));
const main = peer(join(root, 'node_modules/@angular/material'));
const line21Peer = peer(join(line21, 'node_modules/@angular/material'));
const errors = [];
for (const call of calls) {
  if (!call.calls_public_override) errors.push(`bridge does not call mat.${call.component}-overrides`);
}
for (const side of [main, line21Peer]) {
  if (!side.present) {
    errors.push('a support-line Material package is not installed');
    continue;
  }
  for (const row of side.rows) {
    if (!row.forwarded || !row.local_mixin) errors.push(`${side.version} missing ${row.public_name}`);
  }
}
const report = {
  schema_version: 1,
  role: 'companion bridge public override map',
  bridge_calls: calls,
  main,
  line_21: line21Peer,
  limitations: [
    'Name and mixin presence only. No component was rendered.',
    'Token keys inside each override map were not compared.',
    'This is not RC-05-A02.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  bridges: names.length,
  main: main.version,
  line_21: line21Peer.version,
}, null, 2));

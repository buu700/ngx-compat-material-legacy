#!/usr/bin/env node
/**
 * Trace chip, list, and tab product source to owned helpers.
 *
 * Fails if those families import the docs-private ripple renderer or
 * pseudo-checkbox. Records the public Material symbols that list still uses.
 *
 *   node scripts/trace-owned-helpers.mjs [--line21 <worktree>]
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'compatibility/rc/reports/owned-helper-trace.json');

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

const productFiles = [
  'projects/ngx-material-legacy/legacy-chips/chip.ts',
  'projects/ngx-material-legacy/legacy-chips/chips-module.ts',
  'projects/ngx-material-legacy/legacy-list/list.ts',
  'projects/ngx-material-legacy/legacy-list/selection-list.ts',
  'projects/ngx-material-legacy/legacy-list/list-module.ts',
  'projects/ngx-material-legacy/legacy-list/list-option.html',
  'projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts',
  'projects/ngx-material-legacy/legacy-tabs/tabs-module.ts',
  'projects/ngx-material-legacy/legacy-core/ripple/ripple-renderer.ts',
  'projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox.ts',
];

const privateImport = /from\s+['"]@angular\/(?:material|cdk)\/[^'"]*private[^'"]*['"]/;
const privateRenderer = /import\s*\{[^}]*\bRippleRenderer\b[^}]*\}\s*from\s+['"]@angular\/material\/core['"]/;
const privateCheckbox = /import\s*\{[^}]*\bMatPseudoCheckbox\b[^}]*\}\s*from\s+['"]@angular\/material\/core['"]/;

function readRel(base, rel) {
  const path = join(base, rel);
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8');
}

function trace(base) {
  const errors = [];
  const files = {};
  for (const rel of productFiles) {
    const text = readRel(base, rel);
    files[rel] = text;
    if (text == null) {
      errors.push(`missing ${rel}`);
      continue;
    }
    if (privateImport.test(text) || privateRenderer.test(text) || privateCheckbox.test(text)) {
      errors.push(`private upstream import in ${rel}`);
    }
  }
  const chip = files['projects/ngx-material-legacy/legacy-chips/chip.ts'] ?? '';
  const list = files['projects/ngx-material-legacy/legacy-list/list.ts'] ?? '';
  const selection = files['projects/ngx-material-legacy/legacy-list/selection-list.ts'] ?? '';
  const listModule = files['projects/ngx-material-legacy/legacy-list/list-module.ts'] ?? '';
  const optionHtml = files['projects/ngx-material-legacy/legacy-list/list-option.html'] ?? '';
  const tab = files['projects/ngx-material-legacy/legacy-tabs/tab-nav-bar/tab-nav-bar.ts'] ?? '';
  const ripple = files['projects/ngx-material-legacy/legacy-core/ripple/ripple-renderer.ts'] ?? '';
  const checkbox = files['projects/ngx-material-legacy/legacy-core/pseudo-checkbox/pseudo-checkbox.ts'] ?? '';
  const checks = {
    chip_uses_owned_ripple_renderer: chip.includes('LegacyRippleRenderer') && chip.includes('@ngx-compat/material-legacy/legacy-core'),
    list_uses_owned_line_helper: list.includes('legacySetLines') && selection.includes('legacySetLines'),
    list_calls_line_helper: list.includes('legacySetLines(this._lines') && selection.includes('legacySetLines(this._lines'),
    list_uses_owned_pseudo_checkbox: listModule.includes('MatLegacyPseudoCheckboxModule') && optionHtml.includes('<mat-pseudo-checkbox'),
    tab_uses_owned_ripple_renderer: tab.includes('LegacyRippleRenderer') && tab.includes('new RippleRenderer('),
    owned_ripple_does_not_import_material: ripple.length > 0 && !ripple.includes('@angular/material'),
    owned_checkbox_does_not_import_material_checkbox: checkbox.includes("selector: 'mat-pseudo-checkbox'") && !privateCheckbox.test(checkbox),
  };
  for (const [name, ok] of Object.entries(checks)) {
    if (!ok) errors.push(`check failed: ${name}`);
  }
  return {errors, checks};
}

const main = trace(root);
const line21Root = existsSync(join(line21, 'projects/ngx-material-legacy/legacy-list/list.ts')) ? line21 : null;
const line21Trace = line21Root ? trace(line21Root) : null;
const errors = [...main.errors, ...(line21Trace ? line21Trace.errors.map(item => `21.x ${item}`) : [])];
const report = {
  schema_version: 1,
  role: 'owned helper import trace',
  main: {checks: main.checks, errors: main.errors},
  line_21: line21Trace ? {root: line21Root, checks: line21Trace.checks, errors: line21Trace.errors} : {present: false},
  public_upstream_symbols: [
    {symbol: 'MatRippleModule', module: '@angular/material/core', used_by: 'legacy-list and legacy-tabs templates via mat-ripple'},
    {symbol: 'MatLine', module: '@angular/material/core', used_by: 'legacy-list content children'},
    {symbol: 'MatLineModule', module: '@angular/material/core', used_by: 'legacy-list module'},
    {symbol: 'MAT_RIPPLE_GLOBAL_OPTIONS', module: '@angular/material/core', used_by: 'legacy-chips and legacy-tabs'},
  ],
  limitations: [
    'Static import and call-site trace. It does not execute chip, list, or tab tests.',
    'List and tab templates still use the public mat-ripple directive. That is not the docs-private RippleRenderer.',
    'This is not RC-03-A02 and not a G03 gate.',
  ],
};
mkdirSync(dirname(outPath), {recursive: true});
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ok: true, main: main.checks, line_21: line21Trace?.checks ?? null}, null, 2));

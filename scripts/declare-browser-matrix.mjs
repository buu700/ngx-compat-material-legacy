#!/usr/bin/env node
/**
 * Expand the browser matrix from the historical family inventory.
 * Every cell is not-executed. This does not launch a browser.
 *
 *   node scripts/declare-browser-matrix.mjs
 *   node scripts/declare-browser-matrix.mjs --check
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const inventory = JSON.parse(readFileSync(join(root, 'testing/legacy-runner/historical-inventory.json'), 'utf8'));
const families = [...new Set(inventory.rows.map(row => row.family))].sort();
const invalidApplicable = new Set([
  'autocomplete', 'checkbox', 'chips', 'form-field', 'input', 'radio', 'select', 'slide-toggle', 'slider',
]);
const disabledNotApplicable = new Set(['card', 'core', 'dialog', 'progress-bar', 'progress-spinner', 'snack-bar', 'table']);
const focusedNotApplicable = new Set(['card', 'core', 'progress-bar', 'progress-spinner']);
const highRisk = [
  'autocomplete', 'chips', 'dialog', 'form-field', 'input', 'list', 'menu', 'select', 'slider', 'snack-bar', 'tabs', 'tooltip',
];
const lines = ['main', '21.x'];
const runtimes = ['zoneful', 'zoneless'];
const releaseEngines = ['chromium', 'firefox', 'webkit'];
const states = ['default', 'disabled', 'invalid', 'focused', 'light', 'dark', 'rtl', 'density'];

function applicability(family, state) {
  if (state === 'invalid' && !invalidApplicable.has(family)) {
    return 'a value-less family has no required or invalid state';
  }
  if (state === 'disabled' && disabledNotApplicable.has(family)) {
    return 'this family is not a disableable control';
  }
  if (state === 'focused' && focusedNotApplicable.has(family)) {
    return 'this family has no keyboard focus target';
  }
  return null;
}

const cells = [];
for (const stage of ['pr', 'release']) {
  for (const family of families) {
    for (const line of lines) {
      for (const runtime of runtimes) {
        for (const state of states) {
          const reason = applicability(family, state);
          const engines = stage === 'release'
            ? releaseEngines
            : (highRisk.includes(family) ? releaseEngines : ['chromium']);
          for (const engine of engines) {
            cells.push({
              id: `${stage}/${line}/${engine}/${runtime}/${family}/${state}`,
              stage,
              line,
              engine,
              runtime,
              family,
              state,
              applicability: reason ? 'not-applicable' : 'required',
              reason,
              status: 'not-executed',
            });
          }
        }
      }
    }
  }
}

const notApplicable = new Map();
const requiredIds = [];
for (const cell of cells) {
  if (cell.applicability === 'required') requiredIds.push(cell.id);
  else {
    const ids = notApplicable.get(cell.reason) ?? [];
    ids.push(cell.id);
    notApplicable.set(cell.reason, ids);
  }
}
// Cross-cutting CSP-nonce cells (PR Chromium dialog only; not a full CSP roster).
const cspCells = [];
for (const line of lines) {
  for (const runtime of runtimes) {
    cspCells.push({
      id: `pr/${line}/chromium/${runtime}/dialog/csp-nonce`,
      stage: 'pr',
      line,
      engine: 'chromium',
      runtime,
      family: 'dialog',
      state: 'csp-nonce',
      applicability: 'required',
      reason: null,
      status: 'not-executed',
      cross_cutting: 'csp-nonce',
    });
  }
}
for (const cell of cspCells) {
  cells.push(cell);
  requiredIds.push(cell.id);
}

const declared = {
  schema_version: 1,
  role: 'declared browser matrix',
  families,
  family_count: families.length,
  high_risk: highRisk,
  lines,
  hydration: 'not claimed',
  unexpanded: ['enabled-motion', 'ssr'],
  partially_expanded: {
    'csp-nonce': {
      scope: 'pr/chromium/dialog/{zoneful,zoneless} on both lines',
      cell_ids: cspCells.map(cell => cell.id),
    },
  },
  cell_count: cells.length,
  required_count: requiredIds.length,
  not_applicable_count: cells.length - requiredIds.length,
  executed_count: 0,
  required_ids: requiredIds,
  not_applicable: [...notApplicable.entries()].map(([reason, ids]) => ({reason, ids})),
  limitations: [
    'No browser was launched.',
    'CSP-nonce is partially expanded (PR Chromium dialog only); Firefox/WebKit and other families stay out.',
    'Enabled-motion and SSR rosters remain unexpanded.',
    'This is not RC-07-A02.',
  ],
};

const outPath = join(root, 'compatibility/rc/matrices/browser-matrix.json');
const text = JSON.stringify(declared, null, 2) + '\n';
const missingRisk = highRisk.filter(family => !families.includes(family));
if (families.length !== 22 || !families.includes('core') || missingRisk.length) {
  console.error(`expected 21 families plus core, found ${families.length}; missing risk: ${missingRisk.join(', ')}`);
  process.exit(1);
}
if (declared.executed_count !== 0 || declared.required_count + declared.not_applicable_count !== declared.cell_count) {
  console.error('declared cell counts do not add up');
  process.exit(1);
}
if (check) {
  const current = readFileSync(outPath, 'utf8');
  if (current !== text) {
    console.error('browser matrix drifted from the inventory');
    process.exit(1);
  }
} else {
  writeFileSync(outPath, text);
}
console.log(JSON.stringify({
  families: families.length,
  cell_count: declared.cell_count,
  required_count: declared.required_count,
  not_applicable_count: declared.not_applicable_count,
  executed_count: 0,
}, null, 2));

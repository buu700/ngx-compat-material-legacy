#!/usr/bin/env node
/**
 * Execute a real Chromium browser slice against a packed artifact and credit
 * only the declared matrix cells that actually ran.
 *
 * PR-stage Chromium main-line slice: dialog/select (zoneful/zoneless/CSP/
 * reduced-motion) plus menu/snack-bar/tooltip/autocomplete/tabs defaults.
 * Does not fan success into unexecuted engines/families. Does not claim G10.
 *
 *   node scripts/run-browser-matrix-slice.mjs --tarball <path>
 *   node scripts/run-browser-matrix-slice.mjs --run <run.json>
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseLegacyArgs, resolveLibraryFromRun, sha256File} from './resolve-run-library.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const matrixPath = join(root, 'compatibility/rc/matrices/browser-matrix.json');
const reportPath = join(root, 'compatibility/rc/reports/browser-matrix-slice.json');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

const {runPath, tarball: tarballArg, unknown} = parseLegacyArgs(process.argv.slice(2));
if (unknown.length) fail(2, `Unknown argument: ${unknown[0]}`);

let tarball;
let runId = null;
if (runPath) {
  const resolved = resolveLibraryFromRun(runPath);
  tarball = resolved.tarball;
  runId = resolved.runId;
} else if (tarballArg) {
  tarball = tarballArg;
} else {
  fail(2, '--tarball or --run is required');
}
if (!existsSync(tarball)) fail(2, `Missing tarball: ${tarball}`);
if (!existsSync(matrixPath)) fail(2, `Missing declared matrix: ${matrixPath}`);

const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));
const tarballSha = sha256File(tarball);

const scenarios = [
  {
    id: 'dialog-escape-zoneful',
    script: 'scripts/browser-dialog-escape.mjs',
    args: [],
    cells: [
      'pr/main/chromium/zoneful/dialog/default',
      'pr/main/chromium/zoneful/dialog/focused',
      'pr/main/chromium/zoneful/select/default',
    ],
    detail: 'compatibility/rc/reports/browser-dialog-escape.json',
    require: report => report.opened && report.closed_by_escape
      && report.focus_restored_to_open_button
      && report.select_panel_opened && report.select_panel_closed_by_escape
      && report.dialog_transition_on_container
      && !report.error,
  },
  {
    id: 'dialog-reduced-motion',
    script: 'scripts/browser-dialog-escape.mjs',
    args: ['--reduced-motion'],
    cells: [
      'pr/main/chromium/zoneful/dialog/default',
    ],
    credit_as: 'reduced-motion-overlay',
    detail: 'compatibility/rc/reports/browser-dialog-reduced-motion.json',
    require: report => report.opened && report.closed_by_escape
      && report.dialog_noop_under_reduced_motion === true
      && !report.error,
  },
  {
    id: 'dialog-zoneless',
    script: 'scripts/browser-dialog-escape.mjs',
    args: ['--zoneless'],
    cells: [
      'pr/main/chromium/zoneless/dialog/default',
      'pr/main/chromium/zoneless/select/default',
    ],
    detail: 'compatibility/rc/reports/browser-dialog-zoneless.json',
    require: report => report.opened && report.closed_by_escape
      && report.bundle_has_zone === false
      && (report.zone_global === false || report.zone_global === 'undefined' || report.zone_global == null)
      && !report.error,
  },
  {
    id: 'dialog-csp-nonce',
    script: 'scripts/browser-dialog-escape.mjs',
    args: ['--csp'],
    cells: [
      'pr/main/chromium/zoneful/dialog/csp-nonce',
    ],
    credit_as: 'csp-nonce-dialog',
    detail: 'compatibility/rc/reports/browser-dialog-csp.json',
    require: report => report.missing_nonce_detected === true
      && report.dialog_opened_with_nonce === true
      && report.nonce_clean === true
      && report.styles_with_nonce > 0
      && !report.error,
  },
  {
    id: 'overlay-families-zoneful',
    script: 'scripts/browser-overlay-families.mjs',
    args: [],
    cells: [
      'pr/main/chromium/zoneful/menu/default',
      'pr/main/chromium/zoneful/snack-bar/default',
      'pr/main/chromium/zoneful/tooltip/default',
      'pr/main/chromium/zoneful/autocomplete/default',
      'pr/main/chromium/zoneful/tabs/default',
    ],
    detail: 'compatibility/rc/reports/browser-overlay-families.json',
    require: report => Array.isArray(report.credited_cell_ids)
      && report.credited_cell_ids.length >= 5
      && report.families?.menu?.opened
      && report.families?.menu?.closed_by_escape
      && report.families?.['snack-bar']?.opened
      && report.families?.['snack-bar']?.dismissed
      && report.families?.tooltip?.shown
      && report.families?.autocomplete?.panel_opened
      && report.families?.tabs?.second_selected
      && !report.error,
  },
];

const executed = [];
const failed = [];
const scenarioResults = [];

const nodeArgs = typeof globalThis.WebSocket === 'function'
  ? []
  : ['--experimental-websocket'];

function freeCdpPort(port) {
  spawnSync('bash', ['-lc', `fuser -k ${port}/tcp >/dev/null 2>&1 || true`], {
    encoding: 'utf8',
    timeout: 5000,
  });
}

for (const scenario of scenarios) {
  freeCdpPort(scenario.script.includes('overlay') ? 9334 : 9333);
  const result = spawnSync(
    process.execPath,
    [...nodeArgs, join(root, scenario.script), '--tarball', tarball, ...scenario.args],
    {cwd: root, encoding: 'utf8', timeout: 300000, env: {...process.env, NODE_PATH: '', NODE_OPTIONS: ''}},
  );
  const detailPath = join(root, scenario.detail);
  let detail = null;
  if (existsSync(detailPath)) {
    detail = JSON.parse(readFileSync(detailPath, 'utf8'));
  }
  const ok = result.status === 0 && detail && scenario.require(detail);
  const entry = {
    scenario: scenario.id,
    exit_code: result.status,
    ok,
    cells: scenario.cells,
    credit_as: scenario.credit_as ?? null,
    detail_report: detailPath,
    stderr_tail: (result.stderr || '').slice(-800),
  };
  scenarioResults.push(entry);
  if (ok) {
    for (const cellId of scenario.cells) {
      executed.push(cellId);
    }
  } else {
    failed.push(scenario.id);
  }
}

const uniqueExecuted = [...new Set(executed)];
// Validate credited cells exist in the declared matrix required set.
const unknownCells = uniqueExecuted.filter(id => !(matrix.required_ids || []).includes(id));
const ok = failed.length === 0 && uniqueExecuted.length > 0 && unknownCells.length === 0;

const report = {
  schema_version: 1,
  role: 'executed browser matrix slice (not full matrix)',
  check_id: 'browser-matrix',
  run_id: runId,
  tarball_sha256: tarballSha,
  declared_cell_count: matrix.cell_count,
  declared_required_count: matrix.required_count,
  executed_cell_ids: uniqueExecuted,
  executed_count: uniqueExecuted.length,
  failed_scenarios: failed,
  scenario_results: scenarioResults,
  unknown_credited_cells: unknownCells,
  result: ok ? 'pass' : 'fail',
  matrix_updated: false,
  limitations: [
    'Chromium PR-slice: dialog/select (zoneful/zoneless/CSP/reduced-motion) plus menu/snack-bar/tooltip/autocomplete/tabs defaults.',
    'Firefox/WebKit, remaining families/states, SSR, enabled-motion, and other CSP cells stay not-executed.',
    'Success is not copied to unexecuted cells.',
    'Does not claim G10.',
  ],
};

mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  ok,
  executed_count: uniqueExecuted.length,
  failed_scenarios: failed,
  tarball_sha256: tarballSha,
}, null, 2));

if (!ok) {
  fail(1, `browser-matrix slice failed: scenarios=${failed.join(',') || 'none'}; unknown_cells=${unknownCells.join(',') || 'none'}`);
}

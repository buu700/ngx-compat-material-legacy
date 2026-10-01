#!/usr/bin/env node
/**
 * Execute a real Chromium browser slice against a packed artifact and credit
 * only the declared matrix cells that actually ran.
 *
 * PR-stage dialog family, Chromium, main line, zoneful + zoneless, default
 * state, plus reduced-motion evidence. Does not fan success into unexecuted
 * engines/families. Does not claim G10.
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
    args: [],
    cells: [
      'pr/main/chromium/zoneful/dialog/default',
      'pr/main/chromium/zoneful/dialog/focused',
      'pr/main/chromium/zoneful/select/default',
    ],
    require: report => report.opened && report.closed_by_escape
      && report.focus_restored_to_open_button
      && report.select_panel_opened && report.select_panel_closed_by_escape
      && report.dialog_transition_on_container
      && !report.error,
  },
  {
    id: 'dialog-reduced-motion',
    args: ['--reduced-motion'],
    cells: [
      'pr/main/chromium/zoneful/dialog/default',
    ],
    credit_as: 'reduced-motion-overlay',
    require: report => report.opened && report.closed_by_escape
      && report.dialog_noop_under_reduced_motion === true
      && !report.error,
  },
  {
    id: 'dialog-zoneless',
    args: ['--zoneless'],
    cells: [
      'pr/main/chromium/zoneless/dialog/default',
      'pr/main/chromium/zoneless/select/default',
    ],
    require: report => report.opened && report.closed_by_escape
      && report.bundle_has_zone === false
      && (report.zone_global === false || report.zone_global === 'undefined' || report.zone_global == null)
      && !report.error,
  },
  {
    id: 'dialog-csp-nonce',
    args: ['--csp'],
    cells: [
      'pr/main/chromium/zoneful/dialog/csp-nonce',
    ],
    credit_as: 'csp-nonce-dialog',
    require: report => report.missing_nonce_detected === true
      && report.dialog_opened_with_nonce === true
      && report.nonce_clean === true
      && report.styles_with_nonce > 0
      && !report.error,
  },
];

const executed = [];
const failed = [];
const scenarioResults = [];

for (const scenario of scenarios) {
  const result = spawnSync(
    process.execPath,
    [join(root, 'scripts/browser-dialog-escape.mjs'), '--tarball', tarball, ...scenario.args],
    {cwd: root, encoding: 'utf8', timeout: 300000, env: {...process.env, NODE_PATH: '', NODE_OPTIONS: ''}},
  );
  // browser-dialog-escape writes different report paths per flag
  let detailPath = join(root, 'compatibility/rc/reports/browser-dialog-escape.json');
  if (scenario.args.includes('--reduced-motion')) {
    detailPath = join(root, 'compatibility/rc/reports/browser-dialog-reduced-motion.json');
  } else if (scenario.args.includes('--zoneless')) {
    detailPath = join(root, 'compatibility/rc/reports/browser-dialog-zoneless.json');
  } else if (scenario.args.includes('--csp')) {
    detailPath = join(root, 'compatibility/rc/reports/browser-dialog-csp.json');
  }
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
      if (!matrix.required_ids.includes(cellId) && !matrix.required_ids?.includes?.(cellId)) {
        // Still record; declare-browser-matrix may use required_ids array.
      }
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
    'Only the dialog/select Chromium PR-slice plus dialog CSP-nonce above was executed.',
    'Firefox/WebKit, remaining families/states, SSR, enabled-motion, and non-dialog CSP cells stay not-executed.',
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

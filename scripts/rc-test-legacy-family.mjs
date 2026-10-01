#!/usr/bin/env node
/**
 * Run historical families. Workspace-dist is the local iteration default.
 * Pass --run <run.json> to bind to a rehashed packed library artifact.
 *
 *   node scripts/rc-test-legacy-family.mjs --family card
 *   node scripts/rc-test-legacy-family.mjs --family card --run artifacts/main/entry-…/run.json
 *   node scripts/rc-test-legacy-family.mjs --run artifacts/main/entry-…/run.json
 *
 * Full-suite --run without --family does not imply G09 closure by itself.
 */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  extractLibraryPackage,
  parseLegacyArgs,
  resolveLibraryFromRun,
  workspaceDistPackage,
} from './resolve-run-library.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inventory = JSON.parse(
  fs.readFileSync(path.join(root, 'testing/legacy-runner/historical-inventory.json'), 'utf8'),
);
const known = [...new Set(inventory.rows.map(row => row.family))].sort();

const {runPath, family, tarball, unknown} = parseLegacyArgs(process.argv.slice(2));
if (unknown.length) {
  console.error(`Unknown argument(s): ${unknown.join(' ')}`);
  console.error(
    'usage: node scripts/rc-test-legacy-family.mjs [--family <name>] [--run <run.json>]',
  );
  console.error(`known families: ${known.join(', ')}`);
  process.exit(2);
}
if (!family && !runPath) {
  console.error(
    'usage: node scripts/rc-test-legacy-family.mjs --family <name> [--run <run.json>]',
  );
  console.error('       node scripts/rc-test-legacy-family.mjs --run <run.json>');
  console.error(`known families: ${known.join(', ')}`);
  process.exit(2);
}
if (family && !known.includes(family)) {
  console.error(`Unknown historical family "${family}". Known: ${known.join(', ')}`);
  process.exit(1);
}

let subjectMode = 'workspace-dist';
let packageRoot = null;
let runDir = null;
let runId = null;
let artifactSha = null;

if (runPath) {
  const resolved = resolveLibraryFromRun(runPath, {tarball});
  const extracted = extractLibraryPackage(resolved.tarball, {
    parentDir: path.join(resolved.runDir, `legacy-extract-${Date.now()}`),
  });
  subjectMode = 'artifact';
  packageRoot = extracted.packageRoot;
  runDir = resolved.runDir;
  runId = resolved.runId;
  artifactSha = resolved.digest;
  console.log(
    `legacy-subject: artifact mode run_id=${runId} sha256=${artifactSha.slice(0, 12)} package=${packageRoot}`,
  );
  if (family) {
    console.log(
      `legacy-subject: family=${family} only; unselected families do not count toward the full historical gate`,
    );
  }
} else {
  packageRoot = workspaceDistPackage();
  console.log(`legacy-subject: workspace-dist iteration package=${packageRoot}`);
}

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
let relativeReport;
if (runDir) {
  const reportName = family
    ? `legacy-${family}-${stamp}.json`
    : `legacy-full-${stamp}.json`;
  relativeReport = path.relative(root, path.join(runDir, 'reports', reportName));
} else if (family) {
  relativeReport = path.join('compatibility/rc/reports', `legacy-${family}.json`);
} else {
  relativeReport = path.join('compatibility/rc/reports', `legacy-full-${stamp}.json`);
}

const absReport = path.join(root, relativeReport);
fs.mkdirSync(path.dirname(absReport), {recursive: true});
// Freshness: never let a prior browser JSON survive a failed/aborted run.
if (fs.existsSync(absReport)) fs.rmSync(absReport);

const child = spawnSync(process.execPath, ['scripts/run-legacy-tests.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    LEGACY_SPEC_FAMILY: family || '',
    LEGACY_RESULTS_PATH: relativeReport,
    LEGACY_PACKAGE_ROOT: packageRoot,
    LEGACY_SUBJECT_MODE: subjectMode,
    LEGACY_RUN_ID: runId || '',
    LEGACY_ARTIFACT_SHA256: artifactSha || '',
  },
});
process.exit(child.status ?? 1);

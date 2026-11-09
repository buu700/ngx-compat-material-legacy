#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {writeKarmaOutcome} = createRequire(import.meta.url)('../testing/legacy-runner/karma-outcome.cjs');
const {validReceipt, deliberateFailOutcome, browserProcesses} = createRequire(import.meta.url)('../testing/legacy-runner/owned-chrome-lifecycle.cjs');
const expectFail = process.env.LEGACY_TESTS_EXPECT_FAIL === '1';
const subjectMode = process.env.LEGACY_SUBJECT_MODE || 'workspace-dist';
const packageRoot =
  process.env.LEGACY_PACKAGE_ROOT || path.join(root, 'dist/ngx-material-legacy');

if (!process.env.CHROME_BIN) {
  for (const candidate of [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ]) {
    if (fs.existsSync(candidate)) {
      process.env.CHROME_BIN = candidate;
      break;
    }
  }
}

function runDetailed(cmd, args, env = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  return spawnSync(cmd, args, {cwd: root, env: {...process.env, ...env}, stdio: 'inherit'});
}
function run(cmd, args, env = {}) {
  const result = runDetailed(cmd, args, env);
  return result.error || result.signal ? 1 : result.status ?? 1;
}

if (!fs.existsSync(path.join(packageRoot, 'package.json'))) {
  console.error(`Package root missing package.json: ${packageRoot}`);
  if (subjectMode === 'artifact') {
    console.error('Artifact mode requires an extracted packed library; refusing workspace-dist fallback.');
  } else {
    console.error('dist/ngx-material-legacy missing; run ng-packagr / pack:lib first');
  }
  process.exit(1);
}

if (subjectMode === 'artifact') {
  const dist = path.resolve(root, 'dist/ngx-material-legacy');
  const projects = path.resolve(root, 'projects/ngx-material-legacy');
  const resolvedPkg = path.resolve(packageRoot);
  const under = (parent, target) => {
    const rel = path.relative(parent, target);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  };
  if (under(dist, resolvedPkg) || under(projects, resolvedPkg)) {
    console.error(`Artifact mode package root is inside workspace build/source: ${resolvedPkg}`);
    process.exit(1);
  }
}

console.log(`legacy-tests: subject_mode=${subjectMode} package_root=${packageRoot}`);

let code = run(process.execPath, ['testing/legacy-runner/build.mjs'], {
  LEGACY_TESTS_EXPECT_FAIL: expectFail ? '1' : '0',
  LEGACY_PACKAGE_ROOT: packageRoot,
  LEGACY_SUBJECT_MODE: subjectMode,
  LEGACY_TYPES_ROOT: path.join(packageRoot, 'types'),
});
if (code !== 0) process.exit(code);

const resultsPath = process.env.LEGACY_RESULTS_PATH
  ? path.resolve(root, process.env.LEGACY_RESULTS_PATH)
  : path.join(root, 'compatibility/f08/legacy-test-results.json');
// Freshness before browser start: remove any prior JSON at the destination.
if (fs.existsSync(resultsPath)) fs.rmSync(resultsPath);

// A new private directory and nonce belong to this one Karma browser only.
const lifecycleDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'legacy-browser-lifecycle-'));
fs.chmodSync(lifecycleDir, 0o700);
const browserProfile = path.join(lifecycleDir, 'profile');fs.mkdirSync(browserProfile, {mode: 0o700});
const browserNonce = randomBytes(16).toString('hex');
const browserReceipt = path.join(lifecycleDir, 'lifecycle.json');
const browserBaseline = browserProcesses();
const karmaBin = path.join(root, 'node_modules/karma/bin/karma');
const karmaOutcome = runDetailed(process.execPath, [karmaBin, 'start', 'testing/legacy-runner/karma.conf.cjs'], {
  LEGACY_TESTS_EXPECT_FAIL: expectFail ? '1' : '0',
  LEGACY_PACKAGE_ROOT: packageRoot,
  LEGACY_SUBJECT_MODE: subjectMode,
  LEGACY_BROWSER_PROFILE: browserProfile,
  LEGACY_BROWSER_NONCE: browserNonce,
  LEGACY_BROWSER_LIFECYCLE: browserReceipt,
  LEGACY_BROWSER_BASELINE: JSON.stringify(browserBaseline),
});
code = karmaOutcome.error || karmaOutcome.signal ? 1 : karmaOutcome.status ?? 1;
let karmaOutcomeRetained = false;
const karmaOutcomePath = `${resultsPath}.karma-outcome-${browserNonce}.json`;
try {
  writeKarmaOutcome(karmaOutcomePath, karmaOutcome, browserNonce);
  karmaOutcomeRetained = true;
  console.log(`Raw Karma child outcome: ${karmaOutcomePath}`);
} catch (error) {
  code = code || 1;
  console.error(`Cannot retain raw Karma child outcome: ${error.message}`);
}
let browserLifecycle;
let lifecyclePassed = false;
try {
  browserLifecycle = JSON.parse(fs.readFileSync(browserReceipt, 'utf8'));
  if (!validReceipt(browserLifecycle, {profile: browserProfile, nonce: browserNonce})) {
    throw new Error('browser lifecycle receipt incomplete or failed');
  }
  lifecyclePassed = true;
} catch (error) {
  code = code || 1;
  console.error(`Legacy browser lifecycle failed: ${error.message}; evidence=${browserReceipt}`);
}
if (fs.existsSync(browserReceipt)) {
  const retained = `${resultsPath}.browser-lifecycle-${browserNonce}.json`;
  fs.copyFileSync(browserReceipt, retained, fs.constants.COPYFILE_EXCL);
  console.log(`Legacy browser lifecycle receipt: ${retained}`);
} else {
  console.error(`Legacy browser lifecycle receipt missing: ${browserReceipt}`);
}


if (!fs.existsSync(resultsPath)) {
  console.error('Missing results JSON at', resultsPath);
  process.exit(code || 1);
}
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
console.log('Legacy test totals:', results.totals);
console.log(
  `Legacy subject: mode=${results.subject_mode || subjectMode} package=${results.package_root || packageRoot}`,
);
if (expectFail) {
  const outcome = deliberateFailOutcome(lifecyclePassed && karmaOutcomeRetained, results, karmaOutcome);
  if (outcome === 0) console.log('PROOF OK: deliberate failing assertion was observed.');
  else console.error('PROOF FAILED: deliberate fail or browser lifecycle evidence missing.');
  process.exit(outcome);
}
if (subjectMode === 'artifact' && results.subject_mode !== 'artifact') {
  console.error('Artifact mode run produced a non-artifact subject_mode in the report');
  process.exit(1);
}
const executed = results.totals?.executed ?? 0;
if (executed === 0) {
  console.error('Historical runner executed zero tests');
  process.exit(1);
}
const failed = results.totals?.failed ?? 0;
const skipped = results.totals?.skipped ?? 0;
const subset = process.env.LEGACY_SPEC_FILTER != null || process.env.LEGACY_SPEC_FAMILY;
const mapped = (results.mapped_specs || []).length;
if (!subset && mapped < 57) {
  console.error(`Historical reconciliation listed ${mapped} paths, expected 57`);
  process.exit(1);
}
if (subset && mapped === 0) {
  console.error('Historical selection matched no specs');
  process.exit(1);
}
if (skipped > 0) {
  console.error(`Unexplained skipped tests: ${skipped}`);
  process.exit(1);
}
if (failed > 0 || code !== 0) process.exit(1);
process.exit(0);

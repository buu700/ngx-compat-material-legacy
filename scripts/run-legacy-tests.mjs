#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

function run(cmd, args, env = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {cwd: root, env: {...process.env, ...env}, stdio: 'inherit'});
  return r.status ?? 1;
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

const karmaBin = path.join(root, 'node_modules/karma/bin/karma');
code = run(process.execPath, [karmaBin, 'start', 'testing/legacy-runner/karma.conf.cjs'], {
  LEGACY_TESTS_EXPECT_FAIL: expectFail ? '1' : '0',
  LEGACY_PACKAGE_ROOT: packageRoot,
  LEGACY_SUBJECT_MODE: subjectMode,
});

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
  if (results.deliberate_fail_observed) {
    console.log('PROOF OK: deliberate failing assertion was observed.');
    process.exit(0);
  }
  console.error('PROOF FAILED: deliberate fail not observed.');
  process.exit(1);
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

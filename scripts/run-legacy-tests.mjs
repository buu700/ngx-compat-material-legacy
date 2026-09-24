#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectFail = process.env.LEGACY_TESTS_EXPECT_FAIL === '1';

function run(cmd, args, env = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {cwd: root, env: {...process.env, ...env}, stdio: 'inherit'});
  return r.status ?? 1;
}

if (!fs.existsSync(path.join(root, 'dist/ngx-material-legacy/package.json'))) {
  console.error('dist/ngx-material-legacy missing; run ng-packagr / pack:lib first');
  process.exit(1);
}

let code = run(process.execPath, ['testing/legacy-runner/build.mjs'], {
  LEGACY_TESTS_EXPECT_FAIL: expectFail ? '1' : '0',
});
if (code !== 0) process.exit(code);

const karmaBin = path.join(root, 'node_modules/karma/bin/karma');
code = run(process.execPath, [karmaBin, 'start', 'testing/legacy-runner/karma.conf.cjs'], {
  LEGACY_TESTS_EXPECT_FAIL: expectFail ? '1' : '0',
});

const resultsPath = path.join(root, 'compatibility/f08/legacy-test-results.json');
if (!fs.existsSync(resultsPath)) {
  console.error('Missing results JSON at', resultsPath);
  process.exit(code || 1);
}
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
console.log('Legacy test totals:', results.totals);
if (expectFail) {
  if (results.deliberate_fail_observed) {
    console.log('PROOF OK: deliberate failing assertion was observed.');
    process.exit(0);
  }
  console.error('PROOF FAILED: deliberate fail not observed.');
  process.exit(1);
}
const failed = results.totals?.failed ?? 0;
if (failed > 0 || code !== 0) process.exit(1);
process.exit(0);

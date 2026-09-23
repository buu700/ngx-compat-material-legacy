#!/usr/bin/env node
/**
 * Fixture runner for migrate-legacy Sass/TS rewrites (no @angular-devkit required).
 * Reads fixtures/migration/cases.json (also mirrored under compatibility/handoff/fixtures/migration/).
 */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const casesPath = join(root, 'fixtures/migration/cases.json');
const {applyFixtureCase: applySass} = require(
  join(root, 'projects/ngx-material-legacy/schematics/migrate-legacy/sass-rewrite.js'),
);
const {applyFixtureCase: applyTs} = require(
  join(root, 'projects/ngx-material-legacy/schematics/migrate-legacy/ts-rewrite.js'),
);

const data = JSON.parse(readFileSync(casesPath, 'utf8'));
let failed = 0;
for (const c of data.cases) {
  const apply = c.language === 'scss' ? applySass : applyTs;
  // Skip TS cases that are explicitly out of migrate-legacy default scope when
  // they are ordinary/non-legacy (ordinary-import, app-provider, arbitrary-string, shadowed-require).
  const result = apply(c);
  const mark = result.pass ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${c.id}  (${c.language})  ${result.detail}`);
  if (!result.pass) {
    failed += 1;
    if (result.result?.content != null && c.expected_after != null) {
      console.log('  expected:', JSON.stringify(c.expected_after));
      console.log('  actual  :', JSON.stringify(result.result.content));
    }
    if (result.result?.diagnostics?.length) {
      console.log('  diagnostics:', result.result.diagnostics);
    }
  }
}
if (failed) {
  console.error(`\n${failed} fixture case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${data.cases.length} fixture cases passed`);

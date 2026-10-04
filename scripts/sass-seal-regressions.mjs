#!/usr/bin/env node
/**
 * Ordered-CSS roster regressions for sass-seal.
 * Case ids are existing strict fixture ids. 21.x and unexecuted groups stay null.
 * A mutated candidate must not match the sealed reference.
 */
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  ORDERED_CSS_FIXTURE_IDS,
  UNRESOLVED_STRICT_CSS,
  EMPTY_DEBUG_CSS,
  BRIDGE_REVIEW_FIXTURES,
  rosterProblems,
  writeReferenceCss,
  compareOrderedCss,
  orderedCssResults,
  writeOrderedCssAssertions,
} from './sass-ordered-css.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
const row = matrix.checks.find(item => item.check_id === 'sass-seal');
assert.deepEqual(row.acceptance.cases_by_line.main['ordered-css-dom'], [...ORDERED_CSS_FIXTURE_IDS]);
assert.equal(row.acceptance.cases_by_line.main['sass-api-and-values'], null);
assert.equal(row.acceptance.cases_by_line.main['isolation-negatives'], null);
for (const group of Object.keys(row.acceptance.cases_by_line['21.x'])) {
  assert.equal(row.acceptance.cases_by_line['21.x'][group], null, group);
}
assert.deepEqual(rosterProblems(), []);
for (const id of [...UNRESOLVED_STRICT_CSS, ...EMPTY_DEBUG_CSS, ...BRIDGE_REVIEW_FIXTURES]) {
  assert.equal(ORDERED_CSS_FIXTURE_IDS.includes(id), false, id);
}

const scratch = mkdtempSync(join(tmpdir(), 'sass-seal-reg-'));
try {
  const reference = join(scratch, 'reference');
  const candidate = join(scratch, 'candidate');
  writeReferenceCss(reference);
  cpSync(reference, candidate, {recursive: true});
  const exactReport = join(scratch, 'exact.json');
  const exact = compareOrderedCss(reference, candidate, exactReport);
  assert.equal(exact.status, 0);
  const exactResults = orderedCssResults(exact.report);
  assert.deepEqual(exactResults.map(item => item.case_id), [...ORDERED_CSS_FIXTURE_IDS]);
  assert.equal(exactResults.every(item => item.result === 'pass'), true);

  const mutatedPath = join(candidate, 'owned-legacy-card.css');
  writeFileSync(mutatedPath, readFileSync(mutatedPath, 'utf8') + '\n/* mutated */\n');
  const mutatedReport = join(scratch, 'mutated.json');
  const mutated = compareOrderedCss(reference, candidate, mutatedReport);
  assert.notEqual(mutated.status, 0);
  const mutatedResults = orderedCssResults(mutated.report);
  assert.deepEqual(
    mutatedResults.filter(item => item.result !== 'pass').map(item => item.case_id),
    ['owned-legacy-card'],
  );

  const outputDir = join(scratch, 'evidence', 'sass-seal', 'reginvoke');
  mkdirSync(outputDir, {recursive: true});
  const written = writeOrderedCssAssertions(outputDir, exactResults);
  assert.equal(written.length, ORDERED_CSS_FIXTURE_IDS.length);
  const sample = JSON.parse(readFileSync(join(outputDir, '01-palette-values.json'), 'utf8'));
  assert.equal(sample.case_id, '01-palette-values');
  assert.equal(sample.kind, 'assertion');
  assert.equal(sample.result, 'pass');
} finally {
  rmSync(scratch, {recursive: true, force: true});
}

console.log(`sass-seal regressions passed (${ORDERED_CSS_FIXTURE_IDS.length} ordered-css cases)`);

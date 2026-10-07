#!/usr/bin/env node
/**
 * Ordered-CSS and isolation-negative roster regressions for sass-seal.
 * Ordered-CSS ids are every non-debug fixture id. Isolation negatives are the
 * archived import, mutated golden, hidden resolution and API drift cases the
 * seal runner executes. sass-api-and-values is the predeclared oracle roster
 * (see sass-api-regressions.mjs). Every main group stays null on this branch.
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
import {
  ISOLATION_NEGATIVE_IDS,
  apiDriftAssertion,
  foreignLoads,
  runHiddenResolutionNegative,
  archivedImportAssertion,
  mutatedGoldenAssertion,
  runArchivedImportNegative,
  runMutatedGoldenNegative,
  writeIsolationNegativeAssertions,
} from './sass-seal.mjs';
import {apiCaseIds, apiDriftNegative} from './sass-api-inventory.mjs';
import {functionCaseIds} from './sass-function-contracts.mjs';
import {mixinArgumentCaseIds} from './sass-mixin-arguments.mjs';
import {ownedAggregateCaseIds} from './sass-owned-aggregates.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
const row = matrix.checks.find(item => item.check_id === 'sass-seal');
assert.deepEqual(row.acceptance.cases_by_line['21.x']['ordered-css-dom'], [...ORDERED_CSS_FIXTURE_IDS]);
const apiOracle = JSON.parse(readFileSync(join(root, 'compatibility/rc/oracles/material-16.2.14-sass-api.json'), 'utf8'));
assert.deepEqual(row.acceptance.cases_by_line['21.x']['sass-api-and-values'], [...apiCaseIds(apiOracle),...functionCaseIds(),...mixinArgumentCaseIds(),...ownedAggregateCaseIds()]);
assert.deepEqual(row.acceptance.cases_by_line['21.x']['isolation-negatives'], [...ISOLATION_NEGATIVE_IDS]);
assert.deepEqual([...ISOLATION_NEGATIVE_IDS], ['archived-import', 'mutated-golden', 'hidden-resolution', 'api-drift']);
for (const id of ['05-custom-map-nested', 'owned-legacy-button', 'owned-legacy-select', 'owned-legacy-snack-bar']) {
  assert.equal(ORDERED_CSS_FIXTURE_IDS.includes(id), true, id);
}
assert.equal(UNRESOLVED_STRICT_CSS.length, 0);
assert.equal(BRIDGE_REVIEW_FIXTURES.length, 0);
for (const group of Object.keys(row.acceptance.cases_by_line.main)) {
  assert.equal(row.acceptance.cases_by_line.main[group], null, group);
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

  const sealedCard = join(root, 'reference/material-16.2.14/sass-css/owned-legacy-card.css');
  const sealedBefore = readFileSync(sealedCard);
  const emptyLoadPath = join(scratch, 'empty-load-path');
  mkdirSync(emptyLoadPath);
  const archived = runArchivedImportNegative([emptyLoadPath]);
  const mutatedGolden = runMutatedGoldenNegative();
  assert.equal(readFileSync(sealedCard).equals(sealedBefore), true);
  assert.equal(archived.case_id, 'archived-import');
  assert.equal(archived.compiled, false);
  assert.equal(archived.rejected, true);
  assert.equal(archived.result, 'pass');
  assert.match(archived.error, /refused archived import: @material\/button/);
  assert.equal(archivedImportAssertion({compiled: true, error: null}).result, 'fail');
  assert.equal(mutatedGolden.case_id, 'mutated-golden');
  assert.equal(mutatedGolden.result, 'pass');
  assert.notEqual(mutatedGolden.compare_status, 0);
  assert.equal(mutatedGolden.mismatched_file, 'owned-legacy-card.css');
  assert.equal(mutatedGoldenAssertion({compareStatus: 0, cardStatus: 'exact', othersExact: true}).result, 'fail');

  const allowedRoot = join(scratch, 'allowed');
  mkdirSync(allowedRoot);
  const hidden = runHiddenResolutionNegative([emptyLoadPath], [allowedRoot, emptyLoadPath]);
  assert.equal(hidden.case_id, 'hidden-resolution');
  assert.equal(hidden.refused, true);
  assert.equal(hidden.flagged_foreign > 0, true);
  assert.equal(hidden.result, 'pass');
  assert.deepEqual(foreignLoads([`file://${join(allowedRoot, 'x.scss')}`, 'data:,x'], [allowedRoot]), []);
  assert.equal(foreignLoads([`file://${join(scratch, 'elsewhere.scss')}`], [allowedRoot]).length, 1);

  const css = {};
  for (const [name, entry] of Object.entries(apiOracle.members.mixins)) {
    if (entry.invocation?.invocable) css[name] = {css: '', sha256: entry.invocation.css_sha256};
  }
  const drift = apiDriftAssertion(apiDriftNegative(apiOracle, structuredClone(apiOracle.members), css));
  assert.equal(drift.result, 'pass');
  assert.equal(apiDriftAssertion({detected: false, mutated: ['variable/x'], newly_failed: []}).result, 'fail');
  assert.equal(apiDriftAssertion(null).result, 'fail');

  const negativeDir = join(scratch, 'isolation-assertions');
  mkdirSync(negativeDir, {recursive: true});
  assert.throws(() => writeIsolationNegativeAssertions(negativeDir, [archived, mutatedGolden]));
  const negativeWritten = writeIsolationNegativeAssertions(negativeDir, [archived, mutatedGolden, hidden, drift]);
  assert.deepEqual(negativeWritten.map(item => item.name), ['archived-import.json', 'mutated-golden.json', 'hidden-resolution.json', 'api-drift.json']);
  const archivedFile = JSON.parse(readFileSync(join(negativeDir, 'archived-import.json'), 'utf8'));
  const mutatedFile = JSON.parse(readFileSync(join(negativeDir, 'mutated-golden.json'), 'utf8'));
  assert.equal(archivedFile.kind, 'assertion');
  assert.equal(archivedFile.result, 'pass');
  assert.equal(archivedFile.compiled, false);
  assert.equal(mutatedFile.kind, 'assertion');
  assert.equal(mutatedFile.result, 'pass');
  assert.notEqual(mutatedFile.compare_status, 0);
  assert.equal(mutatedFile.mismatched_file, 'owned-legacy-card.css');
} finally {
  rmSync(scratch, {recursive: true, force: true});
}

console.log(`sass-seal regressions passed (${ORDERED_CSS_FIXTURE_IDS.length} ordered-css cases, ${ISOLATION_NEGATIVE_IDS.length} isolation negatives)`);

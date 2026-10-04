#!/usr/bin/env node
/**
 * Finite ordered-CSS cases sass-seal actually compiles and compares.
 *
 * Ids are strict fixtures from fixtures/sass/manifest.json. Empty debug CSS
 * and the four strict fixtures that differ from the sealed reference are not
 * in this set: they are not approved exceptions and are not executed here.
 * Bridge-review fixtures and DOM are not in this set. 21.x is not in this set.
 */
import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const ORDERED_CSS_FIXTURE_IDS = Object.freeze([
  '01-palette-values',
  'owned-legacy-autocomplete',
  'owned-legacy-card',
  'owned-legacy-checkbox',
  'owned-legacy-chips',
  'owned-legacy-dialog',
  'owned-legacy-form-field',
  'owned-legacy-input',
  'owned-legacy-list',
  'owned-legacy-menu',
  'owned-legacy-paginator',
  'owned-legacy-progress-bar',
  'owned-legacy-progress-spinner',
  'owned-legacy-radio',
  'owned-legacy-slide-toggle',
  'owned-legacy-slider',
  'owned-legacy-table',
  'owned-legacy-tabs',
  'owned-legacy-tooltip',
  'owned-option',
  '04-constructors-and-typography',
  '07-with-configuration',
  '11-cyph-deep-purple-800',
]);

/** Strict fixtures whose sealed CSS is not exact. Not rostered and not rewritten. */
export const UNRESOLVED_STRICT_CSS = Object.freeze([
  '05-custom-map-nested',
  'owned-legacy-button',
  'owned-legacy-select',
  'owned-legacy-snack-bar',
]);

/** Debug fixtures. Their CSS is empty; the value seal is separate and not this roster. */
export const EMPTY_DEBUG_CSS = Object.freeze([
  'theme-map-structure',
  'theme-palette-values',
  '12-cyph-palette-debug',
]);

export const BRIDGE_REVIEW_FIXTURES = Object.freeze([
  '02-core',
  '03-legacy-core',
  '06-aggregate-and-companions',
  '08-core-theme',
]);

export function orderedCssCaseId(fixtureId) {
  if (!ORDERED_CSS_FIXTURE_IDS.includes(fixtureId)) {
    throw new Error(`not an executed ordered-css fixture: ${fixtureId}`);
  }
  return fixtureId;
}

export function loadManifest(manifestPath = join(root, 'fixtures/sass/manifest.json')) {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

export function rosterProblems(manifest = loadManifest()) {
  const problems = [];
  const cases = new Map((manifest.cases || []).map(item => [item.id, item]));
  if (new Set(ORDERED_CSS_FIXTURE_IDS).size !== ORDERED_CSS_FIXTURE_IDS.length) {
    problems.push('ordered CSS fixture ids are not unique');
  }
  for (const id of ORDERED_CSS_FIXTURE_IDS) {
    const item = cases.get(id);
    if (!item) problems.push(`missing fixture: ${id}`);
    else if (item.comparison !== 'strict' || item.capture_debug) {
      problems.push(`fixture is not a strict non-debug case: ${id}`);
    }
    const css = join(root, 'reference/material-16.2.14/sass-css', `${id}.css`);
    try {
      const bytes = readFileSync(css);
      if (bytes.length === 0) problems.push(`reference CSS is empty: ${id}`);
    } catch {
      problems.push(`missing reference CSS: ${id}`);
    }
  }
  for (const id of [...UNRESOLVED_STRICT_CSS, ...EMPTY_DEBUG_CSS, ...BRIDGE_REVIEW_FIXTURES]) {
    if (ORDERED_CSS_FIXTURE_IDS.includes(id)) problems.push(`excluded fixture is rostered: ${id}`);
    if (!cases.has(id)) problems.push(`excluded fixture is not in the manifest: ${id}`);
  }
  return problems;
}

export function writeFixtureSubset(dest, manifest = loadManifest()) {
  const problems = rosterProblems(manifest);
  if (problems.length) throw new Error(problems.join('\n'));
  mkdirSync(dest, {recursive: true});
  const selected = ORDERED_CSS_FIXTURE_IDS.map(id => manifest.cases.find(item => item.id === id));
  for (const item of selected) {
    copyFileSync(join(root, 'fixtures/sass', item.file), join(dest, item.file));
  }
  writeFileSync(join(dest, 'manifest.json'), `${JSON.stringify({...manifest, cases: selected}, null, 2)}\n`);
}

export function writeReferenceCss(dest) {
  const problems = rosterProblems();
  if (problems.length) throw new Error(problems.join('\n'));
  mkdirSync(dest, {recursive: true});
  for (const id of ORDERED_CSS_FIXTURE_IDS) {
    copyFileSync(
      join(root, 'reference/material-16.2.14/sass-css', `${id}.css`),
      join(dest, `${id}.css`),
    );
  }
}

export function compareOrderedCss(referenceDir, candidateDir, reportPath) {
  const script = join(root, 'scripts/compare-css.py');
  const run = spawnSync('python3', [script, referenceDir, candidateDir, '--report', reportPath], {
    cwd: root,
    encoding: 'utf8',
  });
  let report = null;
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch {
    report = null;
  }
  return {status: run.status, stdout: run.stdout, stderr: run.stderr, report};
}

export function orderedCssResults(report) {
  const files = new Map((report?.files || []).map(item => [item.file, item]));
  return ORDERED_CSS_FIXTURE_IDS.map(id => {
    const row = files.get(`${id}.css`);
    const exact = row?.status === 'exact';
    return {
      case_id: orderedCssCaseId(id),
      result: exact ? 'pass' : 'fail',
      kind: 'assertion',
      status: row?.status ?? 'missing',
      baseline_sha256: row?.baseline_sha256 ?? null,
      candidate_sha256: row?.candidate_sha256 ?? null,
    };
  });
}

export function writeOrderedCssAssertions(outputDir, results) {
  const outputs = [];
  for (const item of results) {
    const body = Buffer.from(`${JSON.stringify({
      case_id: item.case_id,
      result: item.result,
      kind: 'assertion',
      status: item.status,
      baseline_sha256: item.baseline_sha256,
      candidate_sha256: item.candidate_sha256,
      note: 'Exact ordered CSS against the sealed Material 16.2.14 reference. Not a DOM result and not a 21.x case.',
    }, null, 2)}\n`);
    const name = `${item.case_id}.json`;
    writeFileSync(join(outputDir, name), body);
    outputs.push({name, bytes: body.length});
  }
  return outputs;
}

export function runOrderedCss(environment) {
  const work = join(environment, 'ordered-css');
  const fixtures = join(work, 'fixtures');
  const reference = join(work, 'reference');
  const candidate = join(work, 'candidate');
  const reportPath = join(work, 'compare.json');
  writeFixtureSubset(fixtures);
  writeReferenceCss(reference);
  const compiled = spawnSync(process.execPath, [
    join(root, 'scripts/run-sass-fixtures.mjs'),
    '--environment', environment,
    '--module', '@ngx-compat/material-legacy',
    '--output', candidate,
    '--fixtures', fixtures,
  ], {cwd: root, encoding: 'utf8'});
  const compared = compareOrderedCss(reference, candidate, reportPath);
  const results = compared.report ? orderedCssResults(compared.report) : ORDERED_CSS_FIXTURE_IDS.map(id => ({
    case_id: id,
    result: 'fail',
    kind: 'assertion',
    status: 'missing',
    baseline_sha256: null,
    candidate_sha256: null,
  }));
  const ok = compiled.status === 0 && compared.status === 0 && results.length === ORDERED_CSS_FIXTURE_IDS.length
    && results.every(item => item.result === 'pass');
  return {
    ok,
    results,
    compile_status: compiled.status,
    compare_status: compared.status,
    compile_error: compiled.status === 0 ? null : `${compiled.stderr || compiled.stdout || ''}`.slice(-2000),
  };
}

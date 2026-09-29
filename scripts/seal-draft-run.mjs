#!/usr/bin/env node
/**
 * Index completed child reports into a draft run and seal that matrix.
 *
 * Refuses a release manifest, a missing or mismatched report, and a second
 * seal. The digest of the sealed manifest is written beside it, never inside
 * the hashed bytes.
 *
 *   node scripts/seal-draft-run.mjs --run <run-dir>/run.json
 */
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function parseArgs(argv) {
  let runPath = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--run') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, '--run requires a path');
      runPath = resolve(root, value);
      i += 1;
      continue;
    }
    fail(2, `Unknown argument: ${arg}`);
  }
  if (!runPath) fail(2, '--run is required');
  return runPath;
}

function sha256Text(text) {
  return createHash('sha256').update(text).digest('hex');
}

function insideDir(dir, target) {
  const rel = relative(resolve(dir), resolve(target));
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

const runPath = parseArgs(process.argv.slice(2));
if (!existsSync(runPath)) fail(2, `Missing run manifest: ${runPath}`);
const draft = JSON.parse(readFileSync(runPath, 'utf8'));
if (draft.schema_version !== 1 || draft.template === true) {
  fail(2, 'run manifest must be schema_version 1');
}
if (draft.stage !== 'draft') fail(2, 'Only a draft manifest can be sealed');
if (draft.purpose === 'release') fail(2, 'This finalizer does not seal a release manifest');
if (!Array.isArray(draft.reports) || draft.reports.length !== 0) {
  fail(2, 'A draft manifest must start with an empty report index');
}

const matrixRel = draft.expected_matrix?.path;
const matrixSha = draft.expected_matrix?.sha256;
if (typeof matrixRel !== 'string' || typeof matrixSha !== 'string') {
  fail(2, 'Draft is missing its expected matrix identity');
}
const matrixPath = resolve(root, matrixRel);
if (!insideDir(root, matrixPath) || !existsSync(matrixPath)) {
  fail(2, 'Expected matrix path is missing or leaves the repository');
}
const matrixBytes = readFileSync(matrixPath);
if (sha256Text(matrixBytes) !== matrixSha) {
  fail(1, 'Expected matrix bytes no longer match the draft');
}
const matrix = JSON.parse(matrixBytes.toString('utf8'));
const required = (matrix.checks || []).filter(check => check && check.required);
if (required.length === 0) fail(2, 'Expected matrix has no required checks');

const runDir = dirname(runPath);
const library = (draft.artifacts || []).find(item => item && item.id === 'library');
const indexed = [];
const seen = new Set();
for (const check of required) {
  if (typeof check.check_id !== 'string' || seen.has(check.check_id)) {
    fail(2, 'Expected matrix has a missing or duplicate check id');
  }
  seen.add(check.check_id);
  const reportRel = join('reports', `${check.check_id}.json`);
  const reportPath = resolve(runDir, reportRel);
  if (!insideDir(runDir, reportPath)) fail(2, 'Report path leaves the run directory');
  if (!existsSync(reportPath)) {
    fail(1, `Required report is missing: ${reportRel}`);
  }
  const reportBytes = readFileSync(reportPath);
  const report = JSON.parse(reportBytes.toString('utf8'));
  if (report.run_id !== draft.run_id || report.check_id !== check.check_id) {
    fail(1, `Report ${check.check_id} does not match this run`);
  }
  if (report.result !== 'pass' || report.exit_code !== 0 || report.failed !== 0) {
    fail(1, `Required check ${check.check_id} did not pass`);
  }
  if (report.subject_kind === 'artifact') {
    if (!library || report.artifact?.sha256 !== library.sha256 || report.artifact?.bytes !== library.bytes) {
      fail(1, `Report ${check.check_id} consumed different artifact bytes`);
    }
  }
  indexed.push({
    check_id: check.check_id,
    path: reportRel,
    sha256: sha256Text(reportBytes),
    result: 'pass',
  });
}

const sealed = {
  ...draft,
  stage: 'sealed',
  finished_at: new Date().toISOString(),
  reports: indexed,
  summary: {
    ...draft.summary,
    automatic_product_result: 'pass',
    limitations: (draft.summary?.limitations || []).map(item =>
      item.startsWith('Draft only.')
        ? 'Sealed for the pack-draft matrix only. This is not a release manifest.'
        : item,
    ),
  },
};
const body = JSON.stringify(sealed, null, 2) + '\n';
const temporary = `${runPath}.sealing`;
writeFileSync(temporary, body);
renameSync(temporary, runPath);
writeFileSync(`${runPath}.sha256`, `${sha256Text(body)}  run.json\n`);
console.log(`Sealed ${draft.run_id} with ${indexed.length} report(s)`);

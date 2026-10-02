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
import {spawnSync} from 'node:child_process';
import {existsSync, lstatSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function parseArgs(argv) {
  let runPath = null;
  let expectedMatrixSha = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--expected-matrix-sha256') {
      if (expectedMatrixSha !== null || !/^[0-9a-f]{64}$/.test(argv[i + 1] || '')) {
        fail(2, '--expected-matrix-sha256 requires one lowercase SHA-256');
      }
      expectedMatrixSha = argv[++i];
      continue;
    }
    if (arg === '--run') {
      if (runPath !== null) fail(2, 'duplicate --run');
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, '--run requires a path');
      runPath = resolve(root, value);
      i += 1;
      continue;
    }
    fail(2, `Unknown argument: ${arg}`);
  }
  if (!runPath) fail(2, '--run is required');
  return {runPath, expectedMatrixSha};
}

function sha256Text(text) {
  return createHash('sha256').update(text).digest('hex');
}

function insideDir(dir, target) {
  const rel = relative(resolve(dir), resolve(target));
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

function evidencePath(base, value) {
  if (typeof value !== 'string' || value.includes('\\') || isAbsolute(value) ||
      value.split('/').some(part => !part || part === '.' || part === '..')) {
    fail(1, 'Invalid validated evidence path');
  }
  let target = resolve(base);
  for (const part of value.split('/')) {
    target = join(target, part);
    if (!existsSync(target) || lstatSync(target).isSymbolicLink()) {
      fail(1, `Missing or symlinked validated evidence: ${value}`);
    }
  }
  if (!insideDir(resolve(base), target) || !statSync(target).isFile()) {
    fail(1, `Invalid validated evidence file: ${value}`);
  }
  return target;
}

function evidenceKey(scope, path) { return `${scope}:${path}`; }

function rehashEvidence(snapshot, requiredKeys, runDir) {
  if (!Array.isArray(snapshot) || !snapshot.length) fail(1, 'Full evaluator omitted the validated evidence set');
  const seen = new Set();
  for (const item of snapshot) {
    if (!item || !['run', 'repository'].includes(item.root) ||
        !Number.isSafeInteger(item.bytes) || item.bytes <= 0 || !/^[0-9a-f]{64}$/.test(item.sha256 || '')) {
      fail(1, 'Invalid validated evidence identity');
    }
    const key = evidenceKey(item.root, item.path);
    if (seen.has(key) || !requiredKeys.has(key)) fail(1, 'Duplicate or unexpected validated evidence identity');
    seen.add(key);
    const target = evidencePath(item.root === 'run' ? runDir : root, item.path);
    const bytes = readFileSync(target);
    if (bytes.length !== item.bytes || sha256Text(bytes) !== item.sha256) {
      fail(1, `Validated evidence changed after evaluation: ${key}`);
    }
  }
  if (seen.size !== requiredKeys.size) fail(1, 'Full evaluator omitted a required validated evidence file');
}

const {runPath, expectedMatrixSha} = parseArgs(process.argv.slice(2));
if (!existsSync(runPath)) fail(2, `Missing run manifest: ${runPath}`);
const draftBytes = readFileSync(runPath);
const draft = JSON.parse(draftBytes.toString('utf8'));
const draftDigest = sha256Text(draftBytes);
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
const fullAcceptance = matrix.id === 'full-verify';
let fullEvaluation = null;
if (expectedMatrixSha && !fullAcceptance) fail(2, 'Caller-pinned full acceptance cannot be downgraded to a slice');
if (fullAcceptance) {
  if (!expectedMatrixSha) fail(2, 'Full acceptance requires --expected-matrix-sha256 from the reviewed execution');
  const checked = spawnSync('python3', [
    join(root, 'scripts/rc-verify.py'), '--check-run', '--run', runPath,
    '--expected-matrix-sha256', expectedMatrixSha,
  ], {cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
  if (checked.status !== 0) {
    fail(1, `Full acceptance is incomplete; not sealing.\n${checked.stdout || ''}${checked.stderr || checked.error || ''}`);
  }
  try {
    fullEvaluation = JSON.parse(checked.stdout);
  } catch {
    fail(1, 'Full evaluator returned malformed evidence');
  }
  if (fullEvaluation.automatic_product_result !== 'pass' ||
      fullEvaluation.validated_manifest_sha256 !== draftDigest ||
      !fullEvaluation.validated_reports || !Array.isArray(fullEvaluation.validated_files)) {
    fail(1, 'Full evaluator did not validate these manifest bytes');
  }
}
const requiredEvidence = new Set([
  evidenceKey('run', relative(runDir, runPath).split('\\').join('/')),
  evidenceKey('repository', matrixRel),
]);
if (fullAcceptance) {
  for (const field of ['execution_record', 'pack_execution', 'pack_metadata']) {
    if (!draft[field] || typeof draft[field].path !== 'string') fail(1, `Missing ${field} identity`);
    requiredEvidence.add(evidenceKey('run', draft[field].path));
  }
}
const artifactIds = new Set();
for (const item of draft.artifacts || []) {
  if (!item || typeof item.id !== 'string' || artifactIds.has(item.id)) fail(2, 'Missing or duplicate artifact id');
  artifactIds.add(item.id);
  requiredEvidence.add(evidenceKey('run', item.path));
  if (typeof item.path !== 'string' || isAbsolute(item.path) || item.path.split(/[\\/]/).includes('..')) {
    fail(2, 'Artifact path must stay inside the run directory');
  }
  const artifactPath = resolve(runDir, item.path);
  if (!insideDir(runDir, artifactPath) || !existsSync(artifactPath) ||
      !insideDir(realpathSync(runDir), realpathSync(artifactPath)) || !statSync(artifactPath).isFile()) {
    fail(2, 'Missing artifact or artifact path escapes the run directory');
  }
  if (statSync(artifactPath).size !== item.bytes || sha256Text(readFileSync(artifactPath)) !== item.sha256) {
    fail(1, `Artifact ${item.id} changed after verification`);
  }
}
if (!artifactIds.has('library')) fail(2, 'Missing library artifact');

const library = (draft.artifacts || []).find(item => item && item.id === 'library');
const indexed = [];
const seen = new Set();
for (const check of required) {
  if (typeof check.check_id !== 'string' || seen.has(check.check_id)) {
    fail(2, 'Expected matrix has a missing or duplicate check id');
  }
  seen.add(check.check_id);
  const reportRel = join('reports', `${check.check_id}.json`);
  requiredEvidence.add(evidenceKey('run', reportRel));
  const reportPath = resolve(runDir, reportRel);
  if (!insideDir(runDir, reportPath)) fail(2, 'Report path leaves the run directory');
  if (!existsSync(reportPath)) {
    fail(1, `Required report is missing: ${reportRel}`);
  }
  const reportBytes = readFileSync(reportPath);
  if (fullAcceptance && fullEvaluation.validated_reports[check.check_id] !== sha256Text(reportBytes)) {
    fail(1, `Report ${check.check_id} changed after completeness evaluation`);
  }
  const report = JSON.parse(reportBytes.toString('utf8'));
  if (fullAcceptance) {
    if (!Array.isArray(report.outputs)) fail(1, 'Missing assertion output inventory');
    for (const output of report.outputs) requiredEvidence.add(evidenceKey('run', output.path));
  }
  if (report.run_id !== draft.run_id || report.check_id !== check.check_id) {
    fail(1, `Report ${check.check_id} does not match this run`);
  }
  if (report.line !== draft.source?.line) {
    fail(1, `Report ${check.check_id} is for line ${report.line ?? 'missing'}, draft is ${draft.source?.line}`);
  }
  if (report.result !== 'pass' || report.exit_code !== 0 || report.failed !== 0) {
    fail(1, `Required check ${check.check_id} did not pass`);
  }
  if (!fullAcceptance && report.subject_kind === 'artifact') {
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

if (sha256Text(readFileSync(runPath)) !== draftDigest) fail(1, 'Manifest changed during sealing');

const sealed = {
  ...draft,
  stage: 'sealed',
  finished_at: new Date().toISOString(),
  reports: indexed,
  ...(fullAcceptance ? {
    preseal_manifest_sha256: draftDigest,
    // Do not embed a digest of the new manifest inside itself.
    evidence_files: fullEvaluation.validated_files.filter(item => evidenceKey(item.root, item.path) !== evidenceKey('run', relative(runDir, runPath))),
  } : {}),
  summary: {
    ...draft.summary,
    automatic_product_result: 'pass',
    required_review_state: 'pending',
    engineering_admission: 'not-decided',
    limitations: (draft.summary?.limitations || []).map(item =>
      item.startsWith('Draft only.')
        ? `Sealed for the ${matrix.id} matrix only. This is not publication authorization.`
        : item,
    ),
  },
};
const body = JSON.stringify(sealed, null, 2) + '\n';
const temporary = `${runPath}.sealing`;
if (existsSync(`${runPath}.sha256`)) fail(2, 'Manifest already has a digest sidecar');
writeFileSync(temporary, body, {flag: 'wx'});
process.on('exit', () => { if (existsSync(temporary)) unlinkSync(temporary); });
// Rehash EVERY evaluator input/output immediately before publishing the sealed
// manifest. Only an exclusively owned, trusted run may be finalized.
try {
  if (fullAcceptance) rehashEvidence(fullEvaluation.validated_files, requiredEvidence, runDir);
  if (sha256Text(readFileSync(runPath)) !== draftDigest) fail(1, 'Manifest changed during sealing');
  renameSync(temporary, runPath);
} catch (error) {
  if (existsSync(temporary)) unlinkSync(temporary);
  throw error;
}
writeFileSync(`${runPath}.sha256`, `${sha256Text(body)}  run.json\n`);
console.log(`Sealed ${draft.run_id} with ${indexed.length} report(s)`);

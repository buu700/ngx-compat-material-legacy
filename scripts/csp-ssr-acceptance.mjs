#!/usr/bin/env node
/**
 * Coordinator path for csp-ssr. Derives the main roster before Chromium or
 * the server processes start. Chromium is the CSP engine. WebKitGTK is not
 * Safari and is not launched here. Hydration is unclaimed. Does not claim
 * G04 or G10.
 */
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveLibraryFromRun} from './resolve-run-library.mjs';
import {assertCase, deriveMainRoster, observationProblems} from './csp-ssr-roster.mjs';
import {evidenceOf, executeCspSsr} from './csp-ssr-run.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function gitValue(args) {
  const result = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
  return result.status === 0 ? result.stdout.trim() : '';
}

function coordinatorRequest() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length !== names.length) return {error: `incomplete coordinator environment: ${present.join(', ')}`};
  if (process.env.RC_CHECK_ID !== 'csp-ssr') return {error: 'RC_CHECK_ID is not csp-ssr'};
  const invocation = process.env.RC_INVOCATION_ID;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/.test(invocation)) return {error: 'invalid invocation identity'};
  let binding;
  try { binding = JSON.parse(process.env.RC_EVIDENCE_BINDING); } catch { return {error: 'RC_EVIDENCE_BINDING is not JSON'}; }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return {error: 'binding is not an object'};
  if (binding.run_id !== process.env.RC_RUN_ID) return {error: 'binding run_id does not match RC_RUN_ID'};
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  if (!outputDir || !existsSync(outputDir)) return {error: 'assertion output directory is missing'};
  const stat = lstatSync(outputDir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) return {error: 'assertion output directory is not a real directory'};
  if (!outputDir.endsWith(join('evidence', 'csp-ssr', invocation))) return {error: 'assertion directory is not check-owned'};
  return {binding, invocation, runId: process.env.RC_RUN_ID, outputDir, runDir: resolve(outputDir, '..', '..', '..'), line: binding.source_line};
}

export async function runAcceptance({runPath}) {
  const request = coordinatorRequest();
  const roster = deriveMainRoster();
  const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
  const row = matrix.checks.find(item => item.check_id === 'csp-ssr');
  const matrixMismatch = JSON.stringify(row.acceptance.cases_by_line['21.x']) !== JSON.stringify(roster.groups)
    || Object.values(row.acceptance.cases_by_line.main).some(value => value !== null);
  const library = runPath ? resolveLibraryFromRun(runPath) : null;
  const artifactSha = library ? library.digest : '';
  const artifactBytes = library ? library.bytes : 0;
  let collected = {};
  let launchError = '';
  let chromiumLaunched = false;
  if (!matrixMismatch && request && !request.error && library && request.line === '21.x' && request.binding.source_clean === true) {
    try {
      collected = await executeCspSsr(library.tarball);
      chromiumLaunched = true;
    } catch (error) {
      launchError = error instanceof Error ? error.message : String(error);
    }
  }
  const outcomes = roster.ids.map(id => {
    const observation = collected[id];
    const problems = assertCase(id, observation);
    const ok = problems.length === 0;
    return {id, ok, observation, evidence: ok ? evidenceOf(observation) : problems.join('; ')};
  });
  const observed = observationProblems({
    requiredIds: roster.ids,
    outcomes,
    sourceClean: request && request.binding ? request.binding.source_clean === true : false,
    artifactSha,
    boundSha: artifactSha,
    chromiumLaunched,
  });
  const commit = gitValue(['rev-parse', 'HEAD']);
  const tree = gitValue(['rev-parse', 'HEAD^{tree}']);
  const identity = [];
  if (!request || request.error) identity.push(request ? request.error : 'missing coordinator request');
  if (request && request.binding) {
    if (request.binding.source_clean !== true) identity.push('dirty source');
    if (request.binding.source_commit !== commit) identity.push('source commit mismatch');
    if (request.binding.source_tree !== tree) identity.push('source tree mismatch');
    if (request.line !== '21.x') identity.push('line is not 21.x');
  }
  if (matrixMismatch) identity.push('matrix roster is not the derived main csp-ssr roster');
  if (launchError) identity.push(launchError);
  const problems = [...identity, ...observed.problems.filter(item => !identity.includes(item))];
  const accepted = problems.length === 0 && observed.skipped.length === 0 && chromiumLaunched;
  if (!request || request.error) {
    console.error(problems.join('\n'));
    return 1;
  }
  const passedIds = outcomes.filter(item => item.ok).map(item => item.id);
  const assertion = {
    kind: 'csp-ssr-observations',
    check_id: 'csp-ssr',
    run_id: request.runId,
    invocation_id: request.invocation,
    library_sha256: artifactSha,
    source_clean: request.binding.source_clean === true,
    csp_engine: 'chromium',
    safari_certification: false,
    hydration_claimed: false,
    per_group: roster.perGroup,
    not_applicable: roster.notApplicable,
    note: 'Cases were derived before Chromium and the server processes started. The policy has no unsafe-inline. WebKitGTK is not Safari and is not this check. Hydration is unclaimed. A missing nonce, a blocked inline style or script, a client-only render, dirty source, and an unbound artifact are rejected.',
    cases: outcomes.map(item => ({case_id: item.id, result: item.ok ? 'pass' : 'fail', evidence: item.evidence || ''})),
  };
  const assertionPath = join(request.outputDir, 'csp-ssr-observations.json');
  const assertionBytes = Buffer.from(`${JSON.stringify(assertion)}\n`);
  writeFileSync(assertionPath, assertionBytes);
  const relativeAssertion = relative(request.runDir, assertionPath).split('\\').join('/');
  const output = {path: relativeAssertion, sha256: createHash('sha256').update(assertionBytes).digest('hex'), bytes: assertionBytes.length};
  const report = {
    schema_version: 1,
    template: false,
    run_id: request.runId,
    check_id: 'csp-ssr',
    line: request.line,
    invocation_id: request.invocation,
    binding: request.binding,
    coverage: accepted ? 'complete' : 'incomplete',
    result: accepted ? 'pass' : 'fail',
    exit_code: accepted ? 0 : 1,
    subject_kind: 'artifact',
    subject_ids: ['library'],
    artifacts: {library: {sha256: artifactSha, bytes: artifactBytes}},
    expected_case_ids: roster.ids,
    discovered_case_ids: roster.ids,
    executed_case_ids: roster.ids,
    passed_case_ids: accepted ? roster.ids : passedIds,
    failed_case_ids: accepted ? [] : roster.ids.filter(id => !passedIds.includes(id)).slice(0, 50),
    skipped_case_ids: [],
    unresolved_case_ids: [],
    exceptions: [],
    passed: accepted ? roster.ids.length : passedIds.length,
    failed: accepted ? 0 : roster.ids.length - passedIds.length,
    skipped: 0,
    outputs: [output],
    case_results: roster.ids.map(id => ({
      case_id: id,
      result: passedIds.includes(id) && accepted ? 'pass' : 'fail',
      kind: 'assertion',
      output_paths: [relativeAssertion],
    })),
    command: ['node', 'scripts/csp-ssr-acceptance.mjs', '--run', request.runId],
    limitations: accepted ? [
      'CSP evidence is Chromium only. WebKitGTK is not Safari and was not launched for this check.',
      'Hydration is unclaimed.',
      'Does not claim G04 or G10.',
      '21.x was not executed.',
    ] : problems.slice(0, 30),
  };
  if (!accepted) {
    report.case_results = roster.ids.map(id => ({
      case_id: id,
      result: passedIds.includes(id) ? 'pass' : 'fail',
      kind: 'assertion',
      output_paths: [relativeAssertion],
    }));
  }
  mkdirSync(join(request.runDir, 'reports'), {recursive: true});
  writeFileSync(join(request.runDir, 'reports', 'csp-ssr.json'), `${JSON.stringify(report)}\n`);
  console.log(`csp-ssr: derived ${roster.ids.length} cases; accepted=${accepted}`);
  if (!accepted) {
    console.error(problems.slice(0, 24).join('\n'));
    const failed = outcomes.filter(item => !item.ok).slice(0, 24);
    for (const item of failed) console.error(`${item.id} ${item.evidence}`);
  }
  return accepted ? 0 : 1;
}

const entry = process.argv[1] ? resolve(process.argv[1]) : '';
if (entry === fileURLToPath(import.meta.url)) {
  if (typeof globalThis.WebSocket !== 'function') {
    const relaunch = spawnSync(process.execPath, ['--experimental-websocket', ...process.argv.slice(1)], {stdio: 'inherit', env: process.env});
    process.exit(relaunch.status ?? 1);
  }
  const runFlag = process.argv.indexOf('--run');
  const runPath = runFlag >= 0 ? process.argv[runFlag + 1] : '';
  if (!runPath) {
    console.error('--run is required');
    process.exit(1);
  }
  runAcceptance({runPath}).then(code => process.exit(code)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

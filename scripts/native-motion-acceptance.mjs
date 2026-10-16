#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Coordinator path for native-motion. Derives the 21.x roster before launching
 * browsers, then binds observations to the packed artifact. WebKitGTK is the
 * webkit engine, not Safari. Does not claim G04 or G10.
 */
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveLibraryFromRun} from './resolve-run-library.mjs';
import {deriveMainRoster, observationProblems, assertCase, SOURCE_LINE} from './native-motion-roster.mjs';
import {executeNativeMotion} from './native-motion-run.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function gitValue(args) {
  const result = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
  return result.status === 0 ? result.stdout.trim() : null;
}

function coordinatorRequest() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length !== names.length) return {error: `incomplete coordinator environment: ${present.join(', ')}`};
  if (process.env.RC_CHECK_ID !== 'native-motion') return {error: 'RC_CHECK_ID is not native-motion'};
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
  if (!outputDir.endsWith(join('evidence', 'native-motion', invocation))) return {error: 'assertion directory is not check-owned'};
  return {binding, invocation, runId: process.env.RC_RUN_ID, outputDir, runDir: resolve(outputDir, '..', '..', '..'), line: binding.source_line};
}

function preflight() {
  const missing = [];
  const notes = [];
  const chrome = process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)
    ? process.env.CHROME_BIN
    : ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(path => existsSync(path));
  if (!chrome) missing.push('chromium');
  const firefox = process.env.FIREFOX_BIN && existsSync(process.env.FIREFOX_BIN) ? process.env.FIREFOX_BIN : (existsSync('/usr/bin/firefox') ? '/usr/bin/firefox' : '');
  if (!firefox) missing.push('firefox');
  else {
    const version = spawnSync(firefox, ['--version'], {encoding: 'utf8', timeout: 20000});
    notes.push((version.stdout || version.stderr || '').trim());
    if (version.status !== 0) missing.push('firefox');
  }
  if (!process.env.DISPLAY) missing.push('webkit');
  const probe = spawnSync('/usr/bin/python3', ['-c', 'import gi; gi.require_version("WebKit2", "4.1"); from gi.repository import WebKit2; print("%s.%s.%s" % (WebKit2.get_major_version(), WebKit2.get_minor_version(), WebKit2.get_micro_version()))'], {encoding: 'utf8', timeout: 30000});
  if (probe.status !== 0) {
    missing.push('webkit');
    notes.push((probe.stderr || probe.stdout || 'webkitgtk import failed').trim().slice(-400));
  } else notes.push(`webkitgtk ${probe.stdout.trim()}`);
  return {missing: [...new Set(missing)], notes, chrome, firefox};
}

/** Keep actual discovery/execution distinct from the expected roster. Recheck
 * raw states rather than copying a child's pass label into the owned report. */
export function qualifyNativeMotionOutcomes(expectedIds, outcomes) {
  const expected = new Set(expectedIds), byId = new Map(), discovered = [], duplicates = new Set(), problems = [];
  if (!expectedIds.length || expected.size !== expectedIds.length) problems.push('invalid expected native-motion roster');
  for (const row of outcomes || []) {
    if (!row || typeof row.id !== 'string' || !row.id) {problems.push('malformed native-motion outcome'); continue;}
    if (byId.has(row.id)) {duplicates.add(row.id); problems.push('duplicate native-motion outcome ' + row.id); continue;}
    byId.set(row.id, row); discovered.push(row.id);
    if (!expected.has(row.id)) problems.push('unexpected native-motion outcome ' + row.id);
  }
  const executed = expectedIds.filter(id => {
    const observation = byId.get(id)?.observation;
    return observation !== null && typeof observation === 'object' && !Array.isArray(observation);
  }), executedSet = new Set(executed), passed = [], failed = [];
  for (const id of executed) {
    const row = byId.get(id), rawProblems = assertCase(id, row.observation);
    if (row.ok === true && typeof row.evidence === 'string' && row.evidence.length > 0 && !duplicates.has(id) && !rawProblems.length) passed.push(id);
    else {failed.push(id); problems.push(id + ': ' + (rawProblems.join('; ') || 'child failed, duplicate result or missing evidence'));}
  }
  return {byId, discovered, executed, passed, failed, unresolved: expectedIds.filter(id => !executedSet.has(id)), problems};
}

export async function runAcceptance({runPath}) {
  const request = coordinatorRequest();
  const roster = deriveMainRoster();
  const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
  const row = matrix.checks.find(item => item.check_id === 'native-motion');
  const matrixMismatch = JSON.stringify(row.acceptance.cases_by_line[SOURCE_LINE]) !== JSON.stringify(roster.groups)
    || Object.values(row.acceptance.cases_by_line.main).some(value => value !== null);
  const library = runPath ? resolveLibraryFromRun(runPath) : null;
  const artifactSha = library ? library.digest : '';
  const artifactBytes = library ? library.bytes : 0;
  const launch = preflight();
  let outcomes = [];
  let engines = {};
  let launchError = '';
  if (!matrixMismatch && request && !request.error && launch.missing.length === 0 && library && request.line === '21.x') {
    try {
      const executed = await executeNativeMotion(library.tarball);
      outcomes = executed.outcomes;
      engines = executed.engines;
    } catch (error) {
      launchError = error instanceof Error ? error.message : String(error);
    }
  }
  const observed = observationProblems({
    requiredIds: roster.ids,
    outcomes,
    engines,
    sourceClean: request && request.binding ? request.binding.source_clean === true : false,
    artifactSha,
    boundSha: artifactSha,
  });
  const commit = gitValue(['rev-parse', 'HEAD']);
  const tree = gitValue(['rev-parse', 'HEAD^{tree}']);
  const status = gitValue(['status', '--porcelain', '--untracked-files=normal']);
  const identity = [];
  if (status === null) identity.push('checkout clean source state is unknown');
  else if (status !== '') identity.push('checkout source became dirty during native-motion execution');
  if (!request || request.error) identity.push(request ? request.error : 'missing coordinator request');
  if (request && request.binding) {
    if (request.binding.source_clean !== true) identity.push('dirty source');
    if (request.binding.source_commit !== commit) identity.push('source commit mismatch');
    if (request.binding.source_tree !== tree) identity.push('source tree mismatch');
    if (request.line !== '21.x') identity.push('line is not 21.x');
  }
  if (matrixMismatch) identity.push('matrix roster is not the derived 21.x native-motion roster');
  if (launch.missing.length) identity.push(`missing browser ${launch.missing.join(', ')}`);
  if (launchError) identity.push(launchError);
  for (const [name, info] of Object.entries(engines)) {
    if (info && info.error) identity.push(`${name}: ${info.error}`);
  }
  const qualification = qualifyNativeMotionOutcomes(roster.ids, outcomes);
  const problems = [...new Set([...identity, ...observed.problems, ...qualification.problems])];
  const accepted = problems.length === 0 && observed.skipped.length === 0 && qualification.unresolved.length === 0 && qualification.failed.length === 0;
  const passedSet = new Set(qualification.passed), failedSet = new Set(qualification.failed);
  const caseResult = id => passedSet.has(id) ? 'pass' : failedSet.has(id) ? 'fail' : 'unresolved';
  if (!request || request.error) {
    console.error(problems.join('\n'));
    return 1;
  }
  const assertion = {
    kind: 'native-motion-observations',
    check_id: 'native-motion',
    run_id: request.runId,
    invocation_id: request.invocation,
    library_sha256: artifactSha,
    source_clean: request.binding.source_clean === true && status === '',
    source_commit: commit,
    source_tree: tree,
    webkit_backend: 'webkitgtk',
    safari_certification: false,
    engines,
    per_group: roster.perGroup,
    per_engine: roster.perEngine,
    not_applicable: roster.notApplicable,
    note: 'Cases were derived before the browsers launched. WebKitGTK is not Safari. detectChanges, a zero-duration stylesheet, a wrapper background, a missing engine, dirty source, and an unbound artifact are rejected. motion-smoke is a separate source check.',
    cases: roster.ids.map(id => ({
      case_id: id,
      result: caseResult(id),
      evidence: qualification.byId.get(id)?.evidence || '',
      observation: qualification.byId.get(id)?.observation ?? null,
    })),
  };
  const assertionPath = join(request.outputDir, 'motion-observations.json');
  const assertionBytes = Buffer.from(`${JSON.stringify(assertion)}\n`);
  writeFileSync(assertionPath, assertionBytes);
  const relativeAssertion = relative(request.runDir, assertionPath).split('\\').join('/');
  const output = {path: relativeAssertion, sha256: createHash('sha256').update(assertionBytes).digest('hex'), bytes: assertionBytes.length};
  const report = {
    schema_version: 1,
    template: false,
    run_id: request.runId,
    check_id: 'native-motion',
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
    discovered_case_ids: qualification.discovered,
    executed_case_ids: qualification.executed,
    passed_case_ids: qualification.passed,
    failed_case_ids: qualification.failed,
    skipped_case_ids: [],
    unresolved_case_ids: qualification.unresolved,
    exceptions: [],
    passed: qualification.passed.length,
    failed: qualification.failed.length,
    skipped: 0,
    outputs: [output],
    case_results: roster.ids.map(id => ({
      case_id: id,
      result: caseResult(id),
      kind: caseResult(id) === 'unresolved' ? 'not-executed' : 'assertion',
      output_paths: [relativeAssertion],
    })),
    command: ['node', 'scripts/native-motion-acceptance.mjs', '--run', request.runId],
    limitations: accepted ? [
      'WebKit evidence is WebKitGTK WebKit2 4.1 with the process sandbox enabled, not Safari certification.',
      'Does not claim G04 or G10.',
      'Source motion-smoke is a separate check.',
    ] : problems.slice(0, 30),
    preflight: launch.notes,
  };
  mkdirSync(join(request.runDir, 'reports'), {recursive: true});
  writeFileSync(join(request.runDir, 'reports', 'native-motion.json'), `${JSON.stringify(report)}\n`);
  console.log(`native-motion: derived ${roster.ids.length} cases; accepted=${accepted}`);
  if (!accepted) {
    console.error(problems.slice(0, 30).join('\n'));
    if (observed.skipped.length) console.error(`skipped_count ${observed.skipped.length} first ${observed.skipped[0]}`);
  }
  return accepted ? 0 : 1;
}

const entry = process.argv[1] ? resolve(process.argv[1]) : '';
if (entry === fileURLToPath(import.meta.url)) {
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

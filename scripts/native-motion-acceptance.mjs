#!/usr/bin/env node
/**
 * Coordinator path for native-motion. Derives the main roster before launching
 * browsers, then binds observations to the packed artifact. WebKitGTK is the
 * webkit engine, not Safari. Does not claim G04 or G10.
 */
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveLibraryFromRun} from './resolve-run-library.mjs';
import {deriveMainRoster, observationProblems} from './native-motion-roster.mjs';
import {executeNativeMotion} from './native-motion-run.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function gitValue(args) {
  const result = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
  return result.status === 0 ? result.stdout.trim() : '';
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

export async function runAcceptance({runPath}) {
  const request = coordinatorRequest();
  const roster = deriveMainRoster();
  const matrix = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/full-verify.json'), 'utf8'));
  const row = matrix.checks.find(item => item.check_id === 'native-motion');
  const matrixMismatch = JSON.stringify(row.acceptance.cases_by_line.main) !== JSON.stringify(roster.groups)
    || Object.values(row.acceptance.cases_by_line['21.x']).some(value => value !== null);
  const library = runPath ? resolveLibraryFromRun(runPath) : null;
  const artifactSha = library ? library.digest : '';
  const artifactBytes = library ? library.bytes : 0;
  const launch = preflight();
  let outcomes = [];
  let engines = {};
  let launchError = '';
  if (!matrixMismatch && request && !request.error && launch.missing.length === 0 && library && request.line === 'main') {
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
  const identity = [];
  if (!request || request.error) identity.push(request ? request.error : 'missing coordinator request');
  if (request && request.binding) {
    if (request.binding.source_clean !== true) identity.push('dirty source');
    if (request.binding.source_commit !== commit) identity.push('source commit mismatch');
    if (request.binding.source_tree !== tree) identity.push('source tree mismatch');
    if (request.line !== 'main') identity.push('line is not main');
  }
  if (matrixMismatch) identity.push('matrix roster is not the derived main native-motion roster');
  if (launch.missing.length) identity.push(`missing browser ${launch.missing.join(', ')}`);
  if (launchError) identity.push(launchError);
  for (const [name, info] of Object.entries(engines)) {
    if (info && info.error) identity.push(`${name}: ${info.error}`);
  }
  const problems = [...identity, ...observed.problems.filter(item => !identity.includes(item))];
  const accepted = problems.length === 0 && observed.skipped.length === 0;
  const byId = new Map(outcomes.filter(item => item && item.ok === true).map(item => [item.id, item]));
  const evidenceById = new Map(outcomes.filter(item => item && item.id).map(item => [item.id, item.evidence || '']));
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
    source_clean: request.binding.source_clean === true,
    webkit_backend: 'webkitgtk',
    safari_certification: false,
    engines,
    per_group: roster.perGroup,
    per_engine: roster.perEngine,
    not_applicable: roster.notApplicable,
    note: 'Cases were derived before the browsers launched. WebKitGTK is not Safari. detectChanges, a zero-duration stylesheet, a wrapper background, a missing engine, dirty source, and an unbound artifact are rejected. motion-smoke is a separate source check.',
    cases: roster.ids.map(id => ({
      case_id: id,
      result: byId.has(id) ? 'pass' : 'fail',
      evidence: evidenceById.get(id) || '',
    })),
  };
  const assertionPath = join(request.outputDir, 'motion-observations.json');
  const assertionBytes = Buffer.from(`${JSON.stringify(assertion)}\n`);
  writeFileSync(assertionPath, assertionBytes);
  const relativeAssertion = relative(request.runDir, assertionPath).split('\\').join('/');
  const output = {path: relativeAssertion, sha256: createHash('sha256').update(assertionBytes).digest('hex'), bytes: assertionBytes.length};
  const passedIds = roster.ids.filter(id => byId.has(id));
  const failedIds = roster.ids.filter(id => !byId.has(id));
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
    discovered_case_ids: roster.ids,
    executed_case_ids: roster.ids,
    passed_case_ids: passedIds,
    failed_case_ids: accepted ? [] : failedIds.slice(0, 50),
    skipped_case_ids: [],
    unresolved_case_ids: [],
    exceptions: [],
    passed: passedIds.length,
    failed: accepted ? 0 : failedIds.length,
    skipped: 0,
    outputs: [output],
    case_results: roster.ids.map(id => ({
      case_id: id,
      result: byId.has(id) ? 'pass' : 'fail',
      kind: 'assertion',
      output_paths: [relativeAssertion],
    })),
    command: ['node', 'scripts/native-motion-acceptance.mjs', '--run', request.runId],
    limitations: accepted ? [
      'WebKit evidence is WebKitGTK WebKit2 4.1 with the process sandbox enabled, not Safari certification.',
      'Does not claim G04 or G10.',
      'Source motion-smoke is a separate check.',
      '21.x was not executed.',
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

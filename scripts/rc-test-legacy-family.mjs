#!/usr/bin/env node
/**
 * Run historical families. Workspace-dist is the local iteration default.
 * Pass --run <run.json> to bind to a rehashed packed library artifact.
 *
 *   node scripts/rc-test-legacy-family.mjs --family card
 *   node scripts/rc-test-legacy-family.mjs --family card --run artifacts/main/entry-…/run.json
 *   node scripts/rc-test-legacy-family.mjs --run artifacts/main/entry-…/run.json
 *
 * Full-suite --run without --family does not imply G09 closure by itself.
 */
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  extractLibraryPackage,
  parseLegacyArgs,
  resolveLibraryFromRun,
  workspaceDistPackage,
} from './resolve-run-library.mjs';
import {
  deriveHistoricalRoster,
  discoveryNegativeResults,
  isRunnerControl,
  rejectionReasons,
} from './historical-case-roster.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inventory = JSON.parse(
  fs.readFileSync(path.join(root, 'testing/legacy-runner/historical-inventory.json'), 'utf8'),
);
const known = [...new Set(inventory.rows.map(row => row.family))].sort();

const {runPath, family, tarball, unknown} = parseLegacyArgs(process.argv.slice(2));
if (unknown.length) {
  console.error(`Unknown argument(s): ${unknown.join(' ')}`);
  console.error(
    'usage: node scripts/rc-test-legacy-family.mjs [--family <name>] [--run <run.json>]',
  );
  console.error(`known families: ${known.join(', ')}`);
  process.exit(2);
}
if (!family && !runPath) {
  console.error(
    'usage: node scripts/rc-test-legacy-family.mjs --family <name> [--run <run.json>]',
  );
  console.error('       node scripts/rc-test-legacy-family.mjs --run <run.json>');
  console.error(`known families: ${known.join(', ')}`);
  process.exit(2);
}
if (family && !known.includes(family)) {
  console.error(`Unknown historical family "${family}". Known: ${known.join(', ')}`);
  process.exit(1);
}

let subjectMode = 'workspace-dist';
let packageRoot = null;
let runDir = null;
let runId = null;
let artifactSha = null;

if (runPath) {
  const resolved = resolveLibraryFromRun(runPath, {tarball});
  const extracted = extractLibraryPackage(resolved.tarball, {
    parentDir: path.join(resolved.runDir, `legacy-extract-${Date.now()}`),
  });
  subjectMode = 'artifact';
  packageRoot = extracted.packageRoot;
  runDir = resolved.runDir;
  runId = resolved.runId;
  artifactSha = resolved.digest;
  console.log(
    `legacy-subject: artifact mode run_id=${runId} sha256=${artifactSha.slice(0, 12)} package=${packageRoot}`,
  );
  if (family) {
    console.log(
      `legacy-subject: family=${family} only; unselected families do not count toward the full historical gate`,
    );
  }
} else {
  packageRoot = workspaceDistPackage();
  console.log(`legacy-subject: workspace-dist iteration package=${packageRoot}`);
}

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
let relativeReport;
if (runDir) {
  const reportName = family
    ? `legacy-${family}-${stamp}.json`
    : `legacy-full-${stamp}.json`;
  relativeReport = path.relative(root, path.join(runDir, 'reports', reportName));
} else if (family) {
  relativeReport = path.join('compatibility/rc/reports', `legacy-${family}.json`);
} else {
  relativeReport = path.join('compatibility/rc/reports', `legacy-full-${stamp}.json`);
}

const absReport = path.join(root, relativeReport);
fs.mkdirSync(path.dirname(absReport), {recursive: true});
// Freshness: never let a prior browser JSON survive a failed/aborted run.
if (fs.existsSync(absReport)) fs.rmSync(absReport);

let roster = null;
if (!family) {
  roster = deriveHistoricalRoster(root);
  const specCases = roster.cases.filter(testCase => testCase.kind !== 'shared-export').length;
  console.log(
    `historical-legacy-artifact: derived ${roster.ids.length} case ids (${specCases} component specs, ${roster.shared_cases} shared, ${roster.cases.length - specCases} shared exports) before executing`,
  );
}

const child = spawnSync(process.execPath, ['scripts/run-legacy-tests.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    LEGACY_SPEC_FAMILY: family || '',
    LEGACY_RESULTS_PATH: relativeReport,
    LEGACY_PACKAGE_ROOT: packageRoot,
    LEGACY_SUBJECT_MODE: subjectMode,
    LEGACY_RUN_ID: runId || '',
    LEGACY_ARTIFACT_SHA256: artifactSha || '',
  },
});

if (roster && runPath && !family) {
  const request = coordinatorRequest();
  if (request && request.error) {
    console.error(`historical-legacy-artifact: refusing acceptance report: ${request.error}`);
    process.exit(2);
  }
  if (request) {
    if (!fs.existsSync(absReport)) process.exit(child.status || 1);
    const results = JSON.parse(fs.readFileSync(absReport, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    const library = (manifest.artifacts || []).find(item => item && item.id === 'library');
    const accepted = library ? writeAcceptance(request, roster, results, library) : false;
    if (!accepted || (child.status ?? 1) !== 0) process.exit(child.status || 1);
  }
}
process.exit(child.status ?? 1);

function coordinatorRequest() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length) return {error: `incomplete coordinator environment: ${present.join(', ')}`};
  if (process.env.RC_CHECK_ID !== 'historical-legacy-artifact') return {error: 'RC_CHECK_ID is not historical-legacy-artifact'};
  const invocation = process.env.RC_INVOCATION_ID;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(invocation)) return {error: 'invalid invocation identity'};
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    return {error: 'RC_EVIDENCE_BINDING is not JSON'};
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return {error: 'binding is not an object'};
  if (binding.run_id !== process.env.RC_RUN_ID) return {error: 'binding run_id does not match RC_RUN_ID'};
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  if (!outputDir || !fs.existsSync(outputDir)) return {error: 'assertion output directory is missing'};
  const stat = fs.lstatSync(outputDir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) return {error: 'assertion output directory is not a real directory'};
  const expectedSuffix = path.join('evidence', 'historical-legacy-artifact', invocation);
  if (!outputDir.endsWith(expectedSuffix)) return {error: 'assertion directory is not check-owned'};
  return {binding, invocation, runId: process.env.RC_RUN_ID, outputDir, runDir: path.resolve(outputDir, '..', '..', '..'), line: binding.source_line};
}

function writeAcceptance(request, derived, results, library) {
  if (request.line !== 'main') {
    console.error('historical-legacy-artifact: finite roster is derived for main only');
    return false;
  }
  const executed = Array.isArray(results.specs) ? results.specs : [];
  const context = {
    source_clean: request.binding.source_clean === true,
    subject_mode: results.subject_mode,
    artifact_sha256: results.artifact_sha256,
    library_sha256: library.sha256,
    aggregate_executed: results.totals && results.totals.executed || 0,
    mapped_paths: (results.mapped_specs || []).map(row => row.historical_path),
  };
  const reasons = rejectionReasons(derived, executed, context);
  const negatives = discoveryNegativeResults(derived, executed, context);
  const component = executed.filter(spec => spec && !isRunnerControl(spec.full_name));
  const specCases = derived.cases.filter(testCase => testCase.kind !== 'shared-export');
  const positive = reasons.length === 0;
  const observations = specCases.map((testCase, index) => {
    const spec = component[index];
    const nameMatches = !!spec && spec.full_name === testCase.full_name && spec.success === true && spec.skipped !== true;
    return {
      case_id: testCase.case_id,
      result: positive && nameMatches ? 'pass' : 'fail',
      historical_path: testCase.historical_path,
      candidate: testCase.candidate,
      adaptation: testCase.adaptation,
      shared: testCase.shared,
      full_name: testCase.full_name,
      executed_full_name: spec ? spec.full_name : null,
    };
  });
  for (const testCase of derived.cases.filter(item => item.kind === 'shared-export')) {
    observations.push({
      case_id: testCase.case_id,
      result: positive ? 'pass' : 'fail',
      historical_path: testCase.historical_path,
      candidate: testCase.candidate,
      kind: 'shared-export',
      called_from: testCase.called_from,
    });
  }
  observations.push(...negatives);
  const failed = observations.filter(item => item.result !== 'pass').map(item => item.case_id);
  const accepted = failed.length === 0 && negatives.every(item => item.result === 'pass') && positive;
  const menuPaths = derived.cases.filter(item => item.historical_path.includes('/legacy-menu/')).map(item => item.adaptation);
  const assertion = {
    kind: 'historical-legacy-artifact-observations',
    check_id: 'historical-legacy-artifact',
    run_id: request.runId,
    invocation_id: request.invocation,
    library_sha256: library.sha256,
    executed_total: context.aggregate_executed,
    component_specs: specCases.length,
    runner_controls: executed.length - component.length,
    derived_case_ids: derived.ids.length,
    rejection_reasons: reasons,
    menu_adaptations: [...new Set(menuPaths)],
    note: 'Case ids were derived from the 57 historical paths and the shared suites they call before this execution. The executed total includes runner controls and is not the acceptance denominator. Menu inventory rows are classified in menu_adaptations; identical-to-historical means the one-count gap versus an older 2153 label is not a deleted menu assertion in this tree.',
    cases: observations,
  };
  const assertionPath = path.join(request.outputDir, 'historical-observations.json');
  const assertionBytes = Buffer.from(`${JSON.stringify(assertion, null, 2)}\n`);
  fs.writeFileSync(assertionPath, assertionBytes);
  const relativeAssertion = path.relative(request.runDir, assertionPath).split(path.sep).join('/');
  const output = {
    path: relativeAssertion,
    sha256: cryptoSha(assertionBytes),
    bytes: assertionBytes.length,
  };
  const expectedIds = observations.map(item => item.case_id);
  const report = {
    schema_version: 1,
    template: false,
    run_id: request.runId,
    check_id: 'historical-legacy-artifact',
    line: request.line,
    invocation_id: request.invocation,
    binding: request.binding,
    coverage: accepted ? 'complete' : 'incomplete',
    result: accepted ? 'pass' : 'fail',
    exit_code: accepted ? 0 : 1,
    subject_kind: 'artifact',
    subject_ids: ['library'],
    artifacts: {library: {sha256: library.sha256, bytes: library.bytes}},
    expected_case_ids: expectedIds,
    discovered_case_ids: expectedIds,
    executed_case_ids: expectedIds,
    passed_case_ids: observations.filter(item => item.result === 'pass').map(item => item.case_id),
    failed_case_ids: failed,
    skipped_case_ids: [],
    unresolved_case_ids: [],
    exceptions: [],
    passed: observations.length - failed.length,
    failed: failed.length,
    skipped: 0,
    outputs: [output],
    case_results: observations.map(item => ({
      case_id: item.case_id,
      result: item.result,
      kind: 'assertion',
      output_paths: [relativeAssertion],
    })),
    command: ['node', 'scripts/rc-test-legacy-family.mjs', '--run', runPath],
    limitations: accepted ? [] : [`binding rejected: ${reasons.join(', ') || 'case mismatch'}`],
  };
  if (!accepted) report.coverage = 'incomplete';
  fs.mkdirSync(path.join(request.runDir, 'reports'), {recursive: true});
  fs.writeFileSync(path.join(request.runDir, 'reports', 'historical-legacy-artifact.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `historical-legacy-artifact: bound ${specCases.length} component specs to derived ids; executed total ${context.aggregate_executed}; accepted=${accepted}`,
  );
  return accepted;
}

function cryptoSha(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Reviewed packed-consumer case identities and the coordinator report writer.
 * Expected IDs come from the export registry and the fixed fixture list.
 * They are not copied from a candidate report.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PACKAGE_NAME = '@ngx-compat/material-legacy';

export const AOT_CASE_IDS = [
  'packed-consumer/aot/legacy-button-strict-template',
  'packed-consumer/aot/current-button-separate-scope',
  'packed-consumer/aot/legacy-dialog-select-module',
  'packed-consumer/aot/standalone-harness-host',
];

export const HARNESS_CASE_IDS = [
  'packed-consumer/harness/legacy-button',
  'packed-consumer/harness/legacy-select',
  'packed-consumer/harness/legacy-dialog',
  'packed-consumer/harness/legacy-menu',
  'packed-consumer/harness/legacy-snack-bar',
  'packed-consumer/harness/legacy-tooltip',
  'packed-consumer/harness/legacy-tabs',
  'packed-consumer/harness/native-date-constructor',
  'packed-consumer/harness/native-date-provider',
  'packed-consumer/harness/chip-tabindex-attribute',
  'packed-consumer/harness/radio-tabindex-attribute',
  'packed-consumer/harness/chip-input-backspace-release',
  'packed-consumer/harness/chip-repeated-removal-and-separator',
  'packed-consumer/harness/form-field-error-live-region',
  'packed-consumer/harness/form-field-token-isolation',
  'packed-consumer/harness/progress-bar-location-and-defaults',
  'packed-consumer/harness/common-module-sanity-and-contrast',
  'packed-consumer/harness/checkbox-tabindex-attribute',
  'packed-consumer/harness/slide-toggle-tabindex-attribute',
  'packed-consumer/harness/slider-tabindex-attribute',
  'packed-consumer/harness/tab-link-tabindex-attribute',
  'packed-consumer/harness/peer-icon-literal-sanitization',
  'packed-consumer/harness/owned-resolution',
  'packed-consumer/harness/peer-harness-separate-scope',
];

const DECLARATION_SUFFIXES = [
  'no-workspace-alias',
  'node-path-unset',
  'skip-lib-check-false',
];

export function slugOf(key) {
  return key === '.' ? 'root' : key.slice(2);
}

export function librarySpec(exportKey) {
  if (exportKey === '.') return PACKAGE_NAME;
  return `${PACKAGE_NAME}/${exportKey.slice(2)}`;
}

export function declarationKeys(keys) {
  return keys.filter(key => key !== './_index' && key !== './package.json');
}

export function declarationCaseIds(keys) {
  return [
    ...declarationKeys(keys).map(key => `packed-consumer/declarations/${slugOf(key)}`),
    ...DECLARATION_SUFFIXES.map(name => `packed-consumer/declarations/${name}`),
  ];
}

export function aotCaseIds() {
  return [...AOT_CASE_IDS];
}

export function harnessCaseIds() {
  return [...HARNESS_CASE_IDS];
}

export function allConsumerCaseIds(keys) {
  return [...aotCaseIds(), ...declarationCaseIds(keys), ...harnessCaseIds()];
}

export function lineForPackageVersion(version) {
  const major = String(version ?? '').split('.')[0];
  if (major === '22') return 'main';
  if (major === '21') return '21.x';
  return null;
}

export function readPackedIdentity(tarball) {
  const extracted = spawnSync('tar', ['-xOf', tarball, 'package/package.json'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (extracted.status !== 0 || !extracted.stdout) {
    throw new Error('Tarball has no package/package.json');
  }
  let manifest;
  try {
    manifest = JSON.parse(extracted.stdout);
  } catch {
    throw new Error('package/package.json is not JSON');
  }
  if (!manifest || typeof manifest.version !== 'string' || typeof manifest.name !== 'string') {
    throw new Error('packed package identity is missing name or version');
  }
  return {name: manifest.name, version: manifest.version};
}

export function loadExportKeys() {
  const required = JSON.parse(readFileSync(join(root, 'compatibility/rc/matrices/library-exports.json'), 'utf8'));
  if (!Array.isArray(required.exports) || required.exports.length === 0) {
    throw new Error('Export matrix is empty');
  }
  return required.exports;
}

function gitValue(args) {
  const result = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

export function coordinatorRequest(checkId) {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length) {
    return {error: `incomplete coordinator environment: ${present.join(', ')}`};
  }
  if (process.env.RC_CHECK_ID !== checkId) return {error: `RC_CHECK_ID is not ${checkId}`};
  const invocation = process.env.RC_INVOCATION_ID;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(invocation)) return {error: 'invalid invocation identity'};
  const runId = process.env.RC_RUN_ID;
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,191}$/.test(runId)) return {error: 'invalid run identity'};
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    return {error: 'RC_EVIDENCE_BINDING is not JSON'};
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return {error: 'binding is not an object'};
  if (binding.phase !== undefined) return {error: 'prepack binding cannot authorize this acceptance report'};
  if (binding.run_id !== runId) return {error: 'binding run_id does not match RC_RUN_ID'};
  const commit = gitValue(['rev-parse', 'HEAD']);
  const tree = gitValue(['rev-parse', 'HEAD^{tree}']);
  if (!commit || !tree || binding.source_commit !== commit || binding.source_tree !== tree) {
    return {error: 'binding source identity does not match this checkout'};
  }
  if (binding.source_line !== 'main' && binding.source_line !== '21.x') {
    return {error: 'binding source line is not a supported line'};
  }
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  if (!outputDir || !existsSync(outputDir)) return {error: 'assertion output directory is missing'};
  let stat;
  try {
    stat = lstatSync(outputDir);
  } catch {
    return {error: 'assertion output directory is missing'};
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) return {error: 'assertion output directory is not a real directory'};
  const expectedSuffix = join('evidence', checkId, invocation);
  if (!outputDir.endsWith(expectedSuffix)) return {error: 'assertion directory is not check-owned'};
  const runDir = resolve(outputDir, '..', '..', '..');
  return {binding, invocation, runId, outputDir, runDir, line: binding.source_line, checkId};
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function projectFacts(config) {
  const options = config && config.compilerOptions ? config.compilerOptions : {};
  return {
    skipLibCheckFalse: options.skipLibCheck === false,
    paths: options.paths && typeof options.paths === 'object' ? Object.keys(options.paths) : [],
    strict: options.strict === true,
    strictTemplates: Boolean(config && config.angularCompilerOptions && config.angularCompilerOptions.strictTemplates === true),
  };
}

/**
 * Per-entry declaration observations. `resolvedBySpec` maps a package specifier
 * to an absolute file path. A missing path, a workspace path, or a program
 * that did not typecheck with skipLibCheck:false fails that entry.
 */
export function declarationObservations(keys, resolvedBySpec, facts) {
  const cases = [];
  for (const key of declarationKeys(keys)) {
    const spec = librarySpec(key);
    const found = resolvedBySpec.get(spec) || null;
    let failure = null;
    if (!facts.programOk) failure = 'strict declaration program failed';
    else if (!found) failure = 'specifier did not resolve';
    else if (found.insideWorkspace) failure = 'resolved inside the workspace';
    else if (!found.insideConsumer) failure = 'resolved outside the consumer install';
    cases.push({
      case_id: `packed-consumer/declarations/${slugOf(key)}`,
      result: failure ? 'fail' : 'pass',
      export_key: key,
      specifier: spec,
      resolved_path: found ? found.path : null,
      failure,
    });
  }
  const aliasFailure = facts.aliasKeys && facts.aliasKeys.length
    ? `tsconfig paths alias: ${facts.aliasKeys.join(', ')}`
    : null;
  cases.push({
    case_id: 'packed-consumer/declarations/no-workspace-alias',
    result: aliasFailure ? 'fail' : 'pass',
    alias_keys: facts.aliasKeys || [],
    failure: aliasFailure,
  });
  cases.push({
    case_id: 'packed-consumer/declarations/node-path-unset',
    result: facts.nodePathUnset ? 'pass' : 'fail',
    failure: facts.nodePathUnset ? null : 'NODE_PATH was set for resolution',
  });
  const skipFailure = facts.skipLibCheckFalse ? null : 'a consumer program did not set skipLibCheck:false';
  cases.push({
    case_id: 'packed-consumer/declarations/skip-lib-check-false',
    result: skipFailure ? 'fail' : 'pass',
    projects: facts.projects || [],
    failure: skipFailure,
  });
  return cases;
}

export function writeAcceptanceReport({
  checkId,
  request,
  cases,
  expectedIds,
  library,
  assertionName,
  assertionBody,
  command,
}) {
  const byId = new Map(cases.map(item => [item.case_id, item]));
  const covered = byId.size === expectedIds.length && expectedIds.every(id => byId.has(id));
  const ordered = covered ? expectedIds.map(id => byId.get(id)) : cases;
  const failed = ordered.filter(item => item.result !== 'pass').map(item => item.case_id);
  const passed = covered && failed.length === 0 && request.line === 'main';
  const assertion = {
    kind: `${checkId}-observations`,
    check_id: checkId,
    run_id: request.runId,
    invocation_id: request.invocation,
    library_sha256: library.sha256,
    note: 'Case observations from the consumer. This is not a copy of the package, the manifest, or the report.',
    cases: ordered,
    extra: assertionBody || null,
  };
  const assertionPath = join(request.outputDir, assertionName);
  const assertionBytes = Buffer.from(`${JSON.stringify(assertion, null, 2)}\n`);
  writeFileSync(assertionPath, assertionBytes);
  const relativeAssertion = relative(request.runDir, assertionPath).split('\\').join('/');
  const output = {path: relativeAssertion, sha256: sha256(assertionBytes), bytes: assertionBytes.length};
  const report = {
    schema_version: 1,
    template: false,
    run_id: request.runId,
    check_id: checkId,
    line: request.line,
    invocation_id: request.invocation,
    binding: request.binding,
    coverage: passed ? 'complete' : 'incomplete',
    result: passed ? 'pass' : 'fail',
    exit_code: passed ? 0 : 1,
    subject_kind: 'artifact',
    subject_ids: ['library'],
    artifacts: {library: {sha256: library.sha256, bytes: library.bytes}},
    expected_case_ids: expectedIds,
    discovered_case_ids: covered ? expectedIds : ordered.map(item => item.case_id),
    executed_case_ids: covered ? expectedIds : ordered.map(item => item.case_id),
    passed_case_ids: ordered.filter(item => item.result === 'pass').map(item => item.case_id),
    failed_case_ids: failed,
    skipped_case_ids: [],
    unresolved_case_ids: covered ? [] : expectedIds.filter(id => !byId.has(id)),
    exceptions: [],
    passed: ordered.filter(item => item.result === 'pass').length,
    failed: failed.length + (covered ? 0 : expectedIds.filter(id => !byId.has(id)).length),
    skipped: 0,
    outputs: [output],
    case_results: ordered.map(item => ({
      case_id: item.case_id,
      result: item.result,
      kind: 'assertion',
      output_paths: [relativeAssertion],
    })),
    command,
  };
  if (!passed) report.coverage = 'incomplete';
  const reportsDir = join(request.runDir, 'reports');
  mkdirSync(reportsDir, {recursive: true});
  writeFileSync(join(reportsDir, `${checkId}.json`), `${JSON.stringify(report, null, 2)}\n`);
  return {passed, failed, covered};
}

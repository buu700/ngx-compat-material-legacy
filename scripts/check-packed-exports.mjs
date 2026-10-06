#!/usr/bin/env node
/**
 * Validate a packed library tarball against the reviewed export registry.
 *
 * Expected case IDs and condition targets are derived from
 * compatibility/rc/matrices/library-exports.json and the entrypoint contract
 * before the candidate tarball is read. The tarball is not the source of the
 * expected set.
 *
 *   node scripts/check-packed-exports.mjs --tarball <path>
 *
 * Standalone (no coordinator environment): check the packed targets and exit.
 * That mode does not write an acceptance report.
 *
 * Coordinator mode: when RC_CHECK_ID, RC_RUN_ID, RC_INVOCATION_ID,
 * RC_EVIDENCE_BINDING and RC_ASSERTION_OUTPUT_DIR are all present, write
 * entrypoint observations under the assertion directory and
 * reports/packed-exports.json in that run. coverage "complete" is written
 * only when every reviewed case passes and the binding matches this checkout.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const requiredPath = join(root, 'compatibility/rc/matrices/library-exports.json');

export const PACKAGE_NAME = '@ngx-compat/material-legacy';
export const FESM_PREFIX = 'ngx-compat-material-legacy';
const CONDITION_ORDER = ['sass', 'types', 'default'];
const CASE_PACKAGE_IDENTITY = 'packed-exports/entrypoints/package-identity';
const CASE_NO_UNSUPPORTED = 'packed-exports/entrypoints/no-unsupported-secondaries';

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

export function roleOf(key) {
  if (key === '.') return 'primary';
  if (key === './_index') return 'sass-root';
  if (key === './package.json') return 'package-metadata';
  if (typeof key !== 'string' || !key.startsWith('./legacy-') || key.includes('\0')) return 'unsupported';
  const body = key.slice(2);
  if (body.endsWith('/animations') || body.includes('/animations/')) return 'unsupported';
  if (body.endsWith('/testing')) {
    const parent = body.slice(0, -'/testing'.length);
    if (!parent || parent.includes('/')) return 'unsupported';
    return 'testing';
  }
  if (body.includes('/')) return 'unsupported';
  return 'runtime';
}

export function expectedConditions(key) {
  const role = roleOf(key);
  if (role === 'primary') {
    return {
      sass: './_index.scss',
      types: `./types/${FESM_PREFIX}.d.ts`,
      default: `./fesm2022/${FESM_PREFIX}.mjs`,
    };
  }
  if (role === 'sass-root') return {sass: './_index.scss'};
  if (role === 'package-metadata') return {default: './package.json'};
  if (role !== 'runtime' && role !== 'testing') {
    throw new Error(`no reviewed conditions for ${key}`);
  }
  const body = key.slice(2).replaceAll('/', '-');
  const name = `${FESM_PREFIX}-${body}`;
  return {
    types: `./types/${name}.d.ts`,
    default: `./fesm2022/${name}.mjs`,
  };
}

export function entrypointCaseIds(keys) {
  const ids = [CASE_PACKAGE_IDENTITY, CASE_NO_UNSUPPORTED];
  for (const key of keys) {
    const slug = key === '.' ? 'root' : key.slice(2);
    const conditions = expectedConditions(key);
    for (const condition of CONDITION_ORDER) {
      if (Object.prototype.hasOwnProperty.call(conditions, condition)) {
        ids.push(`packed-exports/entrypoints/${slug}/${condition}`);
      }
    }
  }
  return ids;
}

export function filesForRegistry(keys) {
  const files = new Set();
  for (const key of keys) {
    for (const target of Object.values(expectedConditions(key))) files.add(target);
  }
  return [...files];
}

function loadRegistry() {
  const required = JSON.parse(readFileSync(requiredPath, 'utf8'));
  const keys = required.exports;
  if (!Array.isArray(keys) || keys.length === 0) fail(2, 'Export matrix is empty');
  if (new Set(keys).size !== keys.length) fail(2, 'Export matrix has duplicate keys');
  for (const key of keys) {
    if (roleOf(key) === 'unsupported') fail(2, `Export matrix key has no reviewed role: ${key}`);
  }
  return keys;
}

function isSafeTarget(target) {
  if (typeof target !== 'string' || target.length === 0 || target !== target.trim()) return false;
  if (target.includes('\0') || target.includes('\\') || target.includes('://')) return false;
  if (!target.startsWith('./')) return false;
  const parts = target.slice(2).split('/');
  if (parts.some(part => part === '' || part === '.' || part === '..')) return false;
  return true;
}

function gitValue(args) {
  const result = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function listMembers(tarball) {
  const listed = spawnSync('python3', ['-c', `
import json, sys, tarfile
members = []
with tarfile.open(sys.argv[1], 'r:*') as tar:
    for member in tar.getmembers():
        if member.isfile():
            kind = 'file'
        elif member.isdir():
            kind = 'dir'
        elif member.issym() or member.islnk():
            kind = 'link'
        else:
            kind = 'other'
        members.append({'name': member.name, 'kind': kind})
json.dump(members, sys.stdout)
`, tarball], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  if (listed.status !== 0 || !listed.stdout) fail(1, 'Cannot list tarball members');
  let rows;
  try {
    rows = JSON.parse(listed.stdout);
  } catch {
    fail(1, 'Cannot list tarball members');
  }
  const members = new Map();
  for (const row of rows) {
    if (!row || typeof row.name !== 'string' || members.has(row.name)) {
      fail(1, `Duplicate or invalid tarball member: ${row && row.name}`);
    }
    members.set(row.name, {kind: row.kind});
  }
  return members;
}

function readPackageJson(tarball, members) {
  const info = members.get('package/package.json');
  if (!info || info.kind !== 'file') fail(1, 'Tarball has no regular package/package.json');
  const extracted = spawnSync('tar', ['-xOf', tarball, 'package/package.json'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (extracted.status !== 0 || !extracted.stdout) fail(1, 'Tarball has no package/package.json');
  try {
    return JSON.parse(extracted.stdout);
  } catch {
    fail(1, 'package/package.json is not JSON');
  }
}

function caseResult(caseId, result, detail) {
  return {case_id: caseId, result, ...detail};
}

function observe(keys, pkg, members) {
  const expectedIds = entrypointCaseIds(keys);
  const exportsMap = pkg && typeof pkg.exports === 'object' && pkg.exports && !Array.isArray(pkg.exports)
    ? pkg.exports
    : null;
  const observedKeys = exportsMap ? Object.keys(exportsMap) : [];
  const unexpected = observedKeys.filter(key => !keys.includes(key));
  const missingKeys = keys.filter(key => !observedKeys.includes(key));
  const cases = [];

  const nameOk = pkg && pkg.name === PACKAGE_NAME;
  cases.push(caseResult(CASE_PACKAGE_IDENTITY, nameOk ? 'pass' : 'fail', {
    export_key: null,
    condition: null,
    expected: PACKAGE_NAME,
    observed: pkg ? pkg.name ?? null : null,
    failure: nameOk ? null : 'packed package name does not match the reviewed package identity',
  }));

  const keysOk = unexpected.length === 0 && missingKeys.length === 0 && exportsMap !== null;
  cases.push(caseResult(CASE_NO_UNSUPPORTED, keysOk ? 'pass' : 'fail', {
    export_key: null,
    condition: null,
    expected_keys: keys,
    observed_keys: observedKeys,
    unexpected_keys: unexpected,
    missing_keys: missingKeys,
    failure: keysOk ? null : 'packed export keys differ from the reviewed registry',
  }));

  for (const key of keys) {
    const slug = key === '.' ? 'root' : key.slice(2);
    const conditions = expectedConditions(key);
    const entry = exportsMap ? exportsMap[key] : undefined;
    const entryObject = entry !== null && entry !== undefined && typeof entry === 'object' && !Array.isArray(entry);
    const expectedNames = CONDITION_ORDER.filter(name => Object.prototype.hasOwnProperty.call(conditions, name));
    const actualNames = entryObject ? Object.keys(entry) : [];
    const sameShape = entryObject
      && expectedNames.length === actualNames.length
      && expectedNames.every(name => Object.prototype.hasOwnProperty.call(entry, name));
    for (const condition of expectedNames) {
      const caseId = `packed-exports/entrypoints/${slug}/${condition}`;
      const expectedTarget = conditions[condition];
      let failure = null;
      let observed = null;
      if (!exportsMap || !Object.prototype.hasOwnProperty.call(exportsMap, key)) failure = 'missing export key';
      else if (entry === null) failure = 'null export entry';
      else if (!entryObject) failure = 'malformed export entry';
      else if (!sameShape) failure = `unsupported or missing conditions: ${actualNames.join(', ') || '(none)'}`;
      else if (!Object.prototype.hasOwnProperty.call(entry, condition) || entry[condition] === undefined) {
        failure = 'missing condition';
      } else if (entry[condition] === null) failure = 'null target';
      else if (typeof entry[condition] !== 'string') failure = 'malformed target';
      else {
        observed = entry[condition];
        if (!isSafeTarget(observed)) failure = 'unsafe target';
        else if (observed !== expectedTarget) failure = 'target is not the reviewed path';
        else {
          const member = `package/${observed.slice(2)}`;
          const info = members.get(member);
          if (!info) failure = 'missing target file';
          else if (info.kind !== 'file') failure = 'target is not a regular file inside the package';
        }
      }
      cases.push(caseResult(caseId, failure ? 'fail' : 'pass', {
        export_key: key,
        condition,
        expected_target: expectedTarget,
        observed_target: observed,
        failure,
      }));
    }
  }

  const byId = new Map(cases.map(item => [item.case_id, item]));
  if (byId.size !== expectedIds.length || expectedIds.some(id => !byId.has(id))) {
    fail(2, 'Derived observations do not cover the reviewed entrypoint roster');
  }
  const ordered = expectedIds.map(id => byId.get(id));
  const failed = ordered.filter(item => item.result !== 'pass').map(item => item.case_id);
  return {expectedIds, cases: ordered, failed};
}

function coordinatorRequest() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length) {
    return {error: `incomplete coordinator environment: ${present.join(', ')}`};
  }
  if (process.env.RC_CHECK_ID !== 'packed-exports') return {error: 'RC_CHECK_ID is not packed-exports'};
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
  if (binding.phase !== undefined) return {error: 'prepack binding cannot authorize packed-exports acceptance'};
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
  const expectedSuffix = join('evidence', 'packed-exports', invocation);
  if (!outputDir.endsWith(expectedSuffix)) return {error: 'assertion directory is not check-owned'};
  const runDir = resolve(outputDir, '..', '..', '..');
  return {binding, invocation, runId, outputDir, runDir, line: binding.source_line};
}

function writeAcceptance(request, tarball, observation) {
  const passed = observation.failed.length === 0;
  const assertion = {
    kind: 'packed-export-entrypoint-observations',
    check_id: 'packed-exports',
    run_id: request.runId,
    invocation_id: request.invocation,
    library_sha256: sha256(readFileSync(tarball)),
    note: 'Observed export condition targets. This is not a copy of package.json or the registry.',
    cases: observation.cases,
  };
  const assertionPath = join(request.outputDir, 'entrypoint-observations.json');
  const assertionBytes = Buffer.from(`${JSON.stringify(assertion, null, 2)}\n`);
  writeFileSync(assertionPath, assertionBytes);
  const relativeAssertion = relative(request.runDir, assertionPath).split('\\').join('/');
  const output = {
    path: relativeAssertion,
    sha256: sha256(assertionBytes),
    bytes: assertionBytes.length,
  };
  const report = {
    schema_version: 1,
    template: false,
    run_id: request.runId,
    check_id: 'packed-exports',
    line: request.line,
    invocation_id: request.invocation,
    binding: request.binding,
    coverage: passed ? 'complete' : 'incomplete',
    result: passed ? 'pass' : 'fail',
    exit_code: passed ? 0 : 1,
    subject_kind: 'artifact',
    subject_ids: ['library'],
    artifacts: {
      library: {
        sha256: sha256(readFileSync(tarball)),
        bytes: lstatSync(tarball).size,
      },
    },
    expected_case_ids: observation.expectedIds,
    discovered_case_ids: observation.expectedIds,
    executed_case_ids: observation.expectedIds,
    passed_case_ids: observation.cases.filter(item => item.result === 'pass').map(item => item.case_id),
    failed_case_ids: observation.failed,
    skipped_case_ids: [],
    unresolved_case_ids: [],
    exceptions: [],
    passed: observation.cases.length - observation.failed.length,
    failed: observation.failed.length,
    skipped: 0,
    outputs: [output],
    case_results: observation.cases.map(item => ({
      case_id: item.case_id,
      result: item.result,
      kind: 'assertion',
      output_paths: [relativeAssertion],
    })),
    command: ['node', 'scripts/check-packed-exports.mjs', '--tarball', tarball],
  };
  if (!passed) {
    // A failing observation is diagnostic evidence, not acceptance.
    report.coverage = 'incomplete';
  }
  const reportsDir = join(request.runDir, 'reports');
  mkdirSync(reportsDir, {recursive: true});
  writeFileSync(join(reportsDir, 'packed-exports.json'), `${JSON.stringify(report, null, 2)}\n`);
  return passed;
}

function main() {
  let tarball = null;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === '--tarball') {
      const value = process.argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, '--tarball requires a path');
      tarball = resolve(root, value);
      i += 1;
      continue;
    }
    fail(2, `Unknown argument: ${arg}`);
  }
  if (!tarball) fail(2, '--tarball is required');
  if (!existsSync(tarball)) fail(2, `Missing tarball: ${tarball}`);

  const keys = loadRegistry();
  const expectedIds = entrypointCaseIds(keys);
  console.log(`packed-exports: derived ${expectedIds.length} entrypoint cases from ${keys.length} reviewed registry keys before reading the candidate`);

  const members = listMembers(tarball);
  const pkg = readPackageJson(tarball, members);
  const observation = observe(keys, pkg, members);
  const request = coordinatorRequest();
  if (request && request.error) {
    console.error(`packed-exports: refusing acceptance report: ${request.error}`);
    process.exit(2);
  }
  if (request) {
    const accepted = writeAcceptance(request, tarball, observation);
    if (!accepted) {
      console.error(`Packed export observations failed: ${observation.failed.join(', ')}`);
      process.exit(1);
    }
  } else if (observation.failed.length) {
    console.error(`Packed export observations failed: ${observation.failed.join(', ')}`);
    process.exit(1);
  }
  console.log(`Packed exports include all ${keys.length} required keys`);
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entry) main();

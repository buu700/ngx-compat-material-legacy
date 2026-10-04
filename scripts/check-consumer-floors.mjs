#!/usr/bin/env node
/**
 * Compare advertised library Node/peer floors to lock and installed versions.
 *
 *   node scripts/check-consumer-floors.mjs
 *   node scripts/check-consumer-floors.mjs --out <report.json>
 *
 * Reads engines.node and peerDependencies from projects/ngx-material-legacy.
 * The library Node floor is compared to toolchain-lock.json / .node-version,
 * not process.version. Each peer is compared to the projects/ngx-material-legacy
 * lock importer and the matching installed package.json version.
 * cli-runtime executes migration/dist/package/bin/migrate-legacy.js on the Node
 * that launches this process and checks that version against the CLI engines.node
 * range. It also rejects 17.0.0 with that same range check. It does not execute
 * Node 18 and does not treat the current runtime as a Node 18 floor run.
 * line-isolation uses scripts/rc-verify.py: this checkout's library version must
 * map to main, and --line 21.x against that mapped line must be rejected. It does
 * not copy or run a 21.x manifest.
 * Does not claim G12. Leaves every 21.x consumer-floors group null. Does not mark
 * consumer-floors accepted.
 * A missing installed peer exits 1. Full verify installs node_modules and always
 * runs this script. verify-lite does not execute it.
 */
import {spawnSync} from 'node:child_process';
import {existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultReport = join(root, 'compatibility/rc/reports/consumer-floors.json');
const libraryManifest = join(root, 'projects/ngx-material-legacy/package.json');
const lockPath = join(root, 'pnpm-lock.yaml');
const toolchainPath = join(root, 'toolchain-lock.json');
const nodeVersionPath = join(root, '.node-version');

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {out: defaultReport};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, '--out requires a path');
      args.out = resolve(value);
      i += 1;
    } else {
      fail(2, `Unknown argument: ${arg}`);
    }
  }
  return args;
}

function parseVersion(value) {
  const match = String(value).trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(left, right) {
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}

/** Carets and || unions used by the advertised library floors. */
export function satisfies(version, range) {
  return String(range).split('||').map(part => part.trim()).filter(Boolean).some(part => {
    if (part.startsWith('^')) {
      const versionParts = parseVersion(version);
      const base = parseVersion(part.slice(1).trim());
      if (!versionParts || !base) return false;
      if (compareVersions(versionParts, base) < 0) return false;
      if (base[0] > 0) return versionParts[0] === base[0];
      if (base[1] > 0) return versionParts[0] === 0 && versionParts[1] === base[1];
      return versionParts[0] === 0 && versionParts[1] === 0 && versionParts[2] === base[2];
    }
    if (part.startsWith('>=')) {
      const versionParts = parseVersion(version);
      const base = parseVersion(part.slice(2).trim());
      return Boolean(versionParts && base && compareVersions(versionParts, base) >= 0);
    }
    const versionParts = parseVersion(version);
    const base = parseVersion(part);
    return Boolean(versionParts && base && compareVersions(versionParts, base) === 0);
  });
}

function stripLockVersion(value) {
  return String(value).split('(')[0].trim();
}

/** Exact versions resolved for projects/ngx-material-legacy in pnpm-lock.yaml. */
export function libraryLockVersions(lockText) {
  const lines = String(lockText).split(/\r?\n/);
  const start = lines.findIndex(line => line === '  projects/ngx-material-legacy:');
  if (start < 0) throw new Error('pnpm-lock.yaml is missing projects/ngx-material-legacy');
  const versions = {};
  let name = null;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === 'packages:') break;
    if (/^  [^ ]/.test(line)) break;
    if (line === '') continue;
    const nameMatch = line.match(/^      ('[^']+'|[A-Za-z0-9@/_ .-]+):\s*$/);
    if (nameMatch) {
      name = nameMatch[1].replace(/^'|'$/g, '');
      continue;
    }
    const versionMatch = line.match(/^        version:\s+(\S+)\s*$/);
    if (versionMatch && name) {
      versions[name] = stripLockVersion(versionMatch[1]);
      name = null;
    }
  }
  return versions;
}

export function floorCaseId(kind, name) {
  if (kind === 'engines') return `engines-${name}`;
  if (kind === 'peer') return `peer-${name}`;
  throw new Error(`unknown floor kind: ${kind}`);
}

export function collectDeclaredFloors(manifest) {
  const engines = manifest?.engines;
  const peers = manifest?.peerDependencies;
  if (!engines || typeof engines !== 'object' || typeof engines.node !== 'string' || !engines.node.trim()) {
    throw new Error('library package.json does not advertise engines.node');
  }
  if (!peers || typeof peers !== 'object' || Object.keys(peers).length === 0) {
    throw new Error('library package.json does not advertise peerDependencies');
  }
  const floors = [{kind: 'engines', name: 'node', range: engines.node.trim(), case_id: floorCaseId('engines', 'node')}];
  for (const [name, range] of Object.entries(peers)) {
    if (typeof range !== 'string' || !range.trim()) {
      throw new Error(`peerDependencies.${name} is not a range`);
    }
    floors.push({kind: 'peer', name, range: range.trim(), case_id: floorCaseId('peer', name)});
  }
  return floors;
}

function installedVersion(name) {
  const pkgPath = join(root, 'node_modules', ...name.split('/'), 'package.json');
  if (!existsSync(pkgPath)) throw new Error(`missing installed package: ${name}`);
  const version = JSON.parse(readFileSync(pkgPath, 'utf8')).version;
  if (typeof version !== 'string' || !parseVersion(version)) {
    throw new Error(`installed ${name} has no comparable version`);
  }
  return version;
}

export function evaluateFloors({floors, lockVersions, nodeLockVersion, installed}) {
  const comparisons = [];
  const errors = [];
  for (const floor of floors) {
    if (floor.kind === 'engines' && floor.name === 'node') {
      const lockVersion = nodeLockVersion;
      const installedVersionValue = installed.node;
      const rangeOk = satisfies(lockVersion, floor.range);
      const lockInstalledMatch = lockVersion === installedVersionValue;
      const ok = rangeOk && lockInstalledMatch;
      comparisons.push({
        case_id: floor.case_id,
        kind: floor.kind,
        name: floor.name,
        declared_range: floor.range,
        lock_version: lockVersion,
        installed_version: installedVersionValue,
        range_satisfied: rangeOk,
        lock_matches_installed: lockInstalledMatch,
        result: ok ? 'pass' : 'fail',
      });
      if (!rangeOk) {
        errors.push(`engines.node ${lockVersion} does not satisfy advertised ${floor.range}`);
      }
      if (!lockInstalledMatch) {
        errors.push(`engines.node lock ${lockVersion} != .node-version ${installedVersionValue}`);
      }
      continue;
    }
    if (floor.kind !== 'peer') {
      errors.push(`unsupported floor kind: ${floor.kind}`);
      continue;
    }
    const lockVersion = lockVersions[floor.name];
    const installedVersionValue = installed[floor.name];
    if (!lockVersion) {
      errors.push(`lock is missing resolved version for peer ${floor.name}`);
      comparisons.push({
        case_id: floor.case_id,
        kind: floor.kind,
        name: floor.name,
        declared_range: floor.range,
        lock_version: null,
        installed_version: installedVersionValue ?? null,
        range_satisfied: false,
        lock_matches_installed: false,
        result: 'fail',
      });
      continue;
    }
    if (!installedVersionValue) {
      errors.push(`installed package missing for peer ${floor.name}`);
      comparisons.push({
        case_id: floor.case_id,
        kind: floor.kind,
        name: floor.name,
        declared_range: floor.range,
        lock_version: lockVersion,
        installed_version: null,
        range_satisfied: false,
        lock_matches_installed: false,
        result: 'fail',
      });
      continue;
    }
    const rangeOk = satisfies(installedVersionValue, floor.range);
    const lockInstalledMatch = lockVersion === installedVersionValue;
    const ok = rangeOk && lockInstalledMatch;
    comparisons.push({
      case_id: floor.case_id,
      kind: floor.kind,
      name: floor.name,
      declared_range: floor.range,
      lock_version: lockVersion,
      installed_version: installedVersionValue,
      range_satisfied: rangeOk,
      lock_matches_installed: lockInstalledMatch,
      result: ok ? 'pass' : 'fail',
    });
    if (!rangeOk) {
      errors.push(`peer ${floor.name}@${installedVersionValue} does not satisfy ${floor.range}`);
    }
    if (!lockInstalledMatch) {
      errors.push(`peer ${floor.name} lock ${lockVersion} != installed ${installedVersionValue}`);
    }
  }
  return {comparisons, errors};
}

export function publicEnginesPeersIds(floors) {
  return floors.map(floor => floor.case_id);
}

export function writePublicEnginesPeersAssertions(outputDir, comparisons) {
  if (!Array.isArray(comparisons) || comparisons.length === 0) {
    throw new Error('refusing to emit public-engines-peers assertions without comparisons');
  }
  const written = [];
  for (const comparison of comparisons) {
    if (comparison.result !== 'pass') {
      throw new Error(`refusing to emit a pass assertion for ${comparison.case_id}`);
    }
    if (comparison.range_satisfied !== true || comparison.lock_matches_installed !== true) {
      throw new Error(`refusing to emit a non-comparison pass for ${comparison.case_id}`);
    }
    if (!satisfies(comparison.installed_version, comparison.declared_range)) {
      throw new Error(`refusing to emit ${comparison.case_id}: installed version fails the range`);
    }
    const body = {
      case_id: comparison.case_id,
      result: 'pass',
      kind: 'assertion',
      line: 'main',
      floor_kind: comparison.kind,
      name: comparison.name,
      declared_range: comparison.declared_range,
      lock_version: comparison.lock_version,
      installed_version: comparison.installed_version,
      range_satisfied: true,
      lock_matches_installed: true,
      g12_claim: 'not-passed',
      not_executed: {
        '21.x': null,
      },
    };
    const name = `${comparison.case_id.replaceAll('/', '__')}.json`;
    writeFileSync(join(outputDir, name), `${JSON.stringify(body, null, 2)}\n`);
    written.push(name);
  }
  return written;
}

const cliManifestPath = join(root, 'migration/dist/package/package.json');
const cliBinPath = join(root, 'migration/dist/package/bin/migrate-legacy.js');

const LINE_ISOLATION_PY = `
import importlib.util
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
path = root / "scripts" / "rc-verify.py"
spec = importlib.util.spec_from_file_location("rc_verify_line", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
version = json.loads((root / "projects/ngx-material-legacy/package.json").read_text(encoding="utf-8"))["version"]
mapped = module.source_line_for_library_version(version)
rejection = {"rejected": False, "exit_code": None}
try:
    module.require_line_matches_checkout("21.x", mapped)
except SystemExit as exc:
    rejection = {"rejected": True, "exit_code": exc.code}
print(json.dumps({
    "library_version": version,
    "mapped_line": mapped,
    "rejection": rejection,
}))
`;

function writeAssertionFile(outputDir, body) {
  if (body.result !== 'pass' || body.kind !== 'assertion') {
    throw new Error(`refusing to emit a non-pass assertion for ${body.case_id}`);
  }
  if (body.g12_claim !== 'not-passed') {
    throw new Error(`refusing to claim G12 for ${body.case_id}`);
  }
  if (!body.not_executed || body.not_executed['21.x'] !== null || Object.keys(body.not_executed).some(key => key !== '21.x')) {
    throw new Error(`refusing to roster a 21.x result for ${body.case_id}`);
  }
  const name = `${String(body.case_id).replaceAll('/', '__')}.json`;
  writeFileSync(join(outputDir, name), `${JSON.stringify(body, null, 2)}\n`);
  return name;
}

/** Run the bundled migrate CLI with this Node. Does not launch Node 18 or Node 17. */
export function executeCliRuntime() {
  const manifest = JSON.parse(readFileSync(cliManifestPath, 'utf8'));
  const enginesRange = manifest?.engines?.node;
  if (typeof enginesRange !== 'string' || !enginesRange.trim()) {
    throw new Error('migrate CLI package.json does not advertise engines.node');
  }
  const range = enginesRange.trim();
  if (!existsSync(cliBinPath)) {
    throw new Error('migrate CLI bin is missing');
  }
  const dir = mkdtempSync(join(tmpdir(), 'ngx-cli-runtime-'));
  let payload;
  try {
    writeFileSync(join(dir, 'sample.scss'), '.ok { color: red; }\n');
    const child = spawnSync(process.execPath, [
      '--input-type=module',
      '-e',
      `import {spawnSync} from 'node:child_process';
const [bin, target] = process.argv.slice(1);
const cli = spawnSync(process.execPath, [bin, target, '--json'], {encoding: 'utf8'});
let summary = null;
try { summary = JSON.parse(cli.stdout); } catch { summary = null; }
console.log(JSON.stringify({
  node: process.version,
  execPath: process.execPath,
  status: cli.status,
  summary,
}));`,
      cliBinPath,
      dir,
    ], {encoding: 'utf8', cwd: root});
    if (child.status !== 0) {
      throw new Error(child.stderr || child.stdout || 'cli runtime probe failed');
    }
    payload = JSON.parse(child.stdout);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
  const summary = payload.summary && typeof payload.summary === 'object' ? payload.summary : {};
  const nodeVersion = typeof payload.node === 'string' ? payload.node : '';
  const comparable = nodeVersion.replace(/^v/i, '');
  const nodeMajor = parseVersion(comparable)?.[0] ?? null;
  const ran = payload.status === 0
    && payload.execPath === process.execPath
    && summary.distribution === 'bundled-cli'
    && summary.mode === 'dry-run'
    && summary.files_scanned === 1
    && summary.engines?.node === range
    && summary.blocking === 0;
  const rangeOk = Boolean(comparable) && satisfies(comparable, range);
  const belowSatisfies = satisfies('17.0.0', range);
  return {
    node_18_executed: nodeMajor === 18,
    cases: [
      {
        case_id: 'current-runtime-satisfies',
        group: 'cli-runtime',
        node_version: nodeVersion,
        exec_path: payload.execPath ?? null,
        engines_range: range,
        range_satisfied: rangeOk,
        cli_exit_code: payload.status ?? null,
        cli_distribution: summary.distribution ?? null,
        cli_mode: summary.mode ?? null,
        files_scanned: summary.files_scanned ?? null,
        cli_engines_node: summary.engines?.node ?? null,
        node_18_executed: nodeMajor === 18,
        result: ran && rangeOk ? 'pass' : 'fail',
      },
      {
        case_id: 'below-floor-rejected',
        group: 'cli-runtime',
        probed_version: '17.0.0',
        engines_range: range,
        range_satisfied: belowSatisfies,
        runtime_executed: false,
        result: belowSatisfies === false ? 'pass' : 'fail',
      },
    ],
  };
}

/** Ask rc-verify whether this checkout version maps to main and rejects --line 21.x. */
export function executeLineIsolation() {
  const child = spawnSync('python3', ['-c', LINE_ISOLATION_PY, root], {
    encoding: 'utf8',
    cwd: root,
  });
  if (child.status !== 0) {
    throw new Error(child.stderr || child.stdout || 'line isolation probe failed');
  }
  const payload = JSON.parse(child.stdout);
  const stderr = child.stderr || '';
  const version = payload.library_version;
  const mapped = payload.mapped_line;
  const maps = version === '22.0.0-rc.0' && mapped === 'main';
  const rejected = payload.rejection?.rejected === true
    && payload.rejection?.exit_code === 2
    && mapped === 'main'
    && version === '22.0.0-rc.0'
    && stderr.includes('verify: --line does not match this checkout library version');
  return {
    copied_21x_manifest: false,
    cases: [
      {
        case_id: 'checkout-22-maps-to-main',
        group: 'line-isolation',
        library_version: version ?? null,
        mapped_line: mapped ?? null,
        result: maps ? 'pass' : 'fail',
      },
      {
        case_id: 'requested-21x-rejected',
        group: 'line-isolation',
        requested_line: '21.x',
        checkout_line: mapped ?? null,
        library_version: version ?? null,
        rejected: payload.rejection?.rejected === true,
        exit_code: payload.rejection?.exit_code ?? null,
        verifier_message: stderr.trim(),
        result: rejected ? 'pass' : 'fail',
      },
    ],
  };
}

export function passingCaseIds(cases) {
  return cases.filter(item => item.result === 'pass').map(item => item.case_id);
}

export function writeCliAndLineAssertions(outputDir, cliRuntime, lineIsolation) {
  const written = [];
  const cliIds = cliRuntime.cases.map(item => item.case_id);
  const lineIds = lineIsolation.cases.map(item => item.case_id);
  if (cliIds.join(',') !== 'current-runtime-satisfies,below-floor-rejected') {
    throw new Error('refusing to emit cli-runtime cases that were not the executed pair');
  }
  if (lineIds.join(',') !== 'checkout-22-maps-to-main,requested-21x-rejected') {
    throw new Error('refusing to emit line-isolation cases that were not the executed pair');
  }
  if (lineIsolation.copied_21x_manifest !== false) {
    throw new Error('refusing to treat a copied 21.x manifest as line isolation');
  }
  for (const item of [...cliRuntime.cases, ...lineIsolation.cases]) {
    if (item.result !== 'pass') {
      throw new Error(`refusing to emit a pass assertion for ${item.case_id}`);
    }
    const body = {
      ...item,
      result: 'pass',
      kind: 'assertion',
      line: 'main',
      g12_claim: 'not-passed',
      separate_node_18_floor_case: false,
      copied_21x_manifest: false,
      not_executed: {'21.x': null},
    };
    if (item.case_id === 'current-runtime-satisfies') {
      if (item.range_satisfied !== true || item.cli_exit_code !== 0 || item.files_scanned !== 1) {
        throw new Error('refusing to emit current-runtime-satisfies without a real CLI run');
      }
      if (!satisfies(String(item.node_version), item.engines_range)) {
        throw new Error('refusing to emit current-runtime-satisfies: runtime fails the CLI range');
      }
      const major = parseVersion(String(item.node_version))?.[0] ?? null;
      if ((major === 18) !== (item.node_18_executed === true)) {
        throw new Error('refusing to emit current-runtime-satisfies: node_18_executed does not match the runtime');
      }
      if (item.case_id !== 'current-runtime-satisfies') {
        throw new Error('refusing to rename the current runtime into a Node 18 floor case');
      }
    }
    if (item.case_id === 'below-floor-rejected') {
      if (item.probed_version !== '17.0.0' || item.range_satisfied !== false || item.runtime_executed !== false) {
        throw new Error('refusing to emit below-floor-rejected without a real range rejection');
      }
      if (satisfies('17.0.0', item.engines_range)) {
        throw new Error('refusing to emit below-floor-rejected: 17.0.0 satisfies the CLI range');
      }
    }
    if (item.case_id === 'checkout-22-maps-to-main') {
      if (item.library_version !== '22.0.0-rc.0' || item.mapped_line !== 'main') {
        throw new Error('refusing to emit checkout-22-maps-to-main for a different checkout');
      }
    }
    if (item.case_id === 'requested-21x-rejected') {
      if (item.requested_line !== '21.x' || item.rejected !== true || item.exit_code !== 2) {
        throw new Error('refusing to emit requested-21x-rejected without the verifier rejection');
      }
      if (item.library_version !== '22.0.0-rc.0' || item.checkout_line !== 'main') {
        throw new Error('refusing to emit requested-21x-rejected against a different checkout');
      }
      if (!String(item.verifier_message || '').includes('--line does not match this checkout library version')) {
        throw new Error('refusing to emit requested-21x-rejected without the verifier message');
      }
    }
    written.push(writeAssertionFile(outputDir, body));
  }
  return written;
}

function assertionOutputDir() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length || process.env.RC_CHECK_ID !== 'consumer-floors') {
    fail(2, 'consumer-floors: incomplete coordinator environment');
  }
  const invocation = process.env.RC_INVOCATION_ID;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,191}$/.test(invocation)) {
    fail(2, 'consumer-floors: invalid invocation identity');
  }
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    fail(2, 'consumer-floors: RC_EVIDENCE_BINDING is not JSON');
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    fail(2, 'consumer-floors: binding is not an object');
  }
  if (binding.source_line === '21.x') return null;
  if (binding.source_line !== 'main') fail(2, 'consumer-floors: binding source line is not main');
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  let stat;
  try {
    stat = lstatSync(outputDir);
  } catch {
    fail(2, 'consumer-floors: assertion output directory is missing');
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(2, 'consumer-floors: assertion output directory is not a real directory');
  }
  if (!outputDir.endsWith(join('evidence', 'consumer-floors', invocation))) {
    fail(2, 'consumer-floors: assertion directory is not check-owned');
  }
  return outputDir;
}

function main(argv) {
  const args = parseArgs(argv);
  const cliRuntime = executeCliRuntime();
  const lineIsolation = executeLineIsolation();
  const manifest = JSON.parse(readFileSync(libraryManifest, 'utf8'));
  const floors = collectDeclaredFloors(manifest);
  const lockVersions = libraryLockVersions(readFileSync(lockPath, 'utf8'));
  const toolchain = JSON.parse(readFileSync(toolchainPath, 'utf8'));
  const nodeLockVersion = toolchain?.repository?.node;
  if (typeof nodeLockVersion !== 'string' || !parseVersion(nodeLockVersion)) {
    fail(1, 'toolchain-lock.json repository.node is missing');
  }
  const nodeFileVersion = readFileSync(nodeVersionPath, 'utf8').trim();
  const installed = {node: nodeFileVersion};
  for (const floor of floors) {
    if (floor.kind === 'peer') installed[floor.name] = installedVersion(floor.name);
  }
  const {comparisons, errors} = evaluateFloors({
    floors,
    lockVersions,
    nodeLockVersion,
    installed,
  });
  for (const item of [...cliRuntime.cases, ...lineIsolation.cases]) {
    if (item.result !== 'pass') errors.push(`${item.case_id} did not pass`);
  }
  const cliCaseIds = passingCaseIds(cliRuntime.cases);
  const lineCaseIds = passingCaseIds(lineIsolation.cases);
  const report = {
    schema_version: 1,
    role: 'Advertised consumer engines/peers vs lock and installed versions',
    check_id: 'consumer-floors',
    coverage: 'slice',
    source_manifest: 'projects/ngx-material-legacy/package.json',
    process_node: process.version,
    process_node_used_for_floor: false,
    process_node_used_for_cli_runtime: true,
    node_18_executed: cliRuntime.node_18_executed,
    rostered_group: 'public-engines-peers',
    case_ids: publicEnginesPeersIds(floors),
    cli_runtime: {
      node_18_executed: cliRuntime.node_18_executed,
      case_ids: cliCaseIds,
      cases: cliRuntime.cases,
    },
    line_isolation: {
      copied_21x_manifest: false,
      case_ids: lineCaseIds,
      cases: lineIsolation.cases,
    },
    cases_by_line_21x: {
      'public-engines-peers': null,
      'cli-runtime': null,
      'line-isolation': null,
    },
    comparisons,
    result: errors.length ? 'fail' : 'pass',
    g12_claim: 'not-passed',
    limitations: [
      'Compares advertised library engines.node and peerDependencies to lock and installed versions.',
      'Library Node floor uses toolchain-lock.json / .node-version, not process.version.',
      cliRuntime.node_18_executed
        ? 'cli-runtime ran on Node 18 and records that version as current-runtime-satisfies. It still does not add a separate floor case.'
        : 'cli-runtime is the migrate CLI on the Node that ran it, not the library engines floor and not a Node 18 execution.',
      'line-isolation maps this checkout library version through rc-verify and rejects --line 21.x. It is not a 21.x run.',
      'Every 21.x consumer-floors group stays null.',
      'Does not claim G12. Does not mark consumer-floors accepted.',
    ],
  };
  mkdirSync(dirname(args.out), {recursive: true});
  writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
  let assertion_files = null;
  const outputDir = assertionOutputDir();
  if (outputDir && errors.length === 0) {
    try {
      assertion_files = [
        ...writePublicEnginesPeersAssertions(outputDir, comparisons),
        ...writeCliAndLineAssertions(outputDir, cliRuntime, lineIsolation),
      ];
    } catch (error) {
      fail(1, error instanceof Error ? error.message : String(error));
    }
  }
  console.log(JSON.stringify({
    ok: errors.length === 0,
    assertion_files,
    case_ids: report.case_ids,
    cli_runtime_case_ids: cliCaseIds,
    line_isolation_case_ids: lineCaseIds,
    node_18_executed: cliRuntime.node_18_executed,
    comparisons: comparisons.map(item => ({
      case_id: item.case_id,
      declared_range: item.declared_range,
      lock_version: item.lock_version,
      installed_version: item.installed_version,
      result: item.result,
    })),
    errors,
    process_node: process.version,
  }));
  return errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}

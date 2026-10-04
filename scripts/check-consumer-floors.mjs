#!/usr/bin/env node
/**
 * Compare advertised library Node/peer floors to lock and installed versions.
 *
 *   node scripts/check-consumer-floors.mjs
 *   node scripts/check-consumer-floors.mjs --out <report.json>
 *
 * Reads engines.node and peerDependencies from projects/ngx-material-legacy.
 * Node is compared to toolchain-lock.json / .node-version, not process.version.
 * Each peer is compared to the projects/ngx-material-legacy lock importer and
 * the matching installed package.json version. One assertion per declared floor.
 * Does not claim G12. Leaves cli-runtime, line-isolation, and every 21.x group
 * null. Does not mark consumer-floors accepted.
 */
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
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
        'cli-runtime': null,
        'line-isolation': null,
        '21.x': null,
      },
    };
    const name = `${comparison.case_id.replaceAll('/', '__')}.json`;
    writeFileSync(join(outputDir, name), `${JSON.stringify(body, null, 2)}\n`);
    written.push(name);
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
  const report = {
    schema_version: 1,
    role: 'Advertised consumer engines/peers vs lock and installed versions',
    check_id: 'consumer-floors',
    coverage: 'slice',
    source_manifest: 'projects/ngx-material-legacy/package.json',
    process_node: process.version,
    process_node_used_for_floor: false,
    rostered_group: 'public-engines-peers',
    case_ids: publicEnginesPeersIds(floors),
    comparisons,
    result: errors.length ? 'fail' : 'pass',
    g12_claim: 'not-passed',
    limitations: [
      'Compares advertised library engines.node and peerDependencies only.',
      'Node floor uses toolchain-lock.json / .node-version, not process.version.',
      'cli-runtime, line-isolation, and every 21.x consumer-floors group stay null.',
      'Does not claim G12. Does not mark consumer-floors accepted.',
    ],
  };
  mkdirSync(dirname(args.out), {recursive: true});
  writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
  let assertion_files = null;
  const outputDir = assertionOutputDir();
  if (outputDir) {
    if (errors.length === 0) {
      try {
        assertion_files = writePublicEnginesPeersAssertions(outputDir, comparisons);
      } catch (error) {
        fail(1, error instanceof Error ? error.message : String(error));
      }
    }
  }
  console.log(JSON.stringify({
    ok: errors.length === 0,
    assertion_files,
    case_ids: report.case_ids,
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

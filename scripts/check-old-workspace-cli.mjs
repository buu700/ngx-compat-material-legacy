#!/usr/bin/env node
/**
 * Run migration/dist/package/bin/migrate-legacy.js against a disposable
 * Material 16.2.14 workspace. The workspace is a temp directory whose
 * package.json and lock are the sealed reference environment, plus fixture
 * sources the CLI scans. The committed CLI tarball is not the subject.
 *
 * Rosters only fixture cases the CLI actually rewrites. Does not claim G04
 * or G05. Leaves packaged-schematic, transaction-negatives, frontend-parity,
 * and every 21.x migration group null.
 *
 *   node scripts/check-old-workspace-cli.mjs --out <report.json>
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = join(root, 'fixtures/migration/cases.json');
const packageJsonPath = join(root, 'reference/material-16.2.14/environment-package.json');
const packageLockPath = join(root, 'reference/material-16.2.14/environment-package-lock.json');
const provenancePath = join(root, 'reference/material-16.2.14/PROVENANCE.json');
const cliBinPath = join(root, 'migration/dist/package/bin/migrate-legacy.js');
const cliLibPaths = [
  join(root, 'migration/dist/package/lib/ts-rewrite.js'),
  join(root, 'migration/dist/package/lib/sass-rewrite.js'),
];
const cliPathRelative = 'migration/dist/package/bin/migrate-legacy.js';

const OPTION_FLAGS = [
  ['acknowledgeCompanionBridges', '--acknowledge-companion-bridges'],
  ['acknowledgeAggregates', '--acknowledge-aggregates'],
  ['acknowledgeCurrentComponents', '--acknowledge-current-components'],
];
const KNOWN_OPTIONS = new Set([...OPTION_FLAGS.map(([key]) => key), 'syntax']);

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function fileIdentity(path, rel) {
  const bytes = readFileSync(path);
  return {path: rel, sha256: sha256(bytes), bytes: bytes.length};
}

export function loadCatalog() {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  if (!Array.isArray(catalog.cases) || catalog.cases.length === 0) {
    throw new Error('migration fixture catalog has no cases');
  }
  const seen = new Set();
  for (const item of catalog.cases) {
    if (!item || typeof item.id !== 'string' || !item.id) {
      throw new Error('migration fixture case is missing an id');
    }
    if (seen.has(item.id)) throw new Error(`duplicate migration fixture id: ${item.id}`);
    seen.add(item.id);
  }
  return catalog;
}

function extensionFor(language) {
  if (language === 'typescript') return 'ts';
  if (language === 'scss') return 'scss';
  if (language === 'sass') return 'sass';
  throw new Error(`unsupported migration fixture language: ${language}`);
}

/** Fixture cases whose expected bytes are a completed rewrite, in catalog order. */
export function rewriteCases(catalog) {
  const selected = [];
  for (const item of catalog.cases) {
    if (typeof item.expected_after !== 'string' || item.expected_after === item.before) continue;
    if (item.expect_ok === false) {
      throw new Error(`${item.id} is marked refused and cannot be rostered as a rewrite`);
    }
    const options = item.options && typeof item.options === 'object' ? item.options : {};
    for (const key of Object.keys(options)) {
      if (!KNOWN_OPTIONS.has(key)) {
        throw new Error(`${item.id} has an unsupported option: ${key}`);
      }
    }
    selected.push(item);
  }
  if (selected.length === 0) throw new Error('no migration fixture rewrite cases to execute');
  return selected;
}

export function flagsFor(cases) {
  const flags = [];
  for (const [key, flag] of OPTION_FLAGS) {
    if (cases.some(item => item.options && item.options[key] === true)) flags.push(flag);
  }
  return flags;
}

function assertInside(parent, child) {
  const rel = relative(parent, child);
  if (rel.startsWith('..') || rel === '' || resolve(child) === resolve(parent)) {
    throw new Error(`refusing to use a workspace path outside the temp directory: ${child}`);
  }
}

export function executeOldWorkspaceCli() {
  if (!existsSync(cliBinPath)) throw new Error('migrate CLI bin is missing');
  for (const lib of cliLibPaths) {
    if (!existsSync(lib)) throw new Error(`migrate CLI support file is missing: ${lib}`);
  }
  const catalog = loadCatalog();
  const cases = rewriteCases(catalog);
  const flags = flagsFor(cases);
  const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
  if (provenance.package !== '@angular/material' || provenance.package_version !== '16.2.14') {
    throw new Error('sealed provenance is not Material 16.2.14');
  }
  const expectedManifest = provenance.isolated_environment?.material_manifest_sha256;
  if (typeof expectedManifest !== 'string' || !/^[a-f0-9]{64}$/.test(expectedManifest)) {
    throw new Error('sealed provenance has no Material manifest hash');
  }
  const lock = JSON.parse(readFileSync(packageLockPath, 'utf8'));
  const locked = lock.packages?.['node_modules/@angular/material'];
  if (!locked || locked.version !== '16.2.14' || typeof locked.integrity !== 'string') {
    throw new Error('sealed lock does not pin @angular/material 16.2.14');
  }

  const cli = fileIdentity(cliBinPath, cliPathRelative);
  const support = cliLibPaths.map(path => fileIdentity(
    path,
    relative(root, path).split('\\').join('/'),
  ));
  const work = mkdtempSync(join(tmpdir(), 'ngx-old-workspace-cli-'));
  const repoResolved = resolve(root);
  if (resolve(work).startsWith(repoResolved)) {
    throw new Error('refusing to build the disposable workspace inside the repository');
  }
  try {
    copyFileSync(packageJsonPath, join(work, 'package.json'));
    copyFileSync(packageLockPath, join(work, 'package-lock.json'));
    const packageBefore = readFileSync(join(work, 'package.json'));
    const install = spawnSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: work,
      encoding: 'utf8',
      timeout: 180000,
    });
    if (install.status !== 0) {
      throw new Error((install.stderr || install.stdout || 'npm ci failed').slice(-2000));
    }
    const installedManifestPath = join(work, 'node_modules/@angular/material/package.json');
    const installedManifestBytes = readFileSync(installedManifestPath);
    const installedManifest = JSON.parse(installedManifestBytes.toString('utf8'));
    const installedHash = sha256(installedManifestBytes);
    if (installedManifest.version !== '16.2.14' || installedHash !== expectedManifest) {
      throw new Error(`installed @angular/material is not the sealed 16.2.14 manifest (${installedHash})`);
    }
    const legacyButton = join(work, 'node_modules/@angular/material/legacy-button');
    if (!existsSync(legacyButton)) {
      throw new Error('installed Material 16.2.14 has no legacy-button entry');
    }

    mkdirSync(join(work, 'src'));
    const written = [];
    for (const item of cases) {
      const rel = `src/${item.id}.${extensionFor(item.language)}`;
      const abs = join(work, rel);
      assertInside(work, abs);
      writeFileSync(abs, item.before);
      written.push({item, rel, abs, before: item.before});
    }

    const args = [cliBinPath, work, '--apply', '--json', ...flags];
    const child = spawnSync(process.execPath, args, {cwd: work, encoding: 'utf8'});
    let summary = null;
    try {
      summary = JSON.parse(child.stdout);
    } catch {
      summary = null;
    }
    if (child.status !== 0 || !summary) {
      throw new Error(`migrate CLI failed (${child.status})\n${child.stderr || ''}\n${child.stdout || ''}`);
    }
    if (summary.mode !== 'apply' || summary.distribution !== 'bundled-cli') {
      throw new Error('migrate CLI did not apply as the bundled CLI');
    }
    if (summary.files_scanned !== written.length || summary.applied !== written.length || summary.blocking !== 0) {
      throw new Error(`migrate CLI did not rewrite every selected file: ${child.stdout}`);
    }
    if (readFileSync(join(work, 'package.json')).equals(packageBefore) !== true) {
      throw new Error('migrate CLI changed package.json');
    }
    const still = JSON.parse(readFileSync(installedManifestPath, 'utf8'));
    if (still.version !== '16.2.14') throw new Error('migrate CLI changed the installed Material version');

    const changes = [];
    for (const file of written) {
      const after = readFileSync(file.abs, 'utf8');
      if (after !== file.item.expected_after) {
        throw new Error(`${file.item.id} was not rewritten to the fixture expectation`);
      }
      if (after === file.before) throw new Error(`${file.item.id} was scanned but not changed`);
      const record = (summary.records || []).find(item => item.path === file.rel);
      if (!record || record.applied !== true || record.changed !== true || record.ok !== true) {
        throw new Error(`${file.item.id} was not reported as applied by the CLI`);
      }
      changes.push({
        case_id: file.item.id,
        path: file.rel,
        language: file.item.language,
        before: file.before,
        after,
        before_sha256: sha256(file.before),
        after_sha256: sha256(after),
        changed: true,
        applied: true,
      });
    }

    return {
      schema_version: 1,
      role: 'packaged migrate CLI on a disposable Material 16.2.14 workspace',
      check_id: 'migration-packaged',
      group: 'old-workspace-cli',
      coverage: 'slice',
      line: 'main',
      g04_claim: 'not-passed',
      g05_claim: 'not-passed',
      tarball_used: false,
      cli,
      cli_support: support,
      command: [process.execPath, cliPathRelative, '<temp-workspace>', '--apply', '--json', ...flags],
      command_argv: [process.execPath, ...args],
      node: process.version,
      workspace: {
        disposable: true,
        package_json: true,
        authenticated_inputs: {
          package_json: 'reference/material-16.2.14/environment-package.json',
          package_lock: 'reference/material-16.2.14/environment-package-lock.json',
          provenance: 'reference/material-16.2.14/PROVENANCE.json',
          fixture_catalog: 'fixtures/migration/cases.json',
        },
        material_package: '@angular/material',
        material_version: '16.2.14',
        material_manifest_sha256: installedHash,
        material_manifest_matches_provenance: true,
        material_lock_integrity: locked.integrity,
        legacy_button_entry: true,
        files_scanned: summary.files_scanned,
        safe_edits: summary.safe_edits,
        applied: summary.applied,
        blocking: summary.blocking,
        package_json_unchanged: true,
        node_modules_not_rewritten: true,
      },
      discovered_fixture_count: catalog.cases.length,
      not_rostered: catalog.cases.filter(item => !cases.some(selected => selected.id === item.id)).map(item => item.id),
      case_ids: changes.map(item => item.case_id),
      changes,
      cases_by_line_21x: {
        'old-workspace-cli': null,
        'packaged-schematic': null,
        'transaction-negatives': null,
        'frontend-parity': null,
      },
      other_groups: {
        'packaged-schematic': null,
        'transaction-negatives': null,
        'frontend-parity': null,
      },
      result: 'pass',
      limitations: [
        'Runs node on migration/dist/package/bin/migrate-legacy.js. The committed CLI tarball is not the acceptance subject.',
        'The temp workspace is npm ci of the sealed Material 16.2.14 reference environment plus fixture sources. It is not an in-memory schematic host.',
        'Only fixture cases the CLI applied are rostered. Refused and unchanged fixtures are not passing cases.',
        'packaged-schematic, transaction-negatives, and frontend-parity were not executed.',
        'Every 21.x migration group stays null. Does not claim G04 or G05.',
      ],
    };
  } finally {
    rmSync(work, {recursive: true, force: true});
  }
}

export function assertionOutputDir() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length || process.env.RC_CHECK_ID !== 'migration-packaged') {
    fail(2, 'old-workspace-cli: incomplete coordinator environment');
  }
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    fail(2, 'old-workspace-cli: RC_EVIDENCE_BINDING is not JSON');
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    fail(2, 'old-workspace-cli: binding is not an object');
  }
  if (binding.source_line === '21.x') return null;
  if (binding.source_line !== 'main') fail(2, 'old-workspace-cli: binding source line is not main');
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  let stat;
  try {
    stat = lstatSync(outputDir);
  } catch {
    fail(2, 'old-workspace-cli: assertion output directory is missing');
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(2, 'old-workspace-cli: assertion output directory is not a real directory');
  }
  const invocation = process.env.RC_INVOCATION_ID;
  if (!outputDir.endsWith(join('evidence', 'migration-packaged', invocation))) {
    fail(2, 'old-workspace-cli: assertion directory is not check-owned');
  }
  return outputDir;
}

export function writeAssertions(outputDir, report) {
  if (report.result !== 'pass' || report.tarball_used !== false) {
    throw new Error('refusing to emit an old-workspace-cli assertion without a real CLI apply');
  }
  if (report.g04_claim !== 'not-passed' || report.g05_claim !== 'not-passed') {
    throw new Error('refusing to claim G04 or G05');
  }
  if (report.cli?.path !== cliPathRelative || report.workspace?.material_version !== '16.2.14') {
    throw new Error('refusing to emit an assertion for a different CLI or Material package');
  }
  if (!report.workspace.material_manifest_matches_provenance || report.workspace.legacy_button_entry !== true) {
    throw new Error('refusing to emit an assertion without the sealed Material 16.2.14 install');
  }
  for (const [group, ids] of Object.entries(report.other_groups)) {
    if (ids !== null) throw new Error(`refusing to roster ${group}`);
  }
  for (const ids of Object.values(report.cases_by_line_21x)) {
    if (ids !== null) throw new Error('refusing to copy a main result onto 21.x');
  }
  const written = [];
  for (const change of report.changes) {
    if (change.changed !== true || change.applied !== true || change.before === change.after) {
      throw new Error(`refusing to emit ${change.case_id} without a real rewrite`);
    }
    const body = {
      case_id: change.case_id,
      result: 'pass',
      kind: 'assertion',
      line: 'main',
      group: 'old-workspace-cli',
      path: change.path,
      before_sha256: change.before_sha256,
      after_sha256: change.after_sha256,
      cli_path: report.cli.path,
      cli_sha256: report.cli.sha256,
      cli_bytes: report.cli.bytes,
      tarball_used: false,
      material_version: report.workspace.material_version,
      material_manifest_sha256: report.workspace.material_manifest_sha256,
      command: report.command,
      g04_claim: 'not-passed',
      g05_claim: 'not-passed',
      not_executed: {
        'packaged-schematic': null,
        'transaction-negatives': null,
        'frontend-parity': null,
        '21.x': null,
      },
    };
    const name = `${change.case_id.replaceAll('/', '__')}.json`;
    writeFileSync(join(outputDir, name), `${JSON.stringify(body, null, 2)}\n`);
    written.push(name);
  }
  return written;
}

function parseArgs(argv) {
  let out = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, '--out requires a path');
      out = resolve(value);
      i += 1;
      continue;
    }
    fail(2, `Unknown argument: ${arg}`);
  }
  if (!out) fail(2, '--out requires a path');
  return out;
}

function main(argv) {
  const out = parseArgs(argv);
  let report;
  try {
    report = executeOldWorkspaceCli();
  } catch (error) {
    fail(1, error instanceof Error ? error.message : String(error));
  }
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  let assertion_files = null;
  const outputDir = assertionOutputDir();
  if (outputDir) {
    try {
      assertion_files = writeAssertions(outputDir, report);
    } catch (error) {
      fail(1, error instanceof Error ? error.message : String(error));
    }
  }
  console.log(JSON.stringify({
    ok: true,
    case_ids: report.case_ids,
    files_scanned: report.workspace.files_scanned,
    applied: report.workspace.applied,
    material_version: report.workspace.material_version,
    material_manifest_sha256: report.workspace.material_manifest_sha256,
    cli_path: report.cli.path,
    cli_sha256: report.cli.sha256,
    tarball_used: false,
    assertion_files,
    g04_claim: report.g04_claim,
    g05_claim: report.g05_claim,
  }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}

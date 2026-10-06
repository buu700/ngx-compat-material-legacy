#!/usr/bin/env node
/** Migrate with the run CLI before upgrading the sealed historical workspace.
 * The resulting application is strictly compiled and interacted with in Chromium.
 * Execution evidence is admitted only through a bound --run invocation.
 */
import {createHash} from 'node:crypto';
import {resolveMigrationRun, extractMigrationCli} from './migration-run-inputs.mjs';
import {OLD_APPLICATION, OLD_STYLES, proveMigratedConsumer} from './migrated-consumer-proof.mjs';
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

export async function executeOldWorkspaceCli(runPath) {
  if (!runPath) throw new Error('--run is required; workspace CLI fallback is forbidden');
  const input = resolveMigrationRun(runPath);
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

  for (const [path, key] of [[packageJsonPath, 'package_json_sha256'], [packageLockPath, 'package_lock_sha256']]) {
    if (sha256(readFileSync(path)) !== provenance.isolated_environment[key]) throw new Error('historical environment identity mismatch');
  }
  const work = mkdtempSync(join(tmpdir(), 'ngx-old-workspace-cli-'));
  const repoResolved = resolve(root);
  if (resolve(work).startsWith(repoResolved)) {
    throw new Error('refusing to build the disposable workspace inside the repository');
  }
  try {
    const staged = extractMigrationCli(input, join(work, 'cli-artifact'));
    const cliBinPath = staged.bin;
    const cli = staged.identities.find(item => item.path === 'package/bin/migrate-legacy.js');
    const support = staged.identities.filter(item => item.path !== cli.path);
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

    const applicationPath = join(work, 'application.ts');
    const stylesPath = join(work, 'application.scss');
    writeFileSync(applicationPath, OLD_APPLICATION);
    writeFileSync(stylesPath, OLD_STYLES);
    const args = [cliBinPath, work, '--apply', '--json', ...flags];
    const dryChild = spawnSync(process.execPath, [cliBinPath, work, '--json', ...flags], {cwd: work, encoding: 'utf8'});
    const dry = JSON.parse(dryChild.stdout);
    if (dryChild.status !== 0 || dry.mode !== 'dry-run' || dry.blocking !== 0 || dry.safe_edits !== written.length + 2
      || written.some(file => readFileSync(file.abs, 'utf8') !== file.before)
      || readFileSync(applicationPath, 'utf8') !== OLD_APPLICATION || readFileSync(stylesPath, 'utf8') !== OLD_STYLES) {
      throw new Error('historical workspace dry-run changed bytes or omitted migrations');
    }
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
    if (summary.files_scanned !== written.length + 2 || summary.applied !== written.length + 2 || summary.blocking !== 0) {
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

    const application = readFileSync(applicationPath, 'utf8');
    const styles = readFileSync(stylesPath, 'utf8');
    if (application !== OLD_APPLICATION.replaceAll('@angular/material/legacy-', '@ngx-compat/material-legacy/legacy-')
        || styles !== OLD_STYLES.replaceAll("'@angular/material'", "'@ngx-compat/material-legacy'")) {
      throw new Error('application migration changed more than module sources');
    }
    const repeated = spawnSync(process.execPath, [cliBinPath, work, '--apply', '--json', ...flags], {cwd: work, encoding: 'utf8'});
    const again = JSON.parse(repeated.stdout);
    if (repeated.status !== 0 || again.applied !== 0 || again.blocking !== 0
        || readFileSync(applicationPath, 'utf8') !== application || readFileSync(stylesPath, 'utf8') !== styles) throw new Error('old-workspace migration was not idempotent');
    const upgraded = await proveMigratedConsumer(work, application, styles, input);
    for (const artifact of Object.values(input.artifacts)) if (sha256(readFileSync(artifact.absolute)) !== artifact.sha256) throw new Error('run artifact changed during migration');
    return {
      schema_version: 1,
      role: 'packaged migrate CLI on a disposable Material 16.2.14 workspace',
      check_id: 'migration-packaged',
      group: 'old-workspace-cli',
      coverage: 'slice',
      line: input.line,
      g04_claim: 'not-passed',
      g05_claim: 'not-passed',
      tarball_used: true,
      run_id: input.run.run_id,
      invocation_id: input.request?.invocation ?? null,
      binding: input.request?.binding ?? null,
      artifacts: Object.fromEntries(Object.entries(input.artifacts).map(([id, a]) => [id, a.sha256])),
      upgraded_consumer: upgraded,
      dry_run: dry,
      second_apply: again,
      cli,
      cli_support: support,
      command: [process.execPath, cli.path, '<temp-workspace>', '--apply', '--json', ...flags],
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
      case_ids: [...changes.map(item => item.case_id), "old-workspace/upgraded-consumer"],
      changes,
      other_line_executed: false,
      other_groups: {
        'packaged-schematic': null,
        'transaction-negatives': null,
        'frontend-parity': null,
      },
      result: 'pass',
      limitations: [
        'Executes the exact run CLI tarball and support files, dry-run/apply/idempotence, then upgrades the authenticated historical workspace and strictly builds/renders its migrated application.',
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
  const runDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  return runDir || null;
}

export function writeAssertions(outputDir, report) {
  if (report.result !== 'pass' || report.tarball_used !== true || report.upgraded_consumer?.result !== 'pass'
      || !report.run_id || !report.invocation_id || !report.binding || report.line !== report.binding.source_line) {
    throw new Error('refusing migration assertions without run-bound CLI and upgraded consumer execution');
  }
  const bodies = report.changes.map(change => ({...change, group:'old-workspace-cli'}));
  bodies.push({case_id:'old-workspace/upgraded-consumer',group:'old-workspace-cli'});
  const written = [];
  for (const fields of bodies) {
    const body = {...fields, check_id:'migration-packaged',kind:'assertion',result:'pass',line:report.line,
      run_id:report.run_id,invocation_id:report.invocation_id,binding:report.binding,artifacts:report.artifacts,
      tarball_used:true,cli:report.cli,cli_support:report.cli_support,material_version:report.workspace.material_version,
      material_manifest_sha256:report.workspace.material_manifest_sha256,upgraded_consumer:report.upgraded_consumer,
      command:report.command,exit_code:0};
    const name = `${fields.case_id.replaceAll('/', '__')}.json`;
    writeFileSync(join(outputDir,name),JSON.stringify(body,null,2)+'\n');written.push(name);
  }
  return written;
}

function parseArgs(argv) {
  let out = null;
  let run = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out' || arg === '--run') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(2, '--out requires a path');
      if (arg === '--out') out = resolve(value); else run = resolve(value);
      i += 1;
      continue;
    }
    fail(2, `Unknown argument: ${arg}`);
  }
  if (!out) fail(2, '--out requires a path');
  if (!run) fail(2, '--run requires a path; no workspace fallback');
  return {out, run};
}

async function main(argv) {
  const {out, run} = parseArgs(argv);
  let report;
  try {
    report = await executeOldWorkspaceCli(run);
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
    tarball_used: true,
    assertion_files,
    g04_claim: report.g04_claim,
    g05_claim: report.g05_claim,
  }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code => process.exit(code), error => fail(1,error.message));
}

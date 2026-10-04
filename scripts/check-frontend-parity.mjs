#!/usr/bin/env node
/**
 * Frontend parity for migration-packaged on main.
 *
 * Runs two frontends on copies of one temp fixture:
 *   1. package/bin/migrate-legacy.js extracted from the committed CLI tarball
 *   2. ng generate of migrate-legacy from the packed library tarball, installed
 *      into a real Angular workspace
 *
 * Does not import a transform function. Does not use an in-memory schematic host.
 * Rosters only fixture files both frontends rewrote to the same bytes.
 * Case ids are prefixed so they do not collide with old-workspace-cli.
 * packaged-schematic is not rostered. Every 21.x migration group stays null.
 * Does not claim G04 or G05.
 *
 *   node scripts/check-frontend-parity.mjs --out <report.json> [--library-tarball <library.tgz>]
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = join(root, 'fixtures/migration/cases.json');
const matrixPath = join(root, 'compatibility/rc/matrices/full-verify.json');
const cliTarballRelative = 'migration/dist/ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz';
const cliTarball = join(root, cliTarballRelative);
const distPackage = join(root, 'dist/ngx-material-legacy');
const ngJs = join(root, 'node_modules/@angular/cli/bin/ng.js');
const defaultReport = join(root, 'compatibility/rc/reports/migration-frontend-parity.json');

const OPTION_FLAGS = [
  ['acknowledgeCompanionBridges', '--acknowledge-companion-bridges'],
  ['acknowledgeAggregates', '--acknowledge-aggregates'],
  ['acknowledgeCurrentComponents', '--acknowledge-current-components'],
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function extensionFor(language) {
  if (language === 'typescript') return 'ts';
  if (language === 'scss') return 'scss';
  if (language === 'sass') return 'sass';
  throw new Error(`unsupported migration fixture language: ${language}`);
}

export function rewriteCases(catalog) {
  const selected = [];
  for (const item of catalog.cases) {
    if (typeof item.expected_after !== 'string' || item.expected_after === item.before) continue;
    if (item.expect_ok === false) continue;
    selected.push(item);
  }
  if (selected.length === 0) throw new Error('no migration fixture rewrite cases to compare');
  return selected;
}

function flagsFor(cases) {
  const flags = [];
  for (const [key, flag] of OPTION_FLAGS) {
    if (cases.some(item => item.options && item.options[key] === true)) flags.push(flag);
  }
  return flags;
}

function nodeVersionSupported(version) {
  const [major, minor, patch] = version.split('.').map(part => Number(part));
  if (major === 22) return minor > 22 || (minor === 22 && patch >= 3);
  if (major === 24) return minor > 15 || (minor === 15 && patch >= 0);
  return major >= 26;
}

function readNodeVersion(bin) {
  const result = spawnSync(bin, ['-p', 'process.versions.node'], {encoding: 'utf8'});
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function ensureAngularNode() {
  const version = readNodeVersion(process.execPath);
  if (version && nodeVersionSupported(version)) return process.execPath;
  const candidates = [
    join(homedir(), 'node22', 'bin', 'node'),
    join(tmpdir(), 'ngx-compat-node-v22.22.3', 'bin', 'node'),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const found = readNodeVersion(candidate);
    if (found && nodeVersionSupported(found)) return candidate;
  }
  const dest = join(tmpdir(), 'ngx-compat-node-v22.22.3');
  const archive = join(tmpdir(), 'node-v22.22.3-linux-x64.tar.gz');
  if (process.platform !== 'linux' || process.arch !== 'x64') {
    throw new Error(`Angular CLI needs Node ^22.22.3 || ^24.15.0 || >=26 and no such binary is available on ${process.platform}-${process.arch}`);
  }
  if (!existsSync(archive)) {
    const curl = spawnSync('curl', ['-fsSL', '-o', archive, 'https://nodejs.org/dist/v22.22.3/node-v22.22.3-linux-x64.tar.gz'], {encoding: 'utf8'});
    if (curl.status !== 0) {
      throw new Error(curl.stderr || 'failed to download Node 22.22.3 for ng generate');
    }
  }
  mkdirSync(dest, {recursive: true});
  const extracted = spawnSync('tar', ['-xzf', archive, '-C', dest, '--strip-components=1'], {encoding: 'utf8'});
  if (extracted.status !== 0) throw new Error(extracted.stderr || 'failed to extract Node 22.22.3');
  const cached = join(dest, 'bin', 'node');
  const found = readNodeVersion(cached);
  if (!found || !nodeVersionSupported(found)) throw new Error('extracted Node does not satisfy the Angular CLI');
  return cached;
}

function parseArgs(argv) {
  let out = defaultReport;
  let libraryTarball = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out' || arg === '--library-tarball') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) fail(`${arg} requires a path`);
      if (arg === '--out') out = resolve(value);
      else libraryTarball = resolve(value);
      i += 1;
      continue;
    }
    fail(`Unknown argument: ${arg}`);
  }
  return {out, libraryTarball};
}

function packLibrary(destination) {
  if (!existsSync(join(distPackage, 'package.json'))) {
    throw new Error('dist/ngx-material-legacy is missing; pass --library-tarball');
  }
  mkdirSync(destination, {recursive: true});
  const packed = spawnSync('npm', ['pack', distPackage, '--json', '--pack-destination', destination], {
    cwd: root,
    encoding: 'utf8',
  });
  if (packed.status !== 0) throw new Error(packed.stderr || packed.stdout || 'npm pack failed');
  const parsed = JSON.parse(packed.stdout);
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!entry || typeof entry.filename !== 'string') throw new Error('npm pack did not name a tarball');
  return join(destination, entry.filename);
}

function extractTarball(tarball, destination) {
  mkdirSync(destination, {recursive: true});
  const extracted = spawnSync('tar', ['-xzf', tarball, '-C', destination], {encoding: 'utf8'});
  if (extracted.status !== 0) throw new Error(extracted.stderr || `tar extract failed: ${tarball}`);
  return join(destination, 'package');
}

function writeFixture(dir, cases) {
  mkdirSync(join(dir, 'src'), {recursive: true});
  const files = [];
  for (const item of cases) {
    const rel = `src/${item.id}.${extensionFor(item.language)}`;
    const abs = join(dir, rel);
    writeFileSync(abs, item.before);
    files.push({item, rel, abs});
  }
  return files;
}

function snapshot(files) {
  const out = {};
  for (const file of files) {
    const bytes = readFileSync(file.abs);
    out[file.rel] = {sha256: sha256(bytes), text: bytes.toString('utf8')};
  }
  return out;
}

export function assertionOutputDir() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length || process.env.RC_CHECK_ID !== 'migration-packaged') {
    fail('frontend-parity: incomplete coordinator environment');
  }
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    fail('frontend-parity: RC_EVIDENCE_BINDING is not JSON');
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    fail('frontend-parity: binding is not an object');
  }
  if (binding.source_line === '21.x') return null;
  if (binding.source_line !== 'main') fail('frontend-parity: binding source line is not main');
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  let stat;
  try {
    stat = lstatSync(outputDir);
  } catch {
    fail('frontend-parity: assertion output directory is missing');
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail('frontend-parity: assertion output directory is not a real directory');
  }
  const invocation = process.env.RC_INVOCATION_ID;
  if (!outputDir.endsWith(join('evidence', 'migration-packaged', invocation))) {
    fail('frontend-parity: assertion directory is not check-owned');
  }
  return outputDir;
}

function matrixGroups() {
  const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));
  const row = matrix.checks.find(item => item.check_id === 'migration-packaged');
  if (!row) throw new Error('migration-packaged matrix row is missing');
  return row.acceptance.cases_by_line;
}

export function writeAssertions(outputDir, report) {
  if (report.result !== 'pass' || report.coverage !== 'slice') {
    throw new Error('refusing to emit a frontend-parity assertion without an executed comparison');
  }
  if (report.g04_claim !== 'not-passed' || report.g05_claim !== 'not-passed') {
    throw new Error('refusing to claim G04 or G05');
  }
  if (report.schematic_test_runner !== false || report.schematic_host !== 'ng-generate') {
    throw new Error('refusing to roster a schematic frontend that is not ng generate');
  }
  if (report.transform_import !== false || report.cli_bin !== 'package/bin/migrate-legacy.js') {
    throw new Error('refusing to emit an assertion that did not run the packaged CLI bin');
  }
  if (report.not_rostered['packaged-schematic'] !== null) {
    throw new Error('refusing to roster packaged-schematic from the parity comparison');
  }
  for (const ids of Object.values(report.cases_by_line_21x)) {
    if (ids !== null) throw new Error('refusing to copy a main result onto 21.x');
  }
  const groups = matrixGroups();
  for (const [line, lineGroups] of Object.entries(groups)) {
    if (line !== 'main' && line !== '21.x') throw new Error(`unexpected matrix line ${line}`);
    for (const [group, ids] of Object.entries(lineGroups)) {
      if (line === '21.x' && ids !== null) throw new Error('refusing to roster a 21.x migration group');
      if (group === 'frontend-parity') continue;
      if (!Array.isArray(ids)) continue;
      for (const change of report.matches) {
        if (ids.includes(change.case_id)) {
          throw new Error(`${change.case_id} collides with ${group}`);
        }
      }
    }
  }
  const written = [];
  const roster = new Set(report.case_ids);
  if (report.disagreements.length !== 0 && roster.size !== 0) {
    throw new Error('refusing to roster frontend-parity when frontends disagree');
  }
  for (const change of report.matches) {
    if (!roster.has(change.case_id)) continue;
    if (change.outputs_match !== true || change.rewritten !== true || change.before === change.after) {
      throw new Error(`refusing to roster ${change.case_id} without matching rewritten bytes`);
    }
    if (change.cli_after_sha256 !== change.schematic_after_sha256) {
      throw new Error(`refusing to roster ${change.case_id} when frontends differ`);
    }
    const body = {
      case_id: change.case_id,
      fixture_case_id: change.fixture_case_id,
      result: 'pass',
      kind: 'assertion',
      line: 'main',
      group: 'frontend-parity',
      path: change.path,
      before_sha256: change.before_sha256,
      after_sha256: change.after_sha256,
      cli_after_sha256: change.cli_after_sha256,
      schematic_after_sha256: change.schematic_after_sha256,
      outputs_match: true,
      rewritten: true,
      cli_bin: report.cli_bin,
      cli_sha256: report.cli_sha256,
      cli_bytes: report.cli_bytes,
      cli_tarball: report.cli_tarball,
      library_tarball_sha256: report.library_tarball_sha256,
      schematic_host: 'ng-generate',
      schematic_collection: report.schematic_collection,
      schematic_test_runner: false,
      transform_import: false,
      commands: report.commands,
      g04_claim: 'not-passed',
      g05_claim: 'not-passed',
      not_rostered: {
        'packaged-schematic': null,
        '21.x': null,
      },
    };
    if ('approved' in body) throw new Error('refusing to set an approved flag');
    const name = `${change.case_id.replaceAll('/', '__')}.json`;
    writeFileSync(join(outputDir, name), `${JSON.stringify(body, null, 2)}\n`);
    written.push(name);
  }
  return written;
}

export function executeFrontendParity(libraryTarball) {
  if (!existsSync(ngJs)) throw new Error('Angular CLI ng.js is missing');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const cases = rewriteCases(catalog);
  const flags = flagsFor(cases);
  const angularNode = ensureAngularNode();
  const work = mkdtempSync(join(tmpdir(), 'ngx-frontend-parity-'));
  const repoResolved = resolve(root);
  if (resolve(work).startsWith(repoResolved)) {
    throw new Error('refusing to build the disposable fixture inside the repository');
  }
  try {
    const cliPackage = extractTarball(cliTarball, join(work, 'cli-package'));
    const cliBin = join(cliPackage, 'bin/migrate-legacy.js');
    const cliBytes = readFileSync(cliBin);
    const librarySource = libraryTarball || packLibrary(join(work, 'pack'));
    const libraryBytes = readFileSync(librarySource);
    const libraryPackage = extractTarball(librarySource, join(work, 'library-package'));
    const schematicPackage = JSON.parse(readFileSync(join(libraryPackage, 'schematics/package.json'), 'utf8'));
    if (schematicPackage.type !== 'commonjs') {
      throw new Error('packed schematics/package.json must set type commonjs');
    }
    const collection = JSON.parse(readFileSync(join(libraryPackage, 'schematics/collection.json'), 'utf8'));
    const factory = collection?.schematics?.['migrate-legacy']?.factory;
    if (factory !== './migrate-legacy/index#migrateLegacy') {
      throw new Error(`packed collection factory is not migrate-legacy: ${factory}`);
    }
    const libraryManifest = JSON.parse(readFileSync(join(libraryPackage, 'package.json'), 'utf8'));
    if (libraryManifest.name !== '@ngx-compat/material-legacy' || libraryManifest.schematics !== './schematics/collection.json') {
      throw new Error('packed library does not expose the migrate-legacy collection');
    }

    const fixtureDir = join(work, 'fixture');
    const fixtureFiles = writeFixture(fixtureDir, cases);
    const fixtureBefore = snapshot(fixtureFiles);

    const cliDir = join(work, 'cli-copy');
    const schematicDir = join(work, 'schematic-copy');
    cpSync(fixtureDir, cliDir, {recursive: true});
    cpSync(fixtureDir, schematicDir, {recursive: true});
    const cliBefore = snapshot(fixtureFiles.map(file => ({...file, abs: join(cliDir, file.rel)})));
    const schematicBefore = snapshot(fixtureFiles.map(file => ({...file, abs: join(schematicDir, file.rel)})));
    for (const rel of Object.keys(fixtureBefore)) {
      if (cliBefore[rel].sha256 !== fixtureBefore[rel].sha256 || schematicBefore[rel].sha256 !== fixtureBefore[rel].sha256) {
        throw new Error(`${rel} copies diverged before either frontend ran`);
      }
    }

    const cliArgv = [process.execPath, cliBin, cliDir, '--apply', '--json', ...flags];
    const cli = spawnSync(process.execPath, cliArgv.slice(1), {cwd: cliDir, encoding: 'utf8'});
    let cliSummary = null;
    try {
      cliSummary = JSON.parse(cli.stdout);
    } catch {
      cliSummary = null;
    }
    if (cli.status !== 0 || !cliSummary || cliSummary.distribution !== 'bundled-cli' || cliSummary.mode !== 'apply') {
      throw new Error(`packaged CLI failed (${cli.status})\n${cli.stderr || ''}\n${cli.stdout || ''}`);
    }

    const installed = join(schematicDir, 'node_modules/@ngx-compat/material-legacy');
    mkdirSync(dirname(installed), {recursive: true});
    cpSync(libraryPackage, installed, {recursive: true});
    const packageJson = JSON.stringify({name: 'frontend-parity-fixture', private: true, version: '0.0.0'}, null, 2) + '\n';
    const angularJson = JSON.stringify({
      version: 1,
      newProjectRoot: 'projects',
      projects: {
        app: {projectType: 'application', root: '', sourceRoot: 'src', prefix: 'app', architect: {}},
      },
    }, null, 2) + '\n';
    writeFileSync(join(schematicDir, 'package.json'), packageJson);
    writeFileSync(join(schematicDir, 'angular.json'), angularJson);
    const installedCollection = readFileSync(join(installed, 'schematics/collection.json'));
    const ngArgv = [
      angularNode,
      ngJs,
      'generate',
      '@ngx-compat/material-legacy:migrate-legacy',
      ...flags,
      '--defaults',
    ];
    const ng = spawnSync(angularNode, ngArgv.slice(1), {cwd: schematicDir, encoding: 'utf8'});
    if (ng.status !== 0) {
      throw new Error(`ng generate failed (${ng.status})\n${ng.stderr || ''}\n${ng.stdout || ''}`);
    }
    if (readFileSync(join(schematicDir, 'package.json'), 'utf8') !== packageJson) {
      throw new Error('ng generate changed package.json');
    }
    if (readFileSync(join(schematicDir, 'angular.json'), 'utf8') !== angularJson) {
      throw new Error('ng generate changed angular.json');
    }
    if (!readFileSync(join(installed, 'schematics/collection.json')).equals(installedCollection)) {
      throw new Error('ng generate changed the installed collection');
    }

    const matches = [];
    const disagreements = [];
    for (const file of fixtureFiles) {
      const cliAfter = readFileSync(join(cliDir, file.rel), 'utf8');
      const schematicAfter = readFileSync(join(schematicDir, file.rel), 'utf8');
      const before = fixtureBefore[file.rel].text;
      const caseId = `frontend-parity/${file.item.id}`;
      if (cliAfter === schematicAfter && cliAfter !== before) {
        matches.push({
          case_id: caseId,
          fixture_case_id: file.item.id,
          path: file.rel,
          before,
          after: cliAfter,
          before_sha256: fixtureBefore[file.rel].sha256,
          after_sha256: sha256(cliAfter),
          cli_after_sha256: sha256(cliAfter),
          schematic_after_sha256: sha256(schematicAfter),
          outputs_match: true,
          rewritten: true,
        });
        continue;
      }
      disagreements.push({
        fixture_case_id: file.item.id,
        path: file.rel,
        before_sha256: fixtureBefore[file.rel].sha256,
        cli_after_sha256: sha256(cliAfter),
        schematic_after_sha256: sha256(schematicAfter),
        cli_rewritten: cliAfter !== before,
        schematic_rewritten: schematicAfter !== before,
        cli_after: cliAfter,
        schematic_after: schematicAfter,
      });
    }

    const commands = {
      cli: [process.execPath, 'package/bin/migrate-legacy.js', '<fixture-copy>', '--apply', '--json', ...flags],
      cli_argv: cliArgv,
      schematic: [angularNode, 'node_modules/@angular/cli/bin/ng.js', 'generate', '@ngx-compat/material-legacy:migrate-legacy', ...flags, '--defaults'],
      schematic_argv: ngArgv,
      schematic_cwd: '<angular-workspace-copy>',
    };

    return {
      schema_version: 1,
      role: 'packaged CLI and packaged schematic frontend parity',
      check_id: 'migration-packaged',
      group: 'frontend-parity',
      line: 'main',
      coverage: 'slice',
      result: 'pass',
      g04_claim: 'not-passed',
      g05_claim: 'not-passed',
      transform_import: false,
      schematic_test_runner: false,
      schematic_host: 'ng-generate',
      schematic_collection: '@ngx-compat/material-legacy:migrate-legacy',
      cli_bin: 'package/bin/migrate-legacy.js',
      cli_sha256: sha256(cliBytes),
      cli_bytes: cliBytes.length,
      cli_tarball: cliTarballRelative,
      library_tarball: libraryTarball ? libraryTarball : 'dist/ngx-material-legacy (npm pack)',
      library_tarball_sha256: sha256(libraryBytes),
      library_tarball_bytes: libraryBytes.length,
      same_fixture: true,
      fixture_copies: ['cli-copy', 'schematic-copy'],
      acknowledgement_flags: flags,
      files_compared: fixtureFiles.length,
      case_ids: disagreements.length === 0 ? matches.map(item => item.case_id) : [],
      matches,
      disagreements,
      commands,
      cli_summary: {
        files_scanned: cliSummary.files_scanned,
        applied: cliSummary.applied,
        blocking: cliSummary.blocking,
        distribution: cliSummary.distribution,
        mode: cliSummary.mode,
      },
      ng_exit: ng.status,
      not_rostered: {
        'packaged-schematic': null,
      },
      cases_by_line_21x: {
        'old-workspace-cli': null,
        'packaged-schematic': null,
        'transaction-negatives': null,
        'frontend-parity': null,
      },
      limitations: [
        'Compares package/bin/migrate-legacy.js from the committed CLI tarball with ng generate of the collection installed from the packed library tarball.',
        'Both frontends receive copies of one temp fixture. The copies are byte-identical before either frontend runs. Applying on one tree would hide the second frontend.',
        'An in-memory schematic host is not used. packaged-schematic is not rostered.',
        'Case ids are prefixed with frontend-parity/ because the matrix rejects a case id that already appears in old-workspace-cli.',
        'Only files both frontends rewrote to the same bytes are rostered. Disagreements stay in disagreements and are not rostered.',
        'Every 21.x migration group stays null. Does not claim G04 or G05.',
      ],
    };
  } finally {
    rmSync(work, {recursive: true, force: true});
  }
}

function main(argv) {
  const {out, libraryTarball} = parseArgs(argv);
  let report;
  try {
    report = executeFrontendParity(libraryTarball);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  if (report.disagreements.length !== 0) {
    console.error(JSON.stringify(report.disagreements, null, 2));
    fail(`frontend-parity disagreed on ${report.disagreements.length} file(s); leaving the group unrostered`);
  }
  let assertion_files = null;
  const outputDir = assertionOutputDir();
  if (outputDir) {
    try {
      assertion_files = writeAssertions(outputDir, report);
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  }
  console.log(JSON.stringify({
    ok: report.disagreements.length === 0,
    case_ids: report.case_ids,
    disagreements: report.disagreements.map(item => item.fixture_case_id),
    files_compared: report.files_compared,
    schematic_host: report.schematic_host,
    schematic_test_runner: report.schematic_test_runner,
    commands: report.commands,
    assertion_files,
    g04_claim: report.g04_claim,
    g05_claim: report.g05_claim,
  }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}

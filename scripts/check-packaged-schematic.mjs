#!/usr/bin/env node
/**
 * packaged-schematic for migration-packaged on main.
 *
 * Runs the same ng generate frontend as scripts/check-frontend-parity.mjs:
 *   node node_modules/@angular/cli/bin/ng.js generate
 *     @ngx-compat/material-legacy:migrate-legacy
 *     --acknowledge-companion-bridges --acknowledge-aggregates --defaults
 *
 * Node is v22.22.3 (or another Angular CLI 22-compatible binary). The collection
 * is installed from the packed library tarball. An in-memory schematic host is not used.
 * Each rostered fixture must be rewritten from before to expected_after.
 * That is not the frontend-parity comparison against the migrate CLI.
 * Case ids are prefixed packaged-schematic/ so they do not collide with
 * old-workspace-cli, transaction-negatives, or frontend-parity.
 * Every 21.x migration group stays null. Does not claim G04 or G05.
 *
 *   node scripts/check-packaged-schematic.mjs --out <report.json> --run <run.json>
 */
import {resolveMigrationRun} from './migration-run-inputs.mjs';
import {coordinatorRequest} from './packed-consumer-evidence.mjs';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  ensureAngularNode,
  matrixGroups,
  extractTarball,
  flagsFor,
  installAndNgGenerate,
  parseFrontendArgs,
  schematicIdentities,
  readNodeVersion,
  rewriteCases,
  sha256,
  writeFixture,
} from './check-frontend-parity.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = join(root, 'fixtures/migration/cases.json');
const matrixPath = join(root, 'compatibility/rc/matrices/full-verify.json');
const ngJs = join(root, 'node_modules/@angular/cli/bin/ng.js');
const defaultReport = join(root, 'compatibility/rc/reports/migration-packaged-schematic.json');

function fail(message) {
  console.error(message);
  process.exit(1);
}

export function assertionOutputDir() {
  const request=coordinatorRequest('migration-packaged');
  if(request?.error)throw new Error(request.error);
  return request?.outputDir ?? null;
}

export function writeAssertions(outputDir, report) {
  if (report.result !== 'pass' || report.coverage !== 'slice') {
    throw new Error('refusing to emit a packaged-schematic assertion without an executed ng generate');
  }
  if (report.g04_claim !== 'not-passed' || report.g05_claim !== 'not-passed') {
    throw new Error('refusing to claim G04 or G05');
  }
  if (report.schematic_test_runner !== false || report.schematic_host !== 'ng-generate') {
    throw new Error('refusing to roster a schematic frontend that is not ng generate');
  }
  if (report.transform_import !== false || report.cli_comparison !== false) {
    throw new Error('refusing to define packaged-schematic as a CLI byte comparison');
  }
  if (report.expectation !== 'expected_after') {
    throw new Error('refusing to roster packaged-schematic without an expected_after comparison');
  }
  for (const ids of Object.values(report.cases_by_line_21x)) {
    if (ids !== null) throw new Error('refusing to copy a main result onto 21.x');
  }
  const groups = matrixGroups();
  for (const [line, lineGroups] of Object.entries(groups)) {
    if (line !== 'main' && line !== '21.x') throw new Error(`unexpected matrix line ${line}`);
    for (const [group, ids] of Object.entries(lineGroups)) {
      if (line === '21.x' && ids !== null) throw new Error('refusing to roster a 21.x migration group');
      if (group === 'packaged-schematic') continue;
      if (!Array.isArray(ids)) continue;
      for (const change of report.matches) {
        if (ids.includes(change.case_id)) {
          throw new Error(`${change.case_id} collides with ${group}`);
        }
      }
    }
  }
  const rostered = groups.main?.['packaged-schematic'];
  if (!Array.isArray(rostered) || rostered.join('\n') !== report.case_ids.join('\n')) {
    throw new Error('refusing to emit assertions that do not match the main packaged-schematic roster');
  }
  const written = [];
  for (const change of report.matches) {
    if (!change.case_id.startsWith('packaged-schematic/')) {
      throw new Error(`refusing to roster ${change.case_id} without the packaged-schematic prefix`);
    }
    if (change.matches_expected_after !== true || change.rewritten !== true || change.before === change.after) {
      throw new Error(`refusing to roster ${change.case_id} without an expected_after rewrite`);
    }
    if (change.after !== change.expected_after) {
      throw new Error(`refusing to roster ${change.case_id} when ng generate did not match expected_after`);
    }
    const body = {
      case_id: change.case_id,
      fixture_case_id: change.fixture_case_id,
      result: 'pass',
      kind: 'assertion',
      line: 'main',
      group: 'packaged-schematic',
      check_id:'migration-packaged',exit_code:0,run_id:report.run_id,invocation_id:report.invocation_id,binding:report.binding,
      artifacts:report.artifacts,schematic_support_files:report.schematic_support_files,
      before:change.before,after:change.after,expected_after:change.expected_after,
      path: change.path,
      before_sha256: change.before_sha256,
      after_sha256: change.after_sha256,
      expected_after_sha256: change.expected_after_sha256,
      matches_expected_after: true,
      rewritten: true,
      cli_comparison: false,
      expectation: 'expected_after',
      library_tarball_sha256: report.library_tarball_sha256,
      library_tarball_bytes: report.library_tarball_bytes,
      schematic_host: 'ng-generate',
      schematic_collection: report.schematic_collection,
      schematic_test_runner: false,
      transform_import: false,
      node_binary: report.node_binary,
      node_version: report.node_version,
      command: report.command,
      g04_claim: 'not-passed',
      g05_claim: 'not-passed',
      cases_by_line_21x: report.cases_by_line_21x,
    };
    if ('approved' in body) throw new Error('refusing to set an approved flag');
    const name = `${change.case_id.replaceAll('/', '__')}.json`;
    writeFileSync(join(outputDir, name), `${JSON.stringify(body, null, 2)}\n`);
    written.push(name);
  }
  return written;
}

export function executePackagedSchematic(runPath) {
  const input=resolveMigrationRun(runPath);
  if (!existsSync(ngJs)) throw new Error('Angular CLI ng.js is missing');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const cases = rewriteCases(catalog);
  const flags = flagsFor(cases);
  const angularNode = ensureAngularNode();
  const nodeVersion = readNodeVersion(angularNode);
  if (!nodeVersion) throw new Error('ng generate node binary did not report a version');
  const work = mkdtempSync(join(tmpdir(), 'ngx-packaged-schematic-'));
  const repoResolved = resolve(root);
  if (resolve(work).startsWith(repoResolved)) {
    throw new Error('refusing to build the disposable fixture inside the repository');
  }
  try {
    const librarySource=input.artifacts.library.absolute;
    const libraryBytes = readFileSync(librarySource);
    const libraryPackage = extractTarball(librarySource, join(work, 'library-package'));
    const schematicSupport=schematicIdentities(libraryPackage);
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

    const schematicDir = join(work, 'schematic');
    const fixtureFiles = writeFixture(schematicDir, cases);
    const before = {};
    for (const file of fixtureFiles) {
      const text = readFileSync(file.abs, 'utf8');
      if (text !== file.item.before) throw new Error(`${file.item.id} fixture bytes diverged before ng generate`);
      before[file.rel] = text;
    }

    const {ngArgv, ngStatus} = installAndNgGenerate({
      schematicDir,
      libraryPackage,
      angularNode,
      flags,
      packageName: 'packaged-schematic-fixture',
    });

    const matches = [];
    const mismatches = [];
    for (const file of fixtureFiles) {
      const after = readFileSync(file.abs, 'utf8');
      const caseId = `packaged-schematic/${file.item.id}`;
      const record = {
        case_id: caseId,
        fixture_case_id: file.item.id,
        path: file.rel,
        before: before[file.rel],
        after,
        expected_after: file.item.expected_after,
        before_sha256: sha256(before[file.rel]),
        after_sha256: sha256(after),
        expected_after_sha256: sha256(file.item.expected_after),
        matches_expected_after: after === file.item.expected_after,
        rewritten: after !== before[file.rel],
      };
      if (record.matches_expected_after && record.rewritten) matches.push(record);
      else mismatches.push(record);
    }

    const command = [
      angularNode,
      'node_modules/@angular/cli/bin/ng.js',
      'generate',
      '@ngx-compat/material-legacy:migrate-legacy',
      ...flags,
      '--defaults',
    ];

    for(const a of Object.values(input.artifacts)){const bytes=readFileSync(a.absolute);if(bytes.length!==a.bytes||sha256(bytes)!==a.sha256)throw new Error('run artifact changed during schematic execution');}
    return {
      schema_version: 1,
      role: 'packaged schematic ng generate expected_after',
      check_id: 'migration-packaged',
      group: 'packaged-schematic',
      run_id:input.run.run_id,invocation_id:input.request?.invocation ?? null,binding:input.request?.binding ?? null,
      artifacts:Object.fromEntries(Object.entries(input.artifacts).map(([id,a])=>[id,{sha256:a.sha256,bytes:a.bytes}])),
      schematic_support_files:schematicSupport,
      line: 'main',
      coverage: 'slice',
      result: mismatches.length === 0 ? 'pass' : 'fail',
      g04_claim: 'not-passed',
      g05_claim: 'not-passed',
      transform_import: false,
      schematic_test_runner: false,
      schematic_host: 'ng-generate',
      schematic_collection: '@ngx-compat/material-legacy:migrate-legacy',
      cli_comparison: false,
      expectation: 'expected_after',
      node_binary: angularNode,
      node_version: nodeVersion,
      library_tarball: input.artifacts.library.path,
      library_tarball_sha256: sha256(libraryBytes),
      library_tarball_bytes: libraryBytes.length,
      acknowledgement_flags: flags,
      files_compared: fixtureFiles.length,
      case_ids: mismatches.length === 0 ? matches.map(item => item.case_id) : [],
      matches,
      mismatches: mismatches.map(item => ({
        fixture_case_id: item.fixture_case_id,
        path: item.path,
        before_sha256: item.before_sha256,
        after_sha256: item.after_sha256,
        expected_after_sha256: item.expected_after_sha256,
        rewritten: item.rewritten,
        matches_expected_after: item.matches_expected_after,
      })),
      command,
      command_argv: ngArgv,
      ng_exit: ngStatus,
      cases_by_line_21x: {
        'old-workspace-cli': null,
        'packaged-schematic': null,
        'transaction-negatives': null,
        'frontend-parity': null,
      },
      limitations: [
        'Runs ng generate @ngx-compat/material-legacy:migrate-legacy from the collection installed out of the packed library tarball.',
        'Rosters a fixture only when that ng generate rewrote it from before to expected_after.',
        'Does not compare those bytes with the migrate CLI. That comparison stays in frontend-parity.',
        'An in-memory schematic host is not used.',
        'Case ids are prefixed with packaged-schematic/ so they do not collide with old-workspace-cli, transaction-negatives, or frontend-parity.',
        'Every 21.x migration group stays null. Does not claim G04 or G05.',
      ],
    };
  } finally {
    rmSync(work, {recursive: true, force: true});
  }
}

function main(argv) {
  const {out,runPath}=parseFrontendArgs(argv,{defaultOutput:defaultReport});
  let report;
  try {
    report = executePackagedSchematic(runPath);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  if (report.mismatches.length !== 0) {
    console.error(JSON.stringify(report.mismatches, null, 2));
    fail(`packaged-schematic: ng generate did not match expected_after for ${report.mismatches.length} file(s)`);
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
    ok: report.mismatches.length === 0,
    case_ids: report.case_ids,
    mismatches: report.mismatches.map(item => item.fixture_case_id),
    files_compared: report.files_compared,
    node_binary: report.node_binary,
    node_version: report.node_version,
    schematic_host: report.schematic_host,
    schematic_test_runner: report.schematic_test_runner,
    cli_comparison: report.cli_comparison,
    expectation: report.expectation,
    command: report.command,
    assertion_files,
    g04_claim: report.g04_claim,
    g05_claim: report.g05_claim,
  }));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}

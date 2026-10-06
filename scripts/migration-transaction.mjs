#!/usr/bin/env node
/**
 * Packaged migrate CLI transaction cases on a disposable old workspace.
 * Invokes the extracted CLI bin. Does not import a transform function.
 *
 * Rosters only cases this process executes: a blocked file writes nothing,
 * dry-run and apply agree, a second apply changes nothing, a concurrent edit
 * is rejected, and MIGRATE_LEGACY_BEFORE_WRITE exiting non-zero writes nothing.
 * That hook is not a production fault. An uncaught write error that leaves an
 * earlier file rewritten is executed and not rostered.
 *
 * Does not run the schematic runner. Does not claim G04 or G05. Leaves
 * packaged-schematic, frontend-parity, and every main migration group null.
 *
 *   node scripts/migration-transaction.mjs [--out <report.json>]
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {chmodSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tarballRelative = 'migration/dist/ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz';
const tarball = join(root, tarballRelative);
const reportPath = join(root, 'compatibility/rc/reports/migration-transaction.json');
const safeSource = "import {MatLegacyButtonModule} from '@angular/material/legacy-button';\n";
const blockedSource = "import {X} from '@angular/material/legacy-select/private';\n";
const hookName = 'MIGRATE_LEGACY_BEFORE_WRITE';

const CASE_IDS = [
  'blocked-file-writes-nothing',
  'dry-apply-parity',
  'second-apply-noop',
  'concurrent-edit-rejected',
  'before-write-hook-refuses',
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function extract() {
  const work = mkdtempSync(join(tmpdir(), 'ngx-compat-migrate-tx-'));
  const extracted = spawnSync('tar', ['-xzf', tarball, '-C', work], {encoding: 'utf8'});
  if (extracted.status !== 0) fail(extracted.stderr || 'tar extract failed');
  const bin = join(work, 'package/bin/migrate-legacy.js');
  const bytes = readFileSync(bin);
  return {bin, sha256: sha256(bytes), bytes: bytes.length};
}

function run(bin, dir, apply, extraEnv) {
  const args = [bin, dir, '--json'];
  if (apply) args.push('--apply');
  const result = spawnSync(process.execPath, args, {
    cwd: dir,
    encoding: 'utf8',
    env: extraEnv ? {...process.env, ...extraEnv} : process.env,
  });
  let summary;
  try {
    summary = JSON.parse(result.stdout);
  } catch {
    fail(`CLI did not emit JSON\n${result.stderr || ''}\n${result.stdout || ''}`);
  }
  return {status: result.status, summary, stdout: result.stdout, stderr: result.stderr || ''};
}

function signature(summary) {
  return JSON.stringify(summary.records.map(record => ({
    path: record.path,
    ok: record.ok,
    changed: record.changed,
    diagnostics: record.diagnostics,
  })));
}

function writeOldWorkspace(dir, count = 1) {
  mkdirSync(join(dir, 'src'), {recursive: true});
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'old-workspace',
    private: true,
    dependencies: {'@angular/core': '16.2.14', '@angular/material': '16.2.14'},
  }, null, 2) + '\n');
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {experimentalDecorators: true, strict: true},
    include: ['src'],
  }, null, 2) + '\n');
  const files = [];
  for (let i = 0; i < count; i += 1) {
    const sourceFile = join(dir, count === 1 ? 'src/app.ts' : `src/app${i}.ts`);
    writeFileSync(sourceFile, safeSource);
    files.push(sourceFile);
  }
  return files;
}

function parseArgs(argv) {
  let out = reportPath;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') {
      const value = argv[i + 1];
      if (!value) fail('--out requires a path');
      out = value;
      i += 1;
    } else {
      fail(`Unknown argument: ${argv[i]}`);
    }
  }
  return out;
}

export function assertionOutputDir() {
  const names = ['RC_CHECK_ID', 'RC_RUN_ID', 'RC_INVOCATION_ID', 'RC_EVIDENCE_BINDING', 'RC_ASSERTION_OUTPUT_DIR'];
  const present = names.filter(name => process.env[name]);
  if (present.length === 0) return null;
  if (present.length !== names.length || process.env.RC_CHECK_ID !== 'migration-packaged') {
    fail('transaction-negatives: incomplete coordinator environment');
  }
  let binding;
  try {
    binding = JSON.parse(process.env.RC_EVIDENCE_BINDING);
  } catch {
    fail('transaction-negatives: RC_EVIDENCE_BINDING is not JSON');
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    fail('transaction-negatives: binding is not an object');
  }
  if (binding.source_line === 'main') return null;
  if (binding.source_line !== '21.x') fail('transaction-negatives: binding source line is not 21.x');
  const outputDir = process.env.RC_ASSERTION_OUTPUT_DIR;
  let stat;
  try {
    stat = lstatSync(outputDir);
  } catch {
    fail('transaction-negatives: assertion output directory is missing');
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail('transaction-negatives: assertion output directory is not a real directory');
  }
  const invocation = process.env.RC_INVOCATION_ID;
  if (!outputDir.endsWith(join('evidence', 'migration-packaged', invocation))) {
    fail('transaction-negatives: assertion directory is not check-owned');
  }
  return outputDir;
}

function baseAssertion(cli, id, extra) {
  return {
    case_id: id,
    result: 'pass',
    kind: 'assertion',
    line: '21.x',
    group: 'transaction-negatives',
    cli_bin: 'package/bin/migrate-legacy.js',
    cli_sha256: cli.sha256,
    cli_bytes: cli.bytes,
    tarball: tarballRelative,
    transform_import: false,
    g04_claim: 'not-passed',
    g05_claim: 'not-passed',
    coverage: 'slice',
    not_executed: {
      'packaged-schematic': null,
      'frontend-parity': null,
      'main': null,
    },
    ...extra,
  };
}

export function writeAssertions(outputDir, report) {
  if (report.result !== 'pass' || report.coverage !== 'slice') {
    throw new Error('refusing to emit a transaction assertion without an executed slice');
  }
  if (report.g04_claim !== 'not-passed' || report.g05_claim !== 'not-passed') {
    throw new Error('refusing to claim G04 or G05');
  }
  if (report.transform_import !== false || report.cli_bin !== 'package/bin/migrate-legacy.js') {
    throw new Error('refusing to emit an assertion that did not run the CLI bin');
  }
  for (const [group, ids] of Object.entries(report.not_executed)) {
    if (ids !== null) throw new Error(`refusing to roster ${group}`);
  }
  for (const ids of Object.values(report.cases_by_line_main)) {
    if (ids !== null) throw new Error('refusing to copy a 21.x result onto main');
  }
  const failure = report.not_rostered_write_failure;
  const failureCase = report.assertions.some(body => body.case_id === 'write-failure-refused');
  if (failure?.rostered === true && !failureCase) {
    throw new Error('write failure was rostered without an executed assertion');
  }
  if (failure?.rostered !== true && failureCase) {
    throw new Error('refusing to roster a write failure that partially committed');
  }
  const written = [];
  for (const body of report.assertions) {
    if (body.result !== 'pass' || body.kind !== 'assertion' || body.group !== 'transaction-negatives') {
      throw new Error(`refusing to emit ${body.case_id} without an executed assertion`);
    }
    if (body.g04_claim !== 'not-passed' || body.g05_claim !== 'not-passed') {
      throw new Error('refusing to claim G04 or G05');
    }
    if (Object.hasOwn(body, 'approved')) throw new Error('refusing to set an approved flag');
    if (body.hook != null && body.production_fault !== false) {
      throw new Error(`${body.case_id} uses ${body.hook} and must not be described as a production fault`);
    }
    const name = `${body.case_id}.json`;
    writeFileSync(join(outputDir, name), `${JSON.stringify(body, null, 2)}\n`);
    written.push(name);
  }
  return written;
}

function main() {
const outPath = parseArgs(process.argv.slice(2));
const cli = extract();

const blockedDir = mkdtempSync(join(tmpdir(), 'ngx-compat-migrate-blocked-'));
writeFileSync(join(blockedDir, 'ok.ts'), safeSource);
writeFileSync(join(blockedDir, 'bad.ts'), blockedSource);
const before = {
  ok: readFileSync(join(blockedDir, 'ok.ts'), 'utf8'),
  bad: readFileSync(join(blockedDir, 'bad.ts'), 'utf8'),
};
const dry = run(cli.bin, blockedDir, false);
const apply = run(cli.bin, blockedDir, true);
if (dry.status !== 1 || apply.status !== 1) fail(`blocked run exited dry=${dry.status} apply=${apply.status}`);
if (dry.summary.applied !== 0 || apply.summary.applied !== 0) fail('blocked apply wrote a file');
if (dry.summary.blocking < 1 || apply.summary.blocking !== dry.summary.blocking) {
  fail('dry-run and apply disagree on blocking');
}
if (signature(dry.summary) !== signature(apply.summary)) fail('dry-run and apply records differ');
if (readFileSync(join(blockedDir, 'ok.ts'), 'utf8') !== before.ok) fail('blocked apply changed the safe file');
if (readFileSync(join(blockedDir, 'bad.ts'), 'utf8') !== before.bad) fail('blocked apply changed the blocked file');

const cleanDir = mkdtempSync(join(tmpdir(), 'ngx-compat-migrate-clean-'));
const cleanFile = writeOldWorkspace(cleanDir)[0];
const cleanDry = run(cli.bin, cleanDir, false);
if (cleanDry.status !== 0 || readFileSync(cleanFile, 'utf8') !== safeSource) {
  fail('clean dry-run changed the file');
}
const repeatedDry = run(cli.bin, cleanDir, false);
if (signature(cleanDry.summary) !== signature(repeatedDry.summary)) {
  fail('repeated dry-run records differ');
}
const cleanApply = run(cli.bin, cleanDir, true);
const rewritten = readFileSync(cleanFile, 'utf8');
if (cleanApply.status !== 0 || !rewritten.includes('@ngx-compat/material-legacy/legacy-button')) {
  fail('clean apply did not rewrite the legacy import');
}
if (cleanDry.summary.safe_edits !== cleanApply.summary.safe_edits) {
  fail('dry-run and apply disagree on safe edits');
}
const second = run(cli.bin, cleanDir, true);
if (second.status !== 0 || second.summary.safe_edits !== 0 || readFileSync(cleanFile, 'utf8') !== rewritten) {
  fail('second apply was not idempotent');
}

const raceDir = mkdtempSync(join(tmpdir(), 'ngx-compat-migrate-race-'));
const raceFile = writeOldWorkspace(raceDir)[0];
const hookFile = join(raceDir, 'hook.cjs');
writeFileSync(hookFile, `require('fs').appendFileSync(${JSON.stringify(raceFile)}, '\\n// concurrent edit\\n');\n`);
const race = run(cli.bin, raceDir, true, {[hookName]: `node ${JSON.stringify(hookFile)}`});
const raced = readFileSync(raceFile, 'utf8');
if (race.status === 0 || race.summary.concurrent_edit !== true || race.summary.applied !== 0) {
  fail(`concurrent edit was not rejected: exit=${race.status} ${race.stdout}`);
}
if (raced !== `${safeSource}\n// concurrent edit\n` || raced.includes('@ngx-compat/material-legacy')) {
  fail(`concurrent edit changed the CLI output:\n${raced}`);
}

const hookDir = mkdtempSync(join(tmpdir(), 'ngx-compat-migrate-hook-'));
const hookFiles = writeOldWorkspace(hookDir, 2);
const failHook = join(hookDir, 'fail.cjs');
writeFileSync(failHook, 'process.exit(3);\n');
const hookResult = spawnSync(process.execPath, [cli.bin, hookDir, '--json', '--apply'], {
  cwd: hookDir,
  encoding: 'utf8',
  env: {...process.env, [hookName]: `node ${JSON.stringify(failHook)}`},
});
if (hookResult.status !== 1 || hookResult.stdout !== '') {
  fail(`before-write hook was not refused before JSON: exit=${hookResult.status} stdout=${hookResult.stdout}`);
}
if (!String(hookResult.stderr || '').includes('before-write hook failed')) {
  fail(`before-write hook did not report the hook failure:\n${hookResult.stderr || ''}`);
}
if (hookFiles.some(file => readFileSync(file, 'utf8') !== safeSource)) {
  fail('before-write hook refusal wrote a file');
}

const faultDir = mkdtempSync(join(tmpdir(), 'ngx-compat-migrate-fault-'));
writeOldWorkspace(faultDir, 2);
const faultDry = run(cli.bin, faultDir, false);
if (faultDry.status !== 0 || faultDry.summary.records.length < 2) {
  fail('write-failure probe did not see two safe edits');
}
const faultRels = faultDry.summary.records.map(record => record.path);
const faultLast = join(faultDir, faultRels[faultRels.length - 1]);
const faultEarlier = faultRels.slice(0, -1).map(rel => join(faultDir, rel));
const faultEarlierBefore = faultEarlier.map(file => readFileSync(file, 'utf8'));
const faultLastBefore = readFileSync(faultLast, 'utf8');
chmodSync(faultLast, 0o444);
const faultApply = spawnSync(process.execPath, [cli.bin, faultDir, '--json', '--apply'], {
  cwd: faultDir,
  encoding: 'utf8',
});
const faultEarlierRewritten = faultEarlier.map((file, index) => readFileSync(file, 'utf8') !== faultEarlierBefore[index]);
const faultLastUnchanged = readFileSync(faultLast, 'utf8') === faultLastBefore;
const partialCommit = faultEarlierRewritten.some(Boolean) && faultLastUnchanged;
const writeRefused = faultEarlierRewritten.every(changed => !changed) && faultLastUnchanged && faultApply.status !== 0;
if (!partialCommit && !writeRefused) {
  fail(`write-failure probe was neither a partial commit nor a refusal: exit=${faultApply.status}\n${faultApply.stderr || ''}`);
}

const assertions = [
  baseAssertion(cli, 'blocked-file-writes-nothing', {
    dry_exit: dry.status,
    apply_exit: apply.status,
    applied: apply.summary.applied,
    blocking: apply.summary.blocking,
    files_unchanged: true,
    dry_apply_records_agree: true,
  }),
  baseAssertion(cli, 'dry-apply-parity', {
    dry_exit: cleanDry.status,
    dry_file_unchanged: true,
    repeated_dry_run_agrees: true,
    apply_exit: cleanApply.status,
    rewrote_legacy_import: true,
    dry_safe_edits: cleanDry.summary.safe_edits,
    apply_safe_edits: cleanApply.summary.safe_edits,
  }),
  baseAssertion(cli, 'second-apply-noop', {
    exit: second.status,
    safe_edits: second.summary.safe_edits,
    file_unchanged_from_first_apply: true,
  }),
  baseAssertion(cli, 'concurrent-edit-rejected', {
    hook: hookName,
    production_fault: false,
    exit: race.status,
    applied: race.summary.applied,
    concurrent_edit: true,
    legacy_import_preserved: true,
    cli_rewrite_absent: true,
  }),
  baseAssertion(cli, 'before-write-hook-refuses', {
    hook: hookName,
    production_fault: false,
    mechanism: 'test hook exits non-zero before writeFileSync',
    not_a_production_write_fault: true,
    exit: hookResult.status,
    stdout_empty: true,
    files_unchanged: true,
    file_count: hookFiles.length,
  }),
];

let notRosteredWriteFailure = {
  executed: true,
  rostered: false,
  case_id: null,
  injection: 'mode 0444 on the last dry-run record',
  hook: null,
  partial_commit: partialCommit,
  exit: faultApply.status,
  earlier_rewritten: faultEarlierRewritten.some(Boolean),
  last_unchanged: faultLastUnchanged,
  reason: 'uncaught writeFileSync leaves an earlier safe edit on disk, so this is not recovery or a refusal without a partial commit',
};
if (writeRefused) {
  assertions.push(baseAssertion(cli, 'write-failure-refused', {
    hook: null,
    production_fault: false,
    mechanism: 'mode 0444 writeFileSync failed before any file changed',
    exit: faultApply.status,
    files_unchanged: true,
    partial_commit: false,
  }));
  notRosteredWriteFailure = {
    executed: true,
    rostered: true,
    case_id: 'write-failure-refused',
    injection: 'mode 0444 on the last dry-run record',
    hook: null,
    partial_commit: false,
    exit: faultApply.status,
    earlier_rewritten: false,
    last_unchanged: true,
    reason: null,
  };
}

if (assertions.map(body => body.case_id).join('\n') !== CASE_IDS.join('\n') && !writeRefused) {
  fail(`executed case ids drifted from ${CASE_IDS.join(', ')}`);
}

const report = {
  schema_version: 1,
  role: 'packaged migration transaction',
  captured_at: new Date().toISOString(),
  check_id: 'migration-packaged',
  group: 'transaction-negatives',
  line: '21.x',
  coverage: 'slice',
  result: 'pass',
  g04_claim: 'not-passed',
  g05_claim: 'not-passed',
  transform_import: false,
  cli_bin: 'package/bin/migrate-legacy.js',
  cli_sha256: cli.sha256,
  cli_bytes: cli.bytes,
  tarball: tarballRelative,
  fixture: 'old-workspace with @angular/material 16.2.14 and a legacy-button import',
  case_ids: assertions.map(body => body.case_id),
  blocked: {
    exit: apply.status,
    applied: apply.summary.applied,
    blocking: apply.summary.blocking,
    files_unchanged: true,
    dry_apply_parity: true,
  },
  clean: {
    first_safe_edits: cleanApply.summary.safe_edits,
    second_safe_edits: second.summary.safe_edits,
    dry_apply_safe_edits: cleanDry.summary.safe_edits,
    idempotent: true,
  },
  concurrent_edit: {
    hook: hookName,
    production_fault: false,
    exit: race.status,
    applied: race.summary.applied,
    concurrent_edit: race.summary.concurrent_edit,
    legacy_import_preserved: raced.includes("@angular/material/legacy-button"),
    cli_rewrite_absent: !raced.includes('@ngx-compat/material-legacy'),
  },
  before_write_hook: {
    hook: hookName,
    production_fault: false,
    exit: hookResult.status,
    files_unchanged: true,
    mechanism: 'test hook exits non-zero before writeFileSync',
  },
  not_rostered_write_failure: notRosteredWriteFailure,
  not_executed: {
    'packaged-schematic': null,
    'frontend-parity': null,
    'old-workspace-cli': null,
    'schematic-runner': null,
  },
  cases_by_line_main: {
    'old-workspace-cli': null,
    'packaged-schematic': null,
    'transaction-negatives': null,
    'frontend-parity': null,
  },
  assertions,
  limitations: [
    'Runs node on package/bin/migrate-legacy.js extracted from the packaged CLI tarball. Does not import a transform function.',
    'The concurrent edit and the all-file refusal are injected by MIGRATE_LEGACY_BEFORE_WRITE. Neither is a production fault.',
    'An uncaught writeFileSync error is not rostered when an earlier file remains rewritten.',
    'Does not run scripts/migration-schematic-runner.mjs. SchematicTestRunner is an in-memory host, not a packaged old workspace.',
    'packaged-schematic and frontend-parity stay null. Every main migration group stays null. Does not claim G04 or G05.',
  ],
};

if (report.case_ids.some(id => !assertions.some(body => body.case_id === id))) {
  fail('refusing to roster an id this process did not execute');
}

mkdirSync(dirname(outPath), {recursive: true});
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
let assertionFiles = null;
const outputDir = assertionOutputDir();
if (outputDir) {
  try {
    assertionFiles = writeAssertions(outputDir, report);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
console.log(JSON.stringify({
  ok: true,
  case_ids: report.case_ids,
  blocked_applied: 0,
  second_safe_edits: second.summary.safe_edits,
  concurrent_exit: race.status,
  before_write_hook_exit: hookResult.status,
  write_failure_rostered: notRosteredWriteFailure.rostered,
  assertion_files: assertionFiles,
}, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

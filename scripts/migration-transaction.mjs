#!/usr/bin/env node
/** Execute recoverable file transactions through the exact run's CLI artifact.
 * No peer installation or product/release qualification is implied by these
 * filesystem fixtures. Faults are explicitly injected in real rename calls.
 */
import {spawnSync} from 'node:child_process';
import {chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {digest, extractMigrationCli, resolveMigrationRun} from './migration-run-inputs.mjs';
export const CASE_IDS = ['blocked-file-writes-nothing', 'dry-apply-parity', 'second-apply-noop',
  'concurrent-edit-rejected', 'before-write-hook-refuses', 'write-failure-refused',
  'mid-replacement-failure-restores-originals', 'recovery-preserves-concurrent-edit',
  'rollback-failure-retains-backup', 'symlink-target-refused'];
const source = "import {MatLegacyButtonModule} from '@angular/material/legacy-button';\n";
const migrated = source.replace('@angular/material/legacy-button', '@ngx-compat/material-legacy/legacy-button');
const marker = '\n// concurrent edit\n';
const hookName = 'MIGRATE_LEGACY_BEFORE_WRITE';
const check = (condition, message) => {if (!condition) throw new Error(message);};
function args(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 2) {
    check(['--run', '--out'].includes(argv[i]) && argv[i + 1] && !argv[i + 1].startsWith('--') && !result[argv[i]], 'expected one --run and one --out');
    result[argv[i]] = resolve(argv[i + 1]);
  }
  check(result['--run'] && result['--out'], '--run and --out are required; no workspace artifact fallback');
  check(!existsSync(result['--out']), 'refusing to overwrite transaction report');
  return result;
}
function execute(input, cli, work, output) {
  const assertions = [];
  const artifactRecords = Object.values(input.artifacts).map(({absolute, ...record}) => record);
  function record(id, facts) {
    assertions.push({schema_version: 1, kind: 'assertion', result: 'pass', check_id: 'migration-packaged',
      line: input.line, group: 'transaction-negatives', case_id: id, run_id: input.run.run_id,
      invocation_id: input.request?.invocation ?? null, binding: input.request?.binding ?? null,
      artifacts: artifactRecords, cli_bin: 'package/bin/migrate-legacy.js', cli_support_files: cli.identities,
      transform_import: false, coverage: 'slice', g04_claim: 'not-passed', g05_claim: 'not-passed',
      exit_code: 0, fixture_peers_installed: false, ...facts});
  }
  function fixture(id, count = 1) {
    const dir = join(work, id);mkdirSync(dir);
    const files = Array.from({length: count}, (_, i) => join(dir, `app${i}.ts`));
    for (const path of files) writeFileSync(path, source, {mode: 0o640});
    return {dir, files};
  }
  function run(target, apply = true, options = {}) {
    const env = {...process.env};delete env[hookName];delete env.NODE_OPTIONS;
    Object.assign(env, options.env ?? {});
    const result = spawnSync(process.execPath, [...(options.preload ? ['--require', options.preload] : []), cli.bin, target, '--json', ...(apply ? ['--apply'] : [])],
      {cwd: work, env, encoding: 'utf8', timeout: 30000});
    check(!result.error && result.signal === null && result.status !== null, 'CLI child failed to execute');
    let summary = null;
    if (result.stdout.trim()) summary = JSON.parse(result.stdout);
    return {exit: result.status, summary, stdout: result.stdout, stderr: result.stderr};
  }
  const same = files => files.every(path => readFileSync(path, 'utf8') === source);
  const signature = summary => JSON.stringify(summary.records.map(({path, ok, changed, diagnostics}) => ({path, ok, changed, diagnostics})));
  let f = fixture(CASE_IDS[0]);writeFileSync(join(f.dir, 'bad.ts'), "import {X} from '@angular/material/legacy-select/private';\n");
  let dry = run(f.dir, false), applied = run(f.dir);
  check(dry.exit === 1 && applied.exit === 1 && applied.summary.applied === 0 && applied.summary.blocking > 0 && same(f.files) &&
    readFileSync(join(f.dir, 'bad.ts'), 'utf8').includes('/private') && signature(dry.summary) === signature(applied.summary), 'blocked file caused an edit');
  record(CASE_IDS[0], {dry_exit: dry.exit, apply_exit: applied.exit, applied: 0, blocking: applied.summary.blocking, files_unchanged: true, dry_apply_records_agree: true});
  f = fixture(CASE_IDS[1]);dry = run(f.dir, false);const repeated = run(f.dir, false);
  check(dry.exit === 0 && same(f.files) && signature(dry.summary) === signature(repeated.summary), 'dry run changed files or records');
  applied = run(f.dir);
  check(applied.exit === 0 && readFileSync(f.files[0], 'utf8') === migrated && applied.summary.safe_edits === dry.summary.safe_edits && applied.summary.transaction.status === 'committed', 'dry/apply parity failed');
  record(CASE_IDS[1], {dry_exit: 0, apply_exit: 0, dry_file_unchanged: true, repeated_dry_run_agrees: true, rewrote_legacy_import: true, dry_safe_edits: dry.summary.safe_edits, apply_safe_edits: applied.summary.safe_edits});
  const second = run(f.dir);check(second.exit === 0 && second.summary.safe_edits === 0 && readFileSync(f.files[0], 'utf8') === migrated, 'second apply changed bytes');
  record(CASE_IDS[2], {exit: 0, safe_edits: 0, file_unchanged_from_first_apply: true});
  f = fixture(CASE_IDS[3]);let hook = join(work, 'concurrent-hook.cjs');
  writeFileSync(hook, `require('node:fs').appendFileSync(${JSON.stringify(f.files[0])}, ${JSON.stringify(marker)});\n`);
  const race = run(f.dir, true, {env: {[hookName]: `${JSON.stringify(process.execPath)} ${JSON.stringify(hook)}`}});
  check(race.exit === 1 && race.summary.applied === 0 && race.summary.concurrent_edit === true && readFileSync(f.files[0], 'utf8') === source + marker, 'concurrent source edit was overwritten');
  record(CASE_IDS[3], {hook: hookName, production_fault: false, exit: 1, applied: 0, concurrent_edit: true, legacy_import_preserved: true, cli_rewrite_absent: true});
  f = fixture(CASE_IDS[4], 2);hook = join(work, 'refusal-hook.cjs');writeFileSync(hook, 'process.exit(3);\n');
  const refusal = run(f.dir, true, {env: {[hookName]: `${JSON.stringify(process.execPath)} ${JSON.stringify(hook)}`}});
  check(refusal.exit === 1 && refusal.stdout === '' && refusal.stderr.includes('before-write hook failed') && same(f.files), 'hook refusal changed bytes');
  record(CASE_IDS[4], {hook: hookName, production_fault: false, exit: 1, stdout_empty: true, files_unchanged: true, file_count: 2});
  f = fixture(CASE_IDS[5], 3);chmodSync(f.files[2], 0o440);const readonly = run(f.dir);
  check(readonly.exit === 1 && same(f.files) && readonly.summary.transaction.status === 'refused' && readonly.summary.transaction.committed_before_failure === 0, 'read-only preflight partially applied');
  record(CASE_IDS[5], {hook: null, production_fault: false, exit: 1, files_unchanged: true, partial_commit: false, transaction: readonly.summary.transaction});
  for (const [id, mode] of [[CASE_IDS[6], 'rollback'], [CASE_IDS[7], 'concurrent'], [CASE_IDS[8], 'rollback-error']]) {
    f = fixture(id, 3);const trace = join(work, `${mode}-trace.json`);const preload = join(work, `${mode}-preload.cjs`);
    writeFileSync(preload, `const fs = require('node:fs');const rename = fs.renameSync;let replacements = 0;
const files = ${JSON.stringify(f.files)};const mode = ${JSON.stringify(mode)};
fs.renameSync = function(from, to) {
 if (String(from).endsWith('-stage') && ++replacements === 3) {
  const before = files.map(p => fs.readFileSync(p, 'utf8'));
  fs.writeFileSync(${JSON.stringify(trace)}, JSON.stringify({replacements, rewritten_before_failure: before.filter(b => b.includes('@ngx-compat/material-legacy')).length}));
  if (mode === 'concurrent') fs.appendFileSync(files[0], ${JSON.stringify(marker)});
  const e = new Error('injected replacement EIO');e.code = 'EIO';throw e;
 }
 if (mode === 'rollback-error' && String(from).endsWith('-backup')) {const e = new Error('injected recovery EIO');e.code = 'EIO';throw e;}
 return rename.apply(this, arguments);
};require('node:module').syncBuiltinESMExports();\n`);
    const fault = run(f.dir, true, {preload});const observed = JSON.parse(readFileSync(trace, 'utf8'));const tx = fault.summary.transaction;
    check(fault.exit === 1 && observed.replacements === 3 && observed.rewritten_before_failure === 2 && tx.committed_before_failure === 2 && tx.phase === 'replace', 'fault did not execute after two real replacements');
    const recovery = tx.recovery_files.map(item => ({path: item.path, backup: item.backup, original_sha256: item.original_sha256,
      observed_backup_sha256: digest(readFileSync(item.backup)), bytes: readFileSync(item.backup).length}));
    check(recovery.every(item => item.observed_backup_sha256 === digest(source) && item.original_sha256 === digest(source)), 'recovery backup is not the original bytes');
    if (mode === 'rollback') check(tx.status === 'rolled-back' && tx.applied === 0 && tx.rolled_back && same(f.files) && recovery.length === 0, 'replacement error left rewritten files');
    if (mode === 'concurrent') check(tx.status === 'recovery-required' && tx.applied === 1 && !tx.rolled_back && recovery.length === 1 &&
      readFileSync(f.files[0], 'utf8') === migrated + marker && readFileSync(f.files[1], 'utf8') === source && readFileSync(f.files[2], 'utf8') === source, 'recovery overwrote concurrent edit');
    if (mode === 'rollback-error') check(tx.status === 'recovery-required' && tx.applied === 2 && !tx.rolled_back && recovery.length === 2 &&
      readFileSync(f.files[0], 'utf8') === migrated && readFileSync(f.files[1], 'utf8') === migrated && readFileSync(f.files[2], 'utf8') === source, 'rollback failure falsely reported restoration');
    const retry = mode === 'rollback' ? run(f.dir) : null;
    if (retry) check(retry.exit === 0 && f.files.every(path => readFileSync(path, 'utf8') === migrated), 'restored files cannot be retried');
    record(id, {hook: null, production_fault: false, injected_fs_error: true, filesystem_path_executed: true, exit: 1,
      observed, transaction: tx, recovery, original_sha256: digest(source), files_restored: mode === 'rollback',
      concurrent_edit_preserved: mode === 'concurrent', retry_exit: retry?.exit ?? null});
  }
  f = fixture(CASE_IDS[9]);const link = join(f.dir, 'link.ts');symlinkSync(f.files[0], link);const symbolic = run(link);
  check(symbolic.exit === 1 && same(f.files) && symbolic.summary.transaction.status === 'refused' && symbolic.summary.applied === 0, 'symlink target was rewritten');
  record(CASE_IDS[9], {exit: 1, files_unchanged: true, transaction: symbolic.summary.transaction});
  check(JSON.stringify(assertions.map(body => body.case_id)) === JSON.stringify(CASE_IDS), 'executed roster drift');
  for (const item of Object.values(input.artifacts)) {const bytes = readFileSync(item.absolute);check(bytes.length === item.bytes && digest(bytes) === item.sha256, 'run artifact changed during transaction checks');}
  const report = {schema_version: 1, check_id: 'migration-packaged', line: input.line, result: 'pass', coverage: 'slice',
    run_id: input.run.run_id, case_ids: CASE_IDS, assertions, artifacts: artifactRecords,
    limitations: ['Filesystem fixtures install no peers. The separate old-workspace producer provides migration upgrade proof.',
      'EIO faults are injected into real replacement/recovery calls; the before-write hook is separately identified.',
      'Recoverable apply is not crash-atomic and does not exclude noncooperating writes between a check and rename.',
      'Packaged schematic/frontend parity and G04/G05 remain separate requirements.']};
  mkdirSync(dirname(output), {recursive: true});writeFileSync(output, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  if (input.request) for (const body of assertions) writeFileSync(join(input.request.outputDir, `${body.case_id}.json`), JSON.stringify(body, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({ok: true, line: input.line, case_ids: CASE_IDS}));
}
function main() {
  const options = args(process.argv.slice(2));const input = resolveMigrationRun(options['--run']);
  const work = mkdtempSync(join(tmpdir(), 'ngx-compat-migrate-tx-'));
  try {const cli = extractMigrationCli(input, work);execute(input, cli, work, options['--out']);} finally {rmSync(work, {recursive: true, force: true});}
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {main();} catch (error) {console.error(error.message);process.exitCode = 1;}
}

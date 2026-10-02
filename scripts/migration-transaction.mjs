#!/usr/bin/env node
/**
 * Blocked packaged-CLI apply must leave every file unchanged.
 * Dry-run and apply report the same edits. A clean apply is idempotent.
 *
 *   node scripts/migration-transaction.mjs
 */
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tarball = join(root, 'migration/dist/ngx-compat-material-legacy-migrate-cli-22.0.0-rc.0.tgz');
const reportPath = join(root, 'compatibility/rc/reports/migration-transaction.json');
const safeSource = "import {MatLegacyButtonModule} from '@angular/material/legacy-button';\n";
const blockedSource = "import {X} from '@angular/material/legacy-select/private';\n";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function extract() {
  const work = mkdtempSync(join(tmpdir(), 'ngx-compat-migrate-tx-'));
  const extracted = spawnSync('tar', ['-xzf', tarball, '-C', work], {encoding: 'utf8'});
  if (extracted.status !== 0) fail(extracted.stderr || 'tar extract failed');
  return {work, bin: join(work, 'package/bin/migrate-legacy.js')};
}

function run(bin, dir, apply) {
  const args = [bin, dir, '--json'];
  if (apply) args.push('--apply');
  const result = spawnSync(process.execPath, args, {cwd: dir, encoding: 'utf8'});
  let summary;
  try {
    summary = JSON.parse(result.stdout);
  } catch {
    fail(`CLI did not emit JSON\n${result.stderr || ''}\n${result.stdout || ''}`);
  }
  return {status: result.status, summary};
}

function signature(summary) {
  return JSON.stringify(summary.records.map(record => ({
    path: record.path,
    ok: record.ok,
    changed: record.changed,
    diagnostics: record.diagnostics,
  })));
}

function writeOldWorkspace(dir) {
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
  const sourceFile = join(dir, 'src/app.ts');
  writeFileSync(sourceFile, safeSource);
  return sourceFile;
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

const {bin} = extract();
const blockedDir = mkdtempSync(join(tmpdir(), 'ngx-compat-migrate-blocked-'));
writeFileSync(join(blockedDir, 'ok.ts'), safeSource);
writeFileSync(join(blockedDir, 'bad.ts'), blockedSource);
const before = {
  ok: readFileSync(join(blockedDir, 'ok.ts'), 'utf8'),
  bad: readFileSync(join(blockedDir, 'bad.ts'), 'utf8'),
};
const dry = run(bin, blockedDir, false);
const apply = run(bin, blockedDir, true);
if (dry.status !== 1 || apply.status !== 1) fail(`blocked run exited dry=${dry.status} apply=${apply.status}`);
if (dry.summary.applied !== 0 || apply.summary.applied !== 0) fail('blocked apply wrote a file');
if (dry.summary.blocking < 1 || apply.summary.blocking !== dry.summary.blocking) {
  fail('dry-run and apply disagree on blocking');
}
if (signature(dry.summary) !== signature(apply.summary)) fail('dry-run and apply records differ');
if (readFileSync(join(blockedDir, 'ok.ts'), 'utf8') !== before.ok) fail('blocked apply changed the safe file');
if (readFileSync(join(blockedDir, 'bad.ts'), 'utf8') !== before.bad) fail('blocked apply changed the blocked file');

const cleanDir = mkdtempSync(join(tmpdir(), 'ngx-compat-migrate-clean-'));
const cleanFile = writeOldWorkspace(cleanDir);
const cleanDry = run(bin, cleanDir, false);
if (cleanDry.status !== 0 || readFileSync(cleanFile, 'utf8') !== safeSource) {
  fail('clean dry-run changed the file');
}
if (signature(cleanDry.summary) !== signature(run(bin, cleanDir, false).summary)) {
  fail('repeated dry-run records differ');
}
const cleanApply = run(bin, cleanDir, true);
const rewritten = readFileSync(cleanFile, 'utf8');
if (cleanApply.status !== 0 || !rewritten.includes("@ngx-compat/material-legacy/legacy-button")) {
  fail('clean apply did not rewrite the legacy import');
}
if (cleanDry.summary.safe_edits !== cleanApply.summary.safe_edits) {
  fail('dry-run and apply disagree on safe edits');
}
const second = run(bin, cleanDir, true);
if (second.status !== 0 || second.summary.safe_edits !== 0 || readFileSync(cleanFile, 'utf8') !== rewritten) {
  fail('second apply was not idempotent');
}

const raceDir = mkdtempSync(join(tmpdir(), 'ngx-compat-migrate-race-'));
const raceFile = writeOldWorkspace(raceDir);
const hookFile = join(raceDir, 'hook.cjs');
writeFileSync(hookFile, `require('fs').appendFileSync(${JSON.stringify(raceFile)}, '\\n// concurrent edit\\n');\n`);
const race = spawnSync(process.execPath, [bin, raceDir, '--json', '--apply'], {
  cwd: raceDir,
  encoding: 'utf8',
  env: {...process.env, MIGRATE_LEGACY_BEFORE_WRITE: `node ${JSON.stringify(hookFile)}`},
});
let raceSummary;
try {
  raceSummary = JSON.parse(race.stdout);
} catch {
  fail(`concurrent CLI did not emit JSON\n${race.stderr || ''}\n${race.stdout || ''}`);
}
const raced = readFileSync(raceFile, 'utf8');
if (race.status === 0 || raceSummary.concurrent_edit !== true || raceSummary.applied !== 0) {
  fail(`concurrent edit was not rejected: exit=${race.status} ${race.stdout}`);
}
if (raced !== `${safeSource}\n// concurrent edit\n` || raced.includes('@ngx-compat/material-legacy')) {
  fail(`concurrent edit changed the CLI output:\n${raced}`);
}

const outPath = parseArgs(process.argv.slice(2));
const report = {
  schema_version: 1,
  role: 'packaged migration transaction',
  captured_at: new Date().toISOString(),
  fixture: 'old-workspace with @angular/material 16.2.14 and a legacy-button import',
  blocked: {exit: apply.status, applied: apply.summary.applied, blocking: apply.summary.blocking, files_unchanged: true, dry_apply_parity: true},
  clean: {
    first_safe_edits: cleanApply.summary.safe_edits,
    second_safe_edits: second.summary.safe_edits,
    dry_apply_safe_edits: cleanDry.summary.safe_edits,
    idempotent: true,
  },
  concurrent_edit: {
    exit: race.status,
    applied: raceSummary.applied,
    concurrent_edit: raceSummary.concurrent_edit,
    legacy_import_preserved: raced.includes("@angular/material/legacy-button"),
    cli_rewrite_absent: !raced.includes('@ngx-compat/material-legacy'),
  },
  limitations: [
    'The concurrent edit is injected by MIGRATE_LEGACY_BEFORE_WRITE between the read and the re-read. The CLI writes nothing when the bytes differ.',
    'Does not run the Angular schematic factory.',
    'This is not RC-04-A02.',
  ],
};
mkdirSync(dirname(outPath), {recursive: true});
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  blocked_applied: 0,
  second_safe_edits: second.summary.safe_edits,
  concurrent_exit: race.status,
}, null, 2));

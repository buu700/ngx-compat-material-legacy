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
writeFileSync(join(cleanDir, 'ok.ts'), safeSource);
const cleanDry = run(bin, cleanDir, false);
if (cleanDry.status !== 0 || readFileSync(join(cleanDir, 'ok.ts'), 'utf8') !== safeSource) {
  fail('clean dry-run changed the file');
}
const cleanApply = run(bin, cleanDir, true);
const rewritten = readFileSync(join(cleanDir, 'ok.ts'), 'utf8');
if (cleanApply.status !== 0 || !rewritten.includes("@ngx-compat/material-legacy/legacy-button")) {
  fail('clean apply did not rewrite the legacy import');
}
const second = run(bin, cleanDir, true);
if (second.status !== 0 || second.summary.safe_edits !== 0 || readFileSync(join(cleanDir, 'ok.ts'), 'utf8') !== rewritten) {
  fail('second apply was not idempotent');
}

const report = {
  schema_version: 1,
  role: 'packaged migration transaction',
  captured_at: new Date().toISOString(),
  blocked: {exit: apply.status, applied: apply.summary.applied, blocking: apply.summary.blocking, files_unchanged: true},
  clean: {first_safe_edits: cleanApply.summary.safe_edits, second_safe_edits: second.summary.safe_edits},
  limitations: [
    'Does not fault-inject a mid-write failure or detect a concurrent edit.',
    'Does not run the Angular schematic factory.',
    'This is not RC-04-A02.',
  ],
};
mkdirSync(dirname(reportPath), {recursive: true});
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ok: true, blocked_applied: 0, second_safe_edits: second.summary.safe_edits}, null, 2));

/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {currentInventorySourceSubject as make} from '../scripts/current-inventory-source-subject.mjs';

const canonical = process.cwd(), initial = make({root: canonical});
const root = mkdtempSync(join(tmpdir(), 'retained-wrapper-frame-v7-'));
const hash = raw => createHash('sha256').update(raw).digest('hex');
try {
  for (const ref of initial.bound) {
    const dest = join(root, ref.path); mkdirSync(dirname(dest), {recursive: true});
    writeFileSync(dest, readFileSync(join(canonical, ref.path)));
  }
  writeFileSync(join(root, '.git'), 'gitdir: ' + execFileSync('git', ['rev-parse', '--absolute-git-dir'], {cwd: canonical}).toString().trim() + '\n');
  const physical = path => readFileSync(join(root, path));
  const packet = JSON.parse(physical('compatibility/rc/main-current-inventory-source-routing-v7.json'));
  const update = packet.updates[0], source = make({root});
  const prior = JSON.parse(physical('compatibility/rc/main-current-inventory-source-routing-v8.json')).updates.find(row => row.path === update.path).after;
  const stage = JSON.parse(physical('compatibility/rc/main-current-inventory-source-routing-v9.json')).updates.find(row => row.path === update.path).after;
  const guard = JSON.parse(physical('compatibility/rc/main-current-tool-guard-test-source-routing-v10.json')).updates.find(row => row.path === update.path).after;
  const comparison = JSON.parse(physical('compatibility/rc/main-checker-owned-comparison-source-routing-v11.json')).updates.find(row => row.path === update.path).after;
  const context = JSON.parse(physical('compatibility/rc/main-checker-context-source-routing-v12.json')).updates.find(row => row.path === update.path).after;
  const latest = JSON.parse(physical('compatibility/rc/main-browser-private-owner-source-routing-v13.json')).updates.find(row => row.path === update.path).after;
  assert.deepEqual(source.qualify(context), latest);
  assert.equal(hash(source.comparisonBytes(context)), context.sha256);
  assert.deepEqual(source.qualify(comparison), latest);
  assert.equal(hash(source.comparisonBytes(comparison)), comparison.sha256);
  assert.equal(source.bound.length, 128); assert.equal(source.transitions.length, 7);
  assert.deepEqual(source.qualify(update.before), latest);
  assert.deepEqual(source.qualify(update.after), latest);
  assert.deepEqual(source.qualify(latest), latest);
  assert.deepEqual(source.qualify(prior), latest);
  assert.deepEqual(source.qualify(stage), latest);
  assert.equal(hash(source.comparisonBytes(stage)), stage.sha256);
  assert.deepEqual(source.qualify(guard), latest);
  assert.equal(hash(source.comparisonBytes(guard)), guard.sha256);
  const old = source.comparisonBytes(update.before), current = physical(update.path);
  assert.equal(hash(old), update.before.sha256); assert.equal(hash(current), latest.sha256);
  assert.equal(old.equals(current), false);
  assert.throws(() => source.qualify({...update.before, bytes: update.before.bytes + 1}));
  assert.throws(() => source.qualify({...update.before, sha256: '0'.repeat(64)}));
  let getters = 0;
  assert.throws(() => source.qualify({get path() {getters++; return update.path;}, sha256: update.before.sha256}));
  assert.equal(getters, 0);
  assert.throws(() => make({root, read: path => path === update.path ? old : physical(path)}));
  let useOld = false;
  const live = make({root, read: path => useOld && path === update.path ? old : physical(path)});
  useOld = true; assert.throws(() => live.assertCurrent()); useOld = false; live.assertCurrent();
  let restore = false;
  const late = make({root, read: path => {
    if (restore) {restore = false; writeFileSync(join(root, update.path), current);}
    return physical(path);
  }});
  let warmColdRestoreRejected = false;
  try {
    writeFileSync(join(root, update.path), old); restore = true;
    try {late.assertCurrent();} catch {warmColdRestoreRejected = true;}
  } finally {restore = false; writeFileSync(join(root, update.path), current);}
  let nestedArmed = false, nested;
  nested = make({root, read: path => {
    if (nestedArmed) {nestedArmed = false; try {nested.assertCurrent();} catch {}}
    return physical(path);
  }});
  nestedArmed = true; let caughtReentryRejected = false;
  try {nested.assertCurrent();} catch {caughtReentryRejected = true;}
  nested.assertCurrent();
  const incoming = {...update.before}; let mutate = false;
  const metadata = make({root, read: path => {
    if (mutate) {mutate = false; incoming.sha256 = '0'.repeat(64);}
    return physical(path);
  }});
  mutate = true; let changedMetadataRejected = false;
  try {metadata.qualify(incoming);} catch {changedMetadataRejected = true;}
  metadata.assertCurrent(); incoming.sha256 = update.before.sha256;
  assert.deepEqual(metadata.qualify(incoming), latest);
  const passed = warmColdRestoreRejected && caughtReentryRejected && changedMetadataRejected;
  const result = {result: passed ? 'pass' : 'fail', bound: source.bound.length,
    transitions: source.transitions.length, old_source_reader_rejected: true,
    late_old_source_reader_rejected: true, warm_cold_restore_before_callback_rejected: warmColdRestoreRejected,
    caught_reentry_rejected: caughtReentryRejected, changed_input_metadata_rejected: changedMetadataRejected,
    accessor_calls: getters, historical_programs_executed: false, artifact_or_audit_admission_granted: false};
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify(result));
  assert.equal(warmColdRestoreRejected, true, 'warm source drift restored by first callback must reject');
  assert.equal(caughtReentryRejected, true, 'caught reentry must still reject the outer operation');
  assert.equal(changedMetadataRejected, true, 'input metadata changed during callbacks must reject');
  late.assertCurrent();
} finally {rmSync(root, {recursive: true, force: true});}

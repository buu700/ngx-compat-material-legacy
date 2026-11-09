/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {currentSassToolReferenceSubject as make} from '../scripts/current-sass-tool-references.mjs';

const canonical = process.cwd(), base = make({root: canonical});
const root = mkdtempSync(join(tmpdir(), 'tooltip-source-program-js-'));
const hash = raw => createHash('sha256').update(raw).digest('hex');
try {
  for (const ref of base.bound) {
    const dest = join(root, ref.path); mkdirSync(dirname(dest), {recursive: true});
    writeFileSync(dest, readFileSync(join(canonical, ref.path)));
  }
  writeFileSync(join(root, '.git'), 'gitdir: ' + execFileSync('git', ['rev-parse', '--absolute-git-dir'], {cwd: canonical}).toString().trim() + '\n');
  const read = path => readFileSync(join(root, path));
  const scope = make({root});
  const packetPath = 'compatibility/rc/main-tooltip-resource-source-programs-v1.json';
  const packet = JSON.parse(read(packetPath));
  const graphPath = 'compatibility/rc/main-sass-graph-resource-source-programs-v2.json';
  const contractPath = 'compatibility/rc/main-sass-resource-contract-programs-v1.json';
  const graph = JSON.parse(read(graphPath)), contracts = JSON.parse(read(contractPath));
  const testPath = 'compatibility/rc/main-current-inventory-source-routing-v7.json';
  const test = JSON.parse(read(testPath));
  const inspectionPath = 'compatibility/rc/main-current-inventory-source-routing-v8.json';
  const inspection = JSON.parse(read(inspectionPath));
  const stagePath = 'compatibility/rc/main-current-inventory-source-routing-v9.json';
  const stage = JSON.parse(read(stagePath));
  const updates = [...packet.updates, ...graph.updates, ...contracts.updates, ...test.updates, ...inspection.updates, ...stage.updates];
  const latest = new Map(updates.map(row => [row.path, row.after]));
  assert.equal(scope.bound.length, 522); assert.equal(scope.transitions.length, 104);
  for (const update of updates) for (const ref of [update.before, update.after]) {
    assert.deepEqual(scope.qualify(ref), latest.get(update.path));
    assert.equal(hash(scope.comparisonBytes(ref)), ref.sha256);
    assert.equal(scope.qualify({...ref, sha256: '0'.repeat(64)}), null);
    assert.throws(() => scope.qualify({...ref, bytes: ref.bytes + 1}));
  }
  const targets = [...new Set([packetPath, graphPath, contractPath, testPath, inspectionPath, stagePath, test.source_anchor.packet.path, ...updates.map(row => row.path),
    ...packet.support.map(row => row.path), ...graph.support.map(row => row.path)])];
  for (const path of targets) {
    const file = join(root, path), saved = read(path);
    try {
      writeFileSync(file, Buffer.concat([saved, Buffer.from(' ')]));
      assert.throws(() => scope.assertCurrent());
      assert.throws(() => make({root}));
    } finally {writeFileSync(file, saved);}
    scope.assertCurrent();
  }
  for (const target of latest.keys()) assert.throws(() => make({root,
    read: path => path === target ? Buffer.from('not the physical source') : read(path)}));
  console.log(JSON.stringify({result: 'pass', bound: scope.bound, transitions: scope.transitions,
    program_reference_checks: updates.length * 2, unique_program_images: new Set(updates.flatMap(row => [row.before.sha256, row.after.sha256])).size,
    physical_cold_late_recovery_targets: targets.length,
    bad_supplied_program_readers_rejected: latest.size, historical_programs_executed: false,
    artifact_or_audit_admission_granted: false}));
} finally {rmSync(root, {recursive: true, force: true});}

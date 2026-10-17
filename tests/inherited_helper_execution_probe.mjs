/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real public helper execution; CLI inventories and coordinator remain synthetic. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createFixture, hash} from './upstream/artifact-behavior-fixture.mjs';
import {inheritedHelperRequirements, inspectInheritedHelperObservation} from '../scripts/upstream-inherited-helper-evidence.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), read = p => fs.readFileSync(path.join(root, p));
const json = p => JSON.parse(read(p)), line = json('projects/ngx-material-legacy/package.json').version.startsWith('21.') ? '21.x' : 'main';
const ledger = json('compatibility/f10/disposition-ledger/ledger.json'), observations = [];
let inspectionControls = 0;
for (const sha of ['737c7a8f1a5bc4df0e790d3ecdd227f8342499f8', 'e43c059ac313fca732443c6c73cf397f0cf446f3']) {
  const entry = structuredClone(ledger.entries.find(row => row.sha === sha)), review = json(entry.evidence_report);
  const requirements = inheritedHelperRequirements(sha, line);
  const paths = new Set([...requirements.source_members.map(row => row.path), ...requirements.files.map(p => 'projects/ngx-material-legacy/' + p)]);
  for (const file of ['compatibility/rc/key-manager-public-subjects.json', 'compatibility/rc/element-ref-public-subjects.json', 'compatibility/rc/key-manager-tagged-construction-subjects.json']) {
    paths.add(file); const data = json(file);
    for (const member of data.members || []) paths.add(member.path);
    for (const subject of data.subjects || []) {
      for (const member of subject.members || []) paths.add(member.path);
      for (const pkg of subject.packages || []) for (const member of pkg.members) paths.add(member.path);
    }
  }
  entry.individual_proof.artifact_behavior = {source_members: [...paths].map(path => ({path, sha256: hash(read(path))}))};
  const f = createFixture(root, {entry, review}); delete f.entry.individual_proof.artifact_behavior;
  const original = structuredClone(f.entry), producer = fs.readFileSync(path.join(f.root, requirements.producer.path));
  const caller = 'projects/ngx-material-legacy/' + requirements.files[0], callerBytes = fs.readFileSync(path.join(f.root, caller));
  let baseline;
  function run(name, mutate, expected, coordinator = false) {
    for (const key of Object.keys(f.entry)) delete f.entry[key]; Object.assign(f.entry, structuredClone(original));
    f.repoPut(requirements.producer.path, producer); f.repoPut(caller, callerBytes); mutate?.();
    f.runPut('seed.json', {commits: [{sha}], fixture_only: true}); f.runPut('ledger.json', {entries: [f.entry], fixture_only: true, g11_claim: 'not-passed'});
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('RC_')));
    const output = path.join(f.runDir, 'evidence/upstream-audit-disposition/synthetic-helper'); fs.mkdirSync(output, {recursive: true});
    if (coordinator) Object.assign(env, {RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: f.request.runId, RC_INVOCATION_ID: 'synthetic-helper',
      RC_EVIDENCE_BINDING: JSON.stringify(f.request.binding), RC_ASSERTION_OUTPUT_DIR: output});
    const out = path.join(f.runDir, name + '.json');
    const child = spawnSync(process.execPath, [path.join(f.root, 'scripts/check-upstream-audit-disposition.mjs'), '--admission', '--line', line,
      '--seed', path.join(f.runDir, 'seed.json'), '--ledger', path.join(f.runDir, 'ledger.json'), '--symbols', path.join(f.root, 'symbols.json'),
      '--current-symbols', path.join(f.root, 'current.json'), '--report', out], {cwd: f.root, env, encoding: 'utf8', timeout: 40000});
    assert.ok([0, 1].includes(child.status), child.stderr + String(child.error || ''));
    const report = JSON.parse(fs.readFileSync(out));
    assert.equal(child.status, expected ? 0 : 1, name + child.stderr + JSON.stringify(report.inherited_execution_evidence));
    const evidence = report.inherited_execution_evidence.find(row => row.sha === sha);
    if (expected || evidence) assert.equal(evidence?.ok, expected, name + JSON.stringify(evidence));
    else assert.equal(report.insufficient_inherited, 1);
    if (name === 'changed-owned-behavior') assert.match(evidence.detail, /inherited helper execution failed/);
    if (name === 'changed-producer') assert.match(evidence.detail, /unreviewed inherited helper producer/);
    assert.equal(report.g11_claim, 'not-passed');
    if (expected) {
      baseline = evidence.observation;
      if (coordinator) assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, 'disposition-observations.json'))).inherited_execution_evidence, report.inherited_execution_evidence);
    }
    observations.push({sha, name, exit_code: child.status, helper_execution: evidence?.execution || null, detail: evidence?.detail || 'branch scope rejected before execution',
      synthetic_inventory_or_coordinator: true, actual_native_packed_or_floor_qualified: false});
  }
  try {
    run('complete-no-coordinator', null, true);
    run('complete-coordinator', null, true, true);
    run('wrong-installed-digest', () => f.entry.individual_proof.installed_member.sha256 = 'a'.repeat(64), false);
    run('wrong-branch-review', () => f.entry.individual_proof.affected_branches = [line === 'main' ? '21.x' : 'main'], false);
    run('renamed-proof-kind', () => f.entry.individual_proof.proof_kind = 'complete-individual-runtime-review', false);
    run('unexecuted-report-marker', () => f.entry.individual_proof.reachable_behavior.id = 'arbitrary-successful-report', false);
    run('changed-producer', () => f.repoPut(requirements.producer.path, producer + '\n// changed fixture producer\n'), false);
    run('changed-owned-behavior', () => {
      const text = callerBytes.toString(), changed = sha.startsWith('737')
        ? text.replace('if (!isFakeMousedownFromScreenReader(event))', 'if (isFakeMousedownFromScreenReader(event))')
        : text.replace('this._trackedModal = null;', 'this._trackedModal = modal;');
      assert.notEqual(changed, text); f.repoPut(caller, changed);
    }, false);
    f.repoPut(caller, callerBytes);
    assert.ok(baseline);
    const mutations = [o => o.line = 'unknown', o => o.upstream_sha = '0'.repeat(40), o => o.patch_sha256 = 'f'.repeat(64),
      o => o.runtime_override_used = true, o => o.source_override_used = true, o => o.contracts.pop(),
      o => o.contracts.find(row => row.line === line).cdk_version = '16.2.14',
      o => o.contracts.find(row => row.line === line).helpers[0].runtime_sha256 = 'a'.repeat(64),
      o => o.cases.pop(), o => o.cases[0].candidate_source_sha256 = 'a'.repeat(64), o => o.delegations.pop(),
      ...(sha.startsWith('737') ? [o => o.helpers[0].layout_coordinate_reads = 1, o => o.delegations[0].exact_owned_handlers_replayed = false]
        : [o => o.behaviors[0].trim_once_checks = 0, o => o.delegations[0].ownership_transitions = 0])];
    inspectInheritedHelperObservation({root: f.root, sha, line, observation: baseline}); inspectionControls++;
    for (const mutate of mutations) {
      const changed = structuredClone(baseline); mutate(changed);
      assert.throws(() => inspectInheritedHelperObservation({root: f.root, sha, line, observation: changed})); inspectionControls++;
    }
  } finally {f.dispose();}
}
const report = {schema_version: 1, line, actual_CLI_scenarios: observations.length, actual_helper_observation_inspection_controls: inspectionControls,
  real_public_helper_execution: true, source_dispositions_or_authored_uses_closed: 0, actual_native_packed_or_floor_qualified: false, g11_claim: 'not-passed', observations};
const out = process.argv.indexOf('--out'); if (out >= 0) fs.writeFileSync(process.argv[out + 1], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report, observations: undefined}));

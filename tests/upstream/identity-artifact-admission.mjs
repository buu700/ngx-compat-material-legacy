/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual reader/CLI and cached prerequisite semantic controls; no product run. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
import {readFileSync, writeFileSync, mkdirSync, renameSync, symlinkSync, unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFixture, hash} from './artifact-behavior-fixture.mjs';
import {GENERATED_IDENTITY_KIND, GENERATED_IDENTITY_SHAS, generatedIdentityRequirements,
  requiresGeneratedIdentity, validateGeneratedIdentity} from '../../scripts/upstream-generated-identity-evidence.mjs';
import {GENERATED_IDENTITY_CASE_ID, packedGeneratedIdentityCase} from '../../scripts/generated-identity-packed-contract.mjs';
import {validatePackedConsumerRun, readEvidenceMember} from '../../scripts/upstream-packed-run-evidence.mjs';
import {inspectIdentitySourceJudgments} from '../../scripts/identity-source-judgments.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), read = path => readFileSync(join(root, path));
const ts = createRequire(import.meta.url)('typescript'), judgments = inspectIdentitySourceJudgments({root}), line = judgments.proof.line;
// Reuse the existing complete 1174-case semantic corpus instead of inventing a
// smaller fixture that merely mirrors this new evidence reader.
const corpusText = read('tests/generated_identity_packed_contract_probe.mjs').toString();
const corpus = ts.createSourceFile('corpus.mjs', corpusText, ts.ScriptTarget.Latest, true);
const variable = name => corpus.statements.find(node => ts.isVariableStatement(node)
  && [...node.declarationList.declarations].some(row => row.name.getText(corpus) === name));
const makeOrder = corpus.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'makeOrder');
const start = variable('mutations').getStart(corpus), end = variable('negatives').getStart(corpus);
const {sample, mutations} = new Function([variable('counts').getText(corpus), variable('structure').getText(corpus),
  makeOrder.getText(corpus), variable('sample').getText(corpus), corpusText.slice(start, end), 'return {sample,mutations};'].join('\n'))();
assert.equal(mutations.length + 6, 1174); assert.equal(packedGeneratedIdentityCase(sample).result, 'pass');
const guard = ts.createSourceFile('guard.mjs', read('scripts/upstream-generated-identity-evidence.mjs').toString(), ts.ScriptTarget.Latest, true);
const executable = guard.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(guard).replace(/^export /, '')).join('\n');
let helperCases = 0, semanticCases = 0, cliCases = 0, sourceCases = 0;
for (const sha of GENERATED_IDENTITY_SHAS) assert.equal(requiresGeneratedIdentity({sha}, {}), true);
assert.equal(requiresGeneratedIdentity({}, {proof_kind: GENERATED_IDENTITY_KIND}), true);
assert.equal(requiresGeneratedIdentity({}, {generated_identity_behavior: null}), true);
assert.equal(requiresGeneratedIdentity({}, {}), false); assert.equal(generatedIdentityRequirements('unknown'), null);
const escaped = generatedIdentityRequirements(GENERATED_IDENTITY_SHAS[0]); escaped.members.length = 0;
assert.ok(generatedIdentityRequirements(GENERATED_IDENTITY_SHAS[0]).members.length > 0);
for (const [index, sha] of GENERATED_IDENTITY_SHAS.entries()) {
  const entry = structuredClone(judgments.entries.find(row => row.sha === sha)), review = JSON.parse(judgments.writes.get(entry.evidence_report));
  entry.individual_proof.artifact_behavior = {source_members: entry.individual_proof.generated_identity_behavior.source_members};
  const f = createFixture(root, {entry, review}); delete f.entry.individual_proof.artifact_behavior;
  const selected = () => f.observation.cases.find(row => row.case_id === GENERATED_IDENTITY_CASE_ID);
  const assign = value => {Object.assign(selected(), packedGeneratedIdentityCase(value));
    f.observation.extra.harness.generatedIdentity = structuredClone(value);};
  assign(sample); f.save();
  const targets = [f.entry, f.request, f.run, f.report, f.observation], originals = targets.map(value => structuredClone(value));
  function reset(write = true) {for (const [i, target] of targets.entries()) {for (const key of Object.keys(target)) delete target[key]; Object.assign(target, structuredClone(originals[i]));} if (write) f.save();}
  const check = () => validateGeneratedIdentity({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request});
  function negative(name, mutate, pattern = /./, noSave = false) {reset(); mutate(); if (!noSave) f.save(); const result = check();
    assert.equal(result.ok, false, name); assert.match(result.detail, pattern, name); helperCases++;}
  try {
    assert.equal(check().ok, true, JSON.stringify(check())); helperCases++;
    const prerequisite = validatePackedConsumerRun({root: f.root, request: f.request}); assert.equal(prerequisite.ok, true);
    const memberCache = new Map(generatedIdentityRequirements(sha).members.map(path => [path, readEvidenceMember(f.root, path)]));
    // Run the actual whole reader body with the already-checked synthetic packed
    // prerequisite cached. Avoid thousands of redundant Git processes; the real
    // identity/run/path/hash validator is separately exercised below and by CLI.
    const cached = new Function('createHash', 'isDeepStrictEqual', 'readEvidenceMember', 'validatePackedConsumerRun',
      'GENERATED_IDENTITY_CASE_ID', 'packedGeneratedIdentityCase', executable + '\nreturn validateGeneratedIdentity;')(
      createHash, isDeepStrictEqual, (_root, path) => {assert.ok(memberCache.has(path)); return memberCache.get(path);},
      () => ({...prerequisite, observation: f.observation}), GENERATED_IDENTITY_CASE_ID, packedGeneratedIdentityCase);
    assert.equal(cached({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request}).ok, true);
    const chosen = index === 0 ? mutations : [
      value => {value.orders[0].nodes[0].resolution_count = 2;}, value => {value.orders[1].duplicate_id_snapshots.push('duplicate');},
      value => {value.orders[0].default_edges.find(row => row.name === 'menu-panel').exact_target = false;},
      value => {value.orders[1].snack_lifecycle[1].modal_owns = [];}, value => {value.orders[0].cleanup.retained_target_count = 1;},
    ];
    for (const mutate of chosen) {reset(false); const bad = structuredClone(sample); mutate(bad); assign(bad);
      // A coherent passing case label cannot hide the defective rich observation.
      selected().result = 'pass'; assert.equal(cached({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request}).ok, false); semanticCases++;}
    for (const absent of [undefined, null, true, [], {}, 'pass']) {reset(false); assign(absent); selected().result = 'pass';
      assert.equal(cached({root: f.root, entry: f.entry, proof: f.entry.individual_proof, request: f.request}).ok, false); semanticCases++;}
    negative('raw-selected-mismatch', () => {f.observation.extra.harness.generatedIdentity.orders.reverse();}, /DOM observations/);
    negative('partial-packed', () => {f.report.coverage = 'slice';}, /packed result/);
    negative('failed-child', () => {f.request.packedConsumerExecution.exit_code = 7;}, /packed invocation/);
    negative('missing-child', () => {delete f.request.packedConsumerExecution;}, /packed invocation/);
    negative('foreign-child', () => {f.request.packedConsumerExecution.invocation_id = 'foreign';}, /report subject/);
    negative('missing-observed-case', () => {f.observation.cases = f.observation.cases.filter(row => row.case_id !== GENERATED_IDENTITY_CASE_ID);}, /observed cases/);
    negative('marker-case', () => {selected().observation = null;}, /DOM observations/);
    negative('renamed-kind', () => {f.entry.individual_proof.proof_kind = 'ordinary-review';}, /unregistered/);
    negative('wrong-patch', () => {f.entry.individual_proof.diff_sha256 = '0'.repeat(64);}, /unregistered/);
    negative('foreign-sha', () => {f.entry.sha = 'a'.repeat(40);}, /unregistered/);
    negative('wrong-case', () => {f.entry.individual_proof.generated_identity_behavior.case_ids = ['unrelated'];}, /wrong .* scope/);
    negative('wrong-scope', () => {f.entry.individual_proof.generated_identity_behavior.kind = 'unrelated';}, /wrong .* scope/);
    negative('missing-source', () => {f.entry.individual_proof.generated_identity_behavior.source_members.pop();}, /source scope/);
    negative('duplicate-source', () => {f.entry.individual_proof.generated_identity_behavior.source_members[0] = f.entry.individual_proof.generated_identity_behavior.source_members[1];}, /source scope/);
    negative('stale-source', () => {f.entry.individual_proof.generated_identity_behavior.source_members[0].sha256 = '0'.repeat(64);}, /stale .* source member/);
    negative('foreign-run', () => {f.request.runId = 'foreign';}, /run binding/);
    negative('foreign-library', () => {f.report.artifacts.library.sha256 = '0'.repeat(64);}, /packed result/);
    negative('failed-case', () => {selected().result = 'fail';}, /observed cases/);
    negative('tampered-output', () => {f.runPut(f.relative, '{}');}, /bytes\/hash/, true);
    reset(); const output = join(f.runDir, f.relative); renameSync(output, output + '.saved'); symlinkSync(output + '.saved', output);
    assert.match(check().detail, /symlink/); helperCases++; unlinkSync(output); renameSync(output + '.saved', output);
    const out = join(f.runDir, 'evidence/upstream-audit-disposition/synthetic-upstream'); mkdirSync(out, {recursive: true});
    const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('RC_')));
    function cli(name, mutate, expected) {
      reset(); mutate?.(); f.save(); f.runPut('seed.json', {commits: [{sha}], fixture_only: true}); f.runPut('ledger.json', {entries: [f.entry], g11_claim: 'not-passed', fixture_only: true});
      const reportPath = join(f.runDir, name + '.json'), env = {...environment, RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: f.request.runId,
        RC_INVOCATION_ID: 'synthetic-upstream', RC_EVIDENCE_BINDING: JSON.stringify(f.request.binding), RC_ASSERTION_OUTPUT_DIR: out,
        RC_UPSTREAM_PACKED_CONSUMER: JSON.stringify(f.request.packedConsumerExecution ?? null)};
      const child = spawnSync(process.execPath, [join(f.root, 'scripts/check-upstream-audit-disposition.mjs'), '--admission', '--line', line,
        '--seed', join(f.runDir, 'seed.json'), '--ledger', join(f.runDir, 'ledger.json'), '--symbols', join(f.root, 'symbols.json'),
        '--current-symbols', join(f.root, 'current.json'), '--report', reportPath], {cwd: f.root, env, encoding: 'utf8', timeout: 30000});
      assert.ok([0, 1].includes(child.status), child.stderr); const result = JSON.parse(readFileSync(reportPath));
      assert.equal(child.status === 0, expected, name + ': ' + child.stderr + JSON.stringify(result.artifact_behavior_evidence));
      assert.equal(result.g11_claim, 'not-passed'); assert.equal(result.authored_use_review_evidence.insufficient, 0);
      if (expected) {assert.equal(result.artifact_behavior_evidence[0].invocation_id, f.request.packedConsumerExecution.invocation_id);
        const owned = JSON.parse(readFileSync(join(out, 'disposition-observations.json'))); assert.deepEqual(owned.artifact_behavior_evidence, result.artifact_behavior_evidence);}
      cliCases++;
    }
    cli('complete', null, true); cli('failed-child', () => {f.request.packedConsumerExecution.exit_code = 8;}, false);
    cli('missing-child', () => {delete f.request.packedConsumerExecution;}, false);
    cli('renamed-kind', () => {f.entry.individual_proof.proof_kind = 'ordinary-review';}, false);
    cli('relabeled-irrelevant', () => {f.entry.final_disposition = 'irrelevant'; f.entry.bucket = 'docs-only'; f.entry.subject = 'Synthetic documentation';
      f.entry.individual_proof.proof_kind = 'ordinary-review'; delete f.entry.individual_proof.generated_identity_behavior;}, false);
    cli('coherent-wrong-aria', () => {selected().observation.orders[0].default_edges[0].exact_target = false;
      f.observation.extra.harness.generatedIdentity = structuredClone(selected().observation);}, false);
    cli('coherent-lost-modal-owner', () => {selected().observation.orders[1].snack_lifecycle[1].modal_owns = [];
      f.observation.extra.harness.generatedIdentity = structuredClone(selected().observation);}, false);
    cli('full-marker', () => {selected().observation = null; f.observation.extra.harness.generatedIdentity = null;}, false);
  } finally {f.dispose();}
}
for (const [path, mutate] of [
  ['compatibility/rc/identity-source-admission-inputs.json', b => Buffer.concat([b, Buffer.from('\n')])],
  ['compatibility/rc/identity-source-admission-prior.json.gz', b => Buffer.concat([b, Buffer.from('defect')])],
  ['compatibility/rc/remaining-identity-938f478efdc96ef0de1217e806f98939beb027cd.diff', b => Buffer.concat([b, Buffer.from('\n')])],
  ['compatibility/f10/disposition-ledger/evidence/closeout-remaining-identity-generator-review.json', b => Buffer.concat([b, Buffer.from('\n')])],
  ['projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts', b => Buffer.concat([b, Buffer.from('\n')])],
  ['projects/ngx-material-legacy/legacy-snack-bar/snack-bar-container.html', b => Buffer.concat([b, Buffer.from('<!-- defect -->')])],
  ['scripts/check-upstream-audit-disposition.mjs', b => Buffer.from(b.toString().replace('if (requiresProgressCsp(entry, proof))', 'if (false)'))],
  ['tests/upstream/historical-behavior-admission.mjs', b => Buffer.from(b.toString().replace('assert.equal(namedCases, 7)', 'assert.equal(namedCases, 0)'))],
  ['tests/upstream/progress-csp-admission.mjs', b => Buffer.from(b.toString().replace('assert.equal(child.status === 0, expected', 'assert.equal(true, expected'))],
]) {
  const bytes = read(path), changed = mutate(bytes);
  assert.notDeepEqual(bytes, changed); assert.throws(() => inspectIdentitySourceJudgments({root, readMember: target => target === path ? changed : read(target)})); sourceCases++;
}
const output = {schema_version: 1, line, subjects: 3, full_packed_roster: 106, helper_controls: helperCases,
  cached_actual_reader_semantic_controls: semanticCases, actual_CLI_controls: cliCases, source_corruptions_rejected: sourceCases,
  complete_previous_checker_and_tests_recovered: true, actual_runtime_or_authored_use_closures: 0,
  prerequisite_and_runtime_results_synthetic: true, actual_packed_native_or_floor_qualified: false, g11_claim: 'not-passed'};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(output));

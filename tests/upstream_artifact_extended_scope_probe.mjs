/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real source judgments with synthetic runtime controls; no product execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync, spawnSync} from 'node:child_process';
import {ARTIFACT_BEHAVIOR_KIND, SELECT_FOCUS_SHA, SELECT_DETACH_SHA, SELECT_DETACH_PATCH,
  SELECT_DETACH_MEMBERS, TABLE_ONPUSH_SHA, TABLE_ONPUSH_PATCH, TABLE_ONPUSH_MEMBERS,
  requiresArtifactBehavior} from '../scripts/upstream-artifact-behavior-evidence.mjs';
import {createFixture} from './upstream/artifact-behavior-fixture.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), read = path => readFileSync(join(root, path));
const json = path => JSON.parse(read(path)), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ts = createRequire(import.meta.url)('typescript');
const line = json('projects/ngx-material-legacy/package.json').version.startsWith('21.') ? '21.x' : 'main';
const preimagePath = 'compatibility/rc/artifact-extended-focus-helper-preimage.mjs', preimage = read(preimagePath).toString();
assert.equal(preimage, execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show',
  json('compatibility/rc/artifact-extended-worksheet.json').source_parent + ':scripts/upstream-artifact-behavior-evidence.mjs'], {cwd: root, encoding: 'utf8'}));
// Compare the entire extracted validation and path/hash primitives, not snippets.
const before = preimage.slice(preimage.indexOf('    demand(object(request)'), preimage.indexOf('    const selected = observation.cases.find'));
const current = read('scripts/upstream-packed-run-evidence.mjs').toString();
const moved = current.slice(current.indexOf('    demand(object(request)'), current.indexOf('    return {ok: true, invocation_id: execution.invocation_id'));
assert.equal(moved, before.replace('expected.includes(SELECT_FOCUS_CLICK_CASE_ID)', 'expected.length > 0').replace(/\bmember\(/g, 'readEvidenceMember('));
const primitives = preimage.slice(preimage.indexOf('const hash ='), preimage.indexOf('/** Registered subjects'));
assert.equal(current.slice(current.indexOf('const hash ='), current.indexOf('/** Shared packed-run')),
  primitives.replace(/\bmember\(/g, 'readEvidenceMember(').replace('function readEvidenceMember(', 'export function readEvidenceMember('));
function focusPredicate(source) {
  const sf = ts.createSourceFile('helper.mjs', source, ts.ScriptTarget.Latest, true), found = [];
  assert.equal(sf.parseDiagnostics.length, 0);
  const visit = node => {
    if (ts.isCallExpression(node) && node.arguments[1]?.text === 'insufficient select focus/click observations') found.push(node.arguments[0].getText(sf));
    ts.forEachChild(node, visit);
  };
  visit(sf); assert.equal(found.length, 1); return found[0].replace(/\s/g, '');
}
assert.equal(focusPredicate(read('scripts/upstream-artifact-behavior-evidence.mjs').toString()),
  focusPredicate(preimage).replace('selected.legacy_harness_passed', 'selected?.legacy_harness_passed'));
const focusEntry = json('compatibility/f10/disposition-ledger/ledger.json').entries.find(row => row.sha === SELECT_FOCUS_SHA);
const focusReview = json(focusEntry.evidence_report), prior = focusReview.prior_source_judgment;
assert.equal(hash(read(prior.path)), prior.sha256); assert.equal(hash(read(preimagePath)), focusReview.admission_refactor_review.exact_before_helper.sha256);
assert.deepEqual(focusReview.reviewed_source_members, json(prior.path).reviewed_source_members);
assert.deepEqual(focusReview.hunk_reviews, json(prior.path).hunk_reviews); assert.equal(focusReview.semantic_pass, false);

// Reuse only known synthetic sample declarations from the original collector
// tests. They remain independent of the predicates being exercised here.
function sample(path, functionName) {
  const sf = ts.createSourceFile(path, read(path).toString(), ts.ScriptTarget.Latest, true);
  assert.equal(sf.parseDiagnostics.length, 0);
  const declarations = sf.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]).filter(node => node.name.getText(sf) === 'sample');
  assert.equal(declarations.length, 1);
  const helper = functionName ? sf.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === functionName) : [];
  assert.equal(helper.length, functionName ? 1 : 0);
  return new Function(helper.map(node => node.getText(sf)).join('\n') + '\nconst ' + declarations[0].getText(sf) + ';return sample;')();
}
const definitions = [
  {sha: SELECT_DETACH_SHA, patch: SELECT_DETACH_PATCH, patchPath: 'compatibility/rc/select-detach-upstream.diff',
    members: SELECT_DETACH_MEMBERS, kind: 'select-close-on-real-scroll-detach', caseId: 'packed-consumer/harness/select-close-on-real-scroll-detach',
    harness: 'selectScrollDetach', samplePath: 'tests/select_detach_packed_contract_probe.mjs', functionName: 'state', disposition: 'already-adapted'},
  {sha: TABLE_ONPUSH_SHA, patch: TABLE_ONPUSH_PATCH, patchPath: 'compatibility/rc/table-onpush-original.patch',
    members: TABLE_ONPUSH_MEMBERS, kind: 'table-no-data-row-on-push', caseId: 'packed-consumer/harness/table-no-data-row-on-push-rendering',
    harness: 'tableOnPushRendering', samplePath: 'tests/table_onpush_packed_contract_probe.mjs', disposition: 'inherited'},
];
const observations = []; let cases = 0;
for (const definition of definitions) {
  const actual = json('compatibility/f10/disposition-ledger/ledger.json').entries.find(row => row.sha === definition.sha);
  assert.equal(actual.final_disposition, definition.disposition);
  assert.equal(hash(read(definition.patchPath)), definition.patch); assert.equal(requiresArtifactBehavior(actual, {}), true);
  const entry = structuredClone(actual), proof = entry.individual_proof, review = json(entry.evidence_report);
  assert.equal(proof.proof_kind, ARTIFACT_BEHAVIOR_KIND); assert.equal(proof.diff_sha256, definition.patch);
  assert.deepEqual(proof.affected_branches, [line]); assert.equal(proof.artifact_behavior.kind, definition.kind);
  assert.deepEqual(proof.artifact_behavior.source_members.map(row => row.path), definition.members);
  assert.equal(review.status, 'reviewed'); assert.equal(review.judgment_stage, 'source-complete-runtime-required');
  assert.equal(review.runtime_qualification.required, true); assert.equal(review.runtime_qualification.qualified_by_this_document, false);
  assert.equal(review.semantic_pass, false); assert.equal(review.actual_packed_or_native_executed, false); assert.equal(review.g11_claim, 'not-passed');
  assert.equal(review.prior_entry.final_disposition, 'needs-individual-review');
  for (const record of [...review.independent_evidence, ...review.reviewed_source_members, review.prior_pending_record]) assert.equal(hash(read(record.path)), record.sha256, record.path);
  assert.ok(json(review.prior_pending_record.path).status.startsWith('pending'));
  const f = createFixture(root, {entry, review}), fixtureObservation = sample(definition.samplePath, definition.functionName);
  const selected = f.observation.cases.find(row => row.case_id === definition.caseId);
  selected.observation = fixtureObservation; f.observation.extra.harness[definition.harness] = structuredClone(fixtureObservation);
  const objects = [f.entry, f.request, f.run, f.report, f.observation], originals = objects.map(value => structuredClone(value));
  const reset = () => { for (const [index, target] of objects.entries()) {
    for (const key of Object.keys(target)) delete target[key]; Object.assign(target, structuredClone(originals[index]));
  } f.save(); };
  const environment = {...process.env, NODE_PATH: dirname(dirname(dirname(createRequire(import.meta.url).resolve('typescript'))))};
  for (const key of Object.keys(environment).filter(key => key.startsWith('RC_'))) delete environment[key];
  const invocation = 'extended-synthetic-runtime', outputDir = join(f.runDir, 'evidence/upstream-audit-disposition', invocation);
  mkdirSync(outputDir, {recursive: true});
  function run(name, mutate, expected, coordinator = true) {
    reset(); mutate?.(); f.save();
    f.runPut('seed.json', {commits: [{sha: f.entry.sha}], fixture_only: true});
    f.runPut('ledger.json', {entries: [f.entry], g11_claim: 'not-passed', fixture_only: true});
    const reportPath = join(f.runDir, name + '.json');
    const env = coordinator ? {...environment, RC_CHECK_ID: 'upstream-audit-disposition', RC_RUN_ID: f.request.runId,
      RC_INVOCATION_ID: invocation, RC_EVIDENCE_BINDING: JSON.stringify(f.request.binding), RC_ASSERTION_OUTPUT_DIR: outputDir,
      RC_UPSTREAM_PACKED_CONSUMER: JSON.stringify(f.request.packedConsumerExecution)} : environment;
    const child = spawnSync(process.execPath, [join(f.root, 'scripts/check-upstream-audit-disposition.mjs'), '--admission', '--line', line,
      '--seed', join(f.runDir, 'seed.json'), '--ledger', join(f.runDir, 'ledger.json'), '--symbols', join(f.root, 'symbols.json'),
      '--current-symbols', join(f.root, 'current.json'), '--report', reportPath], {cwd: f.root, env, encoding: 'utf8', timeout: 30000});
    assert.ok([0, 1].includes(child.status), child.stderr + String(child.error || ''));
    const report = JSON.parse(readFileSync(reportPath));
    assert.equal(child.status === 0, expected, definition.kind + ': ' + name + child.stderr + JSON.stringify(report.artifact_behavior_evidence));
    assert.equal(report.disposition_admission, expected ? 'pass' : 'incomplete'); assert.equal(report.g11_claim, 'not-passed');
    assert.equal(report.authored_use_inventory.expected, 1736); assert.equal(report.authored_use_review_evidence.insufficient, 0);
    assert.equal(report.current_authored_use_inventory.ready, true); cases++;
    observations.push({sha: definition.sha, name, exit_code: child.status, fixture_only: true});
  }
  try {
    run('complete', null, true);
    run('no-runtime', null, false, false);
    run('failed-prerequisite', () => f.request.packedConsumerExecution.exit_code = 7, false);
    run('stale-invocation', () => f.report.invocation_id = 'old-invocation', false);
    run('passing-slice', () => f.report.coverage = 'slice', false);
    run('omitted-roster-case', () => f.report.executed_case_ids.pop(), false);
    run('missing-structured-observation', () => delete f.observation.cases.find(row => row.case_id === definition.caseId).observation, false);
    run('rehashed-semantic-regression', () => {
      const value = f.observation.cases.find(row => row.case_id === definition.caseId).observation;
      if (definition.sha === SELECT_DETACH_SHA) value.generations[0].cycles[0].closed.panel_open = true;
      else value.transitions[1].colspan = '1';
      f.observation.extra.harness[definition.harness] = value;
    }, false);
    run('borrowed-raw-harness', () => f.observation.extra.harness[definition.harness] = {}, false);
    run('wrong-full-patch', () => f.entry.individual_proof.diff_sha256 = 'f'.repeat(64), false);
    run('borrowed-focus-case', () => f.entry.individual_proof.artifact_behavior.case_ids = ['packed-consumer/harness/legacy-select'], false);
    run('renamed-kind', () => f.entry.individual_proof.proof_kind = 'source-completed', false);
    run('other-registered-scope', () => f.entry.individual_proof.artifact_behavior.kind = 'select-focus-before-click', false);
    run('omitted-reviewed-source', () => f.entry.individual_proof.artifact_behavior.source_members.pop(), false);
    run('wrong-branch-review', () => f.entry.individual_proof.affected_branches = [line === 'main' ? '21.x' : 'main'], false);
    if (definition.sha === TABLE_ONPUSH_SHA) {
      run('wrong-installed-table-member', () => f.entry.individual_proof.installed_member.version = '16.2.14', false);
      run('wrong-public-delegation', () => f.entry.individual_proof.reachable_behavior.id = 'unrelated-assertion', false);
    }
  } finally { f.dispose(); }
}
const output = {schema_version: 1, line, role: 'Finite three-SHA admission using real source judgments and synthetic runtime controls only',
  actual_cli_cases: cases, new_scopes: definitions.length, complete_original_patches_bound: 2, complete_run_validation_text_preserved: true,
  complete_path_hash_primitives_preserved: true, focus_observation_predicate_preserved: true, existing_focus_hunk_judgment_unchanged: true,
  real_source_judgments_used: 2, real_runtime_judgments_closed: 0, actual_product_or_packed_or_native_qualified: false, g11_claim: 'not-passed', observations,
  producer_sha256: hash(read('tests/upstream_artifact_extended_scope_probe.mjs')),
  wrapper_sha256: hash(read('scripts/upstream-artifact-behavior-evidence.mjs')),
  shared_run_sha256: hash(read('scripts/upstream-packed-run-evidence.mjs')),
  shared_fixture_sha256: hash(read('tests/upstream/artifact-behavior-fixture.mjs'))};
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...output, observations: undefined}));

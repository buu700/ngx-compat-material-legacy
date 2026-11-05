/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Candidate fixture only; reused CSS rows and modeled artifact envelopes, no Sass. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {createCurrentSpinnerSnackContract, currentSpinnerSnackAssertionOk, SPINNER_SNACK_BRIDGE_CONTRACT} from '../scripts/current-sass-spinner-snack-contract.mjs';
const root = resolve(process.argv[2]); assert.ok(root.includes('ngx-current-sass-source-test-'));
const read = p => readFileSync(join(root, p)), hash = b => createHash('sha256').update(b).digest('hex');
const packet = JSON.parse(read('compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json'));
const version = JSON.parse(read('projects/ngx-material-legacy/package.json')).version, line = version.startsWith('21.') ? '21.x' : 'main';
const branch = packet.branches[line], rows = JSON.parse(read(branch.observation.path)).rows;
const catalog = JSON.parse(read(packet.catalog.path)), provenance = JSON.parse(read(packet.provenance.path)), lock = JSON.parse(read(packet.reference_lock.path));
let hook, target, trace;
const callback = p => {if (trace) trace.push(p); if (hook) {const action = hook; hook = null; action(p);} return p === target ? Buffer.from('wrong') : read(p);};
const context = createCurrentSpinnerSnackContract({root, read: callback});
const measured = css => ({css, css_sha256: hash(css), css_bytes: Buffer.byteLength(css)});
function model(row) {
  const plan = branch.cases.find(p => p.case_id === row.case_id), isDefault = row.case_id.startsWith('mixin-css/');
  const manifest = {run_id: 'modeled-current-direct-' + line, source: {line, commit: '2'.repeat(40), git_tree_sha: '3'.repeat(40), content_sha256: '4'.repeat(64)}, artifacts: [{id: 'library', sha256: '1'.repeat(64)}]};
  const binding = {run_id: manifest.run_id, source_line: line, source_commit: manifest.source.commit, source_tree: manifest.source.git_tree_sha, source_content_sha256: manifest.source.content_sha256, artifacts_sha256: hash(JSON.stringify([{id: 'library', sha256: '1'.repeat(64)}]))};
  const sourceKey = context.source_set_successors.find(s => s.historical_sha256 === plan.source_set_sha256).current_sha256;
  const original = {...measured(row.historical.css), program_sha256: plan.program_sha256, sources: [{root: 0, ...catalog.original_entry_identity}]};
  const actual = {...measured(row.current.css), program_sha256: plan.program_sha256, sources: context.source_sets[sourceKey]};
  const invocation = 'modeled-invocation', identity = {material_version: '16.2.14', material_manifest_sha256: provenance.isolated_environment.material_manifest_sha256, lock_sha256: packet.reference_lock.sha256, material_integrity: lock.packages['node_modules/@angular/material'].integrity, catalog: packet[isDefault ? 'oracle' : 'catalog'].path, catalog_sha256: packet[isDefault ? 'oracle' : 'catalog'].sha256, expected_source: 'untouched-installed-material16', candidate_source: 'packed-facade', sass_version: branch.compiler};
  return {context, body: {kind: 'assertion', check_id: 'sass-seal', group: 'sass-api-and-values', result: 'pass', exit_code: 0, line, run_id: manifest.run_id, invocation_id: invocation, binding: structuredClone(binding), mutation_rejected: true, error: null, case_id: row.case_id, mixin: plan.mixin, variant: plan.variant, call: plan.call, comparison: SPINNER_SNACK_BRIDGE_CONTRACT, tarball_sha256: manifest.artifacts[0].sha256, identity, current_spinner_snack_bridge: context.descriptor, expected: original, actual, mutation: measured(actual.css + '\n.wrong-nonempty-mixin { color: red; }\n')}, active: {manifest, binding}, invocation};
}
const checks = [], check = (name, fn) => {fn(); checks.push(name);};
check('private source context is not exposed', () => assert.equal(Object.hasOwn(context, 'source_context'), false));
for (const row of rows) check('modeled current-source assertion ' + row.case_id, () => assert.ok(currentSpinnerSnackAssertionOk(model(row))));
const authentic = () => model(rows[0]);
const mutants = {
  line: v => v.body.line = 'foreign', case: v => v.body.case_id = 'mixin-css/all-component-colors', call: v => v.body.call += ' ',
  compiler: v => v.body.identity.sass_version = 'foreign', current_compiler: v => v.body.actual.sass_version = 'foreign', current_line: v => v.body.actual.line = 'foreign',
  program: v => v.body.actual.program_sha256 = '0'.repeat(64), source: v => v.body.actual.sources[0].sha256 = '0'.repeat(64), missing_source: v => v.body.actual.sources.pop(), duplicate_source: v => v.body.actual.sources.push(v.body.actual.sources[0]),
  historical_source_set: v => v.body.actual.sources = structuredClone(branch.source_sets[branch.cases[0].source_set_sha256]),
  producer: v => v.body.current_spinner_snack_bridge.source_subject.sha256 = '0'.repeat(64), descriptor_module: v => v.body.current_spinner_snack_bridge.source_modules.pop(),
  run: v => v.body.run_id += 'wrong', invocation: v => v.body.invocation_id += 'wrong', library: v => v.body.tarball_sha256 = '0'.repeat(64), binding: v => v.body.binding.source_commit = '0'.repeat(40), active_source: v => v.active.manifest.source.commit = '0'.repeat(40), active_artifact: v => v.active.manifest.artifacts[0].sha256 = '0'.repeat(64),
  identity: v => v.body.identity.expected_source = 'candidate', css: v => v.body.actual.css += '\n.unrelated {}', mutation: v => delete v.body.mutation,
  approval_flag: v => v.body = {approved: true}, companion: v => v.body.current_companion = {},
};
for (const [name, mutate] of Object.entries(mutants)) {const v = authentic(); mutate(v); check('cold metadata rejects ' + name, () => assert.equal(currentSpinnerSnackAssertionOk(v), false));}
check('fake source context rejects', () => assert.equal(currentSpinnerSnackAssertionOk({...authentic(), context: {line, assertCurrent() {}}}), false));
let getters = 0;
for (const [name, change] of [
  ['nested getter', v => Object.defineProperty(v.body.identity, 'catalog', {get() {getters++; return packet.oracle.path;}, enumerable: true})],
  ['symbol', v => v.body[Symbol('bad')] = true], ['array prototype', v => Object.setPrototypeOf(v.body.actual.sources, {})],
  ['__proto__ data', v => Object.defineProperty(v.body, '__proto__', {value: {get trap() {getters++;}}, enumerable: true})],
]) {const v = authentic(); change(v); check('descriptor cold rejects ' + name, () => assert.equal(currentSpinnerSnackAssertionOk(v), false));}
for (const [name, action] of [
  ['body value', v => v.body.call = 'changed'],
  ['nested getter', v => Object.defineProperty(v.body.identity, 'catalog', {get() {getters++; return packet.oracle.path;}, enumerable: true})],
  ['outer body replacement', v => v.body = model(rows[1]).body],
  ['outer active replacement', v => v.active = structuredClone(v.active)],
]) {const v = authentic(); hook = () => action(v); check('late metadata rejects ' + name, () => assert.equal(currentSpinnerSnackAssertionOk(v), false));}
check('no metadata getters invoked', () => assert.equal(getters, 0));
for (const path of ['scripts/current-sass-spinner-snack-contract.mjs', packet.oracle.path, 'projects/ngx-material-legacy/styles/checkbox/_checkbox-theme.scss']) {
  check('cold callback rejects ' + path, () => assert.throws(() => createCurrentSpinnerSnackContract({root, read: p => p === path ? Buffer.from('wrong') : read(p)})));
  target = path; check('late callback rejects ' + path, () => assert.equal(currentSpinnerSnackAssertionOk(authentic()), false)); target = null;
}
check('exposed views cannot mutate private authority', () => {const descriptor = context.descriptor; descriptor.source_modules[0].sha256 = '0'.repeat(64); const sets = context.source_sets; sets[Object.keys(sets)[0]][0].sha256 = '0'.repeat(64); assert.ok(currentSpinnerSnackAssertionOk(authentic()));});
let finalCallbackCount = 0;
check('last direct-context callback cannot mutate an earlier fixture member', () => {
  const path = 'scripts/current-sass-spinner-snack-contract.mjs', file = join(root, path), before = read(path);
  trace = []; context.assertCurrent(); finalCallbackCount = trace.length; trace = null; let seen = 0;
  const action = () => {if (++seen < finalCallbackCount) {hook = action; return;} writeFileSync(file, Buffer.concat([before, Buffer.from('\n/* fixture mutation */\n')]));}; hook = action;
  try {assert.equal(currentSpinnerSnackAssertionOk(authentic()), false);} finally {writeFileSync(file, before); hook = null;}
  assert.equal(seen, finalCallbackCount);
});
check('authentic restoration passes', () => assert.ok(currentSpinnerSnackAssertionOk(authentic())));
const factoryArgs = {root, read: callback}; hook = () => factoryArgs.root += '/';
check('factory original argument replacement rejects', () => assert.throws(() => createCurrentSpinnerSnackContract(factoryArgs))); hook = null;
console.log(JSON.stringify({line, checks, descriptor: context.descriptor, source_set_successors: context.source_set_successors, current_source_set_keys: Object.keys(context.source_sets), reused_css_rows: rows.length, source_context_exposed: false, final_callback_count: finalCallbackCount, metadata_getter_calls: getters, fresh_compiles: 0, actual_packed_assertions: 0, candidate_fixture_only: true}));

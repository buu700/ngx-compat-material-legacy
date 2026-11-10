/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
/** Physical current-source continuation; historical assertions execute separately. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {componentConfigGraph} from './component-config-caller-contracts.mjs';
import {sourceRole} from './dialog-caller-config-source-rebinding.mjs';
import {prepareDialogCallerPublicSubjects} from './dialog-caller-public-subjects.mjs';

const BASE = 'compatibility/rc/dialog-caller-current-epoch/';
const MANIFEST_HASH = 'e19bd7ed7f4c440dca8fe5d83967d4c84a8de96064b3ba9b74330fe3d0fd5e71';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function inspectDialogCurrentOwner({root = process.cwd(), read = path => readFileSync(join(root, path))} = {}) {
  assert.equal(process.version, 'v24.21.0', 'current dialog proof requires the pinned workspace Node');
  const json = path => JSON.parse(read(path));
  const manifestBytes = read(BASE + 'input-manifest.json');
  assert.equal(hash(manifestBytes), MANIFEST_HASH, 'current dialog evidence manifest changed');
  const manifest = JSON.parse(manifestBytes);
  for (const member of manifest.members) assert.equal(hash(read(member.path)), member.sha256, 'current evidence input changed: ' + member.path);
  const priorBytes = read('compatibility/rc/dialog-caller-prior.json.gz');
  assert.equal(hash(priorBytes), '5dad16b56a21a7cc0fdcaba15c43a367a05c2d60f9710cae12cd7e74cdb3c03f');
  const prior = JSON.parse(gunzipSync(priorBytes));
  assert.equal(prior.line, 'main');
  const capture = json(BASE + 'current-graph.json');
  const graph = componentConfigGraph({root, selected: prior.selected, read});
  const facts = graph => [...graph.sources].map(([path, text]) => ({path, sha256: hash(text), bytes: Buffer.byteLength(text)}));
  assert.deepEqual(facts(graph), capture.members);
  assert.deepEqual(graph.metadata, capture.metadata);
  assert.deepEqual(graph.edges, capture.edges);
  assert.equal(graph.sources.size, 48);
  const overlayBytes = read('compatibility/rc/overlay-caller-contract-inputs.json');
  assert.equal(hash(overlayBytes), '5b0befd5297218443b2707fc15aebb722efdb36e3157561640284a40d5a4f069');
  const oldOverlay = JSON.parse(overlayBytes), overlayCapture = json(BASE + 'current-overlay-graph.json');
  const selected = oldOverlay.selected_sources.map(path => ({original_row: {file: path.slice('projects/ngx-material-legacy/'.length)}}));
  const overlay = componentConfigGraph({root, selected, read});
  assert.deepEqual(facts(overlay), overlayCapture.members);
  assert.deepEqual(overlay.metadata, overlayCapture.metadata);
  assert.deepEqual(overlay.edges, overlayCapture.edges);
  assert.equal(overlay.sources.size, 138);
  const strict = json(BASE + 'current-strict-diagnostic.json');
  assert.equal(strict.source_files, 50); assert.equal(strict.strict, true); assert.equal(strict.skipLibCheck, false);
  assert.deepEqual(strict.diagnostics, []); assert.deepEqual(strict.invalid_controls, [2322, 2322]);
  for (const member of strict.source_members) {const bytes = read(member.path); assert.equal(hash(bytes), member.sha256); assert.equal(bytes.length, member.bytes);}
  const roleCapture = json(BASE + 'current-roles-diagnostic.json');
  const ts = createRequire(join(root, 'scripts/dialog-caller-contracts.mjs'))('typescript');
  assert.equal(ts.version, '6.0.3');
  const files = new Map([...graph.sources].map(([path, text]) => [path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)]));
  const options = {noResolve:true, noLib:true, types:[], target:ts.ScriptTarget.ES2022, experimentalDecorators:true};
  const host = ts.createCompilerHost(options);
  host.getSourceFile = path => files.get(path.startsWith(root + '/') ? path.slice(root.length + 1) : path);
  const checker = ts.createProgram([...files.keys()], options, host).getTypeChecker();
  assert.deepEqual(roleCapture.sets.map(set => set.rows.length), [32, 45, 11]);
  for (const set of roleCapture.sets) for (const row of set.rows) {
    const [file, module, symbol] = row.key, source = files.get('projects/ngx-material-legacy/' + file);
    assert.ok(source && row.result.ok);
    assert.equal(hash(source.text), row.current_source_sha256);
    assert.deepEqual(sourceRole(source, checker, {file, module, symbol}), row.result.fact);
  }
  const eighteen = json(BASE + 'current-eighteen-binding.json');
  assert.equal(eighteen.facts.length, 18);
  assert.deepEqual(['peer','owned-class-replacement','retired-import','owned-local-type'].map(kind => eighteen.facts.filter(fact => fact.category === kind).length), [15,1,1,1]);
  const roleKey = row => JSON.stringify([row.file, row.module, row.symbol]);
  assert.deepEqual(eighteen.facts.map(roleKey), prior.selected.map(item => roleKey(item.original_row)));
  for (const fact of eighteen.facts) assert.equal(hash(read('projects/ngx-material-legacy/' + fact.file)), fact.source_sha256);
  const oldReviewBytes = read('compatibility/f10/authored-use-reviews/dialog-callers.json');
  assert.equal(hash(oldReviewBytes), '8306a8b5e23948206b20d2ca18c4a2d6782f6138f4f489177d0b90f2394e7075');
  const historicalReview = JSON.parse(oldReviewBytes);
  assert.equal(historicalReview.reviews.length, 18);
  const peer = json(BASE + 'current-impact-peer-types-diagnostic.json');
  assert.equal(peer.records.length, 88); assert.deepEqual(peer.unstable_current, []);
  assert.equal(peer.strict, true); assert.equal(peer.skipLibCheck, false); assert.equal(peer.diagnostics, 0);
  const inferred = json(BASE + 'current-inferred-dialog-ref-diagnostic.json');
  assert.equal(inferred.public_identity_exact, true); assert.deepEqual(inferred.used.map(item => item.member), ['componentRef', 'componentInstance']);
  const resources = json(BASE + 'resource-manifest-diagnostic.json');
  for (const record of resources.records) {
    const source = read(record.path); assert.equal(hash(source), record.source_sha256); assert.equal(source.length, record.source_bytes);
    for (const dependency of record.dependencies) {
    const path = dependency.kind === 'current-git' ? dependency.path : 'node_modules/@angular/cdk/' + dependency.path.split('/node_modules/@angular/cdk/').at(-1);
    const bytes = read(path); assert.equal(hash(bytes), dependency.sha256, 'resource dependency changed: ' + path); assert.equal(bytes.length, dependency.bytes);
  }
  }
  for (const [name, count, caseCounts] of [['current-config-runtime-diagnostic.json', 3, [1,1,13,13]], ['current-service-runtime-diagnostic.json', 2, [11,11,12,12]], ['resource-runtime-v3-diagnostic.json', 5, [27,27,27,27]]]) {
    const runtime = json(BASE + name);
    assert.equal(runtime.current_sources, 48); assert.equal(runtime.contexts.length, 4);
    assert.ok(runtime.contexts.every(context => context.status === 0));
    assert.deepEqual(runtime.contexts.map(context => [context.line,context.mode]), [['original','development'],['original','production'],['main','development'],['main','production']]);
    assert.deepEqual(runtime.contexts.map(context => context.result.cases.length), caseCounts);
    assert.deepEqual(runtime.source_members, capture.members.map(({path,sha256}) => ({path,sha256})));
    assert.equal(runtime.faults.length, count); assert.ok(runtime.faults.every(fault => fault.status !== 0 && fault.marker_seen && fault.rejected));
  }
  const subjects = prepareDialogCallerPublicSubjects(root);
  try {assert.ok(subjects.models.some(model => model.line === 'main'));} finally {subjects.dispose();}
  return {line:'main', current_source_files:48, overlay_source_files:138, source_roles:88,
    rows:prior.selected, historical_review:historicalReview, current_role_facts:eighteen.facts,
    historical_probes_executed:false, native_packed_AOT_or_full_floor_qualified:false};
}

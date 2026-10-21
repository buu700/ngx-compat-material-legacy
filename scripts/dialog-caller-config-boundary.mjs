/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact raw three-source boundary; historical evidence never substitutes for raw admission. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {qualifiedDialogConfigCandidateRuntime} from './dialog-caller-config-runtime-evidence.mjs';
import {componentConfigGraph} from './component-config-caller-contracts.mjs';
import {menuPanelOverlayTypeBridge} from './menu-panel-source-rebinding.mjs';
import {qualifiedDialogConfigOverlayTypes} from './dialog-caller-config-overlay-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root, path));
const proposalPath = 'compatibility/rc/dialog-caller-config-candidate.json';
const pins = {main: 'f41b9a5ff0a050a32ef1b29928439c9b4aab9b352d935b9fa1076a9f708df5a9',
  '21.x': '60da5e774a1be52328693c4bc0b56c462ee111457fa64879da6b3f8f8b710aea'};
export const DIALOG_CONFIG_RETIRED_ROLE = {file: 'legacy-dialog/internal/dialog-initial-focus.ts',
  module: '@angular/material/dialog', symbol: 'MatDialogConfig'};

export function inspectDialogConfigBoundary({root = process.cwd(), read = raw(root), requireApplied = false} = {}) {
  const bytes = read(proposalPath), line = Object.keys(pins).find(key => pins[key] === hash(bytes));
  assert.ok(line, 'changed dialog configuration proposal');
  const proposal = JSON.parse(bytes);
  assert.equal(proposal.line, line);
  assert.equal(proposal.members.length, 3);
  const before = new Map(), after = new Map(), phases = new Set();
  for (const member of proposal.members) {
    assert.equal(hash(member.before.text), member.before.sha256);
    assert.equal(hash(member.after.text), member.after.sha256);
    const digest = hash(read(member.path));
    assert.ok([member.before.sha256, member.after.sha256].includes(digest), 'unqualified raw dialog source ' + member.path);
    phases.add(digest === member.after.sha256 ? 'after' : 'before');
    before.set(member.path, Buffer.from(member.before.text));
    after.set(member.path, Buffer.from(member.after.text));
  }
  assert.equal(phases.size, 1, 'partially applied dialog configuration boundary');
  const applied = phases.has('after');
  if (requireApplied) assert.equal(applied, true, 'dialog configuration product is not applied');
  // This local, finite comparison input belongs only to immutable evidence.
  // It is not exported as a reader and cannot qualify a raw before-source frame.
  const evidenceRead = path => before.has(path) ? Buffer.from(before.get(path)) : read(path);
  const q = qualifiedDialogConfigCandidateRuntime({root, read: evidenceRead});
  assert.equal(q.source.prior.line, line);
  assert.deepEqual(q.candidate, proposal);
  const modelRead = path => after.has(path) ? Buffer.from(after.get(path)) : read(path);
  const graph = componentConfigGraph({root, selected: q.source.prior.selected, read: modelRead});
  assert.equal(graph.sources.size, 49);
  assert.deepEqual([...graph.sources].map(([path, text]) => ({path, sha256: hash(text), bytes: Buffer.byteLength(text)})),
    q.types.proof.candidate_source_members, 'current/proposed graph differs from the checked semantic model');
  if (applied) for (const member of q.types.proof.candidate_source_members) {
    assert.equal(hash(read(member.path)), member.sha256, 'changed raw applied semantic source ' + member.path);
  }
  const targets = proposal.members.map(member => ({path: member.path, before_sha256: member.before.sha256,
    sha256: member.after.sha256, bytes: member.after.bytes}));
  return {line, raw_product_applied: applied, targets, preimages: before,
    proposed_sources: graph.sources, routes: graph.routes, edges: graph.edges, metadata: graph.metadata,
    source: q.source, types: q.types, runtime: q, qualification: q.ref,
    scope: 'Exact three-source type/default/constructor/focus protocol boundary. Raw after hashes and the complete checked49-file model are mandatory for applied admission. Historical comparison inputs remain local to evidence verification.',
    actual_native_leaf_Component_factory_template_query_packed_AOT_or_full_floor_qualified: false};
}

/** Old overlay evidence retains its exact epoch; every actual affected source is covered anew. */
export function dialogConfigOverlayBridge({root = process.cwd(), read = raw(root), requireApplied = true} = {}) {
  const boundary = inspectDialogConfigBoundary({root, read, requireApplied});
  const historicalRead = path => boundary.preimages.has(path) ? Buffer.from(boundary.preimages.get(path)) : read(path);
  const previous = menuPanelOverlayTypeBridge({root, read: historicalRead, line: boundary.line});
  const capture = JSON.parse(read(previous.prior_capture.path));
  assert.equal(capture.sources.length, 145);
  const targets = new Map(boundary.targets.map(member => [member.path, member]));
  const modelRead = path => targets.has(path) ? Buffer.from(boundary.proposed_sources.get(path)) : read(path);
  const graph = componentConfigGraph({root, read: modelRead, selected: capture.selected_sources.map(path => ({
    original_row: {file: path.slice('projects/ngx-material-legacy/'.length)},
  }))});
  assert.equal(graph.sources.size, 145, 'unqualified new overlay dependency');
  assert.deepEqual([...graph.sources.keys()].sort(), capture.sources.map(member => member.path).sort());
  for (const member of capture.sources) {
    const expected = targets.get(member.path)?.sha256 ?? hash(historicalRead(member.path));
    assert.equal(hash(modelRead(member.path)), expected, 'unqualified current overlay source');
  }
  assert.deepEqual(graph.metadata.map(({bytes, ...route}) => route), capture.self_package_routes);
  for (const member of graph.metadata) assert.equal(read(member.path).length, member.bytes);
  const affected = new Set(targets.keys());
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of graph.edges) if (affected.has(edge.to) && !affected.has(edge.from)) {
      affected.add(edge.from); changed = true;
    }
  }
  const coverage = qualifiedDialogConfigOverlayTypes({line: boundary.line, read, boundary});
  assert.deepEqual(coverage.proof.metadata, graph.metadata.filter(member =>
    coverage.proof.metadata.some(other => other.specifier === member.specifier)));
  const covered = new Set(coverage.proof.candidate_source_members.map(member => member.path));
  for (const member of coverage.proof.candidate_source_members) assert.equal(hash(modelRead(member.path)), member.sha256,
    'changed actual covered dialog consumer ' + member.path);
  for (const path of affected) assert.ok(covered.has(path), 'current dialog consumer lacks fresh semantic coverage ' + path);
  return {line: boundary.line, prior_overlay_bridge: previous,
    current_dialog_type_qualification: boundary.types.ref, current_dialog_runtime_qualification: boundary.qualification,
    raw_product_applied: boundary.raw_product_applied, current_overlay_source_files: 145,
    affected_current_sources: [...affected].sort(), current_dialog_semantic_source_files: 51,
    additional_semantic_qualification: coverage.ref,
    all_affected_sources_in_fresh_semantic_program: true, new_owned_source_files: 0,
    actual_native_packed_AOT_or_full_floor_qualified: false};
}

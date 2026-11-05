/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current physical source identity. This module grants no CSS or artifact acceptance. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import {isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {composeCanonicalSourceGuards} from './canonical-source-guard-plan.mjs';

const SELF = 'scripts/current-sass-source.mjs';
const INPUTS = 'compatibility/rc/current-sass-source-inputs-v2.json';
const INPUTS_SHA = '46e1c8e8657880c1168010c8ec1b5967cbb4aa4c289a4d9b9ae29e3b2182b0a9';
const ADDITIONAL = [
  'projects/ngx-material-legacy/styles/checkbox/_checkbox-theme.scss',
  'projects/ngx-material-legacy/styles/button/_button-theme.scss',
  'projects/ngx-material-legacy/styles/card/_card-theme.scss',
];
const CARD = ADDITIONAL[2];
const image = readFileSync(fileURLToPath(import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const blobHash = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const bufferEquals = Buffer.prototype.equals;
const equalBytes = (actual, supplied) => Buffer.isBuffer(supplied) && Reflect.apply(bufferEquals, actual, [supplied]);
const reference = (path, bytes) => ({path, sha256: hash(bytes), bytes: bytes.length});
const planner = composeCanonicalSourceGuards;
const plannerFunctionImage = 'fecc474c121931506ce1f0f97e176886957f1504da46e74a085a068910ff9947';
const plannerReference = Object.freeze({path: 'scripts/canonical-source-guard-plan.mjs',
  sha256: '4f632a3fe97975804edf5b89c1cc5abadc002ef78fe16c3a40edbadde460fc9f', bytes: 4609});
const functionToString = Function.prototype.toString;

function safe(path) {
  assert.equal(typeof path, 'string');
  assert.ok(path && !isAbsolute(path) && !path.includes('\\') && !path.includes('\0'));
  assert.ok(path.split('/').every(part => part && part !== '.' && part !== '..'));
  return path;
}

function physical(root, path) {
  safe(path);
  const regular = (base, parts) => {
    let cursor = base;
    for (const part of parts) {
      cursor = join(cursor, part);
      assert.equal(lstatSync(cursor).isSymbolicLink(), false, 'linked source descendant ' + path);
    }
    assert.ok(lstatSync(cursor).isFile());
    return readFileSync(cursor);
  };
  const peer = /^node_modules\/(@angular\/(?:core|material|cdk)|sass)\/(.+)$/.exec(path);
  if (!peer) return regular(root, path.split('/'));
  const container = join(root, 'node_modules');
  assert.ok(lstatSync(container).isDirectory() && !lstatSync(container).isSymbolicLink());
  if (peer[1].startsWith('@angular/')) {
    const scope = join(container, '@angular');
    assert.ok(lstatSync(scope).isDirectory() && !lstatSync(scope).isSymbolicLink());
  }
  const base = realpathSync(join(container, peer[1]));
  assert.ok(lstatSync(base).isDirectory());
  if (peer[1] === 'sass') assert.ok(['package.json', 'sass.node.js', 'sass.dart.js'].includes(peer[2]));
  assert.equal(JSON.parse(regular(base, ['package.json'])).name, peer[1]);
  return regular(base, peer[2].split('/'));
}

function metadata(value) {
  assert.ok(value && typeof value === 'object' && !types.isProxy(value));
  assert.equal(Object.getPrototypeOf(value), Object.prototype);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const out = {};
  for (const key of ['path', 'sha256', 'bytes']) {
    const descriptor = descriptors[key];
    if (key === 'bytes' && !descriptor) continue;
    assert.ok(descriptor && Object.hasOwn(descriptor, 'value'), 'source reference accessor');
    out[key] = descriptor.value;
  }
  return out;
}

/** Read authenticated Git blobs as comparison data, never as current source. */
function historicalBlobs(root, source, profile) {
  assert.match(source.before_commit, /^[0-9a-f]{40}$/);
  assert.match(profile.source_parent, /^[0-9a-f]{40}$/);
  assert.deepEqual(profile.source_implementations.map(row => row.path), ['scripts/current-sass-source.mjs', 'scripts/current_sass_source.py']);
  const refs = [...source.modules.map(row => ({path: row.path, ...row.before})), ...source.unchanged_owned_sass_before_inputs,
    ...profile.source_implementations.map(row => ({...row, source_parent: profile.source_parent}))];
  assert.equal(new Set(refs.map(row => row.path)).size, refs.length);
  const env = {PATH: process.env.PATH, LANG: 'C', LC_ALL: 'C', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1'};
  const raw = execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'cat-file', '--batch'], {cwd: root, env, input: refs.map(row => (row.source_parent ?? source.before_commit) + ':' + safe(row.path)).join('\n') + '\n', maxBuffer: 16 * 1024 * 1024});
  const out = new Map();
  let cursor = 0;
  for (const row of refs) {
    const end = raw.indexOf(10, cursor);
    assert.ok(end > cursor);
    const [blob, kind, sizeText] = raw.subarray(cursor, end).toString().split(' ');
    const size = Number(sizeText), bytes = raw.subarray(end + 1, end + 1 + size);
    assert.equal(kind, 'blob');
    assert.ok(Number.isSafeInteger(size) && size >= 0);
    assert.equal(bytes.length, size);
    assert.equal(raw[end + 1 + size], 10);
    assert.equal(blob, row.blob);
    assert.equal(blobHash(bytes), blob);
    assert.equal(hash(bytes), row.sha256);
    assert.equal(size, row.bytes);
    out.set(row.path, Buffer.from(bytes));
    cursor = end + 2 + size;
  }
  assert.equal(cursor, raw.length);
  return out;
}

export function createCurrentSassSource({root = process.cwd(), read: providedRead} = {}) {
  root = resolve(root);
  assert.ok(lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink());
  assert.ok(providedRead === undefined || typeof providedRead === 'function');
  const bound = new Map();
  const assertPlanner = () => {
    assert.equal(composeCanonicalSourceGuards, planner);
    assert.equal(hash(Reflect.apply(functionToString, planner, [])), plannerFunctionImage);
    assert.deepEqual(reference(plannerReference.path, physical(root, plannerReference.path)), plannerReference,
      'changed current Sass guard planner');
  };
  // Authenticate executable policy before the first supplied callback.
  assertPlanner();
  const assertPhysical = () => {
    for (const row of bound.values()) assert.deepEqual(reference(row.path, physical(root, row.path)), row, 'changed final physical source ' + row.path);
  };
  const read = path => {
    const actual = physical(root, path);
    const row = reference(path, actual);
    if (bound.has(path)) assert.deepEqual(row, bound.get(path));
    else bound.set(path, row);
    if (providedRead !== undefined) assert.ok(equalBytes(actual, providedRead(path)), 'nonphysical current source ' + path);
    assert.ok(equalBytes(physical(root, path), actual), 'source changed during read ' + path);
    return actual;
  };
  const member = row => {
    const bytes = read(row.path);
    assert.equal(hash(bytes), row.sha256, 'changed current Sass source ' + row.path);
    assert.equal(bytes.length, row.bytes);
    return bytes;
  };
  member(plannerReference);
  assert.ok(equalBytes(read(SELF), image));
  const raw = read(INPUTS);
  assert.equal(hash(raw), INPUTS_SHA);
  const packet = JSON.parse(raw);
  assert.equal(packet.schema_version, 2);
  assert.deepEqual(packet.additional_modules.map(row => row.path), ADDITIONAL);
  assert.equal(packet.css_admission_granted, false);
  const priorProfile = packet.prior_four_module_profile;
  const priorPacket = JSON.parse(member(priorProfile.packet));
  assert.equal(priorPacket.schema_version, 1);
  assert.deepEqual(priorPacket.product_paths, packet.product_paths.slice(0, 4));
  assert.deepEqual(priorPacket.additional_modules, packet.additional_modules.slice(0, 2));
  assert.deepEqual(packet.historical_non_target_reclassified_as_target, [CARD]);
  const base = JSON.parse(member(packet.historical_source_packet));
  member(packet.historical_source_subject); // Authenticated data; the old constructor never runs.
  const css = JSON.parse(member(packet.historical_css_packet));
  for (const name of ['oracle', 'catalog', 'provenance', 'reference_lock']) member(css[name]);
  for (const row of css.compiler_inputs) member(row);
  member(packet.proposal);
  const protectedPacket = JSON.parse(member(packet.protected_input_packet));
  const census = JSON.parse(member(packet.style_template_census));
  const version = JSON.parse(read('projects/ngx-material-legacy/package.json')).version;
  const line = version.startsWith('21.') ? '21.x' : version.startsWith('22.') ? 'main' : null;
  assert.ok(line);
  const source = base.branches[line], branch = packet.branches[line];
  member(css.branches[line].observation);
  assert.equal(process.versions.node, '24.21.0');
  assert.deepEqual(branch.minimum_versions, source.minimum_versions);
  assert.equal(source.inputs.length, branch.historical_loaded_input_count);
  assert.equal(source.unchanged_owned_sass_before_inputs.length, branch.unchanged_owned_before_count);
  assert.deepEqual(branch.new_loaded_edges, []);
  assert.deepEqual(packet.product_paths, [...source.modules.map(row => row.path), ...ADDITIONAL]);
  assert.equal(branch.current_unchanged_owned_before_count, source.unchanged_owned_sass_before_inputs.length - ADDITIONAL.length);
  const historical = historicalBlobs(root, source, priorProfile.branches[line]);
  const changes = new Map(packet.additional_modules.map(row => [row.path, row]));
  for (const row of changes.values()) {
    const before = historical.get(row.path);
    assert.ok(before);
    assert.deepEqual(reference(row.path, before), row.before);
    const lines = before.toString().split(/(?<=\n)/);
    let cursor = 0, expected = '';
    for (const insertion of row.insertions) {
      assert.ok(Number.isSafeInteger(insertion.before_line) && insertion.before_line >= cursor && insertion.before_line <= lines.length);
      assert.equal(typeof insertion.text, 'string');
      assert.ok(insertion.text);
      expected += lines.slice(cursor, insertion.before_line).join('') + insertion.text;
      cursor = insertion.before_line;
    }
    expected += lines.slice(cursor).join('');
    assert.deepEqual(reference(row.path, Buffer.from(expected)), row.current);
    assert.ok(equalBytes(member(row.afterimage), Buffer.from(expected)));
  }
  for (const row of source.inputs) member(changes.get(row.path)?.current ?? row);
  member(source.semantic_receipt);
  for (const row of source.unchanged_owned_sass_before_inputs) {
    const actual = member(changes.get(row.path)?.current ?? row);
    if (!changes.has(row.path)) assert.ok(equalBytes(actual, historical.get(row.path)));
  }
  for (const row of protectedPacket.branches[line].protected_inputs) member(row);
  const graph = census.lines.find(row => row.line === line);
  assert.ok(graph);
  assert.equal(graph.non_target_owned_style_template_graph.length, graph.non_target_graph_count);
  assert.equal(graph.non_target_graph_count, branch.historical_non_target_graph_count);
  assert.equal(branch.current_non_target_graph_count, graph.non_target_graph_count - 1);
  assert.deepEqual(graph.non_target_owned_style_template_graph.filter(row => row.path === CARD), [changes.get(CARD).before]);
  for (const row of graph.non_target_owned_style_template_graph) member(row.path === CARD ? changes.get(CARD).current : row);
  const transitions = [...source.modules.map(row => ({path: row.path, before: row.before, current: row.current})),
    ...packet.additional_modules.map(row => ({path: row.path, before: row.before, current: row.current}))];
  for (const row of transitions) member(row.current);
  const sourceSets = {}, sourceSetSuccessors = [];
  for (const [historicalHash, rows] of Object.entries(css.branches[line].source_sets)) {
    assert.equal(hash(JSON.stringify(rows)), historicalHash);
    const current = rows.map(row => {
    const changed = row.root === 0 && changes.get('projects/ngx-material-legacy/' + row.path);
    return changed ? {...row, sha256: changed.current.sha256, bytes: changed.current.bytes} : {...row};
    });
    const currentHash = hash(JSON.stringify(current));
    sourceSets[currentHash] = current;
    sourceSetSuccessors.push({historical_sha256: historicalHash, current_sha256: currentHash});
  }
  let active = false;
  const idle = () => assert.equal(active, false, 'reentrant current Sass source');
  const phase = operation => () => {
    idle(); active = true;
    try { assertPlanner(); operation(); assertPlanner(); }
    finally { active = false; }
  };
  const guardNode = Object.freeze({dependencies: Object.freeze([]),
    preflight: phase(assertPhysical),
    consume: phase(() => {for (const row of bound.values()) member(row);}),
    final: phase(assertPhysical)});
  const composed = planner(Object.freeze([guardNode]));
  const assertCurrent = () => {idle(); composed();};
  const guardPlan = Object.freeze({assertCurrent, node: guardNode});
  const qualify = incoming => {
    idle();
    const original = metadata(incoming), row = transitions.find(row => row.path === original.path);
    if (!row) return null;
    const selected = [row.before, row.current].find(value => value.sha256 === original.sha256);
    assert.ok(selected, 'unknown owned source hash');
    if (Object.hasOwn(original, 'bytes')) assert.equal(original.bytes, selected.bytes);
    assertCurrent();
    assert.deepEqual(metadata(incoming), original, 'source reference mutated');
    const result = {path: row.path, sha256: row.current.sha256, ...(Object.hasOwn(original, 'bytes') ? {bytes: row.current.bytes} : {})};
    assertPhysical();
    return result;
  };
  const assertHistoricalSource = (path, expected) => {
    idle();
    const row = transitions.find(row => row.path === safe(path));
    assert.ok(row && (typeof expected === 'string' || Buffer.isBuffer(expected)));
    const copy = Buffer.from(expected);
    assert.ok(equalBytes(copy, historical.get(path)));
    assert.equal(hash(copy), row.before.sha256);
    assertCurrent();
    assert.ok(typeof expected === 'string' || equalBytes(copy, expected), 'historical comparison changed during source guards');
    assertPhysical();
    return {path, before_sha256: row.before.sha256, current_sha256: row.current.sha256, exact_historical_comparison: true, current_physical_source_guarded: true};
  };
  const result = {root, line, assertCurrent, guardNode, guardPlan, qualify, assertHistoricalSource, bound: structuredClone([...bound.values()]),
    transitions: structuredClone(transitions), source_sets: structuredClone(sourceSets), source_set_successors: structuredClone(sourceSetSuccessors),
    descriptor: structuredClone({source_subject: reference(SELF, image), source_packet: reference(INPUTS, raw), source_modules: transitions.map(row => row.current)}),
    source_scope_only: true, metadata_refs_qualified: 5, current_source_reads_are_physical: true,
    historical_source_bytes_exposed: false, historical_constructor_executed: false, fresh_sass_compilation_this_call: false,
    css_or_artifact_admission_granted: false, current_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed'};
  assertCurrent();
  return result;
}

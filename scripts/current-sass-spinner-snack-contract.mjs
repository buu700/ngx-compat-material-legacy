/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current source identity with the frozen direct15 CSS model. No compiler is invoked. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync} from 'node:fs';
import {isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual, types} from 'node:util';
import {createCurrentSassSource} from './current-sass-source.mjs';
import {SPINNER_SNACK_BRIDGE_CASES, SPINNER_SNACK_BRIDGE_CONTRACT, spinnerSnackBridgeResultsMatch} from './sass-spinner-snack-bridge-contract.mjs';

export {SPINNER_SNACK_BRIDGE_CASES, SPINNER_SNACK_BRIDGE_CONTRACT};
const SELF = 'scripts/current-sass-spinner-snack-contract.mjs';
const INPUTS = 'compatibility/rc/parallel-spinner-snack-css-contract-inputs-v1.json';
const SOURCE_INPUTS = 'compatibility/rc/current-sass-source-inputs-v2.json';
const PINS = [
  ['scripts/current-sass-source.mjs', 'eb96891168b146becaf5cbd9e437509a3e2371945e982fc58ca6b343cefb4160', 15564],
  [SOURCE_INPUTS, '46e1c8e8657880c1168010c8ec1b5967cbb4aa4c289a4d9b9ae29e3b2182b0a9', 20239],
  ['scripts/sass-spinner-snack-bridge-contract.mjs', '5fe7386872355fa2261856a64392433b29e332d40446c4c03a95db4a5d36ba46', 15205],
  [INPUTS, 'fd78f8c7f6e072fb7393c61aef782ccdf3a1c8d009227d08b29921ea2809e0a8', 237068],
];
const image = readFileSync(fileURLToPath(import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const functionText = Function.prototype.toString, bufferEquals = Buffer.prototype.equals;
const equalBytes = (a, b) => Buffer.isBuffer(b) && Reflect.apply(bufferEquals, a, [b]);
const states = new WeakMap();
const order = (a, b) => a.root - b.root || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const ref = (path, raw) => ({path, sha256: hash(raw), bytes: raw.length});

function safe(path) {
  assert.equal(typeof path, 'string');
  assert.ok(path && !isAbsolute(path) && !path.includes('\\') && !path.includes('\0') && path.split('/').every(p => p && p !== '.' && p !== '..'));
}
function physical(root, path) {
  safe(path);
  const regular = (base, parts) => {
    let cursor = base;
    for (const part of parts) {cursor = join(cursor, part); assert.equal(lstatSync(cursor).isSymbolicLink(), false);}
    assert.ok(lstatSync(cursor).isFile()); return readFileSync(cursor);
  };
  const peer = /^node_modules\/(@angular\/(?:core|material|cdk)|sass)\/(.+)$/.exec(path);
  if (!peer) return regular(root, path.split('/'));
  const container = join(root, 'node_modules');
  assert.ok(lstatSync(container).isDirectory() && !lstatSync(container).isSymbolicLink());
  if (peer[1].startsWith('@angular/')) assert.ok(lstatSync(join(container, '@angular')).isDirectory() && !lstatSync(join(container, '@angular')).isSymbolicLink());
  const base = realpathSync(join(container, peer[1])); assert.ok(lstatSync(base).isDirectory());
  if (peer[1] === 'sass') assert.ok(['package.json', 'sass.node.js', 'sass.dart.js'].includes(peer[2]));
  assert.equal(JSON.parse(regular(base, ['package.json'])).name, peer[1]);
  return regular(base, peer[2].split('/'));
}
/** Copy JSON without evaluating accessors, proxies, symbols or custom prototypes. */
function plain(value) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'number') {assert.ok(Number.isSafeInteger(value)); return value;}
  assert.ok(value && typeof value === 'object' && !types.isProxy(value));
  const array = Array.isArray(value); assert.equal(Object.getPrototypeOf(value), array ? Array.prototype : Object.prototype);
  const descriptors = Object.getOwnPropertyDescriptors(value), out = array ? [] : {};
  for (const key of Reflect.ownKeys(descriptors)) {
    assert.equal(typeof key, 'string'); if (array && key === 'length') continue;
    const d = descriptors[key]; assert.ok(Object.hasOwn(d, 'value') && d.enumerable);
    if (array) assert.match(key, /^(?:0|[1-9][0-9]*)$/);
    Object.defineProperty(out, key, {value: plain(d.value), enumerable: true, writable: true, configurable: true});
  }
  if (array) {assert.equal(out.length, descriptors.length.value); assert.equal(Object.keys(out).length, out.length);}
  return out;
}
function capture(args, allowed) {
  assert.ok(args && typeof args === 'object' && !types.isProxy(args)); assert.equal(Object.getPrototypeOf(args), Object.prototype);
  const descriptors = Object.getOwnPropertyDescriptors(args), values = {};
  for (const key of Reflect.ownKeys(descriptors)) {
    assert.equal(typeof key, 'string'); assert.ok(allowed.includes(key)); const d = descriptors[key];
    assert.ok(Object.hasOwn(d, 'value') && d.enumerable);
    Object.defineProperty(values, key, {value: d.value, enumerable: true});
  }
  return {args, allowed, descriptors, values};
}
function sameArgs(before) {
  const after = capture(before.args, before.allowed);
  assert.deepEqual(Reflect.ownKeys(after.descriptors), Reflect.ownKeys(before.descriptors));
  for (const key of Reflect.ownKeys(before.descriptors)) {
    assert.equal(after.descriptors[key].value, before.descriptors[key].value);
    for (const flag of ['enumerable', 'writable', 'configurable']) assert.equal(after.descriptors[key][flag], before.descriptors[key][flag]);
  }
}
function sourcesOk(rows) {
  assert.ok(Array.isArray(rows) && rows.length);
  for (const r of rows) {safe(r.path); assert.ok(Number.isSafeInteger(r.root) && [0, 1, 2].includes(r.root)); assert.match(r.sha256, /^[0-9a-f]{64}$/); assert.ok(Number.isSafeInteger(r.bytes) && r.bytes > 0);}
  assert.equal(new Set(rows.map(r => r.root + '\0' + r.path)).size, rows.length);
}
function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => canonical(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

export function createCurrentSpinnerSnackContract(args = {}) {
  const captured = capture(args, ['root', 'read']);
  const root = resolve(captured.values.root ?? process.cwd()), providedRead = captured.values.read;
  assert.ok(lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink()); assert.ok(providedRead === undefined || typeof providedRead === 'function');
  const bound = new Map();
  const read = path => {
    const raw = physical(root, path), current = ref(path, raw);
    if (bound.has(path)) assert.deepEqual(current, bound.get(path)); else bound.set(path, current);
    if (providedRead !== undefined) assert.ok(equalBytes(raw, providedRead(path)), 'nonphysical direct contract input ' + path);
    assert.ok(equalBytes(raw, physical(root, path)), 'input changed during callback ' + path); return raw;
  };
  const member = expected => {const raw = read(expected.path); assert.deepEqual(ref(expected.path, raw), expected); return raw;};
  const assertPhysical = () => {for (const expected of bound.values()) assert.deepEqual(ref(expected.path, physical(root, expected.path)), expected);};
  assert.ok(equalBytes(read(SELF), image)); for (const [path, sha256, bytes] of PINS) member({path, sha256, bytes});
  assert.equal(hash(Reflect.apply(functionText, spinnerSnackBridgeResultsMatch, [])), '3007197d9ad6a38056a79ea56cb375a3e44db830af95fa34e6d70c1bd2855538');
  const packet = JSON.parse(read(INPUTS)), currentPacket = JSON.parse(read(SOURCE_INPUTS));
  const source_context = createCurrentSassSource({root, read});
  const line = source_context.line, branch = packet.branches[line]; assert.ok(branch);
  for (const key of ['oracle', 'catalog', 'provenance', 'reference_lock', 'source_subject', 'source_packet']) member(packet[key]);
  for (const r of packet.compiler_inputs) member(r); member(branch.observation);
  const base = JSON.parse(read(packet.source_packet.path));
  const expectedDescriptor = {source_subject: {path: PINS[0][0], sha256: PINS[0][1], bytes: PINS[0][2]}, source_packet: {path: SOURCE_INPUTS, sha256: PINS[1][1], bytes: PINS[1][2]}, source_modules: [...base.branches[line].modules.map(r => r.current), ...currentPacket.additional_modules.map(r => r.current)]};
  assert.deepEqual(source_context.descriptor, expectedDescriptor);
  const oracle = JSON.parse(read(packet.oracle.path)), catalog = JSON.parse(read(packet.catalog.path)), provenance = JSON.parse(read(packet.provenance.path)), lock = JSON.parse(read(packet.reference_lock.path));
  assert.equal(branch.compiler, provenance.sass_info); assert.deepEqual(branch.cases.map(r => r.case_id), SPINNER_SNACK_BRIDGE_CASES);
  const successors = plain(source_context.source_set_successors), currentSets = plain(source_context.source_sets), transitions = new Map(source_context.transitions.map(r => [r.path, r.current]));
  assert.equal(successors.length, Object.keys(branch.source_sets).length);
  assert.equal(new Set(successors.map(r => r.historical_sha256)).size, successors.length);
  assert.equal(new Set(successors.map(r => r.current_sha256)).size, successors.length);
  assert.equal(Object.keys(currentSets).length, successors.length);
  const setKeys = new Map();
  for (const [historicalHash, rows] of Object.entries(branch.source_sets)) {
    assert.equal(hash(JSON.stringify(rows)), historicalHash);
    const expected = rows.map(r => {const current = r.root === 0 && transitions.get('projects/ngx-material-legacy/' + r.path); return current ? {...r, sha256: current.sha256, bytes: current.bytes} : {...r};});
    const currentHash = hash(JSON.stringify(expected)); assert.deepEqual(successors.find(r => r.historical_sha256 === historicalHash), {historical_sha256: historicalHash, current_sha256: currentHash});
    assert.deepEqual(currentSets[currentHash], expected); sourcesOk(expected); setKeys.set(historicalHash, currentHash);
    for (const r of expected) member({path: ['projects/ngx-material-legacy/', 'node_modules/@angular/material/', 'node_modules/@angular/cdk/'][r.root] + r.path, sha256: r.sha256, bytes: r.bytes});
  }
  for (const r of branch.cases) {
    const isDefault = r.case_id.startsWith('mixin-css/'), setup = isDefault ? oracle.standard_theme : catalog.setup;
    assert.equal(hash(setup), r.setup_sha256); assert.equal(hash("@use '__entry__' as m;\n" + setup + '\n' + r.call + '\n'), r.program_sha256);
    if (isDefault) assert.equal(oracle.members.mixins[r.mixin].invocation.css_sha256, r.original_sha256);
    else {const p = catalog.cases.find(p => p.case_id === r.case_id); assert.ok(p); assert.deepEqual({mixin: p.mixin, variant: p.variant, call: p.call}, {mixin: r.mixin, variant: r.variant, call: r.call});}
    assert.ok(setKeys.has(r.source_set_sha256));
  }
  const assertCurrent = () => {source_context.assertCurrent(); for (const r of [...bound.values()]) member(r); assertPhysical();};
  const descriptor = plain({contract: SPINNER_SNACK_BRIDGE_CONTRACT, source_line: line, ...expectedDescriptor, compiler_inputs: packet.compiler_inputs});
  const context = Object.freeze({root, line, assertCurrent, get bound() {return structuredClone([...bound.values()]);}, get descriptor() {return structuredClone(descriptor);}, get source_sets() {return structuredClone(currentSets);}, get source_set_successors() {return structuredClone(successors);}, source_scope_only: true, gate_or_artifact_admission_granted: false});
  states.set(context, {source_context, packet, line, branch, setKeys, currentSets, descriptor, oracle, catalog, provenance, lock, assertCurrent, assertPhysical});
  assertCurrent(); sameArgs(captured); assertPhysical(); return context;
}

export function currentSpinnerSnackAssertionOk(args = {}) {
  try {
    const captured = capture(args, ['context', 'body', 'active', 'invocation']), state = states.get(captured.values.context); assert.ok(state);
    const live = () => plain({body: captured.values.body, active: captured.values.active, invocation: captured.values.invocation});
    const snapshot = live(), b = snapshot.body, a = snapshot.active, invocation = snapshot.invocation;
    const row = state.branch.cases.find(r => r.case_id === b.case_id); assert.ok(row);
    const envelope = {kind: 'assertion', check_id: 'sass-seal', group: 'sass-api-and-values', result: 'pass', exit_code: 0, line: state.line, run_id: a.manifest.run_id, invocation_id: invocation, binding: a.binding, mutation_rejected: true, error: null};
    for (const [key, value] of Object.entries(envelope)) assert.deepEqual(b[key], value);
    assert.equal(a.binding.source_line, state.line); assert.equal(a.binding.run_id, a.manifest.run_id); assert.equal(a.manifest.source.line, state.line);
    for (const [key, name] of [['source_commit', 'commit'], ['source_tree', 'git_tree_sha'], ['source_content_sha256', 'content_sha256']]) {assert.equal(a.binding[key], a.manifest.source[name]); assert.match(a.binding[key], key === 'source_content_sha256' ? /^[0-9a-f]{64}$/ : /^[0-9a-f]{40}$/);}
    assert.equal(typeof a.manifest.run_id, 'string'); assert.ok(a.manifest.run_id); assert.equal(typeof invocation, 'string'); assert.ok(invocation);
    assert.equal(a.binding.artifacts_sha256, hash(canonical(a.manifest.artifacts)));
    const library = a.manifest.artifacts.filter(r => r.id === 'library'); assert.equal(library.length, 1); assert.match(library[0].sha256, /^[0-9a-f]{64}$/); assert.equal(b.tarball_sha256, library[0].sha256);
    assert.equal(b.comparison, SPINNER_SNACK_BRIDGE_CONTRACT); for (const key of ['call', 'mixin', 'variant']) assert.equal(b[key], row[key]);
    const isDefault = b.case_id.startsWith('mixin-css/'), packet = state.packet;
    assert.deepEqual(b.identity, {material_version: '16.2.14', material_manifest_sha256: state.provenance.isolated_environment.material_manifest_sha256, lock_sha256: packet.reference_lock.sha256, material_integrity: state.lock.packages['node_modules/@angular/material'].integrity, catalog: packet[isDefault ? 'oracle' : 'catalog'].path, catalog_sha256: packet[isDefault ? 'oracle' : 'catalog'].sha256, expected_source: 'untouched-installed-material16', candidate_source: 'packed-facade', sass_version: state.branch.compiler});
    assert.deepEqual(b.current_spinner_snack_bridge, state.descriptor);
    assert.equal(b.expected.program_sha256, row.program_sha256); assert.equal(b.actual.program_sha256, row.program_sha256);
    sourcesOk(b.expected.sources); assert.ok(b.expected.sources.every(r => r.root === 0)); assert.ok(b.expected.sources.some(r => isDeepStrictEqual(r, {root: 0, ...state.catalog.original_entry_identity})));
    sourcesOk(b.actual.sources); assert.deepEqual([...b.actual.sources].sort(order), state.currentSets[state.setKeys.get(row.source_set_sha256)]);
    if (Object.hasOwn(b.actual, 'line')) assert.equal(b.actual.line, state.line); if (Object.hasOwn(b.actual, 'sass_version')) assert.equal(b.actual.sass_version, state.branch.compiler);
    assert.ok(spinnerSnackBridgeResultsMatch({caseId: b.case_id, line: state.line, original: b.expected, actual: b.actual}));
    for (const key of ['current_companion', 'current_peer_alias', 'current_infrastructure']) assert.equal(Object.hasOwn(b, key), false);
    const wrong = b.actual.css + '\n.wrong-nonempty-mixin { color: red; }\n'; assert.deepEqual(b.mutation, {css: wrong, css_sha256: hash(wrong), css_bytes: Buffer.byteLength(wrong)});
    state.assertCurrent(); sameArgs(captured); assert.deepEqual(live(), snapshot, 'live assertion changed during source guards'); state.assertPhysical(); return true;
  } catch {return false;}
}

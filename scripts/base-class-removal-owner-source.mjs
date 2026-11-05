/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite physical 426/427 and 69/70 frames; comparison bytes are DATA only. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstatSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join, posix, resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import admission from './upstream-base-class-removal-admission.cjs';
import {readHistoricalContractRepairMember} from './historical-contract-repair-source.mjs';
import {applyBaseClassRemovalCanonicalStage, baseClassRemovalRegistrySuccessor,
  BASE_CLASS_REMOVAL_LEDGER, BASE_CLASS_REMOVAL_REGISTRY,
  BASE_CLASS_REMOVAL_OWNER_SOURCE_SHA256} from './base-class-removal-canonical-stage.mjs';

const SELF = 'scripts/base-class-removal-owner-source.mjs';
const STAGE = 'scripts/base-class-removal-canonical-stage.mjs';
const INPUTS = 'compatibility/rc/21x-base-class-removal-admission-owner-inputs-v1.json';
const INPUTS_SHA256 = '7c72a44224d6bd9f3eb141fdffb15d0f7ec11cb21b0f466500f10f12742e8e18';
const rootDefault = resolve(fileURLToPath(new URL('..', import.meta.url)));
const image = readFileSync(fileURLToPath(import.meta.url));
const hash = raw => createHash('sha256').update(raw).digest('hex');
const blob = raw => createHash('sha1').update('blob ' + raw.length + '\0').update(raw).digest('hex');
const functionToString = Function.prototype.toString;
const bufferIsBuffer = Buffer.isBuffer, bufferEquals = Buffer.prototype.equals;
const apply = Reflect.apply;
const loadedInspectSource = ownValue(admission, 'inspectSource');
function equalBuffers(actual, supplied) {
  return bufferIsBuffer(supplied) && apply(bufferEquals, actual, [supplied]);
}
function ownValue(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  assert.ok(descriptor && Object.hasOwn(descriptor, 'value'), 'non-data base-class metadata ' + key);
  return descriptor.value;
}
/** Callback-free check using the source owner's originally captured inspector. */
export function assertBaseClassRemovalSourceInspectorIdentity() {
  assert.equal(ownValue(admission, 'inspectSource'), loadedInspectSource, 'late loaded base-class source inspector change');
}
function physicalSweep(root, references, sourceMembers = false) {
  for (const ref of references) {
    const actual = sourceMembers ? readHistoricalContractRepairMember(root, ref.path) : physical(root, ref.path);
    assert.equal(hash(actual), ref.sha256, 'late base-class frame member (final physical sweep) ' + ref.path);
    assert.equal(actual.length, ref.bytes);
  }
}
const gitCache = new Map();

function physical(root, path) {
  assert.equal(resolve(root), rootDefault, 'foreign base-class source root');
  assert.equal(typeof path, 'string');
  assert.ok(path && !posix.isAbsolute(path) && posix.normalize(path) === path && !path.includes('\\')
    && path.split('/').every(part => part && !['.', '..', '.git'].includes(part)), 'invalid base-class source path');
  let cursor = root;
  assert.ok(lstatSync(cursor).isDirectory() && !lstatSync(cursor).isSymbolicLink());
  for (const part of path.split('/')) {
    cursor = join(cursor, part);
    assert.ok(!lstatSync(cursor).isSymbolicLink(), 'linked base-class source ' + path);
  }
  assert.ok(lstatSync(cursor).isFile(), 'non-file base-class source ' + path);
  return readFileSync(cursor);
}

function original(root, parent, ref) {
  assert.match(parent, /^[a-f0-9]{40}$/);
  const key = JSON.stringify([root, parent, ref.path]);
  if (!gitCache.has(key)) {
    const env = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
    for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
      'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[name];
    gitCache.set(key, execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
      'show', parent + ':' + ref.path], {cwd: root, env, maxBuffer: 8 * 1024 * 1024}));
  }
  const raw = Buffer.from(gitCache.get(key));
  assert.equal(hash(raw), ref.sha256); assert.equal(raw.length, ref.bytes);
  assert.equal(blob(raw), ref.git_blob, 'changed immutable base-class Git attribution');
  return raw;
}

function freeze(value) {
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Only actual physical callbacks are accepted. No historical-reader fallback. */
export function baseClassRemovalCanonicalFrameSubject({root = rootDefault, read = path => physical(root, path)} = {}) {
  assert.equal(resolve(root), rootDefault);
  const bound = new Map();
  const current = path => {
    const actual = physical(root, path), supplied = read(path);
    assert.ok(equalBuffers(actual, supplied), 'nonphysical base-class frame input ' + path);
    assert.ok(equalBuffers(actual, physical(root, path)), 'physical base-class input changed during callback ' + path);
    const ref = {path, sha256: hash(actual), bytes: actual.length}, before = bound.get(path);
    if (before) assert.deepEqual(ref, before, 'base-class frame changed during preparation ' + path);
    else bound.set(path, ref);
    return actual;
  };
  const member = ref => {
    const raw = current(ref.path);
    assert.equal(hash(raw), ref.sha256, 'changed base-class owner input ' + ref.path);
    assert.equal(raw.length, ref.bytes);
    return raw;
  };
  assert.equal(hash(image), BASE_CLASS_REMOVAL_OWNER_SOURCE_SHA256, 'loaded base-class leaf differs from stage pin');
  assert.ok(equalBuffers(current(SELF), image), 'loaded/current base-class leaf differs');
  const packetRaw = current(INPUTS);
  assert.equal(hash(packetRaw), INPUTS_SHA256, 'changed base-class owner packet');
  const packet = JSON.parse(packetRaw);
  assert.equal(packet.schema_version, 1); assert.equal(packet.line, '21.x');
  assert.equal(packet.source_scope_only, true); assert.equal(packet.canonical_changes_applied, false);
  assert.equal(packet.g11_claim, 'not-passed');
  assert.ok(JSON.parse(current('projects/ngx-material-legacy/package.json')).version.startsWith('21.'));
  const proposal = JSON.parse(member(packet.proposal));
  assert.equal(proposal.sha, admission.BASE_CLASS_REMOVAL_SHA);
  assert.equal(proposal.canonical_ledger_applied, false); assert.equal(proposal.canonical_registry_applied, false);
  assert.equal(proposal.canonical_admission_granted, false); assert.equal(proposal.full_owner_integration_qualified, false);
  const body = JSON.parse(member(proposal.review));
  member(proposal.handler);
  const oldStage = original(root, packet.source_parent, packet.stage_before);
  assert.deepEqual(proposal.stage, {path: STAGE, sha256: packet.stage_before.sha256, bytes: packet.stage_before.bytes});
  const marker = '__BASE_OWNER_IMAGE_SHA256__';
  assert.equal(packet.stage_extension_template.split(marker).length, 2, 'ambiguous exact owner extension');
  const extension = packet.stage_extension_template.replace(marker, hash(image));
  assert.ok(equalBuffers(current(STAGE), Buffer.concat([oldStage, Buffer.from(extension)])), 'changed pure stage or owner extension');
  for (const [fn, name] of [[baseClassRemovalRegistrySuccessor, 'baseClassRemovalRegistrySuccessor'],
    [applyBaseClassRemovalCanonicalStage, 'applyBaseClassRemovalCanonicalStage']]) {
    assert.equal(hash(functionToString.call(fn)), packet.pure_function_sha256[name], 'loaded pure base-class function changed');
  }
  const decode = (compressed, plain) => {
    const raw = gunzipSync(member(compressed));
    assert.equal(hash(raw), plain.sha256); assert.equal(raw.length, plain.bytes);
    return raw;
  };
  const before = decode(proposal.ledger_before_image, proposal.before);
  const after = decode(proposal.ledger_after_image, proposal.after);
  const registryBefore = decode(proposal.registry_before_image, proposal.registry_before);
  const registryAfter = decode(proposal.registry_after_image, proposal.registry_after);
  assert.ok(equalBuffers(original(root, packet.source_parent, packet.ledger_before), before));
  assert.ok(equalBuffers(original(root, packet.source_parent, packet.registry_before), registryBefore));
  const stage = applyBaseClassRemovalCanonicalStage({before, body});
  assert.ok(equalBuffers(after, stage.after), 'base-class ledger after-image is not the exact proposal');
  assert.ok(equalBuffers(registryAfter, baseClassRemovalRegistrySuccessor(registryBefore)), 'base-class registry after-image is not the exact proposal');
  const actualLedger = current(BASE_CLASS_REMOVAL_LEDGER), actualRegistry = current(BASE_CLASS_REMOVAL_REGISTRY);
  assert.ok(equalBuffers(before, actualLedger) || equalBuffers(after, actualLedger), 'unknown physical base-class ledger frame');
  assert.ok(equalBuffers(registryBefore, actualRegistry) || equalBuffers(registryAfter, actualRegistry), 'unknown physical base-class registry frame');
  const applied = equalBuffers(after, actualLedger) && equalBuffers(registryAfter, actualRegistry);
  assert.ok(!equalBuffers(after, actualLedger) || applied, 'base-class ledger427 requires registry70');
  const registryApplied = equalBuffers(registryAfter, actualRegistry);
  const precursor = !applied;
  const assertCurrent = () => {
    for (const ref of bound.values()) {
      const actual = physical(root, ref.path), supplied = read(ref.path);
      assert.equal(hash(actual), ref.sha256, 'late base-class frame member ' + ref.path);
      assert.equal(actual.length, ref.bytes);
      assert.ok(equalBuffers(actual, supplied), 'late nonphysical base-class frame ' + ref.path);
      assert.ok(equalBuffers(actual, physical(root, ref.path)), 'physical base-class frame changed during callback ' + ref.path);
    }
    physicalSweep(root, bound.values());
  };
  const registrySubject = () => {
    assertCurrent();
    return {raw: Buffer.from(actualRegistry), comparison: Buffer.from(registryBefore),
      reference: {...bound.get(BASE_CLASS_REMOVAL_REGISTRY)}};
  };
  const ledgerSubject = () => {
    assertCurrent();
    return {raw: Buffer.from(actualLedger), comparison: Buffer.from(before),
      reference: {...bound.get(BASE_CLASS_REMOVAL_LEDGER)}};
  };
  const predecessorData = (path, raw) => {
    assert.ok(Buffer.isBuffer(raw)); assertCurrent();
    return Buffer.from(path === BASE_CLASS_REMOVAL_REGISTRY && equalBuffers(registryAfter, raw) ? registryBefore : raw);
  };
  const ownsReference = ref => ref?.path === BASE_CLASS_REMOVAL_REGISTRY
    && [registryBefore, registryAfter].some(raw => ref.sha256 === hash(raw) && (ref.bytes === undefined || ref.bytes === raw.length));
  const predecessorReference = ref => {
    assertCurrent();
    if (ref.path !== BASE_CLASS_REMOVAL_REGISTRY) return {...ref};
    assert.ok(ownsReference(ref), 'unknown base-class registry reference');
    return {...ref, sha256: hash(registryBefore), ...(ref.bytes === undefined ? {} : {bytes: registryBefore.length})};
  };
  const qualifyReference = ref => {
    assertCurrent();
    if (ref.path !== BASE_CLASS_REMOVAL_REGISTRY) return {...ref};
    assert.ok(ownsReference(ref), 'unknown base-class registry reference');
    return {...ref, ...registrySubject().reference};
  };
  const comparisonBytes = ref => {
    assertCurrent(); assert.ok(ownsReference(ref), 'foreign base-class comparison reference');
    return Buffer.from(ref.sha256 === hash(registryAfter) ? registryAfter : registryBefore);
  };
  assertCurrent();
  return {packet: freeze(structuredClone(packet)), proposal: freeze(structuredClone(proposal)), body: freeze(structuredClone(body)),
    stage: {...stage, before: Buffer.from(before), after: Buffer.from(after), entries: freeze(structuredClone(stage.entries))},
    registryBefore: Buffer.from(registryBefore), registryAfter: Buffer.from(registryAfter),
    applied, registryApplied, precursor, registrySubject, ledgerSubject, predecessorData,
    ownsReference, predecessorReference, qualifyReference, comparisonBytes,
    bound: structuredClone([...bound.values()]), assertCurrent,
    source_scope_only: true, canonical_frame_admission_granted: false,
    current_native_packed_browser_floor_or_full_audit_qualified: false};
}

/** Re-executes the immutable source contract on actual bytes; no cached receipt. */
export function baseClassRemovalOwnerSourceSubject({root = rootDefault, read = path => physical(root, path)} = {}) {
  const frames = baseClassRemovalCanonicalFrameSubject({root, read});
  const body = structuredClone(frames.body), entry = structuredClone(frames.stage.entries[0]);
  const checkedRead = path => {
    const actual = readHistoricalContractRepairMember(root, path), supplied = read(path);
    assert.ok(equalBuffers(actual, supplied), 'nonphysical base-class owner source input ' + path);
    assert.ok(equalBuffers(actual, readHistoricalContractRepairMember(root, path)), 'physical base-class owner source changed during callback ' + path);
    return actual;
  };
  const request = {root, read: checkedRead, entry, body, review: body, proof: entry.individual_proof};
  assert.equal(ownValue(admission, 'inspectSource'), loadedInspectSource, 'changed loaded base-class source inspector');
  assert.equal(hash(functionToString.call(loadedInspectSource)), frames.packet.inspect_source_function_sha256, 'unauthenticated loaded base-class source inspector');
  const source = loadedInspectSource(request);
  const sourceGuard = ownValue(source, 'assertCurrent'), frameGuard = ownValue(frames, 'assertCurrent');
  const bound = new Map(frames.bound.map(ref => [ref.path, {...ref}]));
  for (const ref of source.bound) {
    const before = bound.get(ref.path);
    if (before) assert.deepEqual(ref, before);
    bound.set(ref.path, {...ref});
  }
  const intended = structuredClone({entry, body, proof: request.proof});
  const assertMetadata = () => {
    assert.deepEqual({entry: ownValue(request, 'entry'), body: ownValue(request, 'body'), proof: ownValue(request, 'proof')},
      intended, 'changed base-class owner source metadata');
    assert.equal(ownValue(admission, 'inspectSource'), loadedInspectSource, 'late loaded base-class source inspector change');
    assert.equal(ownValue(source, 'assertCurrent'), sourceGuard, 'changed base-class source guard');
    assert.equal(ownValue(frames, 'assertCurrent'), frameGuard, 'changed base-class frame guard');
  };
  const assertCurrent = () => {
    assertMetadata();
    frameGuard(); sourceGuard(); frameGuard();
    physicalSweep(root, bound.values(), true);
    assertMetadata();
  };
  assertCurrent();
  return {frames, body: freeze(structuredClone(body)), entry: freeze(structuredClone(entry)), proof: freeze(structuredClone(request.proof)),
    stage: {...frames.stage, before: Buffer.from(frames.stage.before), after: Buffer.from(frames.stage.after),
      entries: freeze(structuredClone(frames.stage.entries))},
    registryBefore: Buffer.from(frames.registryBefore), registryAfter: Buffer.from(frames.registryAfter),
    source, bound: structuredClone([...bound.values()]), assertCurrent,
    source_scope_only: true, canonical_admission_granted: false,
    current_native_packed_browser_floor_or_full_audit_qualified: false};
}

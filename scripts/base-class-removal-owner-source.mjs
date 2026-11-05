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
import {composeCanonicalSourceGuards} from './canonical-source-guard-plan.mjs';
import {applyBaseClassRemovalCanonicalStage, baseClassRemovalRegistrySuccessor,
  BASE_CLASS_REMOVAL_LEDGER, BASE_CLASS_REMOVAL_REGISTRY,
  BASE_CLASS_REMOVAL_OWNER_SOURCE_SHA256} from './base-class-removal-canonical-stage.mjs';

const SELF = 'scripts/base-class-removal-owner-source.mjs';
const STAGE = 'scripts/base-class-removal-canonical-stage.mjs';
const INPUTS = 'compatibility/rc/21x-base-class-removal-admission-owner-inputs-v1.json';
const INPUTS_SHA256 = '7c72a44224d6bd9f3eb141fdffb15d0f7ec11cb21b0f466500f10f12742e8e18';
const GUARD_PLAN = Object.freeze({path: 'scripts/canonical-source-guard-plan.mjs',
  sha256: '4f632a3fe97975804edf5b89c1cc5abadc002ef78fe16c3a40edbadde460fc9f', bytes: 4609});
const STAGE_TRANSITION = Object.freeze({path: 'compatibility/rc/21x-base-class-owner-guard-plan-transition-v3.json',
  sha256: '879dd05cc50b934d8cfe2a7bfa816ce598ad9cb172272ca7b5dfa2f5087feb71', bytes: 1655});
const ADMISSION_TRANSITION = Object.freeze({path: 'compatibility/rc/parent-base-admission-current-source-successor-v1.json',
  sha256: 'f9fc32edb6e1ede3cf647eba6da1901d31a4df6d687dc9aa41139f3ebcfd090e', bytes: 20020});
const INSPECT_SOURCE_FUNCTION_SHA256 = '789c9016cd5e598f420d6fbde1fef078d2f38779b3db3a0ac4fa7a85d733a047';
const GUARD_PLAN_FUNCTION_SHA256 = 'fecc474c121931506ce1f0f97e176886957f1504da46e74a085a068910ff9947';
const rootDefault = resolve(fileURLToPath(new URL('..', import.meta.url)));
const image = readFileSync(fileURLToPath(import.meta.url));
const hash = raw => createHash('sha256').update(raw).digest('hex');
const blob = raw => createHash('sha1').update('blob ' + raw.length + '\0').update(raw).digest('hex');
const functionToString = Function.prototype.toString;
const loadedComposeCanonicalSourceGuards = composeCanonicalSourceGuards;
const bufferIsBuffer = Buffer.isBuffer, bufferEquals = Buffer.prototype.equals;
const apply = Reflect.apply;
const loadedInspectSource = ownValue(admission, 'inspectSource');
const loadedMetadataOk = ownValue(admission, 'metadataOk');
const loadedSourceReferences = ownValue(admission, 'loadedSourceReferences');
const loadedProducerFunctionSha256 = ownValue(admission, 'loadedProducerFunctionSha256');
const METADATA_OK_FUNCTION_SHA256 = 'e8974460da41d90caef069888729fac5696ee47ed81f17d193d74bdbabe36485';
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
  assert.equal(ownValue(admission, 'loadedSourceReferences'), loadedSourceReferences, 'late loaded base-class image references change');
  assert.equal(ownValue(admission, 'loadedProducerFunctionSha256'), loadedProducerFunctionSha256, 'late loaded base-class producer references change');
  assert.equal(ownValue(admission, 'inspectSource'), loadedInspectSource, 'late loaded base-class source inspector change');
  assert.equal(hash(functionToString.call(loadedInspectSource)), INSPECT_SOURCE_FUNCTION_SHA256,
    'unauthenticated loaded base-class source inspector');
  assert.equal(ownValue(admission, 'metadataOk'), loadedMetadataOk, 'late loaded base-class metadata predicate change');
  assert.equal(hash(functionToString.call(loadedMetadataOk)), METADATA_OK_FUNCTION_SHA256,
    'unauthenticated loaded base-class metadata predicate');
}
function assertGuardPlanIdentity() {
  assert.equal(composeCanonicalSourceGuards, loadedComposeCanonicalSourceGuards, 'changed loaded canonical source guard planner');
  assert.equal(hash(functionToString.call(loadedComposeCanonicalSourceGuards)), GUARD_PLAN_FUNCTION_SHA256,
    'unauthenticated loaded canonical source guard planner');
}
function assertGuardPlanPhysical(root) {
  const raw = physical(root, GUARD_PLAN.path);
  assert.equal(hash(raw), GUARD_PLAN.sha256, 'changed canonical source guard planner');
  assert.equal(raw.length, GUARD_PLAN.bytes);
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

// Independently pinned transition DATA connects the historical v6 proof to
// current executable files. Reconstruct immutable Git DATA; never execute it
// or supply it to a current-file reader. All checks precede caller callbacks.
function admissionTransitionPhysical(root) {
  assertBaseClassRemovalSourceInspectorIdentity();
  const raw = physical(root, ADMISSION_TRANSITION.path);
  assert.equal(hash(raw), ADMISSION_TRANSITION.sha256, 'changed base-class admission transition');
  assert.equal(raw.length, ADMISSION_TRANSITION.bytes);
  const transition = JSON.parse(raw);
  // These captured references describe actual module-load images and function
  // text. Restoring disk after import cannot reattribute an older executable.
  for (const [name, captured, expected] of [
    ['loadedSourceReferences', loadedSourceReferences, transition.loaded_source_references],
    ['loadedProducerFunctionSha256', loadedProducerFunctionSha256, transition.loaded_producer_function_sha256],
  ]) {
    assert.equal(ownValue(admission, name), captured, 'changed loaded base-class identity data');
    assert.ok(Array.isArray(captured) && Object.isFrozen(captured), 'mutable loaded base-class identity data');
    assert.equal(captured.length, expected.length, 'changed loaded base-class identity population');
    for (let index = 0; index < expected.length; index++) {
      const actual = ownValue(captured, String(index));
      assert.ok(Object.isFrozen(actual), 'mutable loaded base-class member identity');
      assert.deepEqual(Reflect.ownKeys(actual).sort(), Object.keys(expected[index]).sort());
      for (const key of Object.keys(expected[index])) {
        assert.equal(ownValue(actual, key), expected[index][key], 'unauthenticated loaded base-class ' + name);
      }
    }
  }
  for (const ref of transition.loaded_source_references) {
    const actual = physical(root, ref.path);
    assert.equal(hash(actual), ref.sha256, 'changed loaded base-class producer file ' + ref.path);
    assert.equal(actual.length, ref.bytes);
  }
  assert.equal(transition.schema_version, 1);
  assert.equal(transition.role, 'base-class-admission-current-source-successor');
  assert.equal(transition.line, '21.x');
  assert.equal(transition.source_parent, 'd8ab97315b6c77b83f42c2bebcf63b2984fff255');
  assert.equal(transition.source_scope_only, true);
  assert.equal(transition.historical_programs_executed, false);
  assert.equal(transition.canonical_changes_applied, false);
  assert.equal(transition.g11_claim, 'not-passed');
  assert.deepEqual(transition.historical_owner_inputs, {path: INPUTS, sha256: INPUTS_SHA256, bytes: 7115});
  assert.deepEqual(transition.inspect_source_function_sha256, {
    before: 'a51ba5f5ab6574b638906895aea1ff462fc120f84ad0a1a4333d8066f19fb389',
    after: INSPECT_SOURCE_FUNCTION_SHA256,
  });
  assert.deepEqual(transition.code_transitions.map(row => row.path), [
    'scripts/upstream-base-class-removal-admission.cjs', 'scripts/upstream-base-class-removal-source.mjs',
    'compatibility/rc/21x-base-class-removal-source-final-review.mjs', 'scripts/historical-contract-repair-source.mjs',
  ]);
  for (const row of transition.code_transitions) {
    assert.equal(row.before.path, row.path); assert.equal(row.after.path, row.path);
    const before = original(root, transition.source_parent, row.before);
    let cursor = 0;
    const parts = [];
    for (const edit of row.edits) {
      assert.deepEqual(Object.keys(edit).sort(), ['after', 'before', 'offset']);
      assert.ok(Number.isSafeInteger(edit.offset) && edit.offset >= cursor && edit.offset <= before.length);
      assert.equal(typeof edit.before, 'string'); assert.equal(typeof edit.after, 'string');
      const old = Buffer.from(edit.before);
      assert.ok(equalBuffers(before.subarray(edit.offset, edit.offset + old.length), old), 'changed admission literal preimage');
      parts.push(before.subarray(cursor, edit.offset), Buffer.from(edit.after));
      cursor = edit.offset + old.length;
    }
    const after = Buffer.concat([...parts, before.subarray(cursor)]);
    assert.equal(hash(after), row.after.sha256); assert.equal(after.length, row.after.bytes);
    assert.ok(equalBuffers(after, physical(root, row.path)), 'changed current base-class admission source ' + row.path);
  }
  return transition;
}

/** Only actual physical callbacks are accepted. No historical-reader fallback. */
export function baseClassRemovalCanonicalFrameSubject({root = rootDefault, read = path => physical(root, path)} = {}) {
  assert.equal(resolve(root), rootDefault);
  // Reject a poisoned planner before any supplied read callback can restore it.
  assertGuardPlanIdentity();
  assertGuardPlanPhysical(root);
  const admissionTransition = admissionTransitionPhysical(root);
  const transitionPhysical = physical(root, STAGE_TRANSITION.path);
  assert.equal(hash(transitionPhysical), STAGE_TRANSITION.sha256, 'changed base-class guard-plan transition');
  assert.equal(transitionPhysical.length, STAGE_TRANSITION.bytes);
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
  member(GUARD_PLAN);
  member(ADMISSION_TRANSITION);
  for (const ref of admissionTransition.loaded_source_references) member(ref);
  const transition = JSON.parse(member(STAGE_TRANSITION));
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
  assert.deepEqual(packet.proposal, admissionTransition.historical_proposal);
  assert.equal(packet.source_parent, admissionTransition.source_parent);
  assert.equal(packet.inspect_source_function_sha256, admissionTransition.inspect_source_function_sha256.before);
  assert.equal(proposal.sha, admission.BASE_CLASS_REMOVAL_SHA);
  assert.equal(proposal.canonical_ledger_applied, false); assert.equal(proposal.canonical_registry_applied, false);
  assert.equal(proposal.canonical_admission_granted, false); assert.equal(proposal.full_owner_integration_qualified, false);
  const body = JSON.parse(member(proposal.review));
  const historicalHandler = admissionTransition.code_transitions[0].before;
  assert.deepEqual(proposal.handler, {path: historicalHandler.path, sha256: historicalHandler.sha256, bytes: historicalHandler.bytes});
  for (const row of admissionTransition.code_transitions.slice(1)) {
    const ref = row.before;
    assert.deepEqual(body.source_inputs.find(member => member.path === ref.path),
      {path: ref.path, sha256: ref.sha256, bytes: ref.bytes});
  }
  const oldStage = original(root, packet.source_parent, packet.stage_before);
  assert.deepEqual(proposal.stage, {path: STAGE, sha256: packet.stage_before.sha256, bytes: packet.stage_before.bytes});
  const marker = '__BASE_OWNER_IMAGE_SHA256__';
  assert.equal(packet.stage_extension_template.split(marker).length, 2, 'ambiguous exact owner extension');
  const edits = [
    {old: '  const assertCurrent = () => owner.assertCurrent();\n',
      new: '  const assertCurrent = owner.assertCurrent;\n', occurrences: 1},
    {old: '    metadataRead, wrapPrepared, bound: structuredClone([...bound.values()]), assertCurrent,\n',
      new: '    metadataRead, wrapPrepared, bound: structuredClone([...bound.values()]), assertCurrent, guardPlan: owner.guardPlan,\n', occurrences: 1},
    {old: "    frames.assertCurrent();\n    const current = read(path);\n    assert.ok(ownerEqual(frames.ledgerSubject().raw, current), 'late base-class private ledger input');\n",
      new: "    const current = frames.ledgerSubject().raw;\n", occurrences: 1},
  ];
  assert.deepEqual(transition, {
    schema_version: 1, line: '21.x', role: 'base-class-owner-guard-plan-stage-extension-transition',
    prior_owner_inputs: {path: INPUTS, sha256: INPUTS_SHA256, bytes: 7115}, stage_path: STAGE,
    old_extension_template: {sha256: '4659fbd1372b1e7076a9ad241089490188954170f85c06664338c13f34051808', bytes: 5167},
    literal_edits: edits,
    new_extension_template: {sha256: 'be19ac791457306b4e6a5d46ea0b49f241e82e8055e993fab49ecf84935ba229', bytes: 5071},
    owner_image_marker: marker, owner_image_marker_occurrences: 1,
    pure_functions_changed: false, source_scope_only: true, canonical_changes_applied: false, g11_claim: 'not-passed',
  });
  let template = packet.stage_extension_template;
  assert.equal(hash(Buffer.from(template)), transition.old_extension_template.sha256);
  assert.equal(Buffer.byteLength(template), transition.old_extension_template.bytes);
  for (const {old, new: replacement, occurrences} of edits) {
    assert.equal(template.split(old).length, occurrences + 1, 'ambiguous guard-plan template edit');
    template = template.replace(old, replacement);
  }
  assert.equal(hash(Buffer.from(template)), transition.new_extension_template.sha256);
  assert.equal(Buffer.byteLength(template), transition.new_extension_template.bytes);
  assert.equal(template.split(marker).length, 2, 'ambiguous new owner extension');
  const extension = template.replace(marker, hash(image));
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
  // The full frame and narrow ledger operation share one callback lifetime.
  // A dependency node can be run by another owner's scheduler, so protect the
  // consume predicate itself as well as the direct full-guard entry.
  let frameConsuming = false;
  const consumeFrame = operation => {
    assert.equal(frameConsuming, false, 'reentrant base-class frame consumption');
    frameConsuming = true;
    try { return operation(); } finally { frameConsuming = false; }
  };
  const assertFramePhysical = () => { assertGuardPlanIdentity(); physicalSweep(root, bound.values()); };
  const guardNode = Object.freeze({
    dependencies: Object.freeze([]),
    preflight: () => {
      assert.equal(frameConsuming, false, 'reentrant base-class frame preflight');
      assertFramePhysical();
    },
    consume: () => { consumeFrame(() => {
      for (const ref of bound.values()) {
        const actual = physical(root, ref.path), supplied = read(ref.path);
        assert.equal(hash(actual), ref.sha256, 'late base-class frame member ' + ref.path);
        assert.equal(actual.length, ref.bytes);
        assert.ok(equalBuffers(actual, supplied), 'late nonphysical base-class frame ' + ref.path);
        assert.ok(equalBuffers(actual, physical(root, ref.path)), 'physical base-class frame changed during callback ' + ref.path);
      }
    }); },
    final: () => { physicalSweep(root, bound.values()); assertGuardPlanIdentity(); },
  });
  const composedFrameGuard = loadedComposeCanonicalSourceGuards(Object.freeze([guardNode]));
  const assertCurrent = () => {
    assert.equal(frameConsuming, false, 'reentrant base-class full frame');
    composedFrameGuard();
  };
  const registrySubject = () => {
    assertCurrent();
    return {raw: Buffer.from(actualRegistry), comparison: Buffer.from(registryBefore),
      reference: {...bound.get(BASE_CLASS_REMOVAL_REGISTRY)}};
  };
  const ledgerSubject = () => consumeFrame(() => {
    // This operation consumes only the ledger. Other frame members still have
    // full callback-free cold/final checks against their captured judgments.
    assertFramePhysical();
    const actual = physical(root, BASE_CLASS_REMOVAL_LEDGER), supplied = read(BASE_CLASS_REMOVAL_LEDGER);
    assert.ok(equalBuffers(actualLedger, actual), 'late base-class ledger subject');
    assert.ok(equalBuffers(actual, supplied), 'nonphysical base-class ledger subject');
    assert.ok(equalBuffers(actual, physical(root, BASE_CLASS_REMOVAL_LEDGER)), 'base-class ledger changed during callback');
    guardNode.final();
    return {raw: Buffer.from(actual), comparison: Buffer.from(before),
      reference: {...bound.get(BASE_CLASS_REMOVAL_LEDGER)}};
  });
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
    bound: structuredClone([...bound.values()]), guardNode, assertCurrent,
    inspectSourceFunctionSha256: admissionTransition.inspect_source_function_sha256.after,
    source_scope_only: true, canonical_frame_admission_granted: false,
    current_native_packed_browser_floor_or_full_audit_qualified: false};
}

/** Fresh factual qualification plus owned frame/source guard operations. */
export function baseClassRemovalOwnerSourceSubject({root = rootDefault, read = path => readHistoricalContractRepairMember(root, path)} = {}) {
  assertBaseClassRemovalSourceInspectorIdentity();
  const frames = baseClassRemovalCanonicalFrameSubject({root, read});
  const body = structuredClone(frames.body), entry = structuredClone(frames.stage.entries[0]);
  // The current inspector freshly computes every original fact on physical
  // bytes. Its private repair references are also inserted into its source
  // bound. Capture that complete judgment set before any further caller read.
  // Supplied-reader validation belongs to the real source operation below;
  // no source bytes, parsed program or successful verdict are retained here.
  const request = {root, entry, body, review: body, proof: entry.individual_proof};
  assert.equal(ownValue(admission, 'inspectSource'), loadedInspectSource, 'changed loaded base-class source inspector');
  assert.equal(hash(functionToString.call(loadedInspectSource)), frames.inspectSourceFunctionSha256, 'unauthenticated loaded base-class source inspector');
  const physicalSource = loadedInspectSource(request);
  const physicalSourceGuard = ownValue(physicalSource, 'assertCurrent');
  const sourceReferences = ownValue(physicalSource, 'bound');
  assert.ok(Array.isArray(sourceReferences));
  const sourceBound = new Map();
  for (const value of sourceReferences) {
    assert.deepEqual(Reflect.ownKeys(value).sort(), ['bytes', 'path', 'sha256']);
    const ref = {path: ownValue(value, 'path'), sha256: ownValue(value, 'sha256'), bytes: ownValue(value, 'bytes')};
    assert.equal(typeof ref.path, 'string'); assert.match(ref.sha256, /^[0-9a-f]{64}$/);
    assert.ok(Number.isSafeInteger(ref.bytes) && ref.bytes >= 0);
    assert.equal(sourceBound.has(ref.path), false, 'duplicate base-class source judgment');
    sourceBound.set(ref.path, Object.freeze(ref));
  }
  assert.ok(sourceBound.size > 0);
  const frameGuard = ownValue(frames, 'assertCurrent');
  const frameGuardNode = ownValue(frames, 'guardNode');
  const bound = new Map(frames.bound.map(ref => [ref.path, {...ref}]));
  for (const ref of sourceBound.values()) {
    const before = bound.get(ref.path);
    if (before) assert.deepEqual(ref, before);
    bound.set(ref.path, {...ref});
  }
  const metadata = () => {
    const liveEntry = ownValue(request, 'entry'), proof = ownValue(request, 'proof');
    return {entry: liveEntry, body: ownValue(request, 'body'), review: ownValue(request, 'review'),
      proof: proof === undefined ? ownValue(liveEntry, 'individual_proof') : proof};
  };
  const intended = structuredClone(metadata());
  const assertSourceMetadata = () => {
    assert.equal(resolve(ownValue(request, 'root') ?? rootDefault), rootDefault);
    assertBaseClassRemovalSourceInspectorIdentity();
    assert.equal(loadedMetadataOk(metadata()), true, 'changed live base-class owner metadata');
    assert.deepEqual(metadata(), intended, 'changed base-class owner source metadata');
    assert.equal(ownValue(physicalSource, 'assertCurrent'), physicalSourceGuard, 'changed private base-class source guard');
    assert.equal(ownValue(source, 'assertCurrent'), sourceGuard, 'changed base-class source guard');
    assertGuardPlanIdentity(); assertGuardPlanPhysical(root);
  };
  let sourceConsuming = false;
  const assertSourceIdle = () => assert.equal(sourceConsuming, false, 'reentrant base-class source consumption');
  const sourceNode = Object.freeze({
    dependencies: Object.freeze([]),
    preflight: () => { assertSourceIdle(); assertSourceMetadata(); physicalSweep(root, sourceBound.values(), true); },
    consume: () => {
      assertSourceIdle(); sourceConsuming = true;
      try {
        for (const ref of sourceBound.values()) {
          const actual = readHistoricalContractRepairMember(root, ref.path);
          assert.equal(hash(actual), ref.sha256, 'late base-class owner source input ' + ref.path);
          assert.equal(actual.length, ref.bytes);
          const supplied = read(ref.path);
          assert.ok(equalBuffers(actual, supplied), 'nonphysical base-class owner source input ' + ref.path);
          assert.ok(equalBuffers(actual, readHistoricalContractRepairMember(root, ref.path)),
            'base-class owner source changed during callback ' + ref.path);
        }
      } finally { sourceConsuming = false; }
    },
    final: () => { physicalSweep(root, sourceBound.values(), true); assertSourceMetadata(); },
  });
  const composedSourceGuard = loadedComposeCanonicalSourceGuards(Object.freeze([sourceNode]));
  const sourceGuard = () => { assertSourceIdle(); composedSourceGuard(); };
  // This facade intentionally owns its standalone guard. It preserves the
  // factual data shape without exposing the weaker physical-only CJS guard.
  const source = {bound: structuredClone([...sourceBound.values()]),
    historical_canonical_context: structuredClone(ownValue(physicalSource, 'historical_canonical_context')),
    assertCurrent: sourceGuard, facts: structuredClone(ownValue(physicalSource, 'facts'))};
  const assertMetadata = () => {
    assertSourceMetadata();
    assert.equal(ownValue(frames, 'assertCurrent'), frameGuard, 'changed base-class frame guard');
    assert.equal(ownValue(frames, 'guardNode'), frameGuardNode, 'changed base-class frame guard node');
  };
  const guardNode = Object.freeze({
    dependencies: Object.freeze([frameGuardNode, sourceNode]),
    preflight: assertMetadata,
    consume: () => {},
    final: assertMetadata,
  });
  const composedOwnerGuard = loadedComposeCanonicalSourceGuards(Object.freeze([guardNode]));
  const assertCurrent = () => { assertSourceIdle(); composedOwnerGuard(); };
  const guardPlan = Object.freeze({assertCurrent, node: guardNode});
  assertCurrent();
  return {frames, body: freeze(structuredClone(body)), entry: freeze(structuredClone(entry)), proof: freeze(structuredClone(request.proof)),
    stage: {...frames.stage, before: Buffer.from(frames.stage.before), after: Buffer.from(frames.stage.after),
      entries: freeze(structuredClone(frames.stage.entries))},
    registryBefore: Buffer.from(frames.registryBefore), registryAfter: Buffer.from(frames.registryAfter),
    source, bound: structuredClone([...bound.values()]), guardNode, guardPlan, assertCurrent,
    source_scope_only: true, canonical_admission_granted: false,
    current_native_packed_browser_floor_or_full_audit_qualified: false};
}

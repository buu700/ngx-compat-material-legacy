/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Focused source/metadata controls and unapplied proposal; no native/full-owner work. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire, syncBuiltinESMExports} from 'node:module';
import {resolve} from 'node:path';
import {gunzipSync, gzipSync} from 'node:zlib';
import admission from '../scripts/upstream-base-class-removal-admission.cjs';
import {applyBaseClassRemovalCanonicalStage, baseClassRemovalRegistrySuccessor,
  BASE_CLASS_REMOVAL_LEDGER as LEDGER, BASE_CLASS_REMOVAL_REGISTRY as REGISTRY} from '../scripts/base-class-removal-canonical-stage.mjs';

assert.equal(process.versions.node, '24.21.0');
// Optional process isolation preserves every control while bounding wall time.
// The original no-argument and report-writing interfaces remain unchanged.
const phase = process.argv[2] === '--phase' ? process.argv[3] : null;
const phases = ['metadata-cold', 'metadata-late', 'physical-cold', 'physical-late', 'projection'];
if (phase !== null) assert.ok(process.argv.length === 4 && phases.includes(phase), 'unknown admission test phase');
const inPhase = (...values) => phase === null || values.includes(phase);
const finishPhase = details => { console.log(JSON.stringify({result: 'pass', phase, ...details,
  full_owner_integration_qualified: false, actual_native_packed_browser_floor_or_full_audit_qualified: false})); };

const root = process.cwd(), hash = raw => createHash('sha256').update(raw).digest('hex');
const physicalRead = fs.readFileSync, read = path => physicalRead(resolve(root, path));
const body = JSON.parse(read(admission.BASE_CLASS_REMOVAL_REVIEW));
const imageStem = 'compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v2';
const physicalLedger = read(LEDGER), physicalRegistry = read(REGISTRY);
const before = gunzipSync(read(imageStem + '-ledger-before.json.gz'));
const registryBefore = gunzipSync(read(imageStem + '-registry-before.mjs.gz'));
const stage = applyBaseClassRemovalCanonicalStage({before, body}), registryAfter = baseClassRemovalRegistrySuccessor(registryBefore);
assert.ok(physicalLedger.equals(before) || physicalLedger.equals(stage.after));
assert.ok(physicalRegistry.equals(registryBefore) || physicalRegistry.equals(registryAfter));
if (physicalLedger.equals(stage.after)) assert.ok(physicalRegistry.equals(registryAfter));
const entry = stage.entries[0], args = {root, entry, body, review: body, proof: entry.individual_proof};
const finalPath = 'compatibility/rc/21x-base-class-removal-source-final-review-qualified.json';
const finalBefore = read(finalPath), originalBody = structuredClone(body);

// Metadata and the byte-preserving proposal are pure even when reads are denied.
fs.readFileSync = () => { throw Error('unexpected metadata filesystem read'); }; syncBuiltinESMExports();
try {
  assert.equal(admission.metadataOk(args), true);
  assert.ok(applyBaseClassRemovalCanonicalStage({before, body}).after.equals(stage.after));
  assert.ok(baseClassRemovalRegistrySuccessor(registryBefore).equals(registryAfter));
} finally { fs.readFileSync = physicalRead; syncBuiltinESMExports(); }

const metadataControls = {
  'missing-proof': x => delete x.entry.individual_proof,
  'missing-scope': x => delete x.proof[admission.BASE_CLASS_REMOVAL_SCOPE_KEY],
  'wrong-kind': x => x.proof.proof_kind = 'individual-unrecognized',
  'wrong-sha': x => x.entry.sha = '0'.repeat(40),
  'wrong-branch': x => x.entry.affected_branches = ['main'],
  'wrong-disposition': x => x.entry.final_disposition = 'irrelevant',
  'wrong-read-note': x => x.entry.read_note_disposition = 'docs-only',
  'wrong-seed-path': x => x.entry.files.pop(),
  'wrong-reason': x => x.entry.reason += ' Changed.',
  'wrong-entry-provenance': x => x.entry.source_inventory = 'other.json',
  'wrong-review-status': x => x.body.status = 'pending',
  'wrong-review-body': x => x.review.original_hunks = 328,
  'wrong-review-ref': x => x.proof[admission.BASE_CLASS_REMOVAL_SCOPE_KEY].review.sha256 = '0'.repeat(64),
  'wrong-handler': x => x.proof[admission.BASE_CLASS_REMOVAL_SCOPE_KEY].handler.sha256 = '0'.repeat(64),
  'wrong-producer': x => x.proof[admission.BASE_CLASS_REMOVAL_SCOPE_KEY].source_inputs[3].sha256 = '0'.repeat(64),
  'unreviewed-repair': x => x.proof[admission.BASE_CLASS_REMOVAL_SCOPE_KEY].qualified_repair_successors[0].after.sha256 = '0'.repeat(64),
  'missing-hunk': x => x.proof[admission.BASE_CLASS_REMOVAL_SCOPE_KEY].original_hunks--,
  'false-canonical-claim': x => x.proof[admission.BASE_CLASS_REMOVAL_SCOPE_KEY].canonical_admission_granted = true,
  'false-native-claim': x => x.proof[admission.BASE_CLASS_REMOVAL_SCOPE_KEY].actual_native_packed_browser_floor_or_full_audit_qualified = true,
  'false-clearance': x => x.body.g11_claim = 'passed',
  'extra-scope': x => x.proof[admission.BASE_CLASS_REMOVAL_SCOPE_KEY].cached_source_success = true,
  'extra-entry': x => x.entry.cached_source_success = true,
};
if (inPhase('metadata-cold')) for (const [id, mutate] of Object.entries(metadataControls)) {
  const x = structuredClone(args); mutate(x); assert.equal(admission.metadataOk(x), false, id);
}
// Authentic disk bytes must not bless a stale or substituted loaded producer.
// Public CommonJS cache substitution avoids modifying any source file.
const require = createRequire(import.meta.url), handlerPath = require.resolve('../scripts/upstream-base-class-removal-admission.cjs');
const cachedHandler = require.cache[handlerPath];
const producerCacheControls = [
  ['../scripts/upstream-base-class-removal-source.mjs', 'verifyBaseClassRemovalOriginal'],
  ['../compatibility/rc/21x-base-class-removal-source-final-review.mjs', 'validateBaseClassRemovalReview'],
  ['../scripts/historical-contract-repair-source.mjs', 'historicalContractRepairSourceSubject'],
  ['../scripts/historical-contract-repair-source.mjs', 'readHistoricalContractRepairMember'],
].flatMap(([module, exported]) => [[module, exported, false], [module, exported, true]]);
if (inPhase('metadata-cold')) for (const [module, exported, spoofOwnToString] of producerCacheControls) {
  const path = require.resolve(module), cached = require.cache[path], original = cached.exports[exported];
  const substituted = (...values) => original(...values);
  if (spoofOwnToString) {
    Object.defineProperty(substituted, 'toString', {value: () => Function.prototype.toString.call(original)});
    assert.equal(substituted.toString(), Function.prototype.toString.call(original));
  }
  require.cache[path] = {...cached, exports: {...cached.exports, [exported]: substituted}};
  delete require.cache[handlerPath];
  try {
    const subject = require(handlerPath);
    assert.equal(subject.metadataOk(args), true);
    assert.equal(subject.sourceOk(args), false, 'substituted loaded producer ' + exported + ' spoof=' + spoofOwnToString);
  } finally { require.cache[path] = cached; require.cache[handlerPath] = cachedHandler; }
}
const metadataMutationControls = {
  entry: x => x.entry.final_disposition = 'irrelevant',
  proof: x => x.proof[admission.BASE_CLASS_REMOVAL_SCOPE_KEY].canonical_admission_granted = true,
  body: x => x.body.original_hunks--,
};
if (inPhase('metadata-cold')) {
assert.equal(admission.sourceOk({...args, proof: null}), false, 'explicit null proof is not an omitted proof');
assert.equal(admission.sourceOk({...args, read}), true, 'positive physical reader');
for (const [id, mutate] of Object.entries(metadataMutationControls)) {
  const live = structuredClone(args); let changed = false;
  live.read = path => { if (!changed) { changed = true; mutate(live); } return read(path); };
  assert.equal(admission.metadataOk(live), true);
  assert.equal(admission.sourceOk(live), false, 'metadata changed by cold reader ' + id);
  assert.equal(admission.metadataOk(live), false);
}
if (phase === 'metadata-cold') { finishPhase({metadata_rejections: Object.keys(metadataControls).length,
  substituted_loaded_producer_rejections: producerCacheControls.length, metadata_reader_positive_cases: 1,
  cold_metadata_reader_mutation_rejections: Object.keys(metadataMutationControls).length,
  explicit_null_proof_rejections: 1}); process.exit(0); }
}
if (inPhase('metadata-late')) {
const live = structuredClone(args); let readerMutation = null;
live.read = path => { const mutate = readerMutation; readerMutation = null; if (mutate) mutate(live); return read(path); };
const liveSource = admission.inspectSource(live);
const restoreMetadata = () => { Object.assign(live, structuredClone(args)); assert.equal(admission.metadataOk(live), true); };
for (const [id, mutate] of Object.entries(metadataMutationControls)) {
  mutate(live); assert.throws(() => liveSource.assertCurrent(), undefined, 'late caller metadata mutation ' + id);
  restoreMetadata(); liveSource.assertCurrent();
  readerMutation = mutate; assert.throws(() => liveSource.assertCurrent(), undefined, 'late reader metadata mutation ' + id);
  restoreMetadata(); liveSource.assertCurrent();
}
const replaced = structuredClone(args);
replaced.read = path => { replaced.entry = {...replaced.entry, final_disposition: 'irrelevant'}; return read(path); };
assert.equal(admission.sourceOk(replaced), false, 'reader replaced request entry object');
if (phase === 'metadata-late') { finishPhase({late_metadata_caller_mutation_rejections: Object.keys(metadataMutationControls).length,
  late_metadata_reader_mutation_rejections: Object.keys(metadataMutationControls).length, request_entry_replacement_rejections: 1}); process.exit(0); }
}
const current = admission.inspectCanonicalSource({root, entries: stage.entries, body}); current.assertCurrent();
assert.equal(current.bound.length, new Set(current.bound.map(ref => ref.path)).size);
// The finite tabs packet adds two owner members and its five non-package
// evidence members; both source rows and the package were already bound.
const tabsPacketPath = 'compatibility/rc/parent-tabs-finite-source-successor-v1.json';
const tabsPacket = JSON.parse(read(tabsPacketPath));
const tabsPaths = ['scripts/tabs-finite-source-successor.mjs', tabsPacketPath,
  ...tabsPacket.branches['21.x'].evidence.map(ref => ref.path),
  ...tabsPacket.branches['21.x'].transitions.map(row => row.path)];
for (const path of tabsPaths) assert.ok(current.bound.some(ref => ref.path === path), 'unbound tabs successor ' + path);

assert.equal(current.facts.qualified_repair_successors, 5);
assert.equal(current.facts.authenticated_historical_canonical_context, 3);
for (const ref of current.historical_canonical_context) assert.ok(!current.bound.some(member => member.path === ref.path));
assert.ok(current.bound.length > 1000);
// These exact future canonical bytes are acquisition metadata, authenticated
// against original Git. Their transaction receives no source-owner acceptance.
if (inPhase('projection')) {
fs.readFileSync = function (file, ...options) {
  if (typeof file === 'string' && resolve(file) === resolve(root, LEDGER)) return Buffer.from(stage.after);
  if (typeof file === 'string' && resolve(file) === resolve(root, REGISTRY)) return Buffer.from(registryAfter);
  return physicalRead.call(this, file, ...options);
}; syncBuiltinESMExports();
try { assert.equal(admission.sourceOk(args), true); current.assertCurrent(); }
finally { fs.readFileSync = physicalRead; syncBuiltinESMExports(); }
}

// Change the physical read route, not only an injectable candidate reader. This
// challenges cold qualification and the closure retained after qualification.
const sourceControls = [admission.BASE_CLASS_REMOVAL_REVIEW,
  'scripts/upstream-base-class-removal-admission.cjs',
  'scripts/upstream-base-class-removal-source.mjs',
  'compatibility/rc/21x-base-class-removal-source-final-review.mjs',
  'scripts/historical-contract-repair-source.mjs',
  'compatibility/rc/historical-contract-repair-source-inputs.json', finalPath,
  'compatibility/rc/21x-base-class-removal-source-originals.json.gz',
  'compatibility/rc/upstream-complete-patch-census.json.gz',
  'compatibility/rc/21x-base-class-removal-source-owned-dialog-member-review.json',
  'compatibility/rc/21x-base-class-removal-repair-qualified.json',
  'compatibility/rc/base-class-removal-api-contract-21x-qualified.json',
  'projects/ngx-material-legacy/legacy-form-field/testing/error-harness.ts',
  'projects/ngx-material-legacy/legacy-snack-bar/internal/snack-bar-base.ts',
  'projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts',
  'projects/ngx-material-legacy/legacy-menu/internal/menu-base.ts',
  'compatibility/rc/api/signature-differences.json',
  'node_modules/@angular/material/types/form-field-testing.d.ts', body.patch_file,
];
for (const path of sourceControls) assert.ok(current.bound.some(ref => ref.path === path), 'unbound control ' + path);
if (inPhase('physical-cold', 'physical-late')) for (const path of sourceControls) {
  const target = fs.realpathSync(resolve(root, path));
  fs.readFileSync = function (file, ...options) {
    const raw = physicalRead.call(this, file, ...options);
    return typeof file === 'string' && resolve(file) === target
      ? (typeof raw === 'string' ? raw + '\n' : Buffer.concat([raw, Buffer.from('\n')])) : raw;
  }; syncBuiltinESMExports();
  try {
    if (inPhase('physical-cold')) assert.equal(admission.sourceOk(args), false, 'cold physical source ' + path);
    if (inPhase('physical-late')) assert.throws(() => current.assertCurrent(), undefined, 'late physical source ' + path);
  } finally { fs.readFileSync = physicalRead; syncBuiltinESMExports(); }
}

if (phase === 'physical-cold' || phase === 'physical-late') {
  finishPhase({controls: sourceControls, bound: current.bound.length}); process.exit(0);
}
// A reader cannot project old product bytes or fabricate a current producer.
let projected = null;
const projectedRead = path => path === projected ? Buffer.concat([read(path), Buffer.from('\n')]) : read(path);
const late = admission.inspectSource({...args, read: projectedRead});
const projectionControls = [sourceControls[1], sourceControls[2], sourceControls[12], sourceControls[16]];
for (const path of projectionControls) {
  projected = path;
  assert.equal(admission.sourceOk({...args, read: projectedRead}), false, 'cold projected source ' + path);
  assert.throws(() => late.assertCurrent(), undefined, 'late projected source ' + path);
}
projected = null; late.assertCurrent(); current.assertCurrent();
const exposed = current.bound; exposed[0].sha256 = '0'.repeat(64); current.assertCurrent();
assert.throws(() => admission.inspectCanonicalSource({root, entries: [], body}));
assert.throws(() => admission.inspectCanonicalSource({root, entries: [entry, entry], body}));
const proposals = [Buffer.concat([before, Buffer.from('\n')]), stage.after, Buffer.from('{}')];
for (const value of proposals) assert.throws(() => applyBaseClassRemovalCanonicalStage({before: value, body}));
for (const value of [Buffer.concat([registryBefore, Buffer.from('\n')]), registryAfter]) assert.throws(() => baseClassRemovalRegistrySuccessor(value));
const beforeData = JSON.parse(before), afterData = JSON.parse(stage.after), sha = admission.BASE_CLASS_REMOVAL_SHA;
assert.deepEqual(afterData.entries.filter(row => row.sha !== sha), beforeData.entries.filter(row => row.sha !== sha));
assert.equal(afterData.closed_dispositions, 427); assert.equal(afterData.open_or_deferred, 1270);
assert.equal(afterData.entries.filter(row => row.final_disposition === 'security-review').length, 1);
const beforeRegistry = await import('data:text/javascript;base64,' + registryBefore.toString('base64'));
const afterRegistry = await import('data:text/javascript;base64,' + registryAfter.toString('base64'));
assert.equal(beforeRegistry.sourceContractDefinitions.length, 69); assert.equal(afterRegistry.sourceContractDefinitions.length, 70);
assert.deepEqual(afterRegistry.sourceContractDefinitions.slice(0, -1), beforeRegistry.sourceContractDefinitions);
assert.equal(afterRegistry.sourceContractDefinitions.at(-1).sha, sha);
assert.deepEqual(body, originalBody); assert.ok(read(LEDGER).equals(physicalLedger)); assert.ok(read(REGISTRY).equals(physicalRegistry)); assert.ok(read(finalPath).equals(finalBefore));

if (phase === 'projection') { finishPhase({projection_controls: projectionControls,
  historical_acquisition_metadata_successor_cases: 1, bound: current.bound.length}); process.exit(0); }
const ref = (path, raw) => ({path, sha256: hash(raw), bytes: raw.length});
const proposalImages = process.argv.length === 4 ? [
  ['ledger_before_image', '-ledger-before.json.gz', before], ['ledger_after_image', '-ledger-after.json.gz', stage.after],
  ['registry_before_image', '-registry-before.mjs.gz', registryBefore], ['registry_after_image', '-registry-after.mjs.gz', registryAfter],
].map(([key, suffix, raw]) => ({key, path: process.argv[3].replace(/\.json$/, suffix), raw: gzipSync(raw, {level: 9})})) : [];
const proposal = {schema_version: 1, line: '21.x', sha, before: ref(LEDGER, before), after: ref(LEDGER, stage.after),
  registry_before: ref(REGISTRY, registryBefore), registry_after: ref(REGISTRY, registryAfter),
  review: ref(admission.BASE_CLASS_REMOVAL_REVIEW, read(admission.BASE_CLASS_REMOVAL_REVIEW)),
  handler: ref(sourceControls[1], read(sourceControls[1])), stage: ref('scripts/base-class-removal-canonical-stage.mjs', read('scripts/base-class-removal-canonical-stage.mjs')),
  source_inputs_bound: current.bound.length, source_facts: current.facts, individual_decisions_proposed: 1, summary_scalar_tokens: 2,
  unselected_entries_preserved: 1696, security_review_entries_preserved: 1, registry_records_added: 1,
  canonical_ledger_applied: physicalLedger.equals(stage.after), canonical_registry_applied: physicalRegistry.equals(registryAfter), canonical_admission_granted: false,
  full_owner_integration_qualified: false, actual_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed'};
for (const image of proposalImages) proposal[image.key] = ref(image.path, image.raw);
const report = {schema_version: 1, line: '21.x', result: 'pass', scope: 'bounded source-only admission and pure unapplied proposal',
  probe: ref('tests/base_class_removal_admission_probe.mjs', read('tests/base_class_removal_admission_probe.mjs')),
  handler: proposal.handler, stage: proposal.stage, review: proposal.review,
  node: process.versions.node, metadata_positive_cases: 1, metadata_rejections: Object.keys(metadataControls),
  historical_acquisition_metadata_successor_cases: 1,
  substituted_loaded_producer_rejections: producerCacheControls.map(([module, exported, spoofOwnToString]) => ({module, exported, spoof_own_toString: spoofOwnToString})),
  metadata_reader_positive_cases: 1,
  cold_metadata_reader_mutation_rejections: Object.keys(metadataMutationControls),
  late_metadata_caller_mutation_rejections: Object.keys(metadataMutationControls),
  late_metadata_reader_mutation_rejections: Object.keys(metadataMutationControls),
  request_entry_replacement_rejections: 1,
  explicit_null_proof_rejections: 1,
  cold_physical_source_rejections: sourceControls, late_physical_source_rejections: sourceControls,
  cold_projection_rejections: projectionControls, late_projection_rejections: projectionControls,
  current_physical_inputs_bound: current.bound.length, source_facts: current.facts, ledger_after_sha256: hash(stage.after), registry_after_sha256: hash(registryAfter),
  canonical_files_changed: 0, historical_reports_changed: 0, full_owner_integration_qualified: false,
  actual_native_packed_browser_floor_or_full_audit_qualified: false, g11_claim: 'not-passed'};
assert.ok(process.argv.length === 2 || process.argv.length === 4, 'usage: probe [controls.json proposal.json]');
if (process.argv.length === 4) {
  for (const path of process.argv.slice(2)) assert.match(path, /^compatibility\/rc\/21x-base-class-removal-admission-[^/]+\.json$/);
  for (const image of proposalImages) fs.writeFileSync(image.path, image.raw, {flag: 'wx'});
  fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  fs.writeFileSync(process.argv[3], JSON.stringify(proposal, null, 2) + '\n', {flag: 'wx'});
}
console.log(JSON.stringify({result: 'pass', metadata_rejections: Object.keys(metadataControls).length,
  substituted_loaded_producer_rejections: producerCacheControls.length,
  metadata_reader_positive_cases: 1, cold_metadata_reader_mutation_rejections: Object.keys(metadataMutationControls).length,
  late_metadata_caller_mutation_rejections: Object.keys(metadataMutationControls).length,
  late_metadata_reader_mutation_rejections: Object.keys(metadataMutationControls).length, request_entry_replacement_rejections: 1,
  explicit_null_proof_rejections: 1,
  historical_acquisition_metadata_successor_cases: 1,
  cold_physical_source_rejections: sourceControls.length, late_physical_source_rejections: sourceControls.length,
  projection_rejections: projectionControls.length * 2, bound: current.bound.length, canonical_files_changed: 0,
  full_owner_integration_qualified: false, actual_native_packed_browser_floor_or_full_audit_qualified: false}));

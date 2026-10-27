/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Qualified source and finite individual-decision epochs; no native gate credit. */
import assert from 'node:assert/strict';
import {readFileSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {testingApi21xEntryEvidenceOk} from './upstream-testing-api-21x-admission.mjs';
import {sassInspectionEntrySourceOk} from './upstream-sass-inspection-admission.mjs';
import {rulesJsBuildEntrySourceOk,rulesJsBuildBoundInputs} from './upstream-rules-js-build-admission.mjs';
import {autocompleteLandscapeSourceJudgment,AUTOCOMPLETE_LANDSCAPE_SHA,AUTOCOMPLETE_LANDSCAPE_REVIEW} from './autocomplete-landscape-source-judgment.mjs';
import {autocompleteSelectionReaderSubject} from './autocomplete-selection-spec-subject.mjs';
import {autocompleteSelectionNativeSubject,SELECTION_NATIVE_REGISTRY,SELECTION_NATIVE_SHAS} from './autocomplete-selection-native-subject.mjs';
import {autocompleteSelectionSourceJudgments} from './autocomplete-selection-source-judgment.mjs';
import {historicalChipWrapperMetadata,HISTORICAL_WRAPPER_PACKET} from './historical-chip-wrapper-metadata.mjs';
import {historicalConsumerWrapperMetadata,CONSUMER_WRAPPER_PACKET,replaceHistoricalConsumerEntries} from './historical-consumer-wrapper-metadata.mjs';
import {checkerReferenceMetadata} from './checker-reference-metadata.mjs';
import tokenBuildAdmission from './upstream-token-build-admission.cjs';
import unthemedAdmission from './upstream-unthemable-token-admission.cjs';
import controlBaseAdmission from './upstream-modern-control-base-admission.cjs';
import tokenRootAdmission from './upstream-theme-token-root-admission.cjs';
import fieldTokenAdmission from './upstream-form-field-tokenization-admission.cjs';
import boundaryAdmission from './upstream-m3-theme-boundary-admission.cjs';
import {registeredSourceCheckerTransition,refreshRegisteredCheckerReferences} from './registered-source-checker-transition.mjs';
import {sourceContractDefinitions} from './upstream-source-contract-registry.mjs';
import {LEGACY_SASS_ENTRYPOINT_SHA,LEGACY_SASS_ENTRYPOINT_REVIEW,legacySassEntrypointProof,
  inspectLegacySassEntrypointReview} from './upstream-legacy-sass-entrypoint-admission.mjs';

const ts = createRequire(import.meta.url)('typescript');
const inputPath = 'compatibility/rc/packed-upstream-source-inputs.json';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const ownerPath = 'scripts/snack-dom-source-context.mjs';
const subjects = {
  main: {sha256: '971a35dd5a3f6007b419e333f7972ba676635822a833f5445021aa58445e2b27',
    authority: '1c4ace0fa7a0e7cc4d3e919f415e05ca5e46f3c0'},
  '21.x': {sha256: 'be8a38873e4f25e5822b9f2e9bb0f563c45126cb61de69b4c2e089340a68d1f5',
    authority: '86eb9bede566152b9ef81b386fc928fd1dfa4843'},
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
// These are immutable before-image objects, never current source/read results.
// Every live member, review and ledger hash is still checked on each admission.
const ledgerSyntaxCache=new Map(),gitObjectCache=new Map();
function ledgerSyntax(name,text){
  const key=name+'\0'+hash(text);
  if(!ledgerSyntaxCache.has(key))ledgerSyntaxCache.set(key,ts.parseJsonText(name,text));
  return ledgerSyntaxCache.get(key);
}

const json = value => JSON.stringify(value, null, 2) + '\n';
const disk = root => path => readFileSync(join(root, path));
const readers = new WeakMap();
const selectionReaderCache=new WeakMap();
const selectionNativeCache=new WeakMap();
function selectionNative(root,read,line){
  const cached=selectionNativeCache.get(read);
  if(cached){assert.equal(cached.root,root);assert.equal(cached.scope.line,line);cached.scope.assertCurrent();return cached.scope;}
  const scope=autocompleteSelectionNativeSubject({root,read,line});selectionNativeCache.set(read,{root,scope});return scope;
}
// Historical metadata only. Actual registry bytes never pass through this map.
function registryBeforeMetadata(root,read,line,ref){
  ref=checkerBeforeEntrypointMetadata(root,read,ref);
  if(ref.path!==SELECTION_NATIVE_REGISTRY)return ref;
  const scope=selectionNative(root,read,line);assert.ok(scope.qualify(ref));
  return {...ref,sha256:scope.before.sha256,...(ref.bytes===undefined?{}:{bytes:scope.before.bytes})};
}
function selectionReaders(root,read,line){
  const cached=selectionReaderCache.get(read);
  if(cached){assert.equal(cached.root,root);assert.equal(cached.scope.spec.line,line);return cached.scope;}
  const scope=autocompleteSelectionReaderSubject({root,read,line});selectionReaderCache.set(read,{root,scope});return scope;
}
function selectionMember({root,read,line,ref,bound}){
  const scope=selectionReaders(root,read,line),native=ref.path===SELECTION_NATIVE_REGISTRY?selectionNative(root,read,line):null;
  let current=native?.qualify(ref)??scope.qualify(ref)??ref;const raw=read(ref.path);
  if(ref.path===testingApiChecker&&hash(raw)!==ref.sha256){
    const historical=checkerBeforeEntrypointMetadata(root,read,ref);assert.deepEqual(historical,ref);
    current={...ref,sha256:hash(raw),...(ref.bytes===undefined?{}:{bytes:raw.length})};
  }
  assert.equal(hash(raw),current.sha256,'changed qualified source subject '+ref.path);
  if(current.bytes!==undefined)assert.equal(raw.length,current.bytes);
  for(const member of scope.bound)bound.set(member.path,member.sha256);
  if(native)for(const member of native.bound)bound.set(member.path,member.sha256);
  bound.set(ref.path,current.sha256);return raw;
}

const pythonVersion = () => execFileSync('python3', ['-c', 'import sys;print(sys.version.split()[0])'],
  {encoding: 'utf8'}).trim();
const ownerEdits = [
  ["import {componentConfigGraph} from './component-config-caller-contracts.mjs';",
    "import {componentConfigGraph} from './component-config-caller-contracts.mjs';\nimport {packedUpstreamLedgerEpoch,packedUpstreamLedgerRawRead} from './packed-upstream-ledger-epoch.mjs';"],
  ['function currentRaw(root,read){if(!branded.has(read))return read;const previous=branded.get(read);assert.equal(previous.root,root);return previous.raw;}',
    'function currentRaw(root,read){for(;;){read=packedUpstreamLedgerRawRead({root,read});if(!branded.has(read))return read;const previous=branded.get(read);assert.equal(previous.root,root);read=previous.raw;}}'],
  ['if(branded.has(read)){const previous=branded.get(read);assert.equal(previous.root,root);read=previous.raw;}',
    'read=currentRaw(root,read);'],
  ['const rawCurrent=read,focusEpoch=packedUpstreamFocusMetadataEpoch({root,read}),',
    'const rawCurrent=read,upstreamEpoch=packedUpstreamLedgerEpoch({root,read}),focusEpoch=packedUpstreamFocusMetadataEpoch({root,read:upstreamEpoch.read}),'],
];

// This successor adds only the mandatory seven-SHA 21.x review guard. Its
// original checker remains the authenticated subject of the earlier receipts.
const testingApiChecker = 'scripts/check-upstream-audit-disposition.mjs';
const testingApiCheckerEdits = [
  ["import {validateInheritedExecution} from './upstream-inherited-execution-evidence.mjs';",
    "import {validateInheritedExecution} from './upstream-inherited-execution-evidence.mjs';\nimport {requiresTestingApi21xEntry,testingApi21xEntryEvidenceOk} from './upstream-testing-api-21x-admission.mjs';"],
  ["  if (typeof rel !== 'string' || !rel.trim()) return 'missing';",
    "  if (typeof rel !== 'string' || !rel.trim()) return 'missing';\n  const testingApi21xScope = requiresTestingApi21xEntry(entry,line,readRegularRepoBytes);\n  if (testingApi21xScope && !rel.endsWith('.json')) return 'invalid-testing-api-21x-scope';"],
  ["    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'unreadable';",
    "    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'unreadable';\n    if (testingApi21xScope && !testingApi21xEntryEvidenceOk({entry,body,read:readRegularRepoBytes,\n      productPaths:()=>candidateProductSourcePaths(root),line:line||body.line})) return 'invalid-testing-api-21x-scope';"],
];

const sassCheckerEdits = [
  ["import {validateInheritedExecution} from './upstream-inherited-execution-evidence.mjs';",
    "import {validateInheritedExecution} from './upstream-inherited-execution-evidence.mjs';\nimport {requiresSassInspectionScope,sassInspectionEntryEvidenceOk} from './upstream-sass-inspection-admission.mjs';"],
  ["  if (typeof rel !== 'string' || !rel.trim()) return 'missing';",
    "  if (typeof rel !== 'string' || !rel.trim()) return 'missing';\n  const sassInspectionScope = requiresSassInspectionScope(entry);\n  if (sassInspectionScope && !rel.endsWith('.json')) return 'invalid-sass-inspection-scope';"],
  ["    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'unreadable';",
    "    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'unreadable';\n    if (sassInspectionScope && !sassInspectionEntryEvidenceOk({root,read:readRegularRepoBytes,entry,body,\n      line:line||body.line})) return 'invalid-sass-inspection-scope';"],
];
function sassCheckerSuccessor(before) {
  for (const [from,to] of sassCheckerEdits) {assert.equal(before.split(from).length,2); before=before.replace(from,to);}
  return before;
}

const rulesJsCheckerEdits = [
  [
    "import {validateInheritedExecution} from './upstream-inherited-execution-evidence.mjs';",
    "import {validateInheritedExecution} from './upstream-inherited-execution-evidence.mjs';\nimport {requiresRulesJsBuild,rulesJsBuildEntryEvidenceOk,rulesJsBuildOriginalPatch} from './upstream-rules-js-build-admission.mjs';"
  ],
  [
    "  if (typeof rel !== 'string' || !rel.trim()) return 'missing';",
    "  if (typeof rel !== 'string' || !rel.trim()) return 'missing';\n  const rulesJsBuildScope = requiresRulesJsBuild(entry);\n  if (rulesJsBuildScope && !rel.endsWith('.json')) return 'invalid-rules-js-build-scope';"
  ],
  [
    "    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'unreadable';",
    "    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'unreadable';\n    if (rulesJsBuildScope && !rulesJsBuildEntryEvidenceOk({root,read:readRegularRepoBytes,entry,body,\n      line:line||body.line})) return 'invalid-rules-js-build-scope';"
  ],
  [
    "  if (typeof review.diff === 'string' && review.diff.startsWith('diff --git ')) {",
    "  if (requiresRulesJsBuild(entry)) {\n    bytes = rulesJsBuildOriginalPatch(readRegularRepoBytes,entry.sha);\n  } else if (typeof review.diff === 'string' && review.diff.startsWith('diff --git ')) {"
  ]
];
const rulesJsParents={main:'6484f6dcb499c5c62cdd94d98b28e355f1962485','21.x':'29911639fb9b7b49482ea6f99741d1a9f753722e'};
function rulesJsCheckerSuccessor(before){
  for(const [from,to]of rulesJsCheckerEdits){assert.equal(before.split(from).length,2);before=before.replace(from,to);}
  return before;
}

// One reviewed21.x Sass entrypoint decision; every previous checker predicate remains.
const legacySassEntrypointCheckerEdits = [
  [
    "import {validateInheritedExecution} from './upstream-inherited-execution-evidence.mjs';",
    "import {validateInheritedExecution} from './upstream-inherited-execution-evidence.mjs';\nimport {requiresLegacySassEntrypointScope,legacySassEntrypointEntryEvidenceOk} from './upstream-legacy-sass-entrypoint-admission.mjs';"
  ],
  [
    "  if (typeof rel !== 'string' || !rel.trim()) return 'missing';",
    "  if (typeof rel !== 'string' || !rel.trim()) return 'missing';\n  const legacySassEntrypointScope = requiresLegacySassEntrypointScope(entry);\n  if (legacySassEntrypointScope && !rel.endsWith('.json')) return 'invalid-legacy-sass-entrypoint-scope';"
  ],
  [
    "    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'unreadable';",
    "    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'unreadable';\n    if (legacySassEntrypointScope && !legacySassEntrypointEntryEvidenceOk({root,read:readRegularRepoBytes,entry,body,\n      line:line||body.line})) return 'invalid-legacy-sass-entrypoint-scope';"
  ]
];
function legacySassEntrypointCheckerSuccessor(before){
  for(const [from,to]of legacySassEntrypointCheckerEdits){assert.equal(before.split(from).length,2);before=before.replace(from,to);}
  return before;
}
// Metadata reconstruction only. Returned source readers always expose the live
// checker; its exact additive guard is authenticated before using an old hash.
function checkerBeforeEntrypointMetadata(root,read,ref){
  if(ref.path!==testingApiChecker)return ref;
  const before=gitBytes(root,'5beb3b7140ca6df99ae4b5415e5e71c82a1072e7',testingApiChecker),raw=read(testingApiChecker);
  assert.equal(hash(before),'4701128a244fa87febeafcbf79d8059cd39657394b9669f501329882fa83c1e6');
  assert.equal(raw.toString(),legacySassEntrypointCheckerSuccessor(before.toString()),'unqualified Sass entrypoint checker successor');
  assert.ok([hash(before),hash(raw)].includes(ref.sha256),'unqualified historical checker reference');
  if(ref.bytes!==undefined)assert.equal(ref.bytes,ref.sha256===hash(before)?before.length:raw.length);
  return {...ref,sha256:hash(before),...(ref.bytes===undefined?{}:{bytes:before.length})};
}

const allowed = new Set(['evidence_report', 'source_check/evidence_report_sha256',
  ...['modern_chip', 'chip_lifecycle', 'chip_modernization', 'chip_input_api', 'chip_edit']
    .map(name => 'individual_proof/' + name + '_source_scope/source_context_sha256')]);

function gitBytes(root, parent, path) {
  assert.match(parent, /^[0-9a-f]{40}$/);
  const key=JSON.stringify([root,parent,path]);
  if(gitObjectCache.has(key))return Buffer.from(gitObjectCache.get(key));
  const env = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key];
  const bytes=execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'show', parent + ':' + path], {cwd: root, env, maxBuffer: 16 * 1024 * 1024});
  gitObjectCache.set(key,Buffer.from(bytes));return bytes;
}
function property(node, key) {
  assert.ok(ts.isObjectLiteralExpression(node));
  const members = node.properties.filter(member => member.name?.text === key);
  assert.equal(members.length, 1); return members[0].initializer;
}

/** Genuine historical ledger readers carry their original current callback. */
export function packedUpstreamLedgerRawRead({root = process.cwd(), read = disk(root)} = {}) {
  while (readers.has(read)) {const prior = readers.get(read); assert.equal(prior.root, root); read = prior.raw;}
  return read;
}
function applyTokens(before, packet) {
  const text = before.toString(), source = ledgerSyntax('upstream-ledger.json', text);
  assert.equal(source.parseDiagnostics.length, 0);
  const entries = property(source.statements[0].expression, 'entries');
  assert.ok(ts.isArrayLiteralExpression(entries)); assert.equal(entries.elements.length, 1697);
  const bySha = new Map(entries.elements.map(node => [JSON.parse(property(node, 'sha').getText(source)), node]));
  assert.equal(bySha.size, 1697);
  const selected = new Set(packet.entries.map(row => row.sha)); assert.equal(selected.size, 85);
  const edits = [];
  for (const update of packet.literal_token_updates) {
    assert.ok(selected.has(update.sha));
    const path = update.path.join('/');
    assert.ok(allowed.has(path) || /^individual_proof\/historical_behavior\/source_members\/\d+\/sha256$/.test(path),
      'unexpected upstream ledger field ' + path);
    if (path !== 'evidence_report') assert.match(update.after, /^[0-9a-f]{64}$/);
    let node = bySha.get(update.sha);
    for (const part of update.path) node = typeof part === 'number' ? node.elements[part] : property(node, part);
    assert.equal(JSON.parse(node.getText(source)), update.before);
    edits.push({start: node.getStart(source), end: node.end, text: JSON.stringify(update.after)});
  }
  assert.equal(edits.length, 179); edits.sort((a, b) => a.start - b.start);
  let end = 0; const chunks = [];
  for (const edit of edits) {assert.ok(edit.start >= end); chunks.push(text.slice(end, edit.start), edit.text); end = edit.end;}
  chunks.push(text.slice(end)); return Buffer.from(chunks.join(''));
}

const testingApiTransition = {path: 'compatibility/rc/upstream-testing-api-21x-ledger-transition.json.gz',
  sha256: 'cd65646ca6055cac2cd23077d6bcf75c66f7c111666de703227efcc018d2a3e1'};
function prepareTestingApiStage({root, read, before, bound, population}) {
  const member = ref => {
    const raw=read(ref.path);
    if(ref.path===testingApiChecker){
      const original=gitBytes(root,'cda185336a04e813b0cfff5d3e51e5d4c91d7148',ref.path);
      assert.equal(hash(original),ref.sha256);
      assert.equal(raw.toString(),legacySassEntrypointCheckerSuccessor(rulesJsCheckerSuccessor(sassCheckerSuccessor(original.toString()))),'unqualified registered checker successor');
    }else return selectionMember({root,read,line:'21.x',ref,bound});
    bound.set(ref.path,hash(raw));return raw;
  };
  const packet = JSON.parse(gunzipSync(member(testingApiTransition)));
  assert.equal(packet.line, '21.x'); assert.equal(packet.decisions_changed, 7);
  assert.equal(packet.existing_historical_proof_digests_changed, 3);
  assert.equal(packet.unrelated_entry_or_original_hunk_changes, 0);
  assert.equal(packet.current_native_packed_or_floor_or_g11_credit, false);
  assert.equal(packet.before.path, ledgerPath); assert.equal(packet.before.entries, 1697);
  assert.equal(hash(before), packet.before.sha256);
  assert.equal(hash(gitBytes(root, packet.before.source_parent, ledgerPath)), hash(before));
  assert.equal(packet.code_subjects.length, 4);
  assert.deepEqual(packet.code_subjects.map(ref => ref.path), [testingApiChecker,
    'scripts/upstream-testing-api-21x-admission.mjs', 'scripts/upstream-candidate-source-evidence.mjs',
    'scripts/upstream-inherited-execution-evidence.mjs']);
  for (const ref of packet.code_subjects) member(ref);
  const review = JSON.parse(member(packet.review)); assert.equal(review.reviews.length, 7);
  for (const ref of [...review.original_subjects, ...review.prior_reviews, review.current_product,
    ...review.current_observations, review.public_sdk_subject]) member(ref);
  for (const ref of review.current_observations) {
    const observation = JSON.parse(gunzipSync(member(ref))); member(observation.producer);
    if (ref.kind === 'testing') member(observation.retained_packed_evidence.run);
    else assert.equal(ref.kind, 'option');
  }
  const library = {path: 'compatibility/rc/upstream-testing-api-21x-library.tgz',
    sha256: 'b22cc5742c078ef3e61d6d1817da9f7f8e0872cd06c4190ceef73bdb40c044fc'};
  member(library);
  const text = before.toString(), source = ledgerSyntax('testing-api-ledger.json', text);
  assert.equal(source.parseDiagnostics.length, 0);
  const nodes = property(source.statements[0].expression, 'entries'); assert.equal(nodes.elements.length, 1697);
  const bySha = new Map(nodes.elements.map(node => [JSON.parse(property(node, 'sha').getText(source)), node]));
  const expected = JSON.parse(before), edits = [];
  assert.equal(packet.entries.length, 7);
  assert.deepEqual(packet.entries.map(row => row.sha).sort(), review.reviews.map(row => row.sha).sort());
  for (const change of packet.entries) {
    const index = expected.entries.findIndex(entry => entry.sha === change.sha); assert.ok(index >= 0);
    const previous = expected.entries[index], current = change.after_entry;
    assert.equal(previous.final_disposition, 'needs-individual-review');
    assert.equal(hash(json(previous)), change.before_entry_sha256);
    const allowedFields = new Set(['final_disposition', 'reason', 'review_depth', 'evidence_report', 'individual_proof']);
    for (const key of new Set([...Object.keys(previous), ...Object.keys(current)]))
      if (!allowedFields.has(key)) assert.deepEqual(current[key], previous[key], 'changed original testing API entry ' + key);
    assert.equal(testingApi21xEntryEvidenceOk({entry: current, body: review, read,
      productPaths: () => population.filter(path => /\.(ts|scss|css|html)$/.test(path)), line: '21.x'}), true);
    const node = bySha.get(change.sha);
    edits.push({start: node.getStart(source), end: node.end, text: JSON.stringify(current, null, 2).replace(/\n/g, '\n    ')});
    expected.entries[index] = current;
  }
  const nativeShas = ['8e1711216f7d07324e311e0f6ada3d2426c7891e',
    '7c9c898faac8daac1bbb20a0807168a74360760d', '20bf71c40f565c59101b63b5a878d2ddb7fe251d'];
  assert.deepEqual(packet.source_digest_updates.map(row => row.sha).sort(), nativeShas.sort());
  const checkerSha = packet.code_subjects.find(ref => ref.path === testingApiChecker).sha256;
  for (const update of packet.source_digest_updates) {
    assert.deepEqual(update.path.slice(0, 3), ['individual_proof', 'historical_behavior', 'source_members']);
    assert.equal(update.path.length, 5); assert.equal(update.path[4], 'sha256');
    const entry = expected.entries.find(row => row.sha === update.sha), index = update.path[3];
    const ref = entry.individual_proof.historical_behavior.source_members[index];
    assert.equal(ref.path, testingApiChecker); assert.equal(ref.sha256, update.before);
    assert.equal(update.before, '63dd648bdc8e29da97c7241bd5e9c201c73e6ef6e8f13a138caa7b4a88a91b6d');
    assert.equal(update.after, checkerSha);
    let node = bySha.get(update.sha);
    for (const key of update.path) node = typeof key === 'number' ? node.elements[key] : property(node, key);
    assert.equal(JSON.parse(node.getText(source)), update.before);
    edits.push({start: node.getStart(source), end: node.end, text: JSON.stringify(update.after)});
    ref.sha256 = update.after;
  }
  assert.equal(edits.length, 10); edits.sort((a, b) => a.start - b.start);
  let end = 0; const chunks = [];
  for (const edit of edits) {assert.ok(edit.start >= end); chunks.push(text.slice(end, edit.start), edit.text); end = edit.end;}
  chunks.push(text.slice(end)); const after = Buffer.from(chunks.join(''));
  assert.equal(hash(after), packet.after_sha256); assert.deepEqual(JSON.parse(after), expected);
  return {after, individual_decisions: 7, existing_proof_digest_updates: 3};
}

const sassTransitions={
  main:{path:'compatibility/rc/upstream-sass-inspection-ledger-transition.json.gz',sha256:'922c6f5ef0f7635db93e694931a9aa7e54762479418ed5b1330b27adf12cebc4'},
  '21.x':{path:'compatibility/rc/upstream-sass-inspection-ledger-transition.json.gz',sha256:'98d02b52e86689e4e05f4a750f044ee5c8a22f812ddb92dc9214d5156d298803'},
};
function prepareSassStage({root,read,line,before,bound}){
  const member=ref=>{const raw=read(ref.path);
    if(ref.path===testingApiChecker){const original=gitBytes(root,rulesJsParents[line],ref.path);
      assert.equal(hash(original),ref.sha256);assert.equal(raw.toString(),legacySassEntrypointCheckerSuccessor(rulesJsCheckerSuccessor(original.toString())),'unqualified rules_js checker successor');
    }else assert.equal(hash(raw),ref.sha256,'changed Sass admission input '+ref.path);
    bound.set(ref.path,hash(raw));return raw;};
  const packet=JSON.parse(gunzipSync(member(sassTransitions[line])));
  assert.equal(packet.line,line);assert.equal(packet.decisions_changed,6);
  assert.equal(packet.historical_checker_proof_digests_changed,3);assert.equal(packet.unrelated_entry_changes,0);
  assert.equal(packet.current_native_packed_or_floor_or_g11_credit,false);
  assert.equal(packet.before.path,ledgerPath);assert.equal(packet.before.entries,1697);assert.equal(hash(before),packet.before.sha256);
  assert.equal(hash(gitBytes(root,packet.before.source_parent,ledgerPath)),hash(before));
  assert.deepEqual(packet.code_subjects.map(ref=>ref.path),[testingApiChecker,'scripts/upstream-sass-inspection-admission.mjs',
    'scripts/measure-sass-inspection-scope.mjs','scripts/upstream-candidate-source-evidence.mjs']);
  for(const ref of packet.code_subjects)member(ref);
  const review=JSON.parse(member(packet.review));assert.equal(review.line,line);assert.equal(review.reviews.length,6);
  for(const ref of [review.upstream_originals,review.source_census,review.current_compiler_scope])member(ref);
  const scope=JSON.parse(gunzipSync(member(review.current_compiler_scope))).actual;member(scope.producer);member(scope.oracle);
  const peerRoots=[realpathSync(join(root,'node_modules/@angular/material')),realpathSync(join(root,'node_modules/@angular/cdk'))];
  const external=new Map();
  for(const [program,roots]of [[scope.candidate,[realpathSync(join(root,'projects/ngx-material-legacy')),...peerRoots]],[scope.current,peerRoots]]){
    for(const ref of program.loaded_sources){const path=join(roots[ref.root],ref.path);external.set(path,ref.sha256);}
  }
  external.set(join(peerRoots[0],'package.json'),scope.peer.package_json_sha256);
  const assertExternal=()=>{
    assert.deepEqual([realpathSync(join(root,'node_modules/@angular/material')),realpathSync(join(root,'node_modules/@angular/cdk'))],peerRoots,'changed Sass peer resolution');
    for(const [path,digest]of external)assert.equal(hash(readFileSync(path)),digest,'changed current Sass source '+path);
  };
  assertExternal();
  const text=before.toString(),source=ledgerSyntax('sass-ledger.json',text);assert.equal(source.parseDiagnostics.length,0);
  const nodes=property(source.statements[0].expression,'entries');assert.equal(nodes.elements.length,1697);
  const bySha=new Map(nodes.elements.map(node=>[JSON.parse(property(node,'sha').getText(source)),node]));
  const expected=JSON.parse(before),edits=[];
  assert.equal(packet.entries.length,6);assert.deepEqual(packet.entries.map(row=>row.sha).sort(),review.reviews.map(row=>row.sha).sort());
  for(const change of packet.entries){
    const index=expected.entries.findIndex(row=>row.sha===change.sha);assert.ok(index>=0);
    const previous=expected.entries[index],current=change.after_entry;
    assert.equal(hash(json(previous)),change.before_entry_sha256);
    const allowedFields=new Set(['final_disposition','reason','review_depth','affected_branches','evidence_report','individual_proof','patch_sha256']);
    for(const key of new Set([...Object.keys(previous),...Object.keys(current)]))
      if(!allowedFields.has(key))assert.deepEqual(current[key],previous[key],'changed unrelated Sass entry field '+key);
    assert.equal(sassInspectionEntrySourceOk({root,read,entry:current,body:review,line}),true,'unqualified individual Sass source decision');
    const node=bySha.get(change.sha);edits.push({start:node.getStart(source),end:node.end,text:JSON.stringify(current,null,2).replace(/\n/g,'\n    ')});
    expected.entries[index]=current;
  }
  const native=['8e1711216f7d07324e311e0f6ada3d2426c7891e','7c9c898faac8daac1bbb20a0807168a74360760d','20bf71c40f565c59101b63b5a878d2ddb7fe251d'];
  assert.deepEqual(packet.source_digest_updates.map(row=>row.sha).sort(),native.sort());
  const oldChecker=hash(gitBytes(root,packet.before.source_parent,testingApiChecker)),newChecker=packet.code_subjects.find(ref=>ref.path===testingApiChecker).sha256;
  for(const update of packet.source_digest_updates){
    assert.deepEqual(update.path.slice(0,3),['individual_proof','historical_behavior','source_members']);
    assert.equal(update.path.length,5);assert.equal(update.path[4],'sha256');
    const entry=expected.entries.find(row=>row.sha===update.sha),ref=entry.individual_proof.historical_behavior.source_members[update.path[3]];
    assert.equal(ref.path,testingApiChecker);assert.equal(ref.sha256,update.before);assert.equal(update.before,oldChecker);assert.equal(update.after,newChecker);
    let node=bySha.get(update.sha);for(const part of update.path)node=typeof part==='number'?node.elements[part]:property(node,part);
    assert.equal(JSON.parse(node.getText(source)),update.before);edits.push({start:node.getStart(source),end:node.end,text:JSON.stringify(update.after)});ref.sha256=update.after;
  }
  assert.equal(edits.length,9);edits.sort((a,b)=>a.start-b.start);let end=0;const chunks=[];
  for(const edit of edits){assert.ok(edit.start>=end);chunks.push(text.slice(end,edit.start),edit.text);end=edit.end;}chunks.push(text.slice(end));
  const after=Buffer.from(chunks.join(''));assert.equal(hash(after),packet.after_sha256);assert.deepEqual(JSON.parse(after),expected);
  return {before,after,individual_decisions:6,proof_digest_updates:3,assertExternal};
}

const rulesJsTransitions={
  main:{path:'compatibility/rc/upstream-rules-js-build-ledger-transition.json.gz',sha256:'c9a98435c6c654996955d808a8ea2717f5f4d89f8eb360c0fd4df7854712b975'},
  '21.x':{path:'compatibility/rc/upstream-rules-js-build-ledger-transition.json.gz',sha256:'c0e61d07aecb56a56c6c3b1d70d836c28edcfccbb36967f28460921037894191'},
};
function prepareRulesJsStage({root,read,line,before,bound}){
  const member=ref=>selectionMember({root,read,line,ref,bound});
  const packet=JSON.parse(gunzipSync(member(rulesJsTransitions[line])));
  assert.equal(packet.line,line);assert.equal(packet.decisions_changed,3);
  assert.equal(packet.historical_checker_proof_digests_changed,3);assert.equal(packet.unrelated_entry_changes,0);
  assert.equal(packet.current_native_packed_or_floor_or_g11_credit,false);
  assert.equal(packet.before.path,ledgerPath);assert.equal(packet.before.entries,1697);assert.equal(hash(before),packet.before.sha256);
  assert.equal(packet.before.source_parent,rulesJsParents[line]);assert.equal(hash(gitBytes(root,rulesJsParents[line],ledgerPath)),hash(before));
  assert.deepEqual(packet.code_subjects.map(ref=>ref.path),[testingApiChecker,'scripts/upstream-rules-js-build-admission.mjs','scripts/upstream_rules_js_build_scope.py']);
  for(const ref of packet.code_subjects)member(ref);
  const review=JSON.parse(member(packet.review));assert.equal(review.line,line);assert.equal(review.reviews.length,3);
  const scope=rulesJsBuildBoundInputs({root,read,line});for(const ref of scope.refs)member(ref);
  const text=before.toString(),source=ledgerSyntax('rules-js-ledger.json',text);assert.equal(source.parseDiagnostics.length,0);
  const nodes=property(source.statements[0].expression,'entries');assert.equal(nodes.elements.length,1697);
  const bySha=new Map(nodes.elements.map(node=>[JSON.parse(property(node,'sha').getText(source)),node]));
  const expected=JSON.parse(before),edits=[];
  assert.equal(packet.entries.length,3);assert.deepEqual(packet.entries.map(row=>row.sha).sort(),review.reviews.map(row=>row.sha).sort());
  const allowedFields=new Set(['final_disposition','reason','review_depth','affected_branches','evidence_report','individual_proof',
    'diff_sha256','patch_sha256','batch_id','source_check','prior_dispositions','peer_floor']);
  for(const change of packet.entries){
    const index=expected.entries.findIndex(row=>row.sha===change.sha);assert.ok(index>=0);
    const previous=expected.entries[index],current=change.after_entry;
    assert.equal(hash(json(previous)),change.before_entry_sha256);
    for(const key of new Set([...Object.keys(previous),...Object.keys(current)]))
      if(!allowedFields.has(key))assert.deepEqual(current[key],previous[key],'changed unrelated build entry field '+key);
    assert.equal(current.batch_id,'closeout-three-rules-js-build-individual-reviews');
    assert.equal(rulesJsBuildEntrySourceOk({root,read,entry:current,body:review,line}),true,'unqualified individual build source decision');
    const node=bySha.get(change.sha);edits.push({start:node.getStart(source),end:node.end,text:JSON.stringify(current,null,2).replace(/\n/g,'\n    ')});
    expected.entries[index]=current;
  }
  const native=['8e1711216f7d07324e311e0f6ada3d2426c7891e','7c9c898faac8daac1bbb20a0807168a74360760d','20bf71c40f565c59101b63b5a878d2ddb7fe251d'];
  assert.deepEqual(packet.source_digest_updates.map(row=>row.sha).sort(),native.sort());
  const oldChecker=hash(gitBytes(root,rulesJsParents[line],testingApiChecker)),newChecker=packet.code_subjects.find(ref=>ref.path===testingApiChecker).sha256;
  for(const update of packet.source_digest_updates){
    assert.deepEqual(update.path.slice(0,3),['individual_proof','historical_behavior','source_members']);
    assert.equal(update.path.length,5);assert.equal(update.path[4],'sha256');
    const entry=expected.entries.find(row=>row.sha===update.sha),ref=entry.individual_proof.historical_behavior.source_members[update.path[3]];
    assert.equal(ref.path,testingApiChecker);assert.equal(ref.sha256,update.before);assert.equal(update.before,oldChecker);assert.equal(update.after,newChecker);
    let node=bySha.get(update.sha);for(const part of update.path)node=typeof part==='number'?node.elements[part]:property(node,part);
    assert.equal(JSON.parse(node.getText(source)),update.before);edits.push({start:node.getStart(source),end:node.end,text:JSON.stringify(update.after)});ref.sha256=update.after;
  }
  assert.equal(edits.length,6);edits.sort((a,b)=>a.start-b.start);let end=0;const chunks=[];
  for(const edit of edits){assert.ok(edit.start>=end);chunks.push(text.slice(end,edit.start),edit.text);end=edit.end;}chunks.push(text.slice(end));
  const after=Buffer.from(chunks.join(''));assert.equal(hash(after),packet.after_sha256);assert.deepEqual(JSON.parse(after),expected);
  return {before,after,individual_decisions:3,proof_digest_updates:3,assertExternal:scope.assertExternal};
}

const summaryTransitions={
  main:{path:'compatibility/rc/upstream-ledger-summary-transition.json',sha256:'8346997a4b0135fc858748ff2520230e3a537efe00ac04c3ef71646858996152'},
  '21.x':{path:'compatibility/rc/upstream-ledger-summary-transition.json',sha256:'2d4fc0ff09b993cca3d202d75844141574ddd55c9730ca84339744f3d9b2083c'},
};
function prepareSummaryStage({root,read,line,before,bound}){
  const ref=summaryTransitions[line],raw=read(ref.path);assert.equal(hash(raw),ref.sha256);bound.set(ref.path,ref.sha256);
  const packet=JSON.parse(raw);assert.equal(packet.line,line);assert.equal(packet.entries_changed,0);
  assert.equal(packet.new_SHA_decisions,0);assert.equal(packet.full_audit_or_gate_credit,false);
  assert.equal(packet.before.path,ledgerPath);assert.equal(packet.before.sha256,hash(before));
  assert.equal(hash(gitBytes(root,packet.before.source_parent,ledgerPath)),hash(before));
  // The checker owns the classification policy. Read its actual finite sets
  // as syntax rather than introducing a second production policy definition.
  const policy=ts.createSourceFile(testingApiChecker,read(testingApiChecker).toString(),ts.ScriptTarget.Latest,true);
  const declarations=policy.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]);
  const states=name=>{
    const matches=declarations.filter(node=>node.name.getText(policy)===name);assert.equal(matches.length,1);
    const init=matches[0].initializer;assert.ok(ts.isNewExpression(init)&&init.expression.getText(policy)==='Set'&&init.arguments.length===1);
    const values=init.arguments[0];assert.ok(ts.isArrayLiteralExpression(values)&&values.elements.every(ts.isStringLiteral));
    const result=new Set(values.elements.map(node=>node.text));assert.equal(result.size,values.elements.length);return result;
  };
  const closed=states('ALLOWED_FINAL'),pending=states('PENDING'),data=JSON.parse(before);
  assert.equal(data.entries.length,1697);let closedCount=0,pendingCount=0;
  for(const entry of data.entries){assert.ok(closed.has(entry.final_disposition)||pending.has(entry.final_disposition));
    if(closed.has(entry.final_disposition))closedCount++;else pendingCount++;}
  assert.equal(closedCount+pendingCount,1697);assert.equal(data.g11_claim,'not-passed');
  const text=before.toString(),syntax=ledgerSyntax('ledger-summary.json',text);assert.equal(syntax.parseDiagnostics.length,0);
  const values={closed_dispositions:closedCount,open_or_deferred:pendingCount};
  assert.deepEqual(packet.updates.map(row=>row.field),Object.keys(values));const edits=[];
  for(const update of packet.updates){assert.equal(data[update.field],update.before);assert.equal(values[update.field],update.after);
    const node=property(syntax.statements[0].expression,update.field);assert.equal(JSON.parse(node.getText(syntax)),update.before);
    edits.push({start:node.getStart(syntax),end:node.end,text:JSON.stringify(update.after)});}
  let end=0;const chunks=[];for(const edit of edits.sort((a,b)=>a.start-b.start)){assert.ok(edit.start>=end);chunks.push(text.slice(end,edit.start),edit.text);end=edit.end;}
  chunks.push(text.slice(end));const after=Buffer.from(chunks.join(''));assert.equal(hash(after),packet.after_sha256);
  assert.deepEqual(JSON.parse(after),{...data,...values});return {before,after,scalar_updates:2};
}

// Only this authenticated additive registry change succeeds the original
// source receipt. Ledger proofs and actual packed/native admission stay raw.
const autocompleteRegistryPath='scripts/upstream-historical-behavior-evidence.mjs';
const autocompleteRegistryTransitions={
  main:'99e2d8d316f83caf0ece1fe5b990be099db3e5e6495b758af4a89bbb86877192',
  '21.x':'ee071f30f5c985d15cc33f4decb7fd0a672d48a755d533c8adf6ba8b71c6fa28',
};
function qualifyAutocompleteRegistry({root,read,line,ref,bound}){
  const path='compatibility/rc/autocomplete-landscape-native-contract-transition.json',raw=read(path);
  assert.equal(hash(raw),autocompleteRegistryTransitions[line]);bound.set(path,hash(raw));
  const packet=JSON.parse(raw);assert.equal(packet.schema_version,1);assert.equal(packet.line,line);
  assert.equal(packet.sha,'008212a9807fd01fd32fe136a075763b7b2c854d');
  assert.equal(packet.canonical_ledger_edits,0);assert.equal(packet.native_browser_artifact_or_floor_execution,false);
  assert.equal(packet.g11_claim,'not-passed');assert.equal(packet.registry.path,ref.path);
  const before=gitBytes(root,packet.source_parent,ref.path);assert.equal(hash(before),ref.sha256);
  assert.equal(hash(before),packet.registry.before_sha256);assert.equal(before.length,packet.registry.before_bytes);
  const marker=packet.insertion.before_marker,addition=packet.insertion.text,text=before.toString();
  assert.equal(text.split(marker).length,2);assert.ok(addition.startsWith("  ['008212a9807fd01fd32fe136a075763b7b2c854d', {\n"));
  const after=Buffer.from(text.replace(marker,addition+marker));assert.equal(hash(after),packet.registry.after_sha256);
  assert.equal(after.length,packet.registry.after_bytes);
  const native=selectionNative(root,read,line);assert.equal(hash(after),native.before.sha256);
  assert.equal(hash(read(ref.path)),native.after.sha256);bound.set(ref.path,native.after.sha256);
  for(const checkpoint of [packet.current_source_inspection,packet.current_source_inspector,packet.complete_originals]){
    const bytes=read(checkpoint.path);assert.equal(hash(bytes),checkpoint.sha256);assert.equal(bytes.length,checkpoint.bytes);
    bound.set(checkpoint.path,checkpoint.sha256);
  }
}

const autocompleteLedgerTransitions={
  main:'823684fe3cb4a30ec4ef012c742df3dc140f010c1aa43f5407c4cd1c2266a6c8',
  '21.x':'d8de61098c5eb4fba574da97b1e6d582f13a3a3be3332bdb83ad00aa9c0f64ba',
};
function prepareAutocompleteLandscapeStage({root,read,line,before,bound}){
  const path='compatibility/rc/autocomplete-landscape-ledger-transition.json.gz',raw=read(path);
  assert.equal(hash(raw),autocompleteLedgerTransitions[line]);bound.set(path,hash(raw));
  const packet=JSON.parse(gunzipSync(raw));assert.equal(packet.schema_version,1);assert.equal(packet.line,line);
  assert.equal(packet.individual_source_judgments,1);assert.equal(packet.registry_proof_digests_changed,10);
  assert.equal(packet.unrelated_entry_or_original_hunk_changes,0);assert.equal(packet.current_native_packed_or_floor_or_g11_credit,false);
  assert.equal(packet.before.path,ledgerPath);assert.equal(packet.before.entries,1697);assert.equal(packet.before.sha256,hash(before));
  assert.equal(hash(gitBytes(root,packet.before.source_parent,ledgerPath)),hash(before));
  const member=ref=>selectionMember({root,read,line,ref,bound});
  assert.deepEqual(packet.code_subjects.map(ref=>ref.path),['scripts/autocomplete-landscape-source-judgment.mjs',autocompleteRegistryPath,testingApiChecker]);
  for(const ref of packet.code_subjects)member(ref);
  const currentSource=autocompleteLandscapeSourceJudgment({root,read,line}),review=JSON.parse(member(packet.review));
  // Reconstruct only this earlier review's metadata image. Current readers
  // retain the actual source; the native ledger receives its new hash below.
  const spec=selectionReaders(root,read,line).spec,originalBody=structuredClone(currentSource.body);
  assert.deepEqual(originalBody.native_spec_source_successor,spec.bound[0]);delete originalBody.native_spec_source_successor;
  const ownedSpec=originalBody.current_owned_sources.filter(ref=>ref.path===spec.path);assert.equal(ownedSpec.length,1);
  assert.equal(ownedSpec[0].sha256,spec.after.sha256);Object.assign(ownedSpec[0],spec.before);
  assert.deepEqual(review,originalBody);
  const priorPaths=new Set(packet.qualification_members.map(ref=>ref.path));
  const originalMembers=currentSource.bound.filter(ref=>priorPaths.has(ref.path)).map(ref=>registryBeforeMetadata(root,read,line,ref.path===spec.path?{...ref,...spec.before}:ref));
  assert.deepEqual(packet.qualification_members,originalMembers);
  for(const ref of currentSource.bound)member(ref);
  const originalProof=structuredClone(currentSource.proof);
  originalProof.historical_behavior.source_members=originalProof.historical_behavior.source_members.map(ref=>registryBeforeMetadata(root,read,line,ref));
  const nativeSpec=originalProof.historical_behavior.source_members.filter(ref=>ref.path===spec.path);assert.equal(nativeSpec.length,1);
  assert.equal(nativeSpec[0].sha256,spec.after.sha256);nativeSpec[0].sha256=spec.before.sha256;
  const text=before.toString(),syntax=ledgerSyntax('landscape-ledger.json',text);assert.equal(syntax.parseDiagnostics.length,0);
  const nodes=property(syntax.statements[0].expression,'entries');assert.equal(nodes.elements.length,1697);
  const data=JSON.parse(before),expected=structuredClone(data),index=data.entries.findIndex(row=>row.sha===AUTOCOMPLETE_LANDSCAPE_SHA);
  assert.ok(index>=0);const prior=data.entries[index];assert.equal(hash(json(prior)),packet.entry.before_entry_sha256);
  assert.equal(packet.entry.sha,AUTOCOMPLETE_LANDSCAPE_SHA);
  assert.equal(prior.final_disposition,line==='21.x'?'needs-individual-review':'already-adapted');
  const current={...prior,final_disposition:'already-adapted',reason:review.decision,read_note_disposition:'individual-source-reviewed-on-'+line,
    evidence_report:packet.review.path,source_check:{kind:'individual-source-reviewed-runtime-required',diff_sha256:review.diff_sha256,
      patch_path:review.patch_file,evidence_report_sha256:packet.review.sha256},
    files:['src/material/autocomplete/autocomplete-trigger.ts','src/material/autocomplete/autocomplete.spec.ts'],
    review_depth:'individual-compatibility',affected_branches:[line],individual_proof:originalProof,
    prior_dispositions:[{source_parent:packet.before.source_parent,source_entry_sha256:hash(json(prior)),source_line:line,final_disposition:prior.final_disposition}]};
  assert.deepEqual(packet.entry.after_entry,current);expected.entries[index]=current;
  const edits=[{start:nodes.elements[index].getStart(syntax),end:nodes.elements[index].end,text:JSON.stringify(current,null,2).replace(/\n/g,'\n    ')}];
  const native=data.entries.filter(row=>row.individual_proof?.historical_behavior?.source_members?.some(ref=>ref.path===autocompleteRegistryPath));
  assert.equal(native.length,10);assert.equal(packet.source_digest_updates.length,10);
  assert.deepEqual(packet.source_digest_updates.map(row=>row.sha).sort(),native.map(row=>row.sha).sort());
  for(const update of packet.source_digest_updates){
    assert.deepEqual(update.path.slice(0,3),['individual_proof','historical_behavior','source_members']);
    assert.equal(update.path.length,5);assert.equal(update.path[4],'sha256');
    const i=data.entries.findIndex(row=>row.sha===update.sha);assert.ok(i>=0&&i!==index);
    const ref=expected.entries[i].individual_proof.historical_behavior.source_members[update.path[3]];
    assert.equal(ref.path,autocompleteRegistryPath);assert.equal(ref.sha256,update.before);
    assert.equal(update.before,'7e04af26527d8520bdf3ae4b5ce7bfc861b642877c714708193bc87a8c7948f0');
    assert.equal(update.after,selectionNative(root,read,line).before.sha256);ref.sha256=update.after;
    let node=nodes.elements[i];for(const key of update.path)node=typeof key==='number'?node.elements[key]:property(node,key);
    assert.equal(JSON.parse(node.getText(syntax)),update.before);
    edits.push({start:node.getStart(syntax),end:node.end,text:JSON.stringify(update.after)});
  }
  // The preceding stage derives every count from the actual checker policy.
  // Only21.x moves this one known pending value to the known closed value.
  const summary=line==='21.x'?[
    {field:'closed_dispositions',before:data.closed_dispositions,after:data.closed_dispositions+1},
    {field:'open_or_deferred',before:data.open_or_deferred,after:data.open_or_deferred-1},
  ]:[];
  assert.deepEqual(packet.summary_updates,summary);assert.equal(packet.disposition_values_changed,line==='21.x'?1:0);
  for(const update of summary){const node=property(syntax.statements[0].expression,update.field);assert.equal(JSON.parse(node.getText(syntax)),update.before);
    edits.push({start:node.getStart(syntax),end:node.end,text:JSON.stringify(update.after)});expected[update.field]=update.after;}
  assert.equal(edits.length,line==='21.x'?13:11);let end=0;const chunks=[];
  for(const edit of edits.sort((a,b)=>a.start-b.start)){assert.ok(edit.start>=end);chunks.push(text.slice(end,edit.start),edit.text);end=edit.end;}chunks.push(text.slice(end));
  const after=Buffer.from(chunks.join(''));assert.equal(hash(after),packet.after_sha256);assert.deepEqual(JSON.parse(after),expected);
  assert.equal(expected.g11_claim,'not-passed');return {before,after,individual_decisions:1,proof_digest_updates:10,summary_scalar_updates:summary.length,current_source:currentSource,assertExternal:currentSource.assertExternal};
}

const selectionSpecLedgerPins={
  main:'25e1e6731fa14c62a976dc9c04389f89d57b27b9d80742f44e97fdd18946adce',
  '21.x':'46338d4f9dc08c0e93a22611352cbbcb9170baa98b58323d1ffed4252963dac4',
};
function prepareSelectionSpecMetadata({root,read,line,before,bound,currentSource}){
  const path='compatibility/rc/autocomplete-selection-spec-ledger-successor.json',raw=read(path);
  assert.equal(hash(raw),selectionSpecLedgerPins[line]);bound.set(path,hash(raw));
  const packet=JSON.parse(raw);assert.equal(packet.schema_version,1);assert.equal(packet.line,line);
  assert.equal(packet.before.path,ledgerPath);assert.equal(packet.before.entries,1697);assert.equal(packet.before.sha256,hash(before));
  assert.equal(hash(gitBytes(root,packet.before.source_parent,ledgerPath)),hash(before));
  assert.equal(packet.current_native_proof_source_digests_updated,3);assert.equal(packet.current_source_review_pointers_updated,2);
  assert.equal(packet.disposition_reason_or_required_case_changes,0);assert.equal(packet.header_count_changes,0);assert.equal(packet.other_entry_or_byte_changes,0);
  assert.equal(packet.actual_native_browser_artifact_or_floor_executed,false);assert.equal(packet.g11_claim,'not-passed');
  const readers=selectionReaders(root,read,line),spec=readers.spec;
  assert.deepEqual(packet.source_spec,spec.bound[0]);
  assert.deepEqual(packet.source_readers,readers.bound.find(ref=>ref.path==='compatibility/rc/autocomplete-selection-source-reader-successors.json'));
  for(const ref of [packet.code_subject,packet.current_review,packet.historical_review]){
    const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);bound.set(ref.path,ref.sha256);
  }
  assert.equal(packet.code_subject.path,'scripts/autocomplete-selection-spec-subject.mjs');
  assert.equal(packet.current_review.path,AUTOCOMPLETE_LANDSCAPE_REVIEW);
  assert.deepEqual(JSON.parse(read(packet.current_review.path)),currentSource.body);
  const data=JSON.parse(before),expected=structuredClone(data),updates=[];
  for(const row of data.entries)for(const [i,member]of (row.individual_proof?.historical_behavior?.source_members??[]).entries())if(member.path===spec.path){
    assert.equal(member.sha256,spec.before.sha256);updates.push({sha:row.sha,path:['individual_proof','historical_behavior','source_members',i,'sha256'],before:member.sha256,after:spec.after.sha256});
  }
  assert.equal(updates.length,3);assert.deepEqual(updates.map(row=>row.sha).sort(),['008212a9807fd01fd32fe136a075763b7b2c854d','77ffdf98ba71c11d908b29e02b516dddf487ae0b','db06fa8d8939d793f598bc3dbedc96a5a71c0db0'].sort());
  const landscape=data.entries.find(row=>row.sha===AUTOCOMPLETE_LANDSCAPE_SHA);
  assert.equal(landscape.evidence_report,packet.historical_review.path);assert.equal(landscape.source_check.evidence_report_sha256,packet.historical_review.sha256);
  updates.push({sha:landscape.sha,path:['evidence_report'],before:landscape.evidence_report,after:packet.current_review.path},
    {sha:landscape.sha,path:['source_check','evidence_report_sha256'],before:landscape.source_check.evidence_report_sha256,after:packet.current_review.sha256});
  assert.deepEqual(packet.literal_updates,updates);
  const text=before.toString(),syntax=ledgerSyntax('native-spec-ledger.json',text);assert.equal(syntax.parseDiagnostics.length,0);
  const nodes=property(syntax.statements[0].expression,'entries');assert.equal(nodes.elements.length,1697);const edits=[];
  for(const update of updates){const i=data.entries.findIndex(row=>row.sha===update.sha);assert.ok(i>=0);let node=nodes.elements[i],value=expected.entries[i];
    for(const [j,key]of update.path.entries()){node=typeof key==='number'?node.elements[key]:property(node,key);if(j===update.path.length-1){assert.equal(value[key],update.before);value[key]=update.after;}else value=value[key];}
    assert.equal(JSON.parse(node.getText(syntax)),update.before);edits.push({start:node.getStart(syntax),end:node.end,text:JSON.stringify(update.after)});
  }
  let end=0;const chunks=[];for(const edit of edits.sort((a,b)=>a.start-b.start)){assert.ok(edit.start>=end);chunks.push(text.slice(end,edit.start),edit.text);end=edit.end;}chunks.push(text.slice(end));
  const after=Buffer.from(chunks.join(''));assert.equal(hash(after),packet.after_sha256);assert.deepEqual(JSON.parse(after),expected);
  const historicalProof=structuredClone(currentSource.proof);
  historicalProof.historical_behavior.source_members=historicalProof.historical_behavior.source_members.map(ref=>registryBeforeMetadata(root,read,line,ref));
  assert.deepEqual(expected.entries.find(row=>row.sha===AUTOCOMPLETE_LANDSCAPE_SHA).individual_proof,historicalProof);
  return {before,after,source_proof_digests:3,source_review_pointers:2};
}

const selectionLedgerPins={main:'dbee1262ff90ad59e8242b128c54a6f8d25de400ce26764d16043bb1ef3fa1c3','21.x':'c47ae399ecd8426ca2d20e6561ea3e37bb94084bce1e850c22d50065a63eb512'};
function prepareSelectionNativeStage({root,read,line,before,bound}){
  const path='compatibility/rc/autocomplete-selection-ledger-successor.json',raw=read(path);
  assert.equal(hash(raw),selectionLedgerPins[line]);bound.set(path,hash(raw));
  const packet=JSON.parse(raw);assert.equal(packet.schema_version,1);assert.equal(packet.line,line);
  assert.equal(packet.before.path,ledgerPath);assert.equal(packet.before.entries,1697);assert.equal(hash(before),packet.before.sha256);
  assert.equal(hash(gitBytes(root,packet.before.source_parent,ledgerPath)),hash(before));
  assert.equal(packet.individual_source_judgments,3);assert.equal(packet.registry_proof_digest_updates,11);
  assert.equal(packet.other_entry_or_byte_changes,0);assert.equal(packet.actual_native_artifact_floor_or_G11_qualified,false);
  assert.equal(packet.g11_claim,'not-passed');
  assert.deepEqual(packet.code_subjects.map(ref=>ref.path),[
    'scripts/autocomplete-selection-native-subject.mjs','scripts/autocomplete-selection-source-judgment.mjs','scripts/autocomplete-selection-native-scopes.mjs',
  ]);
  for(const ref of packet.code_subjects){const value=read(ref.path);assert.equal(hash(value),ref.sha256);assert.equal(value.length,ref.bytes);bound.set(ref.path,ref.sha256);}
  const source=autocompleteSelectionSourceJudgments({root,read,line}),native=selectionNative(root,read,line);
  assert.deepEqual(packet.qualification_members,source.bound.map(ref=>checkerBeforeEntrypointMetadata(root,read,ref)));
  for(const ref of source.bound)bound.set(ref.path,ref.sha256);
  assert.deepEqual(packet.entries.map(row=>row.sha),SELECTION_NATIVE_SHAS);
  const text=before.toString(),syntax=ledgerSyntax('selection-ledger.json',text);assert.equal(syntax.parseDiagnostics.length,0);
  const nodes=property(syntax.statements[0].expression,'entries');assert.equal(nodes.elements.length,1697);
  const data=JSON.parse(before),expected=structuredClone(data),edits=[];
  for(const [index,change]of packet.entries.entries()){
    const judgment=source.reports[index];assert.equal(judgment.sha,change.sha);
    const bytes=read(judgment.path),reviewRef={path:judgment.path,sha256:hash(bytes),bytes:bytes.length};
    assert.deepEqual(change.review,reviewRef);assert.deepEqual(JSON.parse(bytes),judgment.body);bound.set(judgment.path,reviewRef.sha256);
    const i=data.entries.findIndex(row=>row.sha===change.sha);assert.ok(i>=0);const prior=data.entries[i];
    assert.equal(hash(json(prior)),change.before_entry_sha256);
    assert.equal(prior.final_disposition,line==='21.x'?'needs-individual-review':'already-adapted');
    const current={...prior,final_disposition:'already-adapted',reason:judgment.body.decision,read_note_disposition:'individual-source-reviewed-on-'+line,
      evidence_report:judgment.path,source_check:{kind:'individual-source-reviewed-runtime-required',diff_sha256:judgment.body.diff_sha256,
        patch_archive:judgment.body.original_source_archive,original_patch_member:change.sha,evidence_report_sha256:reviewRef.sha256},
      files:judgment.original_paths,review_depth:'individual-compatibility',affected_branches:[line],individual_proof:{...structuredClone(judgment.proof),
        historical_behavior:{...structuredClone(judgment.proof.historical_behavior),source_members:judgment.proof.historical_behavior.source_members.map(ref=>checkerBeforeEntrypointMetadata(root,read,ref))}},
      prior_dispositions:[...(prior.prior_dispositions??[]),{source_parent:packet.before.source_parent,source_entry_sha256:hash(json(prior)),source_line:line,final_disposition:prior.final_disposition}]};
    assert.deepEqual(change.after_entry,current);expected.entries[i]=current;
    edits.push({start:nodes.elements[i].getStart(syntax),end:nodes.elements[i].end,text:JSON.stringify(current,null,2).replace(/\n/g,'\n    ')});
  }
  const oldNative=data.entries.filter(row=>row.individual_proof?.historical_behavior?.source_members?.some(ref=>ref.path===SELECTION_NATIVE_REGISTRY));
  assert.equal(oldNative.length,11);assert.equal(packet.source_digest_updates.length,11);
  assert.deepEqual(packet.source_digest_updates.map(row=>row.sha).sort(),oldNative.map(row=>row.sha).sort());
  for(const update of packet.source_digest_updates){
    assert.deepEqual(update.path.slice(0,3),['individual_proof','historical_behavior','source_members']);assert.equal(update.path.length,5);assert.equal(update.path[4],'sha256');
    const i=data.entries.findIndex(row=>row.sha===update.sha);assert.ok(i>=0&&!SELECTION_NATIVE_SHAS.includes(update.sha));
    const ref=expected.entries[i].individual_proof.historical_behavior.source_members[update.path[3]];
    assert.equal(ref.path,SELECTION_NATIVE_REGISTRY);assert.equal(ref.sha256,update.before);assert.equal(update.before,native.before.sha256);assert.equal(update.after,native.after.sha256);
    ref.sha256=update.after;let node=nodes.elements[i];for(const key of update.path)node=typeof key==='number'?node.elements[key]:property(node,key);
    assert.equal(JSON.parse(node.getText(syntax)),update.before);edits.push({start:node.getStart(syntax),end:node.end,text:JSON.stringify(update.after)});
  }
  const pending=new Set(['open','needs-individual-review','security-review']);
  const closed=expected.entries.filter(row=>!pending.has(row.final_disposition)).length,open=1697-closed;
  const summary=[{field:'closed_dispositions',before:data.closed_dispositions,after:closed},{field:'open_or_deferred',before:data.open_or_deferred,after:open}].filter(row=>row.before!==row.after);
  assert.deepEqual(packet.summary_updates,summary);assert.equal(summary.length,line==='21.x'?2:0);
  assert.equal(packet.disposition_values_changed,line==='21.x'?3:0);
  for(const update of summary){const node=property(syntax.statements[0].expression,update.field);assert.equal(JSON.parse(node.getText(syntax)),update.before);expected[update.field]=update.after;
    edits.push({start:node.getStart(syntax),end:node.end,text:JSON.stringify(update.after)});}
  assert.equal(edits.length,line==='21.x'?16:14);let end=0;const chunks=[];
  for(const edit of edits.sort((a,b)=>a.start-b.start)){assert.ok(edit.start>=end);chunks.push(text.slice(end,edit.start),edit.text);end=edit.end;}chunks.push(text.slice(end));
  const after=Buffer.from(chunks.join(''));assert.equal(hash(after),packet.after_sha256);assert.deepEqual(JSON.parse(after),expected);assert.equal(expected.g11_claim,'not-passed');
  source.assertCurrent();return {before,after,individual_decisions:3,registry_digest_updates:11,summary_scalar_updates:summary.length,assertCurrent:source.assertCurrent};
}

// Finite wrapper transport metadata; original source reviews remain untouched.
const historicalWrapperPins={main:'3e8a3e66ae603768d60d22f646b19ec283e6c599b0df5274363533a7d70efd30','21.x':'a2d4e3cebf6306041a79336ccc9643f0b67a8fc3924fafbfb7ce60f393c80ead'};
function prepareHistoricalWrapperMetadataStage({root,read,line,before,bound}){
  const raw=read(HISTORICAL_WRAPPER_PACKET);assert.equal(hash(raw),historicalWrapperPins[line]);bound.set(HISTORICAL_WRAPPER_PACKET,hash(raw));
  const packet=JSON.parse(raw);assert.equal(packet.schema_version,1);assert.equal(packet.line,line);assert.equal(packet.before.path,ledgerPath);
  assert.equal(packet.before.entries,1697);assert.equal(packet.before.sha256,hash(before));assert.equal(packet.before.bytes,before.length);
  assert.equal(hash(gitBytes(root,packet.before.source_parent,ledgerPath)),hash(before));
  assert.equal(packet.metadata_entry_replacements,4);assert.equal(packet.source_reference_updates,4);assert.equal(packet.report_reference_updates,4);
  assert.equal(packet.report_digest_updates,4);assert.equal(packet.original_hunks_preserved,198);
  assert.equal(packet.original_dispositions_or_hunk_judgments_changed,0);assert.equal(packet.unrelated_entry_or_byte_changes,0);
  assert.equal(packet.actual_native_artifact_floor_or_G11_qualified,false);assert.equal(packet.g11_claim,'not-passed');
  assert.equal(packet.code_subject.path,'scripts/historical-chip-wrapper-metadata.mjs');selectionMember({root,read,line,ref:packet.code_subject,bound});
  const source=historicalChipWrapperMetadata({root,read,line});assert.equal(source.before.equals(before),true);
  assert.deepEqual(packet.qualification_members,source.bound);assert.deepEqual(packet.entries,source.entries);
  for(const ref of source.bound)selectionMember({root,read,line,ref,bound});
  for(const report of source.reports)assert.equal(selectionMember({root,read,line,ref:report.ref,bound}).equals(report.raw),true);
  const original=JSON.parse(before),expected=structuredClone(original);let text=before.toString();
  for(const change of packet.entries){
    const i=original.entries.findIndex(row=>row.sha===change.sha);assert.ok(i>=0);const prior=original.entries[i];assert.equal(hash(json(prior)),change.before_entry_sha256);
    const from=JSON.stringify(prior,null,2).replace(/\n/g,'\n    '),to=JSON.stringify(change.after_entry,null,2).replace(/\n/g,'\n    ');
    assert.equal(text.split(from).length,2,'wrapper metadata entry is not one exact literal');text=text.replace(from,to);expected.entries[i]=change.after_entry;
  }
  const after=Buffer.from(text);assert.equal(hash(after),packet.after_sha256);assert.equal(after.length,packet.after_bytes);assert.deepEqual(JSON.parse(after),expected);
  source.assertCurrent();return {before,after,metadata_entries:4,source_reference_updates:4,original_hunks_preserved:198,individual_decisions:0,assertCurrent:source.assertCurrent};
}

// Exact 65-entry transport-reference successor; no new individual decisions.
const consumerWrapperPins={main:'374a5bd7cb371679f0fb166822fd153a0a4b6445ab2496767bcc66452c972935','21.x':'fd028ae0b6b506d0bee6f5f540fd39360a545e0b6c00627dc48bff00bf1f5825'};
function prepareHistoricalConsumerWrapperMetadataStage({root,read,line,before,bound}){
  const raw=read(CONSUMER_WRAPPER_PACKET);assert.equal(hash(raw),consumerWrapperPins[line]);bound.set(CONSUMER_WRAPPER_PACKET,hash(raw));
  const packet=JSON.parse(raw);assert.equal(packet.schema_version,1);assert.equal(packet.line,line);assert.equal(packet.before.path,ledgerPath);
  assert.equal(packet.before.entries,1697);assert.equal(packet.before.sha256,hash(before));assert.equal(packet.before.bytes,before.length);
  assert.equal(hash(gitBytes(root,packet.before.source_parent,ledgerPath)),hash(before));
  assert.equal(packet.metadata_entry_replacements,65);assert.equal(packet.source_reference_updates,65);assert.equal(packet.report_reference_updates,65);
  assert.equal(packet.report_digest_updates,65);assert.equal(packet.original_hunks_preserved,7770);
  assert.equal(packet.original_dispositions_or_hunk_judgments_changed,0);assert.equal(packet.unrelated_entry_or_byte_changes,0);assert.equal(packet.new_upstream_SHA_decisions,0);
  assert.equal(packet.actual_native_artifact_floor_or_G11_qualified,false);assert.equal(packet.g11_claim,'not-passed');
  assert.equal(packet.code_subject.path,'scripts/historical-consumer-wrapper-metadata.mjs');selectionMember({root,read,line,ref:packet.code_subject,bound});
  const source=historicalConsumerWrapperMetadata({root,read,line});assert.equal(source.before.equals(before),true);
  assert.deepEqual(packet.qualification_members,source.bound);assert.deepEqual(packet.entries,source.entries);
  for(const ref of source.bound)selectionMember({root,read,line,ref,bound});
  for(const report of source.reports)assert.equal(selectionMember({root,read,line,ref:report.ref,bound}).equals(report.raw),true);
  assert.equal(hash(source.after),packet.after_sha256);assert.equal(source.after.length,packet.after_bytes);
  source.assertCurrent();return source;
}

function prepareLegacySassEntrypointStage({root,read,line,before,bound}){
  assert.equal(line,'21.x');
  assert.equal(hash(before),'c444a0532332e11c1bfb4f737135a0710909a1a6f91332f8327e8ed2e0174ac3');
  assert.equal(before.equals(gitBytes(root,'518be10d4de943ebfef51854d9c013cde2afbefe',ledgerPath)),true);
  const code='scripts/upstream-legacy-sass-entrypoint-admission.mjs';
  const codeHash='1e3e277e3d40976dc970c6adfc0c03be43300239d7e37b14efed3415cd2e8ede';
  assert.equal(hash(read(code)),codeHash);bound.set(code,codeHash);
  const source=inspectLegacySassEntrypointReview({root,read,line});
  for(const [path,digest]of source.bound)bound.set(path,digest);
  const original=JSON.parse(before),expected=structuredClone(original);
  assert.equal(original.entries.length,1697);assert.equal(new Set(original.entries.map(row=>row.sha)).size,1697);
  assert.equal(original.closed_dispositions,356);assert.equal(original.open_or_deferred,1341);
  const index=original.entries.findIndex(row=>row.sha===LEGACY_SASS_ENTRYPOINT_SHA);assert.ok(index>=0);
  const prior=original.entries[index];assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
  const entry={...structuredClone(prior),final_disposition:'not-applicable',reason:source.body.decision,
    review_depth:'individual-compatibility',evidence_report:LEGACY_SASS_ENTRYPOINT_REVIEW,
    individual_proof:legacySassEntrypointProof(source.body)};
  assert.deepEqual(prior.files,source.body.frozen_seed_paths);assert.deepEqual(prior.affected_branches,['21.x']);
  assert.equal(prior.g11_claim,'not-passed');
  expected.entries[index]=entry;expected.closed_dispositions=357;expected.open_or_deferred=1340;
  let text=replaceHistoricalConsumerEntries(before,[{sha:entry.sha,after_entry:entry}]).toString();
  const marker='"entries": [',split=text.indexOf(marker);assert.ok(split>=0);let header=text.slice(0,split);
  for(const [key,from,to]of [['closed_dispositions',356,357],['open_or_deferred',1341,1340]]){
    const old='  "'+key+'": '+from+',',next='  "'+key+'": '+to+',';
    assert.equal(header.split(old).length,2);header=header.replace(old,next);
  }
  const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
  assert.equal(hash(after),'fbefd5a78fd9d09694567a59636e6452cb1f08ef668f4b6596378662ab00b355');
  const assertCurrent=()=>{
    assert.equal(hash(read(code)),codeHash,'late Sass entrypoint admission code');
    const current=inspectLegacySassEntrypointReview({root,read,line});
    assert.deepEqual([...current.bound],[...source.bound],'late Sass entrypoint input membership');
  };
  assertCurrent();return {before,after,individual_decisions:1,unselected_entries_preserved:1696,assertCurrent};
}

function prepareCheckerReferenceMetadataStage({root,read,line,before,bound}){
  const path='scripts/checker-reference-metadata.mjs',digest='f5284108bffa5b61f0183727f199f87b9a07fc831f8f1f976f99e05fa1ed7448';
  assert.equal(hash(read(path)),digest,'changed checker reference metadata owner');bound.set(path,digest);
  const source=checkerReferenceMetadata({root,read,line});assert.equal(source.before.equals(before),true);
  for(const ref of source.bound)bound.set(ref.path,ref.sha256);
  return source;
}

function prepareTokenBuildStage({root,read,line,before,bound}){
  assert.equal(line,'21.x');assert.equal(hash(before),'d015c3d9cca4b9ea489da7028ab5a8bcd675adf428db3000ed60c0b2380f0e27');
  assert.equal(before.equals(gitBytes(root,'0860e78b3ba8172c0997819469e9a077b6f6b37e',ledgerPath)),true);
  const helper='scripts/upstream-token-build-admission.cjs',helperHash='5c08612205d22f6549a08d7a23452a51ef92dfa9e74dc94e1181b4c9ded1af69';
  assert.equal(hash(read(helper)),helperHash);bound.set(helper,helperHash);
  const scopePath='scripts/upstream-individual-evidence-scope.mjs';
  let scope=gitBytes(root,'0860e78b3ba8172c0997819469e9a077b6f6b37e',scopePath).toString();
  const edits=[
  [
    "const finalStates=new Set(",
    "import {createRequire} from 'node:module';\nimport {sourceContractDefinitions} from './upstream-source-contract-registry.mjs';\nconst require=createRequire(import.meta.url);\nconst registeredShas=new Set();\nfor(const definition of sourceContractDefinitions){\n if(Object.getPrototypeOf(definition)!==Object.prototype||Object.keys(definition).sort().join(',')!=='module,proof_kind,scope_key,sha'\n   ||!/^[0-9a-f]{40}$/.test(definition.sha)||registeredShas.has(definition.sha)\n   ||!/^individual-[a-z0-9-]+$/.test(definition.proof_kind)||!/^[_a-z][_a-z0-9]*$/.test(definition.scope_key)\n   ||!/^upstream-[a-z0-9-]+-admission\\.cjs$/.test(definition.module))throw new Error('Invalid individual source-contract registration');\n registeredShas.add(definition.sha);Object.freeze(definition);\n}\nObject.freeze(sourceContractDefinitions);\nfunction sourceContract(entry,proof){\n const direct=sourceContractDefinitions.find(definition=>definition.sha===entry?.sha);if(direct)return direct;\n const hinted=sourceContractDefinitions.some(definition=>[proof,entry?.individual_proof].some(value=>value?.proof_kind===definition.proof_kind||value?.[definition.scope_key]!==undefined));\n return hinted?false:null;\n}\nconst finalStates=new Set("
  ],
  [
    " if(!object(entry)||!object(body)||!object(review)||(proof!==undefined&&!object(proof)))return false;",
    " if(!object(entry)||!object(body)||!object(review)||(proof!==undefined&&!object(proof)))return false;\n const contract=sourceContract(entry,proof);if(contract===false)return false;\n if(contract){\n  try{if(require('./'+contract.module).metadataOk({entry,body,review,proof})!==true)return false;}catch{return false;}\n }"
  ],
  [
    " if((requiresIndividual||claimsBehavior)&&sourcePresenceKinds.has(proof.proof_kind))return false;",
    " if((requiresIndividual||claimsBehavior)&&sourcePresenceKinds.has(proof.proof_kind))return false;\n const contract=sourceContract(entry,proof);if(contract===false)return false;\n if(contract){\n  try{return require('./'+contract.module).sourceOk({entry,body,review,proof})===true;}catch{return false;}\n }"
  ]
];
  for(const [from,to]of edits){assert.equal(scope.split(from).length,2);scope=scope.replace(from,to);}
  assert.equal(read(scopePath).toString(),scope,'unqualified token-build scope integration');bound.set(scopePath,hash(scope));
  // This reviewed registry is source code restricted to literal routing data.
  // Later registrations retain the fixed dispatcher and this exact decision.
  const registryPath='scripts/upstream-source-contract-registry.mjs',registryRaw=read(registryPath);
  const registry=ts.createSourceFile(registryPath,registryRaw.toString(),ts.ScriptTarget.Latest,true);
  assert.equal(registry.parseDiagnostics.length,0);assert.equal(registry.statements.length,1);
  const declaration=registry.statements[0];assert.ok(ts.isVariableStatement(declaration));
  assert.equal(declaration.modifiers?.length,1);assert.equal(declaration.modifiers[0].kind,ts.SyntaxKind.ExportKeyword);
  assert.equal(declaration.declarationList.declarations.length,1);assert.ok(declaration.declarationList.flags&ts.NodeFlags.Const);
  const definition=declaration.declarationList.declarations[0];assert.equal(definition.name.getText(registry),'sourceContractDefinitions');
  assert.ok(ts.isArrayLiteralExpression(definition.initializer));const definitions=[];
  for(const row of definition.initializer.elements){
    assert.ok(ts.isObjectLiteralExpression(row));const value={};
    for(const field of row.properties){
      assert.ok(ts.isPropertyAssignment(field)&&ts.isStringLiteral(field.initializer));
      const key=field.name.text;assert.ok(['sha','proof_kind','scope_key','module'].includes(key));assert.equal(Object.hasOwn(value,key),false);
      value[key]=field.initializer.text;
    }
    assert.deepEqual(Object.keys(value).sort(),['module','proof_kind','scope_key','sha']);
    assert.match(value.sha,/^[0-9a-f]{40}$/);assert.match(value.proof_kind,/^individual-[a-z0-9-]+$/);
    assert.match(value.scope_key,/^[_a-z][_a-z0-9]*$/);assert.match(value.module,/^upstream-[a-z0-9-]+-admission\.cjs$/);definitions.push(value);
  }
  assert.equal(new Set(definitions.map(row=>row.sha)).size,definitions.length);assert.deepEqual(definitions,sourceContractDefinitions);
  assert.deepEqual(definitions.find(row=>row.sha===tokenBuildAdmission.TOKEN_BUILD_SHA),{sha:tokenBuildAdmission.TOKEN_BUILD_SHA,
    proof_kind:'individual-owned-mdc-token-validation',scope_key:'mdc_token_source_scope',module:'upstream-token-build-admission.cjs'});
  const knownShas=new Set(JSON.parse(before).entries.map(row=>row.sha));assert.ok(definitions.every(row=>knownShas.has(row.sha)));
  bound.set(registryPath,hash(registryRaw));
  const source=tokenBuildAdmission.inspectTokenBuildSource({root,read});for(const ref of source.bound)bound.set(ref.path,ref.sha256);
  const original=JSON.parse(before),expected=structuredClone(original),index=original.entries.findIndex(row=>row.sha===tokenBuildAdmission.TOKEN_BUILD_SHA);assert.ok(index>=0);
  const prior=original.entries[index];assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
  assert.equal(original.closed_dispositions,357);assert.equal(original.open_or_deferred,1340);
  const entry={...structuredClone(prior),final_disposition:'already-adapted',reason:source.body.decision,review_depth:'individual-compatibility',
    evidence_report:tokenBuildAdmission.TOKEN_BUILD_REVIEW,individual_proof:tokenBuildAdmission.tokenBuildProof(source.body)};
  assert.equal(tokenBuildAdmission.tokenBuildSourceOk({root,read,entry,body:source.body,review:source.body,proof:entry.individual_proof}),true);
  expected.entries[index]=entry;expected.closed_dispositions=358;expected.open_or_deferred=1339;
  const text=replaceHistoricalConsumerEntries(before,[{sha:entry.sha,after_entry:entry}]).toString(),marker='"entries": [',split=text.indexOf(marker);assert.ok(split>=0);
  let header=text.slice(0,split);
  for(const [key,from,to]of [['closed_dispositions',357,358],['open_or_deferred',1340,1339]]){
    const old='  "'+key+'": '+from+',',next='  "'+key+'": '+to+',';assert.equal(header.split(old).length,2);header=header.replace(old,next);
  }
  const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
  assert.equal(hash(after),'65273c52bd8435614ff51212bc454cc9b7ed266557b0b6276bdd9e70b36e6ef3');
  source.assertCurrent();return {before,after,individual_decisions:1,unselected_entries_preserved:1696,assertCurrent:source.assertCurrent};
}

function prepareUnthemedStage({root,read,before,bound}){
  assert.equal(hash(before),'65273c52bd8435614ff51212bc454cc9b7ed266557b0b6276bdd9e70b36e6ef3');
  assert.equal(before.equals(gitBytes(root,'e5f713f9d7eb088da729aec53835041dd6ffc521',ledgerPath)),true);
  const helper='scripts/upstream-unthemable-token-admission.cjs',digest='66068054b0eb25fd494a5bd4ade24bd6b452222badfcfd2bdd6a74d211f96c54';
  assert.equal(hash(read(helper)),digest);bound.set(helper,digest);
  for(const sha of unthemedAdmission.UNTHEMED_SHAS)assert.deepEqual(sourceContractDefinitions.find(row=>row.sha===sha),{
    sha,proof_kind:'individual-historical-base-token-source-exclusion',scope_key:'unthemable_token_source_scope',module:'upstream-unthemable-token-admission.cjs'});
  const source=unthemedAdmission.inspectUnthemedSource({root,read});for(const ref of source.bound)bound.set(ref.path,ref.sha256);
  const original=JSON.parse(before),expected=structuredClone(original),replacements=[];
  assert.equal(original.closed_dispositions,358);assert.equal(original.open_or_deferred,1339);
  for(const row of source.body.reviews){
    const index=expected.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);const prior=expected.entries[index];
    assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
    const entry={...prior,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',
      evidence_report:unthemedAdmission.UNTHEMED_REVIEW,individual_proof:unthemedAdmission.unthemedProof(row)};
    assert.equal(unthemedAdmission.unthemedSourceOk({root,read,entry,body:source.body,review:row,proof:entry.individual_proof}),true);
    expected.entries[index]=entry;replacements.push({sha:row.sha,after_entry:entry});
  }
  assert.equal(replacements.length,5);expected.closed_dispositions=363;expected.open_or_deferred=1334;
  const text=replaceHistoricalConsumerEntries(before,replacements).toString(),marker='"entries": [',split=text.indexOf(marker);assert.ok(split>=0);
  let header=text.slice(0,split);
  for(const [key,from,to]of [['closed_dispositions',358,363],['open_or_deferred',1339,1334]]){
    const old='  "'+key+'": '+from+',',next='  "'+key+'": '+to+',';assert.equal(header.split(old).length,2);header=header.replace(old,next);
  }
  const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
  assert.equal(hash(after),'a19edf5beb6479065bef5c4a08b1b0988118f5fd4ed5f42c7def6f900c7fe911');
  source.assertCurrent();return {before,after,individual_decisions:5,unselected_entries_preserved:1692,assertCurrent:source.assertCurrent};
}

function prepareControlBaseStage({root,read,before,bound}){
  assert.equal(hash(before),'1a6efeb50fff4ab828deff45262c0686dfc1bbed1c3fe118983882ac44990829');
  assert.equal(before.equals(gitBytes(root,'051c1e83402f38fed1073aefeb965b2115875246',ledgerPath)),true);
  const helper='scripts/upstream-modern-control-base-admission.cjs',digest='c2b7a513fe5ce11176f98c4727177b67347aa2af5e60afd83661f192fae241d8';
  assert.equal(hash(read(helper)),digest);bound.set(helper,digest);
  for(const sha of controlBaseAdmission.CONTROL_SHAS)assert.deepEqual(sourceContractDefinitions.find(row=>row.sha===sha),{
    sha,proof_kind:'individual-historical-modern-control-base-source-exclusion',scope_key:'modern_control_base_source_scope',module:'upstream-modern-control-base-admission.cjs'});
  const source=controlBaseAdmission.inspectControlSource({root,read});for(const ref of source.bound)bound.set(ref.path,ref.sha256);
  const original=JSON.parse(before),expected=structuredClone(original),replacements=[];
  assert.equal(original.closed_dispositions,363);assert.equal(original.open_or_deferred,1334);
  for(const row of source.body.reviews){
    const index=expected.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);const prior=expected.entries[index];
    assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
    const entry={...prior,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',
      evidence_report:controlBaseAdmission.CONTROL_REVIEW,individual_proof:controlBaseAdmission.controlProof(row)};
    assert.equal(controlBaseAdmission.sourceOk({root,read,entry,body:source.body,review:row,proof:entry.individual_proof}),true);
    expected.entries[index]=entry;replacements.push({sha:row.sha,after_entry:entry});
  }
  assert.equal(replacements.length,4);expected.closed_dispositions=367;expected.open_or_deferred=1330;
  const text=replaceHistoricalConsumerEntries(before,replacements).toString(),marker='"entries": [',split=text.indexOf(marker);assert.ok(split>=0);
  let header=text.slice(0,split);
  for(const [key,from,to]of [['closed_dispositions',363,367],['open_or_deferred',1334,1330]]){
    const old='  "'+key+'": '+from+',',next='  "'+key+'": '+to+',';assert.equal(header.split(old).length,2);header=header.replace(old,next);
  }
  const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
  assert.equal(hash(after),'a49a8cb75dbae848b07c642d37a23495c50abfb49baadcfce9ec4c3a39b63908');
  source.assertCurrent();return {before,after,individual_decisions:4,unselected_entries_preserved:1693,assertCurrent:source.assertCurrent};
}

function prepareTokenRootStage({root,read,before,bound}){
  assert.equal(hash(before),'a49a8cb75dbae848b07c642d37a23495c50abfb49baadcfce9ec4c3a39b63908');
  assert.equal(before.equals(gitBytes(root,'9a915e6fe464e6bc1a83f79c0fbeb8980a8bb89d',ledgerPath)),true);
  const helper='scripts/upstream-theme-token-root-admission.cjs',digest='c4ba7a1af3f2d62f57c4926eb55c05d81bef86bae67bebed41ee4079b1b05396';
  assert.equal(hash(read(helper)),digest);bound.set(helper,digest);
  for(const sha of tokenRootAdmission.ROOT_SHAS)assert.deepEqual(sourceContractDefinitions.find(row=>row.sha===sha),{
    sha,proof_kind:'individual-historical-token-root-source-exclusion',scope_key:'theme_token_root_source_scope',module:'upstream-theme-token-root-admission.cjs'});
  const source=tokenRootAdmission.inspectRootSource({root,read});for(const ref of source.bound)bound.set(ref.path,ref.sha256);
  const original=JSON.parse(before),expected=structuredClone(original),replacements=[];
  assert.equal(original.closed_dispositions,367);assert.equal(original.open_or_deferred,1330);
  for(const row of source.body.reviews){
    const index=expected.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);const prior=expected.entries[index];
    assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
    const entry={...prior,final_disposition:'do-not-adopt',reason:row.decision,review_depth:'individual-compatibility',
      evidence_report:tokenRootAdmission.ROOT_REVIEW,individual_proof:tokenRootAdmission.rootProof(row)};
    assert.equal(tokenRootAdmission.sourceOk({root,read,entry,body:source.body,review:row,proof:entry.individual_proof}),true);
    expected.entries[index]=entry;replacements.push({sha:row.sha,after_entry:entry});
  }
  assert.equal(replacements.length,2);expected.closed_dispositions=369;expected.open_or_deferred=1328;
  const text=replaceHistoricalConsumerEntries(before,replacements).toString(),marker='"entries": [',split=text.indexOf(marker);assert.ok(split>=0);
  let header=text.slice(0,split);
  for(const [key,from,to]of [['closed_dispositions',367,369],['open_or_deferred',1330,1328]]){
    const old='  "'+key+'": '+from+',',next='  "'+key+'": '+to+',';assert.equal(header.split(old).length,2);header=header.replace(old,next);
  }
  const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
  assert.equal(hash(after),'3d892ed786c3267965eff7a1bb833a6e6982341c5430699780f7f92c71574a5c');
  source.assertCurrent();return {before,after,individual_decisions:2,unselected_entries_preserved:1695,assertCurrent:source.assertCurrent};
}

function prepareFieldTokenStage({root,read,before,bound}){
  assert.equal(hash(before),'3d892ed786c3267965eff7a1bb833a6e6982341c5430699780f7f92c71574a5c');
  assert.equal(before.equals(gitBytes(root,'d026dd06511ea9bba6def16619ae0e387a9ac074',ledgerPath)),true);
  const helper='scripts/upstream-form-field-tokenization-admission.cjs',digest='572d56dcf9271059aabb664f79483f05beece158646f9e0214eaf4a91048ff1e';
  assert.equal(hash(read(helper)),digest);bound.set(helper,digest);
  for(const sha of fieldTokenAdmission.FIELD_SHAS)assert.deepEqual(sourceContractDefinitions.find(row=>row.sha===sha),{
    sha,proof_kind:'individual-historical-form-field-tokenization-source-review',scope_key:'form_field_tokenization_source_scope',module:'upstream-form-field-tokenization-admission.cjs'});
  const source=fieldTokenAdmission.inspectFieldSource({root,read});for(const ref of source.bound)bound.set(ref.path,ref.sha256);
  const original=JSON.parse(before),expected=structuredClone(original),replacements=[];
  assert.equal(original.closed_dispositions,369);assert.equal(original.open_or_deferred,1328);
  for(const row of source.body.reviews){
    const index=expected.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);const prior=expected.entries[index];
    assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
    const entry={...prior,final_disposition:row.proposed_final_disposition,reason:row.decision,review_depth:'individual-compatibility',
      evidence_report:fieldTokenAdmission.FIELD_REVIEW,individual_proof:fieldTokenAdmission.fieldProof(row)};
    assert.equal(fieldTokenAdmission.sourceOk({root,read,entry,body:source.body,review:row,proof:entry.individual_proof}),true);
    expected.entries[index]=entry;replacements.push({sha:row.sha,after_entry:entry});
  }
  assert.equal(replacements.length,2);expected.closed_dispositions=371;expected.open_or_deferred=1326;
  const text=replaceHistoricalConsumerEntries(before,replacements).toString(),marker='"entries": [',split=text.indexOf(marker);assert.ok(split>=0);
  let header=text.slice(0,split);
  for(const [key,from,to]of [['closed_dispositions',369,371],['open_or_deferred',1328,1326]]){
    const old='  "'+key+'": '+from+',',next='  "'+key+'": '+to+',';assert.equal(header.split(old).length,2);header=header.replace(old,next);
  }
  const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
  assert.equal(hash(after),'ad496e9e699918951057987997121de26e0e66a2c92940316658ae01a49df49a');
  source.assertCurrent();return {before,after,individual_decisions:2,unselected_entries_preserved:1695,assertCurrent:source.assertCurrent};
}

function prepareBoundaryStage({root,read,before,bound}){
  assert.equal(hash(before),'ad496e9e699918951057987997121de26e0e66a2c92940316658ae01a49df49a');
  assert.equal(before.equals(gitBytes(root,'6e54c9a1c3dad72f65b048f8f19cb7faa18729dc',ledgerPath)),true);
  const helper='scripts/upstream-m3-theme-boundary-admission.cjs',digest='0f849a2c0230e7ebeb496fad34cbd9ecd5c4cb6d15ead8cdbff6181223221e27';
  assert.equal(hash(read(helper)),digest);bound.set(helper,digest);
  for(const sha of boundaryAdmission.BOUNDARY_SHAS)assert.deepEqual(sourceContractDefinitions.find(row=>row.sha===sha),{
    sha,proof_kind:'individual-historical-m3-theme-boundary-source-review',scope_key:'m3_theme_boundary_source_scope',module:'upstream-m3-theme-boundary-admission.cjs'});
  const source=boundaryAdmission.inspectBoundarySource({root,read});for(const ref of source.bound)bound.set(ref.path,ref.sha256);
  const original=JSON.parse(before),expected=structuredClone(original),replacements=[];
  assert.equal(original.closed_dispositions,371);assert.equal(original.open_or_deferred,1326);
  for(const row of source.body.reviews){
    const index=expected.entries.findIndex(entry=>entry.sha===row.sha);assert.ok(index>=0);const prior=expected.entries[index];
    assert.equal(prior.final_disposition,'needs-individual-review');assert.equal(prior.evidence_report,null);
    const entry={...prior,final_disposition:row.proposed_final_disposition,reason:row.decision,review_depth:'individual-compatibility',
      evidence_report:boundaryAdmission.BOUNDARY_REVIEW,individual_proof:boundaryAdmission.boundaryProof(row)};
    assert.equal(boundaryAdmission.sourceOk({root,read,entry,body:source.body,review:row,proof:entry.individual_proof}),true);
    expected.entries[index]=entry;replacements.push({sha:row.sha,after_entry:entry});
  }
  assert.equal(replacements.length,5);expected.closed_dispositions=376;expected.open_or_deferred=1321;
  const text=replaceHistoricalConsumerEntries(before,replacements).toString(),marker='"entries": [',split=text.indexOf(marker);assert.ok(split>=0);
  let header=text.slice(0,split);
  for(const [key,from,to]of [['closed_dispositions',371,376],['open_or_deferred',1326,1321]]){
    const old='  "'+key+'": '+from+',',next='  "'+key+'": '+to+',';assert.equal(header.split(old).length,2);header=header.replace(old,next);
  }
  const after=Buffer.from(header+text.slice(split));assert.deepEqual(JSON.parse(after),expected);
  assert.equal(hash(after),'22f775835030f175795d8865e9b30920b0b7fea5b908cbd6a9dca7775a71d779');
  source.assertCurrent();return {before,after,individual_decisions:5,unselected_entries_preserved:1692,assertCurrent:source.assertCurrent};
}

export function preparePackedUpstreamLedger({root = process.cwd(), read = disk(root)} = {}) {
  read = packedUpstreamLedgerRawRead({root, read});
  const input = read(inputPath), line = Object.keys(subjects).find(name => subjects[name].sha256 === hash(input));
  assert.ok(line, 'changed qualified upstream inputs');
  const currentRead=read,registeredChecker=line==='21.x'?registeredSourceCheckerTransition({root,read:currentRead}):null;
  if(registeredChecker)read=registeredChecker.beforeRead;
  const data = JSON.parse(input), authority = subjects[line].authority;
  assert.equal(data.line, line); assert.equal(data.schema_version, 1);
  assert.equal(JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.') ? '21.x' : 'main', line);
  assert.equal(hash(gitBytes(root, authority, inputPath)), hash(input));
  assert.equal(data.current_native_packed_or_floor_qualified, false);
  assert.equal(data.new_upstream_SHA_decisions, 0); assert.equal(data.original_hunk_judgments_or_dispositions_changed, 0);
  assert.equal(data.before_ledger.path, ledgerPath); assert.equal(data.before_ledger.entries, 1697);
  const before = gitBytes(root, data.before_ledger.source_parent, ledgerPath);
  assert.equal(hash(before), data.before_ledger.sha256);
  const bound = new Map([[inputPath, hash(input)]]);
  // Scope checks bracket the complete preparation instead of rereading every
  // scope member for each unrelated member. Individual reads still check their
  // own digest, and returned epoch readers retain their full late-change gate.
  const specReaders=selectionReaders(root,read,line);specReaders.assertCurrent();for(const ref of specReaders.bound)bound.set(ref.path,ref.sha256);
  const nativeSubjects=selectionNative(root,read,line);for(const ref of nativeSubjects.bound)bound.set(ref.path,ref.sha256);
  function member(ref, authenticate = false) {
    const raw=selectionMember({root,read,line,ref,bound});
    if (authenticate) assert.equal(hash(gitBytes(root, authority, ref.path)), ref.sha256);
    return raw;
  }
  const packet = JSON.parse(gunzipSync(member(data.transition, true)));
  const validation = JSON.parse(gunzipSync(member(data.validation, true)));
  assert.equal(packet.line, line); assert.equal(packet.entries.length, 85);
  assert.equal(packet.new_upstream_SHA_decisions, 0); assert.equal(packet.original_reviews_or_dispositions_changed, 0);
  assert.equal(validation.line, line); assert.equal(validation.results.length, 85);
  assert.deepEqual(validation.failed, []); assert.equal(validation.canonical_applied, false);
  assert.ok(validation.results.every(row => row.valid === true));
  assert.deepEqual(validation.results.map(row => row.sha).sort(), packet.entries.map(row => row.sha).sort());
  member(data.producer, true);
  const syntaxPath = 'compatibility/rc/packed-upstream-bazel-current-syntax-epoch.json.gz';
  const syntaxRef = {path: syntaxPath, sha256: hash(gitBytes(root, authority, syntaxPath))};
  const syntax = JSON.parse(gunzipSync(member(syntaxRef, true)));
  assert.equal(syntax.line, line); assert.equal(pythonVersion(), syntax.current_pinned_python,
    'changed source-analysis Python');
  for (const ref of data.validation_code_subjects) {
    if (ref.path === ownerPath) {
      let owner = gitBytes(root, authority, ownerPath).toString(); assert.equal(hash(owner), ref.sha256);
      for (const [from, to] of ownerEdits) {assert.equal(owner.split(from).length, 2); owner = owner.replace(from, to);}
      const priorOwner=specReaders.historicalMetadataReference(ownerPath);
      assert.equal(hash(owner),priorOwner.sha256,'changed original source-owner ledger integration');
      member({...priorOwner,bytes:Buffer.byteLength(owner)});
    } else if (ref.path === testingApiChecker) {
      let checker = gitBytes(root, authority, ref.path).toString(); assert.equal(hash(checker), ref.sha256);
      if (line === '21.x') for (const [from, to] of testingApiCheckerEdits) {assert.equal(checker.split(from).length, 2); checker = checker.replace(from, to);}
      checker = legacySassEntrypointCheckerSuccessor(rulesJsCheckerSuccessor(sassCheckerSuccessor(checker)));
      assert.equal(read(ref.path).toString(), checker, 'unqualified finite source-decision checker integration');
      bound.set(ref.path, hash(checker));
    } else if(ref.path===autocompleteRegistryPath) {
      qualifyAutocompleteRegistry({root,read,line,ref,bound});
    } else member(ref);
  }
  const reports = new Map(); assert.equal(data.reports.length, 12);
  for (const report of data.reports) {
    const old = JSON.parse(member(report.before)), current = JSON.parse(member(report.after, true));
    assert.deepEqual(current[report.original_review_field], old[report.original_review_field]);
    assert.equal(hash(json(current[report.original_review_field])), report.original_reviews_sha256);
    reports.set(report.after.path, current);
  }
  const context = reports.get('compatibility/rc/packed-upstream-source-build.json').candidate_context;
  const bazel = reports.get('compatibility/rc/packed-upstream-source-bazel.json');
  assert.equal(bazel.source_analysis.compiler, ts.version, 'changed source-analysis compiler');
  assert.equal(context.product_members.length, 1142);
  for (const ref of [...context.product_members, ...context.files, ...bazel.candidate_context.files]) {
    const raw = member(ref); assert.equal(raw.length,(specReaders.qualify(ref)??ref).bytes);
  }
  const population = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--',
    'projects/ngx-material-legacy'], {cwd: root, encoding: 'utf8'}).trim().split('\n').sort();
  assert.deepEqual(population, context.product_members.map(ref => ref.path).sort());
  const expected = JSON.parse(before);
  for (const change of packet.entries) {
    const index = expected.entries.findIndex(entry => entry.sha === change.sha); assert.ok(index >= 0);
    const previous = expected.entries[index], current = change.after_entry;
    assert.equal(hash(json(previous)), change.before_entry_sha256);
    for (const field of ['sha', 'final_disposition', 'reason', 'files', 'review_depth', 'affected_branches'])
      assert.deepEqual(current[field], previous[field], 'changed original upstream judgment ' + field);
    assert.ok(reports.has(current.evidence_report));
    expected.entries[index] = current;
  }
  const after = applyTokens(before, packet);
  assert.equal(hash(after), data.after_ledger_sha256); assert.deepEqual(JSON.parse(after), expected);
  const next = line === '21.x' ? prepareTestingApiStage({root, read, before: after, bound, population}) : null;
  const sass = prepareSassStage({root,read,line,before:next?.after??after,bound});
  const rulesJs = prepareRulesJsStage({root,read,line,before:sass.after,bound});
  const summary = prepareSummaryStage({root,read,line,before:rulesJs.after,bound});
  const landscape=prepareAutocompleteLandscapeStage({root,read,line,before:summary.after,bound});
  const nativeSpec=prepareSelectionSpecMetadata({root,read,line,before:landscape.after,bound,currentSource:landscape.current_source});
  const nativeSelection=prepareSelectionNativeStage({root,read,line,before:nativeSpec.after,bound});
  const historicalWrapper=prepareHistoricalWrapperMetadataStage({root,read,line,before:nativeSelection.after,bound});
  const consumerWrapper=prepareHistoricalConsumerWrapperMetadataStage({root,read,line,before:historicalWrapper.after,bound});
  const sassEntrypoint=line==='21.x'?prepareLegacySassEntrypointStage({root,read,line,before:consumerWrapper.after,bound}):null;
  const checkerMetadata=line==='21.x'?prepareCheckerReferenceMetadataStage({root,read,line,before:sassEntrypoint.after,bound}):null;
  const tokenBuild=line==='21.x'?prepareTokenBuildStage({root,read,line,before:checkerMetadata.after,bound}):null;
  const unthemed=line==='21.x'?prepareUnthemedStage({root,read:currentRead,before:tokenBuild.after,bound}):null;
  const registeredMetadata=line==='21.x'?refreshRegisteredCheckerReferences({root,read:currentRead,before:unthemed.after}):null;
  if(registeredMetadata){assert.equal(hash(registeredMetadata.after),'1a6efeb50fff4ab828deff45262c0686dfc1bbed1c3fe118983882ac44990829');for(const ref of registeredMetadata.bound)bound.set(ref.path,ref.sha256);
    const path='scripts/registered-source-checker-transition.mjs',digest='b78c455045b7144b3b3a04ee3a39c84a5dd0ea3509ad10507b2d1b399bf8eac4';assert.equal(hash(currentRead(path)),digest);bound.set(path,digest);}
  const controlBase=line==='21.x'?prepareControlBaseStage({root,read:currentRead,before:registeredMetadata.after,bound}):null;
  const tokenRoot=line==='21.x'?prepareTokenRootStage({root,read:currentRead,before:controlBase.after,bound}):null;
  const fieldToken=line==='21.x'?prepareFieldTokenStage({root,read:currentRead,before:tokenRoot.after,bound}):null;
  const boundary=line==='21.x'?prepareBoundaryStage({root,read:currentRead,before:fieldToken.after,bound}):null;
  specReaders.assertCurrent();
  return {line, before, after, canonical_after:boundary?.after??fieldToken?.after??tokenRoot?.after??controlBase?.after??registeredMetadata?.after??consumerWrapper.after,modern_control_base_stage:controlBase,theme_token_root_stage:tokenRoot,form_field_tokenization_stage:fieldToken,m3_theme_boundary_stage:boundary,registered_checker_metadata_stage:registeredMetadata,unthemable_stage:unthemed,token_build_stage:tokenBuild,checker_reference_metadata_stage:checkerMetadata,legacy_sass_entrypoint_stage:sassEntrypoint,historical_consumer_wrapper_metadata_stage:consumerWrapper,historical_wrapper_metadata_stage:historicalWrapper, selection_native_stage:nativeSelection, testing_api_stage: next, sass_stage: sass, rules_js_stage:rulesJs, summary_stage:summary, autocomplete_landscape_stage:landscape, native_spec_source:{assertCurrent:specReaders.assertCurrent,bound:structuredClone(specReaders.bound),spec:{path:specReaders.spec.path,line,before:{...specReaders.spec.before},after:{...specReaders.spec.after}}}, native_spec_metadata_stage:nativeSpec, bound, population, analysis_python_version: syntax.current_pinned_python,
    input_sha256: hash(input),
    entries_changed: 85, scalar_tokens_changed: 179, source_scope_only: true,
    current_native_packed_or_floor_qualified: false};
}

/** A before-image is available only for this exact, continuously checked ledger. */
export function packedUpstreamLedgerEpoch({root = process.cwd(), read = disk(root)} = {}) {
  read = packedUpstreamLedgerRawRead({root, read});
  const prepared = preparePackedUpstreamLedger({root, read});
  const current = hash(read(ledgerPath)), beforeHash = hash(prepared.before), afterHash = hash(prepared.after);
  const canonicalHash=hash(prepared.canonical_after),nativeSelectionHash=hash(prepared.selection_native_stage.after);
  const noticeMetadataHash=prepared.sass_notice_metadata_stage?hash(prepared.sass_notice_metadata_stage.after):null;
  const historicalWrapperHash=hash(prepared.historical_wrapper_metadata_stage.after);
  const consumerWrapperHash=hash(prepared.historical_consumer_wrapper_metadata_stage.after);
  const sassEntrypointHash=prepared.legacy_sass_entrypoint_stage?hash(prepared.legacy_sass_entrypoint_stage.after):null;
  const checkerMetadataHash=prepared.checker_reference_metadata_stage?hash(prepared.checker_reference_metadata_stage.after):null;
  const tokenBuildHash=prepared.token_build_stage?hash(prepared.token_build_stage.after):null;
  const unthemedHash=prepared.unthemable_stage?hash(prepared.unthemable_stage.after):null;
  const registeredMetadataHash=prepared.registered_checker_metadata_stage?hash(prepared.registered_checker_metadata_stage.after):null;
  const controlBaseHash=prepared.modern_control_base_stage?hash(prepared.modern_control_base_stage.after):null;
  const tokenRootHash=prepared.theme_token_root_stage?hash(prepared.theme_token_root_stage.after):null;
  const fieldHash=prepared.form_field_tokenization_stage?hash(prepared.form_field_tokenization_stage.after):null;
  const fieldApplied=Boolean(prepared.form_field_tokenization_stage)&&[fieldHash,canonicalHash].includes(current);
  const boundaryApplied=Boolean(prepared.m3_theme_boundary_stage)&&current===canonicalHash;
  const rootApplied=Boolean(prepared.theme_token_root_stage)&&[tokenRootHash,fieldHash,canonicalHash].includes(current);
  const controlApplied=Boolean(prepared.modern_control_base_stage)&&[controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current);
  const tokenBuildApplied=Boolean(prepared.token_build_stage)&&[tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current);
  const unthemedApplied=Boolean(prepared.unthemable_stage)&&[unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current);
  const sassEntrypointApplied=Boolean(prepared.legacy_sass_entrypoint_stage)&&[sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current);
  const selectionApplied=[nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current);
  const testingHash=prepared.testing_api_stage?hash(prepared.testing_api_stage.after):null;
  const sassHash=hash(prepared.sass_stage.after);
  const rulesHash=hash(prepared.rules_js_stage.after);
  const summaryHash=hash(prepared.summary_stage.after);
  const landscapeHash=hash(prepared.autocomplete_landscape_stage.after);
  const nativeSpecHash=hash(prepared.native_spec_metadata_stage.after);
  assert.ok([beforeHash,afterHash,testingHash,sassHash,rulesHash,summaryHash,landscapeHash,nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current),'unqualified canonical upstream ledger');
  const applied = current !== beforeHash;
  const assertCurrent = () => {
    prepared.sass_stage.assertExternal();
    prepared.rules_js_stage.assertExternal();
    prepared.autocomplete_landscape_stage.assertExternal();
    prepared.native_spec_source.assertCurrent();
    prepared.selection_native_stage.assertCurrent();
    prepared.historical_wrapper_metadata_stage.assertCurrent();
    prepared.historical_consumer_wrapper_metadata_stage.assertCurrent();
    prepared.legacy_sass_entrypoint_stage?.assertCurrent();
    prepared.checker_reference_metadata_stage?.assertCurrent();
    prepared.token_build_stage?.assertCurrent();
    prepared.unthemable_stage?.assertCurrent();
    prepared.registered_checker_metadata_stage?.assertCurrent();
    prepared.modern_control_base_stage?.assertCurrent();
    prepared.theme_token_root_stage?.assertCurrent();
    prepared.form_field_tokenization_stage?.assertCurrent();
    prepared.m3_theme_boundary_stage?.assertCurrent();
    for (const [path, digest] of prepared.bound)
      assert.equal(hash(read(path)), digest, 'late current upstream subject change ' + path);
    const population = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--',
      'projects/ngx-material-legacy'], {cwd: root, encoding: 'utf8'}).trim().split('\n').sort();
    assert.deepEqual(population, prepared.population, 'late current product population change');
    assert.equal(pythonVersion(), prepared.analysis_python_version, 'late source-analysis Python change');
    assert.equal(hash(read(ledgerPath)), current, 'late canonical upstream ledger change');
  };
  const historical = path => {
    if (path !== ledgerPath) return read(path);
    assertCurrent(); return applied ? Buffer.from(prepared.before) : read(path);
  };
  readers.set(historical, {root, raw: read});
  return {line: prepared.line, read: historical, raw: read, assertCurrent, applied,
    projected_metadata_paths: applied ? [ledgerPath] : [], entries_changed: 85,
    scalar_tokens_changed: 179,
    testing_api_decisions_applied: [testingHash,sassHash,rulesHash,summaryHash,landscapeHash,nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?(prepared.testing_api_stage?.individual_decisions??0):0,
    sass_decisions_applied: [sassHash,rulesHash,summaryHash,landscapeHash,nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?6:0,
    rules_js_decisions_applied:[rulesHash,summaryHash,landscapeHash,nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?3:0,
    summary_scalar_updates_applied:[summaryHash,landscapeHash,nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?2:0,
    autocomplete_landscape_decisions_applied:[landscapeHash,nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?1:0,
    autocomplete_landscape_registry_digests_applied:[landscapeHash,nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?10:0,
    individual_decisions_applied: ([testingHash,sassHash,rulesHash,summaryHash,landscapeHash,nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?(prepared.testing_api_stage?.individual_decisions??0):0)+([sassHash,rulesHash,summaryHash,landscapeHash,nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?6:0)+([rulesHash,summaryHash,landscapeHash,nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?3:0)+([landscapeHash,nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?1:0)+(selectionApplied?3:0)+(sassEntrypointApplied?1:0)+(tokenBuildApplied?1:0)+(unthemedApplied?5:0)+(controlApplied?4:0)+(rootApplied?2:0)+(fieldApplied?2:0)+(boundaryApplied?5:0),
    token_build_decisions_applied:tokenBuildApplied?1:0,
    unthemable_source_decisions_applied:unthemedApplied?5:0,
    modern_control_base_decisions_applied:controlApplied?4:0,
    theme_token_root_decisions_applied:rootApplied?2:0,
    form_field_tokenization_decisions_applied:fieldApplied?2:0,
    m3_theme_boundary_decisions_applied:boundaryApplied?5:0,
    registered_checker_metadata_tokens_applied:prepared.registered_checker_metadata_stage&&[registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?14:0,
    legacy_sass_entrypoint_decisions_applied:sassEntrypointApplied?1:0,
    checker_reference_metadata_tokens_applied:prepared.checker_reference_metadata_stage&&[checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?14:0,
    selection_native_decisions_applied:selectionApplied?3:0,
    selection_native_registry_digests_applied:selectionApplied?11:0,
    native_spec_source_digests_applied:[nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?3:0,
    native_spec_review_pointers_applied:[nativeSpecHash,nativeSelectionHash,noticeMetadataHash,historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?2:0,
    historical_wrapper_metadata_entries_applied:[historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?4:0,
    historical_wrapper_metadata_references_applied:[historicalWrapperHash,consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?4:0,
    historical_consumer_wrapper_metadata_entries_applied:[consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?65:0,
    historical_consumer_wrapper_metadata_references_applied:[consumerWrapperHash,sassEntrypointHash,checkerMetadataHash,tokenBuildHash,unthemedHash,registeredMetadataHash,controlBaseHash,tokenRootHash,fieldHash,canonicalHash].includes(current)?65:0,
    current_native_packed_or_floor_or_g11_credit: false};
}

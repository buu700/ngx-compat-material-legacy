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
const json = value => JSON.stringify(value, null, 2) + '\n';
const disk = root => path => readFileSync(join(root, path));
const readers = new WeakMap();
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

const allowed = new Set(['evidence_report', 'source_check/evidence_report_sha256',
  ...['modern_chip', 'chip_lifecycle', 'chip_modernization', 'chip_input_api', 'chip_edit']
    .map(name => 'individual_proof/' + name + '_source_scope/source_context_sha256')]);

function gitBytes(root, parent, path) {
  assert.match(parent, /^[0-9a-f]{40}$/);
  const env = {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1'};
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key];
  return execFileSync('git', ['--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
    'show', parent + ':' + path], {cwd: root, env, maxBuffer: 16 * 1024 * 1024});
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
  const text = before.toString(), source = ts.parseJsonText('upstream-ledger.json', text);
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
      assert.equal(raw.toString(),rulesJsCheckerSuccessor(sassCheckerSuccessor(original.toString())),'unqualified registered checker successor');
    }else assert.equal(hash(raw),ref.sha256,'changed individual testing API subject '+ref.path);
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
  const text = before.toString(), source = ts.parseJsonText('testing-api-ledger.json', text);
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
      assert.equal(hash(original),ref.sha256);assert.equal(raw.toString(),rulesJsCheckerSuccessor(original.toString()),'unqualified rules_js checker successor');
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
  const text=before.toString(),source=ts.parseJsonText('sass-ledger.json',text);assert.equal(source.parseDiagnostics.length,0);
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
  const member=ref=>{const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,'changed rules_js admission input '+ref.path);bound.set(ref.path,ref.sha256);return raw;};
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
  const text=before.toString(),source=ts.parseJsonText('rules-js-ledger.json',text);assert.equal(source.parseDiagnostics.length,0);
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
  const oldChecker=hash(gitBytes(root,rulesJsParents[line],testingApiChecker)),newChecker=hash(read(testingApiChecker));
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
  const text=before.toString(),syntax=ts.parseJsonText('ledger-summary.json',text);assert.equal(syntax.parseDiagnostics.length,0);
  const values={closed_dispositions:closedCount,open_or_deferred:pendingCount};
  assert.deepEqual(packet.updates.map(row=>row.field),Object.keys(values));const edits=[];
  for(const update of packet.updates){assert.equal(data[update.field],update.before);assert.equal(values[update.field],update.after);
    const node=property(syntax.statements[0].expression,update.field);assert.equal(JSON.parse(node.getText(syntax)),update.before);
    edits.push({start:node.getStart(syntax),end:node.end,text:JSON.stringify(update.after)});}
  let end=0;const chunks=[];for(const edit of edits.sort((a,b)=>a.start-b.start)){assert.ok(edit.start>=end);chunks.push(text.slice(end,edit.start),edit.text);end=edit.end;}
  chunks.push(text.slice(end));const after=Buffer.from(chunks.join(''));assert.equal(hash(after),packet.after_sha256);
  assert.deepEqual(JSON.parse(after),{...data,...values});return {before,after,scalar_updates:2};
}

export function preparePackedUpstreamLedger({root = process.cwd(), read = disk(root)} = {}) {
  read = packedUpstreamLedgerRawRead({root, read});
  const input = read(inputPath), line = Object.keys(subjects).find(name => subjects[name].sha256 === hash(input));
  assert.ok(line, 'changed qualified upstream inputs');
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
  function member(ref, authenticate = false) {
    const raw = read(ref.path); assert.equal(hash(raw), ref.sha256, 'changed upstream subject ' + ref.path);
    if (authenticate) assert.equal(hash(gitBytes(root, authority, ref.path)), ref.sha256);
    bound.set(ref.path, ref.sha256); return raw;
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
      assert.equal(read(ownerPath).toString(), owner, 'unqualified source-owner ledger integration');
      bound.set(ownerPath, hash(owner));
    } else if (ref.path === testingApiChecker) {
      let checker = gitBytes(root, authority, ref.path).toString(); assert.equal(hash(checker), ref.sha256);
      if (line === '21.x') for (const [from, to] of testingApiCheckerEdits) {assert.equal(checker.split(from).length, 2); checker = checker.replace(from, to);}
      checker = rulesJsCheckerSuccessor(sassCheckerSuccessor(checker));
      assert.equal(read(ref.path).toString(), checker, 'unqualified finite source-decision checker integration');
      bound.set(ref.path, hash(checker));
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
    const raw = member(ref); assert.equal(raw.length, ref.bytes);
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
  return {line, before, after, canonical_after: summary.after, testing_api_stage: next, sass_stage: sass, rules_js_stage:rulesJs, summary_stage:summary, bound, population, analysis_python_version: syntax.current_pinned_python,
    input_sha256: hash(input),
    entries_changed: 85, scalar_tokens_changed: 179, source_scope_only: true,
    current_native_packed_or_floor_qualified: false};
}

/** A before-image is available only for this exact, continuously checked ledger. */
export function packedUpstreamLedgerEpoch({root = process.cwd(), read = disk(root)} = {}) {
  read = packedUpstreamLedgerRawRead({root, read});
  const prepared = preparePackedUpstreamLedger({root, read});
  const current = hash(read(ledgerPath)), beforeHash = hash(prepared.before), afterHash = hash(prepared.after);
  const canonicalHash = hash(prepared.canonical_after);
  const testingHash=prepared.testing_api_stage?hash(prepared.testing_api_stage.after):null;
  const sassHash=hash(prepared.sass_stage.after);
  const rulesHash=hash(prepared.rules_js_stage.after);
  assert.ok([beforeHash,afterHash,testingHash,sassHash,rulesHash,canonicalHash].includes(current),'unqualified canonical upstream ledger');
  const applied = current !== beforeHash;
  const assertCurrent = () => {
    prepared.sass_stage.assertExternal();
    prepared.rules_js_stage.assertExternal();
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
    testing_api_decisions_applied: [testingHash,sassHash,rulesHash,canonicalHash].includes(current)?(prepared.testing_api_stage?.individual_decisions??0):0,
    sass_decisions_applied: [sassHash,rulesHash,canonicalHash].includes(current)?6:0,
    rules_js_decisions_applied:[rulesHash,canonicalHash].includes(current)?3:0,
    summary_scalar_updates_applied:current===canonicalHash?2:0,
    individual_decisions_applied: ([testingHash,sassHash,rulesHash,canonicalHash].includes(current)?(prepared.testing_api_stage?.individual_decisions??0):0)+([sassHash,rulesHash,canonicalHash].includes(current)?6:0)+([rulesHash,canonicalHash].includes(current)?3:0),
    current_native_packed_or_floor_or_g11_credit: false};
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current canonical admission and historical metadata are different readers. */
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter} from 'node:path';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {preparePackedUpstreamLedger, packedUpstreamLedgerEpoch} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {snackDomSourceContext, snackDomRawCurrentRead} from '../scripts/snack-dom-source-context.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const inputPath = 'compatibility/rc/packed-upstream-source-inputs.json';
const ledgerPath = 'compatibility/f10/disposition-ledger/ledger.json';
const owner = 'scripts/snack-dom-source-context.mjs';
const style = 'projects/ngx-material-legacy/styles/button/_button-theme.scss';
const input = JSON.parse(read(inputPath)), cases = [], rejected = [];
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {currentSassToolReferenceSubject} from '../scripts/current-sass-tool-references.mjs';
import {currentCanonicalTestFrame} from './current_sass_canonical_test_scope.mjs';
// Phase selection affects this test's orchestration only. Every cold owner call
// and every late-success-then-corruption lifetime below remains unchanged.
const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
assert.equal(input.line,line,'test input line differs from the actual package');
const framePath='compatibility/rc/21x-c04-dialog-title-replacement-retained-ledger-frames.json';
const reportPath=input.reports[0].after.path;
const landscapeRegistry='scripts/upstream-historical-behavior-evidence.mjs';
let preparedFixture,epochFixture;
function getPrepared(){if(!preparedFixture){
// BEGIN retained original prepared-factory
const prepared = preparePackedUpstreamLedger({root, read});
// END retained original prepared-factory
 preparedFixture=prepared;}return preparedFixture;}
function getEpoch(){if(!epochFixture){
// BEGIN retained original epoch-factory
const epoch = packedUpstreamLedgerEpoch({root, read});
// END retained original epoch-factory
 epochFixture=epoch;}return epochFixture;}
function expectedAdmissions(){
 if(line==='main')return 13;
 const roster=JSON.parse(read('compatibility/rc/21x-remaining-disposition-worksheet.json'));
 assert.equal(roster.ledger_subject.sha256,hash(read(ledgerPath)));
 assert.equal(roster.original_SHA_denominator,1697);assert.equal(roster.g11_claim,'not-passed');
 assert.equal(Number.isSafeInteger(roster.individual_source_reviews_with_retained_evidence),true);
 return roster.individual_source_reviews_with_retained_evidence;
}
function historicalLedgerData(ref){
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 const raw=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',ref.source_parent+':'+ledgerPath],{cwd:root,env,maxBuffer:8*1024*1024});
 assert.equal(hash(raw),ref.sha256);return raw;
}
const supplementalData=[], supplementalProjection=[];
const dataControls={
 'unrelated-canonical-entry-change':'input-guards','mixed-before-and-after-canonical-ledger':'input-guards',
 'partial-seven-individual-admission':'testing-api','partial-six-Sass-admission':'sass',
 'partial-three-build-admission':'build','wrong-summary-count-with-identical-entries':'summary',
 'partial-landscape-source-decision':'landscape-ledger','partial-landscape-registry-digests':'landscape-ledger',
 'partial-native-spec-proof-digests':'native-spec','partial-native-spec-review-pointer':'native-spec',
 'partial-three-selection-source-admission':'selection','partial-eleven-selection-registry-digests':'selection',
 'stripped-required-selection-native-marker':'selection'};
function supplementalDataCheck(id,corrupt){
 if(line!=='21.x'||!Object.hasOwn(dataControls,id))return;
 const prepared=getPrepared(),catalogRaw=read(framePath);assert.equal(hash(catalogRaw),'1818801b7b603d2707fe7f2571dd5819edb7de12e259934bc71b24354c8fd456');assert.equal(catalogRaw.length,4267);const catalog=JSON.parse(catalogRaw);
 const stageNames=['testing_api_stage','sass_stage','rules_js_stage','summary_stage','autocomplete_landscape_stage','native_spec_metadata_stage','selection_native_stage','historical_wrapper_metadata_stage','historical_consumer_wrapper_metadata_stage','legacy_sass_entrypoint_stage','checker_reference_metadata_stage','token_build_stage','unthemable_stage','registered_checker_metadata_stage','modern_control_base_stage','theme_token_root_stage','form_field_tokenization_stage','m3_theme_boundary_stage','title_stage'];
 const frames=[prepared.before,prepared.after,...stageNames.map(name=>prepared[name].after)];
 assert.deepEqual(frames.map((raw,i)=>({role:catalog.frames[i].role,sha256:hash(raw),bytes:raw.length})),catalog.frames);
 const proposalRaw=read('compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json');
 assert.equal(hash(proposalRaw),'720a4fcd0c9d0d67afbeddd106fc9741d7ab34a0848edc1a0f2e6a25019b9881');assert.equal(proposalRaw.length,3578);
 const proposal=JSON.parse(proposalRaw);
 const images=['before','after'].map(side=>{const ref=proposal['ledger_'+side+'_image'],raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);const image=gunzipSync(raw);assert.equal(hash(image),proposal[side].sha256);assert.equal(image.length,proposal[side].bytes);return image;});
 const current=currentCanonicalTestFrame({root,read});assert.ok(images.some(image=>image.equals(prepared.canonical_after)));assert.ok(read(ledgerPath).equals(prepared.canonical_after));
 const baseline=dataControls[id]==='input-guards'?prepared.after:prepared.canonical_after;
 assert.ok([...frames,...images].some(frame=>frame.equals(baseline)));
 const mutant=corrupt(ledgerPath);assert.ok(Buffer.isBuffer(mutant));assertHistoricalDataInvariant(id,baseline,mutant,prepared);
 assert.equal(supplementalData.some(row=>row.id===id),false);supplementalData.push({id,phase:dataControls[id]});current.assertCurrent();prepared.assertCurrent();
}
function assertHistoricalDataInvariant(id, baselineRaw, mutantRaw, prepared){
 const baseline=JSON.parse(baselineRaw),mutant=JSON.parse(mutantRaw);
 const entry=(ledger,sha)=>{const matches=ledger.entries.filter(row=>row.sha===sha);assert.equal(matches.length,1);return matches[0];};
 const readPacket=(name,digest)=>{const raw=read('compatibility/rc/'+name);assert.equal(hash(raw),digest);return JSON.parse(name.endsWith('.gz')?gunzipSync(raw):raw);};
 const compare=project=>{const expected=project(baseline);assert.doesNotThrow(()=>assert.deepEqual(project(baseline),expected));assert.throws(()=>assert.deepEqual(project(mutant),expected));};
 const value=(ledger,row)=>row.path.reduce((v,key)=>v[key],entry(ledger,row.sha));
 if(id==='unrelated-canonical-entry-change'){
  const selected=new Set(input.reports.map(row=>row.after.path)),row=baseline.entries.find(item=>!selected.has(item.evidence_report));
  assert.ok(row);assert.equal(entry(mutant,row.sha).reason,row.reason+' Unrelated change.');
  compare(ledger=>ledger.entries.filter(item=>!selected.has(item.evidence_report)).map(item=>[item.sha,item.reason]));
 }else if(id==='mixed-before-and-after-canonical-ledger'){
  const selected=new Set(input.reports.map(row=>row.after.path)),row=baseline.entries.find(item=>selected.has(item.evidence_report)),prior=JSON.parse(prepared.before);
  assert.ok(row);assert.notDeepEqual(row,entry(prior,row.sha));assert.deepEqual(entry(mutant,row.sha),entry(prior,row.sha));
  compare(ledger=>baseline.entries.filter(item=>selected.has(item.evidence_report)).map(item=>entry(ledger,item.sha)));
 }else if(['partial-seven-individual-admission','partial-six-Sass-admission','partial-three-build-admission'].includes(id)){
  const config={
   'partial-seven-individual-admission':['upstream-testing-api-21x-ledger-transition.json.gz','cd65646ca6055cac2cd23077d6bcf75c66f7c111666de703227efcc018d2a3e1','testing_api_21x',7,prepared.after],
   'partial-six-Sass-admission':['upstream-sass-inspection-ledger-transition.json.gz','98d02b52e86689e4e05f4a750f044ee5c8a22f812ddb92dc9214d5156d298803','sass_inspection',6,prepared.sass_stage.before],
   'partial-three-build-admission':['upstream-rules-js-build-ledger-transition.json.gz','c0e61d07aecb56a56c6c3b1d70d836c28edcfccbb36967f28460921037894191','rules_js_build_source_scope',3,prepared.rules_js_stage.before]
  }[id];
  const packet=readPacket(config[0],config[1]),rows=packet.entries,prior=JSON.parse(config[4]);assert.equal(rows.length,config[3]);assert.equal(new Set(rows.map(row=>row.sha)).size,config[3]);
  for(const row of rows)assert.deepEqual(entry(baseline,row.sha).individual_proof[config[2]],row.after_entry.individual_proof[config[2]]);
  const affected=rows.filter(row=>JSON.stringify(entry(mutant,row.sha))!==JSON.stringify(entry(baseline,row.sha)));assert.equal(affected.length,1);assert.deepEqual(entry(mutant,affected[0].sha),entry(prior,affected[0].sha));
  compare(ledger=>rows.map(row=>entry(ledger,row.sha).individual_proof?.[config[2]]));
 }else if(id==='wrong-summary-count-with-identical-entries'){
  const closed=new Set(['irrelevant','not-applicable','inherited','already-adapted','do-not-adopt','adapt','already-present']),pending=new Set(['open','needs-individual-review','security-review']);
  const validate=ledger=>{assert.equal(ledger.entries.length,1697);assert.ok(ledger.entries.every(row=>closed.has(row.final_disposition)||pending.has(row.final_disposition)));assert.equal(ledger.closed_dispositions,ledger.entries.filter(row=>closed.has(row.final_disposition)).length);assert.equal(ledger.open_or_deferred,ledger.entries.filter(row=>pending.has(row.final_disposition)).length);};
  assert.deepEqual(mutant.entries,baseline.entries);assert.equal(mutant.open_or_deferred,baseline.open_or_deferred+1);assert.doesNotThrow(()=>validate(baseline));assert.throws(()=>validate(mutant));
 }else if(id==='partial-landscape-source-decision'){
  const packet=readPacket('autocomplete-landscape-ledger-transition.json.gz','d8de61098c5eb4fba574da97b1e6d582f13a3a3be3332bdb83ad00aa9c0f64ba'),sha=packet.entry.sha,prior=JSON.parse(prepared.autocomplete_landscape_stage.before);
  assert.equal(sha,'008212a9807fd01fd32fe136a075763b7b2c854d');assert.deepEqual(entry(mutant,sha),entry(prior,sha));assert.notDeepEqual(entry(baseline,sha).individual_proof,entry(prior,sha).individual_proof);
  compare(ledger=>entry(ledger,sha).individual_proof);
 }else if(['partial-landscape-registry-digests','partial-eleven-selection-registry-digests','partial-native-spec-proof-digests','partial-native-spec-review-pointer'].includes(id)){
  const config=id==='partial-landscape-registry-digests'?['autocomplete-landscape-ledger-transition.json.gz','d8de61098c5eb4fba574da97b1e6d582f13a3a3be3332bdb83ad00aa9c0f64ba','source_digest_updates',10]:id==='partial-eleven-selection-registry-digests'?['autocomplete-selection-ledger-successor.json','c47ae399ecd8426ca2d20e6561ea3e37bb94084bce1e850c22d50065a63eb512','source_digest_updates',11]:['autocomplete-selection-spec-ledger-successor.json','46338d4f9dc08c0e93a22611352cbbcb9170baa98b58323d1ffed4252963dac4','literal_updates',5];
  const packet=readPacket(config[0],config[1]),rows=packet[config[2]];assert.equal(rows.length,config[3]);assert.equal(new Set(rows.map(row=>JSON.stringify([row.sha,row.path]))).size,rows.length);
  const stage=id==='partial-landscape-registry-digests'?prepared.autocomplete_landscape_stage:id==='partial-eleven-selection-registry-digests'?prepared.selection_native_stage:prepared.native_spec_metadata_stage;const stageAfter=JSON.parse(stage.after);for(const row of rows)assert.equal(value(stageAfter,row),row.after);
  const changed=rows.filter(row=>value(mutant,row)!==value(baseline,row));assert.equal(changed.length,1);assert.equal(value(mutant,changed[0]),changed[0].before);assert.notEqual(value(baseline,changed[0]),changed[0].before);
  if(id==='partial-native-spec-proof-digests')assert.equal(changed[0].path.at(-1),'sha256');
  if(id==='partial-native-spec-review-pointer')assert.deepEqual(changed[0].path,['evidence_report']);
  compare(ledger=>rows.map(row=>value(ledger,row)));
 }else if(['partial-three-selection-source-admission','stripped-required-selection-native-marker'].includes(id)){
  const packet=readPacket('autocomplete-selection-ledger-successor.json','c47ae399ecd8426ca2d20e6561ea3e37bb94084bce1e850c22d50065a63eb512'),rows=packet.entries;assert.equal(rows.length,3);assert.equal(new Set(rows.map(row=>row.sha)).size,3);
  for(const row of rows)assert.equal(entry(baseline,row.sha).individual_proof.proof_kind,row.after_entry.individual_proof.proof_kind);
  const sha=rows[0].sha;if(id==='partial-three-selection-source-admission')assert.deepEqual(entry(mutant,sha),entry(JSON.parse(prepared.selection_native_stage.before),sha));else assert.equal(entry(mutant,sha).individual_proof.proof_kind,undefined);
  compare(ledger=>rows.map(row=>entry(ledger,row.sha).individual_proof?.proof_kind));
 }else assert.fail('unknown supplemental DATA invariant '+id);
}
const rejects = (() => {
// BEGIN retained original rejection-helper
function rejects(id, corrupt) {
  assert.throws(() => packedUpstreamLedgerEpoch({root, read: corrupt}), undefined, id); rejected.push(id);
}
// END retained original rejection-helper
return (id, corrupt) => { supplementalDataCheck(id, corrupt); return rejects(id, corrupt); };
})();
function phase_canonical(){
 const prepared=getPrepared();
// BEGIN retained original canonical
assert.equal(prepared.entries_changed, 85); assert.equal(prepared.scalar_tokens_changed, 179);
assert.equal(read(ledgerPath).equals(prepared.canonical_after), true);
assert.equal(JSON.parse(read(ledgerPath)).entries.length, 1697);
cases.push('actual-canonical-ledger-is-exact-qualified-successor-after-image');
const framePath='compatibility/rc/21x-c04-dialog-title-replacement-retained-ledger-frames.json';
let frameCount=0;
if(input.line==='21.x'){
 const catalog=JSON.parse(read(framePath));
 const stageNames=['testing_api_stage','sass_stage','rules_js_stage','summary_stage','autocomplete_landscape_stage','native_spec_metadata_stage','selection_native_stage','historical_wrapper_metadata_stage','historical_consumer_wrapper_metadata_stage','legacy_sass_entrypoint_stage','checker_reference_metadata_stage','token_build_stage','unthemable_stage','registered_checker_metadata_stage','modern_control_base_stage','theme_token_root_stage','form_field_tokenization_stage','m3_theme_boundary_stage','title_stage'];
 const frames=[{role:'before',raw:prepared.before},{role:'initial-metadata',raw:prepared.after},...stageNames.map(role=>({role,raw:prepared[role].after}))].map(({role,raw})=>({role,sha256:hash(raw),bytes:raw.length}));
 assert.deepEqual(catalog.frames,frames);assert.equal(new Set(frames.map(frame=>frame.sha256)).size,21);
 const tools=currentSassToolReferenceSubject({root,read}),prior=tools.comparisonBytes(catalog.prior_owner),qualified=tools.qualify(catalog.prior_owner),actual=read(catalog.prior_owner.path);
 assert.equal(hash(prior),catalog.prior_owner.sha256);assert.equal(prior.length,catalog.prior_owner.bytes);
 assert.deepEqual({sha256:qualified.sha256,bytes:qualified.bytes},{sha256:'239329b95403e09eff67ce9ef6225c479574675b3e82deb3422ff11bb850c7f2',bytes:118364});assert.equal(hash(actual),qualified.sha256);assert.equal(actual.length,qualified.bytes);tools.assertCurrent();
 assert.equal(catalog.title_transition.sha256,hash(read(catalog.title_transition.path)));
 assert.equal(catalog.new_dispositions,0);assert.equal(catalog.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
 frameCount=frames.length;cases.push('finite-frame-catalog-equals-every-independently-prepared-complete-stage');
}
// END retained original canonical
 return {complete_ledger_frames:frameCount};
}
function phase_reader_projection(){
 const prepared=getPrepared();
 const epoch=getEpoch();
// BEGIN retained original reader-projection
assert.equal(epoch.applied, true);
assert.equal(epoch.raw, read); assert.equal(epoch.read(ledgerPath).equals(prepared.before), true);
assert.deepEqual(epoch.projected_metadata_paths, [ledgerPath]);
assert.equal(snackDomRawCurrentRead({root, read: epoch.read})(ledgerPath).equals(prepared.canonical_after), true);
assert.equal(packedUpstreamLedgerEpoch({root, read: epoch.read}).applied, true);
for (const member of [style, owner, input.reports[0].after.path, 'projects/ngx-material-legacy/legacy-chips/chip.ts'])
  assert.equal(epoch.read(member).equals(read(member)), true);
assert.equal(epoch.current_native_packed_or_floor_or_g11_credit, false);
cases.push('only-one-historical-ledger-projected-all-current-product-code-and-reports-raw');
// END retained original reader-projection
}
function phase_before_state(){
 const prepared=getPrepared();
// BEGIN retained original before-state
if(line==='21.x'){
 const catalog=JSON.parse(read(framePath)),oldFrame=catalog.frames.find(row=>row.role==='before');
 assert.deepEqual({sha256:hash(prepared.before),bytes:prepared.before.length},{sha256:oldFrame.sha256,bytes:oldFrame.bytes});assert.ok(historicalLedgerData(input.before_ledger).equals(prepared.before));
 const physicalFrame=currentCanonicalTestFrame({root,read}),before=packedUpstreamLedgerEpoch({root,read});
 assert.equal(before.raw,read);assert.equal(before.individual_decisions_applied,physicalFrame.individual_source_reviews);assert.ok(before.read(ledgerPath).equals(prepared.before));
 assert.throws(()=>packedUpstreamLedgerEpoch({root,read:path=>path===ledgerPath?prepared.before:read(path)}),error=>error.code==='ERR_ASSERTION'&&error.message==='nonphysical canonical input '+ledgerPath);
 supplementalProjection.push('historical-before-rejected-at-physical-boundary');before.assertCurrent();physicalFrame.assertCurrent();prepared.assertCurrent();
}else{
 const before = packedUpstreamLedgerEpoch({root, read: path => path === ledgerPath ? prepared.before : read(path)});
 assert.equal(before.applied, false); assert.deepEqual(before.projected_metadata_paths, []);
 assert.equal(before.read(ledgerPath).equals(prepared.before), true);
}
cases.push('unapplied-exact-before-state-does-not-claim-admission-or-project-product');
// END retained original before-state
}
function phase_public_reader_metadata(){
 const prepared=getPrepared();
 const epoch=getEpoch();
// BEGIN retained original public-reader-metadata
epoch.applied = false; epoch.projected_metadata_paths.push(style);
assert.equal(epoch.read(ledgerPath).equals(prepared.before), true);
assert.equal(epoch.read(style).equals(read(style)), true);
cases.push('public-metadata-cannot-change-private-reader-state-or-projection-scope');
// END retained original public-reader-metadata
}
function phase_early_guards(){
// BEGIN retained original early-guards
if(input.line==='21.x'){
 const touched=new Set();
 assert.throws(()=>packedUpstreamLedgerEpoch({root,read:path=>{touched.add(path);return path===ledgerPath?Buffer.concat([read(path),Buffer.from(' ')]):read(path);}}),error=>error.code==='ERR_ASSERTION'&&error.message==='nonphysical canonical input '+ledgerPath);
 assert.equal(touched.has('scripts/packed-upstream-ledger-base.mjs'),false);
 assert.equal(touched.has('compatibility/rc/21x-c04-dialog-title-replacement-canonical-qualified-owner-source-measurement.json'),false);
 rejected.push('unknown-ledger-frame-rejected-before-expensive-source-preparation');
 rejects('changed-complete-ledger-frame-catalog',path=>path===framePath?Buffer.concat([read(path),Buffer.from(' ')]):read(path));
 let late=false;const live=packedUpstreamLedgerEpoch({root,read:path=>late&&path===framePath?Buffer.concat([read(path),Buffer.from(' ')]):read(path)});
 late=true;assert.throws(()=>live.read(ledgerPath));rejected.push('late-complete-ledger-frame-catalog-change');
}
// END retained original early-guards
}
function phase_input_guards(){
 const prepared=getPrepared();
// BEGIN retained original input-guards
rejects('changed-qualified-inputs', path => path === inputPath ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path));
const wrongLine = {...input, line: input.line === 'main' ? '21.x' : 'main'};
rejects('wrong-line-inputs', path => path === inputPath ? bytes(wrongLine) : read(path));
const ledger = JSON.parse(prepared.after), selected = new Set(input.reports.map(row => row.after.path));
const unrelated = ledger.entries.find(row => !selected.has(row.evidence_report));
assert.ok(unrelated); unrelated.reason += ' Unrelated change.';
rejects('unrelated-canonical-entry-change', path => path === ledgerPath ? bytes(ledger) : read(path));
const mixed = JSON.parse(prepared.after), original = JSON.parse(prepared.before);
const index = mixed.entries.findIndex(row => selected.has(row.evidence_report));
mixed.entries[index] = original.entries[index];
rejects('mixed-before-and-after-canonical-ledger', path => path === ledgerPath ? bytes(mixed) : read(path));
const reportPath = input.reports[0].after.path;
rejects('changed-current-report', path => path === reportPath ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path));
rejects('changed-original-report', path => path === input.reports[0].before.path ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path));
rejects('changed-validation-proof', path => path === input.validation.path ? Buffer.concat([read(path), Buffer.from(' ')]) : read(path));
rejects('unrelated-product-style', path => path === style ? Buffer.concat([read(path), Buffer.from('\n// changed\n')]) : read(path));
rejects('unqualified-source-owner', path => path === owner ? Buffer.concat([read(path), Buffer.from('\n// changed\n')]) : read(path));
const oldOwner = read(owner).toString().replace("\nimport {packedUpstreamLedgerEpoch,packedUpstreamLedgerRawRead} from './packed-upstream-ledger-epoch.mjs';", '')
  .replace('const rawCurrent=read,upstreamEpoch=packedUpstreamLedgerEpoch({root,read}),focusEpoch=packedUpstreamFocusMetadataEpoch({root,read:upstreamEpoch.read}),',
    'const rawCurrent=read,focusEpoch=packedUpstreamFocusMetadataEpoch({root,read}),');
assert.notEqual(oldOwner, read(owner).toString());
rejects('source-owner-before-integration', path => path === owner ? Buffer.from(oldOwner) : read(path));
// END retained original input-guards
}
function phase_reader_root(){
 const epoch=getEpoch();
// BEGIN retained original reader-root
assert.throws(() => snackDomRawCurrentRead({root: root + '/wrong-context', read: epoch.read}));
rejected.push('historical-ledger-reader-root-mismatch');
// END retained original reader-root
}
function phase_python_runtime(){
// BEGIN retained original python-runtime
const liveRuntime = packedUpstreamLedgerEpoch({root, read});
const fakeBin = mkdtempSync(join(tmpdir(), 'ngx-ledger-python-'));
const fakePython = join(fakeBin, 'python3'), previousPath = process.env.PATH;
writeFileSync(fakePython, '#!/bin/sh\nprintf "0.0.0\\n"\n', {mode: 0o755});
try {
  process.env.PATH = fakeBin + delimiter + previousPath;
  assert.throws(() => packedUpstreamLedgerEpoch({root, read}), /changed source-analysis Python/);
  rejected.push('wrong-source-analysis-python');
  assert.throws(() => liveRuntime.read(ledgerPath), /late source-analysis Python change/);
  rejected.push('late-source-analysis-python-change');
} finally {process.env.PATH = previousPath; unlinkSync(fakePython); rmdirSync(fakeBin);}
// END retained original python-runtime
}
function phase_live_input_guards(){
 const prepared=getPrepared();
// BEGIN retained original live-input-guards
for (const [id, path, changed] of [
  ['late-canonical-reversion', ledgerPath, prepared.before],
  ['late-input-change', inputPath, Buffer.concat([read(inputPath), Buffer.from(' ')])],
  ['late-current-report-change', reportPath, Buffer.concat([read(reportPath), Buffer.from(' ')])],
  ['late-product-style-change', style, Buffer.concat([read(style), Buffer.from('\n// changed\n')])],
]) {
  let late = false;
  const live = packedUpstreamLedgerEpoch({root, read: member => late && member === path ? changed : read(member)});
  late = true; assert.throws(() => live.read(ledgerPath), undefined, id); rejected.push(id);
}
// END retained original live-input-guards
}
function phase_source_context(){
 const prepared=getPrepared();
 const epoch=getEpoch();
// BEGIN retained original source-context
const context = snackDomSourceContext({root, read: epoch.read});
assert.equal(context.members, 20); assert.equal(context.packed_repair_epoch_members, 16);
assert.equal(context.current_successors, 25);
assert.equal(context.raw(ledgerPath).equals(prepared.canonical_after), true);
assert.equal(snackDomRawCurrentRead({root, read: context.read})(ledgerPath).equals(prepared.canonical_after), true);
cases.push('complete-existing-historical-context-and-native-unwrapping-use-correct-ledger-epochs');
// END retained original source-context
}
function phase_stage_population(){
 const prepared=getPrepared();
 const epoch=getEpoch();
// BEGIN retained original stage-population
assert.equal(epoch.testing_api_decisions_applied,input.line==='21.x'?7:0);
assert.equal(epoch.sass_decisions_applied,6);
assert.equal(epoch.individual_decisions_applied,expectedAdmissions());
if(input.line==='21.x'){
 assert.equal(epoch.title_source_decisions_applied,1);
 assert.equal(epoch.title_native_registry_metadata_tokens_applied,14);
 assert.equal(epoch.theming_source_decisions_applied,2);
 assert.equal(prepared.theming_stage.before.equals(prepared.title_stage.after),true);
 assert.equal(prepared.theming_stage.individual_decisions,2);
 assert.equal(prepared.theming_stage.unselected_entries_preserved,1695);
 assert.equal(epoch.inspection_source_decisions_applied,4);
 assert.equal(prepared.inspection_stage.before.equals(prepared.theming_stage.after),true);
 assert.equal(prepared.inspection_stage.individual_decisions,4);
 assert.equal(prepared.inspection_stage.unselected_entries_preserved,1693);
 assert.equal(epoch.selector_density_source_decisions_applied,2);
 assert.equal(prepared.selector_density_stage.before.equals(prepared.inspection_stage.after),true);
 assert.equal(prepared.selector_density_stage.individual_decisions,2);
 assert.equal(prepared.selector_density_stage.unselected_entries_preserved,1695);
 assert.equal(epoch.button_tokenization_source_decisions_applied,5);
 assert.equal(prepared.button_tokenization_stage.before.equals(prepared.selector_density_stage.after),true);
 assert.equal(prepared.button_tokenization_stage.individual_decisions,5);
 assert.equal(prepared.button_tokenization_stage.unselected_entries_preserved,1692);
 assert.equal(epoch.button_token_repairs_source_decisions_applied,2);
 assert.equal(prepared.button_token_repairs_stage.before.equals(prepared.button_tokenization_stage.after),true);
 assert.equal(prepared.button_token_repairs_stage.individual_decisions,2);
 assert.equal(prepared.button_token_repairs_stage.unselected_entries_preserved,1695);
 for(const [name,previous,count]of [['surface_m3_theme','button_token_repairs',3],['slider_m3_repairs','surface_m3_theme',2],['control_m3_theme','slider_m3_repairs',4]]){
  assert.equal(epoch[name+'_source_decisions_applied'],count);
  assert.equal(prepared[name+'_stage'].before.equals(prepared[previous+'_stage'].after),true);
  assert.equal(prepared[name+'_stage'].individual_decisions,count);
  assert.equal(prepared[name+'_stage'].unselected_entries_preserved,1697-count);
 }
}
assert.equal(epoch.token_build_decisions_applied,input.line==='21.x'?1:0);
assert.equal(epoch.unthemable_source_decisions_applied,input.line==='21.x'?5:0);
assert.equal(epoch.registered_checker_metadata_tokens_applied,input.line==='21.x'?14:0);
assert.equal(epoch.legacy_sass_entrypoint_decisions_applied,input.line==='21.x'?1:0);
assert.equal(epoch.checker_reference_metadata_tokens_applied,input.line==='21.x'?14:0);
if(input.line==='21.x'){
 assert.equal(prepared.legacy_sass_entrypoint_stage.individual_decisions,1);
 assert.equal(prepared.legacy_sass_entrypoint_stage.unselected_entries_preserved,1696);
 assert.equal(prepared.legacy_sass_entrypoint_stage.before.equals(prepared.historical_consumer_wrapper_metadata_stage.after),true);
}
assert.equal(epoch.rules_js_decisions_applied,3);
assert.equal(epoch.summary_scalar_updates_applied,2);
// END retained original stage-population
}
function phase_testing_api(){
 const prepared=getPrepared();
// BEGIN retained original testing-api
if(input.line==='21.x'){
 const nextPath='compatibility/rc/upstream-testing-api-21x-ledger-transition.json.gz';
 rejects('changed-seven-individual-transition',path=>path===nextPath?Buffer.concat([read(path),Buffer.from(' ')]):read(path));
 const next=JSON.parse(prepared.canonical_after), prior=JSON.parse(prepared.after);
 const reviewed=next.entries.find(row=>row.individual_proof?.testing_api_21x);
 const partial=structuredClone(next);partial.entries[partial.entries.findIndex(row=>row.sha===reviewed.sha)]=prior.entries.find(row=>row.sha===reviewed.sha);
 rejects('partial-seven-individual-admission',path=>path===ledgerPath?bytes(partial):read(path));
 const validator='scripts/upstream-testing-api-21x-admission.mjs';
 rejects('changed-seven-individual-validator',path=>path===validator?Buffer.concat([read(path),Buffer.from('\n// changed\n')]):read(path));
}
// END retained original testing-api
}
function phase_sass(){
 const prepared=getPrepared();
// BEGIN retained original sass
const sassTransition='compatibility/rc/upstream-sass-inspection-ledger-transition.json.gz';
rejects('changed-six-Sass-transition',path=>path===sassTransition?Buffer.concat([read(path),Buffer.from(' ')]):read(path));
const sassValidator='scripts/upstream-sass-inspection-admission.mjs';
rejects('changed-six-Sass-validator',path=>path===sassValidator?Buffer.concat([read(path),Buffer.from('\n// changed\n')]):read(path));
const partialSass=JSON.parse(prepared.canonical_after),beforeSass=JSON.parse(prepared.sass_stage.before);
const sassRow=partialSass.entries.find(row=>row.individual_proof?.sass_inspection);
partialSass.entries[partialSass.entries.findIndex(row=>row.sha===sassRow.sha)]=beforeSass.entries.find(row=>row.sha===sassRow.sha);
rejects('partial-six-Sass-admission',path=>path===ledgerPath?bytes(partialSass):read(path));
let lateSass=false;
const sassReview='compatibility/rc/upstream-sass-inspection-individual-review.json';
const liveSass=packedUpstreamLedgerEpoch({root,read:path=>lateSass&&path===sassReview?Buffer.concat([read(path),Buffer.from(' ')]):read(path)});
lateSass=true;assert.throws(()=>liveSass.read(ledgerPath));rejected.push('late-Sass-review-change');
cases.push('six-source-decisions-are-qualified-current-epoch');
// END retained original sass
}
function phase_build(){
 const prepared=getPrepared();
// BEGIN retained original build
const rulesTransition='compatibility/rc/upstream-rules-js-build-ledger-transition.json.gz';
rejects('changed-three-build-transition',path=>path===rulesTransition?Buffer.concat([read(path),Buffer.from(' ')]):read(path));
const rulesValidator='scripts/upstream-rules-js-build-admission.mjs';
rejects('changed-three-build-validator',path=>path===rulesValidator?Buffer.concat([read(path),Buffer.from('\n// changed\n')]):read(path));
const partialRules=JSON.parse(prepared.canonical_after),beforeRules=JSON.parse(prepared.rules_js_stage.before);
const rulesRow=partialRules.entries.find(row=>row.individual_proof?.rules_js_build_source_scope);
partialRules.entries[partialRules.entries.findIndex(row=>row.sha===rulesRow.sha)]=beforeRules.entries.find(row=>row.sha===rulesRow.sha);
rejects('partial-three-build-admission',path=>path===ledgerPath?bytes(partialRules):read(path));
let lateRules=false;
const rulesReview='compatibility/rc/upstream-rules-js-build-individual-review.json';
const liveRules=packedUpstreamLedgerEpoch({root,read:path=>lateRules&&path===rulesReview?Buffer.concat([read(path),Buffer.from(' ')]):read(path)});
lateRules=true;assert.throws(()=>liveRules.read(ledgerPath));rejected.push('late-build-review-change');
cases.push('three-complete-build-decisions-are-qualified-current-epoch');
// END retained original build
}
function phase_summary(){
 const prepared=getPrepared();
// BEGIN retained original summary
const summaryPath='compatibility/rc/upstream-ledger-summary-transition.json';
rejects('changed-summary-transition',path=>path===summaryPath?Buffer.concat([read(path),Buffer.from(' ')]):read(path));
const wrongSummary=JSON.parse(prepared.canonical_after);wrongSummary.open_or_deferred++;
rejects('wrong-summary-count-with-identical-entries',path=>path===ledgerPath?bytes(wrongSummary):read(path));
assert.deepEqual(JSON.parse(prepared.summary_stage.after).entries,JSON.parse(prepared.summary_stage.before).entries);
assert.equal(prepared.autocomplete_landscape_stage.before.equals(prepared.summary_stage.after),true);
assert.equal(prepared.summary_stage.scalar_updates,2);
cases.push('two-derived-summary-counters-preserve-every-entry');
// END retained original summary
}
function phase_landscape_registry(){
 const prepared=getPrepared();
// BEGIN retained original landscape-registry
const landscapeTransition='compatibility/rc/autocomplete-landscape-native-contract-transition.json';
rejects('changed-landscape-registry-transition',path=>path===landscapeTransition?Buffer.concat([read(path),Buffer.from(' ')]):read(path));
const landscapeRegistry='scripts/upstream-historical-behavior-evidence.mjs';
rejects('changed-historical-registry-outside-finite-landscape-addition',path=>path===landscapeRegistry?Buffer.concat([read(path),Buffer.from('\n// unrelated\n')]):read(path));
const landscapePacket=JSON.parse(read(landscapeTransition));
const priorRegistry=Buffer.from(read(landscapeRegistry).toString().replace(landscapePacket.insertion.text,''));
rejects('omitted-mandatory-landscape-registration',path=>path===landscapeRegistry?priorRegistry:read(path));
let lateLandscape=false;
const liveLandscape=packedUpstreamLedgerEpoch({root,read:path=>lateLandscape&&path===landscapeRegistry?priorRegistry:read(path)});
lateLandscape=true;assert.throws(()=>liveLandscape.read(ledgerPath));rejected.push('late-landscape-registry-change');
let lateLandscapePacket=false;
const liveLandscapePacket=packedUpstreamLedgerEpoch({root,read:path=>lateLandscapePacket&&path===landscapeTransition?Buffer.concat([read(path),Buffer.from(' ')]):read(path)});
lateLandscapePacket=true;assert.throws(()=>liveLandscapePacket.read(ledgerPath));rejected.push('late-landscape-transition-change');
cases.push('exact-additive-landscape-contract-keeps-all-canonical-ledger-and-product-bytes-raw');
// END retained original landscape-registry
}
function phase_landscape_ledger(){
 const prepared=getPrepared();
 const epoch=getEpoch();
// BEGIN retained original landscape-ledger
assert.equal(epoch.autocomplete_landscape_decisions_applied,1);
assert.equal(epoch.autocomplete_landscape_registry_digests_applied,10);
const landscapeLedgerTransition='compatibility/rc/autocomplete-landscape-ledger-transition.json.gz';
rejects('changed-landscape-ledger-transition',path=>path===landscapeLedgerTransition?Buffer.concat([read(path),Buffer.from(' ')]):read(path));
const partialLandscape=JSON.parse(prepared.canonical_after),beforeLandscape=JSON.parse(prepared.autocomplete_landscape_stage.before);
const landscapeIndex=partialLandscape.entries.findIndex(row=>row.sha==='008212a9807fd01fd32fe136a075763b7b2c854d');
partialLandscape.entries[landscapeIndex]=beforeLandscape.entries[landscapeIndex];
rejects('partial-landscape-source-decision',path=>path===ledgerPath?bytes(partialLandscape):read(path));
const partialRegistryDigests=JSON.parse(prepared.canonical_after);
const oneNative=partialRegistryDigests.entries.find(row=>row.sha!=='008212a9807fd01fd32fe136a075763b7b2c854d'&&row.individual_proof?.historical_behavior);
assert.ok(oneNative);oneNative.individual_proof.historical_behavior.source_members.find(ref=>ref.path===landscapeRegistry).sha256='7e04af26527d8520bdf3ae4b5ce7bfc861b642877c714708193bc87a8c7948f0';
rejects('partial-landscape-registry-digests',path=>path===ledgerPath?bytes(partialRegistryDigests):read(path));
const landscapeReview='compatibility/f10/disposition-ledger/evidence/closeout-autocomplete-landscape-individual-source-judgment.json';
rejects('changed-landscape-individual-source-judgment',path=>path===landscapeReview?Buffer.concat([read(path),Buffer.from(' ')]):read(path));
const landscapeHelper='scripts/autocomplete-landscape-source-judgment.mjs';
rejects('changed-landscape-source-helper',path=>path===landscapeHelper?Buffer.concat([read(path),Buffer.from('\n// changed\n')]):read(path));
let lateLandscapeReview=false;
const liveLandscapeReview=packedUpstreamLedgerEpoch({root,read:path=>lateLandscapeReview&&path===landscapeReview?Buffer.concat([read(path),Buffer.from(' ')]):read(path)});
lateLandscapeReview=true;assert.throws(()=>liveLandscapeReview.read(ledgerPath));rejected.push('late-landscape-source-review-change');
cases.push('one-complete-landscape-source-decision-and-ten-exact-registry-digests-are-qualified');
// END retained original landscape-ledger
}
function phase_native_spec(){
 const prepared=getPrepared();
 const epoch=getEpoch();
// BEGIN retained original native-spec
assert.equal(epoch.native_spec_source_digests_applied,3);assert.equal(epoch.native_spec_review_pointers_applied,2);
assert.equal(prepared.native_spec_metadata_stage.before.equals(prepared.autocomplete_landscape_stage.after),true);
const nativeSpecPacket='compatibility/rc/autocomplete-selection-spec-successor.json';
rejects('changed-five-addition-native-spec-packet',path=>path===nativeSpecPacket?Buffer.concat([read(path),Buffer.from(' ')]):read(path));
const nativeReaders='compatibility/rc/autocomplete-selection-source-reader-successors.json';
rejects('changed-native-spec-source-reader-capsule',path=>path===nativeReaders?Buffer.concat([read(path),Buffer.from(' ')]):read(path));
const nativeLedgerPacket='compatibility/rc/autocomplete-selection-spec-ledger-successor.json';
rejects('changed-native-spec-ledger-successor',path=>path===nativeLedgerPacket?Buffer.concat([read(path),Buffer.from(' ')]):read(path));
const nativeSpec='projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts';
rejects('unrelated-native-spec-change',path=>path===nativeSpec?Buffer.concat([read(path),Buffer.from('\n// changed\n')]):read(path));
const nativeCode='scripts/upstream-rules-js-build-admission.mjs';
rejects('unrelated-native-source-reader-change',path=>path===nativeCode?Buffer.concat([read(path),Buffer.from('\n// changed\n')]):read(path));
const partialSpec=JSON.parse(prepared.canonical_after),oneSpec=partialSpec.entries.find(row=>row.sha==='db06fa8d8939d793f598bc3dbedc96a5a71c0db0');
oneSpec.individual_proof.historical_behavior.source_members.find(ref=>ref.path===nativeSpec).sha256='09a96761ccbb96309989dfc13517170c3600fb2bd57b3fb7e9c9cb02f788d423';
rejects('partial-native-spec-proof-digests',path=>path===ledgerPath?bytes(partialSpec):read(path));
const partialReview=JSON.parse(prepared.canonical_after),oldReviewEntry=JSON.parse(prepared.native_spec_metadata_stage.before).entries.find(row=>row.sha==='008212a9807fd01fd32fe136a075763b7b2c854d');
partialReview.entries.find(row=>row.sha===oldReviewEntry.sha).evidence_report=oldReviewEntry.evidence_report;
rejects('partial-native-spec-review-pointer',path=>path===ledgerPath?bytes(partialReview):read(path));
const currentSpecReview='compatibility/f10/disposition-ledger/evidence/closeout-autocomplete-landscape-selection-spec-source-judgment.json';
let lateSpecReview=false;const liveSpecReview=packedUpstreamLedgerEpoch({root,read:path=>lateSpecReview&&path===currentSpecReview?Buffer.concat([read(path),Buffer.from(' ')]):read(path)});
lateSpecReview=true;assert.throws(()=>liveSpecReview.read(ledgerPath));rejected.push('late-native-spec-current-review-change');
prepared.native_spec_source.bound.length=0;prepared.native_spec_source.spec.after.sha256='0'.repeat(64);
assert.equal(packedUpstreamLedgerEpoch({root,read}).read(nativeSpec).equals(read(nativeSpec)),true);
cases.push('native-spec-source-additions-and-five-metadata-scalars-preserve-all-decisions-and-current-code');
// END retained original native-spec
}
function phase_selection(){
 const prepared=getPrepared();
 const epoch=getEpoch();
// BEGIN retained original selection
assert.equal(epoch.selection_native_decisions_applied,3);assert.equal(epoch.selection_native_registry_digests_applied,11);
assert.equal(prepared.selection_native_stage.before.equals(prepared.native_spec_metadata_stage.after),true);
const selectionLedgerPacket='compatibility/rc/autocomplete-selection-ledger-successor.json';
rejects('changed-three-selection-ledger-successor',p=>p===selectionLedgerPacket?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
const selectionNativePacket='compatibility/rc/autocomplete-selection-native-contract-proposal.json';
rejects('changed-three-selection-native-proposal',p=>p===selectionNativePacket?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
const selectionScopeModule='scripts/autocomplete-selection-native-scopes.mjs';
rejects('changed-three-selection-native-scope-module',p=>p===selectionScopeModule?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
const selectionPacket=JSON.parse(read(selectionLedgerPacket)),selectionReview=selectionPacket.entries[0].review.path;
rejects('changed-three-selection-individual-source-report',p=>p===selectionReview?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
const selectionJudge='scripts/autocomplete-selection-source-judgment.mjs';
rejects('changed-three-selection-source-producer',p=>p===selectionJudge?Buffer.concat([read(p),Buffer.from(' ')]):read(p));
const partialSelection=JSON.parse(prepared.canonical_after),beforeSelection=JSON.parse(prepared.selection_native_stage.before);
const selectionIndex=partialSelection.entries.findIndex(row=>row.sha===selectionPacket.entries[0].sha);
partialSelection.entries[selectionIndex]=beforeSelection.entries[selectionIndex];
rejects('partial-three-selection-source-admission',p=>p===ledgerPath?bytes(partialSelection):read(p));
const partialSelectionDigests=JSON.parse(prepared.canonical_after),digestUpdate=selectionPacket.source_digest_updates[0];
let digestTarget=partialSelectionDigests.entries.find(row=>row.sha===digestUpdate.sha);
for(const key of digestUpdate.path.slice(0,-1))digestTarget=digestTarget[key];digestTarget.sha256=digestUpdate.before;
rejects('partial-eleven-selection-registry-digests',p=>p===ledgerPath?bytes(partialSelectionDigests):read(p));
const strippedSelection=JSON.parse(prepared.canonical_after);
delete strippedSelection.entries[selectionIndex].individual_proof.proof_kind;
rejects('stripped-required-selection-native-marker',p=>p===ledgerPath?bytes(strippedSelection):read(p));
for(const target of [selectionReview,selectionScopeModule]){
  let late=false;const live=packedUpstreamLedgerEpoch({root,read:p=>late&&p===target?Buffer.concat([read(p),Buffer.from(' ')]):read(p)});
  late=true;assert.throws(()=>live.read(ledgerPath));rejected.push('late-three-selection-subject-'+target);
}
cases.push('three-complete-selection-source-decisions-and-eleven-exact-registry-digests-are-qualified');
// END retained original selection
}
function phase_previous_state(){
 const prepared=getPrepared();
// BEGIN retained original previous-state
if(line==='21.x'){
 const packet=JSON.parse(read('compatibility/rc/autocomplete-selection-ledger-successor.json'));
 const raw=prepared.selection_native_stage.before,prior=JSON.parse(raw),after=JSON.parse(prepared.selection_native_stage.after);
 assert.ok(raw.equals(prepared.native_spec_metadata_stage.after));assert.equal(hash(raw),packet.before.sha256);assert.equal(raw.length,packet.before.bytes);assert.ok(historicalLedgerData(packet.before).equals(raw));
 assert.deepEqual([prepared.testing_api_stage.individual_decisions,prepared.sass_stage.individual_decisions,prepared.rules_js_stage.individual_decisions,prepared.autocomplete_landscape_stage.individual_decisions],[7,6,3,1]);
 assert.equal(packet.entries.length,3);assert.equal(new Set(packet.entries.map(row=>row.sha)).size,3);
 for(const row of packet.entries){const entry=prior.entries.find(value=>value.sha===row.sha);assert.ok(entry);assert.equal(hash(bytes(entry)),row.before_entry_sha256);assert.notDeepEqual(entry,row.after_entry);}
 const updates=packet.source_digest_updates;assert.equal(updates.length,11);assert.equal(new Set(updates.map(row=>JSON.stringify([row.sha,row.path]))).size,11);
 const value=(ledger,row)=>row.path.reduce((item,key)=>item[key],ledger.entries.find(entry=>entry.sha===row.sha));
 for(const row of updates){assert.equal(value(prior,row),row.before);assert.notEqual(value(prior,row),row.after);assert.equal(value(after,row),row.after);}
 const spec=JSON.parse(read('compatibility/rc/autocomplete-selection-spec-ledger-successor.json'));
 assert.equal(prepared.native_spec_metadata_stage.source_proof_digests,3);assert.equal(prepared.native_spec_metadata_stage.source_review_pointers,2);assert.equal(spec.literal_updates.length,5);
 for(const row of spec.literal_updates)assert.equal(value(prior,row),row.after);
 const frame=currentCanonicalTestFrame({root,read}),previousComplete=packedUpstreamLedgerEpoch({root,read});assert.equal(previousComplete.raw,read);assert.equal(previousComplete.individual_decisions_applied,frame.individual_source_reviews);assert.ok(previousComplete.read(landscapeRegistry).equals(read(landscapeRegistry)));
 assert.throws(()=>packedUpstreamLedgerEpoch({root,read:p=>p===ledgerPath?raw:read(p)}),error=>error.code==='ERR_ASSERTION'&&error.message==='nonphysical canonical input '+ledgerPath);
 supplementalProjection.push('historical-selection-before-rejected-at-physical-boundary');previousComplete.assertCurrent();frame.assertCurrent();prepared.assertCurrent();
}else{
 const previousComplete=packedUpstreamLedgerEpoch({root,read:p=>p===ledgerPath?prepared.selection_native_stage.before:read(p)});
 assert.equal(previousComplete.selection_native_decisions_applied,0);assert.equal(previousComplete.selection_native_registry_digests_applied,0);
 assert.equal(previousComplete.individual_decisions_applied,10);assert.equal(previousComplete.native_spec_source_digests_applied,3);
 assert.equal(previousComplete.read(landscapeRegistry).equals(read(landscapeRegistry)),true);
}
cases.push('earlier-exact-complete-metadata-state-cannot-claim-new-selection-admissions');
// END retained original previous-state
}
function originalSummary(frameCount=null){const prepared=getPrepared(),epoch=getEpoch();
// BEGIN retained original report-summary
return {line: input.line, result: 'pass', cases, rejected,
  canonical_entries: 1697, qualified_source_entries: 85, changed_scalar_tokens: 179,
  source_context_members: 20, packed_epoch_members: 16, original_dispositions_changed: epoch.individual_decisions_applied,
  selection_source_decisions:epoch.selection_native_decisions_applied,selection_registry_digest_updates:epoch.selection_native_registry_digests_applied,
  complete_ledger_frames:frameCount,title_source_decisions:epoch.title_source_decisions_applied??0,title_registry_metadata_tokens:epoch.title_native_registry_metadata_tokens_applied??0,
  theming_source_decisions:epoch.theming_source_decisions_applied??0,
  inspection_source_decisions:epoch.inspection_source_decisions_applied??0,
  selector_density_source_decisions:epoch.selector_density_source_decisions_applied??0,
  button_tokenization_source_decisions:epoch.button_tokenization_source_decisions_applied??0,
  button_token_repairs_source_decisions:epoch.button_token_repairs_source_decisions_applied??0,
  surface_m3_theme_source_decisions:epoch.surface_m3_theme_source_decisions_applied??0,
  slider_m3_repairs_source_decisions:epoch.slider_m3_repairs_source_decisions_applied??0,
  control_m3_theme_source_decisions:epoch.control_m3_theme_source_decisions_applied??0,
  foundation_m3_theme_source_decisions:epoch.foundation_m3_theme_source_decisions_applied??0,
  core_tokenization_source_decisions:epoch.core_tokenization_source_decisions_applied??0,
  remaining_unthemable_source_decisions:epoch.remaining_unthemable_source_decisions_applied??0,
  analysis_python_version: prepared.analysis_python_version,
  actual_current_canonical_after_sha256: hash(read(ledgerPath)), historical_before_sha256: hash(prepared.before),
  source_owner_sha256: hash(read(owner)), producer_sha256: hash(read('tests/packed_upstream_ledger_epoch_probe.mjs')),
  current_native_packed_or_floor_or_g11_credit: false};
// END retained original report-summary
}
const PHASES=[
  {
    "id": "canonical",
    "cases": [
      "actual-canonical-ledger-is-exact-qualified-successor-after-image",
      "finite-frame-catalog-equals-every-independently-prepared-complete-stage"
    ],
    "rejected": []
  },
  {
    "id": "reader-projection",
    "cases": [
      "only-one-historical-ledger-projected-all-current-product-code-and-reports-raw"
    ],
    "rejected": []
  },
  {
    "id": "before-state",
    "cases": [
      "unapplied-exact-before-state-does-not-claim-admission-or-project-product"
    ],
    "rejected": []
  },
  {
    "id": "public-reader-metadata",
    "cases": [
      "public-metadata-cannot-change-private-reader-state-or-projection-scope"
    ],
    "rejected": []
  },
  {
    "id": "early-guards",
    "cases": [],
    "rejected": [
      "unknown-ledger-frame-rejected-before-expensive-source-preparation",
      "changed-complete-ledger-frame-catalog",
      "late-complete-ledger-frame-catalog-change"
    ]
  },
  {
    "id": "input-guards",
    "cases": [],
    "rejected": [
      "changed-qualified-inputs",
      "wrong-line-inputs",
      "unrelated-canonical-entry-change",
      "mixed-before-and-after-canonical-ledger",
      "changed-current-report",
      "changed-original-report",
      "changed-validation-proof",
      "unrelated-product-style",
      "unqualified-source-owner",
      "source-owner-before-integration"
    ]
  },
  {
    "id": "reader-root",
    "cases": [],
    "rejected": [
      "historical-ledger-reader-root-mismatch"
    ]
  },
  {
    "id": "python-runtime",
    "cases": [],
    "rejected": [
      "wrong-source-analysis-python",
      "late-source-analysis-python-change"
    ]
  },
  {
    "id": "live-input-guards",
    "cases": [],
    "rejected": [
      "late-canonical-reversion",
      "late-input-change",
      "late-current-report-change",
      "late-product-style-change"
    ]
  },
  {
    "id": "source-context",
    "cases": [
      "complete-existing-historical-context-and-native-unwrapping-use-correct-ledger-epochs"
    ],
    "rejected": []
  },
  {
    "id": "stage-population",
    "cases": [],
    "rejected": []
  },
  {
    "id": "testing-api",
    "cases": [],
    "rejected": [
      "changed-seven-individual-transition",
      "partial-seven-individual-admission",
      "changed-seven-individual-validator"
    ]
  },
  {
    "id": "sass",
    "cases": [
      "six-source-decisions-are-qualified-current-epoch"
    ],
    "rejected": [
      "changed-six-Sass-transition",
      "changed-six-Sass-validator",
      "partial-six-Sass-admission",
      "late-Sass-review-change"
    ]
  },
  {
    "id": "build",
    "cases": [
      "three-complete-build-decisions-are-qualified-current-epoch"
    ],
    "rejected": [
      "changed-three-build-transition",
      "changed-three-build-validator",
      "partial-three-build-admission",
      "late-build-review-change"
    ]
  },
  {
    "id": "summary",
    "cases": [
      "two-derived-summary-counters-preserve-every-entry"
    ],
    "rejected": [
      "changed-summary-transition",
      "wrong-summary-count-with-identical-entries"
    ]
  },
  {
    "id": "landscape-registry",
    "cases": [
      "exact-additive-landscape-contract-keeps-all-canonical-ledger-and-product-bytes-raw"
    ],
    "rejected": [
      "changed-landscape-registry-transition",
      "changed-historical-registry-outside-finite-landscape-addition",
      "omitted-mandatory-landscape-registration",
      "late-landscape-registry-change",
      "late-landscape-transition-change"
    ]
  },
  {
    "id": "landscape-ledger",
    "cases": [
      "one-complete-landscape-source-decision-and-ten-exact-registry-digests-are-qualified"
    ],
    "rejected": [
      "changed-landscape-ledger-transition",
      "partial-landscape-source-decision",
      "partial-landscape-registry-digests",
      "changed-landscape-individual-source-judgment",
      "changed-landscape-source-helper",
      "late-landscape-source-review-change"
    ]
  },
  {
    "id": "native-spec",
    "cases": [
      "native-spec-source-additions-and-five-metadata-scalars-preserve-all-decisions-and-current-code"
    ],
    "rejected": [
      "changed-five-addition-native-spec-packet",
      "changed-native-spec-source-reader-capsule",
      "changed-native-spec-ledger-successor",
      "unrelated-native-spec-change",
      "unrelated-native-source-reader-change",
      "partial-native-spec-proof-digests",
      "partial-native-spec-review-pointer",
      "late-native-spec-current-review-change"
    ]
  },
  {
    "id": "selection",
    "cases": [
      "three-complete-selection-source-decisions-and-eleven-exact-registry-digests-are-qualified"
    ],
    "rejected": [
      "changed-three-selection-ledger-successor",
      "changed-three-selection-native-proposal",
      "changed-three-selection-native-scope-module",
      "changed-three-selection-individual-source-report",
      "changed-three-selection-source-producer",
      "partial-three-selection-source-admission",
      "partial-eleven-selection-registry-digests",
      "stripped-required-selection-native-marker",
      "late-three-selection-subject-compatibility/f10/disposition-ledger/evidence/closeout-autocomplete-selection-d5d468a29a2db4c0676c57d60bc8431ed4fd6e18-individual-source-judgment.json",
      "late-three-selection-subject-scripts/autocomplete-selection-native-scopes.mjs"
    ]
  },
  {
    "id": "previous-state",
    "cases": [
      "earlier-exact-complete-metadata-state-cannot-claim-new-selection-admissions"
    ],
    "rejected": []
  }
];
const runners={"canonical":phase_canonical,"reader-projection":phase_reader_projection,"before-state":phase_before_state,"public-reader-metadata":phase_public_reader_metadata,"early-guards":phase_early_guards,"input-guards":phase_input_guards,"reader-root":phase_reader_root,"python-runtime":phase_python_runtime,"live-input-guards":phase_live_input_guards,"source-context":phase_source_context,"stage-population":phase_stage_population,"testing-api":phase_testing_api,"sass":phase_sass,"build":phase_build,"summary":phase_summary,"landscape-registry":phase_landscape_registry,"landscape-ledger":phase_landscape_ledger,"native-spec":phase_native_spec,"selection":phase_selection,"previous-state":phase_previous_state};
const subjectPaths=['tests/packed_upstream_ledger_epoch_probe.mjs','tests/test_packed_upstream_ledger_epoch.py','scripts/packed-upstream-ledger-epoch.mjs','scripts/packed-upstream-ledger-base.mjs','scripts/upstream-source-contract-registry.mjs',inputPath,ledgerPath,'projects/ngx-material-legacy/package.json'];
const subjects=()=>subjectPaths.map(path=>{const raw=read(path);return {path,sha256:hash(raw),bytes:raw.length};});
const requested=process.argv[2]??'all';
assert.ok(process.argv.length<=3,'unexpected retained-ledger phase arguments');
assert.ok(requested==='--catalog'||requested==='all'||PHASES.some(p=>p.id===requested),'unknown retained-ledger phase');
if(requested==='--catalog'){
 console.log(JSON.stringify({schema_version:1,mode:'catalogue',line,phases:PHASES,subjects:subjects(),source_preparation_executed:false,actual_native_artifact_browser_floor_or_full_audit_qualified:false}));
}else{
 const selected=requested==='all'?PHASES:PHASES.filter(p=>p.id===requested);assert.ok(selected.length>0);
 const beforeSubjects=subjects(),facts={};
 for(const phase of selected)facts[phase.id]=runners[phase.id]()??{};
 assert.deepEqual(cases,selected.flatMap(p=>p.cases),'missing,duplicate or unexpected retained positive case');
 assert.deepEqual(rejected,selected.flatMap(p=>p.rejected),'missing,duplicate or unexpected retained rejection control');
 assert.equal(new Set(cases).size,cases.length);assert.equal(new Set(rejected).size,rejected.length);
 assert.deepEqual(subjects(),beforeSubjects,'retained test subjects changed during the phase');
 const summary=requested==='all'||requested==='stage-population'?originalSummary(facts.canonical?.complete_ledger_frames??null):null;
 assert.deepEqual(subjects(),beforeSubjects,'retained test subjects changed before report output');
 console.log(JSON.stringify({...summary,schema_version:1,line,result:'pass',phase:requested,cases,rejected,facts,supplemental_data:supplementalData,supplemental_projection:supplementalProjection,subjects:beforeSubjects,summary,full_retained_roster_executed:requested==='all',actual_native_artifact_browser_floor_or_full_audit_qualified:false,current_native_packed_or_floor_or_g11_credit:false}));
}

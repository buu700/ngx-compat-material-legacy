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
// BEGIN retained original rejection-helper
function rejects(id, corrupt) {
  assert.throws(() => packedUpstreamLedgerEpoch({root, read: corrupt}), undefined, id); rejected.push(id);
}
// END retained original rejection-helper
function phase_canonical(){
 const prepared=getPrepared();
// BEGIN retained original canonical
assert.equal(prepared.entries_changed, 85); assert.equal(prepared.scalar_tokens_changed, 179);
assert.equal(read(ledgerPath).equals(prepared.canonical_after), true);
assert.equal(JSON.parse(read(ledgerPath)).entries.length, 1697);
cases.push('actual-canonical-ledger-is-exact-qualified-successor-after-image');
// END retained original canonical
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
const before = packedUpstreamLedgerEpoch({root, read: path => path === ledgerPath ? prepared.before : read(path)});
assert.equal(before.applied, false); assert.deepEqual(before.projected_metadata_paths, []);
assert.equal(before.read(ledgerPath).equals(prepared.before), true);
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
assert.equal(epoch.rules_js_decisions_applied,3);
assert.equal(epoch.summary_scalar_updates_applied,2);
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
// END retained original stage-population
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
const previousComplete=packedUpstreamLedgerEpoch({root,read:p=>p===ledgerPath?prepared.selection_native_stage.before:read(p)});
assert.equal(previousComplete.selection_native_decisions_applied,0);assert.equal(previousComplete.selection_native_registry_digests_applied,0);
assert.equal(previousComplete.individual_decisions_applied,input.line==='21.x'?17:10);
assert.equal(previousComplete.native_spec_source_digests_applied,3);
assert.equal(previousComplete.read(landscapeRegistry).equals(read(landscapeRegistry)),true);
cases.push('earlier-exact-complete-metadata-state-cannot-claim-new-selection-admissions');
// END retained original previous-state
}
function originalSummary(frameCount=null){const prepared=getPrepared(),epoch=getEpoch();
// BEGIN retained original report-summary
return {line: input.line, result: 'pass', cases, rejected,
  canonical_entries: 1697, qualified_source_entries: 85, changed_scalar_tokens: 179,
  source_context_members: 20, packed_epoch_members: 16, original_dispositions_changed: epoch.individual_decisions_applied,
  selection_source_decisions:epoch.selection_native_decisions_applied,selection_registry_digest_updates:epoch.selection_native_registry_digests_applied,
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
      "actual-canonical-ledger-is-exact-qualified-successor-after-image"
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
const runners={"canonical":phase_canonical,"reader-projection":phase_reader_projection,"before-state":phase_before_state,"public-reader-metadata":phase_public_reader_metadata,"input-guards":phase_input_guards,"reader-root":phase_reader_root,"python-runtime":phase_python_runtime,"live-input-guards":phase_live_input_guards,"source-context":phase_source_context,"stage-population":phase_stage_population,"sass":phase_sass,"build":phase_build,"summary":phase_summary,"landscape-registry":phase_landscape_registry,"landscape-ledger":phase_landscape_ledger,"native-spec":phase_native_spec,"selection":phase_selection,"previous-state":phase_previous_state};
const subjectPaths=['tests/packed_upstream_ledger_epoch_probe.mjs','tests/test_packed_upstream_ledger_epoch.py','scripts/packed-upstream-ledger-epoch.mjs',inputPath,ledgerPath,'projects/ngx-material-legacy/package.json'];
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
 console.log(JSON.stringify({...summary,schema_version:1,line,result:'pass',phase:requested,cases,rejected,facts,subjects:beforeSubjects,summary,full_retained_roster_executed:requested==='all',actual_native_artifact_browser_floor_or_full_audit_qualified:false,current_native_packed_or_floor_or_g11_credit:false}));
}

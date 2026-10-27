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
const prepared = preparePackedUpstreamLedger({root, read});
assert.equal(prepared.entries_changed, 85); assert.equal(prepared.scalar_tokens_changed, 179);
assert.equal(read(ledgerPath).equals(prepared.canonical_after), true);
assert.equal(JSON.parse(read(ledgerPath)).entries.length, 1697);
cases.push('actual-canonical-ledger-is-exact-qualified-successor-after-image');
const epoch = packedUpstreamLedgerEpoch({root, read}); assert.equal(epoch.applied, true);
assert.equal(epoch.raw, read); assert.equal(epoch.read(ledgerPath).equals(prepared.before), true);
assert.deepEqual(epoch.projected_metadata_paths, [ledgerPath]);
assert.equal(snackDomRawCurrentRead({root, read: epoch.read})(ledgerPath).equals(prepared.canonical_after), true);
assert.equal(packedUpstreamLedgerEpoch({root, read: epoch.read}).applied, true);
for (const member of [style, owner, input.reports[0].after.path, 'projects/ngx-material-legacy/legacy-chips/chip.ts'])
  assert.equal(epoch.read(member).equals(read(member)), true);
assert.equal(epoch.current_native_packed_or_floor_or_g11_credit, false);
cases.push('only-one-historical-ledger-projected-all-current-product-code-and-reports-raw');
const before = packedUpstreamLedgerEpoch({root, read: path => path === ledgerPath ? prepared.before : read(path)});
assert.equal(before.applied, false); assert.deepEqual(before.projected_metadata_paths, []);
assert.equal(before.read(ledgerPath).equals(prepared.before), true);
cases.push('unapplied-exact-before-state-does-not-claim-admission-or-project-product');
epoch.applied = false; epoch.projected_metadata_paths.push(style);
assert.equal(epoch.read(ledgerPath).equals(prepared.before), true);
assert.equal(epoch.read(style).equals(read(style)), true);
cases.push('public-metadata-cannot-change-private-reader-state-or-projection-scope');

function rejects(id, corrupt) {
  assert.throws(() => packedUpstreamLedgerEpoch({root, read: corrupt}), undefined, id); rejected.push(id);
}
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
assert.throws(() => snackDomRawCurrentRead({root: root + '/wrong-context', read: epoch.read}));
rejected.push('historical-ledger-reader-root-mismatch');
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
const context = snackDomSourceContext({root, read: epoch.read});
assert.equal(context.members, 20); assert.equal(context.packed_repair_epoch_members, 16);
assert.equal(context.current_successors, 25);
assert.equal(context.raw(ledgerPath).equals(prepared.canonical_after), true);
assert.equal(snackDomRawCurrentRead({root, read: context.read})(ledgerPath).equals(prepared.canonical_after), true);
cases.push('complete-existing-historical-context-and-native-unwrapping-use-correct-ledger-epochs');
assert.equal(epoch.testing_api_decisions_applied,input.line==='21.x'?7:0);
assert.equal(epoch.sass_decisions_applied,6);
assert.equal(epoch.individual_decisions_applied,input.line==='21.x'?17:10);
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

const summaryPath='compatibility/rc/upstream-ledger-summary-transition.json';
rejects('changed-summary-transition',path=>path===summaryPath?Buffer.concat([read(path),Buffer.from(' ')]):read(path));
const wrongSummary=JSON.parse(prepared.canonical_after);wrongSummary.open_or_deferred++;
rejects('wrong-summary-count-with-identical-entries',path=>path===ledgerPath?bytes(wrongSummary):read(path));
assert.deepEqual(JSON.parse(prepared.summary_stage.after).entries,JSON.parse(prepared.summary_stage.before).entries);
assert.equal(prepared.autocomplete_landscape_stage.before.equals(prepared.summary_stage.after),true);
assert.equal(prepared.summary_stage.scalar_updates,2);
cases.push('two-derived-summary-counters-preserve-every-entry');

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

console.log(JSON.stringify({line: input.line, result: 'pass', cases, rejected,
  canonical_entries: 1697, qualified_source_entries: 85, changed_scalar_tokens: 179,
  source_context_members: 20, packed_epoch_members: 16, original_dispositions_changed: epoch.individual_decisions_applied,
  analysis_python_version: prepared.analysis_python_version,
  actual_current_canonical_after_sha256: hash(read(ledgerPath)), historical_before_sha256: hash(prepared.before),
  source_owner_sha256: hash(read(owner)), producer_sha256: hash(read('tests/packed_upstream_ledger_epoch_probe.mjs')),
  current_native_packed_or_floor_or_g11_credit: false}));

/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {projectRetainedHistoricalProof as project} from '../scripts/packed-upstream-ledger-epoch.mjs';
import {autocompleteLandscapeSourceJudgment} from '../scripts/autocomplete-landscape-source-judgment.mjs';
import {autocompleteSelectionSourceJudgments} from '../scripts/autocomplete-selection-source-judgment.mjs';
import {autocompleteSelectionSpecSubject} from '../scripts/autocomplete-selection-spec-subject.mjs';
import {autocompleteSelectionNativeSubject,SELECTION_NATIVE_REGISTRY} from '../scripts/autocomplete-selection-native-subject.mjs';
import {retainedSelectionMetadataContext} from '../scripts/retained-selection-metadata-context.mjs';
import {retainedLandscapeProgramSource} from '../scripts/retained-landscape-program-source.mjs';
const root=process.cwd(),read=path=>readFileSync(root+'/'+path),context=retainedSelectionMetadataContext({root}),programs=retainedLandscapeProgramSource({root});
const spec=autocompleteSelectionSpecSubject({root}),native=autocompleteSelectionNativeSubject({root});
const qualify=ref=>{
 let selected;
 if(ref.path===spec.path){const prior=[spec.before,spec.after,spec.current_after].find(row=>row.sha256===ref.sha256);assert.ok(prior);if(ref.bytes!==undefined)assert.equal(ref.bytes,prior.bytes);selected=spec.current_after;}
 else if(ref.path===SELECTION_NATIVE_REGISTRY)selected=native.qualify(ref);
 else selected=programs.qualifyMetadata(ref)??context.qualifyMetadata(ref)??ref;
 return {path:ref.path,sha256:selected.sha256,...(ref.bytes===undefined?{}:{bytes:selected.bytes})};
};
const landscape=autocompleteLandscapeSourceJudgment({root});
const packet=JSON.parse(gunzipSync(read('compatibility/rc/autocomplete-landscape-ledger-transition.json.gz')));
const expected=packet.entry.after_entry.individual_proof,actual=landscape.proof;
const actualBefore=structuredClone(actual),expectedBefore=structuredClone(expected);
const first=project({current:actual,expected,qualify});assert.deepEqual(first,expected);assert.deepEqual(actual,actualBefore);assert.deepEqual(expected,expectedBefore);
first.historical_behavior.source_members[0].sha256='0'.repeat(64);assert.deepEqual(expected,expectedBefore);
const postSpec=structuredClone(expected),specPacket=JSON.parse(read('compatibility/rc/autocomplete-selection-spec-ledger-successor.json'));
const update=specPacket.literal_updates.find(row=>row.sha===packet.entry.sha&&row.path.at(-1)==='sha256');assert.ok(update);
let value=postSpec;for(const key of update.path.slice(1,-1))value=value[key];assert.equal(value.sha256,update.before);value.sha256=update.after;
assert.deepEqual(project({current:actual,expected:postSpec,qualify}),postSpec);
const selections=autocompleteSelectionSourceJudgments({root}),selectionPacket=JSON.parse(read('compatibility/rc/autocomplete-selection-ledger-successor.json'));
for(const[index,row]of selections.reports.entries())assert.deepEqual(project({current:row.proof,expected:selectionPacket.entries[index].after_entry.individual_proof,qualify}),selectionPacket.entries[index].after_entry.individual_proof);
const negatives=[];
function reject(id,change){const args={current:structuredClone(actual),expected:structuredClone(expected),qualify};change(args);assert.throws(()=>project(args),undefined,id);negatives.push(id);}
reject('changed-decision',args=>args.current.decision+=' changed');
reject('changed-patch',args=>args.current.diff_sha256='0'.repeat(64));
reject('missing-native-case',args=>args.current.historical_behavior.case_ids.pop());
reject('source-omission',args=>args.current.historical_behavior.source_members.pop());
reject('source-order',args=>args.current.historical_behavior.source_members.reverse());
reject('duplicate-source',args=>{args.expected.historical_behavior.source_members[1]=structuredClone(args.expected.historical_behavior.source_members[0]);args.current.historical_behavior.source_members[1]=structuredClone(args.current.historical_behavior.source_members[0]);});
reject('wrong-current-hash',args=>args.current.historical_behavior.source_members[0].sha256='0'.repeat(64));
reject('unknown-old-hash',args=>args.expected.historical_behavior.source_members.find(ref=>ref.path===spec.path).sha256='0'.repeat(64));
reject('renamed-qualification',args=>args.qualify=ref=>({...qualify(ref),path:'unknown/path.ts'}));
reject('missing-qualification',args=>args.qualify=()=>null);
reject('missing-selector',args=>delete args.qualify);
reject('empty-source-claim',args=>{args.current.historical_behavior.source_members=[];args.expected.historical_behavior.source_members=[];});
context.assertCurrent();programs.assertCurrent();landscape.assertExternal();selections.assertCurrent();
console.log(JSON.stringify({result:'pass',actual_landscape_projections:2,actual_native_projections:3,projected_member_occurrences:113,
 negative_controls:negatives.length,inputs_and_outputs_isolated:true,full_retained_preparation_executed:false,artifact_or_audit_admission_granted:false}));

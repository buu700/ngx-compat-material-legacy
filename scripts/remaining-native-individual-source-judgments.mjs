/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole immutable patches and individual owned-source decisions; native guards remain mandatory. */
import {nativeIndividualZoneSourceSuccessor} from './native-individual-zone-source-successor.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {formFieldHoverRequirements,FORM_FIELD_HOVER_SHA,FORM_FIELD_HOVER_KIND} from './upstream-form-field-hover-evidence.mjs';
import {tabCompletionRequirements,TAB_COMPLETION_SHA,TAB_COMPLETION_KIND} from './upstream-tab-completion-evidence.mjs';
import {rippleReplayRequirements,RIPPLE_REPLAY_SHA,RIPPLE_REPLAY_KIND} from './upstream-ripple-replay-evidence.mjs';
import {formFieldStateArgumentResultsMatch} from './sass-form-field-state-contract.mjs';
import {inspectRippleReplaySourceRoute} from './ripple-replay-route-source.mjs';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const NATIVE_INDIVIDUAL_INPUTS='compatibility/rc/remaining-native-admission-individual-source-inputs.json';
const pins={main:'02145c1e2d01220cbe31d4356d4095c0346d3c1e56411b508a4e6c85dd736783','21.x':'9cf55fc94eaf3a8e6c26d53f5e9242559b5e6dfa7bdd240d2c0789115256656b'};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),gitHash=(kind,bytes)=>createHash('sha1').update(kind+' '+bytes.length+'\0').update(bytes).digest('hex');
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const expected={
 [FORM_FIELD_HOVER_SHA]:{path:'src/material/form-field/_form-field-focus-overlay.scss',patch:'e2ca404fabad6af81c12ef841957e5d3a05a9439627b3302751baccde7ec9d69',hunks:1},
 [TAB_COMPLETION_SHA]:{path:'src/material/tabs/tab-body.ts',patch:'8c5c7c7e24faef142a0320faf51bd61cecd10c7e06eeeeb15ddc0f53cb654083',hunks:2},
 [RIPPLE_REPLAY_SHA]:{path:'src/cdk/platform/features/shadow-dom.ts',patch:'c5a3cab8777ece5990a5e00eaa506a871971176c33e8ade45277d7a2a169b037',hunks:1},
};
function treeEntries(raw){const rows=[];let at=0;while(at<raw.length){const space=raw.indexOf(32,at),end=raw.indexOf(0,space);assert.ok(space>at&&end>space&&end+21<=raw.length);rows.push({mode:raw.subarray(at,space).toString(),name:raw.subarray(space+1,end).toString(),sha:raw.subarray(end+1,end+21).toString('hex')});at=end+21;}assert.equal(at,raw.length);assert.equal(new Set(rows.map(row=>row.name)).size,rows.length);return rows;}
function treeChain(record,path,commit,blob){
 const raw=Buffer.from(record.raw_commit);assert.equal(record.commit,commit);assert.equal(gitHash('commit',raw),commit,'upstream parent/commit bytes changed');
 const root=raw.toString().split('\n').find(line=>line.startsWith('tree '))?.slice(5);assert.match(root||'',/^[0-9a-f]{40}$/);
 const parts=path.split('/');assert.equal(record.chain.length,parts.length);let current=root;const otherBranches=[];
 for(const[index,name]of parts.entries()){
  const node=record.chain[index];assert.equal(node.path,parts.slice(0,index).join('/'));assert.equal(node.sha,current);const bytes=Buffer.from(node.raw_base64,'base64');assert.equal(gitHash('tree',bytes),current,'upstream tree object changed');
  const entries=treeEntries(bytes),selected=entries.filter(row=>row.name===name);assert.equal(selected.length,1);
  assert.equal(selected[0].mode,index===parts.length-1?'100644':'40000');current=selected[0].sha;
  otherBranches.push(entries.filter(row=>row.name!==name).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0));
 }
 assert.equal(current,blob,'upstream file is not bound to the commit tree');return otherBranches;
}
/** Apply every original hunk exactly; no normalizing, selected-line matching or candidate oracle. */
export function reviewOriginalNativePatch(original,tree){
 const subject=expected[original?.sha];assert.ok(subject,'unregistered original native subject');assert.equal(original.path,subject.path);assert.equal(tree.sha,original.sha);assert.equal(tree.path,subject.path);
 const raw=Buffer.from(original.raw_commit);assert.equal(gitHash('commit',raw),original.sha);assert.equal(hash(raw),original.raw_commit_sha256);
 const parents=raw.toString().split('\n').filter(line=>line.startsWith('parent ')).map(line=>line.slice(7));assert.deepEqual(parents,[original.parent]);
 assert.deepEqual(original.changed_files,[subject.path]);const before=Buffer.from(original.complete_before),after=Buffer.from(original.complete_after);
 assert.equal(hash(before),original.before_sha256);assert.equal(hash(after),original.after_sha256);assert.equal(gitHash('blob',before),original.before_blob);assert.equal(gitHash('blob',after),original.after_blob);
 assert.equal(tree.after.raw_commit,original.raw_commit);const priorOther=treeChain(tree.before,subject.path,original.parent,original.before_blob),nextOther=treeChain(tree.after,subject.path,original.sha,original.after_blob);
 assert.deepEqual(nextOther,priorOther,'original commit changed a second source path');
 assert.equal(hash(original.patch),subject.patch);assert.equal(original.patch_sha256,subject.patch);
 const lines=original.patch.split('\n');assert.equal(lines[0],`diff --git a/${subject.path} b/${subject.path}`);assert.equal(lines.filter(line=>line.startsWith('diff --git ')).length,1);
 const index=lines[1].match(/^index ([0-9a-f]+)\.\.([0-9a-f]+) 100644$/);assert.ok(index);assert.ok(original.before_blob.startsWith(index[1])&&original.after_blob.startsWith(index[2]));assert.equal(lines[2],'--- a/'+subject.path);assert.equal(lines[3],'+++ b/'+subject.path);
 const source=original.complete_before.split('\n'),output=[],hunks=[];let cursor=0,at=4;
 while(at<lines.length){
  if(at===lines.length-1&&lines[at]==='')break;
  const header=lines[at].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);assert.ok(header,'unparsed original hunk');const start=at,oldStart=Number(header[1]),oldCount=header[2]===undefined?1:Number(header[2]),newStart=Number(header[3]),newCount=header[4]===undefined?1:Number(header[4]);
  const offset=oldStart?oldStart-1:0;assert.ok(offset>=cursor);output.push(...source.slice(cursor,offset));cursor=offset;assert.equal(output.length,newStart?newStart-1:0);let consumed=0,produced=0;at++;
  while(at<lines.length&&!lines[at].startsWith('@@ ')){
   if(at===lines.length-1&&lines[at]==='')break;
   const line=lines[at],prefix=line[0],text=line.slice(1);assert.ok([' ','-','+'].includes(prefix),'unparsed original diff line');
   if(prefix!=='+' ){assert.equal(source[cursor],text,'original hunk context/removal changed');cursor++;consumed++;}
   if(prefix!=='-'){output.push(text);produced++;}at++;
  }
  assert.equal(consumed,oldCount);assert.equal(produced,newCount);hunks.push({path:subject.path,header:lines[start],hunk_sha256:hash(lines.slice(start,at).join('\n')+'\n')});
 }
 output.push(...source.slice(cursor));assert.equal(output.join('\n'),original.complete_after,'entire original after-file not recovered');assert.equal(hunks.length,subject.hunks);
 return {sha:original.sha,patch_sha256:subject.patch,original_files:1,original_hunks:hunks.length,hunks,complete_before_sha256:original.before_sha256,complete_after_sha256:original.after_sha256,complete_commit_tree_and_hunks_verified:true};
}
const decisions={
 [FORM_FIELD_HOVER_SHA]:{
  disposition:'do-not-adopt',kind:FORM_FIELD_HOVER_KIND,
  decision:'Retain the independently owned Material16 ordinary form-field Sass host-hover selector and the finite three-token current state bridge. The upstream one-hunk wrapper-hover change narrows the ordinary MDC helper behavior over the hint/error area. Porting that selector changes the complete historical exported CSS and violates the legacy Sass contract. Both exact minimum public components already provide wrapper-hover structural CSS and consume the independently measured public state tokens. The owned legacy-form-field markup/style family is distinct and remains unchanged. Require the complete same-run packed browser pointer/focus/light/dark/token-mutation/restoration observations; the source/CSS decision alone never admits this SHA.',
  hunk_judgments:['The changed selector is a behavior change to historical ordinary MDC form-field Sass, not a missing source import or current component implementation. Preserve the whole tagged host-hover helper after only the two recorded module relocations. All four complete configurable outputs equal the untouched tagged CSS plus the independently compiled finite three-token insertion; rehashed wrapper-hover and unrelated-rule mutations fail. The public minimum component structural wrapper selector is already present, while legacy-form-field selectors and DOM are separate. No selector, palette, namespace binding, map or golden is changed.'],
 },
 [TAB_COMPLETION_SHA]:{
  disposition:'do-not-adopt',kind:TAB_COMPLETION_KIND,
  decision:'Retain the complete historical completion subscription, including distinctUntilChanged on both state names and the existing asynchronous centered output. Removing the RxJS operator changes the untouched Material16 output contract under duplicate callbacks; both exact minimum current peer methods belong to the modern component and are not the legacy subscription contract. The current owned source preserves this filter and constructor/output metadata while separately repairing incoming/departing and newly created origin lifecycle timing. Require trusted native incoming/departing/both-origin transitions, correct height, exactly-once public completion and cleanup in the complete same-run native matrix. Source protocols and historical replay do not qualify native execution.',
  hunk_judgments:['The operator import removal belongs to the same upstream removal of the completion-state filter. The owned source keeps the stable public rxjs/operators distinctUntilChanged import, compatible with the existing RxJS peer range. No modern peer constructor, animation-engine helper, private import or consumer API migration is introduced.',
   'The constructor hunk removes both-state equality filtering while preserving the centered/leaving checks. The complete untouched historical base and actual owned base produce the same output histories for duplicate center/leave, real repeated cycles, changed source/destination, obsolete state and both origin names. Removing the filter changes those reference observations and is rejected. The current owned motion lifecycle is tested independently with47 cases/22 rejected mutants; the public group animationDone path and portal detach wiring remain. Keep the original output contract and require genuine trusted native completion on all registered modes/engines/runtimes.'],
 },
 [RIPPLE_REPLAY_SHA]:{
  disposition:'adapt',kind:RIPPLE_REPLAY_KIND,
  decision:'Adapt the complete throwing-composedPath fallback in the independently owned event-target helper and retain its existing empty/missing-path fallback. Every owned ripple manager event delegates through that helper and preserves historical registration order and cleanup. The public MatRipple alias is a separate peer route:22.1.7 contains the private catch,21.2.14 does not and must never be described as inherited-fixed. Complete exact-floor Angular replay sources patch composedPath to throw and invoke stashed Angular handlers directly without DOM redispatch; the public directive has no Angular host listener and registers document capture instead. Public launch receives coordinates/config, not the replay event. The diagnostic Angular replay handler never launches or forwards. This establishes the expected default route without patching or invoking private peer/framework symbols. Require genuine packed Angular replay/native observations, actual no-launch replay plus live native creation, owned fallback and cleanup on both runtime modes. Preserve the explicit21 controlled native fault as a diagnostic, not a fix or risk exception; native/source-floor qualification remains independently mandatory.',
  hunk_judgments:['The only original hunk moves composedPath invocation into try/catch and falls back to event.target; its preventDefault comment does not implement a second fix. The owned helper applies this behavior while keeping its already owned empty/missing-path fallback. No current private symbol is imported or invoked. Exact public peer source traces identify direct document capture and the22-only private catch;21 lacks it. Exact Angular core/primitives/platform-browser sources prove the expected stashed-handler replay route and the absence of a default DOM redispatch into that peer listener. The public launch route is not event-target evidence. The current producer keeps owned replay, manual launch, directive-only native input and genuine no-manual-launch replay observations separate. Actual packed/browser observations must confirm this supported route; deliberately broken native composedPath on21 remains an explicit diagnostic failure rather than an inherited fix.'],
 },
};

/** Old review documents are immutable; the three ledger rows have one exact proposal. */
export function assertNativeIndividualMetadataState({previous,writes,read,has}){
 for(const path of new Set([...previous.keys(),...writes.keys()])){
  const old=previous.get(path),next=writes.get(path);
  if(old)assert.ok(read(path).equals(old)||(next&&read(path).equals(next)),'live native source review/ledger changed '+path);
  else if(has(path))assert.ok(next&&read(path).equals(next),'new native source judgment changed '+path);
 }
}
export function inspectNativeIndividualSourceJudgments({root=rootDefault,readMember}={}){
 const read=readMember||((path)=>readFileSync(resolve(root,path))),rawInput=read(NATIVE_INDIVIDUAL_INPUTS),inputs=JSON.parse(rawInput);assert.equal(hash(rawInput),pins[inputs.line],'native individual source inputs changed');
 const load=reference=>{const bytes=read(reference.path);assert.equal(hash(bytes),reference.sha256,'native individual source capsule changed');return JSON.parse(gunzipSync(bytes));};
 const prior=load(inputs.prior),trees=load(inputs.upstream_trees);assert.equal(prior.line,inputs.line);assert.equal(prior.source_parent,inputs.source_parent);
 const before=new Map(prior.previous_members.map(row=>{assert.equal(hash(row.text),row.sha256);return [row.path,Buffer.from(row.text)];}));assert.equal(before.size,4);
 const zoneSource=nativeIndividualZoneSourceSuccessor({root,read,line:inputs.line});
 for(const ref of [...inputs.current_sources,...inputs.implementation_evidence]){const current=zoneSource.qualify(ref)??ref;assert.equal(hash(read(current.path)),current.sha256,'native individual current source/evidence changed '+current.path);}
 const actualRequirements=[formFieldHoverRequirements(FORM_FIELD_HOVER_SHA,inputs.line),tabCompletionRequirements(TAB_COMPLETION_SHA,inputs.line),rippleReplayRequirements(RIPPLE_REPLAY_SHA,inputs.line)];assert.deepEqual(actualRequirements,inputs.runtime_requirements,'mandatory native requirements changed');
 const originals=prior.originals.map(original=>reviewOriginalNativePatch(original,trees.subjects.find(row=>row.sha===original.sha)));assert.deepEqual(originals.map(row=>row.sha),[FORM_FIELD_HOVER_SHA,TAB_COMPLETION_SHA,RIPPLE_REPLAY_SHA]);
 const reference='reference/material-16.2.14/error-helper-sources/form-field-focus-overlay.scss',candidate='projects/ngx-material-legacy/styles/form-field/_form-field-focus-overlay.scss';
 assert.equal(hash(read(reference)),'29be39f281b7079368ae00750de8dbe8a7693ef7bfc640960562dd8805f4110a');assert.equal(read(candidate).toString(),read(reference).toString().replace("'@material/ripple/functions'","'../vendor/mdc/ripple/functions'").replace("'@material/textfield'","'../vendor/mdc/textfield'"),'historical hover helper body changed');
 const css=JSON.parse(gunzipSync(read('compatibility/rc/form-field-hover-followup-source-diagnostic.json.gz')));assert.equal(css.line,inputs.line);assert.equal(css.rows.length,4);
 for(const row of css.rows){assert.equal(formFieldStateArgumentResultsMatch(row.case_id,row.expected,row.actual,row.peer),true,'complete historical field CSS contract rejected');assert.equal(row.peer.line,inputs.line);for(const member of row.actual.sources.filter(row=>row.root===0))assert.equal(hash(read('projects/ngx-material-legacy/'+member.path)),member.sha256,'compiled CSS source changed');}
 const life=JSON.parse(read('compatibility/rc/remaining-native-admission-tab-repair-lifecycle-controls.json'));
 assert.equal(life.source_sha256,hash(read('projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts')));assert.equal(life.passed,47);assert.equal(life.failed,0);assert.equal(life.mutants.length,22);assert.deepEqual(life.completion_contract.candidate,life.completion_contract.reference);assert.notDeepEqual(life.completion_contract.removed_filter,life.completion_contract.reference);
 const route=inspectRippleReplaySourceRoute({root,readMember:read}),routeControls=zoneSource.routeControls;
 assert.equal(routeControls.controls,39);assert.deepEqual(routeControls.analysis,route);assert.equal(routeControls.source_helper_sha256,hash(read('scripts/ripple-replay-route-source.mjs')));assert.equal(routeControls.producer_sha256,hash(read('tests/ripple_replay_route_source_probe.mjs')));assert.ok(route.lines.every(row=>row.private_symbols_invoked===false));assert.equal(route.actual_angular_native_or_packed_qualified,false);
 assert.ok(read('projects/ngx-material-legacy/legacy-core/public-api.ts').toString().includes('MatRipple as MatLegacyRipple'),'legacy public ripple alias changed');
 const ledgerPath='compatibility/f10/disposition-ledger/ledger.json',oldLedger=JSON.parse(before.get(ledgerPath)),entries=new Map(),writes=new Map();assert.equal(oldLedger.entries.length,1697);assert.equal(prior.previous_entries.length,3);
 const proofPath='compatibility/rc/remaining-native-admission-individual-source-proof.json';
 const proof={schema_version:1,line:inputs.line,source_parent:inputs.source_parent,scope:'Three whole-original source decisions only; no native/packed/floor, advisory or full G11 admission.',source_conclusion_only:true,inputs:{path:NATIVE_INDIVIDUAL_INPUTS,sha256:hash(rawInput)},originals,hover:{complete_configurable_cases:4,tagged_helper_preserved:true,source_refs:inputs.implementation_evidence.filter(row=>row.path.includes('form-field-hover'))},tabs:{lifecycle_cases:47,rejected_mutants:22,complete_original_subscription_outputs_preserved:true},ripple_route:route,implementation_evidence:inputs.implementation_evidence,producer:{path:'scripts/remaining-native-individual-source-judgments.mjs',sha256:hash(read('scripts/remaining-native-individual-source-judgments.mjs'))},actual_current_native_or_packed_or_floor_qualified:false,new_authored_use_closures:0,g11_claim:'not-passed'};writes.set(proofPath,json(proof));
 const proofRef={path:proofPath,sha256:hash(writes.get(proofPath))};
 for(const[index,subject]of originals.entries()){
  const previous=prior.previous_entries[index];assert.deepEqual(previous,oldLedger.entries.find(row=>row.sha===subject.sha));const choice=decisions[subject.sha],required=actualRequirements[index];
  const scope={kind:required.kind,source_members:required.members.map(path=>({path,sha256:hash(read(path))}))};let individual;
  if(subject.sha===FORM_FIELD_HOVER_SHA)individual={proof_kind:choice.kind,diff_sha256:required.patch,review_depth:'individual-compatibility',affected_branches:[inputs.line],decision:choice.decision,installed_member:required.installed_member,form_field_hover_behavior:{...scope,runtimes:required.runtimes,themes:required.themes}};
  else if(subject.sha===TAB_COMPLETION_SHA)individual={proof_kind:choice.kind,diff_sha256:required.patch,review_depth:'individual-compatibility',affected_branches:[inputs.line],decision:choice.decision,peer_reference:required.peer_reference,tab_completion_behavior:{...scope,engines:required.engines,runtimes:required.runtimes,modes:required.modes,case_ids:required.case_ids}};
  else individual={proof_kind:choice.kind,diff_sha256:required.patch,review_depth:'individual-compatibility',affected_branches:[inputs.line],decision:choice.decision,peer_reference:required.peer_reference,ripple_replay_behavior:{...scope,runtimes:required.runtimes}};
  const path='compatibility/f10/disposition-ledger/evidence/closeout-native-individual-'+subject.sha+'.json',review={schema_version:1,line:inputs.line,sha:subject.sha,status:'reviewed',final_disposition:choice.disposition,review_depth:'individual-compatibility',reviewer:'Codex primary implementer; independent audit remains separate',source_conclusion_only:true,original_files:subject.original_files,original_hunks:subject.original_hunks,diff:prior.originals[index].patch,diff_sha256:subject.patch_sha256,hunk_reviews:subject.hunks.map((row,n)=>({...row,judgment:choice.hunk_judgments[n]})),decision:choice.decision,individual_proof:individual,prior_entry:previous,prior_source_review:{path:previous.evidence_report,sha256:hash(before.get(previous.evidence_report))},independent_evidence:[proofRef,...inputs.implementation_evidence],required_native_contract:required,private_peer_fix_inherited:subject.sha===RIPPLE_REPLAY_SHA?inputs.line==='main':null,actual_native_or_packed_or_floor_qualified:false,g11_claim:'not-passed'};
  assert.equal(review.hunk_reviews.length,choice.hunk_judgments.length);writes.set(path,json(review));
  entries.set(subject.sha,{...previous,final_disposition:choice.disposition,reason:choice.decision,read_note_disposition:'individual whole-source decision; mandatory current native admission separate',evidence_report:path,diff_sha256:subject.patch_sha256,review_depth:'individual-compatibility',affected_branches:[inputs.line],individual_proof:individual,source_check:choice.hunk_judgments.join(' '),product_adaptation:subject.sha===RIPPLE_REPLAY_SHA,source_conclusion_only:true,g11_claim:'not-passed'});
 }
 let text=before.get(ledgerPath).toString();for(const [sha,entry]of entries){const previous=oldLedger.entries.find(row=>row.sha===sha),format=value=>JSON.stringify(value,null,2).split('\n').map(line=>'    '+line).join('\n');assert.equal(text.split(format(previous)).length,2);text=text.replace(format(previous),format(entry));}writes.set(ledgerPath,Buffer.from(text));
 assertNativeIndividualMetadataState({previous:before,writes,read,has:path=>existsSync(resolve(root,path))});
 zoneSource.assertCurrent();
 return {line:inputs.line,zone_individual_source_bound:zoneSource.bound,source_judgments:3,original_hunks:4,proof,entries:[...entries.values()],writes,previous:before,actual_current_native_or_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=inspectNativeIndividualSourceJudgments();if(process.argv.includes('--write'))for(const[path,bytes]of result.writes){const target=resolve(rootDefault,path);if(!existsSync(target)||!readFileSync(target).equals(bytes))writeFileSync(target,bytes);}
 console.log(JSON.stringify({line:result.line,source_judgments:result.source_judgments,original_hunks:result.original_hunks,writes:result.writes.size,applied:process.argv.includes('--write'),actual_current_native_or_packed_or_floor_qualified:false,g11_claim:'not-passed'}));
}

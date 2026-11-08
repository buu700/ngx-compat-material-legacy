/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current MAIN ledger source-epoch evidence only; no decision, stage or G11 admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {prepareInventoryReferenceSourceMetadata as prepareSource,INVENTORY_REFERENCE_LEDGER as LEDGER} from './inventory-reference-proposal.mjs';
const SELF='scripts/inventory-reference-live-source-epoch.mjs';
const GUARD='scripts/inventory-reference-proposal.mjs',GUARD_SHA='9d460ad966ad9d9aa46ee8057c2ca85ab14d9ecdef6b2437b0f38a924a3876d6';
const GUARD_FUNCTION_SHA='e3f047b6b7ea04dda4f794f5c89c95274747d2ff7d6105bf12ded3a93835da15';
const PACKET='compatibility/rc/parent-main-ledger-source-epoch-v1.json';
const PACKET_SHA='b222f47db598e2052357824e90c91bedbaebb5cea21a7a092e431b4749e5c4d7';
const START='c57f17ac5d05f7fee91f8d8cf7a033c7aa4a6ede';
const STAGE='e8c57b7630bfec15b3730214c03c41cf37e6654ce236743dff3d644ff43e813e';
const PRIOR_LIVE='e2f367003f429748f30ba24d20f23b06e9cde705c5ff55c80e0494adbfe4112a';
const TOOLTIP_LIVE='4a59fbfc14cc0f11c1563f5b4de51adc8cd0a58bfca186069ffc25b03635f068';
const DIALOG_LIVE='fcb3e8c2493d1379a998ab58d7f31c7f214a73a3aafacb1df15d323a7b085024';
const LIVE='955335c70ea8eff6cc1abf3d6397daf66a20684762a28db79a815d56f4c03647';
const EXCLUSION_RECEIPT='compatibility/rc/parent-main-95f2-source-exclusion-v2.json',EXCLUSION_RECEIPT_SHA='415d6847ad6abfe742c8be55519a39b2258c3bdc013a93b6f96d640801f83d03';
const EXCLUSION_PRIOR='compatibility/f10/disposition-ledger/evidence/95f2de4adae1811836c461e8bf4ffdcec2e81677-original-row.raw.json',EXCLUSION_PRIOR_SHA='e88515524354d71ee937939828d5ec555831f4bf3a8c5a040ea0ba44aa30d18e';
const DIALOG_RECEIPT='compatibility/rc/parent-main-dialog-hot-stream-ledger-v1.json',DIALOG_RECEIPT_SHA='76affccc7d3d52953f6ec8e2942e35611739ef5e7bb5ecd16b7c1b6074f64afd';
const NEXT='compatibility/rc/parent-main-ledger-source-epoch-v2.json',NEXT_SHA='b3d0a565dc4ea9de8e742a55db0419c5306838dd0063ad4320b74e4a8df34da0';
const TOOLTIP_RECEIPT='compatibility/rc/parent-main-tooltip-ledger-source-v2.json',TOOLTIP_RECEIPT_SHA='4ea2281660f76c07860f87e39623d2da33dbe5e803ee175802d0ab735e554935';
const TOOLTIP_REPORT='compatibility/rc/tooltip-selector-source-context-68b267dd59f3addf92a3b9f8ce9e8baa479df7f4.json',TOOLTIP_REPORT_SHA='0699bd488930c307084a550cd34eee9b335744b5c65994a3c89fdb8a525fa343';
const TOOLTIP_STYLE='projects/ngx-material-legacy/legacy-tooltip/tooltip.scss',TOOLTIP_STYLE_SHA='b737238c2f356a3672c21dc03864e06beb4451053b71e02202b4509cd1503bee';
const INVENTORY='912def47c1e171f9c2a01906dcc0968b91c5288d9b8f73714247b0319f3a2b15';
const RECEIPT='compatibility/rc/parent-main-core-corner-source-review-v1.json';
const RECEIPT_SHA='5a2d3ba7853eea92b9c71ab029e770072a45b11339184beaacf34e8319ce0271';
const IMAGE=readFileSync(fileURLToPath(import.meta.url)),GIT_PATH=process.env.PATH;assert.equal(typeof GIT_PATH,'string');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
// The source epoch itself enters a process-wide root transaction before any
// physical preflight, so a caught nested failure cannot escape via an alias.
const epochRegistryKey=Symbol.for('ngx-compat-material-legacy.inventory-live-source-epoch.v1');
function createEpochTransaction(){
 const roots=new Map(),keyOf=root=>realpathSync(resolve(root));
 const transact=(root,operation)=>{
  const key=keyOf(root),prior=roots.get(key);
  if(prior){prior.violation=true;throw Error('reentrant inventory live source epoch');}
  const state={violation:false};roots.set(key,state);
  try{const result=operation();assert.equal(state.violation,false,'swallowed live source epoch reentry');return result;}
  finally{roots.delete(key);}
 };
 return Object.freeze(transact);
}
if(!Object.hasOwn(globalThis,epochRegistryKey))Object.defineProperty(globalThis,epochRegistryKey,{value:createEpochTransaction(),writable:false,configurable:false});
const epochTransaction=globalThis[epochRegistryKey],epochDescriptor=Object.getOwnPropertyDescriptor(globalThis,epochRegistryKey);
assert.ok(typeof epochTransaction==='function'&&Object.isFrozen(epochTransaction)&&!epochDescriptor.writable&&!epochDescriptor.configurable,'invalid live source epoch registry');

function decode(raw){
 const text=raw.toString('utf8');assert.ok(Buffer.from(text).equals(raw),'invalid ledger UTF-8');
 const data=JSON.parse(text),marks=[...text.matchAll(/^    \{\n      "sha": "([0-9a-f]{40})",\n/gm)];
 assert.equal(marks.length,1697);assert.equal(data.entries.length,1697);
 const end=text.indexOf('\n  ],',marks.at(-1).index);assert.ok(end>=0);
 const rawEntries=new Map();for(let i=0;i<marks.length;i++){
  const id=marks[i][1];assert.ok(!rawEntries.has(id));rawEntries.set(id,text.slice(marks[i].index,i+1<marks.length?marks[i+1].index:end));
 }
 assert.deepEqual(data.entries.map(row=>row.sha),[...rawEntries.keys()]);
 return {data,rawEntries,entries:new Map(data.entries.map(row=>[row.sha,row]))};
}
function assertSingleRawReplacement(before,after,a,b,id){
 const old=a.rawEntries.get(id),next=b.rawEntries.get(id),text=before.toString('utf8'),index=text.indexOf(old);
 assert.ok(index>=0);assert.equal(text.indexOf(old,index+old.length),-1,'selected raw row is ambiguous');
 assert.ok(Buffer.from(text.slice(0,index)+next+text.slice(index+old.length)).equals(after),'bytes outside selected raw row changed');
}
function git(root,args){
 const env={...process.env,PATH:GIT_PATH,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
 for(const key of Object.keys(env))if(key.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(key))delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:16*1024*1024});
}
function match(raw,ref){assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
function validateLineage(root,packet,stage,receiptBytes){
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'main-ledger-source-epoch-byte-lineage');
 assert.equal(packet.historical_stage_commit,'c57f17ac5');assert.equal(packet.historical_stage_sha256,STAGE);
 assert.equal(packet.current_inventory_sha256,INVENTORY);assert.equal(packet.current_ledger_sha256,PRIOR_LIVE);
 assert.deepEqual(packet.core_corner_receipt,{path:RECEIPT,sha256:RECEIPT_SHA});
 assert.equal(packet.semantic_decisions_approved,false);assert.equal(packet.canonical_owner_admission_granted,false);assert.equal(packet.g11_claim,'not-passed');
 assert.equal(packet.steps.length,18);assert.equal(packet.changed_unique_entries,152);
 assert.equal(git(root,['rev-parse','c57f17ac5']).toString().trim(),START);
 const ancestor=git(root,['show',START+':'+LEDGER]);assert.equal(hash(ancestor),STAGE);assert.ok(ancestor.equals(stage),'qualified historic stage differs from git comparison');
 let previous=ancestor,priorCommit=START;const changedUnion=new Set(),rawOnlyCounts=[];
 for(const step of packet.steps){
  assert.match(step.commit,/^[0-9a-f]{40}$/);assert.match(step.parent,/^[0-9a-f]{40}$/);
  assert.equal(git(root,['rev-parse',step.commit+'^']).toString().trim(),step.parent);
  git(root,['merge-base','--is-ancestor',priorCommit,step.parent]);
  const before=git(root,['show',step.parent+':'+LEDGER]),after=git(root,['show',step.commit+':'+LEDGER]);
  match(before,step.before);match(after,step.after);assert.ok(before.equals(previous),'discontinuous ledger lineage');
  const a=decode(before),b=decode(after),changed=[],rawOnly=[];
  assert.deepEqual([...a.entries.keys()],[...b.entries.keys()]);
  const meta=x=>Object.fromEntries(Object.entries(x).filter(([key])=>key!=='entries'));
  assert.deepEqual(meta(a.data),meta(b.data),'top-level ledger metadata changed');
  for(const [sha,row] of a.entries){
   if(!isDeepStrictEqual(row,b.entries.get(sha))){changed.push(sha);changedUnion.add(sha);}
   else if(a.rawEntries.get(sha)!==b.rawEntries.get(sha))rawOnly.push(sha);
  }
  changed.sort();rawOnly.sort();assert.deepEqual(changed,step.changed_entries);assert.deepEqual(rawOnly,step.raw_only_entries);
  if(step.commit==='3be4d6b7aa54e97ee6622bc869d564313f1f7743'){
   const id='18cedc7375bf0ab0590c9a984e5d380d52610ccc',old=a.entries.get(id),next=b.entries.get(id);
   assert.deepEqual(changed,[id]);assert.deepEqual(rawOnly,[]);assertSingleRawReplacement(before,after,a,b,id);assert.equal(old.final_disposition,'inherited');assert.equal(next.final_disposition,'not-applicable');
   assert.deepEqual(next.prior_dispositions,[old]);for(const key of ['sha','bucket','subject','files','diff_sha256'])assert.deepEqual(next[key],old[key]);
   assert.equal(old.diff_sha256,'ae5fa892d0865dddfdf5ea64573b543e3f79a125cdd7b9b1343b9e1f9daff65a');
   const others=[...a.rawEntries].filter(([sha])=>sha!==id).map(([,raw])=>raw.slice(4).replace(/,\n$/,''));
   assert.equal(others.length,1696);assert.equal(hash(Buffer.from(others.join(''))),'ce89d5c3a00ec4e06a1ceaee910d3c7c6bf140913592e07be07bc7dbf05a3c19');
  }

  if(rawOnly.length)rawOnlyCounts.push({commit:step.commit,count:rawOnly.length});
  previous=after;priorCommit=step.commit;
 }
 assert.equal(changedUnion.size,152);assert.equal(hash(previous),PRIOR_LIVE);
 git(root,['merge-base','--is-ancestor',priorCommit,'HEAD']);
 assert.ok(git(root,['show',priorCommit+':'+RECEIPT]).equals(receiptBytes),'committed receipt differs from physical receipt');
 return {prior:previous,summary:{transitions:18,changed_entry_identities:152,raw_only_formatting:rawOnlyCounts}};
}
function validateTooltipSuccessor(root,next,prior,live,receiptBytes,reportBytes,styleBytes){
 assert.equal(next.schema_version,1);assert.equal(next.role,'main-ledger-source-epoch-tooltip-successor');
 assert.deepEqual(next.predecessor_packet,{path:PACKET,sha256:PACKET_SHA,bytes:19731});
 assert.equal(next.source_scope_only,true);assert.equal(next.semantic_decisions_approved,false);assert.equal(next.runtime_admission_granted,false);assert.equal(next.canonical_owner_admission_granted,false);assert.equal(next.g11_claim,'not-passed');
 const t=next.transition;assert.equal(t.commit,'e28364f10bc9c1f9219c9a18f0dbf9cffb267f57');assert.match(t.parent,/^[0-9a-f]{40}$/);
 assert.equal(git(root,['rev-parse',t.commit+'^']).toString().trim(),t.parent);git(root,['merge-base','--is-ancestor','3be4d6b7aa54e97ee6622bc869d564313f1f7743',t.parent]);
 const before=git(root,['show',t.parent+':'+LEDGER]),after=git(root,['show',t.commit+':'+LEDGER]);match(before,t.before);match(after,t.after);
 assert.ok(before.equals(prior),'tooltip ledger predecessor differs');assert.equal(hash(before),PRIOR_LIVE);assert.equal(hash(after),TOOLTIP_LIVE);assert.ok(after.equals(live),'physical live ledger differs from terminal image');
 const a=decode(before),b=decode(after),id='68b267dd59f3addf92a3b9f8ce9e8baa479df7f4',changed=[],rawOnly=[];
 assert.deepEqual([...a.entries.keys()],[...b.entries.keys()]);const meta=x=>Object.fromEntries(Object.entries(x).filter(([key])=>key!=='entries'));assert.deepEqual(meta(a.data),meta(b.data));
 for(const [sha,row] of a.entries){if(!isDeepStrictEqual(row,b.entries.get(sha)))changed.push(sha);else if(a.rawEntries.get(sha)!==b.rawEntries.get(sha))rawOnly.push(sha);}
 changed.sort();rawOnly.sort();assert.deepEqual(changed,[id]);assert.deepEqual(changed,t.changed_entries);assert.deepEqual(rawOnly,[]);assert.deepEqual(rawOnly,t.raw_only_entries);assertSingleRawReplacement(before,after,a,b,id);
 const old=a.entries.get(id),current=b.entries.get(id),normalized=structuredClone(current),proof=structuredClone(current.individual_proof);
 assert.equal(current.final_disposition,old.final_disposition);assert.equal(current.g11_claim,'not-passed');
 const oldMember=old.individual_proof.artifact_behavior.source_members.find(ref=>ref.path===TOOLTIP_STYLE),newMember=proof.artifact_behavior.source_members.find(ref=>ref.path===TOOLTIP_STYLE);
 assert.equal(oldMember.sha256,'692e27d01ea6a8deb1502c3f6d143f7ca868368655126d4ac8f6958eb6179458');assert.equal(newMember.sha256,TOOLTIP_STYLE_SHA);
 newMember.sha256=oldMember.sha256;proof.decision=old.individual_proof.decision;assert.deepEqual(proof,old.individual_proof);
 normalized.individual_proof=old.individual_proof;normalized.reason=old.reason;normalized.evidence_report=old.evidence_report;normalized.source_check=old.source_check;delete normalized.tooltip_selector_source_context;assert.deepEqual(normalized,old,'tooltip row changed beyond source-only successor');
 assert.equal(current.evidence_report,TOOLTIP_REPORT);assert.equal(current.source_check.evidence_report_sha256,TOOLTIP_REPORT_SHA);
 const normalizedSourceCheck=structuredClone(current.source_check);normalizedSourceCheck.evidence_report_sha256=old.source_check.evidence_report_sha256;assert.deepEqual(normalizedSourceCheck,old.source_check);
 assert.equal(current.tooltip_selector_source_context.prior_report.path,old.evidence_report);assert.equal(current.tooltip_selector_source_context.prior_report.sha256,old.source_check.evidence_report_sha256);
 assert.equal(current.tooltip_selector_source_context.selector_source.prior_sha256,oldMember.sha256);assert.equal(current.tooltip_selector_source_context.selector_source.current_sha256,TOOLTIP_STYLE_SHA);
 assert.deepEqual(next.receipt,{path:TOOLTIP_RECEIPT,sha256:TOOLTIP_RECEIPT_SHA,bytes:receiptBytes.length});assert.deepEqual(next.report,{path:TOOLTIP_REPORT,sha256:TOOLTIP_REPORT_SHA,bytes:reportBytes.length});assert.deepEqual(next.tooltip_stylesheet,{path:TOOLTIP_STYLE,sha256:TOOLTIP_STYLE_SHA,bytes:styleBytes.length});
 for(const [path,raw] of [[TOOLTIP_RECEIPT,receiptBytes],[TOOLTIP_REPORT,reportBytes],[TOOLTIP_STYLE,styleBytes]])assert.ok(git(root,['show',t.commit+':'+path]).equals(raw),'tooltip committed source differs '+path);
 const receipt=JSON.parse(receiptBytes),report=JSON.parse(reportBytes);assert.equal(receipt.target_sha,id);assert.equal(receipt.ledger_before_sha256,PRIOR_LIVE);assert.equal(receipt.ledger_after.sha256,TOOLTIP_LIVE);assert.equal(receipt.other_raw_rows_preserved,1696);assert.equal(receipt.outside_target_row_bytes_and_metadata_preserved,true);
 assert.equal(report.sha,id);assert.equal(report.semantic_pass,false);assert.equal(report.actual_packed_or_native_executed,false);assert.equal(report.hydration_claimed,false);assert.equal(report.g11_claim,'not-passed');
 git(root,['merge-base','--is-ancestor',t.commit,'HEAD']);return {transitions:19,changed_entry_identities:153,tooltip_source_only:true};
}

function validateDialogSuccessor(root,prior,live,receiptBytes){
 const commit='64f87978200b2f9e75da7dd6eafc2c81e0f2ff49',parent='a7cfa6dcd9eb77507057555238ee737cd04c1642',id='3362836779d5b87400bcdce513f0c3d016294014';
 assert.equal(git(root,['rev-parse',commit+'^']).toString().trim(),parent);
 git(root,['merge-base','--is-ancestor','e28364f10bc9c1f9219c9a18f0dbf9cffb267f57',parent]);
 git(root,['merge-base','--is-ancestor',commit,'HEAD']);
 const before=git(root,['show',parent+':'+LEDGER]),after=git(root,['show',commit+':'+LEDGER]);
 assert.equal(hash(before),TOOLTIP_LIVE);assert.equal(hash(after),DIALOG_LIVE);assert.ok(before.equals(prior));assert.ok(after.equals(live));
 assert.ok(git(root,['show',commit+':'+DIALOG_RECEIPT]).equals(receiptBytes));assert.equal(hash(receiptBytes),DIALOG_RECEIPT_SHA);
 const a=decode(before),b=decode(after),changed=[],rawOnly=[];
 assert.deepEqual([...a.entries.keys()],[...b.entries.keys()]);
 const meta=x=>Object.fromEntries(Object.entries(x).filter(([key])=>key!=='entries'));assert.deepEqual(meta(a.data),meta(b.data));
 for(const [sha,row] of a.entries){if(!isDeepStrictEqual(row,b.entries.get(sha)))changed.push(sha);else if(a.rawEntries.get(sha)!==b.rawEntries.get(sha))rawOnly.push(sha);}
 assert.deepEqual(changed,[id]);assert.deepEqual(rawOnly,[]);assertSingleRawReplacement(before,after,a,b,id);
 const old=a.entries.get(id),current=b.entries.get(id),receipt=JSON.parse(receiptBytes);
 assert.deepEqual(current.prior_dispositions,[old]);assert.equal(current.final_disposition,'do-not-adopt');assert.equal(current.g11_claim,'not-passed');
 for(const key of ['sha','bucket','subject','files','diff_sha256'])assert.deepEqual(current[key],old[key]);
 assert.equal(receipt.upstream_sha,id);assert.equal(receipt.base_head,parent);assert.equal(receipt.ledger_before_sha256,TOOLTIP_LIVE);assert.equal(receipt.ledger_after_sha256,DIALOG_LIVE);assert.equal(receipt.row_preservation.other_rows,1696);assert.equal(receipt.row_preservation.top_metadata,'unchanged');assert.equal(receipt.row_preservation.prior_row,'retained verbatim in prior_dispositions');
 return {transitions:20,changed_entry_identities:154,tooltip_source_only:true,dialog_source_only:true};
}

function validateExclusionSuccessor(root,prior,live,receiptBytes,priorBytes){
 const commit='252689f364aee65c5d755d4b16e91987f6e305a5',parent='862f511840c7bbeb81236ac6d74ba1a8a2d5f7a7',id='95f2de4adae1811836c461e8bf4ffdcec2e81677';
 assert.equal(git(root,['rev-parse',commit+'^']).toString().trim(),parent);git(root,['merge-base','--is-ancestor','64f87978200b2f9e75da7dd6eafc2c81e0f2ff49',parent]);git(root,['merge-base','--is-ancestor',commit,'HEAD']);
 const before=git(root,['show',parent+':'+LEDGER]),after=git(root,['show',commit+':'+LEDGER]);assert.equal(hash(before),DIALOG_LIVE);assert.equal(hash(after),LIVE);assert.ok(before.equals(prior));assert.ok(after.equals(live));
 for(const [path,raw,digest] of [[EXCLUSION_RECEIPT,receiptBytes,EXCLUSION_RECEIPT_SHA],[EXCLUSION_PRIOR,priorBytes,EXCLUSION_PRIOR_SHA]]){assert.equal(hash(raw),digest);assert.ok(git(root,['show',commit+':'+path]).equals(raw));}
 const a=decode(before),b=decode(after),changed=[],rawOnly=[];assert.deepEqual([...a.entries.keys()],[...b.entries.keys()]);const meta=x=>Object.fromEntries(Object.entries(x).filter(([key])=>key!=='entries'));assert.deepEqual(meta(a.data),meta(b.data));
 for(const [sha,row] of a.entries){if(!isDeepStrictEqual(row,b.entries.get(sha)))changed.push(sha);else if(a.rawEntries.get(sha)!==b.rawEntries.get(sha))rawOnly.push(sha);}
 assert.deepEqual(changed,[id]);assert.deepEqual(rawOnly,[]);assertSingleRawReplacement(before,after,a,b,id);
 const old=a.entries.get(id),current=b.entries.get(id),receipt=JSON.parse(receiptBytes);assert.deepEqual(JSON.parse(priorBytes),old);assert.ok(Buffer.from(a.rawEntries.get(id)).equals(Buffer.concat([Buffer.from('    '),priorBytes,Buffer.from(',\n')])),'saved prior raw row differs');assert.equal(old.diff_sha256,'74080603cf762248d604251a77cd2c8e037ce4aa9a27b1ec8206e90cc601d84e');assert.equal(current.diff_sha256,old.diff_sha256);assert.equal(current.final_disposition,'not-applicable');assert.equal(current.g11_claim,'not-passed');for(const key of ['sha','bucket','subject','files'])assert.deepEqual(current[key],old[key]);
 assert.equal(receipt.sha,id);assert.equal(receipt.base_head,parent);assert.equal(receipt.ledger_before_sha256,DIALOG_LIVE);assert.equal(receipt.ledger_after_sha256,LIVE);assert.equal(receipt.preserved.other_raw_rows,1696);assert.equal(receipt.preserved.top_metadata,'unchanged');assert.equal(receipt.preserved.historical_diff_sha256,old.diff_sha256);assert.equal(receipt.preserved.prior_row_path,EXCLUSION_PRIOR);
 return {transitions:21,changed_entry_identities:155,tooltip_source_only:true,dialog_source_only:true,exclusion_source_only:true};
}

/** Authenticates a current physical source epoch; does not approve audit rows or replace any ledger image. */
export function prepareInventoryReferenceLiveSourceEpoch({root,read=path=>readEvidenceMember(root,path),additionalPaths=[]}={}){
 assert.equal(typeof root,'string');return epochTransaction(root,()=>buildLiveSourceEpoch({root,read,additionalPaths}));
}
function buildLiveSourceEpoch({root,read,additionalPaths}){
 assert.equal(typeof read,'function');assert.ok(Array.isArray(additionalPaths));
 assert.ok(additionalPaths.every(path=>typeof path==='string'));assert.equal(new Set(additionalPaths).size,additionalPaths.length);
 assert.ok(additionalPaths.every(path=>![SELF,PACKET,NEXT,RECEIPT,TOOLTIP_RECEIPT,TOOLTIP_REPORT,TOOLTIP_STYLE,DIALOG_RECEIPT,EXCLUSION_RECEIPT,EXCLUSION_PRIOR,LEDGER].includes(path)));
 const initialPacket=readEvidenceMember(root,PACKET),nextBytes=readEvidenceMember(root,NEXT);assert.equal(hash(initialPacket),PACKET_SHA);assert.equal(hash(nextBytes),NEXT_SHA);
 const loadedGuard=readFileSync(fileURLToPath(new URL('./inventory-reference-proposal.mjs',import.meta.url)));
 assert.equal(hash(loadedGuard),GUARD_SHA);assert.equal(hash(readEvidenceMember(root,GUARD)),GUARD_SHA);
 assert.equal(hash(Buffer.from(Function.prototype.toString.call(prepareSource))),GUARD_FUNCTION_SHA);
 const source=prepareSource({root,read,prebindPaths:[SELF,PACKET,NEXT,RECEIPT,TOOLTIP_RECEIPT,TOOLTIP_REPORT,TOOLTIP_STYLE,DIALOG_RECEIPT,EXCLUSION_RECEIPT,EXCLUSION_PRIOR,LEDGER,...additionalPaths]});assert.equal(source.line,'main');
 assert.equal(source.verifier.current_inventory_sha256,INVENTORY);
 const physical=path=>readEvidenceMember(root,path),initialLedger=physical(LEDGER);
 const fixed=[{path:SELF,sha256:hash(IMAGE),bytes:IMAGE.length},{path:PACKET,sha256:PACKET_SHA,bytes:initialPacket.length},
  {path:RECEIPT,sha256:RECEIPT_SHA,bytes:physical(RECEIPT).length},{path:NEXT,sha256:NEXT_SHA,bytes:nextBytes.length},
  {path:TOOLTIP_RECEIPT,sha256:TOOLTIP_RECEIPT_SHA,bytes:physical(TOOLTIP_RECEIPT).length},{path:TOOLTIP_REPORT,sha256:TOOLTIP_REPORT_SHA,bytes:physical(TOOLTIP_REPORT).length},{path:TOOLTIP_STYLE,sha256:TOOLTIP_STYLE_SHA,bytes:physical(TOOLTIP_STYLE).length},
  {path:DIALOG_RECEIPT,sha256:DIALOG_RECEIPT_SHA,bytes:physical(DIALOG_RECEIPT).length},
  {path:EXCLUSION_RECEIPT,sha256:EXCLUSION_RECEIPT_SHA,bytes:physical(EXCLUSION_RECEIPT).length},{path:EXCLUSION_PRIOR,sha256:EXCLUSION_PRIOR_SHA,bytes:physical(EXCLUSION_PRIOR).length},
  {path:LEDGER,sha256:LIVE,bytes:initialLedger.length},
  ...additionalPaths.map(path=>{const raw=physical(path);return {path,sha256:hash(raw),bytes:raw.length};})];
 const checkPhysical=()=>{for(const ref of fixed)match(physical(ref.path),ref);assert.ok(physical(SELF).equals(IMAGE));assert.ok(physical(LEDGER).equals(initialLedger));};
 const checkInputs=()=>{checkPhysical();for(const ref of fixed){checkPhysical();const raw=read(ref.path);checkPhysical();assert.ok(Buffer.isBuffer(raw));match(raw,ref);}checkPhysical();};
 checkInputs();const receiptBytes=physical(RECEIPT),receipt=JSON.parse(receiptBytes);assert.equal(receipt.selected_sha,'18cedc7375bf0ab0590c9a984e5d380d52610ccc');assert.equal(receipt.ledger_before_sha256,'bf569445a6013f402c44252ddf1afb2de803e6a0a5c9f9ccf1a6f322fd251544');assert.equal(receipt.ledger_after_sha256,PRIOR_LIVE);assert.equal(receipt.unselected_raw_entries,1696);assert.equal(receipt.unselected_concatenated_raw_sha256,'ce89d5c3a00ec4e06a1ceaee910d3c7c6bf140913592e07be07bc7dbf05a3c19');
 const packet=JSON.parse(initialPacket),next=JSON.parse(nextBytes),tooltipReceipt=physical(TOOLTIP_RECEIPT),tooltipReport=physical(TOOLTIP_REPORT),tooltipStyle=physical(TOOLTIP_STYLE);let lineage;
 const check=()=>{source.assertCurrent();checkInputs();const prior=validateLineage(root,packet,source.after,receiptBytes);const tooltipImage=git(root,['show','e28364f10bc9c1f9219c9a18f0dbf9cffb267f57:'+LEDGER]);validateTooltipSuccessor(root,next,prior.prior,tooltipImage,tooltipReceipt,tooltipReport,tooltipStyle);const dialogImage=git(root,['show','64f87978200b2f9e75da7dd6eafc2c81e0f2ff49:'+LEDGER]);validateDialogSuccessor(root,tooltipImage,dialogImage,physical(DIALOG_RECEIPT));const terminal=validateExclusionSuccessor(root,dialogImage,initialLedger,physical(EXCLUSION_RECEIPT),physical(EXCLUSION_PRIOR));checkInputs();source.assertCurrent();checkPhysical();return {...terminal,raw_only_formatting:prior.summary.raw_only_formatting};};
 const assertCurrent=()=>epochTransaction(root,check);lineage=check();const bound=new Map(source.bound.map(ref=>[ref.path,{...ref}]));
 for(const ref of fixed){const prior=bound.get(ref.path);if(prior)assert.deepEqual(prior,ref);else bound.set(ref.path,{...ref});}
 return {line:'main',liveLedger:Buffer.from(initialLedger),bound:structuredClone([...bound.values()]),lineage:structuredClone(lineage),assertCurrent,
  source_epoch_only:true,semantic_decisions_approved:false,canonical_owner_admission_granted:false,g11_claim:'not-passed'};
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact test-side reconstruction of the per-file metadata guard successor. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function retainedTitleOwnerReference({root,read}){
 const path='scripts/packed-upstream-ledger-epoch.mjs';
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
 const before=execFileSync('git',['--no-replace-objects','show','502e603604e9595d841c579d1e832320a58c717a:'+path],{cwd:root,env,maxBuffer:1024*1024});
 assert.equal(hash(before),'cc3f5fb9c9a65d9ec1dff90460ef4722285b478e9b34bf34f11466454bd6b38a');
 const from="  if(path===OWNER){assertTools();return Buffer.from(baseImage);}\n  if(path===TITLE_NATIVE_REGISTRY){assertTools();return Buffer.from(nativeBefore);}\n  if(path==='scripts/autocomplete-selection-native-subject.mjs'){assertTools();return original(root,path);}";
 const to="  if(path===OWNER){assert.equal(hash(read(path)),own.sha256,'changed current owner metadata source');return Buffer.from(baseImage);}\n  if(path===TITLE_NATIVE_REGISTRY){assert.equal(hash(read(path)),TITLE_NATIVE_AFTER,'changed current native metadata source');return Buffer.from(nativeBefore);}\n  if(path==='scripts/autocomplete-selection-native-subject.mjs'){\n   assert.equal(hash(read(path)),bound.find(member=>member.path===path).sha256,'changed current native-subject metadata source');return original(root,path);\n  }";
 const text=before.toString();assert.equal(text.split(from).length,2);
 let current=text.replace(from,to);
 for(const [a,b]of [
  ["function foreign(root,read){\n const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;",
   "function foreign(root,read,allowMissing=false){\n let raw;try{raw=read('projects/ngx-material-legacy/package.json');}catch(error){if(allowMissing&&error.code==='ENOENT')return null;throw error;}\n const version=JSON.parse(raw).version;"],
  ['read=unwrap(root,read);const remote=foreign(root,read);return remote?remote.packedUpstreamLedgerRawRead({root,read}):read;',
   'read=unwrap(root,read);const remote=foreign(root,read,true);return remote?remote.packedUpstreamLedgerRawRead({root,read}):read;'],
 ]){assert.equal(current.split(a).length,2);current=current.replace(a,b);}
 for(const [a,b]of [
  ["const PACKET_HASH='87ac44ebc3d8c8fcf082803ecf4f6deac68b62ef349ce0d95c037dbb85e9cbea';",
   "const PACKET_HASH='87ac44ebc3d8c8fcf082803ecf4f6deac68b62ef349ce0d95c037dbb85e9cbea';\nconst FRAMES='compatibility/rc/21x-c04-dialog-title-replacement-retained-ledger-frames.json';\nconst FRAMES_HASH='1818801b7b603d2707fe7f2571dd5819edb7de12e259934bc71b24354c8fd456';"],
  [" assert.equal(resolve(root),ROOT,'wrong21.x canonical owner checkout');",
   " assert.equal(resolve(root),ROOT,'wrong21.x canonical owner checkout');\n const frameRaw=read(FRAMES);assert.equal(hash(frameRaw),FRAMES_HASH,'changed accepted ledger-frame catalog');\n const frames=JSON.parse(frameRaw);assert.equal(frames.schema_version,1);assert.equal(frames.line,'21.x');\n assert.equal(frames.frames.length,21);assert.equal(new Set(frames.frames.map(frame=>frame.sha256)).size,21);\n const ledgerRaw=read(LEDGER),currentHash=hash(ledgerRaw);\n assert.ok(frames.frames.some(frame=>frame.sha256===currentHash&&frame.bytes===ledgerRaw.length),'not an accepted complete ledger frame');"],
  [' const currentHash=hash(read(LEDGER)),body=JSON.parse(read(title.TITLE_REVIEW));',' const body=JSON.parse(read(title.TITLE_REVIEW));'],
  [' const bound=[own,{path:PACKET,sha256:PACKET_HASH,bytes:raw.length},...packet.source_members,packet.root_checker];',
   ' const bound=[own,{path:PACKET,sha256:PACKET_HASH,bytes:raw.length},{path:FRAMES,sha256:FRAMES_HASH,bytes:frameRaw.length},...packet.source_members,packet.root_checker];'],
  [" const bound=[{path:OWNER,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PACKET_HASH,bytes:raw.length},...packet.source_members,packet.root_checker].map(member=>({...member,bytes:member.bytes??read(member.path).length}));",
   " const frameRaw=read(FRAMES);assert.equal(hash(frameRaw),FRAMES_HASH,'changed accepted ledger-frame catalog');\n const bound=[{path:OWNER,sha256:hash(image),bytes:image.length},{path:PACKET,sha256:PACKET_HASH,bytes:raw.length},{path:FRAMES,sha256:FRAMES_HASH,bytes:frameRaw.length},...packet.source_members,packet.root_checker].map(member=>({...member,bytes:member.bytes??read(member.path).length}));"],
 ]){assert.equal(current.split(a).length,2);current=current.replace(a,b);}
 const transportRaw=read('compatibility/rc/21x-c04-theming-inspection-owner-successor.json');
 assert.equal(hash(transportRaw),'696c902c7df53e1297131cc03f7b269f919ab65544b617c21d35ee6c4cf1f578');
 const transport=JSON.parse(transportRaw);assert.equal(transport.line,'21.x');assert.equal(transport.path,path);
 assert.equal(transport.source_parent,'1fcb9a09a4d989a58f403db8237a281cab6cfa0d');
 assert.deepEqual(transport.before,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 assert.equal(transport.tagged_golden_changes,0);assert.equal(transport.original_assertions_or_rejection_controls_dropped,0);
 assert.equal(transport.literal_edits.length,8);
 for(const ref of [transport.canonical_transition,transport.candidate_owner_execution,transport.source_handler_controls]){
  const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);
 }
 const smoke=JSON.parse(read(transport.candidate_owner_execution.path));assert.equal(smoke.result,'pass');
 assert.equal(smoke.prior_source_admissions_preserved,41);assert.equal(smoke.current_source_admissions,43);
 for(const edit of transport.literal_edits){assert.equal(current.split(edit.before).length,2);current=current.replace(edit.before,edit.after);}
 assert.deepEqual(transport.after,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 const patchRaw=read('compatibility/rc/21x-c04-theming-inspection-patch-guard-owner-successor.json');
 assert.equal(hash(patchRaw),'a8869e67a4def40b17991df58a7663b86580861f77ba622c78999c1cd6ebbb9b');
 const patch=JSON.parse(patchRaw);assert.equal(patch.path,path);assert.equal(patch.line,'21.x');
 assert.deepEqual(patch.before,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 assert.equal(patch.literal_edits.length,1);assert.equal(patch.tagged_golden_changes,0);assert.equal(patch.original_assertions_or_rejection_controls_dropped,0);
 for(const edit of patch.literal_edits){assert.equal(current.split(edit.before).length,2);current=current.replace(edit.before,edit.after);}
 assert.deepEqual(patch.after,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 const inspectionRaw=read('compatibility/rc/21x-c04-inspection-compatibility-owner-successor.json');
 assert.equal(hash(inspectionRaw),'4e6d08990e9f1a97746e44cc244c5b80c3745d7fafa7f2df574bd042611db72a');
 const inspection=JSON.parse(inspectionRaw);assert.equal(inspection.path,path);assert.equal(inspection.line,'21.x');
 assert.equal(inspection.source_parent,'83e48681774603aef0eb23fb0ef4cb40b3dca6ec');
 assert.deepEqual(inspection.before,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 assert.equal(inspection.literal_edits.length,14);assert.equal(inspection.tagged_golden_changes,0);assert.equal(inspection.original_assertions_or_rejection_controls_dropped,0);
 for(const ref of [inspection.canonical_transition,inspection.candidate_owner_execution,inspection.source_handler_controls]){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
 const inspectionSmoke=JSON.parse(read(inspection.candidate_owner_execution.path));assert.equal(inspectionSmoke.result,'pass');
 assert.equal(inspectionSmoke.prior_source_admissions_preserved,43);assert.equal(inspectionSmoke.current_source_admissions,47);assert.equal(inspectionSmoke.inspection_source_decisions,4);
 assert.equal(inspectionSmoke.candidate_view_only,true);assert.equal(inspectionSmoke.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
 for(const edit of inspection.literal_edits){assert.equal(current.split(edit.before).length,2);current=current.replace(edit.before,edit.after);}
 assert.deepEqual(inspection.after,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 const selectorRaw=read('compatibility/rc/21x-c04-selector-density-owner-successor.json');
 assert.equal(hash(selectorRaw),'ab9953e53d878c3bade446dfbc5e44b0ecfe3e55c1f7b3aa3dad51a41ce21663');
 const selector=JSON.parse(selectorRaw);assert.equal(selector.path,path);assert.equal(selector.line,'21.x');
 assert.equal(selector.source_parent,'f5638de44628fa48df56644f5cccf53720fb8401');
 assert.deepEqual(selector.before,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 assert.equal(selector.literal_edits.length,15);assert.equal(selector.tagged_golden_changes,0);assert.equal(selector.original_assertions_or_rejection_controls_dropped,0);
 for(const ref of [selector.canonical_transition,selector.candidate_owner_execution,selector.source_handler_controls]){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
 const selectorSmoke=JSON.parse(read(selector.candidate_owner_execution.path));assert.equal(selectorSmoke.result,'pass');
 assert.equal(selectorSmoke.prior_source_admissions_preserved,47);assert.equal(selectorSmoke.current_source_admissions,49);assert.equal(selectorSmoke.selector_density_source_decisions,2);
 assert.equal(selectorSmoke.candidate_view_only,true);assert.equal(selectorSmoke.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
 for(const edit of selector.literal_edits){assert.equal(current.split(edit.before).length,2);current=current.replace(edit.before,edit.after);}
 assert.deepEqual(selector.after,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 const buttonRaw=read('compatibility/rc/21x-c04-button-tokenization-owner-successor.json');
 assert.equal(hash(buttonRaw),'501e0f60f461ac9bf22e19b91e84fbb3c5c59c9e3d4ea27a6fa60fed69cc8d6a');
 const button=JSON.parse(buttonRaw);assert.equal(button.path,path);assert.equal(button.line,'21.x');
 assert.equal(button.source_parent,'878b00dacaca2a8417dd0aebefc8adce6a8a9277');
 assert.deepEqual(button.before,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 assert.equal(button.literal_edits.length,15);assert.equal(button.tagged_golden_changes,0);assert.equal(button.original_assertions_or_rejection_controls_dropped,0);
 for(const ref of [button.canonical_transition,button.candidate_owner_execution,button.source_handler_controls]){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
 const buttonSmoke=JSON.parse(read(button.candidate_owner_execution.path));assert.equal(buttonSmoke.result,'pass');
 assert.equal(buttonSmoke.prior_source_admissions_preserved,49);assert.equal(buttonSmoke.current_source_admissions,54);assert.equal(buttonSmoke.button_tokenization_source_decisions,5);
 assert.equal(buttonSmoke.candidate_view_only,true);assert.equal(buttonSmoke.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
 for(const edit of button.literal_edits){assert.equal(current.split(edit.before).length,2);current=current.replace(edit.before,edit.after);}
 assert.deepEqual(button.after,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 const repairRaw=read('compatibility/rc/21x-c04-button-token-repairs-owner-successor.json');
 assert.equal(hash(repairRaw),'aafc55afe61a1ca7c3b104e088ac6e14159e2679f1d652c70da53dc1c958d91d');
 const repair=JSON.parse(repairRaw);assert.equal(repair.path,path);assert.equal(repair.line,'21.x');
 assert.equal(repair.source_parent,'2103cdde255ea68b82b51f94f42e6c9b95824ea0');
 assert.deepEqual(repair.before,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 assert.equal(repair.literal_edits.length,15);assert.equal(repair.tagged_golden_changes,0);assert.equal(repair.original_assertions_or_rejection_controls_dropped,0);
 for(const ref of [repair.canonical_transition,repair.candidate_owner_execution,repair.source_handler_controls]){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
 const repairSmoke=JSON.parse(read(repair.candidate_owner_execution.path));assert.equal(repairSmoke.result,'pass');
 assert.equal(repairSmoke.prior_source_admissions_preserved,54);assert.equal(repairSmoke.current_source_admissions,56);assert.equal(repairSmoke.button_token_repairs_source_decisions,2);
 assert.equal(repairSmoke.candidate_view_only,true);assert.equal(repairSmoke.actual_native_artifact_browser_floor_or_full_audit_qualified,false);
 for(const edit of repair.literal_edits){assert.equal(current.split(edit.before).length,2);current=current.replace(edit.before,edit.after);}
 assert.deepEqual(repair.after,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 const transactionRaw=read('compatibility/rc/21x-c04-owner-source-transaction-owner-successor.json');
 assert.equal(hash(transactionRaw),'0ced376e7962a47cf107639b8e88ae98763cb16a66a895e46034ee3e567c4dfd');
 const transaction=JSON.parse(transactionRaw);assert.equal(transaction.path,path);assert.equal(transaction.line,'21.x');
 assert.deepEqual(transaction.before,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 assert.equal(transaction.literal_edits.length,11);assert.equal(transaction.canonical_dispositions_changed,0);assert.equal(transaction.tagged_golden_changes,0);assert.equal(transaction.original_assertions_or_rejection_controls_dropped,0);
 for(const ref of [transaction.tool_inputs,transaction.source_transaction_helper,transaction.current_owner_execution,transaction.source_transaction_controls]){const raw=read(ref.path);assert.equal(hash(raw),ref.sha256);assert.equal(raw.length,ref.bytes);}
 const transactionExecution=JSON.parse(read(transaction.current_owner_execution.path));assert.equal(transactionExecution.result,'pass');assert.equal(transactionExecution.current_source_admissions,56);assert.equal(transactionExecution.canonical_ledger_unchanged,true);assert.equal(transactionExecution.source_registry_unchanged,true);
 assert.equal(transactionExecution.subjects.find(ref=>ref.path===path).sha256,transaction.after.sha256);
 const transactionControls=JSON.parse(read(transaction.source_transaction_controls.path));assert.equal(transactionControls.result,'pass');assert.equal(transactionControls.rejected.length,100);assert.equal(transactionControls.individual_metadata_rows,13);assert.equal(transactionControls.fresh_whole_body_reviews,4);assert.equal(transactionControls.compiler_cases,34);
 for(const edit of transaction.literal_edits){assert.equal(current.split(edit.before).length,2);current=current.replace(edit.before,edit.after);}
 assert.deepEqual(transaction.after,{sha256:hash(current),bytes:Buffer.byteLength(current)});
 const expected=Buffer.from(current);assert.equal(read(path).equals(expected),true,'unreviewed owner change outside exact retained-verifier successor');
 return {path,sha256:hash(expected),bytes:expected.length};
}

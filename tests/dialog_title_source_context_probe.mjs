/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact title transition, raw-reader integrity and real pre/post-cache failures. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DIALOG_TITLE_SOURCE_IMAGES,dialogTitleProductSubject,dialogTitleReaderSubject} from '../scripts/dialog-title-source-context.mjs';
import {snackDomRawCurrentRead,dialogTitlePriorMetadataRead,inspectSnackCurrentDialogContracts,qualifyIndependentSnackProductDelta} from '../scripts/snack-dom-source-context.mjs';
import {autocompleteSelectionReaderSubject} from '../scripts/autocomplete-selection-spec-subject.mjs';
import {RULES_JS_BUILD_REPORT,RULES_JS_BUILD_SHAS,rulesJsBuildEntryEvidenceOk} from '../scripts/upstream-rules-js-build-admission.mjs';
import {testingApi21xEntryEvidenceOk} from '../scripts/upstream-testing-api-21x-admission.mjs';
import {retainedTitleOwnerReference} from './dialog_title_retained_subjects.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),main=resolve(root,'../../codex-closeout-main/ngx-compat-material-legacy');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const impact=JSON.parse(readFileSync(join(root,'compatibility/rc/dialog-title-current-source-impact.json')));
const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES'])delete env[key];
const original=(directory,parent,path)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',parent+':'+path],{cwd:directory,env,maxBuffer:1024*1024});
let rejections=0,metadataCases=0;const lines=[];
for(const [line,directory]of [['21.x',root],['main',main]]){
 const disk=path=>readFileSync(join(directory,path));let late=null;
 const read=path=>path===late?Buffer.concat([disk(path),Buffer.from('\n')]):disk(path);
 const scope=dialogTitleProductSubject({root:directory,read,line});assert.equal(scope.line,line);assert.equal(scope.old_product_bytes_exposed,false);
 assert.equal(scope.current_native_or_packed_or_full_source_qualified,false);
 const parent=impact.rows.find(row=>row.line===line).before_source_parent;
 for(const image of DIALOG_TITLE_SOURCE_IMAGES){
  for(const side of ['before','after']){
   const current=scope.qualify({path:image.path,sha256:image[side],bytes:image[side+'_bytes']});assert.deepEqual(current,{path:image.path,sha256:image.after,bytes:image.after_bytes});metadataCases++;
  }
  assert.deepEqual(scope.historicalReference({path:image.path,sha256:image.after}),{path:image.path,sha256:image.before});
  assert.equal(hash(read(image.path)),image.after,'raw reader exposed old product data');
  for(const ref of [{path:image.path,sha256:'0'.repeat(64)},{path:image.path,sha256:image.before,bytes:0}]){assert.throws(()=>scope.qualify(ref));rejections++;}
  const before=original(directory,parent,image.path);assert.equal(hash(before),image.before);
  for(const bad of [before,Buffer.concat([disk(image.path),Buffer.from('\n')])]){assert.throws(()=>dialogTitleProductSubject({root:directory,line,read:path=>path===image.path?bad:disk(path)}));rejections++;}
 }
 for(const member of scope.bound){late=member.path;assert.throws(()=>scope.assertCurrent(),undefined,member.path);rejections++;}late=null;scope.assertCurrent();
 assert.throws(()=>dialogTitleProductSubject({root:directory,line,read:path=>path==='scripts/dialog-title-source-context.mjs'?Buffer.concat([disk(path),Buffer.from('\n')]):disk(path)}));rejections++;
 assert.equal(scope.qualify({path:'unrelated.ts',sha256:'0'.repeat(64)}),null);
 assert.equal('beforeRead' in scope,false);assert.equal('preimages' in scope,false);
 lines.push({line,exact_product_sources:2,new_optional_internal_parameter:true,public_signatures_and_external_imported_roles_preserved:true,raw_product_bytes_are_current:true,native_or_full_gate_credit:false});
}
const disk=path=>readFileSync(join(root,path));let late=null;const read=path=>path===late?Buffer.concat([disk(path),Buffer.from('\n')]):disk(path);
const readers=dialogTitleReaderSubject({root,read,line:'21.x'}),packet=JSON.parse(disk('compatibility/rc/dialog-title-current-source-reader-successors.json'));
const currentOwner=retainedTitleOwnerReference({root,read});
// The finite four-decision successor adds eleven continuously bound inputs.
// Preserve the prior 32-reader-member and 108-rejection baseline explicitly.
const inspectionPacketPath='compatibility/rc/21x-c04-inspection-compatibility-canonical-transition.json';
const inspectionPacket=JSON.parse(disk(inspectionPacketPath)),inspectionBody=JSON.parse(disk(inspectionPacket.review.path));
const inspectionAddedToolPaths=[inspectionPacketPath,...inspectionPacket.source_members.map(ref=>ref.path),inspectionPacket.review.path,...inspectionBody.reviews.map(row=>row.patch_file)];
assert.equal(new Set(inspectionAddedToolPaths).size,11);
const selectorPacketPath='compatibility/rc/21x-c04-selector-density-canonical-transition.json';
const selectorPacket=JSON.parse(disk(selectorPacketPath)),selectorBody=JSON.parse(disk(selectorPacket.review.path));
const selectorAddedToolPaths=[selectorPacketPath,...selectorPacket.source_members.map(ref=>ref.path),selectorPacket.review.path,...selectorBody.reviews.map(row=>row.patch_file)];
assert.equal(new Set(selectorAddedToolPaths).size,9);
const buttonPacketPath='compatibility/rc/21x-c04-button-tokenization-canonical-transition.json';
const buttonPacket=JSON.parse(disk(buttonPacketPath)),buttonBody=JSON.parse(disk(buttonPacket.review.path));
const buttonAddedToolPaths=[buttonPacketPath,...buttonPacket.source_members.map(ref=>ref.path),buttonPacket.review.path,...buttonBody.reviews.map(row=>row.patch_file)];
assert.equal(new Set(buttonAddedToolPaths).size,12);
const repairPacketPath='compatibility/rc/21x-c04-button-token-repairs-canonical-transition.json';
const repairPacket=JSON.parse(disk(repairPacketPath)),repairBody=JSON.parse(disk(repairPacket.review.path));
const repairAddedToolPaths=[repairPacketPath,...repairPacket.source_members.map(ref=>ref.path),repairPacket.review.path,...repairBody.reviews.map(row=>row.patch_file)];
assert.equal(new Set(repairAddedToolPaths).size,9);
const addedToolPaths=[...inspectionAddedToolPaths,...selectorAddedToolPaths,...buttonAddedToolPaths,...repairAddedToolPaths];
assert.equal(new Set(addedToolPaths).size,41);assert.equal(readers.bound.length,32+11+9+12+9);
assert.equal(readers.bound.filter(ref=>!repairAddedToolPaths.includes(ref.path)).length,32+11+9+12);
assert.equal(readers.bound.filter(ref=>!buttonAddedToolPaths.includes(ref.path)&&!repairAddedToolPaths.includes(ref.path)).length,32+11+9);
assert.equal(readers.bound.filter(ref=>!selectorAddedToolPaths.includes(ref.path)&&!buttonAddedToolPaths.includes(ref.path)&&!repairAddedToolPaths.includes(ref.path)).length,32+11);
assert.ok(addedToolPaths.every(path=>readers.bound.some(ref=>ref.path===path)));
assert.equal(readers.bound.filter(ref=>!addedToolPaths.includes(ref.path)).length,32);

const currentReaderRef=row=>row.path===currentOwner.path?currentOwner:{path:row.path,...row.after};
assert.equal(packet.code_subjects.length,9);
for(const row of packet.code_subjects){
 const before=original(root,packet.source_parent,row.path);assert.equal(hash(before),row.before.sha256);
 assert.deepEqual(readers.qualify({path:row.path,...row.before}),currentReaderRef(row));
 assert.deepEqual(readers.historicalReference({path:row.path,...row.after}),{path:row.path,...row.before});metadataCases++;
}
for(const member of readers.bound){
 assert.throws(()=>dialogTitleReaderSubject({root,line:'21.x',read:path=>path===member.path?Buffer.concat([disk(path),Buffer.from('\n')]):disk(path)}));rejections++;
 late=member.path;assert.throws(()=>readers.assertCurrent(),undefined,member.path);rejections++;
}late=null;readers.assertCurrent();
const mainDisk=path=>readFileSync(join(main,path));let mainLate=null;
const mainRead=path=>path===mainLate?Buffer.concat([mainDisk(path),Buffer.from('\n')]):mainDisk(path);
const mainReaders=dialogTitleReaderSubject({root:main,read:mainRead,line:'main'}),mainPacket=JSON.parse(mainDisk('compatibility/rc/dialog-title-current-source-reader-successors.json'));
assert.equal(mainPacket.code_subjects.length,9);
for(const row of mainPacket.code_subjects)for(const side of ['before','after']){assert.deepEqual(mainReaders.qualify({path:row.path,...row[side]}),{path:row.path,...row.after});metadataCases++;}
for(const member of mainReaders.bound){
 assert.throws(()=>dialogTitleReaderSubject({root:main,line:'main',read:path=>path===member.path?Buffer.concat([mainDisk(path),Buffer.from('\n')]):mainDisk(path)}));rejections++;
 mainLate=member.path;assert.throws(()=>mainReaders.assertCurrent());rejections++;
}mainLate=null;mainReaders.assertCurrent();
readers.withHistoricalToolMetadata(metadata=>{
 for(const row of packet.code_subjects)assert.equal(hash(metadata(row.path)),row.before.sha256);
 for(const image of DIALOG_TITLE_SOURCE_IMAGES)assert.equal(hash(metadata(image.path)),image.after,'tool metadata projected product source');
});
let historicalToolFaults=0;
for(const member of readers.bound){late=member.path;assert.throws(()=>readers.withHistoricalToolMetadata(metadata=>metadata(packet.code_subjects[0].path)));historicalToolFaults++;}late=null;
const temporary=mkdtempSync(join(tmpdir(),'ngx-title-peer-reader-'));let peerPositive=0,peerRejected=0;
try{
 const fixtureRoot=join(temporary,'root'),store=join(temporary,'store');mkdirSync(fixtureRoot);mkdirSync(join(store,'@angular'),{recursive:true});
 symlinkSync(store,join(fixtureRoot,'node_modules'),'dir');
 for(const name of ['material','cdk']){
  const peer=join(temporary,name);mkdirSync(join(peer,'tokens'),{recursive:true});writeFileSync(join(peer,'tokens','_index.scss'),name);
  symlinkSync(peer,join(store,'@angular',name),'dir');
 }
 symlinkSync(join(temporary,'material'),join(store,'@angular','core'),'dir');
 symlinkSync(join(temporary,'material','tokens','_index.scss'),join(temporary,'material','tokens','_linked.scss'));
 writeFileSync(join(fixtureRoot,'source.ts'),'owned source');symlinkSync(join(fixtureRoot,'source.ts'),join(fixtureRoot,'source-link.ts'));
 const readPeer=snackDomRawCurrentRead({root:fixtureRoot});assert.equal(readPeer('source.ts').toString(),'owned source');
 for(const name of ['material','cdk']){assert.equal(readPeer('node_modules/@angular/'+name+'/tokens/_index.scss').toString(),name);peerPositive++;}
 for(const path of ['/source.ts','../root/source.ts','node_modules/@angular/material/tokens/../../source.ts','source-link.ts','node_modules/@angular/material/tokens/_linked.scss','node_modules/@angular/core/tokens/_index.scss']){assert.throws(()=>readPeer(path));peerRejected++;}
}finally{rmSync(temporary,{recursive:true,force:true});}

const shared=autocompleteSelectionReaderSubject({root,read,line:'21.x'});shared.assertCurrent();
for(const image of DIALOG_TITLE_SOURCE_IMAGES)assert.equal(shared.qualify({path:image.path,sha256:image.before}).sha256,image.after);
for(const row of packet.code_subjects)assert.equal(shared.qualify({path:row.path,...row.before}).sha256,currentReaderRef(row).sha256);
const historical=dialogTitlePriorMetadataRead({root,read});
for(const image of DIALOG_TITLE_SOURCE_IMAGES)assert.equal(hash(historical(image.path)),image.before);
const current=inspectSnackCurrentDialogContracts({root,read:historical});
assert.equal(current.proposed_sources.size,49);
for(const image of DIALOG_TITLE_SOURCE_IMAGES)assert.equal(hash(current.proposed_sources.get(image.path)),image.after,'historical title reader was used as current source');
let fakeBeforeRejected=0;
for(const image of DIALOG_TITLE_SOURCE_IMAGES){
 assert.throws(()=>inspectSnackCurrentDialogContracts({root,read:path=>path===image.path?historical(path):read(path)}));fakeBeforeRejected++;
}
assert.equal(qualifyIndependentSnackProductDelta({root,read}).source_scope_only,true);
let generalSourceFaults=0;
for(const image of DIALOG_TITLE_SOURCE_IMAGES){late=image.path;assert.throws(()=>qualifyIndependentSnackProductDelta({root,read}));generalSourceFaults++;}late=null;
const ledger=JSON.parse(disk('compatibility/f10/disposition-ledger/ledger.json')),buildBody=JSON.parse(disk(RULES_JS_BUILD_REPORT));
const build=ledger.entries.find(row=>row.sha===RULES_JS_BUILD_SHAS[0]);assert.ok(build);
assert.equal(rulesJsBuildEntryEvidenceOk({root,read,line:'21.x',entry:build,body:buildBody}),true,'fresh build-source facts reject the exact admitted title delta');
late=DIALOG_TITLE_SOURCE_IMAGES[0].path;assert.equal(rulesJsBuildEntryEvidenceOk({root,read,line:'21.x',entry:build,body:buildBody}),false);late=null;
const testingBody=JSON.parse(disk('compatibility/rc/upstream-testing-api-21x-individual-admission.json'));
const testing=ledger.entries.find(row=>row.sha===testingBody.reviews[0].sha);assert.ok(testing);
const productPaths=()=>JSON.parse(disk('compatibility/rc/packed-upstream-source-build.json')).candidate_context.product_members.map(ref=>ref.path).filter(path=>/\.(ts|scss|css|html)$/.test(path));
assert.equal(testingApi21xEntryEvidenceOk({entry:testing,body:testingBody,read,productPaths,line:'21.x'}),true);
late=DIALOG_TITLE_SOURCE_IMAGES[1].path;assert.equal(testingApi21xEntryEvidenceOk({entry:testing,body:testingBody,read,productPaths,line:'21.x'}),false);late=null;
assert.equal(hash(disk('compatibility/f10/disposition-ledger/ledger.json')),'ac34fb7cbf4c19dc0f06460a57d1ed26906471b08d10d5e5b25279c2a58d5111');
assert.equal(rejections,108+2*addedToolPaths.length);assert.equal(historicalToolFaults,32+addedToolPaths.length);
const report={schema_version:1,prior_reader_members_preserved:32,prior_rejection_baseline:108,inspection_binding_members_preserved:11,selector_density_binding_members_added:9,button_tokenization_binding_members_added:12,button_token_repairs_binding_members_added:9,additional_bound_tool_paths:addedToolPaths,additional_rejection_checks:2*addedToolPaths.length,product_lines:lines,source_reader_line:'21.x',main_source_reader_port_qualified:true,metadata_cases:metadataCases,rejections,actual_fresh_build_source_positive:true,actual_testing_source_positive:true,both_real_source_checkers_reject_post_success_product_faults:true,raw_current_readers_expose_old_product_or_tool_bytes:false,historical_tool_metadata_images:packet.code_subjects.length,historical_tool_metadata_faults_rejected:historicalToolFaults,declared_peer_link_reads:peerPositive,source_traversal_or_nested_or_other_peer_links_rejected:peerRejected,canonical_ledger_unchanged:true,reader_hooks:packet.code_subjects.length,general_source_qualification_passed_21x:true,current_raw_dialog_graph_members:49,historical_title_metadata_unwrapped_for_current_admission:true,fake_current_before_frames_rejected:fakeBeforeRejected,general_source_product_faults_rejected:generalSourceFaults,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));

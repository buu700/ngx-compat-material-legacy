/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Main's native-spec, Sass-notice and title transitions must compose exactly. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,symlinkSync,unlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DIALOG_TITLE_SOURCE_IMAGES,dialogTitleReaderSubject} from '../scripts/dialog-title-source-context.mjs';
import {autocompleteSelectionReaderSubject} from '../scripts/autocomplete-selection-spec-subject.mjs';
import {sassWrapperNoticeSubject,SASS_NOTICE_PACKET,SASS_NOTICE_READERS} from '../scripts/sass-wrapper-notice-subject.mjs';
import {inspectSnackCurrentDialogContracts,dialogTitlePriorMetadataRead,snackDomRawCurrentRead,qualifyIndependentSnackProductDelta} from '../scripts/snack-dom-source-context.mjs';
import {reviewDialogPortalSource} from '../scripts/dialog-portal-failure-recovery.mjs';
import {RULES_JS_BUILD_REPORT,RULES_JS_BUILD_SHAS,rulesJsBuildEntryEvidenceOk} from '../scripts/upstream-rules-js-build-admission.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),hash=b=>createHash('sha256').update(b).digest('hex');
const disk=path=>readFileSync(join(root,path));let late=null;
const read=path=>path===late?Buffer.concat([disk(path),Buffer.from('\n')]):disk(path);
// Both legitimate workspace routes must resolve to the declared root peers.
const realPeerRead=snackDomRawCurrentRead({root});let peerPositive=0,peerRejected=0;
for(const name of ['material','cdk'])for(const prefix of ['', 'projects/ngx-material-legacy/']){
 const path=prefix+'node_modules/@angular/'+name+'/package.json';assert.ok(realPeerRead(path).equals(disk(path)));peerPositive++;
}
for(const [name,tail]of [['@angular/core','package.json'],['@angular/common','package.json'],['@angular/forms','package.json'],['rxjs','package.json'],['rxjs','operators/package.json']]){
 const path='projects/ngx-material-legacy/node_modules/'+name+'/'+tail;assert.ok(realPeerRead(path).equals(disk(path)));peerPositive++;
}
assert.throws(()=>realPeerRead('projects/ngx-material-legacy/node_modules/rxjs/dist/cjs/index.js'));peerRejected++;
const temporary=mkdtempSync(join(tmpdir(),'ngx-main-title-peer-'));
try{
 const fixture=join(temporary,'root'),peer=join(temporary,'peer'),alternate=join(temporary,'alternate');
 for(const path of ['node_modules/@angular','projects/ngx-material-legacy/node_modules/@angular','projects/other/node_modules/@angular'])mkdirSync(join(fixture,path),{recursive:true});
 mkdirSync(join(peer,'tokens'),{recursive:true});mkdirSync(alternate);writeFileSync(join(peer,'package.json'),'declared');writeFileSync(join(peer,'tokens','entry'),'token');writeFileSync(join(alternate,'package.json'),'alternate');
 const local='projects/ngx-material-legacy/node_modules/@angular/';
 for(const path of ['node_modules/@angular/cdk',local+'cdk','projects/other/node_modules/@angular/cdk'])symlinkSync(peer,join(fixture,path),'dir');
 for(const path of ['node_modules/@angular/core',local+'core'])symlinkSync(peer,join(fixture,path),'dir');
 symlinkSync(join(peer,'package.json'),join(peer,'tokens','linked'));writeFileSync(join(fixture,'source.ts'),'source');symlinkSync(join(fixture,'source.ts'),join(fixture,'source-linked.ts'));
 const readPeer=snackDomRawCurrentRead({root:fixture});assert.equal(readPeer(local+'cdk/package.json').toString(),'declared');peerPositive++;
 for(const path of ['/source.ts','../root/source.ts',local+'cdk/tokens/../../source.ts',local+'core/package.json','node_modules/@angular/core/package.json','projects/other/node_modules/@angular/cdk/package.json',local+'cdk/tokens/linked','source-linked.ts']){assert.throws(()=>readPeer(path));peerRejected++;}
 unlinkSync(join(fixture,local+'cdk'));symlinkSync(alternate,join(fixture,local+'cdk'),'dir');assert.throws(()=>readPeer(local+'cdk/package.json'),/workspace peer differs/);peerRejected++;
}finally{rmSync(temporary,{recursive:true,force:true});}
const canonical=disk('compatibility/f10/disposition-ledger/ledger.json');
const packet=JSON.parse(disk('compatibility/rc/dialog-title-current-source-reader-successors.json'));
assert.equal(packet.line,'main');assert.equal(packet.code_subjects.length,9);
const title=dialogTitleReaderSubject({root,read,line:'main'}),shared=autocompleteSelectionReaderSubject({root,read,line:'main'});
const notices=sassWrapperNoticeSubject({root,read,line:'main'}),prefixes=JSON.parse(disk(SASS_NOTICE_PACKET)),noticeHooks=JSON.parse(disk(SASS_NOTICE_READERS));
assert.equal(notices.exact_silent_prefixes,7);assert.equal(notices.current_reader_hooks,6);
let referenceCases=0;
for(const row of packet.code_subjects)for(const side of ['before','after']){
 assert.equal(shared.qualify({path:row.path,...row[side]}).sha256,row.after.sha256);referenceCases++;
}
for(const row of JSON.parse(disk('compatibility/rc/autocomplete-selection-source-reader-successors.json')).code_subjects)for(const side of ['before','after']){
 const current=shared.qualify({path:row.path,...row[side]});assert.equal(current.sha256,hash(disk(row.path)));referenceCases++;
}
for(const row of noticeHooks.code_subjects)for(const side of ['before','after']){
 const current=shared.qualify({path:row.path,...row[side]});assert.equal(current.sha256,hash(disk(row.path)));referenceCases++;
}
for(const row of prefixes.subjects){
 assert.equal(hash(disk(row.path)),row.after.sha256);assert.equal(disk(row.path).length,row.after.bytes);
 assert.ok(disk(row.path).subarray(0,Buffer.byteLength(prefixes.header)).equals(Buffer.from(prefixes.header)));
 assert.equal(shared.qualify({path:row.path,...row.before}).sha256,row.after.sha256);referenceCases++;
}
const rejected=[];
for(const row of packet.code_subjects)for(const [id,ref]of [['hash',{path:row.path,sha256:'0'.repeat(64)}],['bytes',{path:row.path,...row.before,bytes:0}]]){
 assert.throws(()=>shared.qualify(ref),undefined,row.path);rejected.push(id+'/'+row.path);
}
const guards=[...DIALOG_TITLE_SOURCE_IMAGES.map(image=>image.path),'scripts/dialog-title-source-context.mjs','compatibility/rc/dialog-title-current-source-reader-successors.json',...packet.code_subjects.map(row=>row.path)];
assert.equal(new Set(guards).size,13);
for(const path of guards){
 assert.throws(()=>autocompleteSelectionReaderSubject({root,line:'main',read:p=>p===path?Buffer.concat([disk(p),Buffer.from('\n')]):disk(p)}));rejected.push('cold/'+path);
 late=path;assert.throws(()=>shared.assertCurrent());rejected.push('late/'+path);
}late=null;shared.assertCurrent();
title.withHistoricalToolMetadata(metadata=>{
 for(const row of packet.code_subjects)assert.equal(hash(metadata(row.path)),row.before.sha256);
 for(const image of DIALOG_TITLE_SOURCE_IMAGES)assert.equal(hash(metadata(image.path)),image.after);
});
for(const member of title.bound){late=member.path;assert.throws(()=>title.withHistoricalToolMetadata(metadata=>metadata(packet.code_subjects[0].path)));rejected.push('old-tool-metadata/'+member.path);}late=null;
const historical=dialogTitlePriorMetadataRead({root,read}),current=inspectSnackCurrentDialogContracts({root,read:historical});
assert.equal(snackDomRawCurrentRead({root,read:historical}),read);assert.equal(current.proposed_sources.size,49);
for(const image of DIALOG_TITLE_SOURCE_IMAGES){
 assert.equal(hash(current.proposed_sources.get(image.path)),image.after);
 assert.throws(()=>inspectSnackCurrentDialogContracts({root,read:p=>p===image.path?historical(p):read(p)}));rejected.push('unmarked-old-product/'+image.path);
}
// An arbitrary before-image callback cannot claim the canonical historical lane.
assert.throws(()=>reviewDialogPortalSource(root,read,{currentSourceRead:read}));rejected.push('same-reader-portal-metadata');
assert.throws(()=>reviewDialogPortalSource(root,p=>read(p),{currentSourceRead:read}));rejected.push('unmarked-portal-metadata');
const product=qualifyIndependentSnackProductDelta({root,read});assert.equal(product.source_scope_only,true);
for(const image of DIALOG_TITLE_SOURCE_IMAGES){late=image.path;assert.throws(()=>qualifyIndependentSnackProductDelta({root,read}));rejected.push('current-product/'+image.path);}late=null;
const ledger=JSON.parse(canonical),build=ledger.entries.find(row=>row.sha===RULES_JS_BUILD_SHAS[0]),body=JSON.parse(disk(RULES_JS_BUILD_REPORT));
assert.equal(rulesJsBuildEntryEvidenceOk({root,read,line:'main',entry:build,body}),true,'fresh whole build-source facts rejected the composed title and Sass deltas');
late=DIALOG_TITLE_SOURCE_IMAGES[0].path;assert.equal(rulesJsBuildEntryEvidenceOk({root,read,line:'main',entry:build,body}),false);rejected.push('post-success-build-source');late=null;
assert.ok(disk('compatibility/f10/disposition-ledger/ledger.json').equals(canonical));
shared.assertCurrent();title.assertCurrent();notices.assertCurrent();
const report={schema_version:1,line:'main',canonical_peer_reads:peerPositive,peer_root_or_path_faults_rejected:peerRejected,reference_cases:referenceCases,title_reader_hooks:9,original_native_spec_reader_hooks:7,original_Sass_reader_hooks:6,original_silent_Sass_prefixes:7,current_raw_title_images:2,current_raw_dialog_graph_members:49,rejections:rejected.length,rejected_case_ids:rejected,current_general_source_qualification_passed:true,actual_fresh_build_source_positive:true,historical_tool_projection_preserves_raw_product:true,unmarked_portal_metadata_readers_rejected:2,canonical_SHA_ledger_unchanged:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
assert.equal(peerPositive,10);assert.equal(peerRejected,10);assert.equal(referenceCases,51);assert.equal(rejected.length,61);
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));

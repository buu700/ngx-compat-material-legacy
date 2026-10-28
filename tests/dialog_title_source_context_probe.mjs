/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact title transition, raw-reader integrity and real pre/post-cache failures. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DIALOG_TITLE_SOURCE_IMAGES,dialogTitleProductSubject,dialogTitleReaderSubject} from '../scripts/dialog-title-source-context.mjs';
import {autocompleteSelectionReaderSubject} from '../scripts/autocomplete-selection-spec-subject.mjs';
import {RULES_JS_BUILD_REPORT,RULES_JS_BUILD_SHAS,rulesJsBuildEntryEvidenceOk} from '../scripts/upstream-rules-js-build-admission.mjs';
import {testingApi21xEntryEvidenceOk} from '../scripts/upstream-testing-api-21x-admission.mjs';
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
assert.equal(packet.code_subjects.length,5);
for(const row of packet.code_subjects){
 const before=original(root,packet.source_parent,row.path);assert.equal(hash(before),row.before.sha256);
 assert.deepEqual(readers.qualify({path:row.path,...row.before}),{path:row.path,...row.after});
 assert.deepEqual(readers.historicalReference({path:row.path,...row.after}),{path:row.path,...row.before});metadataCases++;
}
for(const member of readers.bound){
 assert.throws(()=>dialogTitleReaderSubject({root,line:'21.x',read:path=>path===member.path?Buffer.concat([disk(path),Buffer.from('\n')]):disk(path)}));rejections++;
 late=member.path;assert.throws(()=>readers.assertCurrent(),undefined,member.path);rejections++;
}late=null;readers.assertCurrent();
assert.throws(()=>dialogTitleReaderSubject({root:main,read:path=>readFileSync(join(main,path)),line:'main'}));rejections++;
const shared=autocompleteSelectionReaderSubject({root,read,line:'21.x'});shared.assertCurrent();
for(const image of DIALOG_TITLE_SOURCE_IMAGES)assert.equal(shared.qualify({path:image.path,sha256:image.before}).sha256,image.after);
for(const row of packet.code_subjects)assert.equal(shared.qualify({path:row.path,...row.before}).sha256,row.after.sha256);
const ledger=JSON.parse(disk('compatibility/f10/disposition-ledger/ledger.json')),buildBody=JSON.parse(disk(RULES_JS_BUILD_REPORT));
const build=ledger.entries.find(row=>row.sha===RULES_JS_BUILD_SHAS[0]);assert.ok(build);
assert.equal(rulesJsBuildEntryEvidenceOk({root,read,line:'21.x',entry:build,body:buildBody}),true,'fresh build-source facts reject the exact admitted title delta');
late=DIALOG_TITLE_SOURCE_IMAGES[0].path;assert.equal(rulesJsBuildEntryEvidenceOk({root,read,line:'21.x',entry:build,body:buildBody}),false);late=null;
const testingBody=JSON.parse(disk('compatibility/rc/upstream-testing-api-21x-individual-admission.json'));
const testing=ledger.entries.find(row=>row.sha===testingBody.reviews[0].sha);assert.ok(testing);
const productPaths=()=>JSON.parse(disk('compatibility/rc/packed-upstream-source-build.json')).candidate_context.product_members.map(ref=>ref.path).filter(path=>/\.(ts|scss|css|html)$/.test(path));
assert.equal(testingApi21xEntryEvidenceOk({entry:testing,body:testingBody,read,productPaths,line:'21.x'}),true);
late=DIALOG_TITLE_SOURCE_IMAGES[1].path;assert.equal(testingApi21xEntryEvidenceOk({entry:testing,body:testingBody,read,productPaths,line:'21.x'}),false);late=null;
assert.equal(hash(disk('compatibility/f10/disposition-ledger/ledger.json')),'22f775835030f175795d8865e9b30920b0b7fea5b908cbd6a9dca7775a71d779');
const report={schema_version:1,product_lines:lines,source_reader_line:'21.x',main_source_reader_port_qualified:false,metadata_cases:metadataCases,rejections,actual_fresh_build_source_positive:true,actual_testing_source_positive:true,both_real_source_checkers_reject_post_success_product_faults:true,old_product_or_tool_bytes_exposed:false,canonical_ledger_unchanged:true,reader_hooks:packet.code_subjects.length,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));

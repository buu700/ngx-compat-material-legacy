/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite source/API/style review; never a packed/native admission or golden. */
import {reviewCurrentNativeTabLifecycle} from './current-native-tab-lifecycle-source.mjs';
import {createCurrentNativeTabProductSource} from './current-native-tab-product-source.mjs';
import {createCurrentNativeTabDownstreamSource} from './current-native-tab-downstream-source.mjs';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve,join,sep,parse} from 'node:path';
import {fileURLToPath} from 'node:url';
const rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..'),tsRequire=createRequire(import.meta.url),ts=tsRequire('typescript');
const loadedReviewerImage=readFileSync(fileURLToPath(import.meta.url));
const loadedTypescriptPath=realpathSync(tsRequire.resolve('typescript')),loadedTypescriptImage=readFileSync(loadedTypescriptPath);
const hash=value=>createHash('sha256').update(value).digest('hex');
const bufferEquals=Buffer.prototype.equals,apply=Reflect.apply;
const bytesEqual=(a,b)=>Buffer.isBuffer(b)&&apply(bufferEquals,a,[b]);
const tab='projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts',template='projects/ngx-material-legacy/legacy-tabs/tab-body.html';
const priorPath='compatibility/rc/remaining-native-admission-tab-lifecycle-repair-prior.json.gz';
const pins={main:{prior:'13b9222a165a1bb9a875e523c9cd24ef0f19960d4890060bc5a05833cab0bbeb',parent:'960d98d87aeac3a24b312cf9112abc6d6383a7fd'},
 '21.x':{prior:'a15203c1865926d53ba5f1ca6d6a1e4fbae1f9a9cc1dbb0e158a8827afdcad35',parent:'9d7f09cc55d85979272f0e42aaad564ad3ec1fd6'}};
export function reviewTabLifecycleDelta(beforeText,currentText,beforeTemplate,currentTemplate){
 assert.equal(beforeTemplate.split('_isCenterPosition(_position) ? null').length,2);
 assert.equal(currentTemplate,beforeTemplate.replace('_isCenterPosition(_position) ? null','_contentIsVisible ? null'),'unreviewed template delta');
 const parse=text=>{const file=ts.createSourceFile(tab,text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
 const before=parse(beforeText),current=parse(currentText);
 const owner=file=>file.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='_MatTabBodyBase');
 const prior=owner(before),next=owner(current);assert.ok(prior&&next);
 assert.deepEqual(before.statements.filter(node=>node!==prior).map(node=>node.getText(before)),current.statements.filter(node=>node!==next).map(node=>node.getText(current)),'tab module declarations/imports changed');
 assert.equal(before.text.slice(prior.getStart(before),prior.members.pos),current.text.slice(next.getStart(current),next.members.pos),'tab metadata/heritage changed');
 const changed=new Set(['ngOnDestroy','_startTransition','_finishTransition','_scheduleTransitionDone']);
 const added=new Set(['_deferredCentering','_originTransition','ngAfterViewInit','_contentIsVisible']);
 const memberKey=(node,file)=>{const name=node.name?.getText(file)||'<constructor>';return name==='animationDuration'?name+':'+node.kind:name;};
 const members=new Map(next.members.map(node=>[memberKey(node,current),node]));assert.equal(members.size,next.members.length);
 let unchanged=0;
 for(const member of prior.members){const name=memberKey(member,before),actual=members.get(name);assert.ok(actual,'removed original tab member '+name);
  if(changed.has(name)){assert.equal(member.kind,actual.kind);assert.equal(before.text.slice(member.getStart(before),member.body.getStart(before)),current.text.slice(actual.getStart(current),actual.body.getStart(current)),'changed method signature');}
  else {assert.equal(actual.getText(current),member.getText(before),'changed original member '+name);unchanged++;}
  members.delete(name);
 }
 assert.deepEqual([...members.keys()].sort(),[...added].sort(),'unreviewed added member');
 for(const name of ['_deferredCentering','_originTransition']){const node=members.get(name);assert.equal(node.kind,ts.SyntaxKind.PropertyDeclaration);assert.equal(node.type?.getText(current),'LegacyTabTransitionEvent | undefined');assert.deepEqual(node.modifiers.map(n=>n.kind),[ts.SyntaxKind.PrivateKeyword]);}
 for(const name of ['ngAfterViewInit','_contentIsVisible']){const node=members.get(name);assert.equal(node.parameters.length,0);assert.equal(node.type?.getText(current),name==='ngAfterViewInit'?'void':'boolean');assert.equal(node.modifiers?.length||0,0);}
 // Bind actual imported identifiers, rather than matching spelling or accepting an alias/shadow.
 const roles=file=>{
  const host={getSourceFile:name=>name===tab?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>'',getDirectories:()=>[],fileExists:name=>name===tab,readFile:name=>name===tab?file.text:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
  const checker=ts.createProgram([tab],{noResolve:true,noLib:true},host).getTypeChecker();
  return file.statements.filter(ts.isImportDeclaration).flatMap(node=>(node.importClause?.namedBindings?.elements||[]).map(item=>{
   const binding=checker.getSymbolAtLocation(item.name),references=[];assert.ok(binding);
   const visit=other=>{if(ts.isIdentifier(other)&&other!==item.name&&checker.getSymbolAtLocation(other)===binding)references.push({kind:ts.SyntaxKind[other.parent.kind],text:other.parent.getText(file)});ts.forEachChild(other,visit);};visit(file);
   return {module:node.moduleSpecifier.text,symbol:(item.propertyName||item.name).text,local:item.name.text,type_only:!!(node.importClause.isTypeOnly||item.isTypeOnly),references};
  }));
 };
 const priorRoles=roles(before),currentRoles=roles(current);assert.deepEqual(currentRoles,priorRoles,'tab imported binding/reference role changed');
 return {unchanged_members:unchanged,changed_method_bodies:[...changed],added_owned_members:[...added],all_existing_public_import_roles:currentRoles,
  imports_constructor_metadata_outputs_and_original_member_signatures_unchanged:true,html_structure_unchanged:true,only_private_visibility_expression_changed:true};
}
/** Exact historical first-repair schema-1 inspection, for the authenticated 1141-member image only. */
export function inspectHistoricalTabLifecycleRepair({root=rootDefault,readMember}={}){
 const read=path=>readMember?readMember(path):readFileSync(resolve(root,path)),json=path=>JSON.parse(read(path));
 const compressed=read(priorPath),prior=JSON.parse(gunzipSync(compressed)),pin=pins[prior.line];assert.ok(pin);assert.equal(hash(compressed),pin.prior);assert.equal(prior.source_parent,pin.parent);
 const before=new Map(prior.members.map(row=>{assert.equal(hash(row.text),row.sha256);return [row.path,row];}));assert.equal(before.size,9);
 const delta=reviewTabLifecycleDelta(before.get(tab).text,read(tab).toString(),before.get(template).text,read(template).toString());
 const tagged='compatibility/rc/remaining-native-admission-tab-tagged-animations.ts.gz';assert.equal(hash(gunzipSync(read(tagged))),'09fdfc1525e4178a36feb03e06db1be31cb5df8414d9b6626c9b074ba62d391f');
 const inputs=read('compatibility/rc/remaining-native-admission-source-inputs.json');assert.equal(hash(inputs),prior.line==='main'?'cac82c2c3b1df2b94d1c7ee1a9b6e7e2a7af4204cce0720c75eb7d20b8c3190d':'4fc2837d8522c891df277eda3cf3a63cf56f6c657e4ae5c113390f7d943da727');
 const stylePath='compatibility/rc/remaining-native-admission-tab-cyph-style-sanity.json',styleRef=JSON.parse(inputs).implementation_evidence.find(row=>row.path===stylePath);assert.ok(styleRef);assert.equal(hash(read(stylePath)),styleRef.sha256);
 const style=json(stylePath);assert.equal(style.resource_count,439);assert.equal(style.product_resources.length,439);
 for(const row of style.product_resources)if(row.path!==template)assert.equal(hash(read(row.path)),row.sha256,'resource changed '+row.path);
 const records=execFileSync('git',['-c','gc.auto=0','-c','maintenance.auto=0','ls-tree','-r','-z',pin.parent,'--','projects/ngx-material-legacy'],{cwd:root}).toString().split('\0').filter(Boolean);
 assert.equal(records.length,1141);
 const livePaths=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard','--','projects/ngx-material-legacy'],{cwd:root}).toString().split('\0').filter(Boolean);
 assert.deepEqual(livePaths.sort(),records.map(record=>record.split('\t')[1]).sort(),'product membership changed');
 for(const record of records){const[meta,path]=record.split('\t'),[mode,kind,blob]=meta.split(' ');assert.equal(mode,'100644');assert.equal(kind,'blob');if(path===tab||path===template)continue;
  const bytes=read(path);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),blob,'unreviewed product delta '+path);}
 const prefix='compatibility/rc/remaining-native-admission-tab-repair-',lifecycle=json(prefix+'lifecycle-controls.json'),producer=json(prefix+'producer-controls.json'),admission=json(prefix+'admission-controls.json'),dispatch=json(prefix+'dispatch-controls.json'),cyph=json(prefix+'cyph-style.json');
 assert.equal(lifecycle.source_sha256,hash(read(tab)));assert.equal(lifecycle.passed,47);assert.equal(lifecycle.failed,0);assert.equal(lifecycle.cases.length,47);assert.ok(lifecycle.cases.every(row=>row.result==='pass'));assert.equal(lifecycle.mutants.length,22);assert.ok(lifecycle.mutants.every(row=>row.result==='rejected'&&row.failed_case_ids.length));assert.deepEqual(lifecycle.completion_contract.candidate,lifecycle.completion_contract.reference);assert.equal(lifecycle.native_browser_execution,false);assert.equal(lifecycle.packed_execution,false);
 assert.equal(producer.source_sha256,hash(read('scripts/native-motion-consumer.ts')));assert.equal(producer.cases.length,29);assert.ok(producer.cases.every(row=>row.result==='pass'));assert.equal(producer.native_executed,false);
 assert.equal(admission.helper_sha256,hash(read('scripts/upstream-tab-completion-evidence.mjs')));assert.equal(admission.producer_sha256,hash(read('tests/upstream/tab-completion-admission.mjs')));assert.equal(admission.native_helper_sha256,hash(read('scripts/upstream-native-motion-run-evidence.mjs')));
 assert.equal(admission.line,prior.line);assert.equal(admission.full_packed_roster,106);assert.equal(admission.full_native_roster,306);assert.equal(admission.required_tab_cases,54);assert.equal(admission.actual_reader_writer_controls,72);assert.equal(admission.cached_actual_full_native_raw_controls,306);assert.equal(admission.cached_actual_tab_semantic_controls,3102);assert.equal(admission.actual_packed_native_or_floor_qualified,false);
 assert.equal(dispatch.line,prior.line);assert.equal(dispatch.actual_root_cli_cases,25);assert.equal(dispatch.root_sha256,hash(read('scripts/check-upstream-audit-disposition.mjs')));assert.equal(dispatch.actual_native_packed_or_floor_qualified,false);
 assert.equal(cyph.line,prior.line);assert.equal(cyph.cyph_head,style.cyph_head);assert.equal(cyph.cyph_clean,true);assert.equal(cyph.consumer_written,false);assert.equal(cyph.cyph_build_executed,false);assert.equal(cyph.css_scss_changes,0);assert.equal(cyph.resources_checked,439);assert.equal(cyph.resources_unchanged,438);assert.equal(cyph.template_change.current_sha256,hash(read(template)));assert.equal(cyph.template_change.only_existing_visibility_expression_changed,true);
 for(const row of style.cyph_members)assert.deepEqual(cyph.cyph_members.find(member=>member.path===row.path),row);
 return {schema_version:1,line:prior.line,prior:{path:priorPath,sha256:pin.prior},source_parent:pin.parent,...delta,unchanged_product_members:1139,unchanged_resources:438,css_scss_changes:0,
  controls:{lifecycle:47,lifecycle_mutants:22,producer:29,admission_reader_writer:72,admission_native_raw:306,admission_tab_semantic:3102,root_cli:25},
  source_members:[...before.keys(),'scripts/remaining-native-tab-lifecycle-review.mjs'].map(path=>({path,sha256:hash(read(path))})),
  scope:'Owned tab lifecycle, exact one-expression template delta and public import roles only. Tagged source and synthetic controls are distinct from actual Angular/packed/native/floor execution. Existing G11 contexts and historical-reader requalification remain pending.',actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}
/** Full current main source census composes three independently reviewed finite owners. */
let currentInspectionActive=false,currentInspectionNested=false;
export function inspectTabLifecycleRepair({root=rootDefault,readMember}={}){
 if(currentInspectionActive){currentInspectionNested=true;assert.fail('reentrant current tab lifecycle inspection');}
 currentInspectionActive=true;currentInspectionNested=false;
 try{
  const physical=path=>{
   const absolute=resolve(root),rootBase=parse(absolute).root;
   let rootCursor=rootBase;assert.ok(lstatSync(rootCursor).isDirectory(),'invalid current source root');
   for(const part of absolute.slice(rootBase.length).split(sep).filter(Boolean)){
    rootCursor=join(rootCursor,part);const stat=lstatSync(rootCursor);
    assert.ok(stat.isDirectory()&&!stat.isSymbolicLink(),'linked current source root ancestor');
   }
   if(!path.startsWith('node_modules/'))return readEvidenceMember(root,path);
   const match=/^node_modules\/(@angular\/(?:cdk|material))\/(.+)$/.exec(path);
   assert.ok(match,'unowned current peer path '+path);
   const nodeModules=join(root,'node_modules'),scope=join(nodeModules,'@angular');
   assert.ok(lstatSync(nodeModules).isDirectory()&&!lstatSync(nodeModules).isSymbolicLink());
   assert.ok(lstatSync(scope).isDirectory()&&!lstatSync(scope).isSymbolicLink());
   const peer=join(nodeModules,match[1]),peerStat=lstatSync(peer),base=realpathSync(peer);
   assert.ok(peerStat.isDirectory()||peerStat.isSymbolicLink(),'missing current peer');
   if(peerStat.isSymbolicLink())assert.ok(base.startsWith(join(nodeModules,'.pnpm')+sep),'peer root outside pinned workspace');
   assert.ok(lstatSync(base).isDirectory()&&!lstatSync(base).isSymbolicLink());
   assert.equal(JSON.parse(readEvidenceMember(base,'package.json')).name,match[1]);
   const relative=match[2].split('/');assert.ok(relative.every(part=>part&&part!=='.'&&part!=='..'));
   let cursor=base;for(const part of relative){cursor=join(cursor,part);assert.ok(!lstatSync(cursor).isSymbolicLink(),'linked current peer descendant '+path);}
   assert.ok(lstatSync(cursor).isFile(),'nonfile current peer '+path);
   return readFileSync(cursor);
  };
  const read=path=>{
   const before=physical(path),supplied=readMember?readMember(path):before;
   assert.ok(bytesEqual(before,supplied),'nonphysical current tab source '+path);
   assert.ok(bytesEqual(before,physical(path)),'current tab source changed during callback '+path);
   return before;
  };
  const assertLoadedImages=()=>{
   assert.ok(bytesEqual(physical('scripts/remaining-native-tab-lifecycle-review.mjs'),loadedReviewerImage),'changed loaded inspector image');
   const rootRequire=createRequire(join(resolve(root),'package.json'));
   assert.equal(realpathSync(rootRequire.resolve('typescript')),loadedTypescriptPath,'shadow TypeScript peer');
   assert.ok(bytesEqual(readFileSync(loadedTypescriptPath),loadedTypescriptImage),'changed loaded TypeScript image');
  };
  assertLoadedImages();
  const version=JSON.parse(read('projects/ngx-material-legacy/package.json')).version;
  const line=version.startsWith('22.')?'main':null;
  assert.equal(line,'main','current T01/T02/T03 source composition is main-only');
  const product=createCurrentNativeTabProductSource({root,line,read});
  product.assertCurrent();
  const lifecycle=reviewCurrentNativeTabLifecycle({root,line,read});
  lifecycle.assertCurrent();product.assertCurrent();
  const downstream=createCurrentNativeTabDownstreamSource({root,line,read});
  downstream.assertCurrent();lifecycle.assertCurrent();product.assertCurrent();
  assert.equal(product.changedProductRefs.length,55);
  assert.equal(product.resourceChanges.length,15);
  assert.equal(downstream.current_product_changed,55);
  assert.equal(downstream.current_resource_changed,15);
  const historicalReports={
   reviewer:['compatibility/rc/remaining-native-admission-tab-repair-source-controls.json','actual_reviewer_controls',36],
   admission:['compatibility/rc/remaining-native-admission-tab-repair-admission-controls.json','actual_reader_writer_controls',72],
   dispatch:['compatibility/rc/remaining-native-admission-tab-repair-dispatch-controls.json','actual_root_cli_cases',25],
   cyph:['compatibility/rc/remaining-native-admission-tab-repair-cyph-style.json','resources_checked',439],
  };
  const historicalNonLifecycle={stage:'first-repair-only',reviewer_source_sha256:'e8f6b630b140effe91788a35a61e3775f7a33fcadf8fdf2058c71ff2275821bb',reports:{}};
  for(const [name,[path,field,expected]] of Object.entries(historicalReports)){
   const bytes=read(path),report=JSON.parse(bytes);assert.equal(report[field],expected,'historical control count changed '+name);
   historicalNonLifecycle.reports[name]={path,sha256:hash(bytes),bytes:bytes.length,[field]:expected};
  }
  assert.equal(JSON.parse(read(historicalReports.reviewer[0])).reviewer_sha256,historicalNonLifecycle.reviewer_source_sha256);
  const ownerPaths=['scripts/current-native-tab-product-source.mjs','scripts/c03-t02-current-native-tab-product-source-packet-v1.json','scripts/c03-t02-current-native-tab-product-source-packet-v2.json','scripts/c03-t02-current-native-tab-product-source-packet-v3.json','scripts/c03-t02-current-native-tab-product-source-packet-v4.json'];
  const productOwnerRefs=ownerPaths.map(path=>{const bytes=read(path);return {path,sha256:hash(bytes),bytes:bytes.length};});
  const allRefs=[...lifecycle.bound,...product.bound,...productOwnerRefs,...product.successorEvidence,...product.inheritedOwnerSources,...product.currentOwnerSources,...product.peerDeclarations,...product.authorityInputs,...downstream.bound,...Object.values(historicalNonLifecycle.reports)];
  if(product.radioEvidence)allRefs.push(product.radioEvidence);
  if(product.formMotionEvidence)allRefs.push(product.formMotionEvidence);
  const sourceMap=new Map();
  for(const row of allRefs){
   assert.ok(row&&typeof row.path==='string'&&/^[0-9a-f]{64}$/.test(row.sha256),'invalid current source reference');
   const bytes=physical(row.path);assert.equal(hash(bytes),row.sha256,'changed current source '+row.path);
   if(row.bytes!==undefined)assert.equal(bytes.length,row.bytes,'changed current source length '+row.path);
   const prior=sourceMap.get(row.path),current={path:row.path,sha256:row.sha256,bytes:bytes.length};
   if(prior)assert.deepEqual(prior,current,'conflicting current source owners '+row.path);
   else sourceMap.set(row.path,current);
  }
  const sourceMembers=[...sourceMap.values()];
  assertLoadedImages();
  const finalPhysical=()=>{
   for(const row of sourceMembers){const bytes=physical(row.path);assert.equal(hash(bytes),row.sha256,'late physical current source '+row.path);assert.equal(bytes.length,row.bytes);}
  };
  lifecycle.assertCurrent();product.assertCurrent();downstream.assertCurrent();assertLoadedImages();
  assert.equal(currentInspectionNested,false,'reentrant current tab lifecycle inspection');
  finalPhysical();
  return {schema_version:3,line,source_parent:pins[line].parent,
   lifecycle_source_epochs:{first_repair:lifecycle.first_review,detector:lifecycle.detector_review,reverse:lifecycle.reverse_source},
   downstream_source_epochs:{changed:downstream.changed,old_bound:downstream.old_bound,current_product_changed:55,current_resource_changed:15},
   historical_lifecycle_controls:lifecycle.historical_lifecycle_controls,
   current_lifecycle_controls:lifecycle.current_lifecycle_controls,
   historical_non_lifecycle_controls:historicalNonLifecycle,
   current_non_lifecycle_controls:{stage:'current',source_sha256:lifecycle.current_public_import_source_sha256,reviewer_executed:false,admission_reader_writer_executed:false,dispatch_root_cli_executed:false,cyph_resource_sanity_executed:false},
   current_public_import_roles:lifecycle.current_public_import_roles,
   current_public_import_source_sha256:lifecycle.current_public_import_source_sha256,
   current_nine_source_members:lifecycle.current_nine_source_members,
   current_product_members:1143,historical_product_members:1141,resource_members:439,
   changed_product:product.changedProductRefs,changed_resources:product.resourceChanges,
   source_members:sourceMembers,
   scope:'Authenticated first repair, explicit later tab source epochs, finite current product/resource identity and 41 downstream source references and the separately bound typeahead receipt closure. Historical lifecycle reports remain historical. Current synthetic controls run separately; packed/native/floor qualification remains pending.',
   source_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
 }finally{currentInspectionActive=false;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(inspectTabLifecycleRepair(),null,2));

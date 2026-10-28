/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Real title classes and owned constructor on synthetic DOM; never native evidence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
const SOURCE=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PREFIX='compatibility/rc/21x-c04-dialog-title-replacement-';
const ARCHIVE=PREFIX+'originals.json.gz',ARCHIVE_HASH='8050f240fa4a48d260ef0a69ae9a7c46c3e9bea6cdac12ac44b4b314adc6709f';
const HASH=raw=>createHash('sha256').update(raw).digest('hex'),ref=(path,raw)=>({path,sha256:HASH(raw),bytes:raw.length});
const FOLDER='projects/ngx-material-legacy/legacy-dialog/';
const EXPECTED={
 'dialog-content-directives.ts':'07b539ec15bdf207e3db563651f2c0e4875bb63f44f90963c304ca0dcc6eac2a',
 'dialog-container.ts':'0495cc891e7e1578d05d9679fe61acf155c9bdb47b31032d53c324bc201616ac',
 'internal/dialog-container-base.ts':'fb30039e5c9ed9f906de8a734eeeb27c1e5f2a797ed3663225f6e405f737be04',
 'internal/dialog-container-state.ts':'cefcbfb0ad5bb9e695fcfac03afa66d59c2f89709d686b59ee3edd3005812141',
 'internal/dialog-initial-focus.ts':'994576f436b45a1d3d1f132db793a2b3668e581637f06279e2200065cea319a5',
 'dialog-container.html':'89aeb28616459a7393902fcbeca143e3ca101baeaafa59054aebc512a5022256',
 'dialog.scss':'c373a78c6c52713ab3673bc581817d39ac900b3ad03b1001a9032c339a1685bd',
};
export const TITLE_SHA='642d886ef117721a34c98055391c9055fde29607';
export function inspectDialogTitleReplacement({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const archiveRaw=readFileSync(join(SOURCE,ARCHIVE));assert.equal(HASH(archiveRaw),ARCHIVE_HASH);
 const original=JSON.parse(gunzipSync(archiveRaw));assert.deepEqual(original.reviews.map(row=>row.sha),[TITLE_SHA]);assert.equal(original.original_hunks,21);
 const tagged=new Map(original.tagged_reference.members.map(row=>[row.path,row]));
 assert.equal(tagged.size,18);assert.equal(original.tagged_reference.commit,'df60e733c60e572ba538f6ad0ceff3e63e527b53');
 for(const section of original.reviews[0].sections)assert.equal(section.after.body,tagged.get(section.path).body,'after is not exact16 '+section.path);
 const bound=new Map(),member=path=>{const raw=read(path);bound.set(path,ref(path,raw));return raw;};
 for(const [path,digest]of Object.entries(EXPECTED))assert.equal(HASH(member(FOLDER+path)),digest,'unreviewed dialog source change '+path);
 const fixturePath='tests/dialog_initial_focus_runtime_probe.mjs';assert.equal(HASH(member(fixturePath)),'5760c77e0b33f5b22ee00a350838247d3fcc2c0e0b58da425bb105434d890229');
 const manifest=JSON.parse(member('projects/ngx-material-legacy/package.json')),line=manifest.version.startsWith('21.')?'21.x':'main';
 const peers={};for(const name of ['core','cdk','material']){const p=JSON.parse(member('node_modules/@angular/'+name+'/package.json'));peers[name]=p.version;assert.equal(manifest.peerDependencies['@angular/'+name],'^'+p.version);}
 assert.deepEqual(peers,line==='21.x'?{core:'21.2.23',cdk:'21.2.14',material:'21.2.14'}:{core:'22.1.7',cdk:'22.1.7',material:'22.1.7'});
 member('node_modules/typescript/package.json');
 const assertCurrent=()=>{assert.equal(HASH(readFileSync(join(SOURCE,ARCHIVE))),ARCHIVE_HASH);for(const value of bound.values()){const raw=read(value.path);assert.equal(HASH(raw),value.sha256,'late dialog-title source change '+value.path);assert.equal(raw.length,value.bytes);}};
 assertCurrent();return {root,line,peers,original,tagged,bound:[...bound.values()],assertCurrent};
}
function syntax(ts,body,name){return ts.createSourceFile(name,body,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);}
function namedClass(ts,file,name){const node=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.ok(node,name);return node;}
function namedFunction(ts,file,name){const node=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(node,name);return node;}
function metadata(ts,file,node,decorator){
 const d=ts.getDecorators(node)?.find(n=>ts.isCallExpression(n.expression)&&n.expression.expression.getText(file)===decorator);assert.ok(d);
 const obj=d.expression.arguments[0];assert.ok(ts.isObjectLiteralExpression(obj));
 const value=node=>{assert.ok(ts.isStringLiteralLike(node));return node.text;};
 const result={};for(const p of obj.properties){if(!ts.isPropertyAssignment(p))continue;const name=p.name.getText(file).replace(/^['"]|['"]$/g,'');if(['selector','exportAs'].includes(name))result[name]=value(p.initializer);if(name==='host'){assert.ok(ts.isObjectLiteralExpression(p.initializer));result.host=Object.fromEntries(p.initializer.properties.map(n=>[value(n.name),value(n.initializer)]));}}
 return result;
}
/** Interpret only the two audited host-binding forms; this is not Angular rendering. */
export function dialogTitleHostReader(ts,expression){
 const file=syntax(ts,'const value = '+expression+';','dialog-host.ts'),expr=file.statements[0].declarationList.declarations[0].initializer;
 assert.ok(ts.isConditionalExpression(expr));assert.equal(expr.condition.getText(file),'_config.ariaLabel');assert.equal(expr.whenTrue.kind,ts.SyntaxKind.NullKeyword);
 let field,index=null;
 if(ts.isIdentifier(expr.whenFalse)){field=expr.whenFalse.text;assert.equal(field,'_ariaLabelledBy');}
 else {assert.ok(ts.isElementAccessExpression(expr.whenFalse));field=expr.whenFalse.expression.getText(file);assert.equal(field,'_ariaLabelledByQueue');assert.ok(ts.isNumericLiteral(expr.whenFalse.argumentExpression));index=Number(expr.whenFalse.argumentExpression.text);}
 return container=>{const value=container._config.ariaLabel?null:index===null?container[field]:container[field][index];return value==null?null:value;};
}
async function runtime({root,scope}){
 const require=createRequire(join(root,'package.json')),ts=require('typescript'),url=name=>pathToFileURL(require.resolve(name)).href;
 const core=await import(url('@angular/core'));
 const fixtureModule=await import(pathToFileURL(join(root,'tests/dialog_initial_focus_runtime_probe.mjs')));
 function emit(raw){return ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText.replace(/(['"])(@angular\/[^'"]+|rxjs(?:\/operators)?)\1/g,(_,quote,name)=>JSON.stringify(url(name)));}
 const stateUrl='data:text/javascript;base64,'+Buffer.from(emit(readFileSync(join(root,FOLDER+'internal/dialog-container-state.ts'),'utf8'))).toString('base64');
 const state=await import(stateUrl),fixtureState=await fixtureModule.load(undefined,undefined,false,true);
 assert.equal(state.addLegacyDialogTitle,fixtureState.addLegacyDialogTitle,'helper namespace differs from the real owned constructor');
 async function titleFactory(body){
  const file=syntax(ts,body,'dialog-content-directives.ts'),node=namedClass(ts,file,'MatLegacyDialogTitle'),closest=namedFunction(ts,file,'getClosestDialog');
  const counter=file.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(file)==='dialogElementUid'));assert.ok(counter);
  const selected=node.getText(file).replace('export class MatLegacyDialogTitle','class MatLegacyDialogTitle');assert.notEqual(selected,node.getText(file));
  const program=`import {Directive,Input,Optional} from '@angular/core';\nimport {addLegacyDialogTitle,removeLegacyDialogTitle} from '__owned_dialog_state__';\nexport function createTitleClass() { ${counter.getText(file)}\n${selected}\n${closest.getText(file)}\nreturn MatLegacyDialogTitle; }`;
  const transported=program.replace("'__owned_dialog_state__'",JSON.stringify(stateUrl));
  const module=await import('data:text/javascript;base64,'+Buffer.from(emit(transported)).toString('base64'));
  return {create:module.createTitleClass,source_sha256:HASH(body),selected_program_sha256:HASH(program),metadata:metadata(ts,file,node,'Directive')};
 }
 async function taggedContainerFactory(body){
  const file=syntax(ts,body,'dialog-container.ts'),node=namedClass(ts,file,'CdkDialogContainer');
  const field=node.members.find(n=>ts.isPropertyDeclaration(n)&&['_ariaLabelledByQueue','_ariaLabelledBy'].includes(n.name.getText(file))),ctor=node.members.find(ts.isConstructorDeclaration);assert.ok(field&&ctor);
  // Execute the complete original constructor and label field, not copied label logic.
  // Portal/focus methods are outside this fixture; the owned variant uses the full real base.
  const program=`import {Optional,Inject,DOCUMENT} from '@angular/core';\nimport {DialogConfig} from '@angular/cdk/dialog';\nimport {BasePortalOutlet} from '@angular/cdk/portal';\nexport class OriginalLabelConstructor extends BasePortalOutlet { ${field.getText(file)}\n${ctor.getText(file)} }`;
  const {OriginalLabelConstructor}=await import('data:text/javascript;base64,'+Buffer.from(emit(program)).toString('base64'));
  return {create:config=>({instance:new OriginalLabelConstructor(null,null,null,config,null,null,null),marks:()=>0,destroy(){}}),source_sha256:HASH(body),selected_program_sha256:HASH(program)};
 }
 return {ts,core,fixtureModule,titleFactory,taggedContainerFactory,state};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
export async function observeDialogTitleVariant({root=process.cwd(),scope=inspectDialogTitleReplacement({root}),variant='owned',overrides={}}={}){
 const api=await runtime({root,scope}),{ts,core}=api,original=scope.original.reviews[0],section=path=>original.sections.find(s=>s.path===path);
 const titlePath='src/material/legacy-dialog/dialog-content-directives.ts',containerPath='src/material/legacy-dialog/dialog-container.ts',cdkPath='src/cdk/dialog/dialog-container.ts';
 const titleBody=overrides.title??(variant==='owned'?readFileSync(join(root,FOLDER+'dialog-content-directives.ts'),'utf8'):variant==='tagged16'?scope.tagged.get(titlePath).body:section(titlePath)[variant].body);
 const hostBody=overrides.host??(variant==='owned'?readFileSync(join(root,FOLDER+'dialog-container.ts'),'utf8'):variant==='tagged16'?scope.tagged.get(containerPath).body:section(containerPath)[variant].body);
 const title=await api.titleFactory(titleBody),hostFile=syntax(ts,hostBody,containerPath),hostClass=namedClass(ts,hostFile,'MatLegacyDialogContainer');
 const host=metadata(ts,hostFile,hostClass,'Component'),readLabel=dialogTitleHostReader(ts,host.host['[attr.aria-labelledby]']);
 let ctor,create;
 if(variant==='owned'){
  const Base=await api.fixtureModule.load(overrides.base);create=config=>{const f=api.fixtureModule.fixture(Base,false,true,{config});let marks=0,released=false;f.injector.get(core.ChangeDetectorRef).markForCheck=()=>marks++;return {...f,marks:()=>marks,destroy(){if(!released){released=true;f.destroy();}}};};
 }else {const body=variant==='tagged16'?scope.tagged.get(cdkPath).body:section(cdkPath)[variant].body;ctor=await api.taggedContainerFactory(body);create=ctor.create;}
 const cases=[];
 async function check(id,callback,config={}){
  const f=create(config),Title=title.create(),reference={id:'dialog-owner',_containerInstance:f.instance},names=[];
  const record=()=>{const value=readLabel(f.instance);names.push(value);return value;};
  const make=(id,{fallback=false,missing=false,container=undefined}={})=>{const owner={id:'dialog-owner',parentElement:null,classList:{contains:n=>n==='mat-dialog-container'}};const mid={parentElement:owner,classList:{contains:()=>false}};const ref=container===undefined?reference:{...reference,_containerInstance:container};const t=new Title(fallback?null:ref,new core.ElementRef({parentElement:mid}),{openDialogs:missing?[]:[ref]});if(id!==undefined)t.id=id;return t;};
  const remove=t=>t.ngOnDestroy?.();let failure=null;
  try{await callback({f,make,remove,record,Title});}catch(error){failure=String(error.message).slice(0,600);}finally{f.destroy();await flush();}
  cases.push({id,result:failure?'fail':'pass',names,marks:f.marks(),...(failure?{failure}:{})});
 }
 await check('initial-no-title',async({record})=>assert.equal(record(),null));
 await check('deferred-first-title',async({make,record})=>{make('first').ngOnInit();assert.equal(record(),null);await flush();assert.equal(record(),'first');});
 await check('swapped-title',async({make,remove,record})=>{const first=make('first');first.ngOnInit();await flush();assert.equal(record(),'first');remove(first);make('second').ngOnInit();await flush();assert.equal(record(),'second');});
 await check('multiple-titles-remove-first-and-third',async({make,remove,record})=>{const titles=['first','second','third'].map(id=>make(id));titles.forEach(t=>t.ngOnInit());await flush();assert.equal(record(),'first');remove(titles[0]);remove(titles[2]);await flush();assert.equal(record(),'second');});
 await check('remove-only-title',async({make,remove,record})=>{const t=make('first');t.ngOnInit();await flush();assert.equal(record(),'first');remove(t);await flush();assert.equal(record(),null);});
 await check('configured-label-priority',async({make,remove,record})=>{const t=make('first');t.ngOnInit();await flush();assert.equal(record(),'configured');remove(t);await flush();assert.equal(record(),'configured');},{ariaLabelledBy:'configured'});
 await check('explicit-label-suppresses-labelledby',async({make,remove,record})=>{const t=make('first');t.ngOnInit();await flush();assert.equal(record(),null);remove(t);await flush();assert.equal(record(),null);},{ariaLabel:'Explicit',ariaLabelledBy:'configured'});
 await check('duplicate-id-removes-one-registration',async({make,remove,record})=>{const a=make('same'),b=make('same');a.ngOnInit();b.ngOnInit();await flush();assert.equal(record(),'same');remove(a);await flush();assert.equal(record(),'same');remove(b);await flush();assert.equal(record(),null);});
 await check('unknown-removal-preserves-existing-title',async({make,remove,record})=>{make('first').ngOnInit();await flush();remove(make('missing'));await flush();assert.equal(record(),'first');});
 await check('init-and-destroy-before-microtask-drain',async({make,remove,record})=>{const t=make('first');t.ngOnInit();remove(t);await flush();assert.equal(record(),null);});
 await check('destruction-retains-captured-queue-reference',async({f,make,remove,record})=>{const t=make('first');t.ngOnInit();await flush();const original=f.instance._ariaLabelledByQueue;remove(t);f.instance._ariaLabelledByQueue=['first','new'];await flush();assert.deepEqual(original,[]);assert.deepEqual(f.instance._ariaLabelledByQueue,['first','new']);assert.equal(record(),'first');});
 await check('historical-generated-id-namespace',async({make})=>{const a=make(),b=make();assert.equal(a.id,'mat-dialog-title-0');assert.equal(b.id,'mat-dialog-title-1');});
 await check('template-dialog-fallback-through-nested-parent',async({make,record})=>{make('template',{fallback:true}).ngOnInit();await flush();assert.equal(record(),'template');});
 await check('missing-dialog-fallback-is-safe',async({make,remove,record})=>{const t=make('missing',{fallback:true,missing:true});t.ngOnInit();remove(t);await flush();assert.equal(record(),null);});
 await check('mock-without-container-queue-is-safe',async({make,remove})=>{const t=make('mock',{container:{}});t.ngOnInit();remove(t);await flush();});
 if(variant==='owned'){
  await check('onpush-queue-mutations-mark-three-times',async({f,make,remove,record})=>{const a=make('first'),b=make('second');a.ngOnInit();b.ngOnInit();await flush();remove(make('missing'));remove(a);await flush();assert.equal(record(),'second');assert.equal(f.marks(),3);});
  await check('container-destroyed-before-deferred-add',async({f,make,record})=>{make('late').ngOnInit();f.destroy();await flush();assert.equal(record(),'configured');assert.equal(f.marks(),0);},{ariaLabelledBy:'configured'});
  await check('container-destroyed-before-deferred-remove',async({f,make,remove,record})=>{const t=make('first');t.ngOnInit();await flush();const marks=f.marks();remove(t);f.destroy();await flush();assert.equal(record(),'first');assert.equal(f.marks(),marks);});
 }
 return {variant,title_source_sha256:title.source_sha256,title_program_sha256:title.selected_program_sha256,title_metadata:title.metadata,
  original_constructor_observation:ctor?{source_sha256:ctor.source_sha256,program_sha256:ctor.selected_program_sha256,scope:'Complete original label field and constructor only; portal/focus methods not executed'}:null,
  actual_owned_full_constructor:variant==='owned',actual_owned_helper_namespace_matches_constructor:true,host_expression:host.host['[attr.aria-labelledby]'],
  cases,passed:cases.filter(r=>r.result==='pass').length,failed:cases.filter(r=>r.result==='fail').map(r=>r.id),
  synthetic_host_binding_interpreter:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false};
}
export async function measureDialogTitleReplacement({root=process.cwd()}={}){
 const scope=inspectDialogTitleReplacement({root}),observations=[];
 for(const variant of ['before','after','tagged16','owned'])observations.push(await observeDialogTitleVariant({root,scope,variant}));
 const before=observations[0],after=observations[1],tagged=observations[2],owned=observations[3];
 assert.deepEqual(before.failed,['swapped-title','multiple-titles-remove-first-and-third','remove-only-title','duplicate-id-removes-one-registration','init-and-destroy-before-microtask-drain','destruction-retains-captured-queue-reference']);
 assert.deepEqual(after.failed,[]);assert.deepEqual(tagged.failed,[]);assert.deepEqual(owned.failed,[]);
 assert.equal(after.cases.length,15);assert.equal(owned.cases.length,18);
 const common=value=>value.cases.slice(0,15).map(({id,result,names})=>({id,result,names}));assert.deepEqual(common(after),common(tagged));assert.deepEqual(common(tagged),common(owned));
 assert.deepEqual(owned.title_metadata,tagged.title_metadata);
 scope.assertCurrent();return {schema_version:1,line:scope.line,result:'pass',role:'Complete original review plus real title/owned-constructor execution on synthetic DOM; not native/packed/AOT qualification',peers:scope.peers,typescript:JSON.parse(readFileSync(join(root,'node_modules/typescript/package.json'))).version,originals:{path:ARCHIVE,sha256:ARCHIVE_HASH},all_nine_original_after_images_exact_tagged16:true,observations,tagged_after_and_owned_common_label_sequences_equal:true,original_before_regression_failures:6,owned_only_onpush_and_destroyed_owner_cases:3,input_members:scope.bound,producer:ref('scripts/dialog-title-replacement-contract.mjs',readFileSync(fileURLToPath(import.meta.url))),synthetic_host_binding_interpreter:true,actual_native_artifact_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed',g13_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await measureDialogTitleReplacement({root:process.argv[3]??process.cwd()});writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:result.line,result:result.result,cases:result.observations.map(row=>({variant:row.variant,passed:row.passed,failed:row.failed}))}));
}

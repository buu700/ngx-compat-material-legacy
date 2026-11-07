/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Authenticated tab lifecycle source epochs. This is source proof, not native admission. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,parse,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
import {reviewTabLifecycleDelta} from './remaining-native-tab-lifecycle-review.mjs';
import {tabsFiniteSourceSuccessor} from './tabs-finite-source-successor.mjs';

const tsRequire=createRequire(import.meta.url),ts=tsRequire('typescript');
const loadedTypescriptPath=realpathSync(tsRequire.resolve('typescript')),loadedTypescriptImage=readFileSync(loadedTypescriptPath);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bufferEquals=Buffer.prototype.equals,apply=Reflect.apply;
const bytesEqual=(a,b)=>Buffer.isBuffer(b)&&apply(bufferEquals,a,[b]);
const self='scripts/current-native-tab-lifecycle-source.mjs',loadedImage=readFileSync(fileURLToPath(import.meta.url));
const tab='projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts';
const template='projects/ngx-material-legacy/legacy-tabs/tab-body.html';
const reviewer='scripts/remaining-native-tab-lifecycle-review.mjs';
const firstReviewerFunction='3fe2038fa65b5b6b663d3067a92d52288eeb35de86f73202ce2402966a134fed';
const priorPath='compatibility/rc/remaining-native-admission-tab-lifecycle-repair-prior.json.gz';
const historicalInputs='compatibility/rc/remaining-native-admission-tab-repair-source-inputs.json';
const first='fd212e1d7b7a48854544391b1963ef44b74b6385';
const second='26f81e67732c005bf792b7361afee4e4d538f036';
const stages=Object.freeze({
 '21.x':{prior:'a15203c1865926d53ba5f1ca6d6a1e4fbae1f9a9cc1dbb0e158a8827afdcad35',parent:'9d7f09cc55d85979272f0e42aaad564ad3ec1fd6',historical_inputs:'75bbfe68fcdc37978ea257e2c4c5a3370002c7e4bef6691281ceb28cf49e477f'},
 main:{prior:'13b9222a165a1bb9a875e523c9cd24ef0f19960d4890060bc5a05833cab0bbeb',parent:'960d98d87aeac3a24b312cf9112abc6d6383a7fd',historical_inputs:'92a1e6c683bf36815471b90674b949f8972f1fbdc7c1d736c60ec79de7d1ce0e'},
});
const hashes=Object.freeze({prior:'7a84291a13db6e907e84b42a581f993d81e6da1f28966696861d0b325e6def14',first:'9133c2404db7ef40b39819969e310a71caf660c9d9c05ecfd16a8a4fe6ea0154',second:'dd9a83822ad9e0c70b282da47f727696bace3699877797f5e7342406435ea615',current:'15d4c2d2daa1aafce8f6b263f9e2423742c3221af56954c829eea1ed693ea926'});
const currentNine=Object.freeze([
 [tab,hashes.current],
 [template,'c4d86c99bfeed0a10d6451e034ade808bfb52b4240471e1aef5ccd47e3f124f1'],
 ['scripts/native-motion-consumer.ts','0fc93c9a430012883c2a00e7b68dad359ed826d71fb091b344035263fd62deb5'],
 ['scripts/upstream-tab-completion-evidence.mjs','ea9c28d684464e0f751e4bd08a203a771b307d864d9d983371532a3c918eadf0'],
 ['tests/tab_body_motion_runtime_probe.mjs','55579e0c1f0791c738552f570493e401eca2335eb0124dfa0cebe7e14eedf32a'],
 ['tests/tab_completion_producer_probe.mjs','eb65f5c769c561f9ae61a755dcb7cdbd8c2e3e56d2d04ad8b7ee9bda8030814d'],
 ['tests/tab_completion_sample.mjs','97755768dfb329e7bacfc9ddf4e4fe4e6ea364c1949c7b08fb96ad6d4df85ff0'],
 ['tests/upstream/tab-completion-admission.mjs','c6224e3fabf0c5305c6fe7a51d5f8d893ac4b3f209f4c5bb833d0bf2cac47d49'],
 ['tests/upstream/remaining-native-dispatch.mjs','93e02f831c42ec6dcd985a9d6cf594f758da17df217432880cc5b07fe70d548b'],
]);
function git(root,commit,path){
 assert.match(commit,/^[0-9a-f]{40}$/);
 const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
 for(const key of Object.keys(env))if(key.startsWith('GIT_')&&!['GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_TERMINAL_PROMPT'].includes(key))delete env[key];
 return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,env,maxBuffer:2*1024*1024});
}
function replaceOnce(source,before,after){
 assert.equal(source.split(before).length,2,'ambiguous ChangeDetectorRef edit');
 return source.replace(before,after);
}
function importedRoles(source){
 const file=ts.createSourceFile(tab,source,ts.ScriptTarget.Latest,true);
 assert.equal(file.parseDiagnostics.length,0);
 const host={getSourceFile:name=>name===tab?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>'',getDirectories:()=>[],fileExists:name=>name===tab,readFile:name=>name===tab?file.text:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
 const checker=ts.createProgram([tab],{noResolve:true,noLib:true},host).getTypeChecker();
 return file.statements.filter(ts.isImportDeclaration).flatMap(node=>(node.importClause?.namedBindings?.elements||[]).map(item=>{
  const binding=checker.getSymbolAtLocation(item.name);assert.ok(binding);
  const references=[];const visit=other=>{if(ts.isIdentifier(other)&&other!==item.name&&checker.getSymbolAtLocation(other)===binding)references.push({kind:ts.SyntaxKind[other.parent.kind],text:other.parent.getText(file)});ts.forEachChild(other,visit);};visit(file);
  return {module:node.moduleSpecifier.text,symbol:(item.propertyName||item.name).text,local:item.name.text,type_only:!!(node.importClause.isTypeOnly||item.isTypeOnly),references};
 }));
}
/** The middle commit adds exactly one retained detector field, assignment and completion mark. */
export function reviewDetectorEpoch(firstText,secondText){
 assert.equal(hash(firstText),hashes.first);assert.equal(hash(secondText),hashes.second);
 const additions=[
  ['  private readonly _ngZone = tabBodyNgZone();\n','  private readonly _ngZone = tabBodyNgZone();\n  private readonly _changeDetectorRef: ChangeDetectorRef;\n'],
  ['  ) {\n    if (_dir) {','  ) {\n    this._changeDetectorRef = changeDetectorRef;\n    if (_dir) {'],
  ["    this._elementRef.nativeElement.classList.remove('mat-tab-body-animating');\n    this._translateTabComplete.next(transition);","    this._elementRef.nativeElement.classList.remove('mat-tab-body-animating');\n    this._changeDetectorRef.markForCheck();\n    this._translateTabComplete.next(transition);"],
 ];
 let derived=firstText;for(const [before,after] of additions)derived=replaceOnce(derived,before,after);
 assert.equal(derived,secondText,'unreviewed ChangeDetectorRef stage delta');
 const beforeRoles=importedRoles(firstText),afterRoles=importedRoles(secondText);
 const expected=structuredClone(beforeRoles),detector=expected.find(row=>row.module==='@angular/core'&&row.symbol==='ChangeDetectorRef');assert.ok(detector);
 assert.deepEqual(detector.references.map(row=>row.text),['ChangeDetectorRef']);
 detector.references.push({kind:'TypeReference',text:'ChangeDetectorRef'});
 assert.deepEqual(afterRoles,expected,'unreviewed detector import binding/role delta');
 return {before_sha256:hashes.first,after_sha256:hashes.second,reviewed_edits:additions.length,public_import_roles:afterRoles.length,detector_reference_added:true,constructor_parameters_unchanged:true,completion_mark_after_class_cleanup:true};
}
export function reviewCurrentNativeTabLifecycle({root,line,read}={}){
 assert.ok(root&&stages[line]);assert.equal(typeof read,'function');
 const physical=path=>{
  const absolute=resolve(root),base=parse(absolute).root;
  let cursor=base;assert.ok(lstatSync(cursor).isDirectory(),'invalid tab root');
  for(const part of absolute.slice(base.length).split(sep).filter(Boolean)){
   cursor=join(cursor,part);const stat=lstatSync(cursor);
   assert.ok(stat.isDirectory()&&!stat.isSymbolicLink(),'linked tab root ancestor');
  }
  return readEvidenceMember(root,path);
 };
 const checkTypescript=()=>{const rootRequire=createRequire(join(resolve(root),'package.json'));assert.equal(realpathSync(rootRequire.resolve('typescript')),loadedTypescriptPath,'shadow TypeScript peer');assert.ok(bytesEqual(readFileSync(loadedTypescriptPath),loadedTypescriptImage),'changed loaded TypeScript image');};
 checkTypescript();
 const same=(path)=>{const current=physical(path),supplied=read(path);assert.ok(bytesEqual(current,supplied),'nonphysical tab source '+path);assert.ok(bytesEqual(current,physical(path)),'tab source changed during callback '+path);return current;};
 assert.ok(bytesEqual(same(self),loadedImage),'changed loaded native-tab lifecycle source');
 const reviewerText=same(reviewer).toString();const reviewerFile=ts.createSourceFile(reviewer,reviewerText,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const firstFunction=reviewerFile.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='reviewTabLifecycleDelta');
 assert.ok(firstFunction);assert.equal(hash(firstFunction.getText(reviewerFile)),firstReviewerFunction,'historical first-stage reviewer changed');
 const pin=stages[line],archive=same(priorPath);assert.equal(hash(archive),pin.prior);
 const prior=JSON.parse(gunzipSync(archive));assert.equal(prior.line,line);assert.equal(prior.source_parent,pin.parent);
 const inputBytes=same(historicalInputs);assert.equal(hash(inputBytes),pin.historical_inputs);
 const historical=JSON.parse(inputBytes);assert.equal(historical.line,line);
 assert.equal(historical.implementation_evidence.length,6);
 const historicalRefs=historical.implementation_evidence.map(ref=>{assert.equal(hash(same(ref.path)),ref.sha256,'historical report changed '+ref.path);return ref;});
 const lifecycleReport=JSON.parse(same('compatibility/rc/remaining-native-admission-tab-repair-lifecycle-controls.json'));
 assert.equal(lifecycleReport.source_sha256,hashes.first);assert.equal(lifecycleReport.passed,47);assert.equal(lifecycleReport.failed,0);
 assert.equal(lifecycleReport.cases.length,47);assert.equal(lifecycleReport.mutants.length,22);
 assert.ok(lifecycleReport.cases.every(row=>row.result==='pass'));
 assert.ok(lifecycleReport.mutants.every(row=>row.result==='rejected'&&row.failed_case_ids.length));
 assert.equal(lifecycleReport.native_browser_execution,false);assert.equal(lifecycleReport.packed_execution,false);
 const before=new Map(prior.members.map(row=>{assert.equal(hash(row.text),row.sha256);return [row.path,row.text];}));assert.equal(before.size,9);assert.equal(hash(before.get(tab)),hashes.prior);
 assert.equal(hash(git(root,pin.parent,tab)),hashes.prior);
 assert.equal(git(root,pin.parent,template).toString(),before.get(template),'frozen tab template differs from authenticated parent');
 const firstText=git(root,first,tab).toString(),firstTemplate=git(root,first,template).toString();
 assert.equal(hash(firstText),hashes.first);
 const firstReview=reviewTabLifecycleDelta(before.get(tab),firstText,before.get(template),firstTemplate);
 assert.equal(firstReview.imports_constructor_metadata_outputs_and_original_member_signatures_unchanged,true);
 const secondText=git(root,second,tab).toString();
 const detectorReview=reviewDetectorEpoch(firstText,secondText);
 assert.equal(git(root,second,template).toString(),firstTemplate);
 const tabFinite=tabsFiniteSourceSuccessor({root,read,line});tabFinite.assertCurrent();
 const currentText=same(tab).toString(),currentTemplate=same(template).toString();
 assert.equal(hash(currentText),hashes.current);assert.equal(currentTemplate,firstTemplate);
 for(const [path,expected] of currentNine)assert.equal(hash(same(path)),expected,'changed current nine-source binding '+path);
 const selected=tabFinite.qualify({path:tab,sha256:hashes.second});assert.equal(selected.sha256,hashes.current);
 const secondRoles=importedRoles(secondText),currentRoles=importedRoles(currentText);
 assert.deepEqual(currentRoles,secondRoles,'current reverse stage altered public import roles');
 // The finite successor authenticates every exact reverse-stage edit and both tab source members.
 const bound=[...currentNine.map(([path,sha256])=>({path,sha256})),{path:self,sha256:hash(loadedImage)},{path:reviewer,sha256:hash(reviewerText)},
  {path:priorPath,sha256:pin.prior},{path:historicalInputs,sha256:pin.historical_inputs},...historicalRefs,...tabFinite.bound];
 let active=false,nested=false;const assertCurrent=()=>{if(active){nested=true;assert.fail('reentrant native-tab lifecycle source review');}active=true;nested=false;try{checkTypescript();tabFinite.assertCurrent();assert.ok(bytesEqual(physical(self),loadedImage),'changed loaded native-tab lifecycle source');for(const ref of bound){const bytes=same(ref.path);assert.equal(nested,false,'nested native-tab review attempted');assert.equal(hash(bytes),ref.sha256,'changed current tab source '+ref.path);}tabFinite.assertCurrent();assert.equal(nested,false,'nested native-tab review attempted');for(const ref of bound){const bytes=physical(ref.path);assert.equal(hash(bytes),ref.sha256,'late physical native-tab source '+ref.path);}assert.ok(bytesEqual(physical(self),loadedImage),'late loaded native-tab lifecycle source change');checkTypescript();}finally{active=false;}};
 assertCurrent();
 return {line,first_review:firstReview,detector_review:detectorReview,reverse_source:{before_sha256:hashes.second,current_sha256:hashes.current,tabs_finite_bound:tabFinite.bound},bound,assertCurrent,
  current_public_import_roles:currentRoles,current_public_import_source_sha256:hash(currentText),
  current_nine_source_members:currentNine.map(([path,sha256])=>({path,sha256})),non_product_source_judgment_owner:'T03 downstream source inputs',
  historical_lifecycle_controls:{source_sha256:hashes.first,stage:'first-repair-only'},current_lifecycle_controls:{source_sha256:hashes.current,stage:'current',executed:false},
  source_only:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
}

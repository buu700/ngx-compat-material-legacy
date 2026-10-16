/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete original fixture migrations; no compiler/default/render/lifetime equivalence claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from './authenticated-single-spec-review.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
const ts=createRequire(import.meta.url)('typescript'),rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=value=>createHash('sha256').update(value).digest('hex');
export const WIDE_SHAS=['4718718e3f66e0de2341c9f46bae59be1470b971','209176990ce1d70e904a3169460d18f081e26b76'];
const diffPins=['9da15660f514e093c5c72c0e5afac05c3900c1ed91432f7e4132f0b6a1d342ef','f6e83309cae1f6214c26b2834f39726066676bce9f542a90ea30cf2c0bbf6aac'];
const filePins=['18a045c4c3d6e0dca230f905064cdd4e70461c17751ff3c2a1a866cff27fe576','ec44094f2c28ec0f68c5aa40485fd031060933bb96af064a8e1b69594a0da7eb'];
const capsulePins={main:['9f410ef6bc9a5f8ca57807f005c23e5affc56656a9722459ecf0a02de688f0a8','2b86157c3f075e7d24072124ba578880ccab2e33345b7764c49b85b8e85bd3b1'],
  '21.x':['d30ee5178c58491a79e61978870fabf375ab6bcd0e3ab97dcba7c84e13dd7038','7f5483254461edae793199cd91fbe3eac8f655932298cc8e54aaea1ee55d7454']};
const retainedCompilerCase='4b090852eb87a999d521969a9e956f815176944683c8f7abe50359fbec478b82';
const retainedAsyncPairs=[
 ['eebb1077f5056cc2e294db1dccbf1bfda84891e5997d6fa8335186dd988fd423','0c38b09a53000022040ae9a9a9681994253dd128129bd4a4523fb08bee4d125c'],
 ['fe522fc0b2cadcd8dc1fefa9b9000544f4a911d174b8bc2bd0cfc9fcc95606fc','0cd918a7c150520fd432178060094656fa1fcc60780e107dba181f5391beecc7'],
 ['6639829a4f08a29bf76777b0275fe62de4e408b8bda483eb96cbd9d0875a53e1','52ecd2687b84394fd9331845bce5d81cc0ffac15bd8c0b99e2b6f08efa47abc9'],
 ['8ee340c2b78f705a58b17e9c9f69e87b368860155e0525c06c639e4931e45827','bdf9b411b6d1411fb7957442087efc4159c56d3a2d69e0c56dee5d88157aecad']];
const caseModes=['it','fit','xit'],hookModes=['beforeEach','afterEach','beforeAll','afterAll'];
const parse=text=>{const file=ts.createSourceFile('original.spec.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
function collect(node,predicate){const rows=[];function visit(n){if(predicate(n))rows.push(n);ts.forEachChild(n,visit);}visit(node);return rows;}
function semantic(node){const children=[];ts.forEachChild(node,n=>{children.push(semantic(n));});return [node.kind,
 ts.isVariableDeclarationList(node)?node.flags&(ts.NodeFlags.Const|ts.NodeFlags.Let|ts.NodeFlags.Using|ts.NodeFlags.AwaitUsing):null,
 ts.isIdentifier(node)?node.text:ts.isLiteralExpression(node)?node.text:null,children];}
const fp=node=>hash(JSON.stringify(semantic(node))),name=(node,file)=>ts.isCallExpression(node)?node.expression.getText(file):'';
const canonical=value=>JSON.stringify(value,function(key,item){return item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])):item;});
function bindings(file,module){const found=new Map();for(const node of file.statements){
 if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier)||node.moduleSpecifier.text!==module||!node.importClause?.namedBindings||!ts.isNamedImports(node.importClause.namedBindings))continue;
 for(const item of node.importClause.namedBindings.elements)found.set(item.name.text,(item.propertyName||item.name).text);
}return found;}
function scopes(node,file){const rows=[];for(let p=node.parent;p;p=p.parent){
 if(ts.isCallExpression(p)&&['describe','fdescribe','xdescribe'].includes(name(p,file)))rows.unshift({kind:name(p,file),label:p.arguments[0].getText(file)});
 if(ts.isFunctionDeclaration(p)||ts.isMethodDeclaration(p))rows.unshift({kind:'function',name:p.name?.getText(file)||null});
 if(ts.isForStatement(p)||ts.isForOfStatement(p)||ts.isForInStatement(p))rows.unshift({kind:ts.SyntaxKind[p.kind],header:p.getText(file).slice(0,p.statement.getStart(file)-p.getStart(file))});
}return rows;}
export function wideRegistrations(member,side){const file=parse(member[side].text),occurrences=new Map();
 return collect(file,n=>ts.isCallExpression(n)&&[...caseModes,...hookModes].includes(name(n,file))).map(call=>{
  const mode=name(call,file),isCase=caseModes.includes(mode),scope=scopes(call,file),label=isCase?call.arguments[0].getText(file):null;
  const base=JSON.stringify([member.path,mode,scope,label]),occurrence=occurrences.get(base)||0;occurrences.set(base,occurrence+1);
  const callback=call.arguments[isCase?1:0];assert.ok(callback);
  return {path:member.path,key:base+'#'+occurrence,mode,scope,label,raw_sha256:hash(call.getText(file)),callback_sha256:fp(callback),
   callback_raw_sha256:hash(callback.getText(file)),predicate_expressions:collect(callback,n=>ts.isExpressionStatement(n)&&n.expression.getText(file).startsWith('expect(')).map(n=>fp(n.expression))};
 });}
function compilerOwner(node,file){for(let p=node.parent;p;p=p.parent)if(ts.isCallExpression(p)&&caseModes.includes(name(p,file)))return hash(p.getText(file));return null;}
/** Whole-program projection is finite and records every removed operation. It does not admit its scheduling. */
export function projectWideProgram(member,index){assert.ok(index===0||index===1);const file=parse(member.before.text),core=bindings(file,'@angular/core'),testing=bindings(file,'@angular/core/testing');
 const operations=[],retentions=[],associated=new Set();
 const compile=node=>ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='compileComponents';
 const calls=collect(file,compile);
 const retained=node=>member.path==='src/cdk/overlay/overlay.spec.ts'&&compilerOwner(node,file)===retainedCompilerCase;
 for(const call of calls)if(!retained(call))for(let p=call.parent;p;p=p.parent)if(ts.isFunctionLike(p)){associated.add(p);break;}
 const record=(node,kind,extra={})=>operations.push({kind,source_sha256:hash(node.getText(file)),source_text:node.getText(file),
  before_start_line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,before_end_line:file.getLineAndCharacterOfPosition(node.end).line+1,scope:scopes(node,file),...extra});
 const receiver=call=>{assert.equal(call.arguments.length,0);assert.ok(!call.typeArguments?.length&&!call.questionDotToken);
  const value=call.expression.expression;
  if(ts.isIdentifier(value)){assert.equal(testing.get(value.text),'TestBed');return 'bare';}
  assert.ok(ts.isCallExpression(value)&&ts.isPropertyAccessExpression(value.expression)&&value.expression.name.text==='configureTestingModule',member.path+': '+value.getText(file));
  let base=value.expression.expression;
  if(ts.isCallExpression(base)&&ts.isPropertyAccessExpression(base.expression)&&base.expression.name.text==='overrideProvider'){
   assert.equal(base.arguments.length,2);base=base.expression.expression;
  }
  if(ts.isCallExpression(base)){
   assert.ok(ts.isPropertyAccessExpression(base.expression)&&base.expression.name.text==='resetTestingModule');assert.equal(base.arguments.length,0);
   base=base.expression.expression;
  }
  assert.ok(ts.isIdentifier(base));assert.equal(testing.get(base.text),'TestBed');assert.equal(value.arguments.length,1);return 'chain';};
 const transformed=ts.transform(file,[context=>{const visit=node=>{
  if(index===0){
   if(compile(node)&&retained(node)){assert.equal(receiver(node),'bare');retentions.push({kind:'compiler-availability-assertion',path:member.path,case_sha256:retainedCompilerCase});return node;}
   if(ts.isExpressionStatement(node)&&compile(node.expression)&&receiver(node.expression)==='bare'&&!retained(node.expression)){
    record(node,'bare-compiler-statement-removed');return undefined;
   }
   if(ts.isAwaitExpression(node)&&compile(node.expression)&&!retained(node.expression)){
    assert.equal(receiver(node.expression),'chain');record(node,'awaited-compiler-chain-removed');return ts.visitNode(node.expression.expression.expression,visit);
   }
   if(compile(node)&&!retained(node)){
    assert.equal(receiver(node),'chain');record(node,'compiler-chain-removed');return ts.visitNode(node.expression.expression,visit);
   }
   if(ts.isArrowFunction(node)&&node.modifiers?.some(n=>n.kind===ts.SyntaxKind.AsyncKeyword)&&associated.has(node)&&ts.isCallExpression(node.parent)&&name(node.parent,file)==='beforeEach'){
    const retainedPair=retainedAsyncPairs.find(n=>n[0]===hash(node.getText(file)));
    if(retainedPair){assert.equal(member.path,'src/material/list/testing/list-harness.spec.ts');retentions.push({kind:'async-beforeEach-retained',before_callback_sha256:retainedPair[0],after_callback_sha256:retainedPair[1]});}
    else record(node.modifiers.find(n=>n.kind===ts.SyntaxKind.AsyncKeyword),'async-beforeEach-modifier-removed',{callback_before_sha256:hash(node.getText(file))});
    const next=ts.visitEachChild(node,visit,context);
    return retainedPair?next:ts.factory.updateArrowFunction(next,next.modifiers.filter(n=>n.kind!==ts.SyntaxKind.AsyncKeyword),next.typeParameters,next.parameters,next.type,next.equalsGreaterThanToken,next.body);
   }
  }else if(ts.isPropertyAssignment(node)&&node.name.getText(file)==='standalone'&&node.initializer.kind===ts.SyntaxKind.TrueKeyword){
   const metadata=node.parent,call=metadata?.parent;
   assert.ok(ts.isObjectLiteralExpression(metadata)&&ts.isCallExpression(call)&&ts.isIdentifier(call.expression)&&call.arguments[0]===metadata&&ts.isDecorator(call.parent),'unreviewed standalone:true outside decorator');
   const exported=core.get(call.expression.text);assert.ok(['Component','Directive'].includes(exported),'standalone removal is not actual public core decorator');
   record(node,'explicit-standalone-true-removed',{decorator:exported});return undefined;
  }
  return ts.visitEachChild(node,visit,context);
 };return node=>ts.visitNode(node,visit);}]);
 try{return {fingerprint:fp(transformed.transformed[0]),operations,retentions,compiler_calls_before:calls.length};}finally{transformed.dispose();}
}
export function reviewWideMember(member,index){const before=wideRegistrations(member,'before'),after=wideRegistrations(member,'after');
 assert.deepEqual(before.map(n=>n.key),after.map(n=>n.key),'full case/hook path/scope/mode/interleaving changed');
 const projection=projectWideProgram(member,index),file=parse(member.after.text);
 assert.equal(projection.fingerprint,fp(file),'unreviewed whole-program change outside finite fixture operations');
 const templates=side=>{const file=parse(member[side].text);return collect(file,n=>ts.isPropertyAssignment(n)&&['template','styles','templateUrl','styleUrl','styleUrls'].includes(n.name.getText(file))).map(n=>({property:n.name.getText(file),raw_sha256:hash(n.getText(file))}));};
 const templateProperties=templates('before');assert.deepEqual(templateProperties,templates('after'),'template/style source changed');
 for(const retention of projection.retentions.filter(n=>n.kind==='async-beforeEach-retained')){
  const rows=before.map((n,i)=>({before:n,after:after[i]})).filter(n=>n.before.callback_raw_sha256===retention.before_callback_sha256);
  assert.equal(rows.length,1);assert.equal(rows[0].after.callback_raw_sha256,retention.after_callback_sha256,'retained async callback changed');
 }
 const pairs=before.map((old,i)=>{const next=after[i],compilerAssertion=index===0&&old.raw_sha256===retainedCompilerCase;
  if(compilerAssertion)assert.equal(old.raw_sha256,next.raw_sha256,'retained compiler assertion changed');
  return {...old,after_raw_sha256:next.raw_sha256,after_callback_sha256:next.callback_sha256,after_callback_raw_sha256:next.callback_raw_sha256,
   complete_callback_semantics_equal:old.callback_sha256===next.callback_sha256,predicates_equal:JSON.stringify(old.predicate_expressions)===JSON.stringify(next.predicate_expressions),
   change:old.callback_sha256===next.callback_sha256?'unchanged':index===0?'compiler-boundary-removed':'local-host-explicit-standalone-true-removed',compiler_default_creation_or_lifetime_equivalence_proved:false};});
 // The one compiler-availability predicate is retained; no other predicate expression changes.
 assert.ok(pairs.every(n=>n.predicates_equal),'unreviewed predicate expression');
 return {path:member.path,before_sha256:member.before.sha256,after_sha256:member.after.sha256,...projection,pairs,
  template_style_properties_preserved:templateProperties,static_cases:before.filter(n=>caseModes.includes(n.mode)).length,
  hooks:before.filter(n=>hookModes.includes(n.mode)).length,disabled_cases:before.filter(n=>n.mode==='xit'),
  all_other_whole_program_semantics_equal:true,actual_Angular_native_artifact_or_floor_qualified:false};
}
export function authenticateWideOriginal(subject){const index=WIDE_SHAS.indexOf(subject.sha);assert.ok(index>=0);assert.equal(subject.members.length,[187,175][index]);
 assert.equal(hash(canonical(subject.complete_changed_files)),filePins[index]);assert.deepEqual(subject.members.map(n=>n.path),subject.complete_changed_files.map(n=>n.path));
 assert.equal(hash(subject.diff),diffPins[index]);assert.equal(subject.diff_sha256,diffPins[index]);assert.equal(Buffer.byteLength(subject.diff),subject.diff_bytes);
 const parts=subject.diff.split(/(?=^diff --git )/m).filter(Boolean),hunks=[];assert.equal(parts.length,subject.members.length);
 for(const [i,member]of subject.members.entries()){
  const identity=subject.complete_changed_files[i],diff=parts[i];assert.equal(identity.status,'M');assert.equal(identity.before_mode,'100644');assert.equal(identity.after_mode,'100644');assert.ok(member.path.endsWith('.spec.ts'));
  hunks.push(...reviewCompleteSingleSpec({...subject,members:[member],complete_changed_files:[identity],diff,diff_sha256:hash(diff),diff_bytes:Buffer.byteLength(diff),original_hunks:(diff.match(/^@@ /gm)||[]).length},WIDE_SHAS));
 }
 assert.equal(hunks.length,[308,533][index]);assert.equal(subject.original_hunks,hunks.length);return hunks;
}
export function analyzeWideOriginal(subject){const index=WIDE_SHAS.indexOf(subject.sha);assert.ok(index>=0);const hunks=authenticateWideOriginal(subject),files=subject.members.map(member=>reviewWideMember(member,index));
 const operations=files.flatMap(n=>n.operations),retentions=files.flatMap(n=>n.retentions),pairs=files.flatMap(n=>n.pairs),cases=pairs.filter(n=>caseModes.includes(n.mode));
 const counts=Object.fromEntries([...new Set(operations.map(n=>n.kind))].map(kind=>[kind,operations.filter(n=>n.kind===kind).length]));
 assert.equal(cases.length,[4486,3633][index]);assert.equal(cases.filter(n=>n.complete_callback_semantics_equal).length,[4465,3630][index]);
 assert.equal(files.reduce((sum,n)=>sum+n.disabled_cases.length,0),index===0?1:0);
 if(index===0){assert.deepEqual(counts,{'async-beforeEach-modifier-removed':51,'compiler-chain-removed':163,'bare-compiler-statement-removed':83,'awaited-compiler-chain-removed':56});assert.equal(retentions.length,5);}
 else {assert.deepEqual(counts,{'explicit-standalone-true-removed':553});assert.equal(operations.filter(n=>n.decorator==='Component').length,543);assert.equal(operations.filter(n=>n.decorator==='Directive').length,10);assert.equal(retentions.length,0);}
 const hunkReviews=hunks.map(hunk=>{const file=files.find(n=>n.path===hunk.path),range=hunk.header.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);assert.ok(range);
  const start=Number(range[1]),end=start+Number(range[2]??1)-1,overlapping=file.operations.filter(n=>n.before_start_line<=end&&n.before_end_line>=start);
  assert.ok(overlapping.length>0,'original hunk lacks a reviewed finite operation '+hunk.path+' '+hunk.header);
  return {...hunk,review_depth:'individual-compatibility',decision:'do-not-adopt',operations:overlapping.map(n=>({kind:n.kind,source_sha256:n.source_sha256,before_start_line:n.before_start_line,before_end_line:n.before_end_line})),
   rationale:index===0?'Private upstream compiler preparation is removed; retain owned historical compilation, module-host metadata and actual artifact/native runtime gate. No product behavior port follows from this fixture preference.':'Younger upstream standalone defaults remove explicit true metadata; retain owned Material16 module-host semantics and explicit production flags. Actual default/compiler/consumer behavior remains a runtime gate.'};
 });
 return {sha:subject.sha,complete_original_files:files.length,complete_original_hunks:hunks.length,hunkReviews,files,
  static_cases_paired:cases.length,unchanged_complete_callbacks:cases.filter(n=>n.complete_callback_semantics_equal).length,
  changed_cases:cases.filter(n=>!n.complete_callback_semantics_equal),setup_cleanup_hooks_paired:pairs.length-cases.length,
  operation_counts:counts,retentions,disabled_cases_preserved:files.flatMap(n=>n.disabled_cases),
  predicate_and_all_other_operation_semantics_equal:true,compiler_standalone_default_render_or_lifetime_equivalence_proved:false,
  actual_Angular_native_artifact_or_floor_qualified:false};
}
export function inspectWideFixtureSources({root=rootDefault,readMember}={}){const read=readMember||(path=>readFileSync(resolve(root,path))),line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
 const paths=['compatibility/rc/spec-wide-fixture-source-subjects.json.gz','compatibility/rc/spec-wide-fixture-source-acquisition.json.gz'];
 const [originals,acquisition]=paths.map((path,i)=>{const bytes=read(path);assert.equal(hash(bytes),capsulePins[line][i]);return JSON.parse(gunzipSync(bytes));});
 assert.deepEqual(originals.subjects.map(n=>n.sha),WIDE_SHAS);assert.deepEqual(acquisition.subjects,WIDE_SHAS);const identities=[];
 for(const packet of [originals,acquisition]){assert.equal(packet.line,line);assert.equal(hash(read(packet.producer.path)),packet.producer.sha256);assert.equal(hash(packet.selection.worksheet_text),packet.selection.sha256);assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects,WIDE_SHAS);}
 assert.equal(acquisition.shared_cache_written,false);assert.equal(acquisition.credentials_used_or_changed,false);assert.equal(acquisition.upstream_or_candidate_source_executed,false);assert.equal(acquisition.private_temporary_object_view_removed,true);
 const censusPath='compatibility/rc/upstream-complete-patch-census.json.gz',censusBytes=read(censusPath),census=JSON.parse(gunzipSync(censusBytes));assert.equal(census.line,line);assert.equal(census.commits.length,1697);assert.equal(originals.source_inventory.sha256,hash(censusBytes));
 for(const subject of originals.subjects){const row=census.commits.find(n=>n.sha===subject.sha);assert.equal(row.raw_commit,subject.raw_commit);assert.deepEqual(row.complete_changed_files,subject.complete_changed_files);
  for(const member of subject.members)for(const side of ['before','after'])identities.push({commit:subject.sha,path:member.path,side,revision:side==='before'?subject.parents[0]:subject.sha,git_blob:member[side].git_blob,sha256:member[side].sha256,bytes:member[side].bytes});
 }
 assert.deepEqual(acquisition.members.map(({source,url,...identity})=>{assert.ok(['existing-cache','immutable-upstream-raw'].includes(source));assert.equal(typeof url==='string',source==='immutable-upstream-raw');return identity;}),identities);
 const adapter=JSON.parse(read('compatibility/rc/spec-wide-fixture-source-adapter-checkpoint.json'));assert.equal(adapter.qualified_source_bindings,13);assert.equal(adapter.native20_original_bindings_fresh_all_missing_coordinator_run,true);assert.equal(hash(read(adapter.adapter.path)),adapter.adapter.sha256);
 const replay=JSON.parse(read('compatibility/rc/spec-wide-fixture-source-adapter-replay-checkpoint.json'));assert.equal(replay.guard_controls_passed,81);assert.equal(replay.prior81_controls_exact,true);
 const repair=inspectChipEmptyRepair({root,readMember:read}),subjects=originals.subjects.map(analyzeWideOriginal);
 return {schema_version:1,line,subjects,complete_original_file_occurrences:362,complete_original_bodies:724,complete_original_hunks:841,
  static_cases_paired:8119,changed_cases:24,owned_product_members:repair.product_members,current_owned_cases_preserved:2223,
  production_HTML_CSS_SCSS_or_template_changes:0,required_consumer_CSS_SCSS_changes:0,source_decisions_only:true,
  actual_Angular_native_artifact_or_floor_qualified:false,security_clearance:'not-passed',g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=inspectWideFixtureSources(),out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({...report,subjects:report.subjects.map(({hunkReviews,files,changed_cases,disabled_cases_preserved,...row})=>({...row,changed_cases:changed_cases.length,disabled_cases_preserved:disabled_cases_preserved.length}))}));
}

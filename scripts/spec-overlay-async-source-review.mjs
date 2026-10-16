/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Four complete overlay-fixture originals; source accounting is not native/motion equivalence. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCompleteSingleSpec} from './authenticated-single-spec-review.mjs';
import {originalEnvironmentCases} from './spec-test-environment-source-review.mjs';
import {inspectChipEmptyRepair} from './spec-stability-chip-repair.mjs';
import {deriveHistoricalRoster} from './historical-case-roster.mjs';
const ts=createRequire(import.meta.url)('typescript'),rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const OVERLAY_SHAS=['60ad14c1a25aa57d10e8755168bc90b2b3cb4f4d','1597a2d85049e53e67eabdaa7f37efd1cfaad93e','42eb7044ca2f27fe81b9b402a6ae3baae73662f7','a36374c4ff809ba5c181f74feb26fce232ebb068'];
const pinPath='compatibility/rc/spec-overlay-async-source-observation-pins.json',pinSha='5b5ba370822ab24025bab59cb727088709af8229b9e1ff2dbcb9cd786331be9a';
const capsules={main:['ff42e181d3c553fe6f45d14e4fdcbed2cda692810aa2bfa8ad75423994a3e5ee','c484db19b240967864116e8ef2d337767d473a2c7bfa5079ed6471818fc85716'],
 '21.x':['ac596dc588cccf6e6ec6cd4b9cfdf248bf7d870d293fe258b210884e8c4f1e3e','8dc9603000933ce03a0b06de22bf87d89a7caeff458873e0288c91f6533daec5']};
const caseModes=['it','fit','xit'],hookModes=['beforeEach','afterEach','beforeAll','afterAll'];
const parse=text=>{const file=ts.createSourceFile('original.spec.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
function collect(node,predicate){const rows=[];function visit(n){if(predicate(n))rows.push(n);ts.forEachChild(n,visit);}visit(node);return rows;}
function semantic(node){const children=[];ts.forEachChild(node,n=>{children.push(semantic(n));});return[node.kind,node.isTypeOnly??null,
 ts.isVariableDeclarationList(node)?node.flags&(ts.NodeFlags.Const|ts.NodeFlags.Let|ts.NodeFlags.Using|ts.NodeFlags.AwaitUsing):null,
 ts.isIdentifier(node)?node.text:ts.isLiteralExpression(node)?node.text:null,children];}
const fp=node=>hash(JSON.stringify(semantic(node))),name=(node,file)=>ts.isCallExpression(node)?node.expression.getText(file):'';
function sourcePins(root=rootDefault,read=path=>readFileSync(resolve(root,path))){const bytes=read(pinPath);assert.equal(hash(bytes),pinSha);const data=JSON.parse(bytes);assert.deepEqual(data.subjects.map(n=>n.sha),OVERLAY_SHAS);return data.subjects;}
function scopes(node,file){const out=[];for(let p=node.parent;p;p=p.parent)if(ts.isCallExpression(p)&&['describe','fdescribe','xdescribe'].includes(name(p,file)))out.unshift(p.arguments[0].getText(file));return out;}
const boundaryName=text=>['tick','flush','flushMicrotasks','discardPeriodicTasks','wait'].includes(text)||/\.(detectChanges|markForCheck|whenStable|whenRenderingDone|autoDetectChanges)$/.test(text);
function nativePromise(node,file){return ts.isNewExpression(node)&&node.expression.getText(file)==='Promise';}
export const OVERLAY_LOOP_CASES=["'should reset the active option when closing with the escape key'","'should reset the active option when closing by selecting with enter'","'should scroll to active options that are above the panel'","'should scroll back to the top when reaching the first option with preceding group label'"];
const loopRawPins=new Set([
 'f91683e6d2842745e50a1be42022f97ca7749adc82b17114a19a31cbc0164659','d9cfd6e976af427d1aed42d427e4c0c8089058dc6f766f1531cd48be602bc9d7',
 '5e32e81359624c1faa9c506c1e180bf650435cb58e824467d3715c33d0f7c232','6161df20937500e68cf3f06ed2a359e362fc46cd16f23200458b6ec999a0199c',
 'c13b8570b3c2620e907f9746e3c2c01eb92ded4f05e89539cd3eafb2be64b2f3','aed02bb8fae51b7f8d9ed883b4c2ec90d12291d75a6ff1c177bdadbcc00dfa09',
 '49f193dbc8e708812d55cbf6bb2022bdec8dc55eed7c015610a28b6500146258','ea132534c948277d9c64a94f0cd46b4df0e7b4f0ff386a9fa89acae8f6bbf6c8',
]);
function expectChain(node){let expression=node;while(ts.isCallExpression(expression)||ts.isPropertyAccessExpression(expression)){
 if(ts.isCallExpression(expression)&&ts.isIdentifier(expression.expression)&&['expect','expectAsync'].includes(expression.expression.text))return true;
 expression=expression.expression;
}return false;}
/** Every stripped statement and await is finite original source and remains in the report. */
export function projectOverlayNode(node,file,pins,{global=false,index=-1,beforeAuto,allowLoops=false}={}){
 const allowed=new Set(pins.allowed_boundary_statements),actionAwaits=new Set(pins.allowed_action_awaits),steps=[],awaits=[],wrappers=[],modifiers=[],imports=[],waits=[],selectors=[],converted=[],loops=[];
 const result=ts.transform(node,[context=>{const visit=n=>{
  if(global&&ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&[...caseModes,...hookModes].includes(name(n.expression,file)))return undefined;
  if(global&&ts.isImportSpecifier(n)&&['fakeAsync','tick','flush','flushMicrotasks','waitForAsync'].includes(n.name.text)){
   let p=n;while(p&&!ts.isImportDeclaration(p))p=p.parent;if(p?.moduleSpecifier.text==='@angular/core/testing'){
    assert.ok(!n.propertyName||n.propertyName.text===n.name.text);assert.equal(n.isTypeOnly,false);imports.push(n.name.text);return undefined;
   }
  }
  if(global&&ts.isFunctionDeclaration(n)&&n.name?.text==='wait'){
   const found=pins.wait_helpers.filter(p=>p.sha256===hash(n.getText(file)));assert.equal(found.length,1,'native wait helper changed');assert.equal(found[0].side,'after');waits.push(found[0]);return undefined;
  }
  if(global&&index===3&&ts.isClassDeclaration(n)&&n.name?.text==='AutocompleteWithOnPushDelay'){
   assert.ok(beforeAuto);const found=pins.changed_fixture_classes.filter(p=>p.name===n.name.text&&p.sha256===hash(n.getText(file)));assert.equal(found.length,1,'OnPush fixture conversion changed');converted.push(found[0]);return beforeAuto;
  }
  if(global&&index===0&&ts.isPropertyAssignment(n)&&n.name.getText(file)==='selector'){
   let p=n;while(p&&!ts.isClassDeclaration(p))p=p.parent;if(['SimpleMenu','SimpleMenuOnPush'].includes(p?.name?.text)){
    const found=pins.changed_fixture_classes.filter(row=>row.name===p.name.text&&row.sha256===hash(p.getText(file)));assert.equal(found.length,1,'private selector fixture changed');assert.equal(found[0].side,'after');selectors.push({class_name:p.name.text,text:n.getText(file)});return undefined;
   }
  }
  // Six individually reviewed fixed-array loops keep their action order. The
  // awaited iteration timing is recorded, never treated as runtime equivalence.
  if(allowLoops&&ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&ts.isPropertyAccessExpression(n.expression.expression)&&n.expression.expression.name.text==='forEach'&&ts.isArrayLiteralExpression(n.expression.expression.expression)){
   const call=n.expression,array=call.expression.expression;assert.equal(call.arguments.length,1);const callback=call.arguments[0];assert.ok(ts.isArrowFunction(callback)&&ts.isBlock(callback.body),n.getText(file));assert.equal(callback.parameters.length,0);assert.ok(!callback.modifiers?.length);assert.ok(array.elements.every(ts.isNumericLiteral));
   const body=ts.visitNode(callback.body,visit);loops.push({kind:'synchronous-array-forEach',values:array.elements.map(n=>Number(n.text)),action_body_sha256:fp(body),source_sha256:hash(n.getText(file))});
   return ts.factory.createExpressionStatement(ts.factory.createCallExpression(ts.factory.createIdentifier('__original_ordered_iteration__'),undefined,[array,ts.factory.createArrowFunction(undefined,undefined,[],undefined,undefined,body)]));
  }
  if(allowLoops&&ts.isForOfStatement(n)){
   assert.equal(n.awaitModifier,undefined);assert.ok(ts.isArrayLiteralExpression(n.expression)&&n.expression.elements.every(ts.isNumericLiteral));assert.ok(ts.isVariableDeclarationList(n.initializer));assert.equal(n.initializer.flags&ts.NodeFlags.Const,ts.NodeFlags.Const);assert.equal(n.initializer.declarations.length,1);const binding=n.initializer.declarations[0];assert.ok(ts.isIdentifier(binding.name)&&binding.name.text==='_');assert.equal(binding.initializer,undefined);assert.ok(ts.isBlock(n.statement));assert.equal(collect(n.statement,node=>ts.isIdentifier(node)&&node.text==='_').length,0,'loop binder is used');
   const body=ts.visitNode(n.statement,visit);loops.push({kind:'sequential-for-of-with-await',values:n.expression.elements.map(n=>Number(n.text)),action_body_sha256:fp(body),source_sha256:hash(n.getText(file))});
   return ts.factory.createExpressionStatement(ts.factory.createCallExpression(ts.factory.createIdentifier('__original_ordered_iteration__'),undefined,[n.expression,ts.factory.createArrowFunction(undefined,undefined,[],undefined,undefined,body)]));
  }
  if(ts.isExpressionStatement(n)){
   let expression=n.expression;if(ts.isAwaitExpression(expression))expression=expression.expression;
   if((ts.isCallExpression(expression)&&boundaryName(name(expression,file)))||(ts.isAwaitExpression(n.expression)&&nativePromise(expression,file))){
    const text=n.getText(file);assert.ok(allowed.has(text),'unrecorded timing/detection boundary '+text);steps.push({text,sha256:hash(text)});return undefined;
   }
  }
  if(ts.isCallExpression(n)&&['fakeAsync','waitForAsync'].includes(name(n,file))){assert.equal(n.arguments.length,1);wrappers.push(name(n,file));return ts.visitNode(n.arguments[0],visit);}
  if(ts.isAwaitExpression(n)){const text=n.getText(file);assert.ok(actionAwaits.has(text),'unrecorded await-action boundary '+text);awaits.push({text,sha256:hash(text)});return ts.visitNode(n.expression,visit);}
  if(ts.isArrowFunction(n)||ts.isFunctionDeclaration(n)||ts.isFunctionExpression(n)){
   const next=ts.visitEachChild(n,visit,context),mods=next.modifiers?.filter(n=>n.kind!==ts.SyntaxKind.AsyncKeyword);if(next.modifiers?.some(n=>n.kind===ts.SyntaxKind.AsyncKeyword))modifiers.push({kind:ts.SyntaxKind[n.kind],source_sha256:hash(n.getText(file))});
   if(ts.isArrowFunction(next))return ts.factory.updateArrowFunction(next,mods,next.typeParameters,next.parameters,next.type,next.equalsGreaterThanToken,next.body);
   if(ts.isFunctionDeclaration(next))return ts.factory.updateFunctionDeclaration(next,mods,next.asteriskToken,next.name,next.typeParameters,next.parameters,next.type,next.body);
   return ts.factory.updateFunctionExpression(next,mods,next.asteriskToken,next.name,next.typeParameters,next.parameters,next.type,next.body);
  }
  return ts.visitEachChild(n,visit,context);
 };return n=>ts.visitNode(n,visit);}]);
 try{const projected=result.transformed[0],predicates=collect(projected,n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&expectChain(n.expression)).map(n=>fp(n.expression));
  return{projected_body_sha256:fp(projected),predicates,steps,action_awaits:awaits,wrappers,async_modifiers:modifiers,imports,waits,selectors,converted,loops,compiler_scheduler_error_or_lifetime_equivalence_proved:false};
 }finally{result.dispose();}
}
function projectCallback(row,pins,argument=1){const file=parse(row.raw),call=file.statements[0]?.expression;assert.ok(ts.isCallExpression(call));assert.equal(name(call,file),row.mode);assert.equal(call.arguments.length,argument+1);assert.equal(hash(row.raw),row.sha256);return projectOverlayNode(call.arguments[argument],file,pins,{allowLoops:pins.sha===OVERLAY_SHAS[3]&&loopRawPins.has(row.sha256)});}
function mappedCase(before,after,index){let row=after.find(n=>n.key===before.key);if(row)return row;
 if(index===1&&before.name==="'should not emit the change event multiple times when a reset option is ' +\n        'selected twice in a row'")row=after.find(n=>n.name==="'should not emit the change event multiple times when a reset option is selected twice in a row'");
 if(index===2&&before.name==="'should return the current state of the dialog'")row=after.find(n=>n.name==="'return the current state of the dialog'");
 if(row){assert.equal(row.path,before.path);assert.deepEqual(row.suites,before.suites);assert.equal(row.mode,before.mode);}return row;
}
const exceptionKey=row=>JSON.stringify([row.path,row.suites,row.name]);
export function compareOverlayCases(subject,pins){const index=OVERLAY_SHAS.indexOf(subject.sha);assert.ok(index>=0);const before=originalEnvironmentCases(subject,'before'),after=originalEnvironmentCases(subject,'after'),used=new Set(),pairs=[],removed=[];
 assert.equal(before.length,[122,241,122,183][index]);assert.equal(after.length,[122,241,123,182][index]);
 for(const old of before){const next=mappedCase(old,after,index);if(!next){const removal=pins.removed_cases.find(n=>exceptionKey(n)===exceptionKey(old));assert.ok(removal,'unreviewed removed case');assert.equal(old.sha256,removal.sha256);removed.push(old);continue;}
  assert.ok(!used.has(next.key),'case reused');used.add(next.key);const a=projectCallback(old,pins),b=projectCallback(next,pins),equal=a.projected_body_sha256===b.projected_body_sha256;
  const exception=pins.exceptions.find(n=>exceptionKey(n)===exceptionKey(old));if(exception){assert.equal(old.sha256,exception.before_sha256);assert.equal(next.sha256,exception.after_sha256);assert.equal(equal,false,'individual nonboundary exception disappeared');}else assert.equal(equal,true,'unreviewed nonboundary/provider/helper/predicate/declaration change '+old.name);
  assert.deepEqual(a.loops.map(n=>[n.values,n.action_body_sha256]),b.loops.map(n=>[n.values,n.action_body_sha256]),'loop action values/order/body changed');
  pairs.push({path:old.path,suites:old.suites,name:old.name,after_name:next.name,mode:old.mode,before_sha256:old.sha256,after_sha256:next.sha256,
   complete_callback_semantics_equal:old.callback_sha256===next.callback_sha256,renamed:old.name!==next.name,finite_boundary_projection_equal:equal,
   predicates_equal:JSON.stringify(a.predicates)===JSON.stringify(b.predicates),individual_exception:Boolean(exception),before:a,after:b,actual_scheduler_error_creation_or_lifetime_equivalence_proved:false});
 }
 const added=after.filter(n=>!used.has(n.key));assert.deepEqual(added.map(n=>({path:n.path,suites:n.suites,name:n.name,sha256:n.sha256})),pins.added_cases);assert.equal(removed.length,pins.removed_cases.length);
 assert.deepEqual(pairs.map(n=>n.after_sha256),after.filter(n=>used.has(n.key)).map(n=>n.sha256),'case identity/order changed');
 assert.equal(hash(JSON.stringify(pairs.map(n=>[n.path,n.suites,n.name,n.after_name,n.before_sha256,n.after_sha256]))),pins.pairs_sha256,'ordered raw original pair changed');
 return{pairs,removed,added};
}
export function overlayHooks(subject,side){return subject.members.flatMap(member=>{const file=parse(member[side].text),counts=new Map();return collect(file,n=>ts.isCallExpression(n)&&hookModes.includes(name(n,file))).map(call=>{
 const mode=name(call,file),suites=scopes(call,file),base=JSON.stringify([member.path,mode,suites]),occurrence=counts.get(base)||0;counts.set(base,occurrence+1);
 return{path:member.path,mode,suites,key:base+'#'+occurrence,raw:call.getText(file),sha256:hash(call.getText(file))};
 });});}
function registrationSequence(subject,side,pins){return subject.members.flatMap(member=>{const file=parse(member[side].text);return collect(file,n=>ts.isCallExpression(n)&&[...caseModes,...hookModes].includes(name(n,file))).flatMap(call=>{
 const mode=name(call,file),isCase=caseModes.includes(mode),rawSha=hash(call.getText(file));
 if(isCase&&side==='before'&&pins.removed_cases.some(n=>n.sha256===rawSha))return[];
 if(isCase&&side==='after'&&pins.added_cases.some(n=>n.sha256===rawSha))return[];
 let label=isCase?call.arguments[0].getText(file):null;
 if(side==='before'&&subject.sha===OVERLAY_SHAS[1]&&label==="'should not emit the change event multiple times when a reset option is ' +\n        'selected twice in a row'")label="'should not emit the change event multiple times when a reset option is selected twice in a row'";
 if(side==='before'&&subject.sha===OVERLAY_SHAS[2]&&label==="'should return the current state of the dialog'")label="'return the current state of the dialog'";
 const context=[];for(let p=call.parent;p;p=p.parent){
  if(ts.isFunctionDeclaration(p)||ts.isMethodDeclaration(p))context.unshift([ts.SyntaxKind[p.kind],p.name?.getText(file)||null]);
  if((ts.isArrowFunction(p)||ts.isFunctionExpression(p))&&ts.isVariableDeclaration(p.parent))context.unshift(['assigned-function',p.parent.name.getText(file)]);
  if(ts.isForStatement(p))context.unshift(['for',p.initializer?fp(p.initializer):null,p.condition?fp(p.condition):null,p.incrementor?fp(p.incrementor):null]);
  if(ts.isForOfStatement(p)||ts.isForInStatement(p))context.unshift([ts.SyntaxKind[p.kind],fp(p.initializer),fp(p.expression)]);
 }
 return[[member.path,mode,scopes(call,file),context,label]];
 });});}
export function reviewOverlayGlobals(subject,pins){const index=OVERLAY_SHAS.indexOf(subject.sha);assert.ok(index>=0);const beforeHooks=overlayHooks(subject,'before'),afterHooks=overlayHooks(subject,'after');
 assert.deepEqual(registrationSequence(subject,'before',pins),registrationSequence(subject,'after',pins),'case/hook interleaving or containing-function/iteration context changed');
 assert.deepEqual(beforeHooks.map(n=>n.key),afterHooks.map(n=>n.key),'setup/cleanup hook scope/order changed');
 assert.equal(hash(JSON.stringify(beforeHooks.map((n,i)=>[n.path,n.mode,n.suites,n.sha256,afterHooks[i].sha256]))),pins.hooks_sha256,'ordered raw hook pair changed');
 const hooks=beforeHooks.map((n,i)=>{const a=projectCallback(n,pins,0),b=projectCallback(afterHooks[i],pins,0);assert.equal(a.projected_body_sha256,b.projected_body_sha256,'unreviewed setup/reset/provider/cleanup change');return{path:n.path,mode:n.mode,suites:n.suites,before_sha256:n.sha256,after_sha256:afterHooks[i].sha256,before:a,after:b};});
 const globals=[],classes=[],templates=[];
 for(const member of subject.members){const a=parse(member.before.text),b=parse(member.after.text),oldAuto=collect(a,n=>ts.isClassDeclaration(n)&&n.name?.text==='AutocompleteWithOnPushDelay')[0];
  const old=projectOverlayNode(a,a,pins,{global:true,index,beforeAuto:oldAuto}),next=projectOverlayNode(b,b,pins,{global:true,index,beforeAuto:oldAuto});
  assert.equal(old.projected_body_sha256,next.projected_body_sha256,'unreviewed global helper/import/fixture/metadata change');
  assert.equal(old.waits.length,0);assert.equal(next.waits.length,member.path.endsWith('/dialog.zone.spec.ts')||member.path.endsWith('/dialog-opener.spec.ts')?0:1);
  const expectedImports=index===2?(member.path.endsWith('/dialog.spec.ts')?['fakeAsync','flush','flushMicrotasks','tick']:['fakeAsync','flush']):index===3?['fakeAsync','flush','tick','waitForAsync']:['fakeAsync','flush','tick'];assert.deepEqual(old.imports.slice().sort(),expectedImports);assert.deepEqual(next.imports,[]);
  const classRows=(file,side)=>collect(file,ts.isClassDeclaration).map(node=>({path:member.path,name:node.name?.text,sha256:hash(node.getText(file)),side})),ca=classRows(a,'before'),cb=classRows(b,'after');assert.deepEqual(ca.map(n=>n.name),cb.map(n=>n.name));
  for(const [i,node]of ca.entries()){const after=cb[i],changed=node.sha256!==after.sha256;if(changed){assert.ok(pins.changed_fixture_classes.some(n=>n.path===node.path&&n.name===node.name&&n.side==='before'&&n.sha256===node.sha256),'unreviewed before fixture class');assert.ok(pins.changed_fixture_classes.some(n=>n.path===after.path&&n.name===after.name&&n.side==='after'&&n.sha256===after.sha256),'unreviewed after fixture class');}classes.push({path:node.path,name:node.name,before_sha256:node.sha256,after_sha256:after.sha256,changed});}
  const props=file=>collect(file,n=>ts.isPropertyAssignment(n)&&['template','styles','templateUrl','styleUrl','styleUrls'].includes(n.name.getText(file))).map(n=>({name:n.name.getText(file),text:n.getText(file),sha256:hash(n.getText(file))})),pa=props(a),pb=props(b);assert.equal(pa.length,pb.length);
  for(const[i,p]of pa.entries()){const q=pb[i];assert.equal(p.name,q.name);if(p.sha256!==q.sha256){assert.equal(index,3);assert.equal(p.name,'template');assert.equal(p.text.replace('@for (option of options; track option)','@for (option of options(); track option)'),q.text,'private OnPush template has unrelated change');}templates.push({path:member.path,property:p.name,before_sha256:p.sha256,after_sha256:q.sha256,unchanged:p.sha256===q.sha256});}
  globals.push({path:member.path,before:old,after:next,all_other_global_operations_equal:true});
 }
 return{hooks,globals,classes,templates};
}
export function authenticateOverlayOriginal(subject,pins){assert.equal(subject.sha,pins.sha);assert.deepEqual(subject.members.map(n=>n.path),pins.paths);assert.deepEqual(subject.complete_changed_files.map(n=>n.path),pins.paths);assert.equal(hash(subject.diff),pins.diff_sha256);assert.equal(subject.diff_sha256,pins.diff_sha256);assert.equal(subject.raw_commit_sha256,pins.raw_commit_sha256);
 const parts=subject.diff.split(/(?=^diff --git )/m).filter(Boolean),hunks=[];assert.equal(parts.length,pins.paths.length);
 for(const[i,member]of subject.members.entries()){const diff=parts[i],identity=subject.complete_changed_files[i];assert.equal(identity.status,'M');assert.equal(identity.before_mode,'100644');assert.equal(identity.after_mode,'100644');hunks.push(...reviewCompleteSingleSpec({...subject,members:[member],complete_changed_files:[identity],diff,diff_sha256:hash(diff),diff_bytes:Buffer.byteLength(diff),original_hunks:(diff.match(/^@@ /gm)||[]).length},OVERLAY_SHAS));}
 assert.equal(hunks.length,pins.original_hunks);assert.equal(subject.original_hunks,hunks.length);return hunks;
}
export function analyzeOverlayOriginal(subject,pins){const hunks=authenticateOverlayOriginal(subject,pins),cases=compareOverlayCases(subject,pins),globals=reviewOverlayGlobals(subject,pins);return{sha:subject.sha,complete_original_files:subject.members.length,complete_original_hunks:hunks.length,hunks,...cases,...globals,
 paired_cases:cases.pairs.length,unchanged_complete_callbacks:cases.pairs.filter(n=>n.complete_callback_semantics_equal).length,changed_paired_callbacks:cases.pairs.filter(n=>!n.complete_callback_semantics_equal).length,
 individually_reviewed_nonboundary_exceptions:cases.pairs.filter(n=>n.individual_exception).length,actual_Angular_native_artifact_or_floor_qualified:false,g11_claim:'not-passed'};}
export function inspectOverlayAsyncSources({root=rootDefault,readMember}={}){const read=readMember||(path=>readFileSync(resolve(root,path))),line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',pins=sourcePins(root,read);
 const paths=['compatibility/rc/spec-overlay-async-source-subjects.json.gz','compatibility/rc/spec-overlay-async-source-acquisition.json.gz'];const[originals,acquisition]=paths.map((path,i)=>{const bytes=read(path);assert.equal(hash(bytes),capsules[line][i]);return JSON.parse(gunzipSync(bytes));});
 assert.deepEqual(originals.subjects.map(n=>n.sha),OVERLAY_SHAS);assert.deepEqual(acquisition.subjects,OVERLAY_SHAS);
 for(const packet of[originals,acquisition]){assert.equal(packet.line,line);assert.equal(hash(read(packet.producer.path)),packet.producer.sha256);assert.equal(hash(packet.selection.worksheet_text),packet.selection.sha256);assert.deepEqual(JSON.parse(packet.selection.worksheet_text).subjects,OVERLAY_SHAS);}
 assert.equal(acquisition.shared_cache_written,false);assert.equal(acquisition.credentials_used_or_changed,false);assert.equal(acquisition.upstream_or_candidate_source_executed,false);assert.equal(acquisition.private_temporary_object_view_removed,true);
 const censusPath='compatibility/rc/upstream-complete-patch-census.json.gz',censusBytes=read(censusPath),census=JSON.parse(gunzipSync(censusBytes));assert.equal(originals.source_inventory.sha256,hash(censusBytes));assert.equal(census.line,line);assert.equal(census.commits.length,1697);const identities=[];
 for(const subject of originals.subjects){const row=census.commits.find(n=>n.sha===subject.sha);assert.equal(subject.raw_commit,row.raw_commit);assert.deepEqual(subject.complete_changed_files,row.complete_changed_files);for(const member of subject.members)for(const side of['before','after'])identities.push({commit:subject.sha,path:member.path,side,revision:side==='before'?subject.parents[0]:subject.sha,git_blob:member[side].git_blob,sha256:member[side].sha256,bytes:member[side].bytes});}
 assert.deepEqual(acquisition.members.map(({source,url,...identity})=>{assert.ok(['existing-cache','immutable-upstream-raw'].includes(source));assert.equal(typeof url==='string',source==='immutable-upstream-raw');return identity;}),identities);
 const subjects=originals.subjects.map((n,i)=>analyzeOverlayOriginal(n,pins[i])),product=inspectChipEmptyRepair({root,readMember:read}),roster=deriveHistoricalRoster(root);assert.equal(roster.ids.length+roster.discovery_negative_ids.length,2228);
 const pairs=subjects.flatMap(n=>n.pairs),hooks=subjects.flatMap(n=>n.hooks),classes=subjects.flatMap(n=>n.classes),templates=subjects.flatMap(n=>n.templates),loops=pairs.flatMap(n=>n.before.loops);
 const counts={paired_cases:pairs.length,added_cases:subjects.reduce((sum,n)=>sum+n.added.length,0),removed_cases:subjects.reduce((sum,n)=>sum+n.removed.length,0),exact_label_mappings:pairs.filter(n=>n.renamed).length,
  unchanged_complete_callbacks:pairs.filter(n=>n.complete_callback_semantics_equal).length,changed_paired_callbacks:pairs.filter(n=>!n.complete_callback_semantics_equal).length,
  hooks_paired:hooks.length,fixture_classes:classes.length,changed_fixture_classes:classes.filter(n=>n.changed).length,template_style_properties:templates.length,changed_private_template_properties:templates.filter(n=>!n.unchanged).length,
  explicit_nonboundary_exceptions:pairs.filter(n=>n.individual_exception).length,predicate_sequences_equal:pairs.filter(n=>n.predicates_equal).length,reviewed_loop_conversions:loops.length,reviewed_loop_action_iterations:loops.reduce((sum,n)=>sum+n.values.length,0)};
 assert.deepEqual(counts,{paired_cases:667,added_cases:1,removed_cases:1,exact_label_mappings:2,unchanged_complete_callbacks:220,changed_paired_callbacks:447,hooks_paired:52,fixture_classes:108,changed_fixture_classes:4,template_style_properties:102,changed_private_template_properties:1,explicit_nonboundary_exceptions:4,predicate_sequences_equal:665,reviewed_loop_conversions:6,reviewed_loop_action_iterations:27});
 const context=JSON.parse(read('compatibility/rc/spec-stability-context-checkpoint.json'));for(const ref of context.output_metadata)if(ref.path!=='compatibility/f10/disposition-ledger/ledger.json')assert.equal(hash(read(ref.path)),ref.sha256);
 return{schema_version:1,line,subjects,complete_original_files:6,complete_original_bodies:12,complete_original_hunks:550,...counts,
  owned_product_members:product.product_members,current_owned_case_bodies:2223,current_required_historical_case_ids:2228,production_HTML_CSS_SCSS_changes:0,required_consumer_CSS_SCSS_changes:0,
  actual_Angular_native_artifact_or_floor_qualified:false,security_clearance:'not-passed',g11_claim:'not-passed'};
}
export function overlayOriginalPins({root=rootDefault,readMember}={}){return sourcePins(root,readMember);}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=inspectOverlayAsyncSources(),out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({...report,subjects:report.subjects.map(({hunks,pairs,removed,added,hooks,globals,classes,templates,...n})=>({...n,removed:removed.length,added:added.length,hooks:hooks.length,classes:classes.length,templates:templates.length}))}));
}

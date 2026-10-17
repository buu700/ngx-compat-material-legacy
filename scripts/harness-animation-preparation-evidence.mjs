/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite current fixture preparation, independently checked against its committed pre-repair/tagged origin. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {posix} from 'node:path';
import {HISTORICAL_CONSOLIDATION_CAPSULE,HISTORICAL_CONSOLIDATION_SHA256,retainedConsolidationSources} from './upstream-test-consolidation-historical.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const providerPath='projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts';
export const HARNESS_PREPARATION_INPUTS='compatibility/rc/harness-animation-preparation-current-inputs.json';
export const HARNESS_PREPARATION_INPUTS_SHA256='c6a7cf8d01a03cc5f620f49a396bf7156290ec39baba5450e51cd7d2646836ce';
export const HARNESS_PREPARATION_QUALIFICATION='compatibility/rc/harness-animation-preparation-current-qualification.json';
const beforePath='compatibility/rc/harness-animation-preparation-before.json.gz';
const originPins={main:['fa33209807beb2bbbf57c30cd3d856e822e75a0a604e11e00b3b3afb9d1b3f5a','3bd961570244a165168e7e09d4c4c62bb33f3919'],
 '21.x':['0734b06b06259af5aa5033c252f96edf899b8b8813a6fddaee3e8be5b1d2b054','b1b9daed1ed3dffd898f8f5e1d099dccc5672d33']};
const parse=text=>{const file=ts.createSourceFile('fixture.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
function collect(node,predicate){const out=[];function visit(n){if(predicate(n))out.push(n);ts.forEachChild(n,visit);}visit(node);return out;}
function semantic(n){const children=[];ts.forEachChild(n,x=>{children.push(semantic(x));});return[ts.SyntaxKind[n.kind],n.isTypeOnly??null,ts.isVariableDeclarationList(n)?n.flags&(ts.NodeFlags.Const|ts.NodeFlags.Let):null,ts.isIdentifier(n)||ts.isLiteralExpression(n)?n.text:null,children];}
export function normalizeHarnessPreparation(text,side,path){
 const file=parse(text),records=[],seen=new Set();
 const result=ts.transform(file,[context=>{const visit=node=>{
  if(ts.isImportDeclaration(node)){
   const old=node.moduleSpecifier.text==='@angular/platform-browser/animations',owned=side==='after'&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(n=>n.name.text==='LEGACY_NOOP_ANIMATIONS');
   if(old||owned){assert.equal(old,side==='before');assert.deepEqual(node.importClause.namedBindings.elements.map(n=>n.getText(file)),[side==='before'?'NoopAnimationsModule':'LEGACY_NOOP_ANIMATIONS']);
    if(owned)assert.equal(posix.normalize(posix.join(posix.dirname(path),node.moduleSpecifier.text+'.ts')),providerPath);records.push({role:'mode-import',start:node.getStart(file),sha256:hash(node.getText(file))});seen.add(node.importClause.namedBindings.elements[0].name);return undefined;}
  }
  if(ts.isPropertyAssignment(node)&&node.name.getText(file)==='imports'&&ts.isArrayLiteralExpression(node.initializer)&&side==='before'){
   const entries=node.initializer.elements.filter(n=>n.getText(file)==='NoopAnimationsModule');if(entries.length){assert.equal(entries.length,1);assert.equal(node.parent.parent.expression.getText(file),'TestBed.configureTestingModule');seen.add(entries[0]);records.push({role:'module-mode',start:node.getStart(file),sha256:hash(node.getText(file))});
    return ts.factory.updatePropertyAssignment(node,node.name,ts.factory.updateArrayLiteralExpression(node.initializer,node.initializer.elements.filter(n=>n!==entries[0])));}
  }
  if(ts.isPropertyAssignment(node)&&node.name.getText(file)==='providers'&&side==='after'&&ts.isArrayLiteralExpression(node.initializer)&&node.initializer.elements[0]?.getText(file)==='LEGACY_NOOP_ANIMATIONS'){
   assert.equal(node.parent.parent.expression.getText(file),'TestBed.configureTestingModule');const entries=node.initializer.elements;seen.add(entries[0]);records.push({role:'provider-mode',start:node.getStart(file),sha256:hash(node.getText(file))});
   if(entries.length===1)return undefined;
   assert.equal(path,'testing/legacy-runner/shims/harness/dialog/shared.spec.ts');assert.equal(entries.length,2);assert.ok(ts.isSpreadElement(entries[1]));assert.equal(entries[1].expression.getText(file),'(providers ?? [])');
   records.push({role:'dialog-optional-provider-forwarding',start:node.getStart(file)});return ts.factory.createShorthandPropertyAssignment('providers');
  }
  return ts.visitEachChild(node,visit,context);
 };return n=>ts.visitNode(n,visit);}]);
 const ident=side==='before'?'NoopAnimationsModule':'LEGACY_NOOP_ANIMATIONS';for(const n of collect(file,n=>ts.isIdentifier(n)&&n.text===ident))assert.ok(seen.has(n),'mode identifier escaped its exact preparation role');
 const fingerprint=hash(JSON.stringify(semantic(result.transformed[0])));result.dispose();
 const cases=collect(file,n=>ts.isCallExpression(n)&&['it','fit','xit'].includes(n.expression.getText(file))).map(n=>hash(n.getText(file)));
 const classes=collect(file,ts.isClassDeclaration).map(n=>hash(n.getText(file)));
 return{fingerprint,records,cases,classes};
}

/** Recompute source checks; no saved pass bit or candidate runtime expectation is trusted. */
export function inspectHarnessPreparation(readRepo){
 const product=JSON.parse(readRepo('projects/ngx-material-legacy/package.json')),line=product.version.startsWith('21.')?'21.x':'main';
 const inputBytes=readRepo(HARNESS_PREPARATION_INPUTS);assert.equal(hash(inputBytes),HARNESS_PREPARATION_INPUTS_SHA256);
 const inputs=JSON.parse(inputBytes),beforeBytes=readRepo(beforePath);assert.equal(hash(beforeBytes),originPins[line][0]);
 const before=JSON.parse(gunzipSync(beforeBytes));assert.equal(before.line,line);assert.equal(before.source_parent,originPins[line][1]);assert.equal(before.members.length,12);
 assert.deepEqual(inputs.members.map(n=>n.path),before.members.map(n=>n.path));
 for(const cap of [inputs.provider,inputs.adapter])assert.equal(hash(readRepo(cap.path)),cap.sha256);
 assert.equal(inputs.provider.path,providerPath);assert.equal(inputs.adapter.path,'testing/legacy-runner/adapt-spec.mjs');
 const providerFile=parse(readRepo(providerPath).toString());assert.ok(providerFile.statements.filter(ts.isImportDeclaration).every(n=>n.moduleSpecifier.text==='@angular/core'));
 const provider=collect(providerFile,n=>ts.isVariableDeclaration(n)&&n.name.getText(providerFile)==='LEGACY_NOOP_ANIMATIONS');assert.equal(provider.length,1);const init=provider[0].initializer;assert.ok(ts.isObjectLiteralExpression(init));assert.deepEqual(init.properties.map(n=>n.name.getText(providerFile)),['provide','useValue']);assert.equal(init.properties[0].initializer.getText(providerFile),'ANIMATION_MODULE_TYPE');assert.equal(init.properties[1].initializer.text,'NoopAnimations');
 const sourceRows=[];let cases=0,classes=0,configurations=0;
 for(const [index,member]of before.members.entries()){
  const cap=inputs.members[index];assert.equal(hash(member.text),member.sha256);assert.equal(member.sha256,cap.before_sha256);
  const blob=createHash('sha1').update(Buffer.from('blob '+Buffer.byteLength(member.text)+'\0')).update(member.text).digest('hex');assert.equal(blob,member.git_blob);
  const actual=readRepo(member.path);assert.equal(hash(actual),cap.after_sha256,'current fixture differs from qualified exact input '+member.path);
  const old=normalizeHarnessPreparation(member.text,'before',member.path),next=normalizeHarnessPreparation(actual.toString(),'after',member.path);
  assert.equal(old.fingerprint,next.fingerprint,'unreviewed non-preparation operation');assert.deepEqual(old.cases,next.cases);assert.deepEqual(old.classes,next.classes);
  assert.equal(old.cases.length,cap.cases);assert.equal(old.classes.length,cap.fixture_classes);const modules=old.records.filter(n=>n.role==='module-mode').length,providers=next.records.filter(n=>n.role==='provider-mode').length;assert.equal(modules,cap.configurations);assert.equal(providers,modules);
  assert.equal(old.records.filter(n=>n.role==='mode-import').length,1);assert.equal(next.records.filter(n=>n.role==='mode-import').length,1);
  assert.ok(!actual.toString().includes('@angular/platform-browser/animations'));
  cases+=old.cases.length;classes+=old.classes.length;configurations+=modules;
  sourceRows.push({path:member.path,before_sha256:member.sha256,current_sha256:hash(actual),case_callbacks_unchanged:old.cases.length,fixture_classes_unchanged:old.classes.length,configurations:modules});
 }
 assert.deepEqual([cases,classes,configurations],[165,15,13]);
 // This read is explicitly historical. The unchanged validator proves the before origin against the untouched tag.
 // The current facts below use actual current bytes and a separate complete-program preparation check.
 const historicalMembers=new Map(before.members.map(n=>[n.path,Buffer.from(n.text)]));
 const historicalFacts=retainedConsolidationSources(readRepo(HISTORICAL_CONSOLIDATION_CAPSULE),path=>historicalMembers.get(path)||readRepo(path));
 const currentFacts=historicalFacts.map(fact=>{const row=sourceRows.find(n=>n.path===fact.candidate_path);if(!row){assert.equal(hash(readRepo(fact.candidate_path)),fact.candidate_sha256);return fact;}
  assert.equal(fact.candidate_sha256,row.before_sha256);return{...fact,historical_candidate_sha256:fact.candidate_sha256,candidate_sha256:row.current_sha256,candidate_bytes:readRepo(fact.candidate_path).length,adaptations:[...fact.adaptations,'independently qualified current owned Core mode provider preparation; all test/helper/class operations retained'],current_preparation_inputs:{path:HARNESS_PREPARATION_INPUTS,sha256:HARNESS_PREPARATION_INPUTS_SHA256}};
 });
 return{schema_version:1,line,role:'Current owned harness animation preparation source qualification, separate from historical tagged retention',
  source_parent_before_preparation:before.source_parent,before:{path:beforePath,sha256:originPins[line][0]},inputs:{path:HARNESS_PREPARATION_INPUTS,sha256:HARNESS_PREPARATION_INPUTS_SHA256},
  historical_origin:{view:'Exact committed pre-repair fixture bytes; not current-byte retention',tag:'16.2.14',capsule:{path:HISTORICAL_CONSOLIDATION_CAPSULE,sha256:HISTORICAL_CONSOLIDATION_SHA256},facts:historicalFacts},
  current_facts:currentFacts,source_rows:sourceRows,files:12,configurations,case_callbacks_unchanged:cases,fixture_classes_unchanged:classes,dialog_optional_provider_forwarding_and_priority_preserved:true,
  producer:{path:'scripts/harness-animation-preparation-evidence.mjs',sha256:hash(readRepo('scripts/harness-animation-preparation-evidence.mjs'))},
  actual_browser_native_renderer_focus_lifetime_or_floor_qualified:false,g11_claim:'not-passed'};
}
export function qualifiedCurrentConsolidationSources(readRepo,reference){
 assert.equal(reference.path,HARNESS_PREPARATION_QUALIFICATION);const bytes=readRepo(reference.path);assert.equal(hash(bytes),reference.sha256);
 const report=JSON.parse(bytes),actual=inspectHarnessPreparation(readRepo);assert.deepEqual(report,actual,'current preparation qualification does not match actual inputs');return actual.current_facts;
}

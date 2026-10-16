/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Preserve complete pre-repair test programs outside exactly the recorded preparation change. No runtime-equivalence golden. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {adaptSpec,resolveSpecModule} from '../testing/legacy-runner/adapt-spec.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),ts=createRequire(import.meta.url)('typescript'),read=p=>readFileSync(resolve(root,p)),hash=n=>createHash('sha256').update(n).digest('hex');
const prefix='compatibility/rc/harness-animation-preparation-',before=JSON.parse(gunzipSync(read(prefix+'before.json.gz'))),providerPath=resolve(root,'projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts');
const parse=text=>{const file=ts.createSourceFile('fixture.ts',text,ts.ScriptTarget.Latest,true);assert.equal(file.parseDiagnostics.length,0);return file;};
function collect(node,predicate){const out=[];function visit(n){if(predicate(n))out.push(n);ts.forEachChild(n,visit);}visit(node);return out;}
function semantic(n){const children=[];ts.forEachChild(n,x=>{children.push(semantic(x));});return[n.kind,n.isTypeOnly??null,ts.isVariableDeclarationList(n)?n.flags&(ts.NodeFlags.Const|ts.NodeFlags.Let):null,ts.isIdentifier(n)||ts.isLiteralExpression(n)?n.text:null,children];}
function normalize(text,side,path){
 const file=parse(text),records=[],seen=new Set();
 const result=ts.transform(file,[context=>{const visit=node=>{
  if(ts.isImportDeclaration(node)){
   const old=node.moduleSpecifier.text==='@angular/platform-browser/animations',owned=side==='after'&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(n=>n.name.text==='LEGACY_NOOP_ANIMATIONS');
   if(old||owned){assert.equal(old,side==='before');assert.deepEqual(node.importClause.namedBindings.elements.map(n=>n.getText(file)),[side==='before'?'NoopAnimationsModule':'LEGACY_NOOP_ANIMATIONS']);
    if(owned)assert.equal(resolveSpecModule(resolve(root,path),node.moduleSpecifier.text),providerPath);records.push({role:'mode-import',start:node.getStart(file),sha256:hash(node.getText(file))});seen.add(node.importClause.namedBindings.elements[0].name);return undefined;}
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
const members=[];let configurations=0;
assert.match(before.source_parent,/^[a-f0-9]{40}$/);assert.equal(before.members.length,12);
for(const member of before.members){assert.match(member.path,/^testing\/legacy-runner\/shims\/harness\/[a-z-]+\/[a-z-]+\.spec\.ts$/);assert.match(member.git_blob,/^[a-f0-9]{40}$/);
 const original=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','cat-file','blob',member.git_blob],{cwd:root,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(original),member.sha256);assert.equal(original.toString(),member.text);
 const current=read(member.path).toString(),old=normalize(member.text,'before',member.path),next=normalize(current,'after',member.path);
 assert.equal(old.fingerprint,next.fingerprint,'non-preparation program changed '+member.path);assert.deepEqual(old.cases,next.cases,'case callback/body/order/mode changed');assert.deepEqual(old.classes,next.classes,'fixture class/template/style changed');
 assert.equal(old.records.filter(n=>n.role==='mode-import').length,1);assert.equal(next.records.filter(n=>n.role==='mode-import').length,1);const count=old.records.filter(n=>n.role==='module-mode').length;assert.equal(next.records.filter(n=>n.role==='provider-mode').length,count);configurations+=count;
 assert.ok(!current.includes('@angular/platform-browser/animations'));const adapted=adaptSpec(current,resolve(root,member.path),{subjectMode:'artifact'});assert.deepEqual(adapted.problems,[]);assert.ok(!adapted.code.includes('@angular/platform-browser/animations'));parse(adapted.code);
 members.push({path:member.path,before_sha256:member.sha256,after_sha256:hash(current),cases:old.cases.length,fixture_classes:old.classes.length,configurations:count,artifact_mode_resolution:'pass',before:old,after:next});
}
assert.equal(configurations,13);
const controls=[];function reject(id,action){assert.throws(action,id);controls.push({id,result:'rejected'});}
const dialog=before.members.find(n=>n.path.includes('/dialog/')),dialogText=read(dialog.path).toString();
reject('dialog-undefined-providers-guard',()=>normalize(dialogText.replace('...(providers ?? [])','...providers'),'after',dialog.path));
reject('dialog-provider-order',()=>normalize(dialogText.replace('LEGACY_NOOP_ANIMATIONS, ...(providers ?? [])','...(providers ?? []), LEGACY_NOOP_ANIMATIONS'),'after',dialog.path));
{const changed=normalize(dialogText.replace("dialogService !== MatDialog","dialogService === MatDialog"),'after',dialog.path);reject('dialog-alias-decision-preserved',()=>assert.equal(changed.fingerprint,normalize(dialog.text,'before',dialog.path).fingerprint));}
const first=before.members[0],text=read(first.path).toString();
{const changed=normalize(text+'\nunreviewedOperation();\n','after',first.path);reject('extra-global-operation',()=>assert.equal(changed.fingerprint,normalize(first.text,'before',first.path).fingerprint));}
reject('mode-provider-not-an-import',()=>normalize(text.replace('providers: [LEGACY_NOOP_ANIMATIONS]','imports: [LEGACY_NOOP_ANIMATIONS]'),'after',first.path));
const result={schema_version:1,line:before.line,members,files:12,configurations:13,case_callbacks_unchanged:members.reduce((k,n)=>k+n.cases,0),fixture_classes_unchanged:members.reduce((k,n)=>k+n.fixture_classes,0),dialog_provider_forwarding_and_priority_preserved:true,controls:controls.length,cases:controls,adapter_sha256:hash(read('testing/legacy-runner/adapt-spec.mjs')),existing_provider_sha256:hash(read('projects/ngx-material-legacy/internal/testing/owned-animation-modules.ts')),actual_browser_native_renderer_or_floor_qualified:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,members:undefined,cases:undefined}));

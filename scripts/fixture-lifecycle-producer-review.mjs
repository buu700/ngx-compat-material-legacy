/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Actual generated cleanup expressions and finite producer delta; no legacy packed qualification. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
const priorPath='compatibility/rc/fixture-lifecycle-prior.json.gz';
const pins={main:'e714927039873f17fdf5f166c2d4313e33bb23e19ca9b55562c8b305ae2a7a25','21.x':'8dfbf2669e941ba528cea5ddf016a2ad27202552d1ab0aee982ef0630c614360'};
export const FIXTURE_LIFECYCLE_FAMILIES=[
 ['value-accessor','valueAccessorPackedFixture'],['menu-item-token','menuItemTokenPackedFixture'],
 ['radio-identity','radioIdentityPackedFixture'],['select-detach','selectDetachPackedFixture'],
 ['table-onpush','tableOnPushPackedFixture'],['select-focus-click','selectFocusClickPackedFixture'],
 ['generated-identity','generatedIdentityPackedFixture'],
];
export function fixtureLifecyclePrior(root){const raw=readFileSync(join(root,priorPath)),prior=JSON.parse(gunzipSync(raw));assert.equal(hash(raw),pins[prior.line]);
 assert.deepEqual(prior.preimages.map(m=>m.path),FIXTURE_LIFECYCLE_FAMILIES.map(([family])=>'scripts/'+family+'-packed-fixture.mjs'));
 for(const m of prior.preimages){assert.equal(hash(m.text),m.sha256);const old=execFileSync('git',['--no-replace-objects','show',prior.source_parent+':'+m.path],{cwd:root,maxBuffer:1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});assert.equal(hash(old),m.sha256);}
 return prior;}
export function expectedLifecycleProducerText(text){let count=0;const after=text.replace(/fixture(\??)\.destroyed/g,(_,optional)=>{count++;return 'fixture'+optional+'.componentRef.hostView.destroyed';});assert.equal(count,2);return after;}
export function inspectFixtureLifecycleDelta(root,{readSource=p=>readFileSync(join(root,p),'utf8')}={}){const prior=fixtureLifecyclePrior(root);for(const m of prior.preimages)assert.equal(readSource(m.path),expectedLifecycleProducerText(m.text),'unreviewed producer bytes: '+m.path);
 for(const path of ['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json','compatibility/f10/disposition-ledger/ledger.json']){
  const before=execFileSync('git',['--no-replace-objects','show',prior.source_parent+':'+path],{cwd:root,maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});
  assert.equal(hash(readSource(path)),hash(before),'unreviewed ledger delta in producer repair');
 }
 for(const member of prior.affected_review_documents)assert.equal(hash(readSource(member.review.path)),member.review.sha256,'original review document changed');
 return {line:prior.line,producer_files:7,public_state_path_repairs:14,all_other_producer_bytes_preserved:true,original_review_documents_and_ledgers_unchanged:true,source_context_requalification_pending:true,actual_legacy_packed_or_native_qualified:false,g11_claim:'not-passed'};}
const parse=(path,text)=>{const sf=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);return sf;};
export async function collectFixtureLifecycleExpressions(root){const rows=[];
 for(const [family,name]of FIXTURE_LIFECYCLE_FAMILIES){const path='scripts/'+family+'-packed-fixture.mjs',factory=await import(pathToFileURL(join(root,path)).href),text=factory[name]();assert.equal(typeof text,'string');const sf=parse(family+'.ts',text),fields=[],guards=[],creators=[];
  function visit(n){if(ts.isPropertyAssignment(n)&&['fixture_destroyed','fixtures_destroyed'].includes(n.name?.getText(sf)))fields.push(n);
   if(ts.isIfStatement(n)&&/fixture(?:\?\.)?(?:\.componentRef\.hostView)?\.destroyed/.test(n.expression.getText(sf)))guards.push(n);
   if(ts.isCallExpression(n)&&n.expression.getText(sf)==='TestBed.createComponent')creators.push(n);
   ts.forEachChild(n,visit);}
  // The guarded final state may include an optional componentRef chain; all
  // expressions are also checked against exact authenticated producer bytes.
  function containsState(n){let found=false;function walk(m){if(ts.isPropertyAccessExpression(m)&&m.name.text==='destroyed'&&m.getText(sf).startsWith('fixture'))found=true;ts.forEachChild(m,walk);}walk(n);return found;}
  function findGuards(n){if(ts.isIfStatement(n)&&containsState(n.expression)&&!guards.includes(n))guards.push(n);ts.forEachChild(n,findGuards);}visit(sf);findGuards(sf);
  assert.equal(fields.length,1,family+':one unchanged cleanup observation');assert.equal(guards.length,1,family+':one unchanged final cleanup guard');assert.ok(creators.length,family+':actual public TestBed creation required');
  const imports=sf.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text==='@angular/core/testing');assert.ok(imports.some(n=>n.importClause?.namedBindings?.elements?.some(e=>(e.propertyName??e.name).text==='TestBed'&&e.name.text==='TestBed')));
  const field=fields[0].initializer.getText(sf),guard=guards[0].getText(sf);assert.equal(guards[0].thenStatement.getText(sf),'fixture.destroy();');
  const code=ts.transpileModule('export function readField(fixture:any,fixtures:any[]){return '+field+';}\nexport function cleanup(fixture:any){'+guard+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  rows.push({family,path,source_sha256:hash(readFileSync(join(root,path))),generated_sha256:hash(text),field_name:fields[0].name.getText(sf),field_expression:field,guard_statement:guard,guard_allows_absent:/fixture\s*&&/.test(guards[0].expression.getText(sf)),optional_state:field.includes('fixture?.'),array_state:fields[0].name.getText(sf)==='fixtures_destroyed',code});
 }
 return rows;}
export function compileFixtureLifecycleExpressions(model,rows){const file=join(model.root,'fixture-lifecycle-typed.ts'),bad=join(model.root,'fixture-lifecycle-original-bug.ts'),negative=join(model.root,'fixture-lifecycle-negative.ts');
 const header="import type {ComponentFixture} from '@angular/core/testing';\n";
 const functions=(broken)=>rows.map((r,i)=>{const convert=s=>broken?s.replace(/fixture(\??)\.componentRef\.hostView\.destroyed/g,'fixture$1.destroyed'):s;
 return 'export function read_'+i+'(fixture:ComponentFixture<unknown>,fixtures:ComponentFixture<unknown>[]){return '+convert(r.field_expression)+';}\nexport function guard_'+i+'(fixture:ComponentFixture<unknown>){'+convert(r.guard_statement)+'}';}).join('\n');
 writeFileSync(file,header+functions(false));writeFileSync(bad,header+functions(true));
 writeFileSync(negative,header+"declare const fixture:ComponentFixture<unknown>;\n// @ts-expect-error This property is absent from the public Fixture.\nfixture.destroyed;\n// @ts-expect-error Internal fixture flags are private.\nfixture._isDestroyed;\n// @ts-expect-error Public view state is readonly.\nfixture.componentRef.hostView.destroyed=true;\n// @ts-expect-error Public view state is a boolean.\nfixture.componentRef.hostView.destroyed();\n");
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,skipLibCheck:false,noEmit:true,types:[]};
 const program=ts.createProgram([file,bad,negative],options),diagnostics=ts.getPreEmitDiagnostics(program),baseline=diagnostics.filter(d=>d.file?.fileName!==bad);
 assert.equal(baseline.length,0,ts.formatDiagnosticsWithColorAndContext(baseline,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
 const reproduced=diagnostics.filter(d=>d.file?.fileName===bad);assert.equal(reproduced.length,14);assert.ok(reproduced.every(d=>d.code===2551&&ts.flattenDiagnosticMessageText(d.messageText,' ').includes("Property 'destroyed' does not exist")));
 return {line:model.line,framework:model.packages.get('@angular/core').version,compiler:ts.version,strict:true,skip_lib_check:false,actual_captured_cleanup_and_state_expressions:14,original_missing_property_errors:14,negative_type_checks:4,whole_generated_fixture_or_AOT_qualified:false};}

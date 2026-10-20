/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact Core call shapes; non-Core tokens/receivers stay explicit protocols. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {installNgZonePublicSubject} from '../scripts/ng-zone-public-subjects.mjs';
import {remainingCorePrior,remainingCoreSnippets} from '../scripts/remaining-core-caller-roles.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),ts=createRequire(import.meta.url)('typescript'),prior=remainingCorePrior({root}),s=remainingCoreSnippets({root}),loaded=prepareMaterialPublicSubjects(root),exported=text=>text.startsWith('export ')?text:'export '+text;
const original=loaded.models.find(m=>m.line==='original'),oldCore=original.sources.get('@angular/material/fesm2022/core.mjs'),oldFile=ts.createSourceFile('original-core.mjs',oldCore,ts.ScriptTarget.Latest,true),oldFactory=oldFile.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='MAT_DATE_LOCALE_FACTORY');assert.ok(oldFactory?.body);assert.equal(oldFactory.body.statements.length,1);assert.equal(oldFactory.body.statements[0].getText(oldFile),'return inject(LOCALE_ID);');
const preamble=`import {inject,InjectionToken,NgZone,EventEmitter,LOCALE_ID,CSP_NONCE,ChangeDetectorRef,ANIMATION_MODULE_TYPE,assertInInjectionContext,Input,Directive,Inject,Optional,booleanAttribute,isDevMode} from '@angular/core';
import {DOCUMENT} from '@angular/common';
export {DOCUMENT};
export interface MatLegacyFormField {appearance:string;_hasLabel?:()=>boolean;}
export const MAT_LEGACY_FORM_FIELD=new InjectionToken<MatLegacyFormField>('form-field-protocol');
export type LegacyAnimationsState='enabled'|'di-disabled'|'reduced-motion';
export const LEGACY_ANIMATIONS_TEST_OVERRIDE=new InjectionToken<LegacyAnimationsState|null>('owned-policy-protocol');
export const MATERIAL_ANIMATIONS=new InjectionToken<{animationsDisabled?:boolean}>('material-policy-protocol');
export class MediaMatcher {matchMedia(query:string):{matches:boolean}{throw Error('protocol value must be supplied');}}
`;
const scopes=preamble+[s.mock,s.locale,exported(oldFactory.getText(oldFile)),s.animation_state,s.animation_guard,exported(s.tab_zone)].join('\n')+`
export function inputValue(){return ${s.input_inject};}
export function snackDocument(){return ${s.snack_inject};}
export function menuDetector(){return ${s.menu_inject};}
export function nonceValue():string|null{return inject(CSP_NONCE,{optional:true});}
@Directive({standalone:false})
export class BooleanInputProtocol {${s.boolean_fields.join('\n')}}
export class NonceParameterProtocol {constructor(${s.nonce_parameter}){}}
export class RafReceiver {
 _animationRevision=0;_animationDestroyed=false;_animationFrame:number|null=null;
 constructor(public _ngZone:NgZone){}
 ${s.raf}
}
export function publicZoneMembers(zone:NgZone,focus:()=>void){
 const stable:boolean=zone.isStable;const subscription=zone.onStable.subscribe(focus);
 const value:number=zone.runOutsideAngular(()=>3);return {stable,subscription,value};
}
export function publicDevGuard():boolean{return isDevMode();}
`;
const result={schema_version:1,line:prior.line,node:process.version,typescript:ts.version,type_subjects:[],runtime_subjects:[],runtime_fault_controls:[],inputs:[],tagged_locale_factory:{source:'@angular/material/fesm2022/core.mjs',source_sha256:hash(oldCore),function_sha256:hash(oldFactory.getText(oldFile)),exact_untouched_function_body:true},non_Core_tokens_and_service_values_are_protocols:true,actual_component_node_DI_or_default_nonce_root_factory_qualified:false,actual_native_packed_or_full_floor_qualified:false,g11_claim:'not-passed'};
try{
 for(const model of loaded.models){
  const file=join(model.root,'remaining-core-scopes.ts');writeFileSync(file,scopes);const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,skipLibCheck:false,noEmit:true,experimentalDecorators:true,types:[]},program=ts.createProgram([file],options),diagnostics=ts.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  const checker=program.getTypeChecker(),source=program.getSourceFile(file),bindings=source.statements[0].importClause.namedBindings.elements,symbols=[];
  for(const name of ['NgZone','EventEmitter','LOCALE_ID','CSP_NONCE','booleanAttribute','isDevMode']){const b=bindings.find(b=>b.name.text===name),symbol=checker.getAliasedSymbol(checker.getSymbolAtLocation(b.name));assert.equal(symbol.name,name);assert.ok(!symbol.getJsDocTags(checker).some(t=>['deprecated','docs-private','breaking-change','experimental'].includes(t.name)));symbols.push({name,declarations:symbol.getDeclarations().map(d=>({sha256:hash(d.getText(d.getSourceFile()))}))});}
  const calls=[];function visit(n){if(ts.isCallExpression(n)||ts.isNewExpression(n)){const signature=checker.getResolvedSignature(n),d=signature?.declaration;if(d?.getSourceFile().fileName.includes('/node_modules/@angular/')){assert.ok(!signature.getJsDocTags().some(t=>['deprecated','docs-private','breaking-change'].includes(t.name)),'unsupported signature '+n.expression.getText(source));calls.push({expression:n.expression.getText(source),declaration_sha256:hash(d.getText(d.getSourceFile()))});if(n.expression.kind===ts.SyntaxKind.SuperKeyword){const parameter=d.parameters[0],type=checker.getNonNullableType(checker.getTypeAtLocation(parameter)),option=checker.getPropertyOfType(type,'enableLongStackTrace');assert.ok(option);assert.ok(!option.getJsDocTags(checker).some(t=>['deprecated','docs-private','breaking-change'].includes(t.name)));}}}ts.forEachChild(n,visit);}visit(source);
  assert.ok(calls.some(c=>c.expression==='super'));assert.ok(calls.filter(c=>c.expression==='inject').length>=9);
  const negative=join(model.root,'remaining-core-negative.ts');writeFileSync(negative,"import {NgZone} from '@angular/core';import {inputValue,MatLegacyFormField} from './remaining-core-scopes';declare const zone:NgZone;const wrongReturn:number=zone.runOutsideAngular(()=>'wrong');const missingNull:MatLegacyFormField=inputValue();\n");const badProgram=ts.createProgram([negative],options),badDiagnostics=ts.getPreEmitDiagnostics(badProgram);assert.deepEqual(badDiagnostics.map(d=>d.code),[2322,2322]);
  result.type_subjects.push({line:model.line,Core:model.packages.get('@angular/core').version,strict:true,skipLibCheck:false,diagnostics:0,negative_type_controls:2,negative_diagnostic_codes:badDiagnostics.map(d=>d.code),public_symbols:symbols,nondeprecated_selected_calls:calls,actual_MockNgZone_constructor_and_overrides_compiled:true,actual_boolean_Input_fields_compiled:true,actual_optional_nonce_parameter_compiled:true,actual_RAF_member_compiled:true,other_component_graphs_are_protocols:true});
  const zone=installNgZonePublicSubject(model,root),runtime=join(model.root,'remaining-core-scopes.mjs'),emit=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText;writeFileSync(runtime,emit(scopes));const worker=join(model.root,'remaining-core-worker.mjs');writeFileSync(worker,read('tests/remaining_core_caller_roles_subject.mjs'));
  for(const mode of ['development','production']){const child=spawnSync(process.execPath,[worker,model.line,mode],{cwd:model.root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});assert.equal(child.status,0,(child.stdout+'\n'+child.stderr).slice(-10000));const body=JSON.parse(child.stdout.trim().split('\n').at(-1));result.runtime_subjects.push({...body,zone,borrowed:model.borrowed});}
  const mutations=[['wrong-input-optionality',scopes.replace(s.input_inject,s.input_inject.replace(', {optional: true}',''))],['lost-locale-forwarding',scopes.replace('return inject(LOCALE_ID);',"return 'en-US';")],['mock-apply-args-lost',scopes.replace('applyArgs ?? []','[]')],['wrong-media-fallback',scopes.replace("return 'enabled';","return 'di-disabled';")],['RAF-escaped-zone',scopes.replace('this._ngZone.runOutsideAngular','this._ngZone.run')]];
  const positive=readFileSync(runtime);for(const[id,text]of mutations){assert.notEqual(hash(text),hash(scopes));try{writeFileSync(runtime,emit(text));const child=spawnSync(process.execPath,[worker,model.line,'development'],{cwd:model.root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});assert.equal(child.signal,null,'fault worker timed out');assert.notEqual(child.status,0,'undetected fault '+id);assert.match(child.stderr,/AssertionError|NG0201|No provider/,'fault failed for unrelated reason');result.runtime_fault_controls.push({line:model.line,id,rejected:true});}finally{writeFileSync(runtime,positive);}}
 }
 const tagged=result.runtime_subjects.find(s=>s.line==='original'&&s.mode==='development');for(const subject of result.runtime_subjects){assert.equal(isDeepStrictEqual(subject.boolean_cases,tagged.boolean_cases),true,'public boolean transform changed');assert.equal(isDeepStrictEqual(subject.cases,tagged.cases),true,'selected caller observations changed');}
 const capsule=JSON.parse(read('compatibility/rc/material-public-subjects.json')),zone=JSON.parse(read('compatibility/rc/ng-zone-public-subjects.json')),paths=[...new Set(['compatibility/rc/material-public-subjects.json','compatibility/rc/element-ref-public-subjects.json','scripts/material-public-subjects.mjs','scripts/ng-zone-public-subjects.mjs','tests/remaining_core_caller_roles_public_probe.mjs','tests/remaining_core_caller_roles_subject.mjs',...prior.sources.map(m=>m.path),...prior.evidence.map(m=>m.path),...capsule.subjects.flatMap(s=>s.members.map(m=>m.path)),...zone.subjects.flatMap(s=>s.members.map(m=>m.path))])];result.inputs=paths.map(path=>({path,sha256:hash(read(path))}));result.scope='Finite Core API and caller contracts. Exact9 inject expressions and named owned helper scopes,MockNgZone test-only subclass,Input transform fields,locale forwarding,dev-mode API and optional nonce parameter. Tagged locale body is authenticated; non-Core tokens/values remain protocols. No full legacy node/factory/native dialog/checkbox/pseudo-checkbox/input/menu/snack/spinner,default root nonce selection,all motion/CSP security,packed/AOT or full consumer/Node/RxJS/compiler/peer-floor clearance.';
  assert.ok(process.argv[2]);writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:result.line,strict_models:3,genuine_Core_Node_Zone_contexts:6,boolean_cases_each:21,runtime_faults_rejected:result.runtime_fault_controls.length,scope:'finite Core callers only',full_floor_qualified:false}));
}finally{loaded.dispose();}

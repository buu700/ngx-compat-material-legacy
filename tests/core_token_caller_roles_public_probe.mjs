/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact public declarations and current caller snippets in three isolated peer models. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {prepareMaterialPublicSubjects} from '../scripts/material-public-subjects.mjs';
import {coreTokenSourceContract,coreTokenCallerPrior} from '../scripts/core-token-caller-roles.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),ts=createRequire(import.meta.url)('typescript'),source=coreTokenSourceContract({root}),prior=coreTokenCallerPrior({root}),loaded=prepareMaterialPublicSubjects(root);
const parts=`import {ProviderToken,Renderer2,assertInInjectionContext,inject} from '@angular/core';\nexport ${source.ambient}\nexport const manualRenderer:Pick<Renderer2,'listen'>=${source.fallback};\nexport class TaggedFocus {${source.tagged_force_focus}}`;
const protocolParents=['CdkHeaderRowDef','CdkFooterRowDef','CdkRowDef'];
const rowSource=`import {IterableDiffers,TemplateRef,Optional,Inject,inject} from '@angular/core';\nimport {constructWithPublicDependencies} from './constructor-helper';\nclass CdkTable {}\n${protocolParents.map(name=>`class ${name} { _table?:any; template=inject(TemplateRef); differs=inject(IterableDiffers); }`).join('\n')}\n${source.constructors.map((c,i)=>`export class ${c.name}${i===2?'<T>':''} extends ${protocolParents[i]} {\n// @ts-expect-error TS2377: original owned constructor deliberately returns its object.\n${c.text}\n}`).join('\n')}`;
// The reference method needs its original receiver fields; its runtime body stays untouched.
const strictParts=parts.replace(`export class TaggedFocus {${source.tagged_force_focus}}`,'');
const contract=`import {ProviderToken,Renderer2,IterableDiffers,EventEmitter,InjectionToken} from '@angular/core';
import type {MatMenuPanel} from './menu-panel';
import {ambientService,manualRenderer} from './caller-parts';
export function stable(token:ProviderToken<object>,renderer:Pick<Renderer2,'listen'>,element:HTMLElement,differs:IterableDiffers,panel:MatMenuPanel){
 const value:object|null=ambientService(token), optionalRenderer:Renderer2|null=ambientService(Renderer2);
 const dispose:()=>void=renderer.listen(element,'blur',()=>{});
 const registryToken:ProviderToken<IterableDiffers>=IterableDiffers;
 const close:EventEmitter<void|'click'|'keydown'|'tab'>=panel.close;
 close.emit();close.emit('click');close.emit('keydown');close.emit('tab');
 return {value,optionalRenderer,dispose,registryToken,close,manualRenderer,differs};
}
`;
const negative=`import {EventEmitter} from '@angular/core';import type {MatMenuPanel} from './menu-panel';
declare let panel:MatMenuPanel;
panel.close=new EventEmitter<void|'click'|'keydown'|'tab'>();
panel.close.emit('invalid');
declare const signalLike:{emit(value?:void|'click'|'keydown'|'tab'):void};
const invalid:MatMenuPanel['close']=signalLike;
`;
const result={schema_version:1,line:prior.line,node:process.version,typescript:ts.version,type_subjects:[],runtime_subjects:[],runtime_fault_controls:[],inputs:[],tagged_reference:source.tagged_reference,actual_native_packed_or_full_floor_qualified:false,g11_claim:'not-passed'};
try{
 for(const model of loaded.models){
  // This existing Core namespace capsule does not contain Material dialog/menu
  // declaration closures. Compile only the exact selected Core property members;
  // do not stub the missing Material peers or claim full interface compilation.
  const rendererContract=`import {Renderer2} from '@angular/core';export interface RendererContext {${source.renderer_slot}}`;
  const menuContract=`import type {EventEmitter} from '@angular/core';export interface MatMenuPanel {${source.menu_close}}`;
  const files={'caller-parts.ts':strictParts,'constructor-helper.ts':source.helper,'renderer-context.ts':rendererContract,'menu-panel.ts':menuContract,'row-protocols.ts':rowSource,'contract.ts':contract};for(const [name,text]of Object.entries(files))writeFileSync(join(model.root,name),text);
  const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,skipLibCheck:false,noEmit:true,experimentalDecorators:true,types:[]},program=ts.createProgram(Object.keys(files).map(p=>join(model.root,p)),options),diagnostics=ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>model.root,getNewLine:()=> '\n'}));
  const checker=program.getTypeChecker(),file=program.getSourceFile(join(model.root,'contract.ts')),bindings=file.statements[0].importClause.namedBindings.elements,publicSymbols=[];
  for(const name of ['ProviderToken','Renderer2','IterableDiffers','EventEmitter']){const binding=bindings.find(b=>b.name.text===name),symbol=checker.getAliasedSymbol(checker.getSymbolAtLocation(binding.name));assert.equal(symbol.name,name);assert.ok(symbol.getDeclarations().length);assert.ok(!symbol.getJsDocTags(checker).some(t=>['deprecated','docs-private','breaking-change','experimental'].includes(t.name)));publicSymbols.push({name,declarations:symbol.getDeclarations().map(d=>({sha256:hash(d.getText(d.getSourceFile()))}))});}
  const renderer=checker.getAliasedSymbol(checker.getSymbolAtLocation(bindings.find(b=>b.name.text==='Renderer2').name)),listen=checker.getPropertyOfType(checker.getDeclaredTypeOfSymbol(renderer),'listen');assert.ok(listen);assert.ok(!listen.getJsDocTags(checker).some(t=>['deprecated','docs-private','breaking-change'].includes(t.name)));assert.ok(listen.getDeclarations().every(d=>!d.modifiers?.some(m=>[ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.ProtectedKeyword].includes(m.kind))));
  const publicCalls=[];for(const name of ['caller-parts.ts','contract.ts','constructor-helper.ts']){const f=program.getSourceFile(join(model.root,name));function visit(n){if(ts.isCallExpression(n)){const signature=checker.getResolvedSignature(n),d=signature?.declaration;if(d?.getSourceFile().fileName.includes('/node_modules/@angular/')){assert.ok(!signature.getJsDocTags().some(t=>['deprecated','breaking-change'].includes(t.name)),'unsupported call '+n.expression.getText(f));publicCalls.push({expression:n.expression.getText(f),declaration_sha256:hash(d.getText(d.getSourceFile()))});}}ts.forEachChild(n,visit);}visit(f);}
  const bad=join(model.root,'negative.ts');writeFileSync(bad,negative);const negativeProgram=ts.createProgram([bad],options),negativeDiagnostics=ts.getPreEmitDiagnostics(negativeProgram);assert.deepEqual(negativeDiagnostics.map(d=>d.code).sort(),[2345,2540,2740]);
  result.type_subjects.push({line:model.line,Core:model.packages.get('@angular/core').version,strict:true,skipLibCheck:false,diagnostics:0,negative_type_controls:3,negative_diagnostic_codes:negativeDiagnostics.map(d=>d.code),public_nondeprecated_symbols:publicSymbols,public_calls:publicCalls,listen_returns_disposer:true,exact_renderer_slot_and_menu_close_members_compiled:true,full_actual_initial_focus_and_menu_interfaces_compiled:false,parent_classes_are_protocols:true});
  const transpile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}}).outputText;
  writeFileSync(join(model.root,'caller-parts.mjs'),transpile(parts));writeFileSync(join(model.root,'constructor-helper.mjs'),transpile(source.helper));writeFileSync(join(model.root,'row-protocols.mjs'),transpile(rowSource).replace("'./constructor-helper'","'./constructor-helper.mjs'"));writeFileSync(join(model.root,'dialog-initial-focus.mjs'),transpile(source.focus));writeFileSync(join(model.root,'subject.mjs'),read('tests/core_token_caller_roles_subject.mjs'));
  for(const mode of ['development','production']){const child=spawnSync(process.execPath,[join(model.root,'subject.mjs'),mode],{cwd:model.root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});assert.equal(child.status,0,(child.stdout+'\n'+child.stderr).slice(-9000));const runtime=JSON.parse(child.stdout.trim().split('\n').at(-1));result.runtime_subjects.push({line:model.line,...runtime});}
  const faults=[
   ['required-instead-of-optional-token','caller-parts.mjs',transpile(parts.replace('return inject(token, {optional: true});','return inject(token);'))],
   ['missing-mousedown-disposer','dialog-initial-focus.mjs',transpile(source.focus.replace('stopMouseDown();',''))],
   ['wrong-supplied-differ-value','row-protocols.mjs',transpile(rowSource.replace('{provide: IterableDiffers, useValue: differs}','{provide: IterableDiffers, useValue: undefined}')).replace("'./constructor-helper'","'./constructor-helper.mjs'")],
   ['manual-listener-leaked','caller-parts.mjs',transpile(parts.replace('return () => target.removeEventListener(event, callback);','return () => {};'))],
  ];
  for(const [id,name,mutant]of faults){const path=join(model.root,name),before=readFileSync(path);assert.notEqual(hash(mutant),hash(before));try{writeFileSync(path,mutant);const child=spawnSync(process.execPath,[join(model.root,'subject.mjs'),'development'],{cwd:model.root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});assert.equal(child.signal,null,'fault worker timed out');assert.notEqual(child.status,0,'undetected fault '+id);assert.match(child.stderr,/AssertionError|NG0201|No provider/,'fault failed for unrelated reason '+id);result.runtime_fault_controls.push({line:model.line,id,rejected:true});}finally{writeFileSync(path,before);}}
 }
 const tagged=result.runtime_subjects.find(s=>s.line==='original'&&s.mode==='development');for(const s of result.runtime_subjects){assert.equal(isDeepStrictEqual(s.cases,tagged.cases),true);assert.equal(isDeepStrictEqual(s.renderer_cases,tagged.renderer_cases),true);}
 const capsule=JSON.parse(read('compatibility/rc/material-public-subjects.json')),paths=[...new Set(['compatibility/rc/material-public-subjects.json','compatibility/rc/element-ref-public-subjects.json','scripts/material-public-subjects.mjs','tests/core_token_caller_roles_public_probe.mjs','tests/core_token_caller_roles_subject.mjs',...prior.sources.map(m=>m.path),source.tagged_reference.path,...capsule.subjects.flatMap(s=>s.members.map(m=>m.path))])];result.inputs=paths.map(path=>({path,sha256:hash(read(path))}));result.borrowed_runtime=loaded.models.map(m=>({line:m.line,borrowed:m.borrowed}));result.scope='Public Core type/token and exact finite caller contracts only. Genuine Core with explicit table-parent,DOM,renderer and zone protocols; no actual full peer component,concrete renderer,native,packed,AOT or advertised consumer/compiler/Node/RxJS/full-peer-floor qualification. Existing EventEmitter behavior evidence is reused separately.';
 assert.ok(process.argv[2]);writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:result.line,strict_models:3,negative_type_controls:9,public_Core_runtime_contexts:6,finite_runtime_cases:72,runtime_fault_controls_rejected:result.runtime_fault_controls.length,full_floor_qualified:false}));
}finally{loaded.dispose();}

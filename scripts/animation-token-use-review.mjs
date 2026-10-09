/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Stable public animation-mode token identity and actual owned policy callers. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {injectionTokenSubjects} from './injection-token-use-review.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),rootDefault=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=b=>createHash('sha256').update(b).digest('hex'),moduleName='@angular/core',name='ANIMATION_MODULE_TYPE';
const deltaFiles=['internal/testing/owned-animation-modules.ts','legacy-core/pseudo-checkbox/pseudo-checkbox.ts'];
const printer=ts.createPrinter({removeComments:true}),print=(n,s)=>printer.printNode(ts.EmitHint.Unspecified,n,s).trim();
const emit=t=>ts.transpileModule(t,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None,experimentalDecorators:true,emitDecoratorMetadata:false,removeComments:true}}).outputText;
function parse(p,t){const s=ts.createSourceFile(p,t,ts.ScriptTarget.Latest,true);assert.equal(s.parseDiagnostics.length,0);return s;}
function one(a,label){assert.equal(a.length,1,label);return a[0];}
function stable(n){assert.ok(!ts.getJSDocTags(n).some(t=>['deprecated','docs-private','experimental','breaking-change'].includes(t.tagName.text)),'unstable animation token declaration');}
export async function animationTokenSubjects(root=rootDefault){
 const loaded=await injectionTokenSubjects(root);
 try{for(const model of loaded.models){
  const files=[...model.sources].filter(([p])=>p.endsWith('.mjs')||p.endsWith('.d.ts')).map(([p,t])=>parse(p,t));
  const entries=ext=>files.filter(s=>s.fileName.endsWith(ext)).flatMap(s=>s.statements.filter(ts.isVariableStatement).flatMap(n=>n.declarationList.declarations).filter(n=>n.name.text===name).map(n=>({n,s})));
  const d=one(entries('.d.ts'),'whole public animation token declaration');stable(d.n);stable(d.n.parent.parent);assert.ok(d.n.parent.parent.getFullText(d.s).includes('@publicApi'));
  const type=d.n.type;assert.ok(ts.isTypeReferenceNode(type)&&type.typeName.text==='InjectionToken'&&type.typeArguments.length===1);const union=type.typeArguments[0];assert.ok(ts.isUnionTypeNode(union)&&union.types.length===2);const values=union.types.map(t=>{assert.ok(ts.isLiteralTypeNode(t)&&ts.isStringLiteral(t.literal));return t.literal.text;}).sort();assert.deepEqual(values,['BrowserAnimations','NoopAnimations']);
  const r=one(entries('.mjs'),'whole public animation token initializer'),init=r.n.initializer;assert.ok(ts.isNewExpression(init)&&init.expression.text==='InjectionToken'&&init.arguments.length===1,'no ambient token factory/options');const original=model.subject.line==='original',expression=print(init.arguments[0],r.s);assert.equal(expression,original?"'AnimationModuleType'":"typeof ngDevMode !== 'undefined' && ngDevMode ? 'AnimationModuleType' : ''");
  const actual=model.runtime[name];assert.equal(actual instanceof model.runtime.InjectionToken,true);assert.equal(actual.ngMetadataName,'InjectionToken');assert.equal(actual.ɵprov,undefined,'token unexpectedly acquired an automatic provider');
  model.animation_token_contract={declaration:print(d.n,d.s),declaration_jsdoc:d.n.parent.parent.getFullText(d.s).slice(0,d.n.parent.parent.getFullText(d.s).indexOf(d.n.parent.parent.getText(d.s))),supported_values:values,initializer:print(r.n,r.s),description_expression:expression,production_description:original?'AnimationModuleType':'',current_description:actual.toString(),no_automatic_provider:true,public_token_instance:true,injection_token_contract_revalidated:true};
 }
 return loaded;}catch(e){loaded.dispose();throw e;}
}
export function exerciseAnimationToken(core,Token=core.ANIMATION_MODULE_TYPE){
 const cases=[];assert.equal(Token,core.ANIMATION_MODULE_TYPE,'public constant identity lost');assert.equal(Token instanceof core.InjectionToken,true);assert.equal(Token.ɵprov,undefined);cases.push('genuine-public-token-identity-and-no-automatic-provider');
 const lookalike=new core.InjectionToken('AnimationModuleType');assert.notEqual(Token,lookalike);const absent=core.Injector.create({providers:[]});try{assert.equal(core.runInInjectionContext(absent,()=>core.inject(Token,{optional:true})),null);assert.throws(()=>absent.get(Token));}finally{absent.destroy();}cases.push('unconfigured-token-remains-optional-missing');
 for(const value of ['NoopAnimations','BrowserAnimations']){const injector=core.Injector.create({providers:[{provide:Token,useValue:value}]});try{assert.equal(injector.get(Token),value);assert.equal(core.runInInjectionContext(injector,()=>core.inject(Token,{optional:true})),value);assert.equal(core.runInInjectionContext(injector,()=>core.inject(lookalike,{optional:true})),null);}finally{injector.destroy();}cases.push('actual-mode-provider-'+value);}
 const parent=core.Injector.create({providers:[{provide:Token,useValue:'NoopAnimations'}]}),child=core.Injector.create({parent,providers:[{provide:Token,useValue:'BrowserAnimations'}]}),inherited=core.Injector.create({parent,providers:[]});try{assert.equal(child.get(Token),'BrowserAnimations');assert.equal(inherited.get(Token),'NoopAnimations');assert.equal(parent.get(Token),'NoopAnimations');}finally{child.destroy();inherited.destroy();parent.destroy();}cases.push('provider-parent-inheritance-and-local-override');
 const result=new core.InjectionToken('mode-result'),injector=core.Injector.create({providers:[{provide:Token,useValue:'NoopAnimations'},{provide:result,useFactory:mode=>mode,deps:[[new core.Optional(),new core.Inject(Token)]]}]});try{assert.equal(injector.get(result),'NoopAnimations');}finally{injector.destroy();}cases.push('actual-optional-Inject-token-explicit-factory-dependency');
 const optional=core.Injector.create({providers:[{provide:result,useFactory:mode=>mode,deps:[[new core.Optional(),new core.Inject(Token)]]}]});try{assert.equal(optional.get(result),null);}finally{optional.destroy();}cases.push('missing-optional-mode-explicit-factory-dependency');
 assert.throws(()=>core.inject(Token));cases.push('public-injection-context-restored-after-controls');
 return {cases,native_application_node_injector_or_animation_engine_executed:false};
}
export function exerciseOwnedAnimationPolicy(root,core,readSource,change){
 const path='projects/ngx-material-legacy/legacy-core/internal/legacy-animations.ts',text=readSource?readSource(path):readFileSync(join(root,path),'utf8'),s=parse(path,text);
 const selected=['getLegacyAnimationsState','legacyAnimationsDisabled'].map(n=>one(s.statements.filter(x=>ts.isFunctionDeclaration(x)&&x.name?.text===n),'whole owned animation policy '+n).getText(s).replace(/^export\s+/,''));
 const media=new core.InjectionToken('MediaMatcherProtocol'),material=new core.InjectionToken('MaterialAnimationsProtocol'),override=new core.InjectionToken('LegacyTestOverrideProtocol');
 const functions=new Function('inject','assertInInjectionContext','ANIMATION_MODULE_TYPE','MediaMatcher','MATERIAL_ANIMATIONS','LEGACY_ANIMATIONS_TEST_OVERRIDE',emit(selected.join('\n')+'\nreturn {getLegacyAnimationsState,legacyAnimationsDisabled};'))(core.inject,core.assertInInjectionContext,change?.token??core.ANIMATION_MODULE_TYPE,media,material,override);
 const cases=[];function check(id,{mode,disabled=false,reduced=false,throwMedia=false,missingMedia=false,missingMaterial=false,testOverride}={},expected,expectedMediaReads){let reads=0;const providers=[];if(!missingMaterial)providers.push({provide:material,useValue:{animationsDisabled:disabled}});if(mode!==undefined)providers.push({provide:core.ANIMATION_MODULE_TYPE,useValue:mode});if(!missingMedia)providers.push({provide:media,useValue:{matchMedia(query){reads++;assert.equal(query,'(prefers-reduced-motion)');if(throwMedia)throw new Error('media-protocol');return {matches:reduced};}}});if(testOverride!==undefined)providers.push({provide:override,useValue:testOverride});const injector=core.Injector.create({providers});try{assert.equal(core.runInInjectionContext(injector,functions.getLegacyAnimationsState),expected);assert.equal(reads,expectedMediaReads);const isDisabled=core.runInInjectionContext(injector,functions.legacyAnimationsDisabled);assert.equal(isDisabled,expected!=='enabled');}finally{injector.destroy();}cases.push(id);}
 check('unconfigured-mode-ordinary-media-enabled',{},'enabled',1);
 check('missing-Material-config-optional-fallback',{missingMaterial:true},'enabled',1);
 check('Noop-token-disables-without-media-read',{mode:'NoopAnimations'},'di-disabled',0);
 check('Browser-token-and-ordinary-media-enabled',{mode:'BrowserAnimations'},'enabled',1);
 check('material-disable-precedes-Browser-token',{mode:'BrowserAnimations',disabled:true},'di-disabled',0);
 check('reduced-motion-with-Browser-token',{mode:'BrowserAnimations',reduced:true},'reduced-motion',1);
 check('Noop-precedes-media-failure',{mode:'NoopAnimations',throwMedia:true},'di-disabled',0);
 check('missing-media-enabled-fallback',{missingMedia:true},'enabled',0);
 check('throwing-media-enabled-fallback',{throwMedia:true},'enabled',1);
 check('explicit-test-override-precedence',{mode:'NoopAnimations',disabled:true,testOverride:'enabled'},'enabled',0);
 check('null-test-override-falls-through',{mode:'NoopAnimations',testOverride:null},'di-disabled',0);
 check('explicit-reduced-test-override',{testOverride:'reduced-motion'},'reduced-motion',0);
 assert.equal(functions.legacyAnimationsDisabled(),false);cases.push('manual-construction-outside-DI-enabled-default');
 return {cases,source_functions_sha256:hash(selected.join('\n')),actual_core_token_and_injection:true,only_export_modifier_removed_for_function_execution:true,material_config_and_media_are_protocols:true,native_matchMedia_render_motion_or_application_executed:false};
}
export function compileAnimationTokenTypes(models,compilerRoot){
 const path=compilerRoot?join(compilerRoot,'lib/typescript.js'):require.resolve('typescript'),compiler=require(path),receipts=[];
 for(const m of models){const file=join(dirname(dirname(dirname(m.package_root))),'animation-token-consumer.ts'),code=`import {ANIMATION_MODULE_TYPE,InjectionToken,Inject,Optional,inject} from '@angular/core';
type Mode='BrowserAnimations'|'NoopAnimations';const token:InjectionToken<Mode>=ANIMATION_MODULE_TYPE;const exact:typeof ANIMATION_MODULE_TYPE=token;const value:Mode=inject(ANIMATION_MODULE_TYPE);const maybe:Mode|null=inject(ANIMATION_MODULE_TYPE,{optional:true});
class Fixture{constructor(@Optional() @Inject(ANIMATION_MODULE_TYPE) mode?:string){}}
const noop:Mode='NoopAnimations';const browser:Mode='BrowserAnimations';
// @ts-expect-error Unknown mode is not public token value.
const unknown:Mode='OtherAnimations';
// @ts-expect-error Optional injection includes null.
const required:Mode=inject(ANIMATION_MODULE_TYPE,{optional:true});
// @ts-expect-error Public mode injection is a string.
const numeric:number=inject(ANIMATION_MODULE_TYPE);
// @ts-expect-error A token cannot be replaced by a name string.
const byName:typeof ANIMATION_MODULE_TYPE='AnimationModuleType';
`;writeFileSync(file,code);const program=compiler.createProgram([file],{target:compiler.ScriptTarget.ES2022,module:compiler.ModuleKind.ESNext,moduleResolution:compiler.ModuleResolutionKind.Bundler,experimentalDecorators:true,strict:true,skipLibCheck:false,noEmit:true,lib:['lib.es2022.d.ts','lib.dom.d.ts']}),diagnostics=compiler.getPreEmitDiagnostics(program);assert.equal(diagnostics.length,0,compiler.formatDiagnostics(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>dirname(file),getNewLine:()=> '\n'}));receipts.push({line:m.subject.line,negative_checks:4,fixture_sha256:hash(code)});}
 return {compiler:compiler.version,compiler_source_sha256:hash(readFileSync(path)),subjects:receipts};
}
export async function reviewAnimationTokenUses({root=rootDefault,subjects,compilerRoot,readSource,skipDiagnostics=false}={}){
 const seed=readFileSync(join(root,'compatibility/f10/authored-dependency-inventory-seed.json'));assert.equal(hash(seed),'3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');const uses=JSON.parse(seed).symbol_uses.filter(u=>u.module===moduleName&&u.symbol===name);assert.equal(uses.length,22);const loaded=subjects??await animationTokenSubjects(root),own=!subjects,read=p=>readSource?readSource(p):readFileSync(join(root,p),'utf8');
 try{
  const paths=execFileSync('rg',['--files','projects/ngx-material-legacy','-g','*.ts','-g','!*.spec.ts'],{cwd:root,encoding:'utf8'}).trim().split('\n'),actual=paths.filter(p=>parse(p,read(p)).statements.some(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text===moduleName&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)&&n.importClause.namedBindings.elements.some(i=>(i.propertyName||i.name).text===name)));assert.equal(actual.length,24);
  const options={noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true},host=ts.createCompilerHost(options),oldRead=host.readFile.bind(host),base=join(root,'projects/ngx-material-legacy');host.readFile=p=>p.startsWith(base+'/')?read('projects/ngx-material-legacy/'+p.slice(base.length+1)):oldRead(p);const program=ts.createProgram(actual.map(p=>join(root,p)),options,host),checker=program.getTypeChecker(),cases=[];
  function coreImport(node,publicName){const symbol=checker.getSymbolAtLocation(node);return symbol?.declarations?.some(i=>ts.isImportSpecifier(i)&&(i.propertyName||i.name).text===publicName&&i.parent.parent.parent.moduleSpecifier.text===moduleName);}
  for(const path of actual){const s=program.getSourceFile(join(root,path)),file=path.slice('projects/ngx-material-legacy/'.length),imports=s.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text===moduleName&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)).flatMap(n=>n.importClause.namedBindings.elements.filter(i=>(i.propertyName||i.name).text===name)),imported=one(imports,'missing/ambiguous animation token import'),symbol=checker.getSymbolAtLocation(imported.name);assert.ok(symbol.declarations.length===1&&symbol.declarations[0]===imported,'animation token import shadowed');const references=[];
   function visit(n){if(ts.isIdentifier(n)&&n!==imported.name&&n!==imported.propertyName&&checker.getSymbolAtLocation(n)===symbol){assert.ok(!imported.isTypeOnly&&!imported.parent.parent.isTypeOnly,'runtime animation token imported type only');const p=n.parent,line=s.getLineAndCharacterOfPosition(n.getStart(s)).line+1;let ref;
    if(ts.isCallExpression(p)&&coreImport(p.expression,'Inject')){assert.equal(p.arguments.length,1);assert.equal(p.arguments[0]===n,true);assert.ok(ts.isDecorator(p.parent)&&ts.isParameter(p.parent.parent)&&ts.isConstructorDeclaration(p.parent.parent.parent),'unreviewed token injection role');const parameter=p.parent.parent,ctor=parameter.parent,cls=ctor.parent;assert.ok(ts.isClassDeclaration(cls)&&cls.name);const optional=parameter.modifiers?.some(d=>ts.isDecorator(d)&&ts.isCallExpression(d.expression)&&coreImport(d.expression.expression,'Optional'));assert.equal(optional,true,'mode injection must remain optional');ref={line,role:'constructor-token-annotation',expression:p.getText(s),target_class:cls.name.text,parameter:parameter.name.getText(s),index:ctor.parameters.indexOf(parameter),optional:true};
    }else if(ts.isCallExpression(p)&&coreImport(p.expression,'inject')){assert.equal(file,'legacy-core/internal/legacy-animations.ts');assert.equal(p.arguments.length,2);assert.equal(p.arguments[0]===n,true);assert.ok(ts.isObjectLiteralExpression(p.arguments[1]));assert.equal(p.arguments[1].properties.length,1);const opt=p.arguments[1].properties[0];assert.ok(ts.isPropertyAssignment(opt)&&opt.name.text==='optional'&&opt.initializer.kind===ts.SyntaxKind.TrueKeyword);assert.ok(ts.isBinaryExpression(p.parent)&&p.parent.operatorToken.kind===ts.SyntaxKind.EqualsEqualsEqualsToken&&ts.isStringLiteral(p.parent.right)&&p.parent.right.text==='NoopAnimations');ref={line,role:'owned-policy-inject',expression:p.getText(s),optional:true};
    }else if(ts.isPropertyAssignment(p)&&p.name.text==='provide'&&p.initializer===n){assert.equal(file,'internal/testing/owned-animation-modules.ts');assert.ok(ts.isObjectLiteralExpression(p.parent));const value=one(p.parent.properties.filter(v=>v.name?.text==='useValue'),'owned mode provider value');assert.ok(ts.isPropertyAssignment(value)&&ts.isStringLiteral(value.initializer)&&['NoopAnimations','BrowserAnimations'].includes(value.initializer.text));ref={line,role:'owned-test-provider',expression:p.parent.getText(s),mode:value.initializer.text};
    }else assert.fail('unreviewed animation token role');references.push(ref);}ts.forEachChild(n,visit);}visit(s);assert.ok(references.length);cases.push({file,module:moduleName,symbol:name,local_name:imported.name.text,frozen_use:uses.some(u=>u.file===file),candidate_source_sha256:hash(s.text),references});
  }
  assert.equal(cases.length,24);assert.deepEqual(cases.filter(c=>!c.frozen_use).map(c=>c.file).sort(),deltaFiles);assert.equal(cases.flatMap(c=>c.references).length,28);assert.equal(cases.flatMap(c=>c.references).filter(r=>r.role==='constructor-token-annotation').length,25);
  const behaviors=[],policy=[],authored=[];if(!skipDiagnostics)for(const m of loaded.models){const core=m.runtime;behaviors.push({line:m.subject.line,...exerciseAnimationToken(core)});policy.push({line:m.subject.line,...exerciseOwnedAnimationPolicy(root,core,read)});const receipts=[];for(const c of cases)for(const r of c.references){if(r.role==='constructor-token-annotation'){const annotation=new Function('Inject',c.local_name,emit('return '+r.expression+';'))(core.Inject,core.ANIMATION_MODULE_TYPE);class Target{}annotation(Target,undefined,r.index);core.Optional()(Target,undefined,r.index);assert.equal(Target.__parameters__[r.index][0].token,core.ANIMATION_MODULE_TYPE);assert.equal(Target.__parameters__[r.index][1].ngMetadataName,'Optional');receipts.push({file:c.file,role:r.role,index:r.index,actual_public_token_identity:true,metadata_target_is_protocol:true});}else if(r.role==='owned-test-provider'){const provider=new Function(c.local_name,emit('return '+r.expression+';'))(core.ANIMATION_MODULE_TYPE);assert.equal(provider.provide,core.ANIMATION_MODULE_TYPE);const injector=core.Injector.create({providers:[provider]});try{assert.equal(injector.get(core.ANIMATION_MODULE_TYPE),r.mode);}finally{injector.destroy();}receipts.push({file:c.file,role:r.role,actual_provider_replay:true,mode:r.mode});}else receipts.push({file:c.file,role:r.role,whole_owned_function_executed_in_policy_controls:true});}authored.push({line:m.subject.line,constructor_annotations:25,test_providers:2,policy_inject:1,cases:receipts});}
  const line=JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';return {schema_version:1,line,frozen_uses:22,current_uses:24,current_delta_uses:2,node:process.version,binding_parser:ts.version,cases,behaviors,owned_policy:policy,authored_context:authored,rxjs:loaded.rxjs,source_override_used:!!readSource,subjects:loaded.models.map(m=>({subject:{...m.subject,members:undefined},animation_token_contract:m.animation_token_contract})),type_compilation:skipDiagnostics?null:compileAnimationTokenTypes(loaded.models,compilerRoot),limits:['Stable public token declaration/identity and explicit DI provider/constructor metadata boundary only; full authored components/node/application factories/engine/native lifecycle/rendering/AOT/packed/floors remain open.','Whole owned motion-policy functions use genuine core token/DI, but Material configuration and MediaMatcher are explicit protocols. No genuine Material token namespace/media/browser/reduced-motion/native global-provider qualification inferred.','Current production debug description can be empty unlike historical label; object/token identity and supported modes remain unchanged. Production module-loading control is separately recorded.'],g11_claim:'not-passed'};
 }finally{if(own)loaded.dispose();}
}

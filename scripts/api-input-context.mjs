/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export {settleInputDisabled} from './api-input-disabled-contract.mjs';
import {qualifyCombinedArtifactSubject,API_COMBINED_D70_SHA} from './api-combined-d70-image.mjs';
import {inputDisabledProof} from './api-input-disabled-contract.mjs';
import {API_NODE_COMBINED_SHA} from './api-node-combined-artifact-successor.mjs';
import {API_V8_ARTIFACT_SHA} from './api-v8-artifact-successor.mjs';
import {API_HINT_ID_ARTIFACT_SHA,receiptArchiveMatches} from './api-hint-id-artifact-successor.mjs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {originalCompilerFactoryContext,originalContextDi} from './api-original-factory-contexts.mjs';
const require=createRequire(import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex'),flags=['optional','self','skipSelf','host'];
function combinedReceiptMatches(context,expected){try{return Boolean(context?.tarball&&qualifyCombinedArtifactSubject(readFileSync(context.tarball),context.packageRoot)?.artifact_sha256===expected);}catch{return false;}}
export const INPUT_SYMBOL='legacy-input/primary/MatLegacyInput';
export const INPUT_CONSTRUCTION_PROFILE='input-angular-di-construction-v1';
export const INPUT_ORIGINAL_CONSTRUCTOR='public constructor(ElementRef<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>,Platform,NgControl,NgForm,FormGroupDirective,ErrorStateMatcher,any,AutofillMonitor,NgZone,MatFormField?)';
export function approvedInputSignatureRecord(symbol,packed,record,read=file=>readFileSync(fileURLToPath(new URL('../'+file,import.meta.url)))){
 if(symbol?.symbol_id!==INPUT_SYMBOL||record?.construction_contract!==INPUT_CONSTRUCTION_PROFILE)return false;
 if(!isDeepStrictEqual(Object.keys(record).sort(),['symbol_id','classification','historical_signature','owned_signature','construction_contract','rationale'].sort()))return false;
 inputContract(symbol);
 const bytes=read('compatibility/rc/api/input-construction-consumer-decision.json');assert.equal(sha(bytes),'040a15b9c0b1b6c60c0350f6590b35ff225c068538dd0145a1197c1e25e0eea4','input delegated decision identity changed');
 assert.deepEqual(symbol.shape.inheritedConstructor,{parent:'MatInput',signatures:[INPUT_ORIGINAL_CONSTRUCTOR],source_sha256:'fdd8c06ce5805b8d6ea1af278bb983f68e37b86ef1f12926d7e7614f4b4a9755'});
 assert.equal(symbol.shape.ownConstructor,false);
 const constructors=(packed?.ownSignatures||[]).filter(s=>s.includes(' constructor('));
 return packed?.ownConstructor===true&&packed.inheritedConstructor===null&&packed.publicInputParent===true&&isDeepStrictEqual(constructors,['public constructor()'])
  &&record.symbol_id===INPUT_SYMBOL&&record.classification==='intentional-legacy-difference'&&Boolean(record.rationale)
  &&record.historical_signature===INPUT_ORIGINAL_CONSTRUCTOR&&record.owned_signature==='public constructor()';
}
export function inputContract(symbol){
 if(symbol?.symbol_id!==INPUT_SYMBOL)return null;
 assert.equal(symbol.family,'legacy-input');assert.equal(symbol.kind,'primary');assert.equal(symbol.name,'MatLegacyInput');
 const original=originalCompilerFactoryContext(symbol.shape.originalFactory);assert.deepEqual(original,symbol.shape.originalFactoryContext);assert.equal(original.parameter_factory_key,'@angular/material:fesm2022/input.mjs#MatInput');assert.equal(original.factory_parameters.length,10);
 const params=originalContextDi(symbol.shape);assert.equal(params.length,11);assert.deepEqual(params.map(p=>[p.ident,p.spec,Boolean(p.optional),Boolean(p.self),Boolean(p.skipSelf),Boolean(p.host)]),[
 ['ElementRef','@angular/core',false,false,false,false],['Platform','@angular/cdk/platform',false,false,false,false],['NgControl','@angular/forms',true,true,false,false],['NgForm','@angular/forms',true,false,false,false],['FormGroupDirective','@angular/forms',true,false,false,false],['ErrorStateMatcher','@angular/material/core',false,false,false,false],['MAT_INPUT_VALUE_ACCESSOR',null,true,true,false,false],['AutofillMonitor','@angular/cdk/text-field',false,false,false,false],['NgZone','@angular/core',false,false,false,false],['MAT_FORM_FIELD','@angular/material/form-field',true,false,false,false],['MAT_LEGACY_FORM_FIELD','@angular/material/legacy-form-field',true,false,false,false]]);
 return {symbol_id:INPUT_SYMBOL,original_constructor_arity:10,owned_constructor_arity:0,original_factory:original.parameter_factory_key,runtime_requests:[params[10]]};
}
export function inputArtifactProof(symbol,packageRoot,context){
 if(!context?.tarball||!context?.referenceRoot)return null;
 try{const ts=require('typescript'),path=join(packageRoot,'types/ngx-compat-material-legacy-legacy-input.d.ts'),text=readFileSync(path,'utf8');
  const proof=inputDisabledProof(symbol,ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),{tarball:context.tarball,referenceRoot:context.referenceRoot,packageRoot});if(!proof)return null;
  const metadataPath=require.resolve('@angular/core/package.json'),metadataBytes=readFileSync(metadataPath),metadata=JSON.parse(metadataBytes),workspace=JSON.parse(readFileSync(fileURLToPath(new URL('../package.json',import.meta.url)),'utf8')),policy=JSON.parse(readFileSync(fileURLToPath(new URL('../projects/ngx-material-legacy/package.json',import.meta.url)),'utf8'));
  if(sha(metadataBytes)!=='fd7e79e557a78aa4ac6617a6056dbb461b07286ee5915bceec9af9e07742acbf'||metadata.name!=='@angular/core'||metadata.version!=='22.1.7'||workspace.devDependencies?.['@angular/core']!=='22.1.7'||policy.peerDependencies?.['@angular/core']!=='^22.1.7')return null;
  const options={strict:true,skipLibCheck:false,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler},resolved=ts.resolveModuleName('@angular/core',path,options,ts.sys).resolvedModule;
  if(!resolved)return null;const program=ts.createProgram([resolved.resolvedFileName],options),entry=program.getSourceFile(resolved.resolvedFileName),checker=program.getTypeChecker(),module=entry&&checker.getSymbolAtLocation(entry),exported=module&&checker.getExportsOfModule(module);
  if(!entry||sha(entry.text)!=='7d9eea93a0ccb308851fe7b50af8b8d894e8f0ae456e339fe8dcd87bf3fcfd84')return null;
  for(const name of ['ElementRef','inject']){const e=exported?.find(x=>x.name===name),target=e&&(e.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(e):e);if(!target?.declarations?.length||target.declarations.some(d=>ts.getJSDocTags(d).some(t=>['deprecated','docs-private','experimental'].includes(t.tagName.text))))return null;
   if(name==='ElementRef'&&(!target.declarations.some(d=>ts.isClassDeclaration(d)&&ts.getJSDocTags(d).some(t=>t.tagName.text==='publicApi'))||sha(target.declarations[0].getSourceFile().text)!=='359fdc800f92be1be371c69aa3a01c902976e8de13520eaf03dd5c85160e628b'))return null;
  }
  return proof;
 }catch{return null;}
}
/** Bind ranges to the unique actual top-level declaration exported by this module.
 * Runtime function text elsewhere in the file is never source attribution. */
export function inputBoundClass(source,text,exportName,owned=false){
 const ts=require('typescript'),virtual='/input-bound-class.mjs',options={allowJs:true,noResolve:true,noLib:true,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022};
 const host=ts.createCompilerHost(options),original=host.getSourceFile.bind(host);host.getSourceFile=(f,v,...args)=>f===virtual?ts.createSourceFile(f,source,v,true,ts.ScriptKind.JS):original(f,v,...args);
 const program=ts.createProgram([virtual],options,host),file=program.getSourceFile(virtual);assert.ok(file&&!file.parseDiagnostics.length,'input module parse failed');
 const checker=program.getTypeChecker(),module=checker.getSymbolAtLocation(file),exports=module&&checker.getExportsOfModule(module),entry=exports?.find(e=>e.name===exportName);
 const direct=file.statements.flatMap(n=>{
  if(!n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))return [];
  if(ts.isClassDeclaration(n))return n.name?.text===exportName?[n]:[];
  if(ts.isVariableStatement(n))return [...n.declarationList.declarations].filter(d=>ts.isIdentifier(d.name)&&d.name.text===exportName);
  return [];
 });
 const named=file.statements.flatMap(n=>ts.isExportDeclaration(n)&&!n.moduleSpecifier&&n.exportClause&&ts.isNamedExports(n.exportClause)?[...n.exportClause.elements].filter(e=>e.name.text===exportName):[]);
 assert.ok(entry&&direct.length+named.length===1,'input public export missing or ambiguous');const target=entry.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(entry):entry;
 assert.ok(target?.declarations?.length===1,'input public export is ambiguous');const declaration=target.declarations[0];
 const directClass=ts.isClassDeclaration(declaration)&&declaration.parent===file;
 const classVariable=ts.isVariableDeclaration(declaration)&&declaration.parent?.parent?.parent===file&&declaration.initializer&&ts.isClassExpression(declaration.initializer);
 const cls=directClass?declaration:classVariable?declaration.initializer:null;
 assert.ok(cls&&cls.getText(file)===text,'input export is not the actual top-level class');
 function namedImport(node,expected,spec){
  if(!ts.isIdentifier(node))return false;const sym=checker.getSymbolAtLocation(node),d=sym?.declarations;
  if(d?.length!==1||!ts.isImportSpecifier(d[0])||(d[0].propertyName||d[0].name).text!==expected)return false;
  const declaration=d[0].parent?.parent?.parent;
  return ts.isImportDeclaration(declaration)&&declaration.moduleSpecifier.text===spec;
 }
 if(owned){
  const parents=cls.heritageClauses?.flatMap(h=>[...h.types])||[];
  assert.ok(parents.length===1&&namedImport(parents[0].expression,'MatInput','@angular/material/input'),'input parent is not the public MatInput lexical import');
 }
 return {ts,file,cls,namedImport};
}
export function inputScopeFromSource(source,text,file,owned=false,elementQualified=false){
 if(elementQualified&&!owned)assert.equal(sha(source),'8310dfca1200ffd7e426ff64641e1794a2af9a4f1c1860a44a51ac8c6d638b69','input minimum-peer runtime image changed');
 const {ts,file:parsed,cls,namedImport}=inputBoundClass(source,text,owned?'MatLegacyInput':'MatInput',owned);
 let elementRanges=[];let members=cls.members.filter(n=>ts.isConstructorDeclaration(n)||ts.isPropertyDeclaration(n)&&n.initializer&&!n.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword));
 if(owned){
  const field=members.filter(n=>ts.isPropertyDeclaration(n)&&n.name.getText(parsed)==='_legacyFormField');assert.equal(field.length,1,'input exact owned field absent/ambiguous');
  const call=field[0].initializer;assert.ok(ts.isCallExpression(call)&&namedImport(call.expression,'inject','@angular/core'));assert.equal(call.arguments.length,2);
  assert.ok(namedImport(call.arguments[0],'MAT_LEGACY_FORM_FIELD','@ngx-compat/material-legacy/legacy-form-field')||namedImport(call.arguments[0],'MAT_LEGACY_FORM_FIELD',new URL('ngx-compat-material-legacy-legacy-form-field.mjs','file://'+file).href),'input owned token import differs');
  const options=call.arguments[1];assert.ok(ts.isObjectLiteralExpression(options)&&options.properties.length===1);const option=options.properties[0];assert.ok(ts.isPropertyAssignment(option)&&option.name.getText(parsed)==='optional'&&option.initializer.kind===ts.SyntaxKind.TrueKeyword,'input owned token options differ');
  if(elementQualified){
   const elements=members.filter(n=>ts.isPropertyDeclaration(n)&&n.name.getText(parsed)==='_legacyElement');assert.equal(elements.length,1,'input owned native element field absent/ambiguous');
   const elementCall=elements[0].initializer;assert.ok(ts.isCallExpression(elementCall)&&namedImport(elementCall.expression,'inject','@angular/core'));assert.equal(elementCall.arguments.length,1);assert.ok(namedImport(elementCall.arguments[0],'ElementRef','@angular/core'));
   elementRanges=[[elementCall.getStart(parsed),elementCall.end]];
  }
  members=[call];
 }
 const ranges=members.map(n=>[n.getStart(parsed),n.end]);
 const starts=[0];for(let i=source.indexOf('\n');i>=0;i=source.indexOf('\n',i+1))starts.push(i+1);
 return {file,ranges,elementRanges,starts,proof:{file,sha256:sha(source),class_text_sha256:sha(text)}};
}
function scope(Type,file,owned=false,elementQualified=false){return inputScopeFromSource(readFileSync(file,'utf8'),Function.prototype.toString.call(Type),file,owned,elementQualified);}
function origin(request,scope){return String(request.stack||'').split('\n').some(line=>{const m=line.match(/(?:\(|at )(file:\/\/[^()]+|\/[^()]+):(\d+):(\d+)\)?$/);if(!m)return false;const file=m[1].startsWith('file:')?fileURLToPath(m[1]):m[1],at=scope.starts[+m[2]-1]+(+m[3])-1;return file===scope.file&&scope.ranges.some(([a,b])=>at>=a&&at<b);});}
export function partitionInputParent(requests,contract,capture,Type,owned,field,peer,currentField,core,fixture,runFactory,ownedFile,artifactProof=null){
 assert.ok(Object.getPrototypeOf(Type)===peer.MatInput&&capture.value instanceof peer.MatInput,'input exact public parent identity differs');assert.equal(capture.constructor_calls,1);assert.equal(capture.inputs.length,0);
 const parentScope=scope(peer.MatInput,require.resolve('@angular/material/input'),false,Boolean(artifactProof)),ownScope=scope(Type,ownedFile,true,Boolean(artifactProof)),classified=[],retained=[];
 for(const request of requests)if(origin(request,parentScope))classified.push(request);else retained.push(request);
 const node=fixture.element,control=runFactory(()=>new peer.MatInput(),core.Injector,core.runInInjectionContext,{injector:node.injector,captureStack:true});assert.equal(control.outcome,'returned',control.error);assert.ok(control.value instanceof peer.MatInput);assert.ok(control.requests.length>=10&&control.requests.every(r=>origin(r,parentScope)),'input public parent control origin incomplete');assert.equal(classified.length,control.requests.length);
 for(let i=0;i<classified.length;i++){const a=classified[i],b=control.requests[i];assert.ok(a.token===b.token&&!a.unresolved&&!b.unresolved&&flags.every(f=>Boolean(a[f])===Boolean(b[f])),'input public parent request/control identity or flags differ');}
 assert.ok(capture.value._elementRef.nativeElement===node.element.nativeElement&&control.value._elementRef.nativeElement===node.element.nativeElement,'input public parent resolved a different native node');
 assert.ok(capture.value._autofillMonitor===control.value._autofillMonitor&&capture.value._ngZone===control.value._ngZone&&capture.value.ngControl===control.value.ngControl,'input borrowed public services differ from same-node control');
 const oldField=field.MAT_LEGACY_FORM_FIELD;assert.ok(oldField&&oldField!==currentField.MAT_FORM_FIELD,'input legacy token identity is not distinct');
 const ownRequests=retained.filter(r=>r.token===oldField&&origin(r,ownScope));assert.equal(ownRequests.length,1);const own=ownRequests[0];assert.ok(!own.unresolved&&own.optional&&!own.self&&!own.skipSelf&&!own.host,'input owned legacy field request differs');
 assert.ok(capture.value._legacyFormField===node.injector.get(oldField,null,{optional:true}),'input legacy field value differs from actual caller');
 let matched=retained,ownedElement=null;
 if(artifactProof){
  const elementScope={...ownScope,ranges:ownScope.elementRanges},requests=retained.filter(r=>origin(r,elementScope));
  assert.equal(requests.length,1,'input owned ElementRef request absent/ambiguous');const request=requests[0];
  assert.ok(retained.length===2&&retained[0]===own&&retained[1]===request,'input owned request order or count differs');
  assert.ok(request.token===core.ElementRef&&!request.unresolved&&flags.every(f=>!request[f]),'input owned ElementRef identity or flags differ');
  assert.ok(capture.value._legacyElement instanceof core.ElementRef&&capture.value._legacyElement.nativeElement===node.element.nativeElement&&capture.value._legacyElement.nativeElement===capture.value._elementRef.nativeElement,'input owned ElementRef native node differs');
  matched=retained.filter(r=>r!==request);
  ownedElement={token:'@angular/core:ElementRef',identity_matched:true,optional:false,self:false,skipSelf:false,host:false,unresolved:false,owned_field_origin:true,native_node_identical:true,artifact_sha256:artifactProof.artifact_sha256,owned_source_sha256:artifactProof.owned_source_sha256,helper_collision_risk:artifactProof.collision_risk};
 }
 control.value.ngOnDestroy();
 return {requests:matched,observation:{symbol_id:INPUT_SYMBOL,original_constructor_arity:10,owned_constructor_arity:0,constructor_calls:1,public_parent_identity_matched:true,owned_field_ast_verified:true,sources:{parent:parentScope.proof,owned:ownScope.proof},total_requests:requests.length,retained_requests:matched.length,classified_requests:classified.length,...(ownedElement?{owned_element_ref:ownedElement}:{}),public_control_outcome:'returned',parent_requests:classified.map((r,index)=>({index,identity_matched:true,unresolved:false,...Object.fromEntries(flags.map(f=>[f,Boolean(r[f])]))})),control_requests:control.requests.map((r,index)=>({index,...Object.fromEntries(flags.map(f=>[f,Boolean(r[f])]))})),original_native_node_identical:true,borrowed_services_identical:true,legacy_token_distinct:true,legacy_field_value_identical:true}};
}

export function inputLegacyTokenMatches(symbol,param,field,currentField,token){
 const contract=inputContract(symbol);assert.ok(contract);assert.deepEqual(param,contract.runtime_requests[0]);
 return Boolean(field.MAT_LEGACY_FORM_FIELD&&field.MAT_LEGACY_FORM_FIELD!==currentField.MAT_FORM_FIELD&&token===field.MAT_LEGACY_FORM_FIELD);
}
export function createInputLifetime(fixture,core,textField){
 const service=fixture.element.injector.get(textField.AutofillMonitor),descriptor=Object.getOwnPropertyDescriptor(service,'ngOnDestroy'),destroy=service.ngOnDestroy,parent=fixture.parentNode.owner,state={service,descriptor,destroyCalls:0,parentDestroyCalls:0};
 const parentDescriptor=parent?Object.getOwnPropertyDescriptor(parent,'ngOnDestroy'):null,parentDestroy=parent?.ngOnDestroy;
 if(parent)Object.defineProperty(parent,'ngOnDestroy',{configurable:true,value(...args){state.parentDestroyCalls++;return parentDestroy.apply(this,args);}});
 Object.defineProperty(service,'ngOnDestroy',{configurable:true,value(...args){state.destroyCalls++;return destroy.apply(this,args);}});
 state.close=()=>{if(parent){if(parentDescriptor)Object.defineProperty(parent,'ngOnDestroy',parentDescriptor);else delete parent.ngOnDestroy;}if(descriptor)Object.defineProperty(service,'ngOnDestroy',descriptor);else delete service.ngOnDestroy;};return state;
}
export async function observeInputBehavior(value,fixture,lifetime,forms,ownedElementQualified=false){
 await Promise.resolve();await Promise.resolve();
 const element=fixture.element.element.nativeElement,changes=[];let complete=false;
 assert.ok(value._autofillMonitor===lifetime.service,'input autofill service differs');
 const subscription=value.stateChanges.subscribe({next:()=>changes.push('change'),complete:()=>{complete=true;}});
 const checks=[];
 if(value._legacyFormField){
  assert.ok(element.classList.contains('mat-input-element')&&element.classList.contains('mat-form-field-autofill-control'),'input historical native classes are missing');
  for(const name of ['mat-mdc-input-element','mat-mdc-form-field-textarea-control','mat-mdc-form-field-input-control','mdc-text-field__input','mat-mdc-native-select-inline'])assert.equal(element.classList.contains(name),false,'input retained an MDC native class');
 }
 value.ngAfterViewInit();
 value.value='native-value';assert.equal(element.value,'native-value');assert.equal(value.empty,false);value.value='';assert.equal(value.empty,true);checks.push('native-value-roundtrip-and-empty-state');
 for(const name of ['disabled','required','readonly']){value[name]='false';assert.equal(value[name],false);value[name]='';assert.equal(value[name],true);value[name]=false;assert.equal(value[name],false);}checks.push('historical-direct-write-boolean-coercion');
 value.id='owned-input';assert.equal(value.id,'owned-input');checks.push('public-id-write');
 value.setDescribedByIds(['first','second']);assert.equal(element.getAttribute('aria-describedby'),'first second');assert.deepEqual(value.describedByIds,['first','second']);value.setDescribedByIds([]);assert.equal(element.getAttribute('aria-describedby'),null);checks.push('aria-described-by-roundtrip-and-removal');
 value.focus();assert.ok(fixture.document.activeElement===element);checks.push('public-focus-target');
 value.placeholder='historical-placeholder';value.ngDoCheck();
 const field=value._legacyFormField;
 if(field){
  assert.equal(field.appearance,'legacy');assert.equal(field._hasLabel(),false);assert.equal(element.getAttribute('placeholder'),null,'input legacy placeholder promotion differs');
  field.appearance='standard';value.ngDoCheck();assert.equal(element.getAttribute('placeholder'),'historical-placeholder');
  field.appearance='legacy';value.ngDoCheck();assert.equal(element.getAttribute('placeholder'),null);
  checks.push('actual-legacy-placeholder-promotion-and-standard-restoration');
 }else{assert.equal(element.getAttribute('placeholder'),'historical-placeholder');checks.push('native-placeholder-dirty-check');}
 const before=changes.length;element.value='native-external';value.ngDoCheck();assert.equal(changes.length,before+1);checks.push('external-native-value-notification');
 if(value.ngControl){
  assert.ok(value.ngControl instanceof forms.NgModel&&value.ngControl.control instanceof forms.FormControl,'input forms caller is not genuine Angular control');
  const control=value.ngControl.control,priorValidators=control.validator;
  control.setValidators(forms.Validators.required);control.setValue('');control.markAsTouched();value.ngDoCheck();assert.equal(value.errorState,true);
  control.setValue('forms-value');value.ngDoCheck();assert.equal(value.errorState,false);assert.equal(element.value,'forms-value');
  control.disable();value.ngDoCheck();assert.equal(value.disabled,true);control.enable();value.ngDoCheck();assert.equal(value.disabled,false);control.setValidators(priorValidators);control.updateValueAndValidity();
  checks.push('genuine-ng-model-errors-native-value-and-disabled-state');
 }
 if(ownedElementQualified){
  element.setAttribute('aria-disabled','false');value.disabledInteractive=true;value.ngDoCheck();assert.equal(value.disabledInteractive,false);assert.equal(value._legacyAriaDisabled,'false');
  element.setAttribute('aria-disabled','true');value.ngDoCheck();assert.equal(value._legacyAriaDisabled,'true');element.removeAttribute('aria-disabled');value.ngDoCheck();assert.equal(value._legacyAriaDisabled,null);
  value.readonly=true;assert.equal(value._legacyReadonlyAttribute(),'true');value.readonly=false;assert.equal(value._legacyReadonlyAttribute(),null);checks.push('owned-native-node-aria-readonly-and-parent-check');
 }
 assert.ok(changes.length>=3);return {subscription,complete:()=>complete,checks,changes,initialization_executed:true};
}
export function finishInputBehavior(state,value,fixture,lifetime,evidence){
 assert.equal(state.complete(),true,'input destroy did not complete state changes');state.subscription.unsubscribe();
 assert.equal(lifetime.destroyCalls,0,'input destroyed borrowed autofill service');assert.equal(lifetime.parentDestroyCalls,0,'input destroyed borrowed legacy field');
 assert.ok(!fixture.element.destroyed&&!fixture.template.destroyed&&!fixture.parentNode.destroyed&&!fixture.component.hostView.destroyed&&!fixture.environment.destroyed,'input destroyed borrowed caller context');
 return {...evidence,behavior_checks:state.checks.map(id=>({id,result:'pass'})),state_changes_completed:true,borrowed_autofill_destroy_calls:0,borrowed_parent_destroy_calls:0,borrowed_context_alive:true};
}
export function inputObservationProblems(row,context){
 if(row?.symbol?.symbol_id!==INPUT_SYMBOL)return [];
 const contract=inputContract(row.symbol),x=row.factory_input_context;
 const exactKeys=(value,keys)=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&isDeepStrictEqual(Object.keys(value).sort(),[...keys].sort()));
 const denseArray=value=>Array.isArray(value)&&isDeepStrictEqual(Object.keys(value),Array.from({length:value.length},(_,i)=>String(i)));
 const owned=x?.owned_element_ref;
 const keys=['symbol_id','original_constructor_arity','owned_constructor_arity','constructor_calls','public_parent_identity_matched','owned_field_ast_verified','sources','total_requests','retained_requests','classified_requests','public_control_outcome','parent_requests','control_requests','original_native_node_identical','borrowed_services_identical','legacy_token_distinct','legacy_field_value_identical','caller_kind','genuine_legacy_parent_control_scope','behavior_checks','state_changes_completed','borrowed_autofill_destroy_calls','borrowed_parent_destroy_calls','borrowed_context_alive',...(owned?['owned_element_ref']:[])];
 if(row.factory_outcome!=='returned'||!exactKeys(x,keys)||x.symbol_id!==INPUT_SYMBOL||x.original_constructor_arity!==contract.original_constructor_arity||x.owned_constructor_arity!==0||x.constructor_calls!==1||x.public_control_outcome!=='returned'
  ||!Number.isInteger(x.total_requests)||!Number.isInteger(x.retained_requests)||!Number.isInteger(x.classified_requests)||x.retained_requests<1||x.classified_requests<10||x.retained_requests+x.classified_requests+(owned?1:0)!==x.total_requests
  ||!denseArray(x.parent_requests)||x.parent_requests.length!==x.classified_requests||!denseArray(x.control_requests)||x.control_requests.length!==x.classified_requests
  ||x.parent_requests.some((r,index)=>!exactKeys(r,['index','identity_matched','unresolved',...flags])||!exactKeys(x.control_requests[index],['index',...flags])||r.index!==index||r.identity_matched!==true||r.unresolved!==false||x.control_requests[index].index!==index||flags.some(f=>typeof r[f]!=='boolean'||r[f]!==x.control_requests[index][f]))
  ||(owned&&(x.sources?.parent?.sha256!=='8310dfca1200ffd7e426ff64641e1794a2af9a4f1c1860a44a51ac8c6d638b69'||x.sources?.parent?.class_text_sha256!=='ee7f5ec23a123c1fbf0a90e6a44ff5b1ce82e42d4e2617ed5defdbe5737cdc69'))
  ||(owned&&(x.sources?.owned?.sha256!=='9d1ccb5328d4e8c430874b0547717bc57c8cc069d461e274e7a2f74f6cb573c1'||x.sources?.owned?.class_text_sha256!=='3be742f8ab06b844294554e93ab3af355d5628a6979c9b3e18638efe47d881ca'))
  ||(owned&&(!exactKeys(owned,['token','identity_matched','optional','self','skipSelf','host','unresolved','owned_field_origin','native_node_identical','artifact_sha256','owned_source_sha256','helper_collision_risk'])||owned.helper_collision_risk!=='Exact protected helper additions can break subclasses declaring incompatible private members; accepted only for these two names and types.'||owned.token!=='@angular/core:ElementRef'||!['a488b8b42440baa553650766a5c4a969458e7add843ff5d500aeb20913c74fc2','66449e62f2fe13232107cba6a7cdf744a67d941fe52987253546fbceb3bc35ca',API_V8_ARTIFACT_SHA,API_HINT_ID_ARTIFACT_SHA,API_NODE_COMBINED_SHA,API_COMBINED_D70_SHA].includes(owned.artifact_sha256)||!([API_NODE_COMBINED_SHA,API_COMBINED_D70_SHA].includes(owned.artifact_sha256) ? combinedReceiptMatches(context,owned.artifact_sha256) : receiptArchiveMatches(context,owned.artifact_sha256))||owned.owned_source_sha256!=='aaa55d58b06ef58c6dfca26053854696526e3529e7ed15ba3ef382ec323e8532'||['identity_matched','owned_field_origin','native_node_identical'].some(k=>owned[k]!==true)||['optional','self','skipSelf','host','unresolved'].some(k=>owned[k]!==false)))
  ||!exactKeys(x.sources,['parent','owned'])||Object.values(x.sources).some(s=>!exactKeys(s,['file','sha256','class_text_sha256']))
  ||!x.sources?.parent?.file?.match(/\/fesm2022\/(?:input|_input[-\w]*chunk)\.mjs$/)||!x.sources?.owned?.file?.endsWith('/fesm2022/ngx-compat-material-legacy-legacy-input.mjs')||Object.values(x.sources||{}).some(s=>['sha256','class_text_sha256'].some(k=>!/^([a-f0-9]{64})$/.test(s[k]||'')))
  ||['public_parent_identity_matched','owned_field_ast_verified','original_native_node_identical','borrowed_services_identical','legacy_token_distinct','legacy_field_value_identical','state_changes_completed','borrowed_context_alive'].some(k=>x[k]!==true)||x.borrowed_autofill_destroy_calls!==0||x.borrowed_parent_destroy_calls!==0||x.caller_kind!=='legacy'||x.genuine_legacy_parent_control_scope!==true
  ||!isDeepStrictEqual(x.behavior_checks,['native-value-roundtrip-and-empty-state','historical-direct-write-boolean-coercion','public-id-write','aria-described-by-roundtrip-and-removal','public-focus-target','actual-legacy-placeholder-promotion-and-standard-restoration','external-native-value-notification',...(owned?['owned-native-node-aria-readonly-and-parent-check']:[])].map(id=>({id,result:'pass'}))))return ['input original/current-public-parent/owned-token/behavior/lifetime evidence incomplete'];
 return [];
}

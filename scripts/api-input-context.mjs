/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {originalCompilerFactoryContext,originalContextDi} from './api-original-factory-contexts.mjs';
const require=createRequire(import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex'),flags=['optional','self','skipSelf','host'];
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
function scope(Type,file,owned=false){
 const ts=require('typescript'),text=Function.prototype.toString.call(Type);
 if(!readFileSync(file,'utf8').includes(text)){const dir=dirname(file),matches=readdirSync(dir).filter(n=>/^_input[-\w]*chunk\.mjs$/.test(n)).map(n=>join(dir,n)).filter(p=>readFileSync(p,'utf8').includes(text));assert.equal(matches.length,1);file=matches[0];}
 const source=readFileSync(file,'utf8'),at=source.indexOf(text);assert.ok(at>=0&&source.indexOf(text,at+1)<0,'input constructor source absent/ambiguous');
 const parsed=ts.createSourceFile('owner.js','('+text+')',ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),cls=parsed.statements[0]?.expression?.expression;assert.ok(!parsed.parseDiagnostics.length&&ts.isClassExpression(cls));
 let members=cls.members.filter(n=>ts.isConstructorDeclaration(n)||ts.isPropertyDeclaration(n)&&n.initializer&&!n.modifiers?.some(m=>m.kind===ts.SyntaxKind.StaticKeyword));
 if(owned){
  const root=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),imports=new Map();
  assert.equal(root.parseDiagnostics.length,0);
  for(const n of root.statements)if(ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))for(const e of n.importClause.namedBindings.elements)imports.set(e.name.text,{name:e.propertyName?.text||e.name.text,spec:n.moduleSpecifier.text});
  const field=members.filter(n=>ts.isPropertyDeclaration(n)&&n.name.getText(parsed)==='_legacyFormField');assert.equal(field.length,1,'input exact owned field absent/ambiguous');
  const call=field[0].initializer;assert.ok(ts.isCallExpression(call)&&ts.isIdentifier(call.expression));assert.deepEqual(imports.get(call.expression.text),{name:'inject',spec:'@angular/core'});assert.equal(call.arguments.length,2);
  const token=imports.get(call.arguments[0].getText(parsed));assert.equal(token?.name,'MAT_LEGACY_FORM_FIELD');assert.ok(token.spec==='@ngx-compat/material-legacy/legacy-form-field'||token.spec===new URL('ngx-compat-material-legacy-legacy-form-field.mjs','file://'+file).href,'input owned token import differs');
  const options=call.arguments[1];assert.ok(ts.isObjectLiteralExpression(options)&&options.properties.length===1);const option=options.properties[0];assert.ok(ts.isPropertyAssignment(option)&&option.name.getText(parsed)==='optional'&&option.initializer.kind===ts.SyntaxKind.TrueKeyword,'input owned token options differ');
  members=[call];
 }
 const ranges=members.map(n=>[at+n.getStart(parsed)-1,at+n.end-1]);
 const starts=[0];for(let i=source.indexOf('\n');i>=0;i=source.indexOf('\n',i+1))starts.push(i+1);
 return {file,ranges,starts,proof:{file,sha256:sha(source),class_text_sha256:sha(text)}};
}
function origin(request,scope){return String(request.stack||'').split('\n').some(line=>{const m=line.match(/(?:\(|at )(file:\/\/[^()]+|\/[^()]+):(\d+):(\d+)\)?$/);if(!m)return false;const file=m[1].startsWith('file:')?fileURLToPath(m[1]):m[1],at=scope.starts[+m[2]-1]+(+m[3])-1;return file===scope.file&&scope.ranges.some(([a,b])=>at>=a&&at<b);});}
export function partitionInputParent(requests,contract,capture,Type,owned,field,peer,currentField,core,fixture,runFactory,ownedFile){
 assert.ok(Object.getPrototypeOf(Type)===peer.MatInput&&capture.value instanceof peer.MatInput,'input exact public parent identity differs');assert.equal(capture.constructor_calls,1);assert.equal(capture.inputs.length,0);
 const parentScope=scope(peer.MatInput,require.resolve('@angular/material/input')),ownScope=scope(Type,ownedFile,true),classified=[],retained=[];
 for(const request of requests)if(origin(request,parentScope))classified.push(request);else retained.push(request);
 const node=fixture.element,control=runFactory(()=>new peer.MatInput(),core.Injector,core.runInInjectionContext,{injector:node.injector,captureStack:true});assert.equal(control.outcome,'returned',control.error);assert.ok(control.value instanceof peer.MatInput);assert.ok(control.requests.length>=10&&control.requests.every(r=>origin(r,parentScope)),'input public parent control origin incomplete');assert.equal(classified.length,control.requests.length);
 for(let i=0;i<classified.length;i++){const a=classified[i],b=control.requests[i];assert.ok(a.token===b.token&&!a.unresolved&&!b.unresolved&&flags.every(f=>Boolean(a[f])===Boolean(b[f])),'input public parent request/control identity or flags differ');}
 assert.ok(capture.value._elementRef.nativeElement===node.element.nativeElement&&control.value._elementRef.nativeElement===node.element.nativeElement,'input public parent resolved a different native node');
 assert.ok(capture.value._autofillMonitor===control.value._autofillMonitor&&capture.value._ngZone===control.value._ngZone&&capture.value.ngControl===control.value.ngControl,'input borrowed public services differ from same-node control');
 const oldField=field.MAT_LEGACY_FORM_FIELD;assert.ok(oldField&&oldField!==currentField.MAT_FORM_FIELD,'input legacy token identity is not distinct');
 const ownRequests=retained.filter(r=>r.token===oldField&&origin(r,ownScope));assert.equal(ownRequests.length,1);const own=ownRequests[0];assert.ok(!own.unresolved&&own.optional&&!own.self&&!own.skipSelf&&!own.host,'input owned legacy field request differs');
 assert.ok(capture.value._legacyFormField===node.injector.get(oldField,null,{optional:true}),'input legacy field value differs from actual caller');
 control.value.ngOnDestroy();
 return {requests:retained,observation:{symbol_id:INPUT_SYMBOL,original_constructor_arity:10,owned_constructor_arity:0,constructor_calls:1,public_parent_identity_matched:true,owned_field_ast_verified:true,sources:{parent:parentScope.proof,owned:ownScope.proof},total_requests:requests.length,retained_requests:retained.length,classified_requests:classified.length,public_control_outcome:'returned',parent_requests:classified.map((r,index)=>({index,identity_matched:true,unresolved:false,...Object.fromEntries(flags.map(f=>[f,Boolean(r[f])]))})),control_requests:control.requests.map((r,index)=>({index,...Object.fromEntries(flags.map(f=>[f,Boolean(r[f])]))})),original_native_node_identical:true,borrowed_services_identical:true,legacy_token_distinct:true,legacy_field_value_identical:true}};
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
export async function observeInputBehavior(value,fixture,lifetime,forms){
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
 assert.ok(changes.length>=3);return {subscription,complete:()=>complete,checks,changes,initialization_executed:true};
}
export function finishInputBehavior(state,value,fixture,lifetime,evidence){
 assert.equal(state.complete(),true,'input destroy did not complete state changes');state.subscription.unsubscribe();
 assert.equal(lifetime.destroyCalls,0,'input destroyed borrowed autofill service');assert.equal(lifetime.parentDestroyCalls,0,'input destroyed borrowed legacy field');
 assert.ok(!fixture.element.destroyed&&!fixture.template.destroyed&&!fixture.parentNode.destroyed&&!fixture.component.hostView.destroyed&&!fixture.environment.destroyed,'input destroyed borrowed caller context');
 return {...evidence,behavior_checks:state.checks.map(id=>({id,result:'pass'})),state_changes_completed:true,borrowed_autofill_destroy_calls:0,borrowed_parent_destroy_calls:0,borrowed_context_alive:true};
}
export function inputObservationProblems(row){
 if(row?.symbol?.symbol_id!==INPUT_SYMBOL)return [];
 const contract=inputContract(row.symbol),x=row.factory_input_context;
 const exactKeys=(value,keys)=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&isDeepStrictEqual(Object.keys(value).sort(),[...keys].sort()));
 const denseArray=value=>Array.isArray(value)&&isDeepStrictEqual(Object.keys(value),Array.from({length:value.length},(_,i)=>String(i)));
 const keys=['symbol_id','original_constructor_arity','owned_constructor_arity','constructor_calls','public_parent_identity_matched','owned_field_ast_verified','sources','total_requests','retained_requests','classified_requests','public_control_outcome','parent_requests','control_requests','original_native_node_identical','borrowed_services_identical','legacy_token_distinct','legacy_field_value_identical','caller_kind','genuine_legacy_parent_control_scope','behavior_checks','state_changes_completed','borrowed_autofill_destroy_calls','borrowed_parent_destroy_calls','borrowed_context_alive'];
 if(row.factory_outcome!=='returned'||!exactKeys(x,keys)||x.symbol_id!==INPUT_SYMBOL||x.original_constructor_arity!==contract.original_constructor_arity||x.owned_constructor_arity!==0||x.constructor_calls!==1||x.public_control_outcome!=='returned'
  ||!Number.isInteger(x.total_requests)||!Number.isInteger(x.retained_requests)||!Number.isInteger(x.classified_requests)||x.retained_requests<1||x.classified_requests<10||x.retained_requests+x.classified_requests!==x.total_requests
  ||!denseArray(x.parent_requests)||x.parent_requests.length!==x.classified_requests||!denseArray(x.control_requests)||x.control_requests.length!==x.classified_requests
  ||x.parent_requests.some((r,index)=>!exactKeys(r,['index','identity_matched','unresolved',...flags])||!exactKeys(x.control_requests[index],['index',...flags])||r.index!==index||r.identity_matched!==true||r.unresolved!==false||x.control_requests[index].index!==index||flags.some(f=>typeof r[f]!=='boolean'||r[f]!==x.control_requests[index][f]))
  ||!exactKeys(x.sources,['parent','owned'])||Object.values(x.sources).some(s=>!exactKeys(s,['file','sha256','class_text_sha256']))
  ||!x.sources?.parent?.file?.match(/\/fesm2022\/(?:input|_input[-\w]*chunk)\.mjs$/)||!x.sources?.owned?.file?.endsWith('/fesm2022/ngx-compat-material-legacy-legacy-input.mjs')||Object.values(x.sources||{}).some(s=>['sha256','class_text_sha256'].some(k=>!/^([a-f0-9]{64})$/.test(s[k]||'')))
  ||['public_parent_identity_matched','owned_field_ast_verified','original_native_node_identical','borrowed_services_identical','legacy_token_distinct','legacy_field_value_identical','state_changes_completed','borrowed_context_alive'].some(k=>x[k]!==true)||x.borrowed_autofill_destroy_calls!==0||x.borrowed_parent_destroy_calls!==0||x.caller_kind!=='legacy'||x.genuine_legacy_parent_control_scope!==true
  ||!isDeepStrictEqual(x.behavior_checks,['native-value-roundtrip-and-empty-state','historical-direct-write-boolean-coercion','public-id-write','aria-described-by-roundtrip-and-removal','public-focus-target','actual-legacy-placeholder-promotion-and-standard-restoration','external-native-value-notification'].map(id=>({id,result:'pass'}))))return ['input original/current-public-parent/owned-token/behavior/lifetime evidence incomplete'];
 return [];
}

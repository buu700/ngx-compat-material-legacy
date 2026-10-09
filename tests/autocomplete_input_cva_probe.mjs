/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Actual complete source prototypes; constructor/decorators/fields and native Angular views excluded.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const hash=value=>createHash('sha256').update(value).digest('hex'),url=name=>pathToFileURL(require.resolve(name)).href;
await import(url('@angular/compiler'));
const {FormControl}=await import(url('@angular/forms'));
const originals='reference/material-16.2.14/component-behavior-sources/autocomplete/autocomplete-trigger.ts';
const original=readFileSync(resolve(root,originals),'utf8');assert.equal(hash(original),'b69decaf81ef29dd665a0b267f3a121837212157b31ddd02c3b617fa958844f2');
const candidatePath='projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts';
const candidate=readFileSync(resolve(root,candidatePath),'utf8');
function owner(source,name,kind=ts.ScriptKind.TS){
 const file=ts.createSourceFile('subject.ts',source,ts.ScriptTarget.Latest,true,kind);
 const node=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text===name);assert.ok(node,name);
 return {file,node};
}
function program(source,name,kind){
 const {file,node}=owner(source,name,kind);
 const members=node.members.filter(n=>ts.isMethodDeclaration(n)||ts.isGetAccessorDeclaration(n)||ts.isSetAccessorDeclaration(n));
 const owned=ts.factory.updateClassDeclaration(node,[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],ts.factory.createIdentifier('Probe'),undefined,undefined,members);
 const transformed=ts.transform(owned,[context=>{
  const visit=node=>ts.isDecorator(node)?undefined:ts.visitEachChild(node,visit,context);return node=>ts.visitNode(node,visit);
 }]);
 try{return ts.transpileModule(ts.createPrinter().printNode(ts.EmitHint.Unspecified,transformed.transformed[0],file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;}
 finally{transformed.dispose();}
}
async function Type(source,name,kind){
 const emitted='import {take} from '+JSON.stringify(url('rxjs/operators'))+';\n'+program(source,name,kind);
 return (await import('data:text/javascript;base64,'+Buffer.from(emitted).toString('base64'))).Probe;
}
function inputProgram(source,name,kind){
 const {file,node}=owner(source,name,kind),method=node.members.find(n=>n.name?.getText(file)==='_handleInput');assert.ok(method);
 return ts.transpileModule('class InputProbe {'+method.getText(file)+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022,removeComments:true}}).outputText;
}
function fixture(Type,panelMode='required'){
 const initial={code:'CA',name:'California'},control=new FormControl(initial),changes=[],clears=[],native={type:'text',value:'California',focus(){focuses++;}};
 let focuses=0,closed=0;control.valueChanges.subscribe(value=>changes.push(value));
 const option={selected:false,value:initial,deselect(flag){this.selected=false;clears.push(flag===undefined?'default':flag);}};
 const panel=panelMode==='none'?null:{requireSelection:panelMode==='required',showPanel:true,options:[option],displayWith:value=>value?.name??value,_animationDone:null,_emitSelectEvent(option){selects.push(option.value);}},selects=[];
 const instance=Object.create(Type.prototype);Object.assign(instance,{autocomplete:panel,_element:{nativeElement:native},_formField:null,_overlayAttached:false,_previousValue:'California',_valueOnAttach:'California',_pendingAutoselectedOption:option,
  _canOpen:()=>false,closePanel(){closed++;this._overlayAttached=false;}});
 instance.registerOnChange(value=>control.setValue(value));
 return {instance,native,control,changes,clears,selects,option,closed:()=>closed,focuses:()=>focuses};
}
const normalize=value=>typeof value==='number'&&Number.isNaN(value)?{number:'NaN'}:value;
function result(f){return {model:normalize(f.control.value),changes:f.changes.map(normalize),previous:normalize(f.instance._previousValue),pending:f.instance._pendingAutoselectedOption===null?'null':'retained',closed:f.closed(),focuses:f.focuses(),selected:f.selects};}
const sequences=[
 ['text-typing-and-repeat','text',['C','Ca','Ca','']],
 ['text-unchanged','text',['California','California']],
 ['text-empty-and-zero','text',['','','0']],
 ['number-empty-zero-and-fraction','number',['','0','0','2.5','-3']],
 ['number-invalid-repeats','number',['bad','bad']],
 ['email-string-input','email',['a@example.com','a@example.com','b@example.com']],
];
function observations(Type,includeClose=true){
 const rows=[];
 for(const panel of ['none','optional','required'])for(const [id,type,values]of sequences){
  const f=fixture(Type,panel);f.native.type=type;
  for(const value of values){f.native.value=value;f.instance._handleInput({target:f.native});}
  rows.push({id:panel+'/'+id,...result(f)});
 }
 if(includeClose)for(const [id,required,text,select]of [['required-dismiss-unmatched',true,'Cali',false],['required-dismiss-unchanged',true,'California',false],['optional-dismiss-unmatched',false,'Cali',false],['required-select-option',true,'Cali',true]]){
  const f=fixture(Type,required?'required':'optional');f.instance._pendingAutoselectedOption=null;f.native.value=text;
  const selected={selected:true,value:{code:'AL',name:'Alabama'}};
  f.instance._setValueAndClose(select?{source:selected}:null);
  rows.push({id,...result(f),nativeValue:f.native.value});
 }
 return rows;
}
const Original=await Type(original,'_MatAutocompleteTriggerBase'),Owned=await Type(candidate,'_MatAutocompleteTriggerBase');
const reference=observations(Original),actual=observations(Owned);assert.deepEqual(actual,reference);
const peers=[];
for(const cap of JSON.parse(readFileSync(resolve(root,'compatibility/rc/autocomplete-input-peer-sources/identities.json'),'utf8'))){
 const compressed=readFileSync(resolve(root,cap.retained.path));assert.equal(hash(compressed),cap.retained.sha256);
 const bytes=gunzipSync(compressed);assert.equal(hash(bytes),cap.member_sha256);assert.equal(bytes.length,cap.member_bytes);
 const source=bytes.toString('utf8');assert.equal(inputProgram(candidate,'_MatAutocompleteTriggerBase'),inputProgram(source,'MatAutocompleteTrigger',ts.ScriptKind.JS));
 const Current=await Type(source,'MatAutocompleteTrigger',ts.ScriptKind.JS);
 // Only the complete input handler is the reviewed peer boundary. Current close motion differs.
 const rows=observations(Current,false);assert.deepEqual(rows,reference.slice(0,18));
 peers.push({line:cap.line,version:cap.version,member_sha256:cap.member_sha256,input_program_sha256:hash(inputProgram(source,'MatAutocompleteTrigger',ts.ScriptKind.JS)),cases:rows});
}
const mutants=[];
for(const [id,find,replacement]of [
 ['write-required-selection-while-typing','if (!this.autocomplete || !this.autocomplete.requireSelection) {','if (true) {'],
 ['invert-selection-mode','if (!this.autocomplete || !this.autocomplete.requireSelection) {','if (this.autocomplete && this.autocomplete.requireSelection) {'],
 ['lose-missing-panel-guard','if (!this.autocomplete || !this.autocomplete.requireSelection) {','if (!this.autocomplete.requireSelection) {'],
 ['lose-repeat-input-filter','if (this._previousValue !== value) {','if (true) {'],
 ['retain-autoselected-option','this._pendingAutoselectedOption = null;',''],
 ['number-empty-is-zero',"value = value == '' ? null : parseFloat(value);","value = value == '' ? 0 : parseFloat(value);"],
 ]){
 assert.ok(candidate.includes(find),id);let changed,error;
 const {file,node}=owner(candidate,'_MatAutocompleteTriggerBase');
 const method=node.members.find(n=>n.name?.getText(file)==='_handleInput'),text=method.getText(file);
 assert.ok(text.includes(find),'input method mutation anchor: '+id);
 const mutated=candidate.slice(0,method.getStart(file))+text.replace(find,replacement)+candidate.slice(method.end);
 try{changed=observations(await Type(mutated,'_MatAutocompleteTriggerBase'));}catch(e){error=String(e.message).slice(0,250);}
 assert.ok(error||JSON.stringify(changed)!==JSON.stringify(reference),'mutant survived: '+id);
 mutants.push({id,result:'rejected',...(error?{error}:{different_case_ids:changed.filter((row,i)=>JSON.stringify(row)!==JSON.stringify(reference[i])).map(row=>row.id)})});
}
const report={schema_version:1,line:JSON.parse(readFileSync(resolve(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main',node:process.version,typescript:ts.version,borrowed_runtime:{angular:JSON.parse(readFileSync(require.resolve('@angular/core/package.json'))).version,rxjs:JSON.parse(readFileSync(require.resolve('rxjs/package.json'))).version},scope:'Complete source prototype methods with constructors/decorators/fields excluded, real borrowed Angular FormControl callbacks and synthetic input/option/panel services. No public directive/CVA lookup, Angular view, OverlayRef, browser, packed or full minimum runtime qualification.',original_source:{path:originals,sha256:hash(original)},candidate_source:{path:candidatePath,sha256:hash(candidate)},complete_prototype_program_sha256:hash(program(candidate,'_MatAutocompleteTriggerBase')),reference,candidate:actual,peers,mutants,native_executed:false,packed_executed:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({historical_cases:reference.length,peer_input_cases_each:18,mutants_rejected:mutants.length,native_executed:false}));

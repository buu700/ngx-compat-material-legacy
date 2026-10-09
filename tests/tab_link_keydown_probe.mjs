/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Complete source handler with real Node Event cancellation and synthetic host clicks.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript');
const hash=text=>createHash('sha256').update(text).digest('hex');
const {ENTER,SPACE,ESCAPE}=await import(pathToFileURL(require.resolve('@angular/cdk/keycodes')).href);
assert.equal(ENTER,13);assert.equal(SPACE,32);
const originalPath='reference/material-16.2.14/component-behavior-sources/tabs/tab-nav-bar.ts',candidatePath='projects/ngx-material-legacy/legacy-tabs/internal/tab-nav-bar-base.ts';
const original=readFileSync(resolve(root,originalPath),'utf8'),candidate=readFileSync(resolve(root,candidatePath),'utf8');
assert.equal(hash(original),'f027ace09827cf65cbcf53b1d969bf4964563466b1f330b7ddd4d8525934dada');
function method(source,name,kind=ts.ScriptKind.TS){
 const file=ts.createSourceFile('source.ts',source,ts.ScriptTarget.Latest,true,kind),owner=file.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text===name);assert.ok(owner);
 const node=owner.members.find(node=>node.name?.getText(file)==='_handleKeydown');assert.ok(node);return node.getText(file);
}
function program(text){return ts.transpileModule('export class Probe {'+text+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;}
async function handler(text){const emitted='const ENTER='+ENTER+', SPACE='+SPACE+';\n'+program(text);return (await import('data:text/javascript;base64,'+Buffer.from(emitted).toString('base64'))).Probe.prototype._handleKeydown;}
function observations(handle){
 const rows=[];
 for(const disabled of [false,true])for(const tabPanel of [false,true])for(const [key,keyCode,modifiers]of [['enter',ENTER,{}],['space',SPACE,{}],['escape',ESCAPE,{}],['enter-ctrl',ENTER,{ctrlKey:true}],['space-alt',SPACE,{altKey:true}],['letter',65,{}]]){
  const host=new EventTarget();let clicks=0;host.addEventListener('click',()=>clicks++);
  host.click=()=>host.dispatchEvent(new Event('click'));
  const instance={disabled,_tabNavBar:{tabPanel:tabPanel?{}:null},elementRef:{nativeElement:host}};
  const event=new Event('keydown',{cancelable:true});Object.defineProperties(event,Object.fromEntries(Object.entries({keyCode,...modifiers}).map(([name,value])=>[name,{value}])));
  handle.call(instance,event);rows.push({id:(disabled?'disabled':'enabled')+'-'+(tabPanel?'panel':'native')+'/'+key,clicks,defaultPrevented:event.defaultPrevented});
 }
 return rows;
}
const originalMethod=method(original,'_MatTabLinkBase'),candidateMethod=method(candidate,'_MatTabLinkBase');
const reference=observations(await handler(originalMethod)),actual=observations(await handler(candidateMethod));
const differences=actual.filter((row,i)=>JSON.stringify(row)!==JSON.stringify(reference[i])).map(row=>row.id);
// Record the existing separate space-scroll adaptation openly; this SHA changes enter activation.
assert.deepEqual(differences,['enabled-panel/space','enabled-panel/space-alt']);
for(const id of differences){const row=actual.find(row=>row.id===id),old=reference.find(row=>row.id===id);assert.equal(row.clicks,old.clicks);assert.equal(old.defaultPrevented,false);assert.equal(row.defaultPrevented,true);}
const enterCases=actual.filter(row=>row.id.endsWith('/enter')||row.id.endsWith('/enter-ctrl'));
assert.deepEqual(enterCases,reference.filter(row=>row.id.endsWith('/enter')||row.id.endsWith('/enter-ctrl')));
const peers=[];
for(const cap of JSON.parse(readFileSync(resolve(root,'compatibility/rc/tab-completion-peer-sources/identities.json'),'utf8'))){
 const compressed=readFileSync(resolve(root,cap.retained.path));assert.equal(hash(compressed),cap.retained.sha256);
 const bytes=gunzipSync(compressed);assert.equal(hash(bytes),cap.member_sha256);
 const text=method(bytes.toString('utf8'),'MatTabLink',ts.ScriptKind.JS);assert.equal(program(text),program(candidateMethod));
 const rows=observations(await handler(text));assert.deepEqual(rows,actual);
 peers.push({line:cap.line,version:cap.version,member_sha256:cap.member_sha256,complete_method:text,program_sha256:hash(program(text)),cases:rows});
}
const mutants=[];
for(const [id,find,replacement]of [
 ['drop-enter-activation','event.keyCode === SPACE || event.keyCode === ENTER','event.keyCode === SPACE'],
 ['allow-disabled-activation','if (this.disabled)','if (false)'],
 ['prevent-enabled-enter-navigation','if (event.keyCode === SPACE)','if (true)'],
 ['activate-native-links-without-panel','else if (this._tabNavBar.tabPanel)','else if (true)'],
 ['omit-space-scroll-prevention','        if (event.keyCode === SPACE) {\n          event.preventDefault();\n        }',''],
 ]){
 assert.ok(candidateMethod.includes(find),id);const rows=observations(await handler(candidateMethod.replace(find,replacement)));
 const failed=rows.filter((row,i)=>JSON.stringify(row)!==JSON.stringify(actual[i])).map(row=>row.id);assert.ok(failed.length,'mutant survived: '+id);mutants.push({id,result:'rejected',different_case_ids:failed});
}
const report={schema_version:1,line:JSON.parse(readFileSync(resolve(root,'projects/ngx-material-legacy/package.json'))).version.startsWith('21.')?'21.x':'main',node:process.version,typescript:ts.version,source:{path:candidatePath,sha256:hash(candidate),complete_method:candidateMethod,program_sha256:hash(program(candidateMethod))},original:{path:originalPath,sha256:hash(original),complete_method:originalMethod},reference,candidate:actual,enter_contract_cases:enterCases.length,existing_separate_space_prevention_deltas:differences,peers,mutants,scope:'Complete keydown method execution with borrowed public keycodes, real Node EventTarget/cancelable Event and synthetic click host; no constructor/Angular view/native browser/default anchor navigation/packed/minimum runtime qualification.',native_executed:false,g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:actual.length,enter_contract_cases:enterCases.length,mutants_rejected:mutants.length,native_executed:false}));

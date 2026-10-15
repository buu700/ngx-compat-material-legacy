/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete original/current owned prototypes with explicit focus/view protocols. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),ts=require('typescript'),read=p=>readFileSync(join(root,p),'utf8'),hash=b=>createHash('sha256').update(b).digest('hex');
const {Observable,Subject}=require('rxjs'),{take,takeUntil}=require('rxjs/operators');
const adapterPath='tests/select_public_open_lifetime_probe.mjs',adapter=read(adapterPath),sf=ts.createSourceFile(adapterPath,adapter,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);
const functions=['declaration','prototype','fixture'].map(name=>{const found=sf.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.equal(found.length,1);return found[0].getText(sf);}).join('\n');
const {prototype,fixture}=new Function('assert','ts','Observable','Subject','take','takeUntil',functions+';return {prototype,fixture};')(assert,ts,Observable,Subject,take,takeUntil);
const current={base:read('projects/ngx-material-legacy/legacy-select/internal/select-base.ts'),public:read('projects/ngx-material-legacy/legacy-select/select.ts'),helper:read('projects/ngx-material-legacy/legacy-select/internal/after-select-render.ts')};
const original={...current,base:read('reference/material-16.2.14/select-render-sources/select-base.ts'),public:read('reference/material-16.2.14/select-render-sources/select.ts')};
assert.equal(hash(original.base),'ba939bcc724eab50cc71c628c3977ddd68f052bfb265a77de8793ec09562cd73');assert.equal(hash(original.public),'f75594460cc49d590a74643ce2888990f498262d83c63d907966d5095ee0098d');
function focusClick(sources,route,enclosed){
 const model=fixture(prototype(sources)),instance=model.instance,host=new EventTarget(),trigger=new EventTarget();let focused=false,touched=0,focusEvents=0,stateChanges=0;
 host.focus=()=>{if(!focused){focused=true;host.dispatchEvent(new Event('focus'));}};
 instance._elementRef={nativeElement:host};instance._onTouched=()=>touched++;instance.stateChanges.subscribe(()=>stateChanges++);
 host.addEventListener('focus',()=>{focusEvents++;instance.open();});
 trigger.addEventListener('click',()=>instance[route]());
 if(enclosed)trigger.addEventListener('click',()=>instance.onContainerClick());
 try{
  host.focus();model.stable.next();const afterFocus={panel_open:instance.panelOpen,measurements:model.measurements(),calculations:model.calculations(),touched,state_changes:stateChanges,focus_events:focusEvents};
  trigger.dispatchEvent(new Event('click'));model.stable.next();
  const afterClick={panel_open:instance.panelOpen,measurements:model.measurements(),calculations:model.calculations(),touched,state_changes:stateChanges,focus_events:focusEvents};
  const okay=afterFocus.panel_open===true&&afterFocus.measurements===1&&afterClick.panel_open===true&&afterClick.measurements===1&&afterClick.calculations===1&&afterClick.touched===0&&afterClick.state_changes===afterFocus.state_changes&&afterClick.focus_events===1;
  return {enclosure:enclosed?'form-field-callback-protocol':'bare',route,after_focus:afterFocus,after_click:afterClick,focus_click_contract_passes:okay};
 }finally{instance.ngOnDestroy();}
}
const positives=[],originals=[],reversions=[];
for(const enclosed of [false,true]){
 const before=focusClick(original,'toggle',enclosed);assert.equal(before.focus_click_contract_passes,false);originals.push(before);
 const after=focusClick(current,'open',enclosed);assert.equal(after.focus_click_contract_passes,true);positives.push(after);
 const reverted=focusClick(current,'toggle',enclosed);assert.equal(reverted.focus_click_contract_passes,false);reversions.push({id:'restore-template-toggle',...reverted});
 for(const [field,before,after,id]of [
  ['base','return !this._motionDestroyed && !this._panelOpen && !this.disabled','return !this._motionDestroyed && !this.disabled','remove-open-state-predicate'],
  ['public','if (super._canOpen()) {','if (true) {','remove-derived-measurement-guard']]){
  assert.equal(current[field].split(before).length,2);const changed={...current,[field]:current[field].replace(before,after)},observed=focusClick(changed,'open',enclosed);assert.equal(observed.focus_click_contract_passes,false);reversions.push({id,...observed});
 }
}
function noopClose(sources){const f=fixture(prototype(sources));let touched=0,changes=0;f.instance._onTouched=()=>touched++;f.instance.stateChanges.subscribe(()=>changes++);try{f.instance.close();f.instance.close();return {touched,state_changes:changes,panel_open:f.instance.panelOpen};}finally{f.instance.ngOnDestroy();}}
const noopCloseObserved=noopClose(current);assert.deepEqual(noopCloseObserved,{touched:0,state_changes:0,panel_open:false});
const closeGuard='  close(): void {\n    if (!this._motionDestroyed && this._panelOpen) {';assert.equal(current.base.split(closeGuard).length,2);
const changedClose=noopClose({...current,base:current.base.replace(closeGuard,'  close(): void {\n    if (!this._motionDestroyed) {')});assert.ok(changedClose.touched>0);reversions.push({id:'remove-closed-state-guard',observed:changedClose});
const guards=[];
for(const kind of ['disabled','empty'])for(const enclosed of [false,true]){
 const f=fixture(prototype(current)),instance=f.instance;let focused=0;instance._elementRef={nativeElement:{focus:()=>focused++}};
 instance.disabled=kind==='disabled';instance.options.length=kind==='empty'?0:1;
 try{instance.open();instance.onContainerClick();assert.equal(instance.panelOpen,false);assert.equal(f.measurements(),0);assert.equal(f.calculations(),0);guards.push({kind,enclosed,panel_open:instance.panelOpen,measurements:f.measurements(),focused});}finally{instance.ngOnDestroy();}
}
const toggle=fixture(prototype(current));try{toggle.instance.toggle();assert.equal(toggle.instance.panelOpen,true);toggle.instance.toggle();assert.equal(toggle.instance.panelOpen,false);}finally{toggle.instance.ngOnDestroy();}
const output={schema_version:1,line:JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main',node:process.version,typescript:ts.version,role:'Complete original/current select prototypes, stripped decorators and synthetic mixed parent; focus/click are Node EventTarget plus explicit view/zone/form-field callback protocols only',originals,positives,reversions,guards,public_toggle_preserved:true,noop_close_observation:noopCloseObserved,adapter_source_sha256:hash(adapter),source_inputs:Object.entries({base:'projects/ngx-material-legacy/legacy-select/internal/select-base.ts',public:'projects/ngx-material-legacy/legacy-select/select.ts',helper:'projects/ngx-material-legacy/legacy-select/internal/after-select-render.ts',probe:'tests/select_focus_click_method_probe.mjs'}).map(([role,path])=>({role,path,sha256:hash(read(path))})),actual_constructor_or_Angular_node_or_native_or_packed_executed:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:output.line,positive_contexts:positives.length,original_expected_failures:originals.length,source_reversions_rejected:reversions.length,disabled_empty_guard_contexts:guards.length,public_toggle_preserved:true,actual_constructor_or_Angular_node_or_native_or_packed_executed:false}));

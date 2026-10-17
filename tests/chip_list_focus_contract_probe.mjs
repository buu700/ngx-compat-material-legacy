/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Genuine public managers/QueryLists with explicit item callbacks; no Angular/native credit. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {keyManagerPublicSubjects} from '../scripts/key-manager-public-subjects.mjs';
import {inspectPublicKeyManagerDeclarations} from '../scripts/key-manager-caller-review.mjs';
import {CHIP_LIST_SOURCE,CHIP_LIST_REFERENCE,inspectChipListFocusContract,readChipListPrior,replayChipListClass} from '../scripts/chip-list-focus-contract.mjs';
const require=createRequire(import.meta.url),{Subject}=require('rxjs');
const root=fileURLToPath(new URL('../',import.meta.url)),read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const prior=readChipListPrior(root),reference=read(CHIP_LIST_REFERENCE),candidate=read(CHIP_LIST_SOURCE),before=prior.sources.find(s=>s.path===CHIP_LIST_SOURCE).text;
const contract=inspectChipListFocusContract({root});
// This bounded repair changes only the complete focus method. No declaration,
// constructor, decorator, selector, resource or other production member changes.
const focusPattern=/  focus\(options\?: FocusOptions\): void \{[\s\S]*?\n  \}\n/;
assert.equal(candidate,before.replace(focusPattern,reference.match(focusPattern)[0]));
const definitions=[
 {name:'initial',count:3,active:null,disabled:[],expected:{active:0,focus:[0],state:1,input:0}},
 {name:'later-active',count:3,active:2,disabled:[],expected:{active:0,focus:[0],state:1,input:0}},
 {name:'disabled-active',count:3,active:1,disabled:[0,1],expected:{active:2,focus:[2],state:1,input:0}},
 {name:'same-index-zero',count:3,active:0,disabled:[],expected:{active:0,focus:[0],state:1,input:0}},
 {name:'focused-input',count:3,active:2,disabled:[],input:true,inputFocused:true,expected:{active:2,focus:[],state:0,input:0}},
 {name:'disabled-list',count:3,active:2,disabled:[],listDisabled:true,expected:{active:2,focus:[],state:0,input:0}},
 {name:'empty-input-options',count:0,active:null,disabled:[],input:true,expected:{active:-1,focus:[],state:1,input:1}},
 {name:'empty-without-input',count:0,active:null,disabled:[],expected:{active:-1,focus:[],state:1,input:0}},
 {name:'all-disabled',count:3,active:null,disabled:[0,1,2],expected:{active:-1,focus:[],state:1,input:0}},
];
function exercise(source,model){
 const Replay=replayChipListClass(source),cases={};
 for(const definition of definitions){
  const events=[],inputOptions=[],options={preventScroll:true},query=new model.framework.runtime.QueryList();
  const items=Array.from({length:definition.count},(_,i)=>({disabled:definition.disabled.includes(i),focus(){events.push(i);}}));
  query.reset(items);query.notifyOnChanges();const manager=new model.runtime.FocusKeyManager(query),stateChanges=new Subject();let state=0;
  const subscription=stateChanges.subscribe(()=>state++);
  const receiver=Object.assign(new Replay(),{disabled:!!definition.listDisabled,chips:query,_keyManager:manager,stateChanges,
   _chipInput:definition.input?{focused:!!definition.inputFocused,focus(value){inputOptions.push(value);}}:undefined});
  try{
   if(definition.active!==null)manager.updateActiveItem(definition.active);
   receiver.focus(options);
   for(const value of inputOptions)assert.equal(value,options,'focus options identity lost');
   cases[definition.name]={active:manager.activeItemIndex,focus:events,state,input:inputOptions.length};
  }finally{subscription.unsubscribe();stateChanges.complete();manager.destroy();query.destroy();}
 }
 return cases;
}
const sourceVariants=[
 ['missing-disabled-event',candidate.replace('this._syncChipsState();\n    this.stateChanges.next();','this._syncChipsState();')],
 ['event-before-propagation',candidate.replace('this._syncChipsState();\n    this.stateChanges.next();','this.stateChanges.next();\n    this._syncChipsState();')],
 ['extra-disabled-event',candidate.replace('this._syncChipsState();\n    this.stateChanges.next();','this._syncChipsState();\n    this.stateChanges.next();\n    this.stateChanges.next();')],
 ['wrong-disabled-getter',candidate.replace('return this.ngControl ? !!this.ngControl.disabled : this._disabled;','return this._disabled;')],
 ['retain-active-source',before],
 ['drop-options-source',candidate.replace('this._chipInput.focus(options);','this._chipInput.focus();')],
];
for(const [name,text]of sourceVariants){assert.notEqual(text,candidate);assert.throws(()=>inspectChipListFocusContract({root,readSource:p=>p===CHIP_LIST_SOURCE?text:read(p)}),undefined,name);}
const subjects=await keyManagerPublicSubjects(root),observations=[],mutations=[],baseline=[];
try{
 for(const model of subjects.models){
  const declarations=inspectPublicKeyManagerDeclarations(model);
  for(const member of ['setFirstItemActive','updateActiveItem','activeItemIndex','destroy'])assert.ok(declarations.members.FocusKeyManager.has(member),'missing stable public API '+member);
  const original=exercise(reference,model),actual=exercise(candidate,model),old=exercise(before,model);
  for(const definition of definitions){assert.deepEqual(original[definition.name],definition.expected,'tagged expectation mismatch');assert.deepEqual(actual[definition.name],original[definition.name],'candidate differs from untouched tag');}
  const drift=definitions.filter(d=>JSON.stringify(old[d.name])!==JSON.stringify(original[d.name])).map(d=>d.name);
  assert.deepEqual(drift,['later-active','disabled-active'],'prior candidate regression was not reproduced');
  baseline.push({line:model.subject.line,previous_candidate_drift:drift});
  const changes=[
   ['retain-active',before],
   ['skip-index-zero',candidate.replace('this.chips.length > 0','this.chips.length > 0 && this._keyManager.activeItemIndex !== 0')],
   ['ignore-disabled-list',candidate.replace('if (this.disabled) {\n      return;\n    }','if (false) {\n      return;\n    }')],
   ['drop-focus-options',candidate.replace('this._focusInput(options);','this._focusInput();')],
  ];
  for(const [name,source]of changes){assert.notEqual(source,candidate);assert.throws(()=>assert.deepEqual(exercise(source,model),original),undefined,'unrejected behavior mutation '+name);mutations.push({line:model.subject.line,name,rejected:true});}
  observations.push({line:model.subject.line,framework:model.subject.framework_version,cdk:model.subject.cdk_version,cases:actual,public_entry:model.public_entry,public_contract:declarations.classes.FocusKeyManager});
 }
 console.log(JSON.stringify({schema_version:1,contract,observations,baseline,mutations,source_contract_mutations_rejected:sourceVariants.length,subject_capsule_sha256:subjects.capsule_sha256,rxjs:subjects.rxjs,node:process.version,native_execution:false,scope:'Complete original/candidate focus methods with authenticated public original and minimum FocusKeyManagers and matching QueryLists. Item callbacks, input and state listeners are explicit protocols; no Angular view, native DOM, packed library or runtime floor qualification.',g11_claim:'not-passed'}));
}finally{subjects.dispose();}

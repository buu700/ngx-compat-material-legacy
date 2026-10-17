/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Raw current focus method diagnostics; no Angular fixture/browser execution. */
import assert from 'node:assert/strict';
import {chipLifecycleAdmissionBeforeRead} from './chip_lifecycle_admission_context.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {CHIP_FOCUS_SOURCE,CHIP_FOCUS_PRIOR,readChipFocusRepairPrior,inspectChipFocusRepair,replayChipFocusSource} from '../scripts/chip-focus-contract.mjs';
import {inspectChipFocusSpecs,chipFocusBeforeRead,chipFocusRepairInputs,CHIP_FOCUS_REPAIR_INPUTS} from '../scripts/chip-focus-repair.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),{Subject,Subscription}=require('rxjs'),{take}=require('rxjs/operators'),read=chipLifecycleAdmissionBeforeRead(p=>readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const contract=inspectChipFocusRepair(),specs=inspectChipFocusSpecs({readMember:read}),prior=readChipFocusRepairPrior(),before=prior.sources.find(m=>m.path===CHIP_FOCUS_SOURCE).text,current=read(CHIP_FOCUS_SOURCE).toString(),compile=s=>replayChipFocusSource(s,{Subscription,take,Promise});
function fixture(Replay,stable=false){
 const o=new Replay(),document={activeElement:'outside'},events=[],destroyed=[],zone=new Subject();let nativeCalls=0,cleanups=0;
 const host={focus(){nativeCalls++;if(document.activeElement!=='chip'){document.activeElement='chip';o.focus();}}},outside={focus(){if(document.activeElement==='chip'){document.activeElement='outside';o._blur();}else document.activeElement='outside';}};
 const destroy=new Subject();destroy.emit=destroy.next.bind(destroy);Object.assign(o,{_hasFocus:false,_isDestroyed:false,_onFocus:new Subject(),_onBlur:new Subject(),destroyed:destroy,_ngZone:{isStable:stable,onStable:zone,run:fn=>fn()},_elementRef:{nativeElement:host},_chipRipple:{_removeTriggerEvents:()=>cleanups++}});
 o._onFocus.subscribe(e=>events.push({kind:'focus',same_chip:e.chip===o,focused:o._hasFocus,active:document.activeElement}));o._onBlur.subscribe(e=>events.push({kind:'blur',same_chip:e.chip===o,focused:o._hasFocus,active:document.activeElement}));destroy.subscribe(e=>destroyed.push({same_chip:e.chip===o,focused:o._hasFocus,cleanups_before:cleanups,request_closed:o._blurSubscription?.closed}));
 return {o,document,host,outside,events,destroyed,zone,nativeCalls:()=>nativeCalls,resetNativeCalls:()=>nativeCalls=0,cleanups:()=>cleanups};
}
async function measure(Replay){const observations=[];
 {
  const f=fixture(Replay);f.o.focus();assert.equal(f.nativeCalls(),1,'programmatic focus reentered native focus');assert.deepEqual(f.events,[{kind:'focus',same_chip:true,focused:true,active:'chip'}]);f.o.focus();assert.equal(f.nativeCalls(),1);f.host.focus();assert.equal(f.events.length,1);observations.push({id:'initial-focus-synchronous-host-and-repeat',native_focus_calls_before_direct_repeat:1,focus_notifications:1});
 }
 for(const stable of [false,true]){
  const f=fixture(Replay,stable);f.host.focus();f.outside.focus();assert.equal(f.document.activeElement,'outside');assert.equal(f.o._hasFocus,true);f.resetNativeCalls();f.o.focus();assert.equal(f.document.activeElement,'chip','pending blur prevented DOM refocus');assert.equal(f.nativeCalls(),1);assert.equal(f.o._blurSubscription.closed,true);await Promise.resolve();f.zone.next();assert.equal(f.o._hasFocus,true);assert.equal(f.events.filter(e=>e.kind==='blur').length,0);assert.equal(f.events.filter(e=>e.kind==='focus').length,2);assert.ok(f.events.every(e=>e.focused&&e.active==='chip'));observations.push({id:'pending-blur-refocus',stable,active:'chip',stale_blurs:0,native_focus_calls:1});
 }
 for(const race of ['microtask-first','stability-first']){
  const f=fixture(Replay,true);f.o.focus();f.outside.focus();const old=f.o._blurSubscription;f.o._blur();assert.equal(old.closed,true);assert.equal(f.events.filter(e=>e.kind==='blur').length,0);if(race==='stability-first')f.zone.next();else await Promise.resolve();assert.equal(f.o._hasFocus,false);assert.equal(f.o._blurSubscription.closed,true);await Promise.resolve();f.zone.next();assert.equal(f.events.filter(e=>e.kind==='blur').length,1);f.resetNativeCalls();f.o.focus();f.o.focus();assert.equal(f.nativeCalls(),1,'closed old request must not force repeated focus');assert.equal(f.events.filter(e=>e.kind==='focus').length,2);observations.push({id:'repeated-blur-one-delivery-and-closed-request-refocus',race,blur_notifications:1});
 }
 for(const stable of [false,true]){
  const f=fixture(Replay,stable);f.o.focus();f.outside.focus();f.o.ngOnDestroy();assert.equal(f.o._blurSubscription.closed,true);await Promise.resolve();f.zone.next();f.o.ngOnDestroy();f.o.focus();assert.equal(f.document.activeElement,'outside');assert.deepEqual(f.destroyed,[{same_chip:true,focused:true,cleanups_before:0,request_closed:true}]);assert.equal(f.cleanups(),1);assert.equal(f.events.filter(e=>e.kind==='blur').length,0);observations.push({id:'destroy-cancels-and-notifies-before-cleanup',stable,destroy_notifications:1});
 }
 {
  const f=fixture(Replay);f.o._onFocus.subscribe(()=>f.o.focus());f.o.focus();assert.equal(f.nativeCalls(),1);assert.equal(f.events.filter(e=>e.kind==='focus').length,1);observations.push({id:'focus-subscriber-reentry',focus_notifications:1});
 }
 {
  const f=fixture(Replay);f.o.ngOnDestroy();f.o.focus();f.o._blur();assert.equal(f.document.activeElement,'outside');assert.equal(f.nativeCalls(),0);assert.equal(f.events.length,0);assert.equal(f.o._blurSubscription,undefined);observations.push({id:'destroyed-never-focused-chip-rejects-new-requests',native_focus_calls:0});
 }
 return observations;
}
const actual=await measure(compile(current)),baseline=[];
{
 const f=fixture(compile(before));f.o.focus();assert.equal(f.nativeCalls(),2);assert.equal(f.events.filter(e=>e.kind==='focus').length,2);baseline.push({id:'synchronous-host-focus-reentry',native_focus_calls:2,focus_notifications:2});
}
{
 const f=fixture(compile(before),true);f.host.focus();f.outside.focus();f.resetNativeCalls();f.o.focus();await Promise.resolve();f.zone.next();assert.equal(f.document.activeElement,'outside');assert.equal(f.o._hasFocus,true);assert.equal(f.nativeCalls(),0);baseline.push({id:'pending-blur-refocus',active:'outside',cached_hasFocus:true,native_focus_calls:0});
}
function changeFocus(old,fresh){const file=ts.createSourceFile('mutant.ts',current,ts.ScriptTarget.Latest,true),owner=file.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='MatLegacyChip'),node=owner.members.find(n=>n.name?.getText()==='focus'),body=node.getText(file);assert.equal(body.split(old).length,2,old);const changed=current.slice(0,node.getStart(file))+body.replace(old,fresh)+current.slice(node.end);assert.equal(ts.createSourceFile('valid-mutant.ts',changed,ts.ScriptTarget.Latest,true).parseDiagnostics.length,0);return changed;}
const mutations=[
 ['drop-pending-refocus','!this._hasFocus || wasBlurPending','!this._hasFocus'],
 ['capture-pending-after-cancel','const wasBlurPending = !!this._blurSubscription && !this._blurSubscription.closed;\n    this._blurSubscription?.unsubscribe();','this._blurSubscription?.unsubscribe();\n    const wasBlurPending = !!this._blurSubscription && !this._blurSubscription.closed;'],
 ['state-latched-after-native-focus','this._hasFocus = true;\n      this._elementRef.nativeElement.focus();','this._elementRef.nativeElement.focus();\n      this._hasFocus = true;'],
 ['notify-before-DOM-focus','this._elementRef.nativeElement.focus();\n      this._onFocus.next({chip: this});','this._onFocus.next({chip: this});\n      this._elementRef.nativeElement.focus();'],
 ['stale-blur-not-cancelled','this._blurSubscription?.unsubscribe();',''],
 ['closed-request-treated-as-pending','!!this._blurSubscription && !this._blurSubscription.closed','!!this._blurSubscription'],
 ['destroyed-focus-not-guarded','if (this._isDestroyed) return;',''],
 ['duplicate-focus-notification','this._onFocus.next({chip: this});','this._onFocus.next({chip: this});\n      this._onFocus.next({chip: this});'],
 ['missing-focus-notification','this._onFocus.next({chip: this});',''],
];
const controls=[];
for(const [id,old,fresh]of mutations){const source=changeFocus(old,fresh);await assert.rejects(()=>measure(compile(source)),e=>e.code==='ERR_ASSERTION',id);assert.throws(()=>inspectChipFocusRepair({readMember:p=>p===CHIP_FOCUS_SOURCE?Buffer.from(source):read(p),checkProduct:false}));controls.push({id,valid_TypeScript:true,behavior_rejected:true,current_contract_rejected:true});}
const structural=[
 ['unrelated-production-member',CHIP_FOCUS_SOURCE,b=>Buffer.from(b.toString().replace('this.removed.emit({chip: this});','this.removed.emit({chip: this});\n      this.removed.emit({chip: this});'))],
 ['historical-golden-change','reference/material-16.2.14/chips-keyboard-sources/chip.ts',b=>Buffer.concat([b,Buffer.from('\n')])],
 ['stylesheet-change','projects/ngx-material-legacy/legacy-chips/chips.scss',b=>Buffer.concat([b,Buffer.from('\n')])],
];
for(const [id,path,mutate]of structural){const bytes=mutate(read(path));assert.notEqual(hash(bytes),hash(read(path)));assert.throws(()=>inspectChipFocusRepair({readMember:p=>p===path?bytes:read(p)}));controls.push({id,result:'rejected'});}
for(const [id,path,mutate]of [
 ['field-only-DOM-escape','projects/ngx-material-legacy/legacy-chips/chip-list.spec.ts',b=>Buffer.from(b.toString().replace('expect(chipListNativeElement.tabIndex).toBe(-1);',''))],
 ['new-focus-test-removed','projects/ngx-material-legacy/legacy-chips/chip.spec.ts',b=>Buffer.from(b.toString().replace('should restore DOM focus while an earlier blur is pending','unrelated test'))],
 ['old-callback-changed','projects/ngx-material-legacy/legacy-chips/chip.spec.ts',b=>Buffer.from(b.toString().replace('expect(counter).toBe(1);','expect(counter).toBe(2);'))],
 ['old-native-count','scripts/upstream-historical-behavior-evidence.mjs',b=>Buffer.from(b.toString().replace('const requiredCaseCount = 2236;','const requiredCaseCount = 2232;'))],
 ['native-case-omitted','compatibility/rc/matrices/full-verify.json',b=>{const d=JSON.parse(b);const c=d.checks.find(c=>c.check_id==='historical-legacy-artifact').acceptance.cases_by_line[contract.line]['original-and-shared-cases'];c.splice(c.indexOf(specs.appended_cases[0].case_id),1);return Buffer.from(JSON.stringify(d));}],
 ['inventory-misclassified','testing/legacy-runner/historical-inventory.json',b=>{const d=JSON.parse(b);d.rows.find(r=>r.candidate.endsWith('/legacy-chips/chip.spec.ts')).adaptation='identical-to-historical';return Buffer.from(JSON.stringify(d));}],
]){const bytes=mutate(read(path));assert.notEqual(hash(bytes),hash(read(path)));assert.throws(()=>inspectChipFocusSpecs({readMember:p=>p===path?bytes:read(p)}));controls.push({id,result:'rejected'});}
const {data}=chipFocusRepairInputs(),historical=chipFocusBeforeRead(read);
for(const m of data.current_members){const original=prior.sources.find(p=>p.path===m.path);assert.equal(historical(m.path).toString(),original.text);const unknown=Buffer.concat([read(m.path),Buffer.from('\n unreviewed\n')]);assert.deepEqual(chipFocusBeforeRead(p=>p===m.path?unknown:read(p))(m.path),unknown);controls.push({id:'unknown-historical-subject-'+m.path,result:'passed-through-to-strict-original-check'});}
for(const path of [CHIP_FOCUS_REPAIR_INPUTS,CHIP_FOCUS_PRIOR]){assert.throws(()=>chipFocusRepairInputs({readMember:p=>p===path?Buffer.concat([read(p),Buffer.from('changed')]):read(p)}));let corrupt=false;const changing=p=>corrupt&&p===path?Buffer.from('changed'):read(p),captured=chipFocusBeforeRead(changing);corrupt=true;assert.throws(()=>chipFocusRepairInputs({readMember:changing}));assert.equal(captured(CHIP_FOCUS_SOURCE).toString(),before);controls.push({id:'late-capsule-corruption-'+path,result:'direct-recheck-rejects;captured-view-retained'});}
assert.ok(Object.isFrozen(prior.sources[0]));assert.throws(()=>prior.sources[0].text='changed');controls.push({id:'immutable-prior',result:'rejected'});
const report={schema_version:1,line:contract.line,current_contract:contract,current_native_spec_contract:specs,current_focus_protocol_cases:actual.length,observations:actual,before_source_counterexamples:baseline,before_counterexamples_reproduced:2,current_counterexamples_remaining_in_protocols:0,semantic_behavior_mutants:mutations.length,controls,prior_sources_and_reports_preserved:true,old_foundation_subjects_replayed_only_through_explicit_view:true,current_product_specs_read_raw_files:true,retained_native_registry_subject:"authenticated pre-lifecycle-admission registry;current expanded registry checked separately",installed_RxJS:require('rxjs/package.json').version,node:process.version,scope:'Selected complete current focus/blur/destroy method bodies with genuine host RxJS and explicit synchronous DOM-event/zone/ripple collaborators. Angular historical specs and the full artifact-bound matrix are authored/inspected,not executed here. No current native/browser/packed/floor/full-suite credit.',actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:contract.line,current_focus_protocol_cases:actual.length,before_counterexamples_reproduced:2,current_counterexamples_remaining:0,semantic_mutants:mutations.length,controls:controls.length,old_case_identities_preserved:2227,full_native_case_count:2236,actual_native_packed_or_floor_qualified:false}));

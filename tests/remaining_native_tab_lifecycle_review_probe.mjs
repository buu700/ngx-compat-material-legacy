/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real finite reviewer with corrupted in-memory subjects; no browser/packed qualification. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectTabLifecycleRepair} from '../scripts/remaining-native-tab-lifecycle-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const result=inspectTabLifecycleRepair({root}),cases=[];
const negative=(id,path,mutate)=>{const original=read(path),changed=Buffer.from(mutate(original.toString()));assert.notDeepEqual(changed,original,id);
 assert.throws(()=>inspectTabLifecycleRepair({root,readMember:name=>name===path?changed:read(name)}));cases.push({id,result:'rejected'});};
const tab='projects/ngx-material-legacy/legacy-tabs/internal/tab-body-base.ts',html='projects/ngx-material-legacy/legacy-tabs/tab-body.html';
for(const [id,find,value]of [
 ['constructor-contract','    changeDetectorRef: ChangeDetectorRef,','    changeDetectorRef: ChangeDetectorRef, extra: unknown,'],
 ['changed-import-source',"from '@angular/core'","from '@angular/core/private'"],
 ['changed-base-metadata','@Directive({standalone: false})','@Directive({standalone: true})'],
 ['changed-original-output','new EventEmitter<number>()','new EventEmitter<number>(true)'],
 ['added-member','  ngOnInit() {','  extraPeerMirror(): void {}\n  ngOnInit() {'],
 ['changed-private-signature','private _startTransition(): void','_startTransition(): void'],
 ['changed-original-initial-state',"this._position == 'center' && this.origin != null","this._position == 'center'"],
 ['unexecuted-source-edit',"style.setProperty('transition-duration', '0ms');","style.setProperty('transition-duration', '100ms');"],
 ['new-field-upstream-type','private _deferredCentering: LegacyTabTransitionEvent | undefined;','private _deferredCentering: EventEmitter<number> | undefined;'],
 ['new-field-public','private _originTransition:','public _originTransition:'],
 ['new-hook-parameter','ngAfterViewInit(): void','ngAfterViewInit(extra: unknown): void'],
 ['new-getter-input','  get _contentIsVisible(): boolean','  @Input() get _contentIsVisible(): boolean'],
 ])negative(id,tab,text=>{assert.ok(text.includes(find));return text.replace(find,value);});
negative('template-structure',html,text=>text.replace('<div','<section'));
negative('template-selector',html,text=>text.replace('class="mat-tab-body-content"','class="candidate-tab-body"'));
negative('template-extra-binding',html,text=>text.replace('cdkScrollable','cdkScrollable [style.padding]="4"'));
negative('template-lost-visibility-fix',html,text=>text.replace('_contentIsVisible ? null','_isCenterPosition(_position) ? null'));
negative('style-source-comment','projects/ngx-material-legacy/legacy-tabs/tab-body.scss',text=>text+'\n// unexpected edit\n');
negative('unrelated-product-source','projects/ngx-material-legacy/legacy-button/button.ts',text=>text+'\n// unexpected edit\n');
for(const [kind,field,value]of [
 ['lifecycle-controls','source_sha256','0'.repeat(64)],['lifecycle-controls','passed',46],['lifecycle-controls','failed',1],['lifecycle-controls','native_browser_execution',true],
 ['producer-controls','source_sha256','0'.repeat(64)],['producer-controls','native_executed',true],
 ['admission-controls','actual_reader_writer_controls',71],['admission-controls','cached_actual_full_native_raw_controls',305],['admission-controls','cached_actual_tab_semantic_controls',3101],['admission-controls','actual_packed_native_or_floor_qualified',true],
 ['dispatch-controls','actual_root_cli_cases',24],['dispatch-controls','root_sha256','0'.repeat(64)],
 ['cyph-style','css_scss_changes',1],['cyph-style','consumer_written',true],['cyph-style','cyph_build_executed',true],
 ])negative('changed-evidence-'+kind+'-'+field,'compatibility/rc/remaining-native-admission-tab-repair-'+kind+'.json',text=>JSON.stringify({...JSON.parse(text),[field]:value}));
negative('missing-rejected-mutant','compatibility/rc/remaining-native-admission-tab-repair-lifecycle-controls.json',text=>{const json=JSON.parse(text);json.mutants.pop();return JSON.stringify(json);});
negative('changed-original-completion-contract','compatibility/rc/remaining-native-admission-tab-repair-lifecycle-controls.json',text=>{const json=JSON.parse(text);json.completion_contract.candidate[0].centered=99;return JSON.stringify(json);});
negative('changed-pinned-input','compatibility/rc/remaining-native-admission-source-inputs.json',text=>text+'\n');
const report={schema_version:1,line:result.line,scope:'Actual bounded source reviewer and in-memory corruption controls; source/API/resource checks only.',actual_reviewer_controls:cases.length,cases,source_review:result,reviewer_sha256:createHash('sha256').update(read('scripts/remaining-native-tab-lifecycle-review.mjs')).digest('hex'),producer_sha256:createHash('sha256').update(read('tests/remaining_native_tab_lifecycle_review_probe.mjs')).digest('hex'),actual_native_packed_or_floor_qualified:false};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:result.line,actual_reviewer_controls:cases.length,actual_native_packed_or_floor_qualified:false}));

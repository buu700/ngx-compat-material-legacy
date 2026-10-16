/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Complete immutable source and rejected mutations; no original spec execution. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {originalEnvironmentCases} from '../scripts/spec-test-environment-source-review.mjs';
import {overlayHooks} from '../scripts/spec-overlay-async-source-review.mjs';
import {inspectInteractionAsyncSources,interactionAsyncPins,authenticateInteractionAsyncOriginal,compareInteractionAsyncCases,reviewInteractionAsyncGlobals,inspectInteractionChipIteration} from '../scripts/spec-interaction-async-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const report=inspectInteractionAsyncSources({root}),pins=interactionAsyncPins({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-interaction-async-source-subjects.json.gz'))),controls=[];
function reject(id,action,pattern){assert.throws(action,pattern,id);controls.push({id,result:'rejected'});}
function mutateRow(subject,row,change,side='after'){
 const next=structuredClone(subject),member=next.members.find(n=>n.path===row.path),text=member[side].text;assert.equal(text.split(row.raw).length,2,'ambiguous raw row');const replaced=change(row.raw);assert.notEqual(replaced,row.raw);member[side].text=text.replace(row.raw,replaced);return next;
}
function mutateGlobal(subject,needle,replacement,side='after'){const next=structuredClone(subject),member=next.members.find(n=>n[side].text.includes(needle));assert.ok(member,needle);assert.notEqual(needle,replacement);member[side].text=member[side].text.replace(needle,replacement);return next;}
for(const[index,subject]of originals.subjects.entries()){
 for(const[id,change]of[
  ['raw-commit',n=>{n.raw_commit+='\n';n.raw_commit_sha256=hash(n.raw_commit);}],
  ['missing-file',n=>{n.members.pop();n.complete_changed_files.pop();}],
  ['foreign-file',n=>{n.members[0].path='src/material/unreviewed.spec.ts';}],
  ['missing-hunk',n=>{n.original_hunks--;}],
  ['rehashed-body',n=>{const b=n.members[0].after;b.text+='\n';b.sha256=hash(b.text);b.bytes=Buffer.byteLength(b.text);}],
  ['rehashed-diff',n=>{n.diff=n.diff.replace(/^@@ /m,'@@  ');n.diff_sha256=hash(n.diff);n.diff_bytes=Buffer.byteLength(n.diff);}],
 ]){const next=structuredClone(subject);change(next);reject(subject.sha+'-'+id,()=>authenticateInteractionAsyncOriginal(next,pins[index]));}
 const cases=originalEnvironmentCases(subject,'after'),first=cases.find(n=>n.mode==='it');assert.ok(first);
 reject(subject.sha+'-lost-case',()=>compareInteractionAsyncCases(mutateRow(subject,first,()=>''),pins[index]));
 reject(subject.sha+'-duplicated-case',()=>compareInteractionAsyncCases(mutateRow(subject,first,raw=>raw+';\n'+raw),pins[index]));
 for(const mode of['fit','xit'])reject(subject.sha+'-case-mode-'+mode,()=>compareInteractionAsyncCases(mutateRow(subject,first,raw=>raw.replace(/^it\(/,mode+'(')),pins[index]));
 for(const[id,needle,replacement]of[['predicate','.toBe(','.not.toBe('],['declaration-kind','const ','let ']]){
  const row=cases.find(n=>n.raw.includes(needle));assert.ok(row,id);reject(subject.sha+'-'+id,()=>compareInteractionAsyncCases(mutateRow(subject,row,raw=>raw.replace(needle,replacement)),pins[index]));
 }
 const orderPath=subject.members.find(m=>cases.filter(n=>n.path===m.path&&m.after.text.split(n.raw).length===2).length>=2).path,pair=cases.filter(n=>n.path===orderPath&&subject.members.find(m=>m.path===orderPath).after.text.split(n.raw).length===2).slice(0,2),reordered=structuredClone(subject),member=reordered.members.find(n=>n.path===orderPath);assert.equal(pair.length,2);
 for(const row of pair)assert.equal(member.after.text.split(row.raw).length,2);member.after.text=member.after.text.replace(pair[0].raw,'__CASE_ORDER_MARKER__').replace(pair[1].raw,pair[0].raw).replace('__CASE_ORDER_MARKER__',pair[1].raw);
 reject(subject.sha+'-case-order',()=>compareInteractionAsyncCases(reordered,pins[index]));
 const boundary=cases.find(n=>/await /.test(n.raw));assert.ok(boundary);
 reject(subject.sha+'-unrecorded-boundary',()=>compareInteractionAsyncCases(mutateRow(subject,boundary,raw=>/await [\w.]+\(/.test(raw)?raw.replace(/await [\w.]+\(/,'await unreviewedAction('):raw.replace('setTimeout(','unreviewedSetTimeout(')),pins[index]));
 const interleaved=structuredClone(subject),hooks=overlayHooks(subject,'after');let moved=false;
 for(const row of cases){const m=interleaved.members.find(n=>n.path===row.path),at=m.after.text.indexOf(row.raw),possible=hooks.filter(n=>n.path===row.path&&JSON.stringify(n.suites)===JSON.stringify(row.suites)&&m.after.text.indexOf(n.raw)<at&&m.after.text.split(n.raw).length===2).sort((a,b)=>m.after.text.indexOf(b.raw)-m.after.text.indexOf(a.raw));if(!possible.length)continue;
  const hook=possible[0];assert.equal(m.after.text.split(hook.raw).length,2);m.after.text=m.after.text.replace(hook.raw,'').replace(row.raw,row.raw+';\n'+hook.raw);moved=true;break;
 }
 assert.equal(moved,true);reject(subject.sha+'-hook-case-interleaving',()=>reviewInteractionAsyncGlobals(interleaved,pins[index]),/interleaving/);
 const file=ts.createSourceFile('original.ts',subject.members[0].after.text,ts.ScriptTarget.Latest,true);let fixture;const findFixture=n=>{if(!fixture&&ts.isClassDeclaration(n))fixture=n;ts.forEachChild(n,findFixture);};findFixture(file);assert.ok(fixture?.name);
 reject(subject.sha+'-fixture-class',()=>reviewInteractionAsyncGlobals(mutateGlobal(subject,fixture.getText(file),fixture.getText(file).replace('class '+fixture.name.text,'class UnreviewedFixture')),pins[index]));
}
for(const[index,subject]of originals.subjects.entries()){
 const rows=originalEnvironmentCases(subject,'after');
 for(const exception of pins[index].exceptions){const row=rows.find(n=>n.sha256===exception.after_sha256);assert.ok(row);let change;
  if(index===0)change=raw=>raw.replace('document.body.focus()','document.documentElement.focus()');
  else if(index===1)change=row.raw.includes('.reverse()')?raw=>raw.replace('.reverse()',''):raw=>raw.replace('selectable = true','selectable = false');
  else if(index===2)change=raw=>raw.replace('.isActive()','.isSelected()');
  else change=row.raw.includes('jasmine.clock().tick(1000)')?raw=>raw.replace('jasmine.clock().tick(1000)','jasmine.clock().tick(999)'):raw=>raw.replace(/\bprop\b/,'otherProperty');
  reject('exact-individual-source-delta-'+exception.after_sha256,()=>compareInteractionAsyncCases(mutateRow(subject,row,change),pins[index]));
 }
 for(const removal of pins[index].removed_cases){const old=originalEnvironmentCases(subject,'before').find(n=>n.sha256===removal.sha256);assert.ok(old);const next=structuredClone(subject);next.members.find(n=>n.path===old.path).after.text+='\n'+old.raw+';\n';reject('removed-tooltip-destroy-observer-'+removal.sha256,()=>compareInteractionAsyncCases(next,pins[index]));}
 for(const wait of pins[index].wait_helpers)reject('exact-added-or-retained-wait-'+wait.path+'-'+wait.side,()=>reviewInteractionAsyncGlobals(mutateRow(subject,wait,raw=>raw.replace('setTimeout','unreviewedSetTimeout'),wait.side),pins[index]));
 for(const declaration of pins[index].whole_import_declarations){const next=structuredClone(subject);next.members.find(n=>n.path===declaration.path)[declaration.side].text=next.members.find(n=>n.path===declaration.path)[declaration.side].text.replace(declaration.raw,declaration.raw.replace(declaration.module,declaration.module+'/unreviewed'));reject('exact-whole-import-'+declaration.path,()=>reviewInteractionAsyncGlobals(next,pins[index]));}
 const file=ts.createSourceFile('original.ts',subject.members[0].after.text,99,true),imp=file.statements.find(n=>ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings));assert.ok(imp);const raw=imp.getText(file);
 reject(subject.sha+'-runtime-import-kind',()=>reviewInteractionAsyncGlobals(mutateGlobal(subject,raw,raw.replace('import {','import type {')),pins[index]));
}
const material=originals.subjects[3],provider=pins[3].hook_exceptions[0];assert.ok(provider);
{const row=overlayHooks(material,'after').find(n=>n.sha256===provider.after_sha256);assert.ok(row);reject('private-disabled-animation-provider-is-individual',()=>reviewInteractionAsyncGlobals(mutateRow(material,row,raw=>raw.replace('animationsDisabled: true','animationsDisabled: false')),pins[3]));}
{const row=pins[3].added_hooks[0];assert.ok(row);reject('added-clock-cleanup-body',()=>reviewInteractionAsyncGlobals(mutateRow(material,row,raw=>raw.replace('uninstall','install')),pins[3]));
 const next=structuredClone(material),member=next.members.find(n=>n.path===row.path),first=originalEnvironmentCases(material,'after').find(n=>n.path===row.path&&JSON.stringify(n.suites)===JSON.stringify(row.suites));assert.ok(first);member.after.text=member.after.text.replace(row.raw,'').replace(first.raw,first.raw+';\n'+row.raw);reject('added-clock-cleanup-registration-position',()=>reviewInteractionAsyncGlobals(next,pins[3]),/added clock cleanup registration position/);
}
for(const needle of["'prop': string | number","'prop': v"])reject('finite-global-property-spelling-'+needle,()=>reviewInteractionAsyncGlobals(mutateGlobal(material,needle,needle.replace('prop','otherProperty'),'before'),pins[3]));
const chips=originals.subjects[1],loop=pins[1].exceptions.find(n=>n.path.endsWith('/chip-grid.spec.ts')),loopRow=originalEnvironmentCases(chips,'after').find(n=>n.sha256===loop.after_sha256);assert.ok(loopRow);
for(const[id,change]of[
 ['array-snapshot-order',raw=>raw.replace('.reverse()','')],
 ['array-snapshot-must-not-escape-or-mutate',raw=>raw.replace('chip.focus();','chipEls.push(chip); chip.focus();')],
 ['iteration-binder',raw=>raw.replace('const chip of chipEls','const otherChip of chipEls')],
 ['iteration-action-key',raw=>raw.replace("'keydown', BACKSPACE","'keydown', DELETE")],
]){
 const next=mutateRow(chips,loopRow,change),changedRaw=change(loopRow.raw),alteredPins=structuredClone(pins[1]);alteredPins.exceptions.find(n=>n.after_sha256===loop.after_sha256).after_sha256=hash(changedRaw);
 // Rebind only this raw identity to exercise the isolated-loop structural proof.
 // The complete original/case/capsule verifier still rejects changed originals.
 reject('chip-loop-'+id,()=>inspectInteractionChipIteration(next,alteredPins));
}
const ownedTooltip=read('projects/ngx-material-legacy/legacy-tooltip/tooltip.spec.ts').toString();for(const row of pins[3].removed_cases)assert.ok(ownedTooltip.includes('it('+row.name+','),'owned destruction observer lost');
const result={schema_version:1,line:report.line,complete_original_files:28,complete_original_hunks:228,paired_cases:1082,unchanged_complete_callbacks:886,changed_callbacks:196,hooks_paired:138,fixture_classes_unchanged:157,template_style_properties_unchanged:153,individual_observer_or_delay_exceptions:12,renamed_cases:0,removed_cases:2,added_cleanup_hooks:1,isolated_chip_iteration_conversions:1,individual_provider_hook_exceptions:1,global_property_key_spellings:2,added_wait_helpers:9,existing_wait_helper_bodies:6,predicate_sequences_equal:1080,owned_product_members:1141,current_owned_case_bodies:2223,current_required_historical_case_ids:2228,controls:controls.length,cases:controls,source_helper_sha256:hash(read('scripts/spec-interaction-async-source-review.mjs')),producer_sha256:hash(read('tests/spec_interaction_async_source_probe.mjs')),actual_Angular_native_artifact_or_floor_qualified:false,security_clearance:'not-passed',g11_claim:'not-passed'};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,cases:undefined}));

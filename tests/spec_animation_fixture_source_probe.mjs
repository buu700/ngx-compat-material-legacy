/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Immutable originals, precise source partitions and rejected mutations. Execute no acquired specs. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {originalEnvironmentCases} from '../scripts/spec-test-environment-source-review.mjs';
import {overlayHooks} from '../scripts/spec-overlay-async-source-review.mjs';
import {inspectAnimationFixtureSources,animationFixturePins,authenticateAnimationFixtureOriginal,reviewAnimationFixtureFile,observeAnimationFixtureFile,inspectAnimationHelperCalls} from '../scripts/spec-animation-fixture-source-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(resolve(root,p)),hash=n=>createHash('sha256').update(n).digest('hex');
const report=inspectAnimationFixtureSources({root}),pins=animationFixturePins({root}),originals=JSON.parse(gunzipSync(read('compatibility/rc/spec-animation-fixture-source-subjects.json.gz'))),controls=[];
function reject(id,action,pattern){assert.throws(action,pattern,id);controls.push({id,result:'rejected'});}
function changeRaw(member,side,raw,change){const next=structuredClone(member);assert.equal(next[side].text.split(raw).length,2,'ambiguous raw source');const replacement=change(raw);assert.notEqual(replacement,raw);next[side].text=next[side].text.replace(raw,replacement);return next;}
for(const[index,subject]of originals.subjects.entries()){
 const pin=pins[index];
 for(const[id,change]of[
  ['raw-commit',n=>{n.raw_commit+='\n';n.raw_commit_sha256=hash(n.raw_commit);}],
  ['missing-file',n=>{n.members.pop();n.complete_changed_files.pop();}],
  ['foreign-file',n=>{n.members[0].path='src/material/unreviewed.spec.ts';}],
  ['missing-hunk',n=>{n.original_hunks--;}],
  ['rehashed-body',n=>{const b=n.members[0].after;b.text+='\n';b.sha256=hash(b.text);b.bytes=Buffer.byteLength(b.text);}],
  ['rehashed-diff',n=>{n.diff=n.diff.replace(/^@@ /m,'@@  ');n.diff_sha256=hash(n.diff);n.diff_bytes=Buffer.byteLength(n.diff);}],
 ]){const next=structuredClone(subject);change(next);reject(subject.sha+'-'+id,()=>authenticateAnimationFixtureOriginal(next,pin));}
 for(const[i,member]of subject.members.entries()){
  const next=structuredClone(member);next.after.text+='\n__unreviewedAction();\n';
  reject(subject.sha+'-retained-global-operation-'+member.path,()=>reviewAnimationFixtureFile(next,subject.sha,pin.files[i]),/non-scaffold global program/);
 }
 const afterCases=originalEnvironmentCases(subject,'after');
 for(const ref of pin.changed_callback_reviews){const row=afterCases.find(n=>n.path===ref.path&&n.sha256===ref.after_sha256);assert.ok(row);const member=subject.members.find(n=>n.path===row.path);
  const next=changeRaw(member,'after',row.raw,raw=>/\.(toBe|toEqual|toContain|toThrow|toHave|toMatch)[A-Za-z]*\(/.test(raw)?raw.replace(/\.(toBe|toEqual|toContain|toThrow|toHave|toMatch)[A-Za-z]*\(/,'.unreviewedMatcher('):raw.replace(/\bexpect[A-Z]\w*\(/,'expectUnreviewedPredicate('));
  // No artifact/hash comparison here: exercise the independent predicate-expression proof.
  reject('individual-callback-predicate-'+ref.after_sha256,()=>observeAnimationFixtureFile(next,subject.sha),/predicate expressions changed/);
 }
 for(const ref of pin.private_helper_reviews){const filePin=pin.files.find(n=>n.path===ref.path),helper=filePin.helpers_after.find(n=>n.name===ref.name),member=subject.members.find(n=>n.path===ref.path);
  reject('exact-private-helper-'+ref.after_sha256,()=>reviewAnimationFixtureFile(changeRaw(member,'after',helper.raw,raw=>raw.replace('TestBed.','UnreviewedTestBed.')),subject.sha,filePin),/source partition/);
 }
 for(const ref of pin.removed_hook_reviews){const row=overlayHooks(subject,'before').find(n=>n.sha256===ref.sha256&&n.path===ref.path);assert.ok(row);const member=structuredClone(subject.members.find(n=>n.path===ref.path));member.after.text+='\n'+row.raw+';\n';
  reject('removed-hook-'+ref.sha256,()=>reviewAnimationFixtureFile(member,subject.sha,pin.files.find(n=>n.path===ref.path)),/source partition/);
 }
 const first=afterCases[0],member=subject.members.find(n=>n.path===first.path),fp=pin.files.find(n=>n.path===first.path);
 reject(subject.sha+'-case-mode',()=>observeAnimationFixtureFile(changeRaw(member,'after',first.raw,raw=>raw.replace(/^it\(/,'fit(')),subject.sha),/case identity/);
 reject(subject.sha+'-lost-case',()=>observeAnimationFixtureFile(changeRaw(member,'after',first.raw,()=>''),subject.sha),/case identity/);
 const importFile=subject.members[0],importPin=pin.files[0];const next=structuredClone(importFile);next.after.text=next.after.text.replace(/from (['"])([^'"]+)/,(raw,quote,module)=>'from '+quote+module+'/unreviewed');assert.notEqual(next.after.text,importFile.after.text);
 reject(subject.sha+'-import-identity',()=>reviewAnimationFixtureFile(next,subject.sha,importPin),/source partition/);
}
const second=originals.subjects[1],providerMember=second.members.find(n=>n.path==='src/material/autocomplete/autocomplete.spec.ts');assert.ok(providerMember);
reject('disabled-provider-cannot-be-enabled',()=>observeAnimationFixtureFile(changeRaw(providerMember,'after','animationsDisabled: true',raw=>raw.replace('true','false')),second.sha));
for(const[index,pin]of pins.entries()){
 const files=structuredClone(pin.files),chip=files.find(n=>n.path==='src/material/chips/chip-grid.spec.ts');
 if(index===0){const call=chip.helpers_after[0].calls.find(n=>n.arguments.length===2);assert.ok(call);call.arguments[1]="'ltr'";reject('chip-direction-default-contract',()=>inspectAnimationHelperCalls(files,pin.sha));
  const input=structuredClone(pin.files);input.find(n=>n.path==='src/material/input/input.spec.ts').helpers_after[0].calls[0].arguments[1]='{providers, imports, declarations, animations: false}';reject('input-options-not-forwarded',()=>inspectAnimationHelperCalls(input,pin.sha));
 }else{
  chip.helpers_after[0].calls.find(n=>n.arguments.length===3).arguments[2]='[OtherAnimationsModule]';reject('seven-chip-exceptions-are-exact',()=>inspectAnimationHelperCalls(files,pin.sha));
  const menu=structuredClone(pin.files);menu.find(n=>n.path==='src/material/menu/menu.spec.ts').helpers_after[0].calls.find(n=>n.arguments.length===4).arguments.pop();reject('one-menu-exception-is-required',()=>inspectAnimationHelperCalls(menu,pin.sha));
  const ripple=structuredClone(pin.files);ripple.find(n=>n.path==='src/material/core/ripple/ripple.spec.ts').helpers_after[0].calls[0].arguments[0]='{disabled: false}';reject('ripple-config-arguments-preserved',()=>inspectAnimationHelperCalls(ripple,pin.sha));
 }
}
const {subjects,...counts}=report;const result={...counts,controls:controls.length,cases:controls,source_helper_sha256:hash(read('scripts/spec-animation-fixture-source-review.mjs')),producer_sha256:hash(read('tests/spec_animation_fixture_source_probe.mjs'))};
const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...result,cases:undefined}));

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Individual bounded tab decisions; shared canonical integration remains separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tabsCallerSource, TABS_CALLER_PRIOR} from './tabs-caller-contracts.mjs';
import {TABS_CALLER_SUBJECTS} from './tabs-caller-public-subjects.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root,path));
const decisionsPath = 'compatibility/rc/tabs-caller-decisions.json';
const decisionsPin = '6d811aa66fec4af16b271eaddc7eacdc7b4d25c4808ddc8406600d5e6b4dfc28';
const publicPins = {main: {path:'compatibility/rc/tabs-caller-public-main.json',sha256:'90ac7caf3f3b54b47c424f613eb2741117fd3c472b7ad396d5b0e935be5390d9'},
  '21.x': {path:'compatibility/rc/tabs-caller-public-21.json',sha256:'b748c16d0510f047a9aa81f072bd5c95f7b7d1d58a7ae57a842e167cd4587e5e'}};
export const TABS_CALLER_REVIEW = 'compatibility/f10/authored-use-reviews/tabs-callers.json';

export function qualifiedTabsCallerEvidence({root=process.cwd(),read=raw(root)}={}) {
  const source=tabsCallerSource({root,read}),ref=publicPins[source.prior.line],bytes=read(ref.path);
  assert.equal(hash(bytes),ref.sha256,'changed tabs public proof');const proof=JSON.parse(bytes);assert.equal(proof.line,source.prior.line);
  for(const member of proof.inputs)assert.equal(hash(read(member.path)),member.sha256,'changed tabs proof input '+member.path);
  assert.ok(proof.inputs.every(m=>!m.path.includes('snack-dom-source-context')),'mutable source-owner dependency');
  assert.equal(proof.source_files.length,69);assert.equal(proof.facts.length,21);
  assert.equal(proof.facts.filter(f=>f.removed_upstream_use).length,1);assert.equal(proof.facts.filter(f=>f.unused_import).length,4);
  const versions={original:['16.2.12','16.2.14'],main:['22.1.7','22.1.7'],'21.x':['21.2.23','21.2.14']};
  assert.equal(proof.type_subjects.length,3);
  for(const subject of proof.type_subjects) {
    assert.deepEqual([subject.Core,subject.Material],versions[subject.line]);assert.ok(subject.strict);assert.equal(subject.skipLibCheck,false);assert.equal(subject.diagnostics,0);
    assert.equal(subject.current_source_files,subject.line===source.prior.line?69:0);assert.equal(subject.public_symbols.length,7);assert.equal(subject.public_consumed_fields.length,9);
    const forbidden=subject.public_symbols.find(s=>s.name==='MAT_TAB');assert.ok(forbidden.tags.includes('docs-private'));assert.equal(forbidden.use,'removed-current-use');
    assert.ok(subject.public_symbols.filter(s=>s.name!=='MAT_TAB').every(s=>s.tags.every(t=>!['deprecated','docs-private','experimental','developerPreview','breaking-change'].includes(t))));
    assert.equal(subject.zero_argument_parents.length,subject.line==='original'?0:2);assert.ok(subject.zero_argument_parents.every(c=>c.argument_count===0&&c.required_parameters===0&&c.parameters.every(p=>p.rest||p.optional)));
    assert.equal(subject.invalid_type_controls,3);
  }
  assert.equal(proof.runtime_subjects.length,4);
  const contexts=new Set();
  for(const subject of proof.runtime_subjects) {
    assert.deepEqual([subject.Core,subject.Material],versions[subject.line]);assert.ok(['original',source.prior.line].includes(subject.line));contexts.add(subject.line+':'+subject.mode);
    assert.equal(subject.cases.length,17);assert.equal(subject.borrowedDestroyed,0);assert.ok(subject.template_container_node_detector_are_protocols);
    assert.equal(subject.owned_content_and_group_AOT_factories_executed,false);assert.equal(subject.actual_native_packed_AOT_or_full_floor_qualified,false);
    assert.deepEqual(subject.observations,proof.runtime_subjects[0].observations);
    if(subject.line!=='original')assert.ok(subject.owned_label_public_factory_executed&&subject.private_current_token_is_adversarial_test_only);
  }
  for(const line of ['original',source.prior.line])for(const mode of ['development','production'])assert.ok(contexts.has(line+':'+mode));
  assert.equal(proof.source_mutants.length,4);assert.ok(proof.source_mutants.every(m=>m.rejected));
  assert.equal(proof.canonical_closures,0);assert.equal(proof.current_source_HTML_CSS_SCSS_changes,0);assert.equal(proof.source_body_or_SDK_rewrites,false);
  assert.equal(proof.original_current_source_backcompile_attempted,false);assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified,false);assert.equal(proof.g11_claim,'not-passed');
  return {source,proof,ref};
}

export function prepareTabsCallerReview({root=process.cwd(),read=raw(root)}={}) {
  const qualified=qualifiedTabsCallerEvidence({root,read}),{source}=qualified,bytes=read(decisionsPath);assert.equal(hash(bytes),decisionsPin);
  const decisions=JSON.parse(bytes).decisions;assert.equal(Object.keys(decisions).length,21);
  const ref=path=>({path,sha256:hash(read(path))}),evidence=[ref(TABS_CALLER_PRIOR),qualified.ref,ref(TABS_CALLER_SUBJECTS),ref(decisionsPath),
    ref('scripts/tabs-caller-contracts.mjs'),ref('scripts/tabs-caller-public-subjects.mjs'),ref('scripts/tabs-caller-reviews.mjs'),ref('compatibility/rc/api/export-name-allowlist.json')];
  return {schema_version:1,line:source.prior.line,status:'reviewed',
    criteria:'Twenty-one individually reviewed tab imports/reexports across eight unchanged selected sources and the69-file owned closure. One current private import is already removed,four imports are unused,and a finite existing allowlisted alias remains. Genuine untouched-tagged/current constructor/configuration observations agree;native/packed/AOT/query/floors and canonical integration remain separate.',
    reviews:source.facts.map(f=>{
      const decision=decisions[f.file+':'+f.symbol];assert.ok(decision);
      return {...f,conclusion:f.removed_upstream_use?'removed-use':'stable-public-peer',decision,
        reviewer:'Codex primary implementer;individual complete current tabs caller review',independent_evidence:evidence,
        scope_limit:'Named public import/type/token/parent/member/re-export boundary only. Current source compiles and ordinary TypeScript semantic emit changes only import resolution. Manual content/label/group constructors and owned label public injector factory execute with borrowed template/container/node/CDR protocols. Current private MAT_TAB is only an adversarial test provider;production uses the owned legacy token. Content/group AOT factories,packed template/query/provider matching,native geometry/motion/CSP,consumer/compiler/Node/RxJS/peer floors and G01-G13 remain separate.'};
    }),source_closures_prepared:21,frozen_prepared:17,additional_prepared:4,source_closures_integrated:0,new_SHA_or_native_semantic_closures:0,
    actual_native_packed_or_full_floor_qualified:false,g11_claim:'not-passed'};
}

export function inspectTabsCallerReview({root=process.cwd(),read=raw(root)}={}) {
  const body=prepareTabsCallerReview({root,read});assert.equal(hash(read(TABS_CALLER_REVIEW)),hash(JSON.stringify(body,null,2)+'\n'),'changed prepared tab review');return body;
}

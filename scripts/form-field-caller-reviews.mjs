/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Individual bounded form-field decisions; shared canonical integration remains separate. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {formFieldCallerSource, FORM_FIELD_CALLER_PRIOR} from './form-field-caller-contracts.mjs';
import {FORM_FIELD_CALLER_SUBJECTS} from './form-field-caller-public-subjects.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = root => path => readFileSync(join(root,path));
const decisionsPath = 'compatibility/rc/form-field-caller-decisions.json';
const decisionsPin = '67a4086051b54be66aa58a9908267cc17075841223b8f772c2f6af0516a3dd17';
const publicPins = {main: {path:'compatibility/rc/form-field-caller-public-main.json',sha256:'5a24eafa892eb34dfd2b94dc5ba24f5076a6e42adbc5989770c338587c827d4f'},
  '21.x': {path:'compatibility/rc/form-field-caller-public-21.json',sha256:'82d7d9e8be30b6e4819b55a5b154fc3537630e9351bb7f1b6480f72dd9ec573f'}};
export const FORM_FIELD_CALLER_REVIEW = 'compatibility/f10/authored-use-reviews/form-field-callers.json';

export function qualifiedFormFieldCallerEvidence({root=process.cwd(),read=raw(root)}={}) {
  const source=formFieldCallerSource({root,read}),ref=publicPins[source.prior.line],bytes=read(ref.path);
  assert.equal(hash(bytes),ref.sha256,'changed form-field public proof');const proof=JSON.parse(bytes);assert.equal(proof.line,source.prior.line);
  for(const member of proof.inputs)assert.equal(hash(read(member.path)),member.sha256,'changed form-field proof input '+member.path);
  assert.ok(proof.inputs.every(m=>!m.path.includes('snack-dom-source-context')),'mutable source-owner dependency');
  assert.equal(proof.source_files.length,81);assert.equal(proof.facts.length,18);
  assert.equal(proof.facts.filter(f=>f.removed_upstream_use).length,11);assert.equal(proof.facts.filter(f=>f.unused_import).length,0);
  const versions={original:['16.2.12','16.2.14'],main:['22.1.7','22.1.7'],'21.x':['21.2.23','21.2.14']};
  assert.equal(proof.type_subjects.length,3);
  for(const subject of proof.type_subjects) {
    assert.deepEqual([subject.Core,subject.Material],versions[subject.line]);assert.ok(subject.strict);assert.equal(subject.skipLibCheck,false);assert.equal(subject.diagnostics,0);
    assert.equal(subject.current_source_files,subject.line===source.prior.line?81:0);assert.equal(subject.public_symbols.length,9);
    assert.ok(subject.public_symbols.every(s=>s.tags.every(t=>!['deprecated','docs-private','experimental','developerPreview','breaking-change'].includes(t))));
    assert.equal(subject.public_control_fields.length,subject.line==='original'?16:18);
    assert.ok(subject.public_control_fields.every(f=>f.owner==='MatFormFieldControl'&&f.tags.length===0));
    for(const name of ['disableAutomaticLabeling','describedByIds']){const field=subject.public_control_fields.find(f=>f.name===name);if(subject.line==='original')assert.equal(field,undefined);else assert.ok(field&&field.optional);}
    assert.equal(subject.actual_consumed_members.length,subject.line===source.prior.line?28:0);
    assert.ok(subject.actual_consumed_members.every(m=>m.tags.length===0));
    assert.equal(subject.invalid_type_controls,3);
  }
  assert.equal(proof.runtime_subjects.length,4);
  const contexts=new Set();
  for(const subject of proof.runtime_subjects) {
    assert.deepEqual([subject.Core,subject.Material],versions[subject.line]);assert.ok(['original',source.prior.line].includes(subject.line));contexts.add(subject.line+':'+subject.mode);
    assert.equal(subject.cases.length,32);assert.ok(subject.real_public_injector_executed&&subject.control_public_alias&&subject.token_identity_difference_is_intentional_owned_legacy_isolation);
    assert.equal(subject.tokens.length,4);assert.deepEqual(subject.tokens.map(t=>t.name),['FORM_FIELD','ERROR','PREFIX','SUFFIX']);
    for(const token of subject.tokens){assert.equal(token.legacy_same_as_modern,subject.line==='original');assert.equal(token.modern_isolation,subject.line!=='original');assert.ok(token.exact_provider&&token.lookalike_missing&&token.nearest_and_skipSelf);}
    assert.equal(subject.template_or_actual_native_query_provider_matching_executed,false);assert.equal(subject.owned_form_field_AOT_factory_executed,false);assert.equal(subject.actual_native_packed_AOT_or_full_floor_qualified,false);assert.ok(subject.error_element_is_borrowed_attribute_protocol);
    assert.deepEqual(subject.observations,proof.runtime_subjects[0].observations);

  }
  for(const line of ['original',source.prior.line])for(const mode of ['development','production'])assert.ok(contexts.has(line+':'+mode));
  assert.equal(proof.source_mutants.length,3);assert.ok(proof.source_mutants.every(m=>m.rejected));
  assert.equal(proof.canonical_closures,0);assert.equal(proof.current_source_HTML_CSS_SCSS_changes,0);assert.equal(proof.source_body_or_SDK_rewrites,false);
  assert.equal(proof.original_current_source_backcompile_attempted,false);assert.equal(proof.actual_native_packed_AOT_or_full_floor_qualified,false);assert.equal(proof.g11_claim,'not-passed');
  return {source,proof,ref};
}

export function prepareFormFieldCallerReview({root=process.cwd(),read=raw(root)}={}) {
  const qualified=qualifiedFormFieldCallerEvidence({root,read}),{source}=qualified,bytes=read(decisionsPath);assert.equal(hash(bytes),decisionsPin);
  const decisions=JSON.parse(bytes).decisions;assert.equal(Object.keys(decisions).length,18);
  const ref=path=>({path,sha256:hash(read(path))}),evidence=[ref(FORM_FIELD_CALLER_PRIOR),qualified.ref,ref(FORM_FIELD_CALLER_SUBJECTS),ref(decisionsPath),
    ref('scripts/form-field-caller-contracts.mjs'),ref('scripts/form-field-caller-public-subjects.mjs'),ref('scripts/form-field-caller-reviews.mjs'),ref('compatibility/rc/api/export-name-allowlist.json')];
  return {schema_version:1,line:source.prior.line,status:'reviewed',
    criteria:'Eighteen individually reviewed form-field imports/reexports across eight unchanged selected sources and the81-file owned closure. Eleven upstream imports are already replaced by owned legacy tokens/classes;seven routes retain public control/types. Genuine untouched-tagged leaf observations agree with current owned implementations. Original token aliases are explicitly distinguished from the intended current legacy-owned token isolation. Native/packed/AOT/query/floors and canonical integration remain separate.',
    reviews:source.facts.map(f=>{
      const decision=decisions[f.file+':'+f.symbol];assert.ok(decision);
      return {...f,conclusion:f.removed_upstream_use?'removed-use':'stable-public-peer',decision,
        reviewer:'Codex primary implementer;individual complete current form-field caller review',independent_evidence:evidence,
        scope_limit:'Named source/control/type/token/re-export boundary only. The selected minimum source compiles/emits81 files with import-resolution changes only. Manual error/prefix/suffix constructors and real public Injector identity/optional/nearest/skipSelf/modern isolation execute;error elements are attribute protocols. The historical public control alias stays the exact peer object;two additive current fields remain optional. Owned token type parameters remain historical public peer types;their objects stay distinct from modern tokens. Form-field AOT factories,actual template/query/provider matching,full component lifecycle/native geometry/motion/CSP,packed consumers,compiler/Node/RxJS/peer floors and G01-G13 remain separate.'};
    }),source_closures_prepared:18,frozen_prepared:13,additional_prepared:5,source_closures_integrated:0,new_SHA_or_native_semantic_closures:0,
    actual_native_packed_or_full_floor_qualified:false,g11_claim:'not-passed'};
}

export function inspectFormFieldCallerReview({root=process.cwd(),read=raw(root)}={}) {
  const body=prepareFormFieldCallerReview({root,read});assert.equal(hash(read(FORM_FIELD_CALLER_REVIEW)),hash(JSON.stringify(body,null,2)+'\n'),'changed prepared tab review');return body;
}

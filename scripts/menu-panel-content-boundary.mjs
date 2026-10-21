/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Applied owned-content type proof; independent of the mutable shared source owner. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const MENU_CONTENT_PANEL_SOURCE='projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts';
export const MENU_CONTENT_PANEL_BEFORE='4212186406b92fc485c050ffae7a8fd7b1f8e7af855bfd0133b018435834018a';
export const MENU_CONTENT_PANEL_AFTER='3598e6ccf4761bd9777dafaca271cd896dc8f694ec39e9e46c37f593a8c307af';
const proofs={main:{path:'compatibility/rc/menu-panel-content-boundary-main.json',sha256:'5f31e100b6e3ec236b935a3c5325c7f9717409a5298f45a6c498f34efa680749'},'21.x':{path:'compatibility/rc/menu-panel-content-boundary-21.json',sha256:'973c7ab55233689184aaeb5ca08b62ca51c214b272d559c4e07ae8ebd1c2881f'}};
export function qualifiedMenuContentTypeBoundary({line,readMember}){
 const ref=proofs[line];assert.ok(ref);const bytes=readMember(ref.path);assert.equal(hash(bytes),ref.sha256,'changed applied menu content type proof');const body=JSON.parse(bytes);
 assert.equal(body.schema_version,1);assert.equal(body.line,line);assert.equal(body.proposal_only,false);assert.equal(body.raw_product_applied,true);assert.equal(body.actual_product_changes,1);
 assert.deepEqual(body.target,{path:MENU_CONTENT_PANEL_SOURCE,before_sha256:MENU_CONTENT_PANEL_BEFORE,sha256:MENU_CONTENT_PANEL_AFTER});
 assert.equal(hash(readMember(MENU_CONTENT_PANEL_SOURCE)),MENU_CONTENT_PANEL_AFTER);
 assert.equal(body.current_source_files.length,53);assert.equal(new Set(body.current_source_files.map(m=>m.path)).size,53);
 for(const member of [...body.current_source_files,...body.inputs])assert.equal(hash(readMember(member.path)),member.sha256,'changed menu type proof input '+member.path);
 assert.ok(body.inputs.every(m=>!m.path.includes('snack-dom-source-context')&&!m.path.includes('authored-current-use-inventory')&&!m.path.includes('authored-additional-use-baseline')),'mutable owner/admission dependency');
 assert.equal(body.subjects.length,3);assert.deepEqual(body.subjects.map(s=>s.line),['original','main','21.x']);
 for(const subject of body.subjects){
  if(subject.line===line){
   assert.equal(subject.current_source_files,53);assert.equal(subject.before.diagnostics.length,0);assert.equal(subject.before.gaps.length,2);assert.ok(subject.before.gaps.every(g=>g.tags.includes('docs-private')));
   assert.equal(subject.after.diagnostics.length,0);assert.deepEqual(subject.after.gaps,[]);assert.equal(subject.after.lazy_content_type.symbol,'MatLegacyMenuContent');assert.deepEqual(subject.after.lazy_content_type.declarations,['projects/ngx-material-legacy/legacy-menu/menu-content.ts']);
   assert.equal(subject.baseline_owned_content_assignment_rejected.code,2322);assert.equal(subject.candidate_owned_content_assignment_accepted,true);assert.equal(subject.semantic_emitted_JS_files_identical.length,53);
  }else assert.equal(subject.diagnostics.length,0);
 }
 assert.equal(body.source_mutants.length,3);assert.deepEqual(body.source_mutants.map(m=>m.id),['widened-content-any','wrong-owned-content-class','changed-position-type']);assert.ok(body.source_mutants.every(m=>m.line===line&&m.rejected&&m.mutant_also_erases_to_identical_JS));
 assert.equal(body.SDK_rewrites,false);assert.equal(body.HTML_CSS_SCSS_consumer_map_or_alias_allowlist_changes,0);assert.equal(body.full_runtime_native_packed_AOT_or_floor_qualified,false);assert.equal(body.g11_claim,'not-passed');
 return {ref,delta:body.target,body};
}

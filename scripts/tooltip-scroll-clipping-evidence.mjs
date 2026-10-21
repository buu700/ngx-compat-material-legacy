/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Current candidate evidence; applying/rebinding this product delta is a separate operation. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {prepareTooltipScrollClipping} from './tooltip-scroll-clipping.mjs';
const ts=createRequire(import.meta.url)('typescript'),hash=b=>createHash('sha256').update(b).digest('hex');
const pins={"main":{"path":"compatibility/rc/tooltip-scroll-clipping-public-main.json","sha256":"74062530dbe4ef49cea735cbf92da54a11ca0839569bd0006854da68bedb2e6e"},"21.x":{"path":"compatibility/rc/tooltip-scroll-clipping-public-21.json","sha256":"aecd20ed1cf1532803a9b5645b56cabdf0c59d015556d92646625948c6bd6d3d"}};
function surface(text){const sf=ts.createSourceFile('tooltip.ts',text,ts.ScriptTarget.Latest,true);assert.equal(sf.parseDiagnostics.length,0);const signature=n=>{const text=n.getText(sf);return n.body?text.slice(0,n.body.getStart(sf)-n.getStart(sf))+text.slice(n.body.end-n.getStart(sf)):text;};return {imports:sf.statements.filter(ts.isImportDeclaration).map(n=>n.getText(sf)),exports:sf.statements.filter(n=>n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)).map(n=>ts.isClassDeclaration(n)?{kind:'class',header:text.slice(n.getStart(sf),n.members.pos),members:n.members.map(signature)}:{kind:ts.SyntaxKind[n.kind],text:signature(n)})};}
export function qualifiedTooltipScrollClipping({root=process.cwd(),read=p=>readFileSync(join(root,p)),allowApplied=false}={}){
 const candidate=prepareTooltipScrollClipping({root,read,allowApplied}),ref=pins[candidate.prior.line],bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256,'changed clipping candidate proof');const proof=JSON.parse(bytes);assert.equal(proof.line,candidate.prior.line);assert.equal(proof.candidate_source_sha256,hash(candidate.candidate));assert.equal(proof.source_before.commit,candidate.prior.source_parent);assert.equal(proof.source_before.sha256,candidate.worksheet.source_before_sha256);assert.equal(proof.product_applied,false);assert.equal(proof.exact_tagged_predicate_body,true);assert.equal(proof.unchanged_hide_and_position_class_methods,true);assert.equal(proof.component_resources_unchanged,33);
 for(const m of proof.inputs)assert.equal(hash(read(m.path)),m.sha256,'changed clipping proof input '+m.path);
 assert.deepEqual(surface(candidate.source),surface(candidate.candidate),'tooltip exported signatures/imports changed');
 const versions={original:['16.2.12','16.2.14'],main:['22.1.7','22.1.7'],'21.x':['21.2.23','21.2.14']};assert.equal(proof.type_subjects.length,3);for(const t of proof.type_subjects){assert.deepEqual([t.Core,t.CDK],versions[t.line]);assert.ok(t.strict&&t.skipLibCheck===false&&t.diagnostics===0);assert.equal(t.invalid_rectangle_type_controls,1);assert.equal(t.current_candidate_reads_forbidden_member,false);assert.ok(t.forbidden_event_member.tags.includes('docs-private'));assert.ok(t.public_consumed_members.length>=4);}
 assert.equal(proof.runtime_subjects.length,10);for(const r of proof.runtime_subjects){assert.deepEqual([r.Core,r.CDK],versions[r.line]);assert.equal(r.cases,49);assert.equal(r.untouched_callback_and_candidate_cases_compared,49);assert.equal(r.source_mutants_rejected.length,6);assert.ok(r.source_mutants_rejected.every(m=>m.rejected));assert.ok(r.actual_public_NgZone_and_RxJS_streams&&r.public_ConnectionPositionPair_instances&&r.DOM_event_tooltip_and_overlay_receivers_are_protocols&&r.geometry_captured_before_position_class_changes);assert.equal(r.current_private_visibility_reads,0);assert.equal(r.borrowed_objects_destroyed,0);assert.equal(r.whole_directive_native_geometry_packed_AOT_or_floors_qualified,false);}
 assert.equal(proof.canonical_closures,0);assert.equal(proof.actual_native_packed_or_full_floor_qualified,false);assert.equal(proof.g11_claim,'not-passed');return {candidate,proof,ref,exported_signatures_and_imports_unchanged:true};
}

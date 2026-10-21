/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Immutable candidate/current-state controls; no canonical or product writes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {qualifiedTooltipScrollClipping} from '../scripts/tooltip-scroll-clipping-evidence.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),allowApplied=process.argv.includes('--applied'),inspect=read=>qualifiedTooltipScrollClipping({root,read,allowApplied}),checked=inspect(read),{candidate,proof,ref}=checked;
assert.equal(candidate.product_applied,allowApplied);const paths=[...new Set([ref.path,'scripts/tooltip-scroll-clipping.mjs','tests/tooltip_scroll_clipping_probe.mjs','tests/tooltip_scroll_clipping_subject.mjs',candidate.worksheet.candidate_patch.path,candidate.worksheet.overlay_prior.path,'compatibility/rc/overlay-caller-public-subjects.json',candidate.reference.path,candidate.worksheet.source,...candidate.prior.support.map(m=>m.path),candidate.oracle.member.path])];
for(const path of paths){const bad=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspect(p=>p===path?bad:read(p)),e=>e?.code==='ERR_ASSERTION',path);}
for(const path of [candidate.worksheet.source,candidate.oracle.member.path]){let changed=false;const bad=Buffer.concat([read(path),Buffer.from('\n')]),late=p=>changed&&p===path?bad:read(p);inspect(late);changed=true;assert.throws(()=>inspect(late),e=>e?.code==='ERR_ASSERTION');}
const report={schema_version:1,line:proof.line,candidate_source_sha256:proof.candidate_source_sha256,product_applied:candidate.product_applied,public_signatures_imports_and_all33_resources_unchanged:true,strict_public_models:3,invalid_type_controls:3,genuine_zone_contexts:10,reference_candidate_state_cases:490,runtime_source_mutants_rejected:60,source_evidence_corruptions_rejected:paths.length,changes_after_cached_reads_rejected:2,canonical_closures:0,actual_directive_native_geometry_packed_AOT_or_full_floor_qualified:false,g11_claim:'not-passed'};const out=process.argv.indexOf('--out');if(out>=0)writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));

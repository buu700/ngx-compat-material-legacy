/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectMenuExitContext,reviewMenuExitRoles,MENU_EXIT_CONTEXT_INPUTS} from '../scripts/menu-exit-context-requalification.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=path=>readFileSync(resolve(root,path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),json=value=>Buffer.from(JSON.stringify(value));
const inputs=JSON.parse(read(MENU_EXIT_CONTEXT_INPUTS)),prior=JSON.parse(gunzipSync(read(inputs.prior_contexts.path)));
const trigger=inputs.trigger.path,source=read(trigger).toString(),controls=[];
const result=await inspectMenuExitContext({root});
assert.equal(result.source_scope_rows,52);assert.equal(result.authored_rows,29);assert.equal(result.documents.length,9);
assert.equal(result.context.unchanged_product_members,1140);assert.equal(result.new_sha_or_authored_use_closures,0);
assert.equal(result.frozen_review_evidence.reviewed,1446);assert.equal(result.current_admission.review_evidence.reviewed,178);
assert.equal(result.current_admission.inventory.open,130);assert.equal(result.actual_native_packed_or_floor_qualified,false);
for(const [id,path,change,expected]of [
 ['input-capsule',MENU_EXIT_CONTEXT_INPUTS,b=>Buffer.concat([b,Buffer.from(' ')]),/context input changed/],
 ['prior-context-archive',inputs.prior_contexts.path,b=>Buffer.concat([b,Buffer.from(' ')]),/context archive changed/],
 ['tested-trigger',trigger,b=>Buffer.from(b.toString().replace('event.toState === \'void\'','true')),/tested menu trigger changed/],
 ['unrelated-style','projects/ngx-material-legacy/legacy-menu/menu.scss',b=>Buffer.concat([b,Buffer.from('\n.hidden {display:none;}')]),/unreviewed product change/],
 ['build-configuration','package.json',b=>{const x=JSON.parse(b);x.scripts['build:lib']='bazel build';return json(x);},/build input\/module changed/],
 ['pack-module','scripts/npm-tooling-options.mjs',b=>Buffer.concat([b,Buffer.from('\n// unreviewed\n')]),/build input\/module changed/],
 ['implementation-receipt',inputs.evidence[1].path,b=>Buffer.concat([b,Buffer.from(' ')]),/implementation evidence changed/],
 ['native-source-producer','scripts/native-motion-consumer.ts',b=>Buffer.concat([b,Buffer.from('\n// unreviewed\n')]),/tested implementation\/producer drift/],
 ['original-build-patch','compatibility/f10/disposition-ledger/evidence/patches/build-scope/b5d4de9794cd6c826a9a2d4fb27e7e9e3cb884ac.patch',b=>Buffer.concat([b,Buffer.from(' ')]),/build source scope rejected/],
 ['original-judgment',inputs.reports[0],b=>{const x=JSON.parse(b);x.reviews[0].decision+=' unreviewed judgment';return json(x);},/live source review changed/],
 ['ledger-judgment','compatibility/f10/disposition-ledger/ledger.json',b=>{const x=JSON.parse(b);x.entries.find(e=>e.evidence_report===inputs.reports[0]).reason+=' altered';return json(x);},/live ledger judgment changed/],
 ['current-use-inventory','compatibility/f10/authored-dependency-current-dispositions.json',b=>{const x=JSON.parse(b);x.symbol_uses.pop();return json(x);},/live authored disposition changed/],
 ['frozen-unrelated-use','compatibility/f10/authored-dependency-dispositions.json',b=>{const x=JSON.parse(b);x.symbol_uses[0].status='unreviewed';return json(x);},/live authored disposition changed/],
]){
 const before=read(path),after=change(before);assert.notDeepEqual(after,before,'mutation did not apply: '+id);
 await assert.rejects(inspectMenuExitContext({root,readMember:p=>p===path?after:read(p)}),expected,id+': mutation escaped');
 controls.push({id,rejected:true});
}
for(const [id,from,to,expected]of [
 ['peer-panel-restoration',"import type {MatMenuPanel} from './menu-panel';","import type {MatMenuPanel} from '@angular/material/menu';",/import identities changed/],
 ['public-import-alias','  FocusOrigin,','  FocusOrigin as OtherOrigin,',/import identities changed/],
 ['runtime-owned-panel-import',"import type {MatMenuPanel} from './menu-panel';","import {MatMenuPanel} from './menu-panel';",/import identities changed/],
 ['host-metadata',"'[attr.aria-expanded]': 'menuOpen'","'[attr.aria-expanded]': 'true'",/class metadata or heritage changed/],
 ['parameter-di-flags','@Optional() @Self() @Inject(PeerMatMenuItem)','@Optional() @Inject(PeerMatMenuItem)',/unchanged member changed/],
 ['focus-origin-domain',"Exclude<FocusOrigin, 'program' | null>","Exclude<FocusOrigin, 'mouse' | null>",/unchanged member changed/],
 ['output-alias','onMenuOpen: EventEmitter<void> = this.menuOpened','onMenuOpen: EventEmitter<void> = this.menuClosed',/unchanged member changed/],
 ['keycode-behavior','keyCode === ENTER','keyCode === SPACE',/unchanged member changed/],
 ['focus-service-call','this._focusMonitor.focusVia','this._focusMonitor.monitor',/unchanged member changed/],
 ['unexpected-public-member','private _closedMenus =','public _closedMenus =',/private member/],
]){
 const changed=source.replace(from,to);assert.notEqual(changed,source,'role mutation did not apply: '+id);
 assert.throws(()=>reviewMenuExitRoles(prior.trigger_before,changed,prior.authored_rows),expected,id+': role mutation escaped');
 controls.push({id,rejected:true});
}
const map=new Map(result.documents.map(d=>[d.path,Buffer.from(d.text)]));
const reviewPath='compatibility/f10/authored-use-reviews/menu-exit-requalified-boundaries.json';
const frozen=JSON.parse(map.get('compatibility/f10/authored-dependency-dispositions.json'));
const selected={symbol_uses:frozen.symbol_uses.filter(r=>r.file==='legacy-menu/internal/menu-trigger-base.ts'&&r.status==='reviewed'&&r.disposition==='closed')};
assert.equal(selected.symbol_uses.length,29);
for(const [id,mutate]of [
 ['missing-use',x=>x.reviews.pop()],['ambiguous-use',x=>x.reviews.push(x.reviews[0])],
 ['stale-source',x=>x.reviews[0].candidate_source_sha256='0'.repeat(64)],
 ['absent-independent-evidence',x=>x.reviews[0].independent_evidence=[]],
 ['changed-independent-evidence',x=>x.reviews[0].independent_evidence[0].sha256='0'.repeat(64)],
]){
 const doc=JSON.parse(map.get(reviewPath));mutate(doc);const data=json(doc),candidate=structuredClone(selected);
 for(const row of candidate.symbol_uses)row.source_review.sha256=hash(data);
 const reader=p=>p===reviewPath?data:map.get(p)||read(p);
 const evidence=authoredUseReviewEvidence(candidate,result.line,reader,hash);assert.ok(evidence.insufficient>0,id+': missing semantic record escaped');
 controls.push({id,rejected:true});
}
const report={schema_version:1,line:result.line,source_scope_rows:52,authored_rows:29,
 negative_controls:controls,source_checker_sha256:hash(read('scripts/menu-exit-context-requalification.mjs')),
 producer_sha256:hash(read('tests/menu_exit_context_requalification_probe.mjs')),
 actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line:result.line,source_scope_rows:52,authored_rows:29,negative_controls:controls.length,g11_claim:'not-passed'}));

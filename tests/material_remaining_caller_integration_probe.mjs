/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Preserve the complete pre-batch state while integrating exactly25 decisions. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {snackDomSourceContext,snackDomRawCurrentRead} from '../scripts/snack-dom-source-context.mjs';
import {inspectDialogCallerReview,DIALOG_CALLER_REVIEW} from '../scripts/dialog-caller-review.mjs';
import {inspectMaterialRemainingCallerReview,MATERIAL_REMAINING_REVIEW} from '../scripts/material-remaining-caller-reviews.mjs';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from '../scripts/authored-current-use-inventory.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),load=path=>JSON.parse(read(path));
const id=row=>JSON.stringify([row.file,row.module,row.symbol]);
const progress=stage=>{if(process.env.NGX_CONTEXT_PROGRESS==='1')process.stderr.write(stage+'\n');};
const registry=load('compatibility/rc/snack-dom-source-context-inputs.json'),line=registry.line;
const parent={main:'d8ccd2b0bff892f32c05e26c2c92972a470b0e2e','21.x':'591432c4c7c8ef6f420e22561afdee95ed5db201'}[line];assert.ok(parent);
const before=path=>JSON.parse(execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',
  'show',parent+':'+path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}));
const selected=new Map();
for(const [checked,path,count]of [[inspectDialogCallerReview({root}),DIALOG_CALLER_REVIEW,18],
  [inspectMaterialRemainingCallerReview({root}),MATERIAL_REMAINING_REVIEW,7]]){
  assert.equal(checked.line,line);assert.deepEqual(load(path),checked.review);assert.equal(checked.rows.length,count);
  for(const item of checked.rows){const key=id(item.original_row);assert.equal(selected.has(key),false);
    selected.set(key,{...item,review:{path,sha256:hash(read(path))}});}
}
assert.equal(selected.size,25);progress('prepared-packets-checked');
const paths=['compatibility/f10/authored-dependency-dispositions.json',
  'compatibility/f10/authored-dependency-current-dispositions.json'];
let frozenClosures=0,additionalClosures=0;
for(const path of paths){
  const old=before(path),current=load(path);assert.equal(current.symbol_uses.length,old.symbol_uses.length);
  for(let index=0;index<old.symbol_uses.length;index++){
    const a=old.symbol_uses[index],b=current.symbol_uses[index];assert.equal(id(a),id(b));
    if(!selected.has(id(a))){assert.deepEqual(b,a,'unselected authored row changed '+id(a));continue;}
    const chosen=selected.get(id(a));assert.equal(chosen.ledger,path);assert.equal(a.disposition,'open');
    assert.equal(b.status,'reviewed');assert.equal(b.disposition,'closed');assert.deepEqual(b.source_review,chosen.review);
    const restored=structuredClone(b);
    for(const key of ['status','disposition','source_review']){
      if(Object.hasOwn(a,key))restored[key]=a[key];else delete restored[key];
    }
    assert.deepEqual(restored,a,'additional change inside selected row '+id(a));
    if(path===paths[0])frozenClosures++;else additionalClosures++;
  }
  if(path===paths[1]){
    const a=old.source_snapshot_history,b=structuredClone(current.source_snapshot_history);
    assert.equal(b.length,a.length);b.at(-1).reason=a.at(-1).reason;b.at(-1).new_semantic_closures=a.at(-1).new_semantic_closures;
    assert.deepEqual(b,a,'unreviewed source snapshot history change');
  }
}
assert.equal(frozenClosures,18);assert.equal(additionalClosures,7);progress('all-authored-rows-preserved');
const productChanges=execFileSync('git',['diff','--name-only',parent,'--','projects/ngx-material-legacy'],{cwd:root,encoding:'utf8'}).trim();
assert.equal(productChanges,'','source decision integration changed product files');
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json',ledger=load(ledgerPath);
assert.equal(ledger.entries.length,1697);assert.deepEqual(ledger,before(ledgerPath),'source-only batch changed upstream ledger');
const nativeFields=['artifact_behavior','content_observer_behavior','form_field_hover_behavior','media_matcher_behavior',
  'progress_csp_behavior','ripple_replay_behavior','historical_behavior','tab_completion_behavior',
  'generated_identity_behavior','native_date_behavior','bidi_behavior','selection_behavior','owned_style_behavior'];
const native=[];for(const row of ledger.entries)for(const field of nativeFields)if(row.individual_proof?.[field])native.push({sha:row.sha,field});
assert.equal(native.length,line==='main'?34:33);progress('all-upstream-and-native-rows-identical');
assert.equal(registry.new_semantic_closures,361);assert.equal(registry.total_source_context_rebindings,103);
assert.equal(registry.finite_historical_subjects,20);assert.equal(registry.writes.length,25);
for(const member of registry.writes)assert.equal(hash(read(member.path)),member.sha256);
const context=snackDomSourceContext({root});assert.equal(context.members,20);assert.equal(context.current_successors,25);progress('current-source-context-checked');
const nativeRead=snackDomRawCurrentRead({root,read:context.read});
for(const file of ['legacy-dialog/dialog-ref.ts','legacy-input/input.ts']){
  const path='projects/ngx-material-legacy/'+file;assert.equal(hash(nativeRead(path)),hash(read(path)));
}
const frozen=load(paths[0]),additional=load(paths[1]);
const a=authoredUseReviewEvidence(frozen,line,read,hash),b=authoredUseReviewEvidence(additional,line,read,hash);
assert.deepEqual([a.reviewed,a.insufficient,b.reviewed,b.insufficient],[1730,0,315,0]);
const open=frozen.symbol_uses.concat(additional.symbol_uses).filter(row=>row.disposition!=='closed');
assert.equal(open.length,6);assert.ok(open.every(row=>row.module==='@angular/forms'&&row.symbol==='NG_VALUE_ACCESSOR'));
const current=scanCurrentAuthoredUses({root}),admission=currentAuthoredUseAdmission({current,frozen:frozen.symbol_uses,candidate:additional,line,readMember:read});
assert.ok(admission.scope_valid&&admission.source_snapshot_valid&&admission.inventory.complete);
assert.deepEqual([admission.current_uses,admission.current_source_files,admission.additional_uses,
  admission.additional_obligations,admission.retained_removed_additional_obligations],[1963,532,313,315,2]);
assert.equal(admission.ready,false);progress('current-inventory-admission-checked');
const controls=[DIALOG_CALLER_REVIEW,MATERIAL_REMAINING_REVIEW,'scripts/dialog-caller-review.mjs',
  'scripts/material-remaining-caller-reviews.mjs','compatibility/rc/dialog-caller-review-verification.json',
  'compatibility/rc/material-remaining-caller-review-verification.json',
  'projects/ngx-material-legacy/legacy-input/input.ts','projects/ngx-material-legacy/legacy-dialog/dialog-ref.ts'];
for(const changed of controls){progress('reject-changed:'+changed);assert.throws(()=>snackDomSourceContext({root,read:path=>
  path===changed?Buffer.concat([read(path),Buffer.from('\n')]):read(path)}),error=>error?.code==='ERR_ASSERTION');}
let changed;const late=path=>path===changed?Buffer.concat([read(path),Buffer.from('\n')]):read(path);
progress('late-change-controls');snackDomSourceContext({root,read:late});
for(changed of [MATERIAL_REMAINING_REVIEW,'projects/ngx-material-legacy/legacy-dialog/dialog-ref.ts'])
  assert.throws(()=>snackDomSourceContext({root,read:late}),error=>error?.code==='ERR_ASSERTION');
const report={schema_version:1,line,baseline_parent:parent,integrated_decisions:25,frozen_closures:frozenClosures,
  additional_closures:additionalClosures,frozen_valid:a.reviewed,additional_valid:b.reviewed,source_insufficient:0,
  open:6,remaining_open_only_packed_NG_VALUE_ACCESSOR:true,all_unselected_authored_rows_identical:true,
  all1697_upstream_rows_identical:true,native_requirements:native.length,product_changes:0,
  historical_subjects:20,current_successor_files:25,existing_source_bindings:103,
  current_peer_roles:1963,additional_obligations:315,retained_removed_additional_obligations:2,
  input_corruptions_rejected:controls.length,late_changes_rejected:2,historical_reader_unwrapped_for_raw_native_admission:true,
  full_upstream_or_historical_cohort_walk_executed:false,actual_native_packed_AOT_or_full_floor_qualified:false,g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));

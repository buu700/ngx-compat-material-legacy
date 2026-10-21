/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Exact21-row integration delta; full source walks/cohorts are separate. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {snackDomSourceContext, snackDomPreviousTaskReader} from '../../scripts/snack-dom-source-context.mjs';
import {inspectTabsCallerReview} from '../../scripts/tabs-caller-reviews.mjs';
import {inspectFormFieldCallerReview,FORM_FIELD_CALLER_REVIEW} from '../../scripts/form-field-caller-reviews.mjs';
import {authoredUseReviewEvidence} from '../../scripts/authored-use-inventory.mjs';
import {scanCurrentAuthoredUses, currentAuthoredUseAdmission} from '../../scripts/authored-current-use-inventory.mjs';

const root = process.cwd(), read = path => readFileSync(join(root, path));
const hash = value => createHash('sha256').update(value).digest('hex');
const ts = createRequire(import.meta.url)('typescript'), equal = (a,b,label) => assert.ok(isDeepStrictEqual(a,b),label);
const load = path => JSON.parse(read(path));
const priorPath = 'compatibility/rc/tabs-caller-integration-prior.json.gz';
const pins = {main: '79425d2905965f9121b93d3ecd02a74e2b07d6869ab99cb619c9f70d3fe00b55', '21.x': '2bf4174d6ee4a169e226e9002f87038035f3c1df7fbdfba01055a92a4be19507'};
const bytes = read(priorPath), line = Object.keys(pins).find(line => pins[line] === hash(bytes));
assert.ok(line); const prior = JSON.parse(gunzipSync(bytes)); assert.equal(prior.line,line);
for (const m of prior.members) {
  assert.equal(hash(m.text),m.sha256);
  const original = execFileSync('git',['--no-replace-objects','-c','gc.auto=0','show',prior.source_parent+':'+m.path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});
  assert.equal(hash(original),m.sha256);
}
const before = path => {const member = prior.members.find(m=>m.path===path); assert.ok(member); return member;};
const id = row => JSON.stringify([row.file,row.module,row.symbol]);
const reviewPath = 'compatibility/f10/authored-use-reviews/tabs-callers.json';
const review = inspectTabsCallerReview({root}), reviewRef = {path:reviewPath,sha256:hash(read(reviewPath))};
assert.equal(review.reviews.length,21);
const selected = new Set(review.reviews.map(id)); assert.equal(selected.size,21);
function ast(text) {
  const source=ts.parseJsonText('rows.json',text);assert.equal(source.parseDiagnostics.length,0);
  const props=source.statements[0].expression.properties;
  return {source,props,rows:props.find(p=>p.name.text==='symbol_uses').initializer.elements};
}
const field=inspectFormFieldCallerReview({root}),fieldRef={path:FORM_FIELD_CALLER_REVIEW,sha256:hash(read(FORM_FIELD_CALLER_REVIEW))},fieldSelected=new Set(field.reviews.map(id));assert.equal(fieldSelected.size,18);
const restorations=[];
for(const [path,total,changed,fieldChanged,headers]of [
  ['compatibility/f10/authored-dependency-dispositions.json',1736,17,13,['reviewed_uses','open_uses','note']],
  ['compatibility/f10/authored-dependency-current-dispositions.json',315,4,5,['source_snapshot_history']],
]) {
  const member=before(path),old=JSON.parse(member.text),now=load(path),a=ast(member.text),text=read(path).toString(),b=ast(text),edits=[];
  assert.equal(old.symbol_uses.length,total);assert.equal(now.symbol_uses.length,total);let count=0,following=0;
  for(let i=0;i<total;i++) {
    const previous=old.symbol_uses[i],current=now.symbol_uses[i];assert.equal(id(previous),id(current));
    if(selected.has(id(previous))) {
      assert.equal(previous.disposition,'open');
      equal(current,{...previous,status:'reviewed',disposition:'closed',source_review:reviewRef},'wrong exact tabs closure '+id(current));
      edits.push({start:b.rows[i].getStart(b.source),end:b.rows[i].end,text:a.rows[i].getText(a.source)});count++;
    }else if(fieldSelected.has(id(previous))) {
      assert.equal(previous.disposition,'open');equal(current,{...previous,status:'reviewed',disposition:'closed',source_review:fieldRef},'wrong exact form-field successor '+id(current));
      edits.push({start:b.rows[i].getStart(b.source),end:b.rows[i].end,text:a.rows[i].getText(a.source)});following++;
    }else {
      equal(current,previous,'unselected source row changed');
      assert.equal(b.rows[i].getText(b.source),a.rows[i].getText(a.source),'unselected source row bytes changed');
    }
  }
  assert.equal(count,changed);assert.equal(following,fieldChanged);
  for(const key of headers) {const left=a.props.find(p=>p.name.text===key).initializer,right=b.props.find(p=>p.name.text===key).initializer;edits.push({start:right.getStart(b.source),end:right.end,text:left.getText(a.source)});}
  let restored=text;for(const edit of edits.sort((a,b)=>b.start-a.start))restored=restored.slice(0,edit.start)+edit.text+restored.slice(edit.end);
  assert.equal(hash(restored),member.sha256,'unselected whole byte envelope changed');
  restorations.push({path,changed,subsequent_form_field:following,unselected:total-changed-following,whole_unselected_envelope_byte_preserved:true});
}
const ledgerPath='compatibility/f10/disposition-ledger/ledger.json',ledger=load(ledgerPath);
assert.equal(hash(read(ledgerPath)),before(ledgerPath).sha256,'1697-SHA ledger changed');
assert.equal(load(ledgerPath).entries.length,1697);
const recipePath='compatibility/rc/snack-dom-source-context-deltas.json',oldRecipe=JSON.parse(before(recipePath).text),recipe=load(recipePath);
assert.equal(oldRecipe.new_semantic_closures,191);assert.equal(recipe.new_semantic_closures,230);
equal(recipe.additional_individual_caller_reviews.slice(0,oldRecipe.additional_individual_caller_reviews.length),oldRecipe.additional_individual_caller_reviews,'prior191 closure catalogue changed');
assert.equal(recipe.additional_individual_caller_reviews.at(-2).individual_source_closures,21);
assert.equal(recipe.additional_individual_caller_reviews.length,oldRecipe.additional_individual_caller_reviews.length+2);equal(recipe.additional_individual_caller_reviews.at(-1),{...fieldRef,individual_source_closures:18,source_parent:JSON.parse(read('compatibility/rc/form-field-caller-worksheet.json')).source_parent,frozen_source_closures:13,additional_source_closures:5},'unqualified catalogue successor');
equal(recipe.reviewed_context_deltas,oldRecipe.reviewed_context_deltas,'prior scoped context deltas changed');
const oldRegistry=JSON.parse(before('compatibility/rc/snack-dom-source-context-inputs.json').text);
const registry=load('compatibility/rc/snack-dom-source-context-inputs.json');
const authPath='compatibility/f10/authored-use-reviews/snack-dom-source-context.json';
const auth=load(authPath);assert.equal(auth.reviews.length,63);
for(const member of oldRegistry.writes) if(![ledgerPath,'compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-dependency-current-dispositions.json',recipePath].includes(member.path)) {
  assert.equal(hash(read(member.path)),member.sha256,'previous source successor changed '+member.path);
}
const context=snackDomSourceContext({root});assert.equal(context.members,14);
const tooltip='projects/ngx-material-legacy/legacy-tooltip/internal/tooltip-base.ts';
assert.equal(hash(context.raw(tooltip)),'fc29490be443cdb544e553f762be572fb4e6635216ad47dbb492a5dffa113aad');
assert.equal(hash(context.read(tooltip)),'948fd1d57f52e617eca301b693261127e42b3e4d23d0db8b2a3e2f012db0a85d');
const frozen=load('compatibility/f10/authored-dependency-dispositions.json'),added=load('compatibility/f10/authored-dependency-current-dispositions.json');
const f=authoredUseReviewEvidence(frozen,line,read,hash),a=authoredUseReviewEvidence(added,line,read,hash);
equal([f.reviewed,f.insufficient,a.reviewed,a.insufficient],[1649,0,265,0]);
assert.equal(frozen.symbol_uses.filter(r=>r.disposition!=='closed').length,87);
assert.equal(added.symbol_uses.filter(r=>r.disposition!=='closed').length,50);
assert.equal(frozen.symbol_uses.filter(r=>r.module==='@angular/forms'&&r.symbol==='NG_VALUE_ACCESSOR'&&r.disposition==='open').length,6);
const current=scanCurrentAuthoredUses({root}),admission=currentAuthoredUseAdmission({current,frozen:frozen.symbol_uses,candidate:added,line,readMember:read});
assert.equal(admission.source_snapshot_valid,true);assert.equal(admission.inventory.complete,true);assert.equal(admission.current_uses,1965);assert.equal(admission.current_source_files,532);assert.equal(admission.additional_uses,315);assert.equal(admission.ready,false);
const defs={artifact_behavior:['artifact-behavior','validateArtifactBehavior'],content_observer_behavior:['content-observer','validateContentObserver'],form_field_hover_behavior:['form-field-hover','validateFormFieldHover'],media_matcher_behavior:['media-matcher','validateMediaMatcher'],progress_csp_behavior:['progress-csp','validateProgressCsp'],ripple_replay_behavior:['ripple-replay','validateRippleReplay'],historical_behavior:['historical-behavior','validateHistoricalBehavior'],tab_completion_behavior:['tab-completion','validateTabCompletion'],generated_identity_behavior:['generated-identity','validateGeneratedIdentity'],native_date_behavior:['native-date','validateNativeDate'],bidi_behavior:['bidi','validateBidiBehavior'],selection_behavior:['selection','validateSelectionBehavior'],owned_style_behavior:['owned-style','validateOwnedStyle']},native=[];
for(const entry of ledger.entries)for(const[field,[module,name]]of Object.entries(defs))if(entry.individual_proof?.[field]){const api=await import(pathToFileURL(join(root,'scripts/upstream-'+module+'-evidence.mjs'))),result=api[name]({root,entry,proof:entry.individual_proof,request:{line}});equal(result,{ok:false,detail:'missing coordinator run'},'raw native requirement changed '+entry.sha+':'+field+':'+JSON.stringify(result));native.push({sha:entry.sha,field,result});}assert.equal(native.length,line==='main'?34:33);

const paths=[priorPath,'compatibility/rc/snack-dom-source-context-inputs.json','scripts/snack-dom-source-context-review.mjs',
  reviewPath,'compatibility/rc/tabs-caller-prior.json.gz','compatibility/rc/tabs-caller-public-subjects.json',
  'compatibility/rc/tabs-caller-public-'+(line==='main'?'main':'21')+'.json','scripts/tabs-caller-contracts.mjs',
  'scripts/tabs-caller-reviews.mjs','compatibility/rc/api/export-name-allowlist.json','projects/ngx-material-legacy/legacy-tabs/tab-label.ts',tooltip];
// The integration prior is authenticated by this program; every other path is
// also a fail-closed dependency of the shared current owner.
for(const path of paths.slice(1))assert.throws(()=>snackDomSourceContext({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from('\nchanged')]):read(p)}),e=>e?.code==='ERR_ASSERTION',path);
for(const path of [tooltip,registry.tabs_public_proofs[0].path]) {
  let changed=false;const late=p=>changed&&p===path?Buffer.concat([read(p),Buffer.from('\nlate')]):read(p);
  const previous=snackDomPreviousTaskReader({root,read:late});changed=true;
  assert.throws(()=>snackDomPreviousTaskReader({root,read:previous}),e=>e?.code==='ERR_ASSERTION');
}
const report={schema_version:1,line,source_parent:prior.source_parent,tabs_source_closures:21,frozen_closed:17,additional_closed:4,
  cumulative_source_closures:230,subsequent_form_field_source_closures:18,prior191_closures_preserved:true,prior63_rebindings_byte_preserved:true,
  source_successor_files:20,restorations,all1697_SHA_ledger_bytes_preserved:true,
  frozen_valid:1649,additional_valid:265,source_insufficient:0,total_open:137,
  all1697_1736_315_obligations_and_six_packed_CVA_rows_retained:true,current_additional_snapshot_valid:true,
  historical_source_subjects:14,new_historical_source_reader_layers:0,raw_current_tooltip_bytes_qualified:true,
  owner_dependency_corruptions_rejected:paths.length-1,late_changes_rejected:2,raw_native_requirements:native,
  full75_1697_21_walk_or_cohorts_executed:false,actual_native_packed_AOT_or_full_floor_qualified:false,g11_claim:'not-passed'};
assert.ok(process.argv[2]);writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line,closed:21,cumulative:230,frozen_valid:1649,additional_valid:265,open:137,corruptions:paths.length-1,late_changes:2}));

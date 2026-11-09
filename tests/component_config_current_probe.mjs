/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Focused current epoch controls; historical ledger is read-only.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {inspectComponentConfigCurrentReview,inspectComponentConfigHistoricalReceipt,COMPONENT_CONFIG_CURRENT_REVIEW,COMPONENT_CONFIG_REVIEW} from '../scripts/component-config-current-reviews.mjs';
import {qualifiedComponentConfigOwned} from '../scripts/component-config-current-owned-evidence.mjs';
import {inspectComponentConfigOwnedHelpers,compareComponentConfigHelpers} from '../scripts/component-config-current-owned-helpers.mjs';
const root=process.cwd(),read=path=>readFileSync(join(root,path)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const historical=inspectComponentConfigHistoricalReceipt({root}),current=inspectComponentConfigCurrentReview({root}),q=qualifiedComponentConfigOwned({root});
assert.equal(historical.reviews.length,73);assert.equal(current.reviews.length,73);assert.equal(current.current_source_epoch,'fdef9be37d516b922efc5301c8f16d0e456f4d48');
const helpers=inspectComponentConfigOwnedHelpers({qualified:q,read}),mutant=structuredClone(helpers.inputs),from='PEER_PROGRESS_BAR_DEFAULT_OPTIONS;',to="new InjectionToken<MatProgressBarDefaultOptions>('MAT_PROGRESS_BAR_DEFAULT_OPTIONS');";
assert.equal(mutant.ownedDefaults.split(from).length,2);mutant.ownedDefaults=mutant.ownedDefaults.replace(from,to);assert.throws(()=>compareComponentConfigHelpers(mutant),/wrong default token binding/);
for(const path of [COMPONENT_CONFIG_CURRENT_REVIEW,COMPONENT_CONFIG_REVIEW,'compatibility/rc/component-config-caller-current-main.json','compatibility/rc/component-config-caller-public-types-main-current.json','compatibility/rc/component-config-caller-public-runtime-main-current.json','compatibility/rc/component-config-caller-owned-main-current.json','projects/ngx-material-legacy/legacy-paginator/paginator.ts','scripts/component-config-current-owned-helpers.mjs'])assert.throws(()=>inspectComponentConfigCurrentReview({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from('\n')]):read(p)}),e=>e?.code==='ERR_ASSERTION',path);
const historicalCommit='fdef9be37d516b922efc5301c8f16d0e456f4d48', landedCommit='f689fec16f012cac75909849d957390c438efc27';
function committedReader(commit){const cache=new Map();return path=>{if(!cache.has(path))cache.set(path,execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',commit+':'+path],{cwd:root,maxBuffer:24*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}));return cache.get(path);};}
function assess(reader){
 const ledgers=new Map();return q.source.prior.selected.map(s=>{
  if(!ledgers.has(s.ledger))ledgers.set(s.ledger,JSON.parse(reader(s.ledger)));
  const matches=ledgers.get(s.ledger).symbol_uses.filter(r=>['file','module','symbol'].every(k=>r[k]===s.original_row[k]));
  assert.equal(matches.length,1,'missing or duplicate selected configuration row');const row=matches[0];
  assert.equal(row.disposition,'closed');assert.equal(row.status,'reviewed');
  const verdict=authoredUseReviewEvidence({symbol_uses:[row]},'main',reader,hash);
  assert.equal(verdict.reviewed+verdict.insufficient,1,'unclassified configuration review');
  return {key:JSON.stringify([row.file,row.module,row.symbol]),review:row.source_review,valid:verdict.reviewed===1};
 });
}
function noRegressions(baseline,actual){
 assert.equal(baseline.length,73);assert.equal(actual.length,73);
 assert.equal(new Set(baseline.map(x=>x.key)).size,73);assert.deepEqual(actual.map(x=>x.key),baseline.map(x=>x.key),'changed selected roster');
 for(let i=0;i<baseline.length;i++)assert.ok(!baseline[i].valid||actual[i].valid,'previously valid configuration review lost '+baseline[i].key);
}
const baseline=assess(committedReader(historicalCommit)),landed=assess(committedReader(landedCommit)),actual=assess(read);
assert.equal(baseline.filter(x=>x.valid).length,64,'immutable fdef baseline changed');
assert.equal(baseline.filter(x=>!x.valid).length,9,'immutable fdef baseline changed');
noRegressions(baseline,landed);noRegressions(landed,actual);
const recovered=landed.filter((x,i)=>!baseline[i].valid&&x.valid).map(x=>x.key).sort();
const expectedRecovered=[
 ['legacy-radio/internal/radio-base.ts','@angular/material/radio','MAT_RADIO_DEFAULT_OPTIONS'],
 ['legacy-radio/internal/radio-base.ts','@angular/material/radio','MAT_RADIO_GROUP'],
 ['legacy-radio/internal/radio-base.ts','@angular/material/radio','MatRadioDefaultOptions'],
 ['legacy-autocomplete/internal/autocomplete-trigger-base.ts','@angular/material/autocomplete','MatAutocompleteDefaultOptions'],
 ['legacy-autocomplete/internal/autocomplete-trigger-base.ts','@angular/material/autocomplete','MAT_AUTOCOMPLETE_DEFAULT_OPTIONS'],
 ['legacy-autocomplete/internal/autocomplete-trigger-base.ts','@angular/material/autocomplete','MAT_AUTOCOMPLETE_SCROLL_STRATEGY'],
 ['legacy-autocomplete/internal/autocomplete-base.ts','@angular/material/autocomplete','MatAutocompleteDefaultOptions'],
 ['legacy-autocomplete/internal/autocomplete-base.ts','@angular/material/autocomplete','MAT_AUTOCOMPLETE_DEFAULT_OPTIONS'],
].map(x=>JSON.stringify(x)).sort();
assert.deepEqual(recovered,expectedRecovered,'landed metadata recovery differs from the reviewed eight roles');
const target=actual.find((x,i)=>!baseline[i].valid&&landed[i].valid&&x.valid);assert.ok(target?.review?.path);
const bad=assess(p=>p===target.review.path?Buffer.concat([read(p),Buffer.from('\n')]):read(p));
assert.throws(()=>noRegressions(landed,bad),/previously valid configuration review lost/);
const baselineTarget=actual.find((x,i)=>baseline[i].valid&&x.valid);assert.ok(baselineTarget?.review?.path);
const baselineBad=assess(p=>p===baselineTarget.review.path?Buffer.concat([read(p),Buffer.from('\n')]):read(p));
assert.throws(()=>noRegressions(baseline,baselineBad),/previously valid configuration review lost/);
console.log(JSON.stringify({historical_receipt:73,current_reviews:73,current_source_files:q.source.sources.size,current_epoch:current.current_source_epoch,controls:8,comparator_distinct_token_rejected:true,baseline_commit:historicalCommit,baseline_reviewed:64,baseline_insufficient:9,landed_commit:landedCommit,landed_recoveries:recovered.length,reviewed:actual.filter(x=>x.valid).length,insufficient:actual.filter(x=>!x.valid).length,previously_valid_lost:0,recovered_role_fault_rejected:true,baseline_role_fault_rejected:true,source_closures:0}));

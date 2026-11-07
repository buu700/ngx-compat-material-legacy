/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current roster data only; the inherited production baseline is separate. */
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseInventory,authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
import {scanCurrentAuthoredUses} from '../scripts/authored-current-use-inventory.mjs';
const root=resolve(process.env.ROSTER_TEST_ROOT??join(dirname(fileURLToPath(import.meta.url)),'..'));
const stage=process.env.ROSTER_TEST_STAGE?resolve(process.env.ROSTER_TEST_STAGE):root;
const read=path=>readFileSync(join(existsSync(join(stage,path))?stage:root,path));
const sha=b=>createHash('sha256').update(b).digest('hex'),json=path=>JSON.parse(read(path)),key=r=>JSON.stringify([r.file,r.module,r.symbol]);
const current=scanCurrentAuthoredUses({root}),candidate=json('compatibility/f10/authored-dependency-current-dispositions.json'),prior=json('compatibility/rc/current-authored-use-prior-317-v1.json'),frozen=json('compatibility/f10/authored-dependency-inventory-seed.json');
assert.equal(sha(read('compatibility/f10/authored-dependency-inventory-seed.json')),'3e059e3d9ba423b9f666fcf3ec960945cb43555750eb5fa3025a503d3cd8795b');
const frozenDispositionBytes=read('compatibility/f10/authored-dependency-dispositions.json'),frozenDisposition=JSON.parse(frozenDispositionBytes);assert.equal(frozenDisposition.line,'main');assert.equal(frozenDisposition.symbol_uses.length,1736);assert.equal(authoredUseInventory(frozen.symbol_uses,frozenDisposition).complete,true);
for(const mutate of [rows=>rows.slice(1),rows=>[...rows.slice(0,-1),rows[0]],rows=>[...rows.slice(0,-1),{...rows.at(-1),symbol:'UNKNOWN_UNREVIEWED'}]])assert.equal(authoredUseInventory(frozen.symbol_uses,{...frozenDisposition,symbol_uses:mutate(frozenDisposition.symbol_uses)}).complete,false);
assert.equal(sha(read('compatibility/rc/current-authored-use-prior-317-v1.json')),'f511e46130f3376aadf7796365db533eaa0f35979dd99e8abffaf859d8127057');
assert.equal(frozen.symbol_uses.length,1736);assert.equal(prior.symbol_uses.length,317);assert.equal(current.source_files.length,509);assert.equal(current.symbol_uses.length,1931);assert.equal(current.source_population_sha256,'ca851159f9b9d169de05b1c08436480218198193b2ce10bbdd86d504bcf92495');
const frozenKeys=new Set(frozen.symbol_uses.map(key)),live=current.symbol_uses.filter(row=>!frozenKeys.has(key(row))),expected=new Map(prior.symbol_uses.map(row=>[key(row),row]));for(const row of live)expected.set(key(row),row);assert.equal(live.length,329);assert.equal(expected.size,331);
assert.ok(authoredUseInventory([...expected.values()],candidate).complete);assert.equal(candidate.status,'closed');assert.equal(candidate.g11_claim,'not-passed');assert.equal(candidate.current_source_population_sha256,current.source_population_sha256);assert.equal(candidate.current_source_files,509);assert.equal(candidate.current_uses,1931);assert.equal(candidate.live_symbol_use_count,329);
const byKey=new Map(candidate.symbol_uses.map(r=>[key(r),r])),liveMap=new Map(live.map(r=>[key(r),r]));for(const old of prior.symbol_uses){const now=byKey.get(key(old));assert.ok(now);if(now.prior_current_source_row)assert.deepEqual(now.prior_current_source_row,old);else assert.deepEqual(now,old);}
const prior331Path='compatibility/rc/current-authored-use-prior-331-before-pointer-v1.json';assert.equal(sha(read(prior331Path)),'de2be594954ea42d5ba7d6b84eaff07c0d6c0797632bfc752492cce8bb6f721c');const prior331=json(prior331Path);assert.equal(prior331.symbol_uses.length,331);let pointerUpdates=0;for(const old of prior331.symbol_uses){const now=byKey.get(key(old));assert.ok(now);if(now.prior_pointer_source_row){assert.deepEqual(now.prior_pointer_source_row,old);assert.equal(now.file,'legacy-autocomplete/internal/autocomplete-trigger-base.ts');assert.equal(now.module,'@angular/cdk/layout');assert.ok(['BreakpointObserver','Breakpoints'].includes(now.symbol));pointerUpdates++;}else assert.deepEqual(now,old);}assert.equal(pointerUpdates,2);
for(const row of candidate.symbol_uses){const actual=liveMap.get(key(row));if(actual){assert.equal(row.candidate_source_sha256,actual.candidate_source_sha256);assert.deepEqual(row.occurrences,actual.occurrences);}else assert.deepEqual(row.occurrences,[]);}
const result=authoredUseReviewEvidence(candidate,'main',read,sha);assert.equal(result.reviewed,331);assert.equal(result.insufficient,0);
for(const mutate of [rows=>rows.slice(1),rows=>[...rows,rows[0]],rows=>[...rows,{...rows[0],symbol:'UNKNOWN_UNREVIEWED'}]])assert.equal(authoredUseInventory([...expected.values()],{...candidate,symbol_uses:mutate(candidate.symbol_uses)}).complete,false);
for(const [file,symbol] of [['legacy-dialog/internal/dialog-container-base.ts','ApplicationRef'],['legacy-progress-bar/internal/progress-bar-defaults.ts','MAT_PROGRESS_BAR_DEFAULT_OPTIONS'],['legacy-tabs/internal/tab-body-base.ts','assertInInjectionContext'],['legacy-dialog/internal/dialog-initial-focus.ts','MatDialogConfig'],['legacy-form-field/form-field.ts','AfterViewChecked'],['legacy-core/option/option-base.ts','signal'],['legacy-autocomplete/internal/autocomplete-trigger-base.ts','BreakpointObserver'],['legacy-autocomplete/internal/autocomplete-trigger-base.ts','Breakpoints']]){
 const matches=candidate.symbol_uses.filter(row=>row.file===file&&row.symbol===symbol);assert.equal(matches.length,1);const row=matches[0],check=reader=>authoredUseReviewEvidence({symbol_uses:[row]},'main',reader,sha);assert.equal(check(read).reviewed,1);const body=json(row.source_review.path),selected=body.reviews.find(r=>key(r)===key(row)),evidence=selected.independent_evidence[0].path;
 for(const bad of ['projects/ngx-material-legacy/'+file,row.source_review.path,evidence])assert.equal(check(path=>path===bad?Buffer.from('changed'):read(path)).insufficient,1);
}
assert.ok(read('compatibility/f10/authored-dependency-dispositions.json').equals(frozenDispositionBytes),'frozen disposition changed during roster check');
console.log('current roster: 331 source reviews, 329 live and 2 retained, exact 317 and 331 prior rows; frozen 1736 keys match immutable seed; 30 targeted negative controls passed; production baseline not exercised');

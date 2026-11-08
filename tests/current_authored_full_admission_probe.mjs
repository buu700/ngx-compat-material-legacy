/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {join,resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {scanCurrentAuthoredUses,currentAuthoredUseAdmission} from '../scripts/authored-current-use-inventory.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),readMember=p=>readFileSync(join(root,p));
const current=scanCurrentAuthoredUses({root}),frozen=JSON.parse(readMember('compatibility/f10/authored-dependency-dispositions.json')).symbol_uses,candidate=JSON.parse(readMember('compatibility/f10/authored-dependency-current-dispositions.json'));
const admission=(c,reader=readMember,graph=current)=>currentAuthoredUseAdmission({root,current:graph,frozen,candidate:c,line:'main',readMember:reader});
const positive=admission(candidate);console.log('actual admission '+JSON.stringify({...positive,review_evidence:{reviewed:positive.review_evidence.reviewed,insufficient:positive.review_evidence.insufficient}}));
assert.equal(positive.scope_valid,true);assert.equal(positive.source_snapshot_valid,true);assert.equal(positive.current_uses,1935);assert.equal(positive.current_source_files,509);assert.equal(positive.additional_uses,333);assert.equal(positive.additional_obligations,336);assert.equal(positive.retained_removed_additional_obligations,3);assert.equal(positive.inventory.complete,true);assert.equal(positive.review_evidence.reviewed,336);assert.equal(positive.review_evidence.insufficient,0);assert.equal(positive.ready,true);
const test=(label,mutate,predicate)=>{const c=structuredClone(candidate);mutate(c);const out=admission(c);assert.ok(predicate(out),label);};
test('removed retirement qualification',c=>{c.retained_removed_additional_uses.pop();},a=>!a.scope_valid&&!a.source_snapshot_valid);
test('removed retired ledger row',c=>{c.symbol_uses=c.symbol_uses.filter(r=>!(r.file==='legacy-form-field/form-field.ts'&&r.symbol==='AfterViewChecked'));},a=>!a.inventory.complete&&!a.ready);
test('stale scanner snapshot',c=>{c.current_source_population_sha256='0'.repeat(64);},a=>!a.source_snapshot_valid&&!a.ready);
test('duplicate role',c=>{c.symbol_uses.push(c.symbol_uses[0]);},a=>!a.inventory.complete&&!a.ready);
test('wrong live occurrence',c=>{c.symbol_uses.find(r=>r.file==='legacy-form-field/internal/after-form-field-render.ts').occurrences=[];},a=>!a.source_snapshot_valid&&!a.ready);
for(const path of ['compatibility/f10/authored-use-reviews/form-field-render-helper-current-v1.json','projects/ngx-material-legacy/legacy-form-field/internal/after-form-field-render.ts','compatibility/rc/final-product-evidence-v1/angular-core-public.d.ts']){const out=admission(candidate,p=>p===path?Buffer.from('tamper'):readMember(p));assert.ok(out.review_evidence.insufficient>=5);assert.equal(out.review_evidence.insufficient_uses.filter(r=>r.file==='legacy-form-field/internal/after-form-field-render.ts').length,5);assert.equal(out.ready,false);}
const unknown=structuredClone(current);unknown.source_files.find(r=>r.path==='projects/ngx-material-legacy/legacy-form-field/form-field.ts').sha256='0'.repeat(64);const dropped=structuredClone(candidate);dropped.retained_removed_additional_uses=dropped.retained_removed_additional_uses.filter(r=>r.symbol!=='AfterViewChecked');dropped.symbol_uses=dropped.symbol_uses.filter(r=>!(r.file==='legacy-form-field/form-field.ts'&&r.symbol==='AfterViewChecked'));const failed=admission(dropped,readMember,unknown);assert.equal(failed.scope_valid,false);assert.equal(failed.additional_obligations,336);assert.equal(failed.inventory.missing,1);assert.match(failed.additional_baseline.error,/unqualified form-field retirement source epoch/);
console.log('integrated nine negative controls rejected');

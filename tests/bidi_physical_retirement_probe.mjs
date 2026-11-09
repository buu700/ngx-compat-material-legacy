/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Focused physical Bidi owner test protocol. No admission or runtime claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, lstatSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseReviewEvidence, authoredUseReviewEvidencePhysical} from '../scripts/authored-use-inventory.mjs';
const mode=process.argv[2], hash=b=>createHash('sha256').update(b).digest('hex');
if(mode==='inspect') {
  const rows=authoredUseReviewEvidencePhysical().review_evidence.insufficient_uses;
  console.log(JSON.stringify(rows.filter(r=>r.module==='@angular/cdk/bidi'&&r.symbol==='BidiModule').map(r=>r.file)));
} else if(mode==='reentry') {
  assert.throws(()=>authoredUseReviewEvidencePhysical(),/reentered physical Bidi evidence transaction/);
  const rows=authoredUseReviewEvidencePhysical().review_evidence.insufficient_uses.filter(r=>r.module==='@angular/cdk/bidi'&&r.symbol==='BidiModule');
  assert.deepEqual(rows.map(x=>x.file).sort(),['legacy-core/internal/common-module.ts','legacy-core/pseudo-checkbox/pseudo-checkbox-module.ts']);
  console.log(JSON.stringify({caught_nested_poisoned_outer:true,independent_recovery:true}));
} else if(mode==='actual-roster') {
  // The owner and the generic reader both inspect this module's actual checkout.
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const packetBytes=readFileSync(join(root,'compatibility/rc/qualification/frozen-public-bidi-source-v2/reviewed-per-use.json'));
  assert.equal(hash(packetBytes),'9d1925881b4480ddcedb47b0c7a49d28b86d95d06295b4b8a3414011f63d1ac7');
  const approved=JSON.parse(packetBytes),key=r=>JSON.stringify([r.file,r.module,r.symbol]);
  assert.equal(approved.line,'main');assert.equal(approved.status,'reviewed-finite-source-dispositions');
  assert.equal(approved.reviews.length,25);
  const expected=new Set(approved.reviews.filter(r=>r.conclusion==='removed-use').map(key));
  const retained=new Set(approved.reviews.filter(r=>r.conclusion==='stable-public-peer').map(key));
  assert.equal(expected.size,23);assert.equal(retained.size,2);
  const roster=JSON.parse(readFileSync(join(root,'compatibility/f10/authored-dependency-dispositions.json')));
  const selected=roster.symbol_uses.filter(r=>r.module==='@angular/cdk/bidi'&&r.symbol==='BidiModule');
  assert.equal(selected.length,25);assert.equal(new Set(selected.map(key)).size,25);
  assert.deepEqual(new Set(selected.map(key)),new Set([...expected,...retained]));
  const readPhysical=path=>{const parts=path.split('/');if(path.includes('\\')||parts.some(p=>!p||p==='.'||p==='..'))return null;let current=root;
    try {for(const part of parts){current=join(current,part);if(lstatSync(current).isSymbolicLink())return null;}return lstatSync(current).isFile()?readFileSync(current):null;}catch{return null;}};
  const generic=authoredUseReviewEvidence({symbol_uses:selected},'main',readPhysical,hash);
  const physical=authoredUseReviewEvidencePhysical().review_evidence;
  const allowed=new Set(selected.map(key)),g=new Set(generic.insufficient_uses.map(key)),p=new Set(physical.insufficient_uses.map(key).filter(k=>allowed.has(k)));
  const difference=new Set([...g].filter(k=>!p.has(k))),unexpected=[...p].filter(k=>!g.has(k));
  assert.deepEqual(difference,expected,'physical/generic difference must be the exact 23 approved retirements');
  assert.deepEqual(unexpected,[],'physical owner must not add a new failure for these rows');
  for(const k of retained)assert.equal(p.has(k),g.has(k),'retained use must preserve ordinary outcome');
  console.log(JSON.stringify({scope:'actual main-22 roster only',retired_difference:difference.size,retained_same:retained.size,generic_insufficient:g.size,physical_insufficient:p.size}));
} else if(mode==='generic') {
  const {authoredUseReviewEvidence:baseline}=await import('../scripts/authored-use-inventory-baseline.mjs');
  const source=Buffer.from('source'),proof=Buffer.from('proof'),reviewPath='compatibility/f10/authored-use-reviews/test.json';
  const r={file:'legacy-one/a.ts',module:'@angular/core',symbol:'Directive'},src='projects/ngx-material-legacy/'+r.file;
  assert.equal(existsSync(src),false,'historical-reader fixture must have no physical source');
  const mk=()=>({schema_version:1,line:'main',status:'reviewed',reviews:[{...r,candidate_source_sha256:hash(source),conclusion:'stable-public-peer',reviewer:'fixture',decision:'A sufficiently long fixture description of the source role, exclusively for testing source reader validation predicates.',independent_evidence:[{path:'proof.json',sha256:hash(proof)}]}]});
  const run=(mutate,readerMutate,scope='main')=>{const b=mk();mutate?.(b);const bytes=Buffer.from(JSON.stringify(b)),row={...r,status:'reviewed',disposition:'closed',source_review:{path:reviewPath,sha256:hash(bytes)}},map={[reviewPath]:bytes,[src]:source,'proof.json':proof};readerMutate?.(map);const read=p=>map[p]??null, expected=baseline({symbol_uses:[row]},scope,read,hash),actual=authoredUseReviewEvidence({symbol_uses:[row]},scope,read,hash);assert.deepEqual(actual,expected);return actual;};
  const results=[run(),run(null,m=>delete m[src]),run(null,m=>m['proof.json']=Buffer.from('changed')),run(null,null,'21.x'),run(b=>b.reviews.push({...b.reviews[0]})),run(b=>b.reviews[0].decision='short'),run(b=>b.reviews[0].conclusion='unknown'),run(b=>b.reviews[0].independent_evidence[0].path=src)];
  assert.equal(results[0].reviewed,1);assert.ok(results.slice(1).every(x=>x.insufficient===1));console.log(JSON.stringify({generic_cases:results.length}));
} else throw Error('Unknown physical Bidi probe mode');

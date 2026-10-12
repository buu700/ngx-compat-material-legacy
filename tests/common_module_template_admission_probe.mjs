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
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {authoredUseReviewEvidence} from '../scripts/authored-use-inventory.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const ledger=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json')),rows=ledger.symbol_uses.filter(r=>r.symbol==='CommonModule'&&r.module==='@angular/common');assert.equal(rows.length,13);
const controls=[];
for(const row of rows){
 assert.equal(authoredUseReviewEvidence({symbol_uses:[row]},ledger.line,read,hash).reviewed,1);
 const path=row.source_review.path,body=JSON.parse(read(path));
 for(const id of ['wrong-line','missing-caller','stale-source','missing-independent-evidence']){
  const changed=structuredClone(body),entry=changed.reviews.find(r=>r.file===row.file&&r.symbol===row.symbol&&r.module===row.module);
  if(id==='wrong-line')changed.line=ledger.line==='main'?'21.x':'main';
  if(id==='missing-caller')changed.reviews=changed.reviews.filter(r=>r!==entry);
  if(id==='stale-source')entry.candidate_source_sha256='0'.repeat(64);
  if(id==='missing-independent-evidence')entry.independent_evidence[0].sha256='0'.repeat(64);
  const bytes=Buffer.from(JSON.stringify(changed)),candidate={...row,source_review:{path,sha256:hash(bytes)}};
  const result=authoredUseReviewEvidence({symbol_uses:[candidate]},ledger.line,p=>p===path?bytes:read(p),hash);
  assert.equal(result.insufficient,1,id+' '+row.file);controls.push({file:row.file,id,rejected:true});
 }
}
const report={line:ledger.line,positive_callers:rows.length,negative_controls:controls,scope:'Actual per-caller source-review admission only; no full native/AOT/packed/floor/G11 claim.'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({positive_callers:rows.length,negative_controls:controls.length}));

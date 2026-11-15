/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildPlatformCdee} from '../../scripts/platform-cdee-source-successor.mjs';
import {authoredUseReviewEvidence} from '../../scripts/authored-use-inventory.mjs';
const root=process.cwd(),read=p=>readFileSync(resolve(root,p)),hash=b=>createHash('sha256').update(b).digest('hex');
const x=buildPlatformCdee({root,read});assert.deepEqual(read(x.reportPath),x.report);assert.deepEqual(read(x.ledgerPath),x.ledger);assert.equal(x.input.rows.length,6);
const roster=JSON.parse(x.ledger),selected=roster.symbol_uses.filter(r=>x.input.rows.some(a=>a.file===r.file&&a.module===r.module&&a.symbol===r.symbol));
const check=reader=>authoredUseReviewEvidence({symbol_uses:selected},'main',reader,hash);assert.equal(check(read).reviewed,6);
for(const path of [x.reportPath,x.input.diagnostic.path,'projects/ngx-material-legacy/'+selected[0].file]){assert.ok(check(p=>p===path?Buffer.from('corrupt'):read(p)).insufficient>0);}
const unrelated=roster.symbol_uses.find(r=>!selected.some(s=>s.file===r.file&&s.module===r.module&&s.symbol===r.symbol));
const old=JSON.stringify(roster,null,2)+'\n',needle=JSON.stringify(unrelated,null,2).split('\n')[0];assert.equal(needle,'{');
const live=structuredClone(roster),other=live.symbol_uses.find(r=>r.file===unrelated.file&&r.module===unrelated.module&&r.symbol===unrelated.symbol);other.independent_control={text:'unchanged'};
const expectedBytes=Buffer.from(JSON.stringify(live,null,2)+'\n');for(const prior of x.input.rows){const i=live.symbol_uses.findIndex(r=>r.file===prior.file&&r.module===prior.module&&r.symbol===prior.symbol);assert.ok(i>=0);live.symbol_uses[i]=structuredClone(prior.prior_row);}
const liveBytes=Buffer.from(JSON.stringify(live,null,2)+'\n');const composable=buildPlatformCdee({root,read:p=>p===x.ledgerPath?liveBytes:read(p)});assert.deepEqual(composable.ledger,expectedBytes);
for(const mutate of [a=>a[0].status='unreviewed',a=>a.push(structuredClone(a[0])),a=>delete a[0].symbol]){
 const candidate=structuredClone(roster);const chosen=candidate.symbol_uses.filter(r=>selected.some(s=>s.file===r.file&&s.module===r.module&&s.symbol===r.symbol));mutate(chosen);if(chosen.length>6)candidate.symbol_uses.push(chosen.at(-1));
 assert.throws(()=>buildPlatformCdee({root,read:p=>p===x.ledgerPath?Buffer.from(JSON.stringify(candidate)):read(p)}));
}
console.log(JSON.stringify({rows:6,source_reviewed:6,source_corruptions_rejected:3,selected_mutations_rejected:3,unrelated_live_row_preserved:true,actual_native_packed_or_floor_qualified:false,g11_claim:'not-passed'}));

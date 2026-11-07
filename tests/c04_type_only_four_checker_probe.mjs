/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const full=JSON.parse(readFileSync(join(root,'compatibility/f10/disposition-ledger/ledger.json')));
const ids=['126faaa38be980ec5e8bc8a4af99f1ffa650938e','93b30773774a739783794d6ec0bd3991261b4908','aa7280c02026537e47bc627f59dce3150a98169c','4c8928eb40b73e9d435a9c7a1fc91867d8831513'];
const temp=mkdtempSync(join(tmpdir(),'c04-type-only-checker-'));
function run(name,line,mutate=()=>{}){
 const ledger=structuredClone(full);ledger.entries=ledger.entries.filter(x=>ids.includes(x.sha));assert.equal(ledger.entries.length,4);mutate(ledger);
 const input=join(temp,name+'.ledger.json'),output=join(temp,name+'.report.json');writeFileSync(input,JSON.stringify(ledger));
 const child=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--admission','--line',line,'--ledger',input,'--report',output],{cwd:root,encoding:'utf8'});
 assert.equal(child.status,1,`${name}: expected nonzero for intentionally partial ledger: ${child.stderr}`);
 const report=JSON.parse(readFileSync(output));return {individual:new Set(report.insufficient_review_sha_ids.individual),failures:report.evidence_failures};
}
try{
 const main=run('main','main');for(const sha of ids){assert.equal(main.individual.has(sha),false,sha);assert(!main.failures.some(x=>x.sha===sha),sha);}
 const wrong=run('wrong-line','21.x');for(const sha of ids)assert.equal(wrong.individual.has(sha),true,sha);
 const corrupt=run('forged-decision','main',l=>{l.entries.find(x=>x.sha===ids[3]).reason+=' forged';});assert.equal(corrupt.individual.has(ids[3]),true);for(const sha of ids.slice(0,3))assert.equal(corrupt.individual.has(sha),false);
 const stale=run('stale-source','main',l=>{l.entries.find(x=>x.sha===ids[3]).individual_proof.source_evidence[1].sha256='0'.repeat(64);});assert.equal(stale.individual.has(ids[3]),true);
 console.log(JSON.stringify({actual_checker:true,main_positive:4,wrong_line_rejected:4,forged_decision_rejected:1,stale_source_rejected:1,partial_ledger_exits_nonzero:true,scope:'main source review, no 21.x or runtime qualification'}));
}finally{rmSync(temp,{recursive:true,force:true});}

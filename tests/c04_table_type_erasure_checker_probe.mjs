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
const ids=['dabbf3e97b65f06832995b217f3c680d89675515'];
const temp=mkdtempSync(join(tmpdir(),'c04-table-type-checker-'));
function run(name,line,mutate=()=>{}){
 const ledger=structuredClone(full);ledger.entries=ledger.entries.filter(x=>ids.includes(x.sha));assert.equal(ledger.entries.length,1);mutate(ledger);
 const input=join(temp,name+'.ledger.json'),output=join(temp,name+'.report.json');writeFileSync(input,JSON.stringify(ledger));
 const child=spawnSync(process.execPath,['scripts/check-upstream-audit-disposition.mjs','--admission','--line',line,'--ledger',input,'--report',output],{cwd:root,encoding:'utf8'});
 assert.equal(child.status,1,`${name}: expected nonzero for intentionally partial ledger: ${child.stderr}`);
 const report=JSON.parse(readFileSync(output));return {individual:new Set(report.insufficient_review_sha_ids.individual),failures:report.evidence_failures};
}
try{
 const main=run('main','main');for(const sha of ids){assert.equal(main.individual.has(sha),false,sha);assert(!main.failures.some(x=>x.sha===sha),sha);}
 const wrong=run('wrong-line','21.x');for(const sha of ids)assert.equal(wrong.individual.has(sha),true,sha);
 const corrupt=run('forged-decision','main',l=>{l.entries.find(x=>x.sha===ids[0]).reason+=' forged';});assert.equal(corrupt.individual.has(ids[0]),true);for(const sha of ids.slice(1))assert.equal(corrupt.individual.has(sha),false);
 const stale=run('stale-source','main',l=>{l.entries.find(x=>x.sha===ids[0]).individual_proof.source_evidence[1].sha256='0'.repeat(64);});assert.equal(stale.individual.has(ids[0]),true);
 console.log(JSON.stringify({actual_checker:true,main_positive:1,wrong_line_rejected:1,forged_decision_rejected:1,stale_source_rejected:1,partial_ledger_exits_nonzero:true,scope:'main source review, no 21.x or runtime qualification'}));
}finally{rmSync(temp,{recursive:true,force:true});}

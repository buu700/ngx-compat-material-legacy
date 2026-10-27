/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Real main proof predicates stay independent of the seven 21.x decisions. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p));
assert.equal(JSON.parse(read('projects/ngx-material-legacy/package.json')).version.startsWith('21.'),false);
const old=execFileSync('git',['--no-replace-objects','show','c3e0f9d390342074e1635dd0ca8bca14aaf4bdfb:scripts/upstream-candidate-source-evidence.mjs'],{cwd:root});
const previous=await import('data:text/javascript;base64,'+old.toString('base64'));
const current=await import(pathToFileURL(join(root,'scripts/upstream-candidate-source-evidence.mjs')));
const selected=new Set(['422e85d1524f8eeff2425e403702fbfc23a2cc2e','4de7c0fb2d033bd81074764a52cc46edd02e6774','54d514df66b9a1ea544df0aacc7069defcd78dcd','3619903fa26910a784f01bee627e30d922b9b525','85f596b3c32d22541c3825da3479b67832a2f4da','9cf15019d9d82bcb7460df5febd898a1b1eec59b','3ef56a682fa797563d3269f18769ddceda05f760']);
const ledger=JSON.parse(read('compatibility/f10/disposition-ledger/ledger.json')),results=[];
for(const entry of ledger.entries.filter(e=>selected.has(e.sha))){
 const oldResult=previous.candidateSourceEvidenceOk(entry.individual_proof,read,()=>previous.candidateProductSourcePaths(root));
 const currentResult=current.candidateSourceEvidenceOk(entry.individual_proof,read,()=>current.candidateProductSourcePaths(root));
 assert.equal(currentResult,oldResult,entry.sha);results.push({sha:entry.sha,old:oldResult,current:currentResult});
}
assert.equal(results.length,7);
const report={line:'main',result:'pass',same_actual_source_predicates:results,main_decisions_changed:0,producer_sha256:createHash('sha256').update(read('tests/upstream_testing_api_21x_main_scope_probe.mjs')).digest('hex'),g11_claim:'not-passed'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({line:'main',result:'pass',rows:results.length}));

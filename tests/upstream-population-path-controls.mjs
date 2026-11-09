/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Execute only in an isolated physical frame; this moves a fixture source.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,renameSync,unlinkSync,existsSync} from 'node:fs';
import {candidateSourceEvidenceOk,candidateProductSourcePaths} from '../scripts/upstream-candidate-source-evidence.mjs';
const ledger=JSON.parse(readFileSync(process.env.POPULATION_LEDGER,'utf8'));
const proof=ledger.entries.find(x=>x.sha==='de40f2eec4c0eeadfa40fba040f5c9dcbb1ea8c4').individual_proof;
const file='projects/ngx-material-legacy/legacy-menu/internal/menu-content-base.ts',renamed=file.replace('.ts','-population-control.ts');
assert.equal(existsSync(renamed),false);const original=readFileSync(file),read=p=>readFileSync(p),paths=()=>candidateProductSourcePaths(process.cwd());
try{
 assert.equal(candidateSourceEvidenceOk(proof,read,paths),true);
 unlinkSync(file);assert.equal(candidateSourceEvidenceOk(proof,read,paths),false);writeFileSync(file,original);
 renameSync(file,renamed);assert.equal(candidateSourceEvidenceOk(proof,read,paths),false);renameSync(renamed,file);
 assert.equal(candidateSourceEvidenceOk(proof,read,paths),true);console.log(JSON.stringify({physical_delete_rejected:true,physical_rename_rejected:true,recovery_passed:true}));
}finally{if(existsSync(renamed))unlinkSync(renamed);writeFileSync(file,original);}

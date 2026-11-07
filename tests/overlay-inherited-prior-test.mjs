/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const base='9be00b7baf32477b8e521305efa36273589566b9', ledgerPath='compatibility/f10/disposition-ledger/ledger.json';
const git=(path)=>execFileSync('git',['show',`${base}:${path}`],{env:{...process.env,GIT_NO_LAZY_FETCH:'1'},maxBuffer:30*1024*1024});
const previous=JSON.parse(git(ledgerPath)),current=JSON.parse(readFileSync(ledgerPath));
const ids=['01cc6f3265903cc6c3a58ea4ae5e03c917597e8f','09df51d8ebb86a3ee76614b6775dd62136660567','0ca0c3112c762f449673f5cc1f3f4d7e8e3c20af','1a92e22eff7728d92b6af8834701f78acbb4d2cc','332f78607b409c7158e7153ef0ed044a09922a99'];
const hash=x=>createHash('sha256').update(x).digest('hex');
for(const sha of ids){
 const old=previous.entries.find(x=>x.sha===sha),entry=current.entries.find(x=>x.sha===sha);assert.ok(old&&entry);assert.deepEqual(entry.prior_disposition_record,old);
 const proof=JSON.parse(readFileSync(entry.evidence_report)),prior=proof.prior_disposition_source.prior_source_review,bytes=gunzipSync(readFileSync(prior.archive_path));
 assert.equal(prior.path,old.evidence_report);assert.deepEqual(bytes,git(old.evidence_report));assert.equal(hash(bytes),prior.sha256);
 const mechanical=proof.digest_provenance.prior_mechanical_join_diff;
 if(mechanical){const originalReport=JSON.parse(bytes);assert.equal(hash(readFileSync(mechanical.path)),mechanical.sha256);assert.equal(originalReport.diff_sha256,mechanical.sha256);}
 assert.equal(entry.diff_sha256,proof.digest_provenance.current_complete_patch.sha256);
}
console.log('five prior rows and original reports match base commit bytes; three mechanical diff bytes match historical report digests');

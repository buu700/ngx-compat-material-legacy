/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inputHarnessClosureFingerprint} from '../scripts/api-input-harness-contract.mjs';
import {qualifyInputCombinedClosure,INPUT_PREDECESSOR_ARCHIVE_SHA,INPUT_PREDECESSOR_CLOSURE_SHA} from '../scripts/api-input-combined-closure-successor.mjs';
const [priorFile,currentFile,archive]=process.argv.slice(2),prior=JSON.parse(readFileSync(priorFile)),current=JSON.parse(readFileSync(currentFile));
assert.equal(createHash('sha256').update(readFileSync(archive)).digest('hex'),INPUT_PREDECESSOR_ARCHIVE_SHA);
assert.equal(inputHarnessClosureFingerprint(prior),INPUT_PREDECESSOR_CLOSURE_SHA);assert.ok(qualifyInputCombinedClosure(current));
const key=r=>[r.package,r.version,r.path].join('\0');const before=new Map(prior.map(r=>[key(r),r])),after=new Map(current.map(r=>[key(r),r]));assert.equal(before.size,312);assert.equal(after.size,312);assert.deepEqual([...before.keys()].sort(),[...after.keys()].sort());const changed=[...before.keys()].filter(k=>JSON.stringify(before.get(k))!==JSON.stringify(after.get(k)));assert.deepEqual(changed,[['@ngx-compat/material-legacy','22.0.0-rc.0','types/ngx-compat-material-legacy-legacy-core.d.ts'].join('\0')]);
for(const mutate of [r=>r.find(x=>x.package==='typescript').sha256='0'.repeat(64),r=>r.find(x=>x.path.endsWith('legacy-core.d.ts')).sha256='0'.repeat(64),r=>r.push({...r[0]}),r=>r.pop()]){const rows=structuredClone(current);mutate(rows);assert.equal(qualifyInputCombinedClosure(rows),false);}
console.log('312-record transition and unrelated dependency mutations verified');

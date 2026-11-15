/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {menuHarnessClosureFingerprint} from '../scripts/api-menu-harness-contract.mjs';
import {qualifyMenuCombinedClosure,MENU_SIGNATURE_PREDECESSOR_SHA} from '../scripts/api-menu-combined-signature-successor.mjs';
const [priorFile,currentFile,archive]=process.argv.slice(2),prior=JSON.parse(readFileSync(priorFile)),current=JSON.parse(readFileSync(currentFile));
assert.equal(createHash('sha256').update(readFileSync(archive)).digest('hex'),'877c8b62e1ea9b134d838043dda436abb4ccf9515041640fdb05dc6113727b0b');assert.equal(menuHarnessClosureFingerprint(prior),MENU_SIGNATURE_PREDECESSOR_SHA);assert.ok(qualifyMenuCombinedClosure(current));
const key=r=>[r.package,r.version,r.path].join('\0'),before=new Map(prior.map(r=>[key(r),r])),after=new Map(current.map(r=>[key(r),r]));assert.equal(before.size,312);assert.equal(after.size,312);assert.deepEqual([...before.keys()].sort(),[...after.keys()].sort());assert.deepEqual([...before.keys()].filter(k=>JSON.stringify(before.get(k))!==JSON.stringify(after.get(k))),[['@ngx-compat/material-legacy','22.0.0-rc.0','types/ngx-compat-material-legacy-legacy-core.d.ts'].join('\0')]);
for(const mutate of [r=>r.find(x=>x.package==='typescript').sha256='0'.repeat(64),r=>r.find(x=>x.path.endsWith('legacy-core.d.ts')).sha256='0'.repeat(64),r=>r.push({...r[0]}),r=>r.pop()]){const rows=structuredClone(current);mutate(rows);assert.equal(qualifyMenuCombinedClosure(rows),false);}
console.log('312-record predecessor transition and four mutations passed');

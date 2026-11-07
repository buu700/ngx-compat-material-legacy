/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scanCurrentAuthoredUses} from '../scripts/authored-current-use-inventory.mjs';
import {qualifyCurrentDialogRetiredUse as qualify} from '../scripts/current-dialog-retired-use-source.mjs';
const root=resolve(process.env.ROSTER_TEST_ROOT??join(dirname(fileURLToPath(import.meta.url)),'..')),current=scanCurrentAuthoredUses({root}),raw=path=>readFileSync(join(root,path));
const result=qualify({root,readMember:raw,current});assert.equal(result.candidate_source_sha256,'c63b9af0076ce1ae261c0e8529b4c0f496c2b42b3b6edf1e270b3217fdea44e1');assert.equal(result.qualification.sha256,'b40d95220e7b41ddb39b561cf9d940a46dde8936989a8cc9f990aa01db532839');
const live=structuredClone(current);live.symbol_uses.push(result.role);assert.throws(()=>qualify({root,readMember:raw,current:live}));
const stale=structuredClone(current);stale.source_files.find(r=>r.path.endsWith('/dialog-initial-focus.ts')).sha256='0'.repeat(64);assert.throws(()=>qualify({root,readMember:raw,current:stale}));
assert.throws(()=>qualify({root,readMember:path=>path===result.current_source_evidence.path?Buffer.from('changed'):raw(path),current}));
const duplicate=structuredClone(current);duplicate.source_files.push({...duplicate.source_files.find(r=>r.path.endsWith('/dialog-initial-focus.ts'))});assert.throws(()=>qualify({root,readMember:raw,current:duplicate}));
let seen=0;const late=path=>path===result.current_source_evidence.path&&++seen===2?Buffer.from('late change'):raw(path);assert.throws(()=>qualify({root,readMember:late,current}));assert.equal(seen,2);
let attempted=false;const reenter=path=>{if(!attempted){attempted=true;assert.throws(()=>qualify({root,readMember:raw,current}));}return raw(path)};assert.throws(()=>qualify({root,readMember:reenter,current}));assert.equal(attempted,true);
const altered=structuredClone(current);let reads=0;const mutate=path=>{if(path===result.current_source_evidence.path&&++reads===2)altered.symbol_uses.push(result.role);return raw(path)};assert.throws(()=>qualify({root,readMember:mutate,current:altered}));assert.equal(reads,2);
console.log('dialog retired-use continuation: actual current scan, positive and 7 negatives pass; production baseline not exercised');

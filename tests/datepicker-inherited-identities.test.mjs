/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,cpSync,realpathSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {datepickerInheritedRequirements,checkOriginalPatch,checkMaterial2217,checkSourceProposals} from '../scripts/datepicker-inherited-identities.mjs';
const stage=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const peer=process.argv[2];if(!peer)throw Error('expected installed Material 22.1.7 path');
const readMember=(root,path)=>readFileSync(join(root,path));
const shas=['0d36e863ba6752596b6cee5810b5d953d536a9a9','2d5942cb0fe86f9c3d26b1925b1d4390cfc6613b','5db8dca18b5967c203a5898dfa713ff03d9e7134','e8b28fa6ba15f536e72d13c0b22765924efaf1f6'];
for(const sha of shas){assert.equal(checkOriginalPatch(stage,sha,'main',readMember).sha,sha);assert.equal(datepickerInheritedRequirements(sha,'21.x'),null);assert.throws(()=>checkOriginalPatch(stage,sha,'main',()=>Buffer.from('forgery')),/changed/);}
for(const sha of ['0d36e863', '0000000000000000000000000000000000000000', '__proto__'])assert.equal(datepickerInheritedRequirements(sha,'main'),null);
assert.equal(checkSourceProposals(stage,readMember),true);
assert.throws(()=>checkSourceProposals(stage,()=>Buffer.from('{}')),/source proposal changed/);
assert.equal(checkMaterial2217(peer),true);
const tmp=mkdtempSync(join(tmpdir(),'datepicker-peer-test-'));try {cpSync(realpathSync(peer),tmp,{recursive:true});writeFileSync(join(tmp,'fesm2022/datepicker.mjs'),'tampered');assert.throws(()=>checkMaterial2217(tmp),/wrong Material peer member/);} finally {rmSync(tmp,{recursive:true,force:true});}
console.log('identity data checks pass; no runtime or coordinator qualification');

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Targeted real guard callback test. Run only in a disposable checkout. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {readCheckerOwnerMember} from '../scripts/checker-owner-source.mjs';
import {prepareBrowserReferenceMetadata, BROWSER_REFERENCE_LEDGER} from '../scripts/browser-reference-proposal.mjs';
import {browserReferenceOwnerContext} from '../scripts/browser-reference-owner.mjs';
import {inventoryReferenceOwnerContext} from '../scripts/inventory-reference-owner.mjs';
const root=process.cwd(),mode=process.argv[2],surface=mode==='inventory-rc'?'scripts/rc_acceptance.py':'scripts/browser-surface-families.mjs';
assert.ok(['proposal','browser-owner','inventory-owner','inventory-rc'].includes(mode));
const physical=path=>readCheckerOwnerMember(root,path),old=physical(surface);
let record=false,seen=[],attack=null;
const read=path=>{const raw=physical(path);if(record)seen.push(path);if(attack&&path===attack.path&&--attack.remaining===0){attack=null;writeFileSync(join(root,surface),Buffer.concat([old,Buffer.from('\n')]));}return raw;};
const make=()=>mode==='proposal'?prepareBrowserReferenceMetadata({root,read}):mode==='browser-owner'?browserReferenceOwnerContext({root,read}):inventoryReferenceOwnerContext({root,read});
const subject=make();subject.assertCurrent();record=true;subject.assertCurrent();record=false;
const target=mode==='proposal'?BROWSER_REFERENCE_LEDGER:seen.at(-1);assert.ok(target&&target!==surface);
const count=seen.filter(path=>path===target).length;assert.ok(count>0);attack={path:target,remaining:count};
try{assert.throws(()=>subject.assertCurrent());assert.equal(attack,null,'target callback not reached');}
finally{writeFileSync(join(root,surface),old);}subject.assertCurrent();
console.log(JSON.stringify({result:'pass',mode,target,callback_occurrence:count,same_subject_guard:true,full_owner_or_native_qualified:false}));

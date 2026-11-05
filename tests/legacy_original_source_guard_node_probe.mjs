/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Focused real-original node controls. Run only after the source profile is refreshed. */
import assert from 'node:assert/strict';
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {inspectLegacyRemovalOriginals} from '../scripts/upstream-legacy-removal-source.mjs';
import {readEvidenceMember} from '../scripts/upstream-packed-run-evidence.mjs';
import {composeCanonicalSourceGuards} from '../scripts/canonical-source-guard-plan.mjs';
const paths=['compatibility/rc/21x-legacy-removal-source-originals.json.gz','compatibility/rc/upstream-complete-patch-census.json.gz','scripts/upstream-legacy-removal-source.mjs','scripts/canonical-source-guard-plan.mjs'];
const inputRoot=resolve(process.cwd()),root=mkdtempSync(join(tmpdir(),'legacy-original-node-'));
try{
 for(const path of paths){const target=join(root,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(inputRoot,path),target);}
 let subject,mode='normal',observed=0;
 const alternate=()=>composeCanonicalSourceGuards(Object.freeze([subject.guardNode]));
 const read=path=>{
  if(mode==='reentry'){
   observed++;assert.throws(()=>subject.assertCurrent(),/reentrant/);
   assert.throws(()=>subject.guardNode.preflight(),/reentrant/);
   assert.throws(()=>alternate()(),/reentrant/);
  }
  if(mode==='late'&&path===paths[1]){observed++;writeFileSync(join(root,paths[0]),Buffer.from('changed'));}
  return readEvidenceMember(root,path);
 };
 subject=inspectLegacyRemovalOriginals({root,read});
 assert.equal(subject.guardPlan.assertCurrent,subject.assertCurrent);assert.equal(subject.guardPlan.node,subject.guardNode);
 mode='reentry';subject.assertCurrent();assert.ok(observed>0,'reentry controls did not reach a callback');
 mode='normal';subject.assertCurrent();
 const original=readFileSync(join(root,paths[0]));mode='late';observed=0;
 assert.throws(()=>subject.assertCurrent());assert.ok(observed>0,'late mutation did not execute');
 writeFileSync(join(root,paths[0]),original);mode='normal';subject.assertCurrent();
 console.log('legacy original source node controls passed');
}finally{rmSync(root,{recursive:true,force:true});}

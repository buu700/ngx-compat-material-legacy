/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {currentSassToolReferenceSubject} from '../scripts/current-sass-tool-references.mjs';
const root=process.argv[2], packet=JSON.parse(readFileSync(join(root,'compatibility/rc/parent-base-class-tool-successor-inputs-v5.json')));
const current=()=>currentSassToolReferenceSubject({root});
const subject=current();assert.equal(subject.epoch,6);
for(const row of packet.updates){
 const latest=subject.transitions.find(item=>item.path===row.path);assert.deepEqual(subject.qualify(row.before),{path:row.path,...latest.after});
 assert.equal(createHash('sha256').update(subject.comparisonBytes(row.before)).digest('hex'),row.before.sha256);
 assert.equal(createHash('sha256').update(subject.comparisonBytes(row.after)).digest('hex'),row.after.sha256);
 assert.equal(subject.qualify({...row.before,sha256:'0'.repeat(64)}),null);
 assert.throws(()=>currentSassToolReferenceSubject({root,read:path=>path===row.path?subject.comparisonBytes(row.before):readFileSync(join(root,path))}));
}
const paths=[...packet.updates.map(row=>row.path),packet.additional_inputs[0].path,'compatibility/rc/parent-base-class-tool-successor-inputs-v5.json'];
for(const path of paths){
 const file=join(root,path),original=readFileSync(file);
 try{
  writeFileSync(file,Buffer.concat([original,Buffer.from('\n// unknown mutation')]));
  assert.throws(()=>current());assert.throws(()=>subject.assertCurrent());
 }finally{writeFileSync(file,original);}
 subject.assertCurrent();
 let armed=false;const last=subject.bound.at(-1).path;
 const live=currentSassToolReferenceSubject({root,read:p=>{const raw=readFileSync(join(root,p));if(armed&&p===last){armed=false;writeFileSync(file,Buffer.concat([original,Buffer.from(' late')]));}return raw;}});
 try{armed=true;assert.throws(()=>live.assertCurrent());}finally{writeFileSync(file,original);}
 live.assertCurrent();
}
console.log(JSON.stringify({epoch:subject.epoch,transitions:subject.transitions,bound:subject.bound,cold:paths.length,late:paths.length,callback:paths.length}));

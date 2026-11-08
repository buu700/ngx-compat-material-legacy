/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {qualifyMainInventoryToolReference} from '../scripts/canonical-tool-source-role.mjs';
const root=process.cwd(),read=path=>readFileSync(root+'/'+path),hash=raw=>createHash('sha256').update(raw).digest('hex');
const packet=JSON.parse(read('compatibility/rc/c04-inventory-owner-inputs.json'));
const prior={...packet.before_owner};
const live=qualifyMainInventoryToolReference({root,read,prior});
assert.ok(live);assert.equal(live.reference.sha256,hash(read(prior.path)));
assert.equal(live.reference.bytes,read(prior.path).length);assert.notEqual(live.reference.sha256,packet.after_owner.sha256);
const targets=[...new Set(live.bound.map(ref=>ref.path))];
for(const target of targets){
 let bad=false;const callback=path=>{const raw=read(path);return bad&&path===target?Buffer.concat([raw,Buffer.from(' ')]):raw;};
 const scope=qualifyMainInventoryToolReference({root,read:callback,prior});
 scope.bound.length=0;scope.reference.sha256='0'.repeat(64);
 bad=true;assert.throws(()=>scope.assertCurrent(),undefined,'late '+target);
 assert.throws(()=>qualifyMainInventoryToolReference({root,read:callback,prior}),undefined,'cold '+target);
 bad=false;scope.assertCurrent();
}
assert.throws(()=>qualifyMainInventoryToolReference({root,read,prior:{...prior,sha256:'0'.repeat(64)}}));
assert.throws(()=>qualifyMainInventoryToolReference({root,read,prior:{...prior,bytes:prior.bytes+1}}));
live.reference.sha256='0'.repeat(64);live.bound.length=0;live.assertCurrent();
console.log(JSON.stringify({result:'pass',targets,cold_rejections:targets.length,late_rejections:targets.length,recovery:targets.length,unknown_predecessor_rejected:true,wrong_length_rejected:true,public_metadata_isolated:true,scope:'Canonical tool-reference successor only; no enclosing retained phase pass'}));

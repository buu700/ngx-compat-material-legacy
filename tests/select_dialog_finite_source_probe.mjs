import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {selectDialogFiniteSuccessor as make} from '../scripts/select-dialog-finite-source-successor.mjs';
const root=resolve(process.argv[2]),line=process.argv[3],read=p=>readFileSync(resolve(root,p));
const packet=JSON.parse(read('compatibility/rc/parent-select-dialog-menu-snack-finite-source-v3.json'));
const rows=packet.branches[line].transitions,build=reader=>make({root,line,read:reader});
const s=build(read);assert.equal(s.bound.length,12);
for(const row of rows){assert.equal(s.qualify(row.before).sha256,row.after.sha256);assert.equal(s.qualify(row.after).sha256,row.after.sha256);assert.equal(s.historicalReference(row.after).sha256,row.before.sha256);assert.throws(()=>s.qualify({...row.before,sha256:'a'.repeat(64)}),/unknown select predecessor/);assert.throws(()=>s.qualify({...row.before,bytes:row.before.bytes+1}));}
assert.equal(s.qualify({path:'elsewhere',sha256:'a'.repeat(64)}),null);
assert.throws(()=>make({root,line:line==='main'?'21.x':'main',read}),/wrong select line/);
for(const ref of s.bound){let attacked=false;assert.throws(()=>build(p=>{const b=read(p);if(p===ref.path&&!attacked){attacked=true;return Buffer.from('wrong');}return b;}),/nonphysical select successor/);assert.ok(attacked);}
for(const ref of s.bound){let attacking=false;const subject=build(p=>{const b=read(p);return attacking&&p===ref.path?Buffer.from('wrong'):b;});attacking=true;assert.throws(()=>subject.assertCurrent(),/nonphysical select successor/);}
for(const ref of s.bound){const path=resolve(root,ref.path),original=read(ref.path);try{writeFileSync(path,Buffer.concat([original,Buffer.from('x')]));assert.throws(()=>s.assertPhysical(),/changed physical select successor/);}finally{writeFileSync(path,original);}}
let inside=false,subject;subject=build(p=>{if(inside){inside=false;subject.assertCurrent();}return read(p);});inside=true;assert.throws(()=>subject.assertCurrent(),/reentrant select successor/);s.assertCurrent();console.log('PASS: exact transitions, wrong line/hash/size, cold and late callback/physical tampering, reentrancy');

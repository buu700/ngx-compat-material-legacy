/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,mkdtempSync,symlinkSync,rmSync,renameSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {currentSassToolReferenceSubject as make} from '../scripts/current-sass-tool-references.mjs';
const root=resolve(process.argv[2]||'.'), read=path=>readFileSync(resolve(root,path));
const alternate=(await import('../scripts/current-sass-tool-references.mjs?independent-tool-test')).currentSassToolReferenceSubject;
const scratch=mkdtempSync(resolve(tmpdir(),'tool-alias-')),alias=resolve(scratch,'root');symlinkSync(root,alias);
const baseline=make({root}),fixture=resolve(scratch,'fixture');mkdirSync(fixture);
for(const ref of baseline.bound){const target=resolve(fixture,ref.path);mkdirSync(dirname(target),{recursive:true});copyFileSync(resolve(root,ref.path),target);}
const gitdir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();writeFileSync(resolve(fixture,'.git'),'gitdir: '+gitdir+'\n');
const fixtureSubject=make({root:fixture});assert.equal(fixtureSubject.epoch,7);
const future=baseline.bound.at(-1).path,target=resolve(fixture,future),original=readFileSync(target),altered=Buffer.from(original),firstPaths=[],stop=Error('recorded two paths');assert.ok(altered.length>0);altered[0]^=1;
try{make({root:fixture,read(path){firstPaths.push(path);if(firstPaths.length===2)throw stop;return readFileSync(resolve(fixture,path));}});assert.fail('expected stop');}catch(error){assert.equal(error,stop);}
assert.equal(firstPaths.length,2);assert.ok(firstPaths.every(path=>path!==future));let callbacks=0;
try{assert.throws(()=>make({root:fixture,read(path){const raw=readFileSync(resolve(fixture,path));callbacks++;if(callbacks===1)writeFileSync(target,altered);if(callbacks===2)writeFileSync(target,original);return raw;}}),/late physical current tool input/);assert.equal(callbacks,1);}finally{writeFileSync(target,original);}
try{writeFileSync(target,altered);assert.throws(()=>fixtureSubject.assertCurrent());assert.throws(()=>make({root:fixture}));}finally{writeFileSync(target,original);}fixtureSubject.assertCurrent();
const scripts=resolve(fixture,'scripts'),savedScripts=resolve(scratch,'fixture-scripts');renameSync(scripts,savedScripts);symlinkSync(savedScripts,scripts,'dir');
try{assert.throws(()=>fixtureSubject.assertCurrent());assert.throws(()=>make({root:fixture}));}finally{unlinkSync(scripts);renameSync(savedScripts,scripts);}fixtureSubject.assertCurrent();
let caught=0;
assert.throws(()=>make({root,read(path){try{make({root:alias});}catch{caught++;}return read(path);}}),/reentrant current tool root transaction/);
assert.equal(caught,1);
let invoke, armed=false, nestedSucceeded=false;
const subject=make({root,read(path){if(armed){armed=false;try{invoke();}catch{caught++;}}return read(path);}});
assert.equal(subject.epoch,7);
const row=subject.transitions[0], known={path:row.path,...row.before},unknown={path:'scripts/unknown-tool.mjs',sha256:'0'.repeat(64),bytes:0};
invoke=()=>{const fixtureSubject=make({root:fixture});assert.equal(fixtureSubject.epoch,7);nestedSucceeded=true;};armed=true;subject.qualify(known);assert.equal(nestedSucceeded,true);
for(const [label,outer,nested] of [
 ['qualify',()=>subject.qualify(known),()=>subject.qualify(unknown)],
 ['comparison',()=>subject.comparisonBytes(known),()=>subject.predecessorReference(unknown)],
 ['batch',()=>subject.referenceBatch([{kind:'qualify',reference:known}]),()=>subject.ownsReference(unknown)],
 ['assert',()=>subject.assertCurrent(),()=>subject.guardPlan.assertCurrent()],
 ['consume',()=>subject.guardNode.consume(),()=>subject.guardNode.final()],
 ['constructor',()=>subject.qualify(known),()=>make({root})],
 ['alternate module',()=>subject.qualify(known),()=>{const registry=globalThis[Symbol.for('ngx-compat-material-legacy.current-tool-root-transactions.v1')];assert.equal(registry.roots,undefined);try{alternate({root});assert.fail('nested entry succeeded');}catch(error){assert.match(error.message,/reentrant current tool root transaction/);}assert.equal(Reflect.set(registry,'roots',new Map()),false);}],
]){invoke=nested;armed=true;assert.throws(outer,/reentrant current tool root transaction/,label);assert.equal(armed,false,label);}
subject.guardNode.preflight();subject.guardNode.consume();subject.guardNode.final();subject.assertCurrent();
rmSync(scratch,{recursive:true});
console.log('current TOOL JS root transaction controls passed');

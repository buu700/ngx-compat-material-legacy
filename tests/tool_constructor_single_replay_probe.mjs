/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {currentSassToolReferenceSubject as make} from '../scripts/current-sass-tool-references.mjs';
const canonical=process.cwd(),initial=make({root:canonical});
const root=mkdtempSync(join(tmpdir(),'tool-constructor-control-'));
try {
for(const ref of initial.bound){const p=join(root,ref.path);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,readFileSync(join(canonical,ref.path)));}
writeFileSync(join(root,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:canonical}).toString().trim()+'\n');
const physical=p=>readFileSync(join(root,p)),targetRelative='tests/test_retained_landscape_tool_replay.py',target=join(root,targetRelative);
const original=readFileSync(target),changed=Buffer.concat([original,Buffer.from(' ')]);
const group=process.argv.find(arg=>arg.startsWith('--group='))?.slice(8)??'all';
assert.ok(['all','cold','reentry','last','metadata'].includes(group));
const groups={
 'cold drift cannot be restored by first callback':'cold','nonphysical supplied member rejects':'cold',
 'warm cold drift rejects before callback':'cold','caught root reentry rejects and recovers':'reentry',
 'last callback mutation rejects and recovers':'last','changed reference metadata rejects and recovers':'metadata'};
const results=[];const check=(name,fn)=>{if(group!=='all'&&groups[name]!==group)return;fn();results.push(name);};
let callbackCalls=0;
check('cold drift cannot be restored by first callback',()=>{
 try{writeFileSync(target,changed);assert.throws(()=>make({root,read:p=>{callbackCalls++;writeFileSync(target,original);return physical(p);}}));}
 finally{writeFileSync(target,original);}
 assert.equal(callbackCalls,0);
});
check('nonphysical supplied member rejects',()=>assert.throws(()=>make({root,read:p=>p===targetRelative?changed:physical(p)})));
let scope,armed=false,kind=null,count=0,last=0,ref;
const read=p=>{
 count++;
 if(armed&&kind==='reentry'){armed=false;try{scope.assertCurrent();}catch{}}
 if(armed&&kind==='restore'){armed=false;writeFileSync(target,original);}
 if(armed&&kind==='last'&&count===last){armed=false;writeFileSync(target,changed);}
 if(armed&&kind==='metadata'){armed=false;ref.sha256='0'.repeat(64);}
 return physical(p);
};
scope=make({root,read});
check('warm cold drift rejects before callback',()=>{
 try{writeFileSync(target,changed);armed=true;kind='restore';count=0;assert.throws(()=>scope.assertCurrent());assert.equal(count,0);}
 finally{armed=false;writeFileSync(target,original);}
 scope.assertCurrent();
});
check('caught root reentry rejects and recovers',()=>{armed=true;kind='reentry';assert.throws(()=>scope.assertCurrent());scope.assertCurrent();});
if(group==='all'||group==='last'){count=0;scope.assertCurrent();last=count;}
check('last callback mutation rejects and recovers',()=>{
 try{armed=true;kind='last';count=0;assert.throws(()=>scope.assertCurrent());}
 finally{armed=false;writeFileSync(target,original);}
 scope.assertCurrent();
});
check('changed reference metadata rejects and recovers',()=>{
 const row=scope.transitions[0];ref={path:row.path,...row.before};armed=true;kind='metadata';assert.throws(()=>scope.qualify(ref));
 scope.assertCurrent();
});
const reportPath=process.argv.slice(2).find(arg=>!arg.startsWith('--group='));
if(reportPath)writeFileSync(reportPath,JSON.stringify({result:'pass',checks:results},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:'pass',checks:results}));

} finally {rmSync(root,{recursive:true,force:true});}

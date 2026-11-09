/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {checkerOwnerSourceSubject as make} from '../scripts/checker-owner-source.mjs';
import {browserOwnerSourceSubject} from '../scripts/browser-owner-source.mjs';

const canonical=process.cwd(),initial=make({root:canonical});
const root=mkdtempSync(join(tmpdir(),'checker-owned-comparison-'));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
try{
 for(const ref of initial.bound){const path=join(root,ref.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,readFileSync(join(canonical,ref.path)));}
 writeFileSync(join(root,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:canonical}).toString().trim()+'\n');
 const physical=path=>readFileSync(join(root,path)),ownerPath='scripts/checker-owner-source.mjs',ownerBefore=physical(ownerPath);
 const reference=structuredClone(initial.packet.source_members.find(ref=>ref.path==='scripts/check-upstream-audit-disposition.mjs'));
 let subject,mode='',armed=false,count=0,last=0,argument=null,legacyBytes,equalsCalls=0,getters=0,reached=false;
 const sentinel=new Error('checker comparison provided-reader sentinel');
 const read=path=>{
  count++;const raw=physical(path);
  if(armed&&mode==='restore'){armed=false;writeFileSync(join(root,ownerPath),ownerBefore);}
  if(armed&&['buffer','nonbuffer','historical'].includes(mode)&&path===reference.path){armed=false;reached=true;return mode==='buffer'?Buffer.concat([raw,Buffer.from(' ')]):mode==='nonbuffer'?{}:Buffer.from(legacyBytes);}
  const trigger=mode==='reentry-first'?count===1:count===last;
  if(armed&&trigger){armed=false;reached=true;
   if(mode==='physical')writeFileSync(join(root,ownerPath),Buffer.concat([ownerBefore,Buffer.from(' ')]));
   if(mode==='metadata')argument.sha256='0'.repeat(64);
   if(mode==='descriptor')Object.defineProperty(argument,'sha256',{writable:false});
   if(mode==='reentry-first'||mode==='reentry-last'){try{subject.historicalCheckerBytes(reference);}catch{}}
   if(mode==='exception')throw sentinel;
   if(mode==='equals'){const supplied=Buffer.from(raw);supplied.equals=()=>{equalsCalls++;throw Error('caller-owned equals invoked');};return supplied;}
  }
  return raw;
 };
 subject=make({root,read});
 const sibling=browserOwnerSourceSubject({root,read});legacyBytes=sibling.comparisonBytes(reference);
 const compare=subject.historicalCheckerBytes,checks=[],check=(name,fn)=>{fn();checks.push(name);};
 const stable=()=>{const result=compare({...reference});assert.equal(hash(result),reference.sha256);assert.ok(result.equals(legacyBytes));return result;};
 check('same bytes as actual sibling source subject',()=>{assert.equal(hash(legacyBytes),reference.sha256);assert.equal(legacyBytes.length,reference.bytes);stable();});
 check('fresh buffers and public-copy isolation',()=>{const a=stable(),b=stable();assert.notStrictEqual(a,b);a.fill(0);subject.bound.length=0;subject.packet.source_members.length=0;assert.ok(b.equals(stable()));});
 const privateBound=initial.bound;
 check('invalid references rejected before callbacks',()=>{
  const bad=[{...reference,path:'scripts/unknown-checker.mjs'},{...reference,sha256:'0'.repeat(64)},{...reference,bytes:reference.bytes+1},{...reference,extra:true},{path:reference.path},Object.create(null)];
  const accessor={...reference};Object.defineProperty(accessor,'sha256',{enumerable:true,get(){getters++;return reference.sha256;}});bad.push(accessor);
  bad.push(new Proxy({...reference},{getOwnPropertyDescriptor(){getters++;throw Error('proxy trap invoked');}}));
  for(const ref of bad){count=0;assert.throws(()=>compare(ref));assert.equal(count,0);}
  assert.equal(getters,0);
 });
 check('cold drift rejects before restoring callback',()=>{
  try{writeFileSync(join(root,ownerPath),Buffer.concat([ownerBefore,Buffer.from(' ')]));mode='restore';armed=true;count=0;assert.throws(()=>compare(reference));assert.equal(count,0);assert.equal(armed,true);}
  finally{armed=false;writeFileSync(join(root,ownerPath),ownerBefore);}stable();
 });
 check('warm drift and recovery',()=>{
  const path=privateBound[0].path,before=physical(path);
  try{writeFileSync(join(root,path),Buffer.concat([before,Buffer.from(' ')]));count=0;assert.throws(()=>compare(reference));assert.equal(count,0);}
  finally{writeFileSync(join(root,path),before);}stable();
 });
 for(const [kind,name]of [['buffer','forged provided buffer rejection and recovery'],['nonbuffer','non-buffer provided value rejection and recovery'],['historical','historical bytes never accepted as current source']])check(name,()=>{
  if(kind==='historical')assert.notEqual(hash(physical(reference.path)),hash(legacyBytes));
  mode=kind;armed=true;reached=false;count=0;assert.throws(()=>compare(reference));assert.equal(reached,true);armed=false;stable();
 });
 count=0;stable();last=count;
 for(const [kind,name]of [['physical','last callback physical mutation and recovery'],['metadata','last callback metadata mutation and recovery'],['descriptor','last callback descriptor mutation and recovery'],['reentry-first','caught first callback reentry and recovery'],['reentry-last','caught last callback reentry and recovery'],['exception','provided exception identity and recovery']])check(name,()=>{
  argument={...reference};const descriptors=Object.getOwnPropertyDescriptors(argument);count=0;mode=kind;armed=true;reached=false;
  try{assert.throws(()=>compare(argument),error=>kind!=='exception'||error===sentinel);assert.equal(reached,true);}
  finally{armed=false;Object.defineProperties(argument,descriptors);writeFileSync(join(root,ownerPath),ownerBefore);}stable();
 });
 check('caller-owned equals never invoked',()=>{mode='equals';armed=true;count=0;reached=false;stable();assert.equal(reached,true);assert.equal(equalsCalls,0);});
 check('caller receiver cannot replace actual subject',()=>{const receiver=new Proxy({},{get(){throw Error('caller receiver inspected');}});assert.ok(Reflect.apply(compare,receiver,[reference]).equals(legacyBytes));});
 assert.equal(checks.length,16);
 console.log(JSON.stringify({result:'pass',checks,checks_passed:checks.length,comparison_sha256:hash(legacyBytes),comparison_bytes:legacyBytes.length,getters,caller_equals_calls:equalsCalls,genuine_source_subject:true,historical_program_executed:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}));
}finally{rmSync(root,{recursive:true,force:true});}

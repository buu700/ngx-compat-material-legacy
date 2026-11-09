/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,readdirSync,symlinkSync,existsSync,statSync} from 'node:fs';
import {dirname,join,resolve,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {dialogTitleReaderSubject} from '../scripts/dialog-title-source-context.mjs';
import {sassWrapperNoticeSubject as make} from '../scripts/sass-wrapper-notice-subject.mjs';
import {spinnerSnackC04Source} from '../scripts/sass-spinner-snack-c04-source.mjs';
const canonical=process.cwd(),raw=p=>readFileSync(join(canonical,p));
const title=dialogTitleReaderSubject({root:canonical,read:raw,line:'main'});
const source=spinnerSnackC04Source({root:canonical,read:raw});
const root=mkdtempSync(join(tmpdir(),'sass-notice-scope-guard-'));
try{
 const copy=p=>{const target=join(root,p);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,raw(p));};
 for(const ref of [...title.bound,...source.bound])if(!ref.path.startsWith('node_modules/')||ref.path.startsWith('node_modules/.pnpm/'))copy(ref.path);
 const noticePath='compatibility/rc/sass-wrapper-notice-successor.json',readersPath='compatibility/rc/sass-wrapper-notice-reader-successors.json';
 copy(noticePath);copy(readersPath);for(const row of [...JSON.parse(raw(noticePath)).subjects,...JSON.parse(raw(readersPath)).code_subjects])copy(row.path);
 const todo=['scripts/sass-wrapper-notice-subject.mjs','scripts/packed-upstream-ledger-epoch.mjs'],seen=new Set();
 while(todo.length){const p=todo.pop();if(seen.has(p))continue;seen.add(p);if(!existsSync(join(root,p)))copy(p);
  for(const match of raw(p).toString().matchAll(/(?:from\s*|import\s*|require\s*\(\s*|new URL\s*\(\s*)['"](\.[^'"]+)['"]/g)){
   const source=resolve(canonical,dirname(p),match[1]);if(!existsSync(source)||!statSync(source).isFile())continue;assert.ok(source.startsWith(canonical+'/'),source);todo.push(relative(canonical,source));
  }
 }
 mkdirSync(join(root,'node_modules'),{recursive:true});
 for(const name of readdirSync(join(canonical,'node_modules'))){if(name.startsWith('.'))continue;
  if(name.startsWith('@')){mkdirSync(join(root,'node_modules',name),{recursive:true});for(const child of readdirSync(join(canonical,'node_modules',name)))symlinkSync(join(canonical,'node_modules',name,child),join(root,'node_modules',name,child),'dir');}
  else if(name==='typescript'){
   const target='node_modules/.pnpm/typescript@6.0.3/node_modules/typescript';copy(target+'/package.json');
   symlinkSync(join(root,target),join(root,'node_modules',name),'dir');
  }else symlinkSync(join(canonical,'node_modules',name),join(root,'node_modules',name),'dir');
 }
 writeFileSync(join(root,'.git'),'gitdir: '+execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:canonical}).toString().trim()+'\n');
 const physical=p=>readFileSync(join(root,p)),target='projects/ngx-material-legacy/styles/sort/_sort-theme.scss',saved=physical(target),checks=[];
 let calls=0,armed=false,kind='',last=0,scope,subject;
 const read=p=>{calls++;
  if(armed&&kind==='restore'){armed=false;writeFileSync(join(root,target),saved);}
  if(armed&&kind==='metadata'){armed=false;scope.owned_scss_population[0].sha256='0'.repeat(64);}
  if(armed&&kind==='reentry'){armed=false;try{subject.qualifySassScope(scope);}catch{}}
  if(armed&&kind==='last'&&calls===last){armed=false;writeFileSync(join(root,target),Buffer.concat([saved,Buffer.from(' ')]));}
  return physical(p);
 };
 try{writeFileSync(join(root,target),Buffer.concat([saved,Buffer.from(' ')]));assert.throws(()=>make({root,read}));assert.equal(calls,0);checks.push('cold drift cannot be restored by first callback');}
 finally{writeFileSync(join(root,target),saved);armed=false;}
 subject=make({root,read});
 const historical=JSON.parse(gunzipSync(raw('compatibility/rc/upstream-sass-inspection-current-scope.json.gz'))).actual;
 scope=structuredClone(historical);const value=subject.qualifySassScope(scope);assert.deepEqual(scope,historical);
 const expected=structuredClone(historical),rows=new Map(JSON.parse(raw(noticePath)).subjects.map(row=>[row.path,row]));
 expected.owned_scss_population=expected.owned_scss_population.map(ref=>rows.has(ref.path)?{path:ref.path,...rows.get(ref.path).after}:ref);
 expected.owned_population_sha256=createHash('sha256').update(JSON.stringify(expected.owned_scss_population)).digest('hex');
 expected.candidate.loaded_sources=expected.candidate.loaded_sources.map(ref=>{const row=ref.root===0&&rows.get('projects/ngx-material-legacy/'+ref.path);return row?{...ref,...row.after}:ref;});
 assert.deepEqual(value,expected);checks.push('complete finite scope metadata matches exact seven-prefix model');
 try{writeFileSync(join(root,target),Buffer.concat([saved,Buffer.from(' ')]));armed=true;kind='restore';calls=0;assert.throws(()=>subject.qualifySassScope(scope));assert.equal(calls,0);checks.push('warm drift rejected before callbacks');}
 finally{armed=false;writeFileSync(join(root,target),saved);}subject.assertCurrent();
 for(const current of ['metadata','reentry']){scope=structuredClone(historical);armed=true;kind=current;assert.throws(()=>subject.qualifySassScope(scope));armed=false;scope=structuredClone(historical);subject.assertCurrent();checks.push(current+' rejected and recovered');}
 calls=0;subject.assertCurrent();last=calls;
 try{calls=0;armed=true;kind='last';assert.throws(()=>subject.assertCurrent());checks.push('final callback physical mutation rejected');}
 finally{armed=false;writeFileSync(join(root,target),saved);}subject.assertCurrent();
 const ownerPath='scripts/sass-wrapper-notice-subject.mjs',owner=physical(ownerPath);
 try{writeFileSync(join(root,ownerPath),Buffer.concat([owner,Buffer.from(' ')]));calls=0;assert.throws(()=>subject.assertCurrent());assert.equal(calls,0);checks.push('loaded image drift rejected before callbacks');}
 finally{writeFileSync(join(root,ownerPath),owner);}subject.assertCurrent();
 let getters=0;const getter=structuredClone(historical);Object.defineProperty(getter,'line',{get(){getters++;return 'main';},enumerable:true});assert.throws(()=>subject.qualifySassScope(getter));assert.equal(getters,0);checks.push('scope accessor rejected without invocation');
 console.log(JSON.stringify({result:'pass',checks,checks_passed:checks.length,input_scope_preserved:true,getters}));
}finally{rmSync(root,{recursive:true,force:true});}

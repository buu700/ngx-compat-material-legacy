/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 */
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,copyFileSync,symlinkSync,unlinkSync,lstatSync} from 'node:fs';import {join,dirname}from'node:path';import {tmpdir}from'node:os';import {execFileSync}from'node:child_process';import {gunzipSync}from'node:zlib';
import {authoredUseReviewEvidence}from'../scripts/authored-use-inventory.mjs';import {validateCdkPositionMainReview}from'../scripts/authored-cdk-position-main-review-validator.mjs';import {composeCdkPositionMainReview}from'../scripts/apply-authored-cdk-position-main-review.mjs';
const root=process.cwd(),read=p=>readFileSync(join(root,p)),sha=b=>createHash('sha256').update(b).digest('hex'),rp='compatibility/f10/authored-use-reviews/cdk-position-type-main-38ee-v1.json',report=JSON.parse(read(rp)),key=x=>JSON.stringify([x.file,x.module,x.symbol]),selected=new Set(report.reviews.map(key)),ledger=JSON.parse(read('compatibility/f10/authored-dependency-dispositions.json')),rows=ledger.symbol_uses.filter(r=>selected.has(key(r)));
assert.deepEqual(validateCdkPositionMainReview({root,read}),{line:'main',rows:7,source_files:4,unreviewed:44,g11_claim:'not-passed'});assert.equal(authoredUseReviewEvidence({symbol_uses:rows},'main',read,sha).reviewed,7);assert.equal(authoredUseReviewEvidence({symbol_uses:rows},'21.x',read,sha).insufficient,7);
for(const p of [rp,report.reviews[0].previous_source_review.path,'projects/ngx-material-legacy/'+report.reviews[0].file,report.reviews[0].source_transition.before.path,report.reviews[0].source_transition.diff.path,'pnpm-lock.yaml','node_modules/@angular/cdk/types/overlay.d.ts']){const bad=q=>q===p?Buffer.concat([read(q),Buffer.from('mutation')]):read(q);assert.throws(()=>validateCdkPositionMainReview({root,read:bad}),undefined,'failed to reject '+p)}
const original=JSON.parse(execFileSync('git',['show','38ee8359c688c039c6ae1db858f11282241d53ff:compatibility/f10/authored-dependency-dispositions.json'],{cwd:root,maxBuffer:16*1024*1024})),actual=process.env.CDK_POSITION_COMPOSE_LEDGER?JSON.parse(readFileSync(process.env.CDK_POSITION_COMPOSE_LEDGER)):ledger,applied=composeCdkPositionMainReview({root,ledger:actual,read});assert.deepEqual(Object.keys(applied),Object.keys(actual));for(const k of Object.keys(actual))if(k!=='symbol_uses')assert.deepEqual(applied[k],actual[k]);assert.deepEqual(applied.symbol_uses.map(key),actual.symbol_uses.map(key));for(let i=0;i<applied.symbol_uses.length;i++){const a=applied.symbol_uses[i],b=actual.symbol_uses[i];if(!selected.has(key(a)))assert.deepEqual(a,b);else{const r=report.reviews.find(x=>key(x)===key(a)),old=original.symbol_uses.find(x=>key(x)===key(a));assert.deepEqual(r.preserved_prior_row,old);const expected=structuredClone(b);expected.source_review=a.source_review;assert.deepEqual(a,expected)}}assert.deepEqual(composeCdkPositionMainReview({root,ledger:applied,read}),applied);
for(const input of [original,actual,applied]){const bad=structuredClone(input);bad.symbol_uses.find(r=>selected.has(key(r))).disposition='open';assert.throws(()=>composeCdkPositionMainReview({root,ledger:bad,read}),/selected row changed/)}
// Exercise real disk mutation only in a disposable fixture, never this checkout.
const used=new Set(),traced=p=>{used.add(p);return read(p)};validateCdkPositionMainReview({root,read:traced});
const dir='compatibility/rc/authored-cdk-position-main-38ee-v1/',manifest=JSON.parse(read(dir+'transitions.json')),identity=JSON.parse(read(dir+'installed-peer-identity.json')),recorded=JSON.parse(gunzipSync(read(dir+'producer/current.json.gz')));
used.add('compatibility/f10/authored-dependency-inventory-seed.json');used.add('scripts/position-type-use-review.mjs');used.add(rp);used.add(dir+'selection.json');used.add(dir+'transitions.json');used.add(dir+'installed-peer-identity.json');
for(const r of report.reviews)for(const e of r.independent_evidence)used.add(e.path);
for(const m of Object.values(manifest.source_files)){used.add(m.path);used.add(m.before.path);used.add(m.diff.path)}
for(const m of [manifest.lock]){used.add(m.path);used.add(m.before.path);used.add(m.diff.path)}
for(const m of identity.members)used.add(m.path);for(const cap of recorded.sources)used.add(cap.path);
for(const model of recorded.models){for(const k of ['package_manifest','entry','source'])used.add(model[k].path);if(model.line==='original'||model.line==='main')used.add(model.lock_path)}
const temp=mkdtempSync(join(tmpdir(),'cdk-position-physical-'));try{
 // A local no-checkout shared clone provides a private normal .git directory
 // for both ordinary source clones and linked worktrees. Only objects are read
 // through the source repository; mutation controls touch this private tree.
 const gitEnv=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_')));
 Object.assign(gitEnv,{GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'});
 execFileSync('git',['clone','--quiet','--shared','--no-checkout','--',root,temp],{env:gitEnv});
 assert.ok(lstatSync(join(temp,'.git')).isDirectory(),'fixture must exercise a normal Git directory');
 for(const p of used){const dst=join(temp,p);mkdirSync(dirname(dst),{recursive:true});writeFileSync(dst,read(p))}
 const tr=p=>readFileSync(join(temp,p));assert.equal(validateCdkPositionMainReview({root:temp,read:tr}).rows,7);
 const subjects=[Object.values(manifest.source_files)[0].path,'pnpm-lock.yaml','node_modules/@angular/cdk/types/overlay.d.ts'];
 for(const target of subjects){const path=join(temp,target),good=tr(target);writeFileSync(path,Buffer.concat([good,Buffer.from('cold mutation')]));
  let callbacks=0;assert.throws(()=>validateCdkPositionMainReview({root:temp,read:p=>{callbacks++;return p===target?good:tr(p)}}));assert.equal(callbacks,0,'cold defect escaped pre-callback capture');writeFileSync(path,good);
  let once=false;assert.throws(()=>validateCdkPositionMainReview({root:temp,read:p=>{if(!once&&p===dir+'producer/old.json.gz'){once=true;writeFileSync(path,Buffer.concat([good,Buffer.from('late mutation')]))}return p===target?good:tr(p)}}));assert.ok(once,'late mutation did not execute');writeFileSync(path,good);
 }
 // Even a symlink to identical good bytes is not a physical source member.
 for(const target of [subjects[0],subjects[2]]){const path=join(temp,target),good=tr(target),backup=join(temp,'identical-target');writeFileSync(backup,good);unlinkSync(path);symlinkSync(backup,path);assert.throws(()=>validateCdkPositionMainReview({root:temp,read:p=>p===target?good:tr(p)}),/symlink in evidence member/);unlinkSync(path);writeFileSync(path,good);unlinkSync(backup);}
 // A source mutation in the composer's final physical transaction is rejected.
 {const target=subjects[0],path=join(temp,target),good=tr(target);let selections=0,mutated=false;
  assert.throws(()=>composeCdkPositionMainReview({root:temp,ledger:original,read:p=>{if(p===dir+'selection.json'&&++selections===2){mutated=true;writeFileSync(path,Buffer.concat([good,Buffer.from('composer late')]))}return p===target?good:tr(p)}}));assert.ok(mutated);writeFileSync(path,good);}
 let nested=false;assert.throws(()=>validateCdkPositionMainReview({root:temp,read:p=>{if(!nested){nested=true;try{validateCdkPositionMainReview({root:temp,read:tr})}catch{}}return tr(p)}}),/reentrant physical source review/);assert.ok(nested);
}finally{rmSync(temp,{recursive:true,force:true})}
console.log(JSON.stringify({rows:7,other_rows_preserved:1729,holds:44,wrong_line_rejected:true,source_mutations_rejected:7,cold_physical_mutations_rejected:3,late_physical_mutations_rejected:3,symlink_mutations_rejected:2,composer_late_mutation_rejected:true,reentry_rejected:true,composable:true,g11_claim:'not-passed'}));

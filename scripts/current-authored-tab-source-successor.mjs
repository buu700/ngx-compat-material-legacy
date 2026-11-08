/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Authenticate the reviewed tab-only authored-source epoch; no audit credit. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';
const SELF='scripts/current-authored-tab-source-successor.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const path='compatibility/f10/authored-dependency-current-dispositions.json';
const BEFORE=Object.freeze({path,sha256:'460262e16c118c495e37b56c5218f0c2eadfd7bad0a71cf62fddccba05b130f4',bytes:718774});
const AFTER=Object.freeze({path,sha256:'dede4ab944da8fee8881644e27c0b2224c70e4120246c54e99976c48084ab2a5',bytes:720149});
const support=[
 {path:'compatibility/rc/parent-main-tab-label-source-context-v1.json',sha256:'a2810e63d5761d88639e2cbbd42ad3356a104d18c1a4493bee47cd3ccae72431',bytes:4191},
 {path:'compatibility/rc/tab-owned-label-field-context-proof-v1.json',sha256:'a22145ce4008bd7efc79e1651e95d547877d16753fe7ecd352ef1595fb8d0de0',bytes:16382},
 {path:'compatibility/f10/authored-use-reviews/tab-owned-label-field-context-v1.json',sha256:'77f1d0aca087662c5ffc135fb636a15a74cef549e0ba800da507fae511acca52',bytes:117149},
 {path:'projects/ngx-material-legacy/legacy-tabs/tab-label.ts',sha256:'db06eed7f8ceb42cecfcd9242d44a9cff315a59285c262cbdc2e101a339969ad',bytes:1514},
 {path:'projects/ngx-material-legacy/legacy-tabs/internal/tab-base.ts',sha256:'880575b7a0c3a6b30bfb363c68e3a574fcb585e11e4b10d362eeea5731785639',bytes:4870},
];
export function currentAuthoredTabSourceSuccessor({root,read=p=>readEvidenceMember(root,p)}){
 const physical=p=>readEvidenceMember(root,p),check=(bytes,ref)=>{assert.equal(hash(bytes),ref.sha256,ref.path);assert.equal(bytes.length,ref.bytes,ref.path);};
 assert.ok(JSON.parse(physical('projects/ngx-material-legacy/package.json')).version.startsWith('22.'));
 assert.ok(physical(SELF).equals(image));
 const env={PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=args=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,maxBuffer:2*1024*1024});
 const parent='0feac873886782da408d5894bbf1bb26862ec45c',commit='a796c018da3023e916b37088917f6adca56fbc9d';
 assert.equal(git(['rev-list','--parents','-n','1',commit]).toString().trim(),commit+' '+parent);git(['merge-base','--is-ancestor',commit,'HEAD']);
 const old=git(['show',parent+':'+path]),next=git(['show',commit+':'+path]);check(old,BEFORE);check(next,AFTER);assert.ok(physical(path).equals(next));
 const a=JSON.parse(old),b=JSON.parse(next),changed=[];assert.equal(a.symbol_uses.length,336);assert.equal(b.symbol_uses.length,336);
 for(let i=0;i<336;i++){
  const x=a.symbol_uses[i],y=b.symbol_uses[i];assert.deepEqual([x.file,x.module,x.symbol],[y.file,y.module,y.symbol]);
  if(JSON.stringify(x)!==JSON.stringify(y)){
   changed.push([x.file,x.module,x.symbol]);const normalized=structuredClone(y);normalized.source_review=x.source_review;
   if(x.file==='legacy-tabs/tab-label.ts')normalized.candidate_source_sha256=x.candidate_source_sha256;
   assert.deepEqual(normalized,x);
  }
 }
 assert.deepEqual(changed,[...['Injector','ProviderToken','runInInjectionContext'].map(symbol=>['legacy-tabs/internal/public-constructor-context.ts','@angular/core',symbol]),...['Inject','Optional','TemplateRef','ViewContainerRef'].map(symbol=>['legacy-tabs/tab-label.ts','@angular/core',symbol])]);
 const normalized=structuredClone(b);normalized.symbol_uses=a.symbol_uses;normalized.current_source_population_sha256=a.current_source_population_sha256;normalized.source_snapshot_history=a.source_snapshot_history;assert.deepEqual(normalized,a);
 const typeParent='d809eb8ab440a0fc0a7b8fe65423016255cbed0e',typeCommit='f569667b366b23b36280c5c2a10e9f87351472bd';
 assert.equal(git(['rev-list','--parents','-n','1',typeCommit]).toString().trim(),typeCommit+' '+typeParent);git(['merge-base','--is-ancestor',typeCommit,parent]);
 const edits=[
  ['projects/ngx-material-legacy/legacy-tabs/tab-label.ts','5ff08854377bb33070d69ee6fb4f7a346d37bebf4aefb6f0fd7a48f6a98621ff',support[3].sha256,']);\n    label._closestTab',']) as MatLegacyTabLabel;\n    label._closestTab'],
  ['projects/ngx-material-legacy/legacy-tabs/internal/tab-base.ts','c2c5c4a69762261f8e8241e1325f381d6ad2c431a2734d354c85c84244d3291a',support[4].sha256,'value && value._closestTab === this','value && (value as MatTabLabel & {_closestTab?: unknown})._closestTab === this'],
 ];
 for(const [file,beforeSha,afterSha,beforeText,afterText]of edits){const before=git(['show',typeParent+':'+file]),after=git(['show',typeCommit+':'+file]);assert.equal(hash(before),beforeSha);assert.equal(hash(after),afterSha);const text=before.toString();assert.equal(text.split(beforeText).length,2);assert.ok(Buffer.from(text.replace(beforeText,afterText)).equals(after));assert.ok(physical(file).equals(after));}
 const bound=[{path:SELF,sha256:hash(image),bytes:image.length},{...AFTER},...support.map(ref=>({...ref}))];
 const assertCurrent=()=>{assert.ok(physical(SELF).equals(image));for(const ref of bound){const before=physical(ref.path),supplied=read(ref.path);check(before,ref);assert.ok(Buffer.isBuffer(supplied)&&before.equals(supplied),'nonphysical current authored tab source '+ref.path);assert.ok(before.equals(physical(ref.path)));}assert.ok(physical(SELF).equals(image));};
 const qualify=ref=>{
  assert.ok(ref&&typeof ref==='object'&&!types.isProxy(ref)&&Object.getPrototypeOf(ref)===Object.prototype);
  const fields=Object.getOwnPropertyDescriptors(ref),keys=Reflect.ownKeys(fields);assert.ok(keys.every(k=>typeof k==='string'));assert.deepEqual(keys.sort(),Object.hasOwn(fields,'bytes')?['bytes','path','sha256']:['path','sha256']);for(const field of Object.values(fields))assert.ok(Object.hasOwn(field,'value')&&field.enumerable);
  if(fields.path.value!==path)return null;const prior=[BEFORE,AFTER].find(r=>r.sha256===fields.sha256.value);assert.ok(prior,'unknown authored tab source identity');if(fields.bytes)assert.equal(fields.bytes.value,prior.bytes);assertCurrent();return {path,sha256:AFTER.sha256,...(fields.bytes?{bytes:AFTER.bytes}:{})};
 };
 assertCurrent();return {before:{...BEFORE},after:{...AFTER},bound:structuredClone(bound),assertCurrent,qualify,historical_bytes_exposed:false,audit_credit:false};
}

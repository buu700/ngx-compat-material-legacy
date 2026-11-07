/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Main-only exact Git-anchored successor to the immutable aggregate snapshot. */
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync,lstatSync,realpathSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,chmodSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const sha=b=>createHash('sha256').update(b).digest('hex');
const oldManifest='3908ab44ef318fdebb2638edadc9670e71e415787cd731269a2514042785e7d8',newManifest='617fc6b5ac0c5f95c6c4e2fc96720a0777b060e2deaceb1ae3b10e76f8de2cb5';
const oldEngine='356337aa30fed58fcc25afeaabca5ebb3695623c0f17a0aff497a3bd92b4a383',newEngine='982357bc4b61f22d6d2ac5b8d168899e1c8dfd1851c90e85ce14f57d8a28eaa0';
const before='42d02491648097656ccb3c590dbaaea066c3e603',after='8baa761eca624c9d71293c3d31750a2b3fdeebf0';
const transitions=Object.freeze({
 'projects/ngx-material-legacy/styles/bridges/_companion-overrides.scss':['fe42eacb9b974bd546b8ae7cb192bce3021fcc4c0a3828e3a765c745988cf161',35593,'3bd939280b1d80fd10f6c0ece8c434cfe2f0f369746cca7b2b3e9f8c153755ee',35009],
 'projects/ngx-material-legacy/styles/core/focus-indicators/_focus-indicators.scss':['c4ec1054f22f17faf475253a301e58e16e2630a263cebd92dc00ee660d80073f',177,'e2ad7e073a9dd1954dc85a5816cc5f9c05644b9d441abc1359847b31b30f7f73',412],
 'scripts/sass-stepper-historical-model.mjs':['9c56ad58a08cf5b4af3b9fa86aa4282368e529edb630433e54bb57ec2b438996',1433,'7f6e226c325440e939ae419d0fa122c4c79c14271adbea2c3fcc0c4e5df1e448',1547],
});
const safe=p=>{if(typeof p!=='string'||!p||p.startsWith('/')||p.includes('\\')||p.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('invalid path');return p;};
function regular(base,path){let p=base;for(const part of safe(path).split('/')){p=join(p,part);if(lstatSync(p).isSymbolicLink())throw Error('linked input');}if(!lstatSync(p).isFile())throw Error('nonregular input');return readFileSync(p);}
function physical(root,path){let base=root,tail=path;if(path.startsWith('node_modules/')){const m=/^node_modules\/(sass|immutable|@angular\/(?:material|cdk))\/(.+)$/.exec(path);if(!m)throw Error('unapproved package');const sass=realpathSync(join(root,'node_modules/sass'));base=m[1]==='immutable'?dirname(createRequire(join(sass,'sass.node.js')).resolve('immutable/package.json')):realpathSync(join(root,'node_modules',m[1]));tail=m[2];}return regular(base,tail);}
function git(root,rev,path){return execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',rev+':'+path],{cwd:root,env:{PATH:process.env.PATH,LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_LAZY_FETCH:'1'}});}
function capture(root){
 const manifest=regular(root,'fixtures/sass/expected-isolation-inputs.json'),engine=regular(root,'scripts/sass-expected-snapshot-engine.mjs');if(sha(manifest)!==oldManifest||sha(engine)!==oldEngine)throw Error('immutable source changed');
 const data=JSON.parse(manifest),projected=structuredClone(data),seen=new Set(),images=[];if(data.schema_version!==1||data.line!=='main'||!Array.isArray(data.files)||!data.files.length)throw Error('manifest scope');
 for(const row of data.files){const path=safe(row.path);if(seen.has(path)||Object.keys(row).sort().join('|')!=='bytes|path|sha256')throw Error('manifest row');seen.add(path);let expected=row;
  if(Object.hasOwn(transitions,path)){const [a,al,b,bl]=transitions[path],pre=git(root,before,path),post=git(root,after,path);if(row.sha256!==a||row.bytes!==al||sha(pre)!==a||pre.length!==al||sha(post)!==b||post.length!==bl)throw Error('Git transition');expected={path,sha256:b,bytes:bl};Object.assign(projected.files.find(x=>x.path===path),expected);}
  const bytes=physical(root,path);if(bytes.length!==expected.bytes||sha(bytes)!==expected.sha256)throw Error('closure input changed '+path);images.push([path,bytes]);
 }
 if(Object.keys(transitions).some(x=>!seen.has(x)))throw Error('missing transition');
 const next=Buffer.from(JSON.stringify(projected,null,2)+'\n'),derived=engine.toString().replace(oldManifest,newManifest);if(sha(next)!==newManifest||sha(derived)!==newEngine)throw Error('projected snapshot mismatch');
 return {manifest,engine,next,derived,images};
}
export function aggregateExpectedSuccessor(root,line,peers){
 if(line!=='main')throw Error('successor is main only');root=realpathSync(root);const first=capture(root),tmp=mkdtempSync(join(tmpdir(),'ngx-aggregate-successor-'));chmodSync(tmp,0o700);
 try{
  for(const [path,bytes] of first.images){const out=join(tmp,path);mkdirSync(dirname(out),{recursive:true,mode:0o700});writeFileSync(out,bytes,{flag:'wx',mode:0o400});}
  const manifest=join(tmp,'fixtures/sass/expected-isolation-inputs.json');mkdirSync(dirname(manifest),{recursive:true,mode:0o700});writeFileSync(manifest,first.next,{flag:'wx',mode:0o400});
  const input=JSON.stringify({peers}),result=spawnSync(process.execPath,['--input-type=module','--eval',first.derived,tmp,'main','ordered-aggregate-06'],{cwd:tmp,env:{LANG:'C.UTF-8',LC_ALL:'C.UTF-8',TZ:'UTC'},input,encoding:'utf8',timeout:150000,maxBuffer:20*1024*1024});
  if(result.error||result.status!==0||result.signal)throw Error('successor expected computation failed: '+String(result.stderr).slice(0,1500));
  const out=JSON.parse(result.stdout);if(out.schema_version!==1||out.line!=='main'||out.operation!=='ordered-aggregate-06'||out.request_sha256!==sha(input)||out.closure_sha256!==newManifest||typeof out.css!=='string'||out.css_sha256!==sha(out.css)||out.css_bytes!==Buffer.byteLength(out.css))throw Error('successor output mismatch');
  const second=capture(root);if(!first.manifest.equals(second.manifest)||!first.engine.equals(second.engine)||first.images.length!==second.images.length||first.images.some(([p,b],i)=>p!==second.images[i][0]||!b.equals(second.images[i][1])))throw Error('source changed during computation');
  return out;
 }finally{rmSync(tmp,{recursive:true,force:true});}
}
export function aggregateProjectedSources(root){const c=capture(realpathSync(root));const p=JSON.parse(c.next),prefixes=['projects/ngx-material-legacy/','node_modules/@angular/material/','node_modules/@angular/cdk/'];return p.files.flatMap(row=>prefixes.flatMap((prefix,i)=>row.path.startsWith(prefix)&&row.path.endsWith('.scss')?[{root:i,path:row.path.slice(prefix.length),sha256:row.sha256,bytes:row.bytes}]:[])).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path));}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Trusted builtin-only bootstrap, passed to --eval as verified bytes. */
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,realpathSync,mkdtempSync,mkdirSync,writeFileSync,chmodSync,rmSync} from 'node:fs';
import {join,dirname,resolve,relative,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
const pins={'21.x':{'private-card':'2452ab4c806fb61e53602bc3b15427ae8b03a69dba58f6bd7bfbe7598c04dda3','ordered-aggregate-06':'740dd34662b39dfbdebdb3ca6ac162cfb92b87f3da4f349d4b75f0ebce84f7fb'},main:{'private-card':'518508f0c6fe3b9e477be1b87bed1607bda6d7433696a8ed4c0dd7932d2867d6','ordered-aggregate-06':'3908ab44ef318fdebb2638edadc9670e71e415787cd731269a2514042785e7d8'}};
const sha=b=>createHash('sha256').update(b).digest('hex');
const [rootArg,line,operation]=process.argv.slice(1),root=realpathSync(rootArg);
if(process.version!=='v24.21.0'||!Object.hasOwn(pins,line)||!Object.hasOwn(pins[line],operation))throw Error('execution identity');
const safePath=p=>{if(typeof p!=='string'||!p||p.startsWith('/')||p.includes('\\')||p.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('invalid closure path');return p;};
function readInput(row){
 const logical=safePath(row.path);let base=root,tail=logical;
 if(logical.startsWith('node_modules/')){
  const m=/^node_modules\/(sass|immutable|@angular\/(?:material|cdk))\/(.+)$/.exec(logical);if(!m)throw Error('unapproved package');
  base=m[1]==='immutable'?dirname(createRequire(join(realpathSync(join(root,'node_modules/sass')),'sass.node.js')).resolve('immutable/package.json')):realpathSync(join(root,'node_modules',m[1]));tail=m[2];
 }
 let path=base;for(const part of safePath(tail).split('/')){path=join(path,part);if(lstatSync(path).isSymbolicLink())throw Error('linked closure file');}
 if(!lstatSync(path).isFile())throw Error('nonregular closure file');const b=readFileSync(path);
 if(b.length!==row.bytes||sha(b)!==row.sha256)throw Error('changed closure input '+logical);return b;
}
const manifestPath=operation==='private-card'?'fixtures/sass/private-card-expected-isolation-inputs.json':'fixtures/sass/expected-isolation-inputs.json',manifestRaw=readInput({path:manifestPath,bytes:readFileSync(join(root,manifestPath)).length,sha256:pins[line][operation]});
const manifest=JSON.parse(manifestRaw);
if(Object.keys(manifest).sort().join('|')!=='entries|files|line|schema_version'||manifest.schema_version!==1||manifest.line!==line||!Object.hasOwn(manifest.entries,operation)||!Array.isArray(manifest.files)||manifest.files.length<1)throw Error('closure manifest');
const names=new Set(),images=[];
for(const row of manifest.files){if(Object.keys(row).sort().join('|')!=='bytes|path|sha256'||!Number.isSafeInteger(row.bytes)||row.bytes<1||!/^[a-f0-9]{64}$/.test(row.sha256)||names.has(row.path))throw Error('closure row');names.add(safePath(row.path));images.push([row,readInput(row)]);}
const entry=safePath(manifest.entries[operation]);if(!names.has(entry))throw Error('missing entry');
const inputRaw=readFileSync(0,'utf8');if(Buffer.byteLength(inputRaw)>16*1024*1024)throw Error('request too large');const payload=JSON.parse(inputRaw),request_sha256=sha(JSON.stringify(payload));
const request={line,operation,payload,request_sha256,closure_sha256:sha(manifestRaw)};
const snapshot=mkdtempSync(join(tmpdir(),'ngx-sass-expected-'));chmodSync(snapshot,0o700);
try{
 for(const [row,b] of images){const dest=join(snapshot,row.path);mkdirSync(dirname(dest),{recursive:true,mode:0o700});writeFileSync(dest,b,{flag:'wx',mode:0o400});}
 const env={LANG:'C.UTF-8',LC_ALL:'C.UTF-8',TZ:'UTC',HOME:snapshot,TMPDIR:snapshot};
 const result=spawnSync(process.execPath,['--permission','--allow-fs-read='+snapshot,join(snapshot,entry)],{cwd:snapshot,env,input:JSON.stringify(request),encoding:'utf8',timeout:120000,maxBuffer:20*1024*1024});
 if(result.error||result.status!==0||result.signal)throw Error('isolated computation failed: '+String(result.stderr).slice(0,3000));
 const out=JSON.parse(result.stdout);if(Object.keys(out).sort().join('|')!=='closure_sha256|css|css_bytes|css_sha256|line|operation|request_sha256|schema_version'||out.schema_version!==1||out.line!==line||out.operation!==operation||out.request_sha256!==request_sha256||out.closure_sha256!==sha(manifestRaw)||typeof out.css!=='string'||!out.css||out.css_sha256!==sha(out.css)||out.css_bytes!==Buffer.byteLength(out.css))throw Error('isolated output identity');
 // Current physical state remains mandatory, independently of the snapshot result.
 for(const [row] of images)readInput(row);if(!readFileSync(join(root,manifestPath)).equals(manifestRaw))throw Error('manifest changed during evaluation');
 process.stdout.write(JSON.stringify(out));
}finally{rmSync(snapshot,{recursive:true,force:true});}

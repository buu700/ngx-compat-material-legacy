/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual,types} from 'node:util';
import {spawnSync,execFileSync} from 'node:child_process';
import {createOrdinaryDensityGateContext} from './sass-ordinary-density-gate.mjs';
import {createCurrentSpinnerSnackContract} from './current-sass-spinner-snack-contract.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url))),self=readFileSync(new URL(import.meta.url)), hashes={'21.x':'1a3ad05466e55fe0b5779a9d38956871b2759a1e1d1c34e4f42e8dfb30234b42',main:'f746c5da35afa3a4cfe124026bd908768402c9b668fe4ec3def38fee922250d6'},sha=b=>createHash('sha256').update(b).digest('hex');
function successors(line,manifest){
 if(line!=='main')return new Map();const path=join(root,'fixtures/sass/ordered-aggregate-source-successor.json');for(const p of [join(root,'fixtures'),join(root,'fixtures/sass'),path])if(lstatSync(p).isSymbolicLink())throw Error('linked successor packet');const raw=readFileSync(path);if(sha(raw)!=='a0be2676905a677fab5e470880226449ea425de226c7312fb64f0f9fe6827fbd'||raw.length!==2268)throw Error('successor packet changed');
 const packet=JSON.parse(raw),names=['scripts/sass-ordered-aggregate-contract.mjs','scripts/sass_ordered_aggregate_admission.py','scripts/sass-ordinary-density-gate.mjs','scripts/sass_ordinary_density_gate.py'];if(packet.schema_version!==1||packet.role!=='main-ordered-aggregate-exact-source-successor'||packet.source_parent!=='42d02491648097656ccb3c590dbaaea066c3e603'||packet.base_commit!=='8baa761eca624c9d71293c3d31750a2b3fdeebf0'||packet.scope_only!==true||!isDeepStrictEqual(packet.updates.map(x=>x.path),names))throw Error('successor scope');
 const env={PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_LAZY_FETCH:'1'},result=new Map();
 for(const row of packet.updates){const old=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.source_parent+':'+row.path],{cwd:root,env}),entry=manifest.files.find(x=>x.path===row.path);if(!isDeepStrictEqual(entry,row.before)||sha(old)!==row.before.sha256||old.length!==row.before.bytes||row.after.path!==row.path)throw Error('successor preimage');if(row.after_git){if(row.after_git!==packet.base_commit)throw Error('successor commit');const now=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',row.after_git+':'+row.path],{cwd:root,env});if(sha(now)!==row.after.sha256||now.length!==row.after.bytes)throw Error('successor afterimage');}result.set(row.path,row.after);}
 const vpath=join(root,'fixtures/sass/ordered-aggregate-density-source-successor.json');if(lstatSync(vpath).isSymbolicLink())throw Error('linked density successor');const vraw=readFileSync(vpath);if(sha(vraw)!=='c2dcadcd39eb9e97cfb42d39043aa43b68ba8ef440f6621e23cf9a7a94fe09f6'||vraw.length!==22536)throw Error('density successor changed');const v=JSON.parse(vraw);if(v.schema_version!==1||v.role!=='main-ordered-aggregate-current-density-source-successor'||v.line!=='main'||v.source_scope_only!==true||!isDeepStrictEqual(v.previous_packet,{path:'fixtures/sass/ordered-aggregate-source-successor.json',sha256:sha(raw),bytes:raw.length})||!isDeepStrictEqual(v.updates.map(r=>r.path),names.slice(2)))throw Error('density successor scope');for(const row of v.updates){if(!isDeepStrictEqual(result.get(row.path),row.before))throw Error('density successor predecessor');const before=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',packet.base_commit+':'+row.path],{cwd:root,env});if(sha(before)!==row.before.sha256||before.length!==row.before.bytes)throw Error('density predecessor changed');let at=0,parts=[];for(const e of row.edits){if(!isDeepStrictEqual(Object.keys(e).sort(),['after','before','offset'])||!Number.isSafeInteger(e.offset)||e.offset<at)throw Error('density edit');const old=Buffer.from(e.before);if(!before.subarray(e.offset,e.offset+old.length).equals(old))throw Error('density literal');parts.push(before.subarray(at,e.offset),Buffer.from(e.after));at=e.offset+old.length;}const after=Buffer.concat([...parts,before.subarray(at)]);if(sha(after)!==row.after.sha256||after.length!==row.after.bytes)throw Error('density afterimage');result.set(row.path,row.after);}
 for(const p of [join(root,'scripts'),join(root,'scripts/sass-aggregate-source-successor.mjs')])if(lstatSync(p).isSymbolicLink())throw Error('linked successor helper');if(sha(readFileSync(join(root,'scripts/sass-aggregate-source-successor.mjs')))!=='7a8d81b439bf0c3677e8be8fbfc710c68b449fdee717c38dba9cf67905f99c0c')throw Error('successor helper changed');return result;
}
function check(line){if(!readFileSync(new URL(import.meta.url)).equals(self))throw Error('guard changed');const raw=readFileSync(join(root,'fixtures/sass/ordered-button-proof-inputs.json'));if(sha(raw)!==hashes[line])throw Error('manifest changed');const m=JSON.parse(raw);if(m.schema_version!==1||!Array.isArray(m.files)||new Set(m.files.map(x=>x.path)).size!==m.files.length)throw Error('manifest invalid');const updates=successors(line,m);for(const original of m.files){const e=updates.get(original.path)||original;let p=root;for(const part of e.path.split('/')){if(!part||part==='.'||part==='..')throw Error('invalid path');p=join(p,part);if(lstatSync(p).isSymbolicLink())throw Error('linked input')}const b=readFileSync(p);if(b.length!==e.bytes||sha(b)!==e.sha256)throw Error('input changed');}}
const expectedSha=b=>createHash('sha256').update(b).digest('hex'),expectedEngineHash='356337aa30fed58fcc25afeaabca5ebb3695623c0f17a0aff497a3bd92b4a383';
function expectedPlain(v){
 if(v===null||['string','boolean'].includes(typeof v))return v;
 if(typeof v==='number'){if(!Number.isSafeInteger(v))throw Error('number');return v;}
 if(!v||typeof v!=='object'||types.isProxy(v))throw Error('plain expected input');
 const a=Array.isArray(v);if(Object.getPrototypeOf(v)!==(a?Array.prototype:Object.prototype))throw Error('prototype');
 const out=a?[]:{},ds=Object.getOwnPropertyDescriptors(v);
 for(const k of Reflect.ownKeys(ds)){if(typeof k!=='string')throw Error('symbol');if(a&&k==='length')continue;const d=ds[k];if(!Object.hasOwn(d,'value')||!d.enumerable||(a&&!/^(?:0|[1-9][0-9]*)$/.test(k)))throw Error('descriptor');Object.defineProperty(out,k,{value:expectedPlain(d.value),enumerable:true,writable:true,configurable:true});}
 if(a&&out.length!==ds.length.value)throw Error('sparse array');return out;
}
function isolatedExpectedComputation(root,line,operation,input){
 if(line==='main'&&operation==='ordered-aggregate-06'){const path=join(root,'scripts/sass-aggregate-source-successor.mjs'),raw=readFileSync(path),digest='7a8d81b439bf0c3677e8be8fbfc710c68b449fdee717c38dba9cf67905f99c0c';if(expectedSha(raw)!==digest)throw Error('successor helper');const suffix="\nconst __root=process.argv[1],__input=JSON.parse(readFileSync(0,'utf8'));process.stdout.write(JSON.stringify(aggregateExpectedSuccessor(__root,'main',__input.peers)));";const result=spawnSync(process.execPath,['--input-type=module','--eval',raw.toString('utf8')+suffix,root],{cwd:root,env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8',LC_ALL:'C.UTF-8',TZ:'UTC'},input:JSON.stringify(expectedPlain(input)),encoding:'utf8',timeout:150000,maxBuffer:20*1024*1024});if(result.error||result.status!==0||result.signal||expectedSha(readFileSync(path))!==digest)throw Error('successor expected failed');return expectedPlain(JSON.parse(result.stdout));}

 const payload=expectedPlain(input),raw=readFileSync(join(root,'scripts/sass-expected-snapshot-engine.mjs'));
 if(expectedSha(raw)!==expectedEngineHash)throw Error('trusted expected bootstrap changed');
 const env={LANG:'C.UTF-8',LC_ALL:'C.UTF-8',TZ:'UTC'};
 const result=spawnSync(process.execPath,['--input-type=module','--eval',raw.toString('utf8'),root,line,operation],{cwd:root,env,input:JSON.stringify(payload),encoding:'utf8',timeout:150000,maxBuffer:20*1024*1024});
 if(result.error||result.status!==0||result.signal)throw Error('expected isolation failed: '+String(result.stderr).slice(0,1000));
 const out=expectedPlain(JSON.parse(result.stdout));
 if(out.line!==line||out.operation!==operation||out.request_sha256!==expectedSha(JSON.stringify(payload))||out.schema_version!==1||typeof out.css!=='string'||out.css_sha256!==expectedSha(out.css)||out.css_bytes!==Buffer.byteLength(out.css)||!isDeepStrictEqual(payload,expectedPlain(input)))throw Error('expected output identity');
 if(expectedSha(readFileSync(join(root,'scripts/sass-expected-snapshot-engine.mjs')))!==expectedEngineHash)throw Error('bootstrap changed during evaluation');
 return out;
}

export function orderedButtonSourceGuard(line,sources,peers,actualCss){try{check(line);const d=createOrdinaryDensityGateContext({root}),s=createCurrentSpinnerSnackContract({root}),sets=Object.values(s.source_sets);if(s.line!==line||sets.length!==1||!isDeepStrictEqual(sources,sets[0]))return false;d.assertCurrent();s.assertCurrent();const input=expectedPlain({peers}),result=isolatedExpectedComputation(root,line,'ordered-aggregate-06',input).css===actualCss;d.assertCurrent();s.assertCurrent();check(line);return result}catch{return false}}

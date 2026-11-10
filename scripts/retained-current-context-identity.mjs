/**
 * @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT.
 */
/** Finite old/current source identities. This is preparation data, not admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync,readdirSync,readlinkSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {readEvidenceMember} from './upstream-packed-run-evidence.mjs';

const SELF='scripts/retained-current-context-identity.mjs',image=readFileSync(fileURLToPath(import.meta.url));
const PACKET={path:'compatibility/rc/main-retained-current-context-v1.json',sha256:'d47e05229546ccceec4e84d6cdffc5a430a2db2a0b019094b491878a8645af60',bytes:1351942};
const BASE='4e6f608402e99da9fb550bb46040aa68a648440a';
const SUCCESSOR='5064419bd6dd267bb26fe4562c36c40c3aa3bd5d';
const SUCCESSOR_TREE='11504a891db8b74b8f52bae92c085fbcde210888';
// Exact reviewed source transitions, authenticated against both Git bodies.
const DELTA=[
 {
  "path": "projects/ngx-material-legacy/legacy-form-field/form-field.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-form-field/form-field.ts",
   "sha256": "e6204762c0899cfc038d28c7eb3918d291766b3179b6a7bf0b4630f59c6cd657",
   "bytes": 28485,
   "blob_oid": "c7d43a56f73980f43e8345dba29a01639d7a59ab"
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-form-field/form-field.ts",
   "blob_oid": "aff83b932a55e778cfa1d74dccfb1810e1fbf764",
   "sha256": "e645f8b92ccb57518eb9fac6ab3a20c35db6bd9f19a301fcb659ffe58911cfb6",
   "bytes": 28628
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-form-field/hint.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-form-field/hint.ts",
   "sha256": "c129fc51d60d9a7f2c273da3c8ee195719df230c9c7a1925abf1dc969f581b05",
   "bytes": 1524,
   "blob_oid": "1bec7c45e6d0b26d54b87568f782662a8a16641c"
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-form-field/hint.ts",
   "blob_oid": "d3e8c84003946ac1052ade5ff5ecbaaafd1286ef",
   "sha256": "7685890918a25081de81d83f6a9c1396274c2b936e239f713c44bc67151fed49",
   "bytes": 1544
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-form-field/internal/hint-id.ts",
  "before": null,
  "after": {
   "path": "projects/ngx-material-legacy/legacy-form-field/internal/hint-id.ts",
   "blob_oid": "c86b8a9d280066c658925b8d9cfb5b4c5d07f8ab",
   "sha256": "160c30388347d5bf00f075de3423e969e6e4ce8f7fe32c7d4dafe4e17dcc4028",
   "bytes": 465
  }
 },
 {
  "path": "projects/ngx-material-legacy/legacy-table/table.spec.ts",
  "before": {
   "path": "projects/ngx-material-legacy/legacy-table/table.spec.ts",
   "sha256": "6987ae268b614e3d445852fe9eb99e05d1f7c6c5669505079ed142586ab47d1e",
   "bytes": 48314,
   "blob_oid": "9c18510f9a254a485d6eea195f7c3be14d224c41"
  },
  "after": {
   "path": "projects/ngx-material-legacy/legacy-table/table.spec.ts",
   "blob_oid": "3aa1756308737cf33f356ec7810a340116cf6d31",
   "sha256": "a6d1f377085d4a05c2283e80f123fe1068beeec8f720310f30d4f149403c1424",
   "bytes": 53676
  }
 },
 {
  "path": "scripts/run-legacy-tests.mjs",
  "before": {
   "path": "scripts/run-legacy-tests.mjs",
   "sha256": "b5e4072a685bddb7c738f0c3d9fe830ebf4ae06a499bf4a5783aab7354bd2fbc",
   "bytes": 4534,
   "blob_oid": "a02ebbd70abfae6e93e7eba047f1ab79192e35b6"
  },
  "after": {
   "path": "scripts/run-legacy-tests.mjs",
   "blob_oid": "6bb037f2f33520559df7b2efcd0fd567dc4f2edf",
   "sha256": "3885187cf0e3a8f25a86434e301377b704e87603a65acaf89cbd8a42affaa0dc",
   "bytes": 7090
  }
 },
 {
  "path": "testing/legacy-runner/karma.conf.cjs",
  "before": {
   "path": "testing/legacy-runner/karma.conf.cjs",
   "sha256": "7412ad8ed75d858a13d912720a47522c0b3a73f2165046b60c0bea94efe1b952",
   "bytes": 1723,
   "blob_oid": "68aa82aa83cfc3dc0ea498b4a98e63c20c75ab49"
  },
  "after": {
   "path": "testing/legacy-runner/karma.conf.cjs",
   "blob_oid": "934e45bb8645d53a09ac7e863d98ff4eda225e60",
   "sha256": "1a4789fe581af6903a6cdf719d9548632a885879c8b3929ed6a3f839d588c9e0",
   "bytes": 1910
  }
 }
];

// Exact optional workspace peer-link inventory; no dependency body is traversed.
const PEER_LINKS={
 "@angular/cdk": "../../../../node_modules/.pnpm/@angular+cdk@22.1.7_506c899cb52967ef73296071e7e2b29a/node_modules/@angular/cdk",
 "@angular/common": "../../../../node_modules/.pnpm/@angular+common@22.1.7_@angular+core@22.1.7_@angular+compiler@22.1.7_rxjs@7.8.2_zone.js@0.16.3__rxjs@7.8.2/node_modules/@angular/common",
 "@angular/core": "../../../../node_modules/.pnpm/@angular+core@22.1.7_@angular+compiler@22.1.7_rxjs@7.8.2_zone.js@0.16.3/node_modules/@angular/core",
 "@angular/forms": "../../../../node_modules/.pnpm/@angular+forms@22.1.7_@angular+common@22.1.7_@angular+core@22.1.7_@angular+compiler@22._e3e723341194c55038638507329095c3/node_modules/@angular/forms",
 "@angular/material": "../../../../node_modules/.pnpm/@angular+material@22.1.7_94bd345d55a01d565780699f5d2b5992/node_modules/@angular/material",
 "@angular/platform-browser": "../../../../node_modules/.pnpm/@angular+platform-browser@22.1.7_@angular+animations@22.1.7_@angular+core@22.1.7_@angul_7e5120d6c48c1da0983dd07357574519/node_modules/@angular/platform-browser",
 "rxjs": "../../../node_modules/.pnpm/rxjs@7.8.2/node_modules/rxjs",
 "tslib": "../../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib"
};
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const clean=ref=>({path:ref.path,sha256:ref.sha256,bytes:ref.bytes});
function safePath(path){assert.equal(typeof path,'string');assert.ok(!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));return path;}
function exact(raw,ref){assert.ok(Buffer.isBuffer(raw));assert.equal(sha(raw),ref.sha256,ref.path);assert.equal(raw.length,ref.bytes,ref.path);}
function descriptor(value){
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype);
 const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields);assert.ok(keys.every(key=>typeof key==='string'));
 assert.deepEqual(keys.sort(),Object.hasOwn(fields,'bytes')?['bytes','path','sha256']:['path','sha256']);for(const field of Object.values(fields))assert.ok(Object.hasOwn(field,'value')&&field.enumerable);
 const ref={path:safePath(fields.path.value),sha256:fields.sha256.value,...(fields.bytes?{bytes:fields.bytes.value}:{})};assert.match(ref.sha256,/^[a-f0-9]{64}$/);if(fields.bytes)assert.ok(Number.isSafeInteger(ref.bytes)&&ref.bytes>=0);return ref;
}

export function retainedCurrentContextIdentity({root=process.cwd(),read}={}){
 root=resolve(root);const assertRoot=()=>{for(let p=root;;p=dirname(p)){const st=lstatSync(p);assert.ok(st.isDirectory()&&!st.isSymbolicLink(),'symlink or non-directory root ancestor '+p);if(dirname(p)===p)break;}};assertRoot();read??=path=>readEvidenceMember(root,path);assert.equal(typeof read,'function');
 const physical=path=>readEvidenceMember(root,safePath(path));assert.ok(physical(SELF).equals(image));
 const packetBytes=physical(PACKET.path);exact(packetBytes,PACKET);const packet=JSON.parse(packetBytes);
 assert.equal(packet.schema_version,1);assert.equal(packet.role,'finite-main-retained-current-context-identity');assert.equal(packet.base_head,BASE);
 for(const [key,value]of Object.entries({source_scope_only:true,historical_reports_rewritten:false,historical_programs_executed:false,source_judgments_requalified:false,artifact_or_audit_admission_granted:false,g11_claim:'not-passed'}))assert.equal(packet[key],value,key);
 assert.equal(packet.current.commit,BASE);assert.equal(packet.before_contexts.length,3);assert.equal(packet.current.products.length,1120);assert.equal(packet.current.inputs.length,68);
 assert.deepEqual(packet.before_contexts.map(profile=>profile.report.path),['compatibility/rc/packed-upstream-source-build.json','compatibility/rc/packed-upstream-source-build-main-e184.json','compatibility/rc/packed-upstream-source-bazel.json']);
 assert.match(JSON.parse(physical('projects/ngx-material-legacy/package.json')).version,/^22\./);
 const env={PATH:process.env.PATH,LC_ALL:'C',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=(args,input)=>execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',...args],{cwd:root,env,input,maxBuffer:128*1024*1024});
 git(['merge-base','--is-ancestor',BASE,SUCCESSOR]);git(['merge-base','--is-ancestor',SUCCESSOR,'HEAD']);assert.equal(git(['rev-parse',BASE+'^{tree}']).toString().trim(),packet.current.tree);assert.equal(git(['rev-parse',SUCCESSOR+'^{tree}']).toString().trim(),SUCCESSOR_TREE);
 const bound=new Map(),identities=new Map(),current=new Map(),retired=new Set();
 const add=ref=>{safePath(ref.path);const normalized=clean(ref),prior=bound.get(ref.path);if(prior)assert.deepEqual(prior,normalized);else bound.set(ref.path,normalized);};
 const identity=ref=>{const normalized=clean(ref),rows=identities.get(ref.path)??new Map(),prior=rows.get(ref.sha256);if(prior)assert.deepEqual(prior,normalized);else rows.set(ref.sha256,normalized);identities.set(ref.path,rows);};
 const member=ref=>{const raw=physical(ref.path);exact(raw,ref);const supplied=read(ref.path);assert.ok(Buffer.isBuffer(supplied)&&raw.equals(supplied),'nonphysical retained context '+ref.path);assert.ok(raw.equals(physical(ref.path)),'retained context changed during callback '+ref.path);return raw;};
 add({path:SELF,sha256:sha(image),bytes:image.length});add(PACKET);
 // Git bodies below are authenticated as data only. No before-image program is
 // imported, evaluated, written into the checkout, or exposed as a current read.
 const verifyGit=(commit,refs,ancestorLimit=BASE)=>{
  assert.match(commit,/^[a-f0-9]{40}$/);git(['merge-base','--is-ancestor',commit,ancestorLimit]);
  const raw=git(['cat-file','--batch'],Buffer.from(refs.map(ref=>commit+':'+safePath(ref.path)+'\n').join('')));let offset=0;
  for(const ref of refs){const end=raw.indexOf(10,offset);assert.ok(end>=offset);const header=raw.subarray(offset,end).toString().split(' ');offset=end+1;assert.equal(header.length,3);assert.equal(header[0],ref.blob_oid);assert.equal(header[1],'blob');assert.match(header[2],/^\d+$/);const size=Number(header[2]);assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+size<raw.length);const body=raw.subarray(offset,offset+size);exact(body,ref);offset+=size;assert.equal(raw[offset++],10);}
  assert.equal(offset,raw.length);
 };
 const oldProducts=packet.current.products,oldInputs=packet.current.inputs;
 const oldProductPaths=oldProducts.map(ref=>ref.path);assert.deepEqual(oldProductPaths,[...new Set(oldProductPaths)].sort());assert.ok(oldProductPaths.every(path=>path.startsWith('projects/ngx-material-legacy/')));
 assert.deepEqual(git(['ls-tree','-r','--name-only',BASE,'--','projects/ngx-material-legacy']).toString().trim().split('\n'),oldProductPaths);
 verifyGit(BASE,[...oldProducts,...oldInputs]);
 const oldByPath=new Map([...oldProducts,...oldInputs].map(ref=>[ref.path,ref]));assert.equal(oldByPath.size,1188);
 const deltaByPath=new Map();for(const row of DELTA){assert.ok(!deltaByPath.has(row.path));assert.equal(row.after.path,row.path);const old=oldByPath.get(row.path);if(row.before){assert.deepEqual(old,row.before);}else assert.equal(old,undefined);deltaByPath.set(row.path,row);}
 assert.equal(deltaByPath.size,6);
 const changes=git(['diff','--name-status','--no-renames',BASE,SUCCESSOR,'--','projects/ngx-material-legacy',...oldInputs.map(ref=>ref.path)]).toString().trim().split('\n');
 assert.deepEqual(changes,DELTA.map(row=>(row.before?'M':'A')+'\t'+row.path));
 const products=oldProducts.map(ref=>deltaByPath.get(ref.path)?.after??ref).concat(DELTA.filter(row=>!row.before&&row.path.startsWith('projects/ngx-material-legacy/')).map(row=>row.after)).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 const inputs=oldInputs.map(ref=>deltaByPath.get(ref.path)?.after??ref);assert.equal(products.length,1121);assert.equal(inputs.length,68);
 const productPaths=products.map(ref=>ref.path);assert.deepEqual(productPaths,[...new Set(productPaths)].sort());assert.deepEqual(git(['ls-tree','-r','--name-only',SUCCESSOR,'--','projects/ngx-material-legacy']).toString().trim().split('\n'),productPaths);
 // The original 1120/68 frame remains authenticated history, never a current physical read.
 for(const ref of [...oldProducts,...oldInputs])identity(ref);
 for(const ref of [...products,...inputs]){assert.ok(!current.has(ref.path));current.set(ref.path,clean(ref));identity(ref);add(ref);}
 verifyGit(SUCCESSOR,[...products,...inputs],SUCCESSOR);
 for(const profile of packet.before_contexts){
  add(profile.report);const report=JSON.parse(member(profile.report)),context=report.candidate_context;
  assert.equal(sha(JSON.stringify(context)),profile.context_sha256);assert.deepEqual(context.product_members,profile.products.map(clean));
  assert.deepEqual([...context.files,...(report.additional_graph_context?.files??[])],profile.inputs.map(clean));
  verifyGit(profile.product_commit,profile.products);verifyGit(profile.input_commit,profile.inputs);
  for(const ref of [...profile.products,...profile.inputs])identity(ref);
  const old=profile.products.map(ref=>ref.path),missing=old.filter(path=>!current.has(path)).sort(),added=oldProductPaths.filter(path=>!old.includes(path));
  assert.deepEqual(missing,profile.retired_paths);assert.equal(missing.length,23);assert.ok(missing.every(path=>path.endsWith('/internal/common-module.ts')));missing.forEach(path=>retired.add(path));
  assert.deepEqual(added,profile.added_paths);assert.ok(added.length===0||added.length===1&&added[0]==='projects/ngx-material-legacy/legacy-tabs/tab-body-reversal.spec.ts');
 }
 const assertMembership=()=>{
  const base='projects/ngx-material-legacy',directories=new Set([base]);
  for(const path of productPaths){let parent=dirname(path);while(parent.startsWith(base+'/')){directories.add(parent);parent=dirname(parent);}}
  const peerPath=base+'/node_modules';
  const peers=()=>{const dir=resolve(root,peerPath),st=lstatSync(dir);assert.ok(st.isDirectory()&&!st.isSymbolicLink(),'invalid peer directory');assert.deepEqual(readdirSync(dir).sort(),['@angular','rxjs','tslib']);const scope=join(dir,'@angular'),scopeStat=lstatSync(scope);assert.ok(scopeStat.isDirectory()&&!scopeStat.isSymbolicLink(),'invalid peer scope');assert.deepEqual(readdirSync(scope).sort(),['cdk','common','core','forms','material','platform-browser']);for(const [path,target] of Object.entries(PEER_LINKS)){const full=join(dir,path);assert.ok(lstatSync(full).isSymbolicLink(),'invalid peer link '+path);assert.equal(readlinkSync(full),target,'changed peer link '+path);}};
  const paths=[];const walk=relative=>{const full=resolve(root,relative),st=lstatSync(full);assert.ok(!st.isSymbolicLink(),'symlink in product tree '+relative);if(st.isDirectory()){assert.ok(directories.has(relative),'unexpected product directory '+relative);for(const name of readdirSync(full).sort()){const child=relative+'/'+name;if(child===peerPath){peers();continue;}walk(child);}return;}assert.ok(st.isFile(),'invalid product member '+relative);paths.push(relative);};
  walk(base);assert.deepEqual(paths.sort(),productPaths,'changed current physical product membership');
  for(const path of retired){let exists=true;try{lstatSync(resolve(root,path));}catch(error){if(error.code==='ENOENT')exists=false;else throw error;}assert.equal(exists,false,'retired source reintroduced '+path);}
 };
 let verifying=false,reentered=false;
 const assertCurrent=()=>{
  if(verifying){reentered=true;throw new Error('retained context reentry');}
  verifying=true;reentered=false;try{
  assertRoot();assert.ok(physical(SELF).equals(image));assertMembership();
  for(const ref of bound.values())member(ref);
  // The last callback can change an earlier member. Close the observation with
  // a complete physical sweep that invokes no caller-provided code.
  for(const ref of bound.values())exact(physical(ref.path),ref);
  assertMembership();assert.ok(physical(SELF).equals(image));assertRoot();assert.equal(reentered,false,'retained context reentry');
  }finally{verifying=false;}
 };
 const resolveReference=value=>{
  const ref=descriptor(value),rows=identities.get(ref.path);if(!rows)return null;const known=rows.get(ref.sha256);assert.ok(known,'unknown retained context identity '+ref.path);if(ref.bytes!==undefined)assert.equal(ref.bytes,known.bytes);
  const selected=current.get(ref.path);return selected?{kind:'current',reference:{...selected}}:{kind:'retired',historical:{...known}};
 };
 assertCurrent();
 return Object.freeze({
  get bound(){return structuredClone([...bound.values()]);},
  get products(){return structuredClone(products.map(clean));},
  get inputs(){return structuredClone(inputs.map(clean));},
  get beforeContexts(){return structuredClone(packet.before_contexts.map(profile=>({report:profile.report,products:profile.products.map(clean),inputs:profile.inputs.map(clean),retired_paths:profile.retired_paths,added_paths:profile.added_paths})));},
  // Pure finite descriptor lookup. A caller must bracket consumption with the
  // physical guard and compare fresh reads. This returns no read capability.
  resolveReference,assertCurrent,current_source_admission_granted:false,source_judgments_requalified:false,current_source_reader_returned:false,g11_claim:'not-passed',
 });
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Disposable-fixture-only genuine physical owner controls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const root=process.cwd(),parent=resolve(root,'..'),nonce=process.env.NGX_AUTHORED_F9_FIXTURE_NONCE;
assert.match(nonce||'',/^[a-f0-9]{64}$/);assert.ok(root.startsWith(resolve(tmpdir())+'/ngx-authored-f9-')&&fs.realpathSync(root)===root&&fs.realpathSync(parent)===parent);
const parentStat=fs.lstatSync(parent);assert.ok(parentStat.isDirectory()&&!parentStat.isSymbolicLink()&&(parentStat.mode&0o077)===0&&parentStat.uid===process.getuid());
const marker=join(parent,'fixture-marker'),markerStat=fs.lstatSync(marker);assert.ok(markerStat.isFile()&&!markerStat.isSymbolicLink()&&markerStat.nlink===1);assert.equal(fs.readFileSync(marker,'utf8'),nonce+'\n');
const gitDir=fs.lstatSync(join(root,'.git'));assert.ok(gitDir.isDirectory()&&!gitDir.isSymbolicLink()&&fs.realpathSync(join(root,'.git'))===join(root,'.git'));
for(const path of ['compatibility/f10/authored-dependency-dispositions.json','compatibility/f10/authored-use-reviews/frozen-ngmodule-retired-source-f9-v1.json','projects/ngx-material-legacy/legacy-button/button.ts']){const s=fs.lstatSync(join(root,path));assert.ok(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1,'unsafe fixture target '+path);}
const actualRead=fs.readFileSync;let hook=null;
fs.readFileSync=function(...args){const result=actualRead.apply(this,args);if(hook)hook(String(args[0]));return result;};syncBuiltinESMExports();
const {authoredUseReviewEvidencePhysical:owner}=await import('../scripts/authored-use-inventory.mjs');
const rosterPath='compatibility/f10/authored-dependency-dispositions.json',ngPath='compatibility/f10/authored-use-reviews/frozen-ngmodule-retired-source-f9-v1.json';
const key=r=>JSON.stringify([r.file,r.module,r.symbol]),seed=JSON.parse(actualRead(join(root,'compatibility/f10/authored-dependency-inventory-seed.json')));
const files=new Set(seed.symbol_uses.filter(r=>r.module==='@angular/cdk/bidi'&&r.symbol==='BidiModule'&&!['legacy-core/internal/common-module.ts','legacy-core/pseudo-checkbox/pseudo-checkbox-module.ts'].includes(r.file)).map(r=>r.file));
const bidi=new Set(seed.symbol_uses.filter(r=>files.has(r.file)&&r.module==='@angular/cdk/bidi'&&r.symbol==='BidiModule').map(key));
const ng=new Set(seed.symbol_uses.filter(r=>files.has(r.file)&&r.module==='@angular/core'&&r.symbol==='NgModule').map(key));assert.equal(bidi.size,23);assert.equal(ng.size,23);
function measure(){const x=owner().review_evidence,missing=new Set(x.insufficient_uses.map(key));return {bidi:[...bidi].filter(k=>missing.has(k)).length,ng:[...ng].filter(k=>missing.has(k)).length};}
function expect(b,n){assert.deepEqual(measure(),{bidi:b,ng:n});}
const originalRoster=actualRead(join(root,rosterPath)),originalNg=actualRead(join(root,ngPath));
const product='projects/ngx-material-legacy/legacy-button/button.ts',productFile=join(root,product),originalProduct=actualRead(productFile);
const retired='projects/ngx-material-legacy/internal/common-module.ts',retiredFile=join(root,retired);
const old=execFileSync('git',['--no-replace-objects','show','0c25c56282d805aaed351b94a9729303462bfb2a:'+retired],{cwd:root});
try{
 expect(0,0);
 try{fs.writeFileSync(join(root,ngPath),Buffer.concat([originalNg,Buffer.from('\ncorrupt')]));expect(0,23);}finally{fs.writeFileSync(join(root,ngPath),originalNg);}expect(0,0);
 try{const roster=JSON.parse(originalRoster);const row=roster.symbol_uses.find(r=>bidi.has(key(r)));row.source_review.sha256='0'.repeat(64);fs.writeFileSync(join(root,rosterPath),JSON.stringify(roster));expect(23,0);}finally{fs.writeFileSync(join(root,rosterPath),originalRoster);}expect(0,0);
 try{fs.writeFileSync(productFile,Buffer.concat([originalProduct,Buffer.from('\ncorrupt')]));expect(23,23);}finally{fs.writeFileSync(productFile,originalProduct);}expect(0,0);
 try{fs.writeFileSync(retiredFile,old,{flag:'wx'});expect(23,23);}finally{fs.unlinkSync(retiredFile);}expect(0,0);
 let fired=false;hook=p=>{if(!fired&&p.endsWith('/'+ngPath)){fired=true;try{owner();}catch{}}};assert.throws(()=>owner(),/reentered physical Bidi evidence transaction/);hook=null;assert.ok(fired);expect(0,0);
 let reads=0;fired=false;hook=p=>{if(p.endsWith('/'+ngPath)&&++reads===2&&!fired){fired=true;fs.writeFileSync(productFile,Buffer.concat([originalProduct,Buffer.from('\nlate corruption')]));}};
 try{expect(23,23);assert.ok(fired);}finally{hook=null;fs.writeFileSync(productFile,originalProduct);}expect(0,0);
 const alternates=join(root,'.git/objects/info/alternates'),originalAlternates=actualRead(alternates),alternatesStat=fs.lstatSync(alternates);assert.ok(alternatesStat.isFile()&&alternatesStat.nlink===1&&!alternatesStat.isSymbolicLink());
 reads=0;fired=false;hook=p=>{if(p.endsWith('/'+ngPath)&&++reads===2&&!fired){fired=true;fs.writeFileSync(alternates,join(parent,'missing-object-store')+'\n');}};
 try{expect(23,23);assert.ok(fired);}finally{hook=null;fs.writeFileSync(alternates,originalAlternates);}expect(0,0);
 console.log(JSON.stringify({bidi:23,ngmodule:23,physical_positive:true,ng_only_reject:true,bidi_only_reject:true,product_reject:true,restored_old_path_reject:true,swallowed_reentry_reject:true,late_physical_reject:true,late_history_loss_reject:true,recovery:true,runtime_or_g11_claim:false}));
}finally{hook=null;fs.readFileSync=actualRead;syncBuiltinESMExports();}

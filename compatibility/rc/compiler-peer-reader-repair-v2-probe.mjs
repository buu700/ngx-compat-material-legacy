/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Historical canonical peer routes and actual accessor source-role reconstruction. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,symlinkSync,unlinkSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {readHistoricalContractRepairOwnerMember} from '../../scripts/historical-contract-repair-readers.mjs';
import {snackDomRawCurrentRead} from '../../scripts/snack-dom-source-context.mjs';
import {scanValueAccessorTokenUses} from '../../scripts/value-accessor-token-source-review.mjs';
const root=process.cwd(),prefix='compatibility/rc/compiler-peer-reader-repair-',out=process.argv[2],start=performance.now(),hash=b=>createHash('sha256').update(b).digest('hex');assert.ok(out?.startsWith(prefix));assert.equal(existsSync(out),false);
const report={schema_version:1,current_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
try{
 const disk=p=>readFileSync(join(root,p)),owner=p=>readHistoricalContractRepairOwnerMember(root,p),publicRead=snackDomRawCurrentRead({root}),positive=[],rejected=[];
 for(const name of ['material','cdk'])for(const base of ['','projects/ngx-material-legacy/']){
  const p=base+'node_modules/@angular/'+name+'/package.json';assert.ok(owner(p).equals(disk(p)));assert.ok(publicRead(p).equals(disk(p)));positive.push(p);
 }
 for(const [name,tail]of [['@angular/core','package.json'],['@angular/common','package.json'],['@angular/forms','package.json'],['rxjs','package.json'],['rxjs','operators/package.json']]){
  const p='projects/ngx-material-legacy/node_modules/'+name+'/'+tail;assert.ok(owner(p).equals(disk(p)));assert.ok(publicRead(p).equals(disk(p)));positive.push(p);
 }
 for(const p of ['projects/ngx-material-legacy/node_modules/rxjs/dist/cjs/index.js','projects/ngx-material-legacy/node_modules/@angular/core/fesm2022/core.mjs','projects/other/node_modules/@angular/cdk/package.json','projects/ngx-material-legacy/node_modules/@angular/core/operators/package.json']){assert.throws(()=>owner(p));rejected.push(p);}
 const temp=mkdtempSync(join(tmpdir(),'ngx-canonical-peer-'));
 try{
  const fixture=join(temp,'root'),peer=join(temp,'peer'),alternate=join(temp,'alternate'),local='projects/ngx-material-legacy/node_modules/@angular/';
  for(const p of ['node_modules/@angular',local,'projects/other/node_modules/@angular'])mkdirSync(join(fixture,p),{recursive:true});
  mkdirSync(join(peer,'tokens'),{recursive:true});mkdirSync(alternate);writeFileSync(join(peer,'package.json'),'declared');writeFileSync(join(peer,'tokens/entry'),'token');writeFileSync(join(alternate,'package.json'),'alternate');
  for(const p of ['node_modules/@angular/cdk',local+'cdk','projects/other/node_modules/@angular/cdk','node_modules/@angular/core',local+'core'])symlinkSync(peer,join(fixture,p),'dir');
  symlinkSync(join(peer,'package.json'),join(peer,'tokens/linked'));writeFileSync(join(fixture,'source.ts'),'source');symlinkSync(join(fixture,'source.ts'),join(fixture,'source-linked.ts'));
  const read=p=>readHistoricalContractRepairOwnerMember(fixture,p),pub=snackDomRawCurrentRead({root:fixture});assert.equal(read(local+'cdk/package.json').toString(),'declared');assert.equal(pub(local+'cdk/package.json').toString(),'declared');positive.push('historical-fixture-local-CDK');
  for(const p of ['/source.ts','../root/source.ts',local+'cdk/tokens/../../source.ts',local+'cdk/tokens/..\\entry',local+'core/package.json','node_modules/@angular/core/package.json','projects/other/node_modules/@angular/cdk/package.json',local+'cdk/tokens/linked','source-linked.ts']){assert.throws(()=>read(p));assert.throws(()=>pub(p));rejected.push('fixture/'+p);}
  unlinkSync(join(fixture,local+'cdk'));symlinkSync(alternate,join(fixture,local+'cdk'),'dir');assert.throws(()=>read(local+'cdk/package.json'),/workspace peer differs/);rejected.push('alternate-peer');
  unlinkSync(join(fixture,local+'cdk'));symlinkSync(peer,join(fixture,local+'cdk'),'dir');unlinkSync(join(peer,'package.json'));symlinkSync(join(alternate,'package.json'),join(peer,'package.json'));assert.throws(()=>read(local+'cdk/package.json'));rejected.push('linked-peer-manifest');
 }finally{rmSync(temp,{recursive:true,force:true});}
 const reads=new Set(),source=p=>{reads.add(p);return owner(p).toString();},actual=scanValueAccessorTokenUses({root,readSource:source}),prior=JSON.parse(disk('compatibility/rc/packed-cva-current-public-roles.json')).accessor_provider_cases;
 assert.equal(actual.cases.length,6);const byFile=(a,b)=>a.file.localeCompare(b.file);assert.deepEqual([...actual.cases].sort(byFile),[...prior].sort(byFile));
 const target='projects/ngx-material-legacy/legacy-autocomplete/autocomplete-trigger.ts',bytes=disk(target).toString();
 for(const [id,from,to]of [['provider-multi','multi: true','multi: false'],['runtime-token','NG_VALUE_ACCESSOR','NG_VALIDATORS']]){
  assert.ok(bytes.includes(from));const changed=bytes.replace(from,to);assert.throws(()=>scanValueAccessorTokenUses({root,readSource:p=>p===target?changed:source(p)}));rejected.push('source/'+id);
 }
 const packageReads=[...reads].filter(p=>p.includes('/node_modules/')).sort();assert.ok(packageReads.includes('projects/ngx-material-legacy/node_modules/@angular/cdk/package.json'));
 const line=JSON.parse(disk('projects/ngx-material-legacy/package.json')).version.startsWith('21.')?'21.x':'main';
 Object.assign(report,{status:'pass',line,canonical_peer_routes:positive.length,negative_controls:rejected.length,positive_case_ids:positive,rejected_case_ids:rejected,actual_accessor_cases:actual.cases.length,exact_historical_accessor_role_images_preserved:true,compiler_project_package_reads:packageReads.map(p=>({path:p,sha256:hash(owner(p)),bytes:owner(p).length})),current_product_sources_edited:0});
}catch(e){Object.assign(report,{status:'rejected',error:e.stack});process.exitCode=1;}
report.seconds=(performance.now()-start)/1000;writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,line:report.line,seconds:report.seconds,controls:report.negative_controls,error:report.error}));

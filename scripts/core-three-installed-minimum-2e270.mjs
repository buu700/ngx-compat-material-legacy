/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Physical identity only; not a consumer-floor or DI execution claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function inspectCoreThreeMinimum(root=process.cwd()) {
 const read=p=>readFileSync(resolve(root,p)), core=JSON.parse(read('node_modules/@angular/core/package.json')),product=JSON.parse(read('projects/ngx-material-legacy/package.json'));assert.equal(core.version,'22.1.7');assert.equal(product.peerDependencies['@angular/core'],'^22.1.7');
 const paths=['compatibility/rc/element-ref-public-subjects.json','compatibility/rc/material-public-subjects.json'],caps=paths.map(path=>({path,sha256:hash(read(path))})),[element,material]=caps.map(x=>JSON.parse(read(x.path))),ref=element.subjects.find(x=>x.line==='main'),main=material.subjects.find(x=>x.line==='main');assert.equal(ref.version,core.version);assert.equal(main.packages.find(x=>x.name==='@angular/core').version,core.version);const members=new Map();
 function add(path,sha,bytes){const data=read('node_modules/@angular/core/'+path);assert.equal(hash(data),sha,path);assert.equal(data.length,bytes);if(members.has(path))assert.equal(members.get(path).sha256,sha);else members.set(path,{path,sha256:sha,bytes});}
 for(const x of ref.members)add(x.archive_member.replace(/^package\//,''),x.sha256,x.bytes);for(const x of main.members.filter(x=>x.package==='@angular/core'))add(x.module_path,x.sha256,x.bytes);
 return {schema_version:1,line:'main',role:'physical installed minimum Core versus complete reviewed subjects',core_version:core.version,advertised_core:product.peerDependencies['@angular/core'],capsules:caps,members:[...members.values()].sort((a,b)=>a.path.localeCompare(b.path)),member_count:members.size,producer:{path:'scripts/core-three-installed-minimum-2e270.mjs',sha256:hash(read('scripts/core-three-installed-minimum-2e270.mjs'))},identity_only:true,di_native_runtime_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert.equal(process.argv[2],'--write');let x=inspectCoreThreeMinimum();writeFileSync('compatibility/rc/core-three-installed-minimum-2e270-v1.json',JSON.stringify(x,null,2)+'\n');console.log(JSON.stringify({version:x.core_version,members:x.member_count}));}

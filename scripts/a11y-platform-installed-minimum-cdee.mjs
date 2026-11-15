/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Finite identity comparison; source bytes only, not runtime or floor qualification. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function inspectA11yPlatformInstalledMinimum({root=process.cwd()}={}) {
 const read=p=>readFileSync(resolve(root,p));const capsulePaths=['compatibility/rc/material-public-subjects.json','compatibility/rc/key-manager-public-subjects.json','compatibility/rc/focus-origin-declaration-subjects.json','compatibility/rc/public-literal-types-declaration-subjects.json'];
 const refs=capsulePaths.map(path=>({path,sha256:hash(read(path))})), [material,key,origin,literal]=refs.map(r=>JSON.parse(read(r.path)));
 const manifest=JSON.parse(read('projects/ngx-material-legacy/package.json'));assert.equal(manifest.peerDependencies['@angular/cdk'],'^22.1.7');
 const main=material.subjects.find(s=>s.line==='main'),packages=main.packages.filter(p=>p.name.startsWith('@angular/'));const installedVersions={};
 for(const pkg of packages){const manifest=JSON.parse(read('node_modules/'+pkg.name+'/package.json'));assert.equal(pkg.version,'22.1.7');assert.equal(manifest.version,pkg.version);installedVersions[pkg.name]=manifest.version;}
 const installedPackage=JSON.parse(read('node_modules/@angular/cdk/package.json'));const set=new Map();function add(path,sha,bytes,subject,pkg='@angular/cdk'){assert.ok(!path.startsWith('/')&&!path.split('/').includes('..'));const data=read('node_modules/'+pkg+'/'+path);assert.equal(hash(data),sha,`${subject}: ${pkg}/${path}`);if(bytes!==undefined)assert.equal(data.length,bytes);const key=pkg+'/'+path,prev=set.get(key);if(prev)assert.equal(prev.sha256,sha);else set.set(key,{package:pkg,path,sha256:sha,bytes:data.length});}
 for(const m of main.members.filter(m=>m.package.startsWith('@angular/'))) add(m.module_path,m.sha256,m.bytes,'material capsule',m.package);
 const km=key.subjects.find(s=>s.line==='main').packages.find(p=>p.package==='@angular/cdk');assert.equal(km.version,'22.1.7');for(const m of km.members)add(m.archive_member.replace(/^package\//,''),m.sha256,m.bytes,'key-manager capsule');
 const orig=origin.subjects.find(s=>s.line==='main');assert.equal(orig.version,'22.1.7');add(orig.member.replace(/^package\//,''),orig.sha256,orig.bytes,'focus-origin declaration');add('types/a11y.d.ts',orig.entry_sha256,undefined,'focus-origin public entry');
 for(const row of literal.subjects.filter(s=>s.line==='main'&&s.package==='@angular/cdk'))for(const m of [row.entry,row.source].filter(Boolean))add(m.archive_member.replace(/^package\//,''),m.sha256,m.bytes,'literal declaration');
 return {schema_version:1,line:'main',role:'Actual installed advertised-minimum CDK versus finite public subject bytes',advertised_cdk:manifest.peerDependencies['@angular/cdk'],installed_cdk:installedPackage.version,installed_angular_packages:installedVersions,source_capsules:refs,installed_members:[...set.values()].sort((a,b)=>(a.package+'/'+a.path).localeCompare(b.package+'/'+b.path)),installed_member_count:set.size,producer:{path:'scripts/a11y-platform-installed-minimum-cdee.mjs',sha256:hash(read('scripts/a11y-platform-installed-minimum-cdee.mjs'))},source_identity_only:true,native_component_packed_floor_qualified:false,g11_claim:'not-passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert.equal(process.argv[2],'--write');const p='compatibility/rc/a11y-platform-installed-minimum-cdee-v1.json',x=inspectA11yPlatformInstalledMinimum();writeFileSync(p,JSON.stringify(x,null,2)+'\n');console.log(JSON.stringify({members:x.installed_member_count,installed_cdk:x.installed_cdk,source_identity_only:true}));}

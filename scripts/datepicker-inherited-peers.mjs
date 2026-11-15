/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {lstatSync,readFileSync,readdirSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
const peers=Object.freeze({
 '@angular/material':['22.1.7',577,'53dd2c20623cc0f27f613aa7c5ff8cf2ba63c2b30cec759c7e655fa3c48dee46'],
 '@angular/cdk':['22.1.7',397,'900ccf2339f83ec41cd08df22e08290ac4ed2848134504705f4bc414833c49fd'],
 '@angular/core':['22.1.7',105,'8760d266c4e379dbcd57fd61d72e24f9576ced1b78fc991d1b566a941a98a154'],
 '@angular/common':['22.1.7',5228,'c84dcbf83b18417c147e4d20e0938b931b0123159a5e94cb8e1ff80af22e75b5'],
 '@angular/forms':['22.1.7',16,'9e88cd0621c61f628272fc367dd94abb8d220dbe705075c641ae5eca60095c03'],
 '@angular/platform-browser':['22.1.7',20,'a4fa0d7938f24fd09cb785edd4055b018164c8fe3412a364ab6d176149e200e0'],
 '@angular/platform-browser-dynamic':['22.1.7',9,'3c71bb0faa565050abf368b6dad5fc95e329fe2918ed390a548440b183c77ab7'],
 '@angular/compiler':['22.1.7',6,'2b98aab22c9b3eb5006411bfd2d20696f95071d1a5acd0b280901f7f85133171'],
 'rxjs':['7.8.2',2277,'13c7e5ded9c704037ba337a0ab2254591f1087c80d0c89683fde4f48f606a139'],
 'zone.js':['0.16.3',138,'913205cea4c867f662fa0238765d77ab5c235c644d18c0d6c5bda6d27b486dd8'],
 'tslib':['2.8.1',14,'ed1a7d43fb51c8a47f4b6b52d1d1c13a4c1122a0f79fc804a37efcf595d53b5a'],
});
const hash=b=>createHash('sha256').update(b).digest('hex');
function contentInventory(root){const rows=[];function walk(dir,rel=''){for(const name of readdirSync(dir)){if(name==='node_modules')continue;const path=join(dir,name),r=rel?rel+'/'+name:name,st=lstatSync(path);if(st.isSymbolicLink())throw Error('package internal symlink: '+r);if(st.isDirectory())walk(path,r);else if(st.isFile())rows.push([r,st.size,hash(readFileSync(path))]);else throw Error('not regular package member');}}walk(root);rows.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);return {files:rows.length,sha256:hash(JSON.stringify(rows))};}
// Expected package digests are computed from independent registry tarballs,
// sorted by path and without platform-dependent executable mode bits.
export function verifyDatepickerPeers(root){const out={};for(const [name,[version,files,expected]] of Object.entries(peers)){
 const path=realpathSync(join(root,'node_modules',name)),pkg=JSON.parse(readFileSync(join(path,'package.json')));if(pkg.name!==name||pkg.version!==version)throw Error('wrong package: '+name);const found=contentInventory(path);if(found.files!==files||found.sha256!==expected)throw Error('wrong package bytes: '+name);out[name]={path,version,...found};
}return out;}

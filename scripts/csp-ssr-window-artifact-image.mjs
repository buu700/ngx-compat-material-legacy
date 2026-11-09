/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync,readdirSync,mkdtempSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {extractPackageArchive} from './safe-package-extract.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function files(root){
 const out=new Map();
 function walk(path,relative=''){
  const stat=lstatSync(path);if(stat.isSymbolicLink())throw Error('linked package member');
  if(stat.isDirectory()){for(const name of readdirSync(path).sort())walk(join(path,name),relative?relative+'/'+name:name);return;}
  if(!stat.isFile()||!relative)throw Error('invalid package member');out.set(relative,readFileSync(path));
 }
 walk(root);return out;
}
/** Compare the complete physical npm-installed package to a fresh safe extraction. */
export function verifyWindowInstalledArtifact(tarball,consumer,expectedSha){
 if(!/^[0-9a-f]{64}$/.test(expectedSha)||hash(readFileSync(tarball))!==expectedSha)throw Error('wrong artifact bytes');
 if(realpathSync(consumer)!==resolve(consumer))throw Error('linked consumer root');
 let current=consumer;
 for(const part of ['node_modules','@ngx-compat','material-legacy']){current=join(current,part);const s=lstatSync(current);if(s.isSymbolicLink()||!s.isDirectory())throw Error('linked installed package');}
 const dest=mkdtempSync(join(consumer,'.window-artifact-check-'));
 const extracted=extractPackageArchive(tarball,dest),expected=files(extracted),installed=files(current);
 if(!expected.size||expected.size!==installed.size)throw Error('installed package membership mismatch');
 for(const [path,bytes] of expected){const other=installed.get(path);if(!other||!bytes.equals(other))throw Error('installed package bytes mismatch: '+path);}
 return{artifact_sha256:expectedSha,files:expected.size,inventory_sha256:hash(JSON.stringify([...expected].map(([path,bytes])=>[path,hash(bytes)])))};
}

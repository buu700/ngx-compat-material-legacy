/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {mkdirSync,cpSync,readFileSync,writeFileSync,unlinkSync,renameSync,symlinkSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {extractPackageArchive} from '../scripts/safe-package-extract.mjs';
import {verifyWindowInstalledArtifact} from '../scripts/csp-ssr-window-artifact-image.mjs';
// Always supply a fresh isolated directory, never a live npm consumer.
const tar=resolve(process.argv[2]),root=resolve(process.argv[3]),digest=createHash('sha256').update(readFileSync(tar)).digest('hex');
assert.equal(existsSync(root),false);mkdirSync(root,{recursive:true});
const origin=extractPackageArchive(tar,join(root,'origin')),consumer=join(root,'consumer'),parent=join(consumer,'node_modules/@ngx-compat');
mkdirSync(parent,{recursive:true});const installed=join(parent,'material-legacy');cpSync(origin,installed,{recursive:true});
const positive=verifyWindowInstalledArtifact(tar,consumer,digest);assert.ok(positive.files>0);
const target=join(installed,'fesm2022/ngx-compat-material-legacy-legacy-table.mjs'),old=readFileSync(target);
writeFileSync(target,Buffer.concat([old,Buffer.from('\n// physical drift\n')]));assert.throws(()=>verifyWindowInstalledArtifact(tar,consumer,digest),/bytes mismatch/);writeFileSync(target,old);
const extra=join(installed,'unexpected-control');writeFileSync(extra,'x');assert.throws(()=>verifyWindowInstalledArtifact(tar,consumer,digest),/membership mismatch/);unlinkSync(extra);
const backup=target+'.control';renameSync(target,backup);assert.throws(()=>verifyWindowInstalledArtifact(tar,consumer,digest),/bytes mismatch|membership mismatch/);renameSync(backup,target);
renameSync(target,backup);symlinkSync(backup,target);assert.throws(()=>verifyWindowInstalledArtifact(tar,consumer,digest),/linked package member/);unlinkSync(target);renameSync(backup,target);
assert.throws(()=>verifyWindowInstalledArtifact(tar,consumer,'0'.repeat(64)),/wrong artifact/);
const recovered=verifyWindowInstalledArtifact(tar,consumer,digest);assert.deepEqual(recovered,positive);
console.log(JSON.stringify({positive,byteDrift:true,extra:true,missing:true,symlink:true,wrongHash:true,recovery:true}));

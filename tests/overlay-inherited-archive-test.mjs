/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {selectInheritedNativeProfile} from '../scripts/inherited-native-profiles.mjs';
const root=process.cwd(),profile=selectInheritedNativeProfile(root);mkdirSync('artifacts',{recursive:true});const dir=mkdtempSync(join(root,'artifacts/overlay-archive-negative-'));
try {
 for(const kind of ['traversal','symlink','duplicate','alias']){
  const file=join(dir,kind+'.tgz');const code="import tarfile,sys,io\nf=tarfile.open(sys.argv[1],'w:gz');kind=sys.argv[2]\ndef add(n):\n i=tarfile.TarInfo(n);i.size=1;f.addfile(i,io.BytesIO(b'x'))\nif kind=='traversal':add('package/../../escaped')\nelif kind=='symlink':\n i=tarfile.TarInfo('package/link');i.type=tarfile.SYMTYPE;i.linkname='../../escaped';f.addfile(i)\nelif kind=='duplicate':\n add('package/duplicate');add('package/duplicate')\nelse:\n add('package/duplicate');add('package/./duplicate')\nf.close()";
  const create=spawnSync(profile.python,['-I','-c',code,file,kind],{encoding:'utf8'});assert.equal(create.status,0,create.stderr);
  const digest=createHash('sha256').update(readFileSync(file)).digest('hex');const child=spawnSync(process.execPath,['scripts/overlay-inherited-native-run.mjs',file,digest,dir,'archivefixture0001'],{cwd:root,env:process.env,encoding:'utf8',timeout:60000});assert.notEqual(child.status,0);assert.match(child.stderr,/unsafe or invalid archive/);
 }
} finally {rmSync(dir,{recursive:true,force:true})}
console.log('verified in-process extraction rejected traversal, symlink, duplicate and aliased archive members');

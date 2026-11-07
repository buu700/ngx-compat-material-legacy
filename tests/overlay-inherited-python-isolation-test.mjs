/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {selectInheritedNativeProfile} from '../scripts/inherited-native-profiles.mjs';
import {extractArchive,verifyArchive} from '../scripts/overlay-inherited-archive.mjs';
const root=process.cwd(),profile=selectInheritedNativeProfile(root);mkdirSync('artifacts',{recursive:true});const temp=mkdtempSync(join(root,'artifacts/overlay-python-isolation-'));
const home=join(temp,'home'),cwd=join(temp,'cwd'),stage=join(temp,'stage'),archive=join(temp,'fixture.tgz'),cwdMarker=join(temp,'cwd-marker'),siteMarker=join(temp,'site-marker'),userMarker=join(temp,'user-marker');
try{
 mkdirSync(cwd);mkdirSync(stage);const version=spawnSync(profile.python,['-I','-c','import sys;print(f"{sys.version_info.major}.{sys.version_info.minor}")'],{encoding:'utf8'});assert.equal(version.status,0,version.stderr);
 const site=join(home,'.local/lib','python'+version.stdout.trim(),'site-packages');mkdirSync(site,{recursive:true});
 const make="import tarfile,sys,io\nf=tarfile.open(sys.argv[1],'w:gz');i=tarfile.TarInfo('package/probe');data=b'known archive content';i.size=len(data);f.addfile(i,io.BytesIO(data));f.close()";
 const created=spawnSync(profile.python,['-I','-c',make,archive],{encoding:'utf8'});assert.equal(created.status,0,created.stderr);
 writeFileSync(join(cwd,'tarfile.py'),`open(${JSON.stringify(cwdMarker)},'w').write('cwd import')\nraise RuntimeError('cwd import reached')\n`);
 writeFileSync(join(site,'sitecustomize.py'),`open(${JSON.stringify(siteMarker)},'w').write('site import')\n`);
 // Debian's global sitecustomize can precede user site; usercustomize is
 // the corresponding per-user hook in that profile. Both are blocked by -I.
 writeFileSync(join(site,'usercustomize.py'),`open(${JSON.stringify(userMarker)},'w').write('user import')\n`);
 const env={...process.env,HOME:home,PYTHONPATH:cwd};delete env.PYTHONNOUSERSITE;const control=spawnSync(profile.python,['-c','import tarfile'],{cwd,env,encoding:'utf8'});assert.notEqual(control.status,0);assert.ok(existsSync(cwdMarker));assert.ok(existsSync(userMarker));if(profile.id==='linux-arm64-nix')assert.ok(existsSync(siteMarker));rmSync(cwdMarker);rmSync(siteMarker,{force:true});rmSync(userMarker);
 const originalHome=process.env.HOME,originalPath=process.env.PYTHONPATH,originalNoUserSite=process.env.PYTHONNOUSERSITE;delete process.env.PYTHONNOUSERSITE;process.env.HOME=home;process.env.PYTHONPATH=cwd;process.chdir(cwd);
 try{assert.deepEqual(extractArchive(profile.python,archive,stage),['package/probe']);verifyArchive(profile.python,archive,stage)}finally{process.chdir(root);if(originalHome===undefined)delete process.env.HOME;else process.env.HOME=originalHome;if(originalPath===undefined)delete process.env.PYTHONPATH;else process.env.PYTHONPATH=originalPath;if(originalNoUserSite===undefined)delete process.env.PYTHONNOUSERSITE;else process.env.PYTHONNOUSERSITE=originalNoUserSite}
 assert.equal(readFileSync(join(stage,'package/probe'),'utf8'),'known archive content');assert.equal(existsSync(cwdMarker),false);assert.equal(existsSync(siteMarker),false);assert.equal(existsSync(userMarker),false);
}finally{process.chdir(root);rmSync(temp,{recursive:true,force:true})}
console.log('isolated Python extracted and verified the archive without cwd or user-site imports; unisolated controls triggered both');

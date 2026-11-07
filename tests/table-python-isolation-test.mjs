/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';
import {extractPackageArchive} from '../scripts/safe-package-extract.mjs';
import {selectInheritedNativeProfile} from '../scripts/inherited-native-profiles.mjs';
const profile=selectInheritedNativeProfile(process.cwd()),temp=mkdtempSync(join(tmpdir(),'table-python-isolation-')),originalCwd=process.cwd(),oldHome=process.env.HOME,oldNoUserSite=process.env.PYTHONNOUSERSITE;
try {
 const archive=join(temp,'input.tgz'),r=spawnSync(profile.python,['-I','-c',"import tarfile,io,sys; t=tarfile.open(sys.argv[1],'w:gz'); b=b'ok'; m=tarfile.TarInfo('package/file'); m.size=len(b); t.addfile(m,io.BytesIO(b)); t.close()",archive]);assert.equal(r.status,0,r.stderr?.toString());
 const ver=spawnSync(profile.python,['-I','-c','import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")'],{encoding:'utf8'});assert.equal(ver.status,0);
 const cwd=join(temp,'cwd'),home=join(temp,'home'),site=join(home,'.local/lib/python'+ver.stdout.trim()+'/site-packages'),cwdMarker=join(temp,'cwd-marker'),siteMarker=join(temp,'site-marker'),pthMarker=join(temp,'pth-marker');mkdirSync(cwd,{recursive:true});mkdirSync(site,{recursive:true});
 writeFileSync(join(cwd,'tarfile.py'),`from pathlib import Path\nPath(${JSON.stringify(cwdMarker)}).write_text('called')\n`);writeFileSync(join(site,'sitecustomize.py'),`from pathlib import Path\nPath(${JSON.stringify(siteMarker)}).write_text('called')\n`);writeFileSync(join(site,'probe.pth'),`import pathlib; pathlib.Path(${JSON.stringify(pthMarker)}).write_text('called')\n`);
 process.chdir(cwd);process.env.HOME=home;delete process.env.PYTHONNOUSERSITE;
 const unisolated=spawnSync(profile.python,['-c','import tarfile,sys; print(getattr(sys.modules.get("sitecustomize"),"__file__",""))'],{encoding:'utf8'});assert.equal(unisolated.status,0,unisolated.stderr);assert.ok(existsSync(cwdMarker));assert.ok(existsSync(pthMarker));if(unisolated.stdout.trim()===join(site,'sitecustomize.py'))assert.ok(existsSync(siteMarker));rmSync(cwdMarker);rmSync(pthMarker);if(existsSync(siteMarker))rmSync(siteMarker);
 extractPackageArchive(archive,join(temp,'result'),{pythonExecutable:profile.python,pythonIsolated:true});assert.equal(readFileSync(join(temp,'result/package/file'),'utf8'),'ok');assert.equal(existsSync(cwdMarker),false);assert.equal(existsSync(siteMarker),false);assert.equal(existsSync(pthMarker),false);
 // The independently invoked table verification uses the same isolated interpreter mode.
 const verify=spawnSync(profile.python,['-I','-c','import tarfile,sys; assert tarfile.open(sys.argv[1]).getmember("package/file").size == 2',archive],{encoding:'utf8'});assert.equal(verify.status,0,verify.stderr);assert.equal(existsSync(cwdMarker),false);assert.equal(existsSync(siteMarker),false);assert.equal(existsSync(pthMarker),false);
 console.log('unisolated cwd and user-site markers reproduced; isolated extraction and verification ignored both');
} finally {process.chdir(originalCwd);process.env.HOME=oldHome;if(oldNoUserSite===undefined)delete process.env.PYTHONNOUSERSITE;else process.env.PYTHONNOUSERSITE=oldNoUserSite;rmSync(temp,{recursive:true,force:true})}

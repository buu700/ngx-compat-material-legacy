/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {appendFileSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {isAbsolute, join, relative, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {normalizePseudoCoreRows,pseudoCorePredecessor} from '../scripts/api-pseudo-core-continuation.mjs';
import {qualifyCombinedArtifactSubject, qualifyCombinedInputFirstcheckArchive, API_COMBINED_INPUT_FIRSTCHECK_SHA, API_COMBINED_PSEUDO_DISABLED_SHA} from '../scripts/api-combined-d70-image.mjs';
const [priorTar,priorRoot,nextTar,nextRoot]=process.argv.slice(2).map(x=>resolve(x)),prior=readFileSync(priorTar),next=readFileSync(nextTar);
const priorProfile='combined-input-firstcheck';
const result=qualifyCombinedArtifactSubject(next,nextRoot);assert.deepEqual(result,{profile:'combined-pseudo-disabled',artifact_sha256:API_COMBINED_PSEUDO_DISABLED_SHA,predecessor_sha256:API_COMBINED_INPUT_FIRSTCHECK_SHA,member_count:512});
assert.equal(qualifyCombinedInputFirstcheckArchive(prior,priorRoot),true);assert.equal(qualifyCombinedInputFirstcheckArchive(next,nextRoot),false);assert.equal(qualifyCombinedArtifactSubject(prior,priorRoot).profile,priorProfile);
assert.equal(qualifyCombinedArtifactSubject(next,priorRoot),null);assert.equal(qualifyCombinedArtifactSubject(prior,nextRoot),null);
const core={package:'@ngx-compat/material-legacy',version:'22.0.0-rc.0',package_sha256:'252144295470393ba5cd56ee0fc3ead5d63e84a49e15139fad7bf4d8fbe8ff93',path:'types/ngx-compat-material-legacy-legacy-core.d.ts',bytes:36710,sha256:'7ded193983f6cf745c6f7ac44784d23ee80c879a6ba7ff8124819609d608b6a5'};
const context={tarball:nextTar,packageRoot:nextRoot},normalized=normalizePseudoCoreRows([core],context);
assert.equal(normalized[0].bytes,36758);assert.equal(normalized[0].sha256,'40e2cd4aed9132372fc88482a6fc7eea709c1176e7e7f8527e7548d173f1861c');assert.equal(pseudoCorePredecessor(context).length,36758);
assert.throws(()=>normalizePseudoCoreRows([{...core,sha256:'0'.repeat(64)}],context));assert.throws(()=>normalizePseudoCoreRows([core,core],context));assert.throws(()=>normalizePseudoCoreRows([core],{tarball:priorTar,packageRoot:priorRoot}));
const corrupt=Buffer.from(next);corrupt[100]^=1;assert.equal(qualifyCombinedArtifactSubject(corrupt),null);
const tmp=mkdtempSync(join(tmpdir(),'pseudo-disabled-image-'));let rejected=0;
// Never mutate a preserved symlink or hardlink from a caller's tree. Every
// destination is newly created below our own temporary directory.
function materialize(source,destination){
 const rel=relative(tmp,resolve(destination));
 assert.ok(rel && !isAbsolute(rel) && rel!=='..' && !rel.startsWith('..'+sep),'destination outside owned scratch');
 const stat=lstatSync(source);assert.equal(stat.isSymbolicLink(),false,'symlink in copy source');
 if(stat.isDirectory()){mkdirSync(destination);for(const name of readdirSync(source))materialize(join(source,name),join(destination,name));}
 else {assert.ok(stat.isFile(),'nonregular copy source');writeFileSync(destination,readFileSync(source),{flag:'wx'});}
}
const external=mkdtempSync(join(tmpdir(),'pseudo-disabled-caller-sentinel-'));
try{const sentinel=join(external,'sentinel'),fixture=join(tmp,'symlink-source');
 writeFileSync(sentinel,'caller-owned sentinel\n');mkdirSync(fixture);symlinkSync(sentinel,join(fixture,'linked'));
 assert.throws(()=>materialize(fixture,join(tmp,'rejected-copy')),/symlink in copy source/);
 assert.equal(readFileSync(sentinel,'utf8'),'caller-owned sentinel\n');
 const target=join(tmp,'package');materialize(nextRoot,target);
 for(const path of ['fesm2022/ngx-compat-material-legacy-legacy-core.mjs','fesm2022/ngx-compat-material-legacy-legacy-core.mjs.map','types/ngx-compat-material-legacy-legacy-core.d.ts','types/ngx-compat-material-legacy-legacy-core.d.ts.map','fesm2022/ngx-compat-material-legacy-legacy-tooltip.mjs','README.md']){const file=join(target,path),old=readFileSync(file);appendFileSync(file,'x');assert.equal(qualifyCombinedArtifactSubject(next,target),null,path);writeFileSync(file,old);rejected++;}
 const file=join(target,'README.md'),old=readFileSync(file);unlinkSync(file);symlinkSync(join(nextRoot,'README.md'),file);assert.equal(qualifyCombinedArtifactSubject(next,target),null);unlinkSync(file);writeFileSync(file,old);rejected++;assert.deepEqual(qualifyCombinedArtifactSubject(next,target),result);
 const isolated=join(tmp,'repo');mkdirSync(isolated);materialize('scripts',join(isolated,'scripts'));materialize('compatibility',join(isolated,'compatibility'));symlinkSync(resolve('node_modules'),join(isolated,'node_modules'),'dir'); const mod=await import(pathToFileURL(join(isolated,'scripts/api-combined-d70-image.mjs')).href);assert.deepEqual(mod.qualifyCombinedArtifactSubject(next),result);
 for(const name of ['transition.json','prior-0.gz','prior-1.gz','prior-2.gz','prior-3.gz','tagged-pseudo-checkbox.ts.gz']){const path=join(isolated,'compatibility/rc/qualification/api-combined-pseudo-disabled-v1',name),old=readFileSync(path);appendFileSync(path,'x');assert.equal(mod.qualifyCombinedArtifactSubject(next),null,name);writeFileSync(path,old);rejected++;}
 const parent=join(isolated,'compatibility/rc/qualification/api-combined-input-firstcheck-v1/transition.json'),parentBytes=readFileSync(parent);appendFileSync(parent,'x');assert.equal(mod.qualifyCombinedArtifactSubject(next),null);writeFileSync(parent,parentBytes);rejected++;
}finally{rmSync(tmp,{recursive:true,force:true});rmSync(external,{recursive:true,force:true});}
console.log(JSON.stringify({fixture_only:true,member_count:512,changed:4,unchanged:508,mutations_rejected:rejected,absolute_symlink_source_rejected:true,caller_sentinel_unchanged:true,closure_mutants_rejected:3,scope:'artifact identity and finite input transition only'}));

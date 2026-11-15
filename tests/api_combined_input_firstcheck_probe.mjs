/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {appendFileSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {isAbsolute, join, relative, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {qualifyCombinedArtifactSubject, qualifyCombinedD70Archive, API_COMBINED_D70_SHA, API_COMBINED_INPUT_FIRSTCHECK_SHA} from '../scripts/api-combined-d70-image.mjs';
const [priorTar,priorRoot,nextTar,nextRoot]=process.argv.slice(2).map(x=>resolve(x)),prior=readFileSync(priorTar),next=readFileSync(nextTar);
const d70Profile='combined-d70';
const result=qualifyCombinedArtifactSubject(next,nextRoot);assert.deepEqual(result,{profile:'combined-input-firstcheck',artifact_sha256:API_COMBINED_INPUT_FIRSTCHECK_SHA,predecessor_sha256:API_COMBINED_D70_SHA,member_count:512});
assert.equal(qualifyCombinedD70Archive(prior,priorRoot),true);assert.equal(qualifyCombinedD70Archive(next,nextRoot),false);assert.equal(qualifyCombinedArtifactSubject(prior,priorRoot).profile,d70Profile);
assert.equal(qualifyCombinedArtifactSubject(next,priorRoot),null);assert.equal(qualifyCombinedArtifactSubject(prior,nextRoot),null);
const corrupt=Buffer.from(next);corrupt[100]^=1;assert.equal(qualifyCombinedArtifactSubject(corrupt),null);
const tmp=mkdtempSync(join(tmpdir(),'input-firstcheck-image-'));let rejected=0;
// Never mutate a preserved symlink or hardlink from a caller's tree. Every
// destination is newly created below our own temporary directory.
function materialize(source,destination){
 const rel=relative(tmp,resolve(destination));
 assert.ok(rel && !isAbsolute(rel) && rel!=='..' && !rel.startsWith('..'+sep),'destination outside owned scratch');
 const stat=lstatSync(source);assert.equal(stat.isSymbolicLink(),false,'symlink in copy source');
 if(stat.isDirectory()){mkdirSync(destination);for(const name of readdirSync(source))materialize(join(source,name),join(destination,name));}
 else {assert.ok(stat.isFile(),'nonregular copy source');writeFileSync(destination,readFileSync(source),{flag:'wx'});}
}
const external=mkdtempSync(join(tmpdir(),'input-firstcheck-caller-sentinel-'));
try{const sentinel=join(external,'sentinel'),fixture=join(tmp,'symlink-source');
 writeFileSync(sentinel,'caller-owned sentinel\n');mkdirSync(fixture);symlinkSync(sentinel,join(fixture,'linked'));
 assert.throws(()=>materialize(fixture,join(tmp,'rejected-copy')),/symlink in copy source/);
 assert.equal(readFileSync(sentinel,'utf8'),'caller-owned sentinel\n');
 const target=join(tmp,'package');materialize(nextRoot,target);
 for(const path of ['fesm2022/ngx-compat-material-legacy-legacy-input.mjs','fesm2022/ngx-compat-material-legacy-legacy-input.mjs.map','types/ngx-compat-material-legacy-legacy-input.d.ts','types/ngx-compat-material-legacy-legacy-input.d.ts.map','fesm2022/ngx-compat-material-legacy-legacy-tooltip.mjs','README.md']){const file=join(target,path),old=readFileSync(file);appendFileSync(file,'x');assert.equal(qualifyCombinedArtifactSubject(next,target),null,path);writeFileSync(file,old);rejected++;}
 const file=join(target,'README.md'),old=readFileSync(file);unlinkSync(file);symlinkSync(join(nextRoot,'README.md'),file);assert.equal(qualifyCombinedArtifactSubject(next,target),null);unlinkSync(file);writeFileSync(file,old);rejected++;assert.deepEqual(qualifyCombinedArtifactSubject(next,target),result);
 const isolated=join(tmp,'repo');mkdirSync(isolated);materialize('scripts',join(isolated,'scripts'));materialize('compatibility',join(isolated,'compatibility'));symlinkSync(resolve('node_modules'),join(isolated,'node_modules'),'dir'); const mod=await import(pathToFileURL(join(isolated,'scripts/api-combined-d70-image.mjs')).href);assert.deepEqual(mod.qualifyCombinedArtifactSubject(next),result);
 for(const name of ['transition.json','prior-0.gz','prior-1.gz','prior-2.gz','prior-3.gz']){const path=join(isolated,'compatibility/rc/qualification/api-combined-input-firstcheck-v1',name),old=readFileSync(path);appendFileSync(path,'x');assert.equal(mod.qualifyCombinedArtifactSubject(next),null,name);writeFileSync(path,old);rejected++;}
 const parent=join(isolated,'compatibility/rc/qualification/api-combined-d70-v1/transition.json'),parentBytes=readFileSync(parent);appendFileSync(parent,'x');assert.equal(mod.qualifyCombinedArtifactSubject(next),null);writeFileSync(parent,parentBytes);rejected++;
}finally{rmSync(tmp,{recursive:true,force:true});rmSync(external,{recursive:true,force:true});}
console.log(JSON.stringify({fixture_only:true,member_count:512,changed:4,unchanged:508,mutations_rejected:rejected,absolute_symlink_source_rejected:true,caller_sentinel_unchanged:true,scope:'artifact identity and finite input transition only'}));

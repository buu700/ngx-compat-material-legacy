/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {qualifyApiV8Archive} from '../scripts/api-v8-artifact-successor.mjs';
import {exactMenuArtifact} from '../scripts/api-menu-artifact.mjs';

// Qualification is deliberately image-specific. Supply the independently packed
// artifact; this probe never builds an artifact or changes its expected bytes.
assert.equal(process.argv.length,4,'usage: node tests/api_v8_artifact_successor_probe.mjs <v8-tarball> <v7-tarball>');
const root=process.cwd(),archive=readFileSync(resolve(process.argv[2]));
assert.equal(qualifyApiV8Archive(archive),true);
for(const candidate of [Buffer.alloc(0),Buffer.concat([archive,Buffer.from(' ')]),Uint8Array.from(archive)]){
 assert.equal(qualifyApiV8Archive(candidate),false);
}
const mutated=Buffer.from(archive);mutated[Math.floor(mutated.length/2)]^=1;
assert.equal(qualifyApiV8Archive(mutated),false);

// A small independent filesystem fixture exercises the real physical reads.
// Git objects are read from this checkout; no historical program is executed.
const fixture=mkdtempSync(join(tmpdir(),'api-v8-image-controls-'));
const manifest='compatibility/rc/api-v8-exact-artifact-successor-v1.json';
const sources=['projects/ngx-material-legacy/legacy-tabs/internal/tab-base.ts','projects/ngx-material-legacy/legacy-tabs/tab-label.ts'];
try{
 const gitdir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();
 writeFileSync(join(fixture,'.git'),'gitdir: '+gitdir+'\n');
 for(const path of ['scripts/api-v8-artifact-successor.mjs',manifest,...sources]){
  mkdirSync(dirname(join(fixture,path)),{recursive:true});writeFileSync(join(fixture,path),readFileSync(join(root,path)));
 }
 const {qualifyApiV8Archive:qualify}=await import(pathToFileURL(join(fixture,'scripts/api-v8-artifact-successor.mjs')));
 assert.equal(qualify(archive),true);
 for(const path of [manifest,...sources]){
  const file=join(fixture,path),original=readFileSync(file);
  writeFileSync(file,Buffer.concat([original,Buffer.from(' ')]));
  assert.equal(qualify(archive),false,'changed physical '+path);
  writeFileSync(file,original);assert.equal(qualify(archive),true,'restored '+path);
 }
 const file=join(fixture,manifest),original=readFileSync(file),target=file+'.data';
 rmSync(file);writeFileSync(target,original);symlinkSync(target,file);
 assert.equal(qualify(archive),false,'linked manifest');
 rmSync(file);writeFileSync(file,original);assert.equal(qualify(archive),true);

 // Exercise the consumer's existing physical-member gate as well as the new
 // archive successor. Crossed old/current extraction must remain rejected.
 const extracted=[];
 for(const [index,tarball] of process.argv.slice(2).entries()){
  const packageRoot=join(fixture,'package-'+index);mkdirSync(packageRoot);
  const raw=gunzipSync(readFileSync(tarball));let offset=0,count=0;
  while(offset+512<=raw.length){
   const header=raw.subarray(offset,offset+512);offset+=512;if(header.every(v=>v===0))break;
   const field=(a,b)=>header.subarray(a,b).toString().replace(/\0.*$/s,'');
   const prefix=field(345,500),name=(prefix?prefix+'/':'')+field(0,100),size=parseInt(field(124,136).trim(),8);
   assert.match(name,/^package\/[a-zA-Z0-9_@.\/-]+$/);assert.ok(name.split('/').every(part=>part&&part!=='.'&&part!=='..'));assert.equal(header[156],48);assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+size<=raw.length);
   const member=join(packageRoot,name.slice(8));mkdirSync(dirname(member),{recursive:true});writeFileSync(member,raw.subarray(offset,offset+size),{flag:'wx'});offset+=Math.ceil(size/512)*512;count++;
  }
  assert.equal(count,512);const context={packageRoot,tarball:resolve(tarball)};
  assert.equal(exactMenuArtifact(context,packageRoot),true);extracted.push(context);
 }
 for(const [index,context] of extracted.entries())assert.equal(exactMenuArtifact({...context,tarball:extracted[1-index].tarball},context.packageRoot),false);
 const current=extracted[0],map=join(current.packageRoot,'fesm2022/ngx-compat-material-legacy-legacy-tabs.mjs.map'),mapBytes=readFileSync(map);
 writeFileSync(map,Buffer.concat([mapBytes,Buffer.from(' ')]));assert.equal(exactMenuArtifact(current,current.packageRoot),false);
 writeFileSync(map,mapBytes);assert.equal(exactMenuArtifact(current,current.packageRoot),true);
 console.log(JSON.stringify({result:'pass',archive_rejections:4,physical_rejections:3,linked_manifest_rejected:true,recovery:4,exact_extractions:2,crossed_extractions_rejected:2,modified_extraction_rejected:true,scope:'exact images only; no API, DI, behavior or release pass'}));
}finally{rmSync(fixture,{recursive:true,force:true});}

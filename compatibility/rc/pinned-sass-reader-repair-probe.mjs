/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Narrow physical-reader controls. No owner/verifier or Sass compilation call. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync,lstatSync,realpathSync,renameSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';

assert.equal(process.versions.node,'24.21.0');
assert.equal(process.argv.length,5,'usage: node probe.mjs <root> <21x|main> <new-output.json>');
const root=resolve(process.argv[2]),line=process.argv[3],output=resolve(process.argv[4]);
assert.ok(['21x','main'].includes(line));
const READER='scripts/historical-contract-repair-readers.mjs';
const EXPECTED_READER='ac290b85edcbd362cc01416ba75ac966f37669d76eefe1b0ceb353a217789871';
const SOURCE='scripts/upstream-selector-density-source-review.mjs';
const SOURCE_ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const ref=(path,raw)=>({path,sha256:hash(raw),bytes:raw.length});
const readerImage=readFileSync(join(root,READER));
assert.equal(hash(readerImage),EXPECTED_READER);
const verifierImage=readFileSync(join(SOURCE_ROOT,SOURCE));
const compilerSection=verifierImage.toString().match(/const COMPILER=\[([\s\S]*?)\n\];/);
assert.ok(compilerSection);
const compilerRefs=[...compilerSection[1].matchAll(/\{path:'([^']+)',sha256:'([0-9a-f]{64})',bytes:(\d+)\}/g)]
  .map(match=>({path:match[1],sha256:match[2],bytes:Number(match[3])}));
assert.deepEqual(compilerRefs,[
 {path:'node_modules/sass/package.json',sha256:'c6d07347951e35cf2fee0f4ffb14b9a298daba837d1f8d515d2e8cac064022a7',bytes:856},
 {path:'node_modules/sass/sass.node.js',sha256:'eb7a01ba57a04a0a421bdef0bf2f43558af4790b540a45501ec83900b07b0625',bytes:343},
 {path:'node_modules/sass/sass.dart.js',sha256:'30a2f37d9a2ee27d125681477ef5e1f3c29b446137921472bb9802f10d9e64e1',bytes:5675052},
]);
const {readHistoricalContractRepairOwnerMember:reader}=await import(pathToFileURL(join(root,READER)));
// This is the actual composed owner's public raw route. Importing the existing
// module initializes its Sass dependency; no compiler APIs/owner subjects run.
const {snackDomRawCurrentRead}=await import(pathToFileURL(join(root,'scripts/snack-dom-source-context.mjs')));
const {readHistoricalContractRepairMember:priorReader}=await import(pathToFileURL(join(root,'scripts/historical-contract-repair-source.mjs')));
const {readEvidenceMember}=await import(pathToFileURL(join(root,'scripts/upstream-packed-run-evidence.mjs')));
const routes=subject=>({direct:path=>reader(subject,path),public_raw:snackDomRawCurrentRead({root:subject})});
const rootPackage=readFileSync(join(root,'package.json'));
const expected=JSON.parse(rootPackage).devDependencies.sass;
assert.equal(expected,'1.104.1');
assert.equal(readFileSync(join(root,'.node-version'),'utf8').trim(),process.versions.node);
assert.equal(JSON.parse(readFileSync(join(root,'toolchain-lock.json'))).repository.node,process.versions.node);
assert.equal(lstatSync(join(root,'node_modules')).isSymbolicLink(),false);
assert.equal(lstatSync(join(root,'node_modules/sass')).isSymbolicLink(),true);
const actual=[],actualBytes=new Map();
for(const compiler of compilerRefs){
 const reads=[];
 for(const [route,read] of Object.entries(routes(root))){
  const raw=read(compiler.path);assert.ok(Buffer.isBuffer(raw));
  assert.equal(hash(raw),compiler.sha256);assert.equal(raw.length,compiler.bytes);
  assert.ok(raw.equals(readFileSync(join(root,compiler.path))));
  reads.push({route,...ref(compiler.path,raw)});actualBytes.set(compiler.path,raw);
 }
 assert.throws(()=>readEvidenceMember(root,compiler.path));
 actual.push({path:compiler.path,routes:reads,strict_generic_reader_still_rejects_linked_package:true});
}

function fixture(run,{regularPackage=false}={}){
 const temporary=mkdtempSync(join(tmpdir(),'pinned-sass-reader-repair-'));
 try{
  const subject=join(temporary,'root'),store=regularPackage?join(subject,'node_modules/sass'):join(temporary,'sass-package');
  mkdirSync(join(subject,'node_modules'),{recursive:true});mkdirSync(store,{recursive:true});
  if(!regularPackage)symlinkSync(store,join(subject,'node_modules/sass'),'dir');
  writeFileSync(join(subject,'package.json'),JSON.stringify({devDependencies:{sass:expected}}));
  writeFileSync(join(store,'package.json'),JSON.stringify({name:'sass',version:expected}));
  writeFileSync(join(store,'sass.node.js'),actualBytes.get('node_modules/sass/sass.node.js'));
  writeFileSync(join(store,'sass.dart.js'),'fixture data; never executed');
  mkdirSync(join(subject,'projects'),{recursive:true});writeFileSync(join(subject,'projects/regular.ts'),'export const fixture = 1;\n');
  return run({temporary,subject,store,readers:routes(subject)});
 }finally{rmSync(temporary,{recursive:true,force:true});}
}
const controls=[];
function rejects(id,arrange,paths=['node_modules/sass/sass.node.js']){
 fixture(state=>{
  arrange(state);const observations=[];
  for(const path of paths)for(const [route,read] of Object.entries(state.readers)){
   let error;try{read(path);}catch(caught){error=caught;}
   assert.ok(error,`${id}: ${route} unexpectedly accepted ${path}`);
   observations.push({route,path,rejected:true,error_name:error.name});
  }
  controls.push({id,observations});
 });
}
function replaceWithLink(path,target){renameSync(path,target);symlinkSync(target,path);}
rejects('linked-package-manifest',s=>replaceWithLink(join(s.store,'package.json'),join(s.temporary,'manifest.json')),compilerRefs.map(row=>row.path));
rejects('linked-sass-node-file',s=>replaceWithLink(join(s.store,'sass.node.js'),join(s.temporary,'node.js')));
rejects('linked-sass-dart-file',s=>replaceWithLink(join(s.store,'sass.dart.js'),join(s.temporary,'dart.js')),['node_modules/sass/sass.dart.js']);
rejects('linked-node-modules-container',s=>replaceWithLink(join(s.subject,'node_modules'),join(s.temporary,'modules')),compilerRefs.map(row=>row.path));
rejects('linked-root-manifest',s=>replaceWithLink(join(s.subject,'package.json'),join(s.temporary,'root-package.json')));
rejects('manifest-directory',s=>{rmSync(join(s.store,'package.json'));mkdirSync(join(s.store,'package.json'));});
rejects('target-directory',s=>{rmSync(join(s.store,'sass.node.js'));mkdirSync(join(s.store,'sass.node.js'));});
rejects('wrong-package-name',s=>writeFileSync(join(s.store,'package.json'),JSON.stringify({name:'sass-embedded',version:expected})));
rejects('wrong-package-version',s=>writeFileSync(join(s.store,'package.json'),JSON.stringify({name:'sass',version:'1.104.0'})));
for(const pin of ['^1.104.1','~1.104.1','1.104.1-beta.1','workspace:1.104.1','*',1041]){
 rejects('nonexact-root-pin-'+String(pin),s=>writeFileSync(join(s.subject,'package.json'),JSON.stringify({devDependencies:{sass:pin}})));
}
rejects('missing-root-pin',s=>writeFileSync(join(s.subject,'package.json'),JSON.stringify({devDependencies:{}})));
rejects('path-escapes-and-nonliteral-alias-paths',()=>{},[
 '../package.json','node_modules/sass/../sass/sass.node.js','node_modules/sass/./sass.node.js',
 'node_modules/sass//sass.node.js','/node_modules/sass/sass.node.js','node_modules\\sass\\sass.node.js',
]);
rejects('other-linked-sass-descendants',s=>{
 writeFileSync(join(s.store,'other.js'),'other');mkdirSync(join(s.store,'nested'));writeFileSync(join(s.store,'nested/sass.node.js'),'nested');
},['node_modules/sass/other.js','node_modules/sass/nested/sass.node.js','node_modules/sass/sass.default.js','node_modules/sass/package.json/extra']);
rejects('ordinary-source-symlink-unchanged',s=>replaceWithLink(join(s.subject,'projects/regular.ts'),join(s.temporary,'regular.ts')),['projects/regular.ts']);

const positives=[];
fixture(s=>{
 for(const [route,read]of Object.entries(s.readers)){
  assert.ok(read('node_modules/sass/sass.node.js').equals(actualBytes.get('node_modules/sass/sass.node.js')));
  assert.equal(read('projects/regular.ts').toString(),'export const fixture = 1;\n');
  positives.push({id:'linked-package-root-and-regular-source',route,passed:true});
 }
});
fixture(s=>{
 for(const path of compilerRefs.map(row=>row.path))for(const [route,read]of Object.entries(s.readers)){
  assert.ok(Buffer.isBuffer(read(path)));positives.push({id:'regular-package-root',route,path,passed:true});
 }
 writeFileSync(join(s.store,'other.js'),'ordinary regular file');
 for(const [route,read]of Object.entries(s.readers)){
  assert.ok(read('node_modules/sass/other.js').equals(priorReader(s.subject,'node_modules/sass/other.js')));
  positives.push({id:'generic-unlinked-regular-file-behavior-unchanged',route,passed:true});
 }
},{regularPackage:true});
const identityVersusContent=[];
fixture(s=>{
 const path='node_modules/sass/sass.node.js',expectedRef=compilerRefs.find(row=>row.path===path);
 const tampered=Buffer.from(actualBytes.get(path));tampered[0]^=1;writeFileSync(join(s.store,'sass.node.js'),tampered);
 for(const [route,read]of Object.entries(s.readers)){
  const raw=read(path);assert.ok(raw.equals(tampered));assert.equal(raw.length,expectedRef.bytes);
  assert.throws(()=>assert.equal(hash(raw),expectedRef.sha256));
  identityVersusContent.push({route,reader_accepts_same_version_regular_file:true,
   unchanged_pinned_sha_check_rejects_same_length_tamper:true,compiler_executed:false});
 }
});
assert.equal(hash(readFileSync(join(root,READER))),EXPECTED_READER);
assert.ok(readFileSync(join(SOURCE_ROOT,SOURCE)).equals(verifierImage));
assert.ok(readFileSync(join(root,'package.json')).equals(rootPackage));
for(const compiler of compilerRefs){const raw=reader(root,compiler.path);assert.equal(hash(raw),compiler.sha256);assert.equal(raw.length,compiler.bytes);}
const report={schema_version:1,line,kind:'independent-pinned-sass-physical-reader-controls',
 root,node:process.versions.node,reader:ref(READER,readerImage),compiler_reference_source:{root:SOURCE_ROOT,...ref(SOURCE,verifierImage)},
 compiler_references:compilerRefs,actual_compiler_package_root:realpathSync(join(root,'node_modules/sass')),
 actual_file_reads:actual,positive_controls:positives,negative_controls:controls,
 rejected_negative_cases:controls.length,rejected_route_path_observations:controls.flatMap(row=>row.observations).length,
 identity_versus_content:identityVersusContent,passed:true,correctness_blockers:[],
 scope:'Three-file package-root symlink exception and identity/version guards only. Generic regular-file behavior remains unchanged. The reader does not authenticate arbitrary same-version compiler bytes; the source verifier separately retains exact SHA256/size checks.',
 actual_snack_public_raw_callback_exercised:true,disposable_fixture_cleanup:true,
 sass_module_initialized_by_transitive_import:true,sass_compilation_apis_invoked:false,
 full_owner_or_source_verifier_invoked:false,real_dependency_tree_mutated:false,
 actual_native_packed_browser_floor_or_full_audit_qualified:false,g11_claim:'not-passed'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({line,result:'pass',real_compiler_files:actual.length,
 negative_cases:controls.length,rejected_route_path_observations:report.rejected_route_path_observations,
 positive_route_observations:positives.length,actual_snack_public_raw_callback:true,sass_compilation:false}));

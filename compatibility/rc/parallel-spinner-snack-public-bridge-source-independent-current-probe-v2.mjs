import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const primary=resolve(new URL('../..',import.meta.url).pathname),prefix='compatibility/rc/parallel-spinner-snack-public-bridge-source-independent-';
const sourcePath='compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-subject.mjs';
const packetPath='compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const ref=(root,path)=>{const raw=readFileSync(join(root,path));return {path,sha256:hash(raw),bytes:raw.length};};
const sources=ref(primary,sourcePath),inputs=ref(primary,packetPath);
const packet=JSON.parse(readFileSync(join(primary,packetPath)));
const {currentSpinnerSnackBridgeSourceSubject}=await import(pathToFileURL(join(primary,sourcePath)));
const roots={'21.x':primary,main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'};
const rows=[];
for(const [line,root]of Object.entries(roots)){
 const file=path=>readFileSync(join(root,path));let poison=null;
 const read=path=>{const raw=file(path);return poison===path?Buffer.concat([raw,Buffer.from('invalid')]):raw;};
 assert.deepEqual(ref(root,sourcePath),sources);assert.deepEqual(ref(root,packetPath),inputs);
 const scope=currentSpinnerSnackBridgeSourceSubject({root,read}),branch=packet.branches[line],checks=[];
 const check=(name,fn)=>{fn();checks.push(name);},reject=(name,fn)=>{assert.throws(fn);checks.push(name);};
 assert.equal(scope.line,line);assert.equal(scope.fresh_sass_compilation_this_call,false);
 for(const module of branch.modules){
  for(const side of ['before','current']){
   check(module.family+' exact '+side+' metadata reference qualifies',()=>assert.deepEqual(scope.qualify({path:module.path,sha256:module[side].sha256,bytes:module[side].bytes}),module.current));
  }
  check(module.family+' optional-size metadata reference qualifies',()=>assert.deepEqual(scope.qualify({path:module.path,sha256:module.before.sha256}),{path:module.path,sha256:module.current.sha256}));
  reject(module.family+' unknown hash rejects',()=>scope.qualify({path:module.path,sha256:'0'.repeat(64),bytes:module.before.bytes}));
  reject(module.family+' wrong size rejects',()=>scope.qualify({path:module.path,sha256:module.before.sha256,bytes:module.before.bytes+1}));
  const old=execFileSync('git',['--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0','show',branch.before_commit+':'+module.path],
   {cwd:root,maxBuffer:2*1024*1024,env:{PATH:process.env.PATH,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'}});
  check(module.family+' historical comparison authenticates exact old source',()=>assert.equal(scope.assertHistoricalSource(module.path,old).exact_historical_comparison,true));
  reject(module.family+' changed historical comparison rejects',()=>scope.assertHistoricalSource(module.path,Buffer.concat([old,Buffer.from('changed')])));
  reject(module.family+' cold old-product callback rejects',()=>currentSpinnerSnackBridgeSourceSubject({root,read:path=>path===module.path?Buffer.from(old):file(path)}));
 }
 check('qualifier scope remains exactly two product paths',()=>{
  for(const path of ['projects/ngx-material-legacy/legacy-progress-spinner/_progress-spinner-theme.scss',
   'projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_snack-bar.scss','scripts/check-upstream-audit-disposition.mjs'])assert.equal(scope.qualify({path,sha256:'0'.repeat(64),bytes:1}),null);
 });
 check('returned metadata cannot alter retained source judgments',()=>{
  scope.bound[0].sha256='0'.repeat(64);scope.transitions[0].current.sha256='0'.repeat(64);
  assert.deepEqual(scope.qualify({path:branch.modules[0].path,sha256:branch.modules[0].before.sha256,bytes:branch.modules[0].before.bytes}),branch.modules[0].current);
  scope.assertCurrent();
 });
 check('no current or historical product read callback exported',()=>{
  for(const key of ['read','raw','comparisonRead','beforeRead','historicalRead','beforeSources','beforeBytes'])assert.equal(Object.hasOwn(scope,key),false);
 });
 const targets=[packetPath,branch.modules[0].path,
  'projects/ngx-material-legacy/styles/core/tokens/m2/mdc/_snack-bar.scss',
  'node_modules/@angular/material/_index.scss','node_modules/@angular/material/snack-bar/_snack-bar-theme.scss',
  'node_modules/sass/sass.dart.js',branch.semantic_receipt.path,'node_modules/@angular/material/package.json'];
 for(const path of targets){poison=path;reject('late nonphysical callback rejects '+path,()=>scope.assertCurrent());poison=null;scope.assertCurrent();}
 checks.push('restored callbacks accepted after every late mutation');
 const foreign=roots[line==='21.x'?'main':'21.x'];
 reject('cross-line manifest callback rejects',()=>currentSpinnerSnackBridgeSourceSubject({root,read:path=>path==='projects/ngx-material-legacy/package.json'?readFileSync(join(foreign,path)):file(path)}));
 rows.push({line,checks,checks_passed:checks.length,bound_inputs:scope.bound.length,
  compiled_receipt_loaded_sources:scope.compiled_source_inputs,authenticated_unchanged_owned_sources:scope.unchanged_owned_sass_authenticated_against_before_commit});
}
assert.deepEqual(ref(primary,sourcePath),sources);assert.deepEqual(ref(primary,packetPath),inputs);
const result={schema_version:1,status:'both-current-source-subjects-and-focused-callback-controls-pass',source:sources,packet:inputs,rows,
 evidence_kind:'Current source/Git/receipt guards and metadata-only qualification. No Sass compilation, Angular/build, rendered/native/floor, full matrix or full owner execution.',
 mutations:'Callback buffers, historical comparison argument and returned metadata clones only; no existing physical files changed.',existing_shared_files_edited:false};
const output=prefix+'current-result-v2.json';writeFileSync(join(primary,output),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:ref(primary,output),checks:rows.map(row=>({line:row.line,passed:row.checks_passed,bound:row.bound_inputs}))}));

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {createHash} from 'node:crypto';
import {resolve,join,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
const primary=resolve(new URL('../..',import.meta.url).pathname),prefix='compatibility/rc/parallel-spinner-snack-public-bridge-source-independent-';
const sourcePath='compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-subject.mjs';
const packetPath='compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json';
const version=process.argv[2]??'v1';assert.match(version,/^[a-z0-9-]+$/);
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const fileRef=(root,path)=>{const raw=fs.readFileSync(join(root,path));return {path,sha256:hash(raw),bytes:raw.length};};
const sourceRef=fileRef(primary,sourcePath),packetRef=fileRef(primary,packetPath);
const packet=JSON.parse(fs.readFileSync(join(primary,packetPath)));
const roots={'21.x':primary,main:'/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy'};
const {currentSpinnerSnackBridgeSourceSubject}=await import(pathToFileURL(join(primary,sourcePath)));
const rows=[];
for(const [line,root]of Object.entries(roots)){
 const original=currentSpinnerSnackBridgeSourceSubject({root}),branch=packet.branches[line];
 const view=fs.mkdtempSync(join(primary,prefix+'relocated-'+version+'-'));
 let copiedBytes=0;
 try{
  for(const item of original.bound){
   const destination=resolve(view,item.path);assert.ok(destination.startsWith(view+sep));
   fs.mkdirSync(dirname(destination),{recursive:true});fs.copyFileSync(join(root,item.path),destination);copiedBytes+=item.bytes;
  }
  const capturedOrigins=Object.values(roots),saved={readFileSync:fs.readFileSync,lstatSync:fs.lstatSync,realpathSync:fs.realpathSync};
  const attempts=[];
  function forbidden(path){
   if(typeof path!=='string'&&!Buffer.isBuffer(path))return false;
   const value=resolve(String(path));
   if(value===view||value.startsWith(view+sep))return false;
   return capturedOrigins.some(origin=>value===origin||value.startsWith(origin+sep));
  }
  for(const name of Object.keys(saved))fs[name]=function(path,...rest){
   if(forbidden(path)){attempts.push({operation:name,path:String(path)});throw new Error('captured-origin filesystem access forbidden: '+name);}
   return saved[name].call(this,path,...rest);
  };
  syncBuiltinESMExports();
  let relocated=null,error=null;
  try{
   // Demonstrate that the tripwire is live, then clear the intentional event.
   assert.throws(()=>fs.realpathSync(join(root,branch.modules[0].path)),/captured-origin filesystem access forbidden/);attempts.length=0;
   const current=currentSpinnerSnackBridgeSourceSubject({root:view});
   assert.equal(current.root,view);assert.equal(current.line,line);current.assertCurrent();
   for(const module of branch.modules)assert.deepEqual(current.qualify({path:module.path,sha256:module.before.sha256,bytes:module.before.bytes}),module.current);
   assert.equal(attempts.length,0,'subject touched a captured receipt filesystem path');
   relocated={accepted:true,line:current.line,bound:current.bound.length,loaded:current.compiled_source_inputs,
    unchanged_owned:current.unchanged_owned_sass_authenticated_against_before_commit,qualifies_both_old_refs:true};
  }catch(thrown){error={name:thrown.name,message:thrown.message};}
  finally{for(const[name,fn]of Object.entries(saved))fs[name]=fn;syncBuiltinESMExports();}
  rows.push({line,copied_regular_inputs:original.bound.length,copied_bytes:copiedBytes,
   original_receipt_origin:JSON.parse(fs.readFileSync(join(root,branch.semantic_receipt.path))).root,
   relocation_is_distinct:root!==view,captured_origin_fs_attempts:attempts,relocated,error});
 }finally{fs.rmSync(view,{recursive:true,force:true});}
}
assert.deepEqual(fileRef(primary,sourcePath),sourceRef);assert.deepEqual(fileRef(primary,packetPath),packetRef);
const result={schema_version:1,status:rows.every(row=>row.relocated?.accepted)?'both-relocated-source-views-pass-with-captured-filesystem-forbidden':'relocated-source-view-rejection-reproduced',
 source:sourceRef,packet:packetRef,rows,
 evidence_scope:'Actual public source subject on copied regular current inputs under a distinct root. Git reads use the enclosing repository immutable objects. fs read/lstat/realpath tripwires forbid every captured-origin path outside the relocated view.',
 new_compiler_build_browser_native_floor_matrix_owner_execution:false,existing_files_changed:false,
 scratch:'Only fresh directories under the owned new prefix were created and removed.'};
const output=prefix+'relocated-result-'+version+'.json';fs.writeFileSync(join(primary,output),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:fileRef(primary,output),status:result.status,rows:rows.map(row=>({line:row.line,accepted:row.relocated?.accepted??false,captured_fs_attempts:row.captured_origin_fs_attempts.length,error:row.error?.message}))}));

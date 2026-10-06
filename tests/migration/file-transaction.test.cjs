const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {tmpdir} = require('node:os');
const {join} = require('node:path');
const {createHash} = require('node:crypto');
const {applyFileTransaction} = require('../../scripts/migrate-cli-bundle/transaction-write.js');
function fixture(run) {
  const base=fs.mkdtempSync(join(tmpdir(),'migration-transaction-regression-'));
  const records=Array.from({length:3},(_,i)=>({path:join(base,i+'.ts'),original:'// original '+i+'\r\n',content:'// migrated '+i+'\r\n',applied:false}));
  for(const record of records)fs.writeFileSync(record.path,record.original,{mode:0o640});
  const rename=fs.renameSync,write=fs.writeFileSync;
  try{return run(base,records);}finally{fs.renameSync=rename;fs.writeFileSync=write;fs.rmSync(base,{recursive:true,force:true});}
}
function unchanged(records){for(const r of records)assert.equal(fs.readFileSync(r.path,'utf8'),r.original);}
function temporaryFiles(base){return fs.readdirSync(base).filter(name=>name.startsWith('.migrate-legacy-'));}
test('successful replacement preserves exact bytes and modes; no temporary files remain',()=>fixture((base,records)=>{
 const result=applyFileTransaction(records);assert.equal(result.status,'committed');assert.equal(result.applied,3);
 for(const r of records){assert.equal(fs.readFileSync(r.path,'utf8'),r.content);assert.equal(fs.statSync(r.path).mode&0o777,0o640);}
 assert.deepEqual(temporaryFiles(base),[]);
}));
test('partial staging write failure never changes source files',()=>fixture((base,records)=>{
 const write=fs.writeFileSync;let calls=0;
 fs.writeFileSync=(target,data,...args)=>{if(typeof target==='number'&&++calls===3){write(target,'partial');throw Object.assign(new Error('disk full'),{code:'ENOSPC'});}return write(target,data,...args);};
 const result=applyFileTransaction(records);assert.equal(result.status,'refused');assert.equal(result.applied,0);unchanged(records);assert.deepEqual(temporaryFiles(base),[]);
}));
test('failure after two real replacements restores every original and permits retry',()=>fixture((base,records)=>{
 const rename=fs.renameSync;let calls=0;
 fs.renameSync=(from,to)=>{if(from.endsWith('-stage')&&++calls===3){assert.equal(fs.readFileSync(records[0].path,'utf8'),records[0].content);assert.equal(fs.readFileSync(records[1].path,'utf8'),records[1].content);throw Object.assign(new Error('injected EIO'),{code:'EIO'});}return rename(from,to);};
 const result=applyFileTransaction(records);assert.equal(result.status,'rolled-back');assert.equal(result.committed_before_failure,2);assert.equal(result.rolled_back,true);assert.equal(result.applied,0);unchanged(records);assert.deepEqual(temporaryFiles(base),[]);
 fs.renameSync=rename;assert.equal(applyFileTransaction(records).status,'committed');
}));
test('recovery preserves a newer edit and retains its authenticated original backup',()=>fixture((base,records)=>{
 const rename=fs.renameSync;let calls=0;const external=records[0].content+'// parallel edit\n';
 fs.renameSync=(from,to)=>{if(from.endsWith('-stage')&&++calls===3){fs.writeFileSync(records[0].path,external);throw Object.assign(new Error('injected EIO'),{code:'EIO'});}return rename(from,to);};
 const result=applyFileTransaction(records);assert.equal(result.status,'recovery-required');assert.equal(result.applied,1);assert.equal(result.rolled_back,false);assert.equal(fs.readFileSync(records[0].path,'utf8'),external);
 unchanged(records.slice(1));assert.equal(result.recovery_files.length,1);const recovery=result.recovery_files[0];assert.equal(recovery.path,records[0].path);assert.equal(fs.readFileSync(recovery.backup,'utf8'),records[0].original);assert.equal(recovery.original_sha256,createHash('sha256').update(records[0].original).digest('hex'));assert.equal(temporaryFiles(base).length,1);
}));
test('a filesystem refusal during rollback leaves exact recovery backups instead of claiming restoration',()=>fixture((base,records)=>{
 const rename=fs.renameSync;let calls=0;
 fs.renameSync=(from,to)=>{if(from.endsWith('-backup')||(from.endsWith('-stage')&&++calls===3))throw Object.assign(new Error('injected EIO'),{code:'EIO'});return rename(from,to);};
 const result=applyFileTransaction(records);assert.equal(result.status,'recovery-required');assert.equal(result.applied,2);assert.equal(result.rolled_back,false);assert.equal(result.recovery_files.length,2);
 for(const backup of result.recovery_files){const original=records.find(r=>r.path===backup.path);assert.equal(fs.readFileSync(backup.backup,'utf8'),original.original);}
 assert.equal(temporaryFiles(base).length,2);
}));
test('read-only, hard-linked and symbolic sources are refused without changing either target',()=>fixture((base,records)=>{
 fs.chmodSync(records[2].path,0o440);assert.equal(applyFileTransaction(records).status,'refused');unchanged(records);assert.deepEqual(temporaryFiles(base),[]);fs.chmodSync(records[2].path,0o640);
 const alias=join(base,'alias.ts');fs.linkSync(records[2].path,alias);assert.equal(applyFileTransaction(records).status,'refused');unchanged(records);fs.unlinkSync(alias);
 fs.symlinkSync(records[2].path,alias);const linked={...records[2],path:alias};assert.equal(applyFileTransaction([linked]).status,'refused');unchanged(records);assert.deepEqual(temporaryFiles(base),[]);
}));

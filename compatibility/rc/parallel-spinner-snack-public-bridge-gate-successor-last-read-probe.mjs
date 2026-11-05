/** Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE. */
/** Owned copied source fixture only; no protected source or compiler changes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {historicalContractRepairReaderSubject} from '../../scripts/historical-contract-repair-readers.mjs';
const root=process.cwd(),P='compatibility/rc/parallel-spinner-snack-public-bridge-gate-successor-',read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),source=historicalContractRepairReaderSubject({root,read}),target=source.bound.at(-1).path,fixture=mkdtempSync(join(root,P+'last-read-fixture-'));
try{
 for(const ref of source.bound){const out=join(fixture,ref.path);mkdirSync(dirname(out),{recursive:true});copyFileSync(join(root,ref.path),out);}
 let armed=false,changed=false;
 const callback=p=>{const raw=readFileSync(join(fixture,p));if(armed&&p===target){armed=false;changed=true;writeFileSync(join(fixture,p),Buffer.concat([raw,Buffer.from('\n/* after physical snapshot */')]));}return raw;};
 const subject=historicalContractRepairReaderSubject({root:fixture,read:callback}),before=readFileSync(join(fixture,target));armed=true;let accepted=true;try{subject.assertCurrent();}catch{accepted=false;}
 assert.equal(changed,true);const after=readFileSync(join(fixture,target));assert.notEqual(hash(before),hash(after));let nextRejected=false;try{subject.assertCurrent();}catch{nextRejected=true;}
 const out={schema_version:1,role:'Owned-fixture last-read source snapshot control',target,accepted_guard_during_callback_source_change:accepted,subsequent_guard_rejects:nextRejected,callback_returned_genuine_bytes_read_before_its_fixture_mutation:true,real_inputs_mutated:false,protected_reader_sha256:hash(read('scripts/historical-contract-repair-readers.mjs')),compiler_executed:false,g11_claim:'not-passed'};writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(out));
}finally{rmSync(fixture,{recursive:true});}

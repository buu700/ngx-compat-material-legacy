/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {historicalConsumerChild} from '../scripts/historical-consumer-child.mjs';
const temporary=mkdtempSync(join(tmpdir(),'ngx-consumer-child-control-'));
try{
  const success=historicalConsumerChild(process.execPath,['-e','process.stdout.write("complete")'],{timeout:5000,env:process.env});
  assert.equal(success.status,0);assert.equal(success.stdout,'complete');
  const target=join(temporary,'children.json');
  const code=`const {spawn}=require('node:child_process');const fs=require('node:fs');
const child=spawn(process.execPath,['-e','setInterval(()=>{},10000)'],{stdio:'ignore'});
fs.writeFileSync(process.argv[1],JSON.stringify([process.pid,child.pid]));setInterval(()=>{},10000);`;
  const timed=historicalConsumerChild(process.execPath,['-e',code,target],{timeout:1000,env:process.env});
  assert.equal(timed.error?.code,'ETIMEDOUT');const pids=JSON.parse(readFileSync(target));assert.equal(pids.length,2);
  const live=pid=>{try{const stat=readFileSync('/proc/'+pid+'/stat','utf8');return !['Z','X'].includes(stat.split(') ')[1][0]);}catch(error){if(error.code==='ENOENT')return false;throw error;}};
  for(let attempt=0;attempt<50&&pids.some(live);attempt++)await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(pids.some(live),false,'timed replay descendants still running');
  console.log(JSON.stringify({schema_version:1,successful_child_preserved:true,timeout_detected:true,
    timed_child_and_grandchild_stopped:true,wrapper_timeouts_extended:false,current_source_or_native_qualified:false}));
}finally{rmSync(temporary,{recursive:true,force:true});}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** A timed-out replay must not leave its source-test descendants running. */
import {spawnSync} from 'node:child_process';
export function historicalConsumerChild(command,args,{cwd,env,timeout}={}){
  const result=spawnSync(command,args,{cwd,env,timeout,killSignal:'SIGKILL',detached:true,encoding:'utf8',maxBuffer:4*1024*1024});
  if(result.pid&&(result.error||result.signal||result.status!==0)){
    try{process.kill(-result.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}
  }
  return result;
}

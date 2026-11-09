/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** Exercise the probe's actual lifecycle functions using only isolated child scripts. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./browser_reference_source_probe.mjs',import.meta.url),'utf8');
const stopStart=source.indexOf('async function stopColdPool('),guardStart=source.indexOf('function requireWorkerParent('),argsStart=source.indexOf('const args=process.argv',guardStart);
assert.ok(stopStart>=0&&guardStart>stopStart&&argsStart>guardStart);
const stopColdPool=eval('('+source.slice(stopStart,guardStart).trim()+')');
const guard=source.slice(guardStart,argsStart).trim();
function owned(script,ipc=false){
 const child=spawn(process.execPath,['-e',script],{stdio:['ignore','pipe','pipe',...(ipc?['ipc']:[])]});
 child.stdout.resume();child.stderr.resume();
 const finished=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',(code,signal)=>resolve({code,signal}));});
 return {child,finished};
}
function line(child){return new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('close',()=>reject(Error('closed before ready')));});}
const stubborn=owned("process.on('SIGTERM',()=>{});console.log('ready');setInterval(()=>{},1000)");
await line(stubborn.child);await stopColdPool([stubborn]);assert.equal((await stubborn.finished).signal,'SIGKILL');
const bad=owned('process.exit(7)'),hanging=owned("process.on('SIGTERM',()=>{});console.log('ready');setInterval(()=>{},1000)");
await line(hanging.child);assert.equal((await bad.finished).code,7);await stopColdPool([bad,hanging]);assert.equal((await hanging.finished).signal,'SIGKILL');
const guardScript="const assert=require('node:assert/strict');"+guard+";requireWorkerParent();process.send('ready');setInterval(()=>{},1000);";
const isolated=owned(guardScript);assert.notEqual((await isolated.finished).code,0);
const successScript="const assert=require('node:assert/strict');"+guard+";const lost=requireWorkerParent();process.stdout.write('complete\\n',()=>{process.removeListener('disconnect',lost);process.disconnect()});";
const success=owned(successScript,true);const successLine=(await line(success.child)).toString();assert.equal(successLine,'complete\n');assert.equal((await success.finished).code,0);
const worker=owned(guardScript,true);
await new Promise((resolve,reject)=>{worker.child.once('message',resolve);worker.child.once('error',reject);});
const exited=new Promise(resolve=>worker.child.once('exit',(code,signal)=>resolve({code,signal})));
worker.child.disconnect();const result=await exited;assert.equal(result.code,1);
// A separate parent is forcibly killed; its IPC child must notice channel loss.
const childScript="const assert=require('node:assert/strict');"+guard+";requireWorkerParent();process.send(process.pid);setInterval(()=>{},1000);";
const parentScript="const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e',"+JSON.stringify(childScript)+"],{stdio:['ignore','ignore','ignore','ipc']});c.on('message',pid=>console.log(pid));setInterval(()=>{},1000);";
const parent=owned(parentScript);const childPid=Number((await line(parent.child)).toString().trim());assert.ok(Number.isSafeInteger(childPid)&&childPid>1);
let gone=false;
try{
 parent.child.kill('SIGKILL');assert.equal((await parent.finished).signal,'SIGKILL');
 for(let i=0;i<100;i++){
  try{const stat=readFileSync('/proc/'+childPid+'/stat','utf8');if(stat.slice(stat.lastIndexOf(')')+2).startsWith('Z')){gone=true;break;}}
  catch(error){if(error.code==='ENOENT'){gone=true;break;}throw error;}
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 assert.ok(gone,'IPC child survived killed parent');
}finally{if(!gone)try{process.kill(childPid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}}
console.log(JSON.stringify({result:'pass'}));

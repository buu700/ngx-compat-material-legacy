/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {spawn} from 'node:child_process';
import {mkdtempSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function observeChromium(origin,startPath,baseDir,bin) {
 mkdirSync(baseDir,{recursive:true});const profile=mkdtempSync(join(baseDir,'overlay-browser-'));
 const child=spawn(bin,['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--disable-gpu','about:blank'],{stdio:['ignore','ignore','pipe']});let log='';child.stderr.on('data',d=>log+=d);child.on('error',()=>{});
 let socket;
 try {
  let endpoint;for(let i=0;i<100;i++){let m=log.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:(\d+)\/devtools\/browser\/[a-f0-9-]+)/i);if(m){endpoint={url:m[1],port:+m[2]};break}if(child.exitCode!==null)throw Error('browser exited: '+log.slice(-500));await sleep(100)}
  if(!endpoint)throw Error('browser endpoint absent: '+log.slice(-500));
  const res=await fetch(`http://127.0.0.1:${endpoint.port}/json/version`);const v=await res.json();if(v.webSocketDebuggerUrl!==endpoint.url||!/^Chrome\/\d+\./.test(v.Browser))throw Error('browser endpoint identity mismatch');
  socket=new WebSocket(endpoint.url);await new Promise((yes,no)=>{socket.onopen=yes;socket.onerror=no});let seq=0,pending=new Map();socket.onmessage=e=>{const x=JSON.parse(e.data);const wait=pending.get(x.id);if(wait){pending.delete(x.id);x.error?wait.reject(Error(JSON.stringify(x.error))):wait.resolve(x.result)}};
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{let id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}))});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Runtime.enable',{},sessionId);await send('Page.enable',{},sessionId);
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails).slice(0,500));return r.result?.value};
  await send('Page.navigate',{url:origin+startPath},sessionId);let ready=false;for(let i=0;i<120;i++){if(await evaluate("document.documentElement?.dataset.ready==='yes'")){ready=true;break}await sleep(50)}if(!ready)throw Error('fixture not ready: '+await evaluate('document.body.innerText'));
  await evaluate("window.probe.execute().then(x=>window.result=x).catch(e=>window.result={error:String(e),stack:e.stack})");let result;for(let i=0;i<120;i++){result=await evaluate('window.result||null');if(result)break;await sleep(50)}if(!result||result.error)throw Error('fixture failed: '+JSON.stringify(result));
  return {browser:{product:v.Browser,protocol:'cdp'},result};
 } finally {socket?.close();child.kill();}
}

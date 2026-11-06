/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync, writeFileSync, chmodSync, readFileSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {withChromium} from '../scripts/check-companion-computed-styles.mjs';
const dir=mkdtempSync(join(tmpdir(),'ccs-process-control-'));
process.on('exit',()=>rmSync(dir,{recursive:true,force:true}));
writeFileSync(join(dir,'index.html'),'test');
const test=async (name, fn) => {const t=Date.now();await fn();console.log(JSON.stringify({name,pass:true,ms:Date.now()-t}));};
const unusedPort=async()=>{const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));return port;};
const mustClose=async file => {const url=readFileSync(file,'utf8');await assert.rejects(fetch(url,{signal:AbortSignal.timeout(500)}));};
await test('early-exit-child',async()=>{
 const file=join(dir,'early-url'),bin=join(dir,'early');
 writeFileSync(bin,`#!/bin/sh\nfor last do :; done\nprintf %s "$last" > '${file}'\nexit 7\n`);chmodSync(bin,0o755);process.env.CHROME_BIN=bin;
 let calls=0;await assert.rejects(withChromium(dir,async()=>{calls++;},{debugPort:await unusedPort()}),/did not open debugging port/);assert.equal(calls,0);await mustClose(file);
});
await test('spawn-permission-denied',async()=>{
 const bin=join(dir,'non-executable');writeFileSync(bin,'#!/bin/sh\nexit 0\n');chmodSync(bin,0o644);process.env.CHROME_BIN=bin;
 let calls=0;await assert.rejects(withChromium(dir,async()=>{calls++;},{debugPort:await unusedPort()}),/EACCES/);assert.equal(calls,0);
});
await test('foreign-debug-port-no-owned-target',async()=>{
 const server=createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(req.url==='/json/version'?{Browser:'foreign',webSocketDebuggerUrl:'ws://127.0.0.1:1/never'}:[{id:'foreign',type:'page',url:'http://foreign.invalid/',webSocketDebuggerUrl:'ws://127.0.0.1:1/never'}]));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const file=join(dir,'foreign-url'),bin=join(dir,'long');writeFileSync(bin,`#!/bin/sh\nfor last do :; done\nprintf %s "$last" > '${file}'\nexec /bin/sleep 60\n`);chmodSync(bin,0o755);process.env.CHROME_BIN=bin;
 let calls=0;try {await assert.rejects(withChromium(dir,async()=>{calls++;},{debugPort:server.address().port}),/no unique owned page/);assert.equal(calls,0);await mustClose(file);}finally{await new Promise(r=>server.close(r));}
});
const fake=join(dir,'fake-browser');
writeFileSync(fake,`#!${process.execPath}
const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs');
let port=+process.argv.find(x=>x.startsWith('--remote-debugging-port=')).split('=')[1];const url=process.argv.at(-1);setTimeout(()=>process.exit(0),15000);if(process.env.CCS_FAKE_IGNORE==='yes'){process.on('SIGTERM',()=>{});setTimeout(()=>process.exit(0),8000);}
let rebound=false;const s=http.createServer((req,res)=>{res.setHeader('content-type','application/json');if(req.url==='/json/version'){res.end(JSON.stringify({Browser:'fake',webSocketDebuggerUrl:'ws://127.0.0.1:'+port+(rebound?'/foreign':'/devtools/browser/fake-123')}));return;}const mode=process.env.CCS_FAKE_PAGE_MODE;const page={id:'owned',type:'page',url,webSocketDebuggerUrl:'ws://127.0.0.1:'+port+'/page'};if(mode==='foreign'){rebound=true;res.end('[]');return;}if(mode==='error'){res.statusCode=503;res.end('{}');return;}res.end(JSON.stringify(mode==='missing'?[]:mode==='ambiguous'?[page,{...page,id:'other'}]:[page]));});
s.on('upgrade',(req,sock)=>{let key=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');const handshake=()=>sock.write('HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Accept: '+key+'\\r\\n\\r\\n');if(req.url==='/devtools/browser/fake-123'&&process.env.CCS_FAKE_DELAY==='yes')setTimeout(handshake,2200);else handshake();sock.on('data',data=>{if((data[0]&15)!==1)return;let n=data[1]&127,o=2;if(n===126){n=data.readUInt16BE(o);o+=2;}const mask=data.subarray(o,o+4);o+=4;let b=Buffer.from(data.subarray(o,o+n));for(let i=0;i<b.length;i++)b[i]^=mask[i%4];const msg=JSON.parse(b.toString());if(msg.method==='Browser.close'){fs.appendFileSync(process.env.CCS_FAKE_MARKER,'close\\n');if(process.env.CCS_FAKE_IGNORE!=='yes')setTimeout(()=>process.exit(0),10);return;}const out=Buffer.from(JSON.stringify({id:msg.id,result:{}}));sock.write(Buffer.concat([Buffer.from([129,out.length]),out]));if(msg.method==='Test.exit')setTimeout(()=>process.exit(0),10);if(msg.method==='Test.rebind')rebound=true;});});setTimeout(()=>s.listen(port,'127.0.0.1',()=>{port=s.address().port;console.error('DevTools listening on ws://127.0.0.1:'+port+'/devtools/browser/fake-123');}),Number(process.env.CCS_START_DELAY || 0));
`);chmodSync(fake,0o755);
for(const fail of [false,true]) await test(fail?'owned-callback-error-cleanup':'owned-result-cleanup',async()=>{
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const marker=join(dir,'marker-'+fail);process.env.CHROME_BIN=fake;process.env.CCS_FAKE_MARKER=marker;let calls=0,url;
 const result=withChromium(dir,async cdp=>{calls++;url='http://127.0.0.1:'+cdp.port+'/';if(fail)throw new Error('primary callback failure');return 'callback-result';},{debugPort:port});
 if(fail)await assert.rejects(result,/primary callback failure/);else assert.equal(await result,'callback-result');
 assert.equal(calls,1);assert.equal(readFileSync(marker,'utf8'),'close\n');await assert.rejects(fetch(url,{signal:AbortSignal.timeout(500)}));
});

await test('already-exited-child',async()=>{
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 process.env.CHROME_BIN=fake;process.env.CCS_FAKE_MARKER=join(dir,'unused-marker');let calls=0,url;
 const result=await withChromium(dir,async cdp=>{calls++;url='http://127.0.0.1:'+cdp.port+'/';await cdp.send('Test.exit');await new Promise(r=>setTimeout(r,100));return 'done';},{debugPort:port});
 assert.equal(result,'done');assert.equal(calls,1);await assert.rejects(fetch(url,{signal:AbortSignal.timeout(500)}));
});

for(const fail of [false,true]) await test(fail?'unclosed-child-preserves-primary':'unclosed-child-rejects-success',async()=>{
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 process.env.CHROME_BIN=fake;process.env.CCS_FAKE_IGNORE='yes';process.env.CCS_FAKE_MARKER=join(dir,'ignored-'+fail);const primary=new Error('original sentinel');let calls=0,url;
 try { await withChromium(dir,async cdp=>{calls++;url='http://127.0.0.1:'+cdp.port+'/';if(fail)throw primary;return 'saved-result';},{debugPort:port}); assert.fail('unclosed child must reject'); }
 catch(error){if(fail)assert.equal(error,primary);else {assert.match(error.message,/could not confirm/);assert.equal(error.callbackResult,'saved-result');}}
 assert.equal(calls,1);await assert.rejects(fetch(url,{signal:AbortSignal.timeout(500)}));delete process.env.CCS_FAKE_IGNORE;await new Promise(r=>setTimeout(r,5000));
});

await test('changed-browser-identity-no-cdp-close',async()=>{
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const marker=join(dir,'rebound-marker');process.env.CHROME_BIN=fake;process.env.CCS_FAKE_MARKER=marker;let calls=0;
 const value=await withChromium(dir,async cdp=>{calls++;await cdp.send('Test.rebind');return 'value';},{debugPort:port});
 assert.equal(value,'value');assert.equal(calls,1);assert.equal(existsSync(marker),false);
});

await test('late-browser-open-does-not-close',async()=>{
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const marker=join(dir,'delayed-marker');process.env.CHROME_BIN=fake;process.env.CCS_FAKE_MARKER=marker;process.env.CCS_FAKE_IGNORE='yes';process.env.CCS_FAKE_DELAY='yes';let calls=0;
 try{await withChromium(dir,async()=>{calls++;return 'retained';},{debugPort:port});assert.fail('must reject unclosed browser');}catch(error){assert.match(error.message,/could not confirm/);assert.equal(error.callbackResult,'retained');}
 assert.equal(calls,1);assert.equal(existsSync(marker),false);delete process.env.CCS_FAKE_IGNORE;delete process.env.CCS_FAKE_DELAY;await new Promise(r=>setTimeout(r,5000));
});

await test('detached-browser-starts-after-successful-launcher-exit',async()=>{
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const launcher=join(dir,'detached-launcher'),marker=join(dir,'detached-marker'),pidfile=join(dir,'detached-pid');
 writeFileSync(launcher,`#!${process.execPath}
const {spawn}=require('node:child_process');const child=spawn(process.execPath,[${JSON.stringify(fake)},...process.argv.slice(2)],{detached:true,stdio:'ignore',env:process.env});require('node:fs').writeFileSync(${JSON.stringify(pidfile)},String(child.pid));child.unref();
`);chmodSync(launcher,0o755);
 process.env.CHROME_BIN=launcher;process.env.CCS_FAKE_MARKER=marker;process.env.CCS_START_DELAY='700';let calls=0;
 try {const value=await withChromium(dir,async()=>{calls++;return 'detached-result';},{debugPort:port});assert.equal(value,'detached-result');assert.equal(calls,1);assert.equal(readFileSync(marker,'utf8'),'close\n');}
 catch(error){if(existsSync(pidfile)){try{process.kill(Number(readFileSync(pidfile,'utf8')),'SIGTERM');}catch{}}throw error;}
 finally{delete process.env.CCS_START_DELAY;}
});

await test('surface-adapter-ephemeral-port-and-csp',async()=>{
 const marker=join(dir,'ephemeral-marker');process.env.CHROME_BIN=fake;process.env.CCS_FAKE_MARKER=marker;let calls=0;
 const value=await withChromium(dir,async cdp=>{calls++;const response=await fetch('http://127.0.0.1:'+cdp.port+'/');assert.equal(response.headers.get('content-security-policy'),"default-src 'self'; img-src 'none'");return 'adapter-result';},{debugPort:0,chromiumArgs:[],responseHeaders:{'content-security-policy':"default-src 'self'; img-src 'none'"}});
 assert.equal(value,'adapter-result');assert.equal(calls,1);assert.equal(readFileSync(marker,'utf8'),'close\n');
});

await test('surface-adapter-explicit-port-callback-error',async()=>{
 const marker=join(dir,'explicit-marker');process.env.CHROME_BIN=fake;process.env.CCS_FAKE_MARKER=marker;const primary=new Error('surface sentinel');let calls=0;
 await assert.rejects(withChromium(dir,async()=>{calls++;throw primary;},{debugPort:await unusedPort(),chromiumArgs:[],requireAnnouncedEndpoint:true,responseHeaders:{'content-security-policy':"default-src 'self'; img-src 'none'"}}),error=>error===primary);
 assert.equal(calls,1);assert.equal(readFileSync(marker,'utf8'),'close\n');
});

for(const mode of ['missing','error','ambiguous','foreign']) await test('detached-authenticated-'+mode,async()=>{
 const port=await unusedPort(), launcher=join(dir,'launcher-'+mode), marker=join(dir,'marker-startup-'+mode), pidfile=join(dir,'pid-'+mode);
 writeFileSync(launcher,`#!${process.execPath}
const {spawn}=require('node:child_process');const child=spawn(process.execPath,[${JSON.stringify(fake)},...process.argv.slice(2)],{detached:true,stdio:['ignore','ignore',2],env:process.env});require('node:fs').writeFileSync(${JSON.stringify(pidfile)},String(child.pid));child.unref();
`);chmodSync(launcher,0o755);
 process.env.CHROME_BIN=launcher;process.env.CCS_FAKE_MARKER=marker;process.env.CCS_FAKE_PAGE_MODE=mode;let calls=0;
 try {await assert.rejects(withChromium(dir,async()=>{calls++;},{debugPort:port,requireAnnouncedEndpoint:true}));assert.equal(calls,0);
   if(mode==='foreign'){assert.equal(existsSync(marker),false);} else assert.equal(readFileSync(marker,'utf8'),'close\n');
 } finally {delete process.env.CCS_FAKE_PAGE_MODE;if(existsSync(pidfile)){try{process.kill(Number(readFileSync(pidfile,'utf8')),'SIGTERM');}catch{}}}
});

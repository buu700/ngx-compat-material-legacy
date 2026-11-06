/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {withChromium} from '../scripts/check-companion-computed-styles.mjs';
const dir=mkdtempSync(join(tmpdir(),'independent-startup-v3-'));writeFileSync(join(dir,'index.html'),'x');
const server=join(dir,'server.cjs'),launcher=join(dir,'launcher.cjs');
writeFileSync(server,`const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs');let foreign=false;const s=http.createServer((req,res)=>{res.setHeader('content-type','application/json');if(req.url==='/json/version')res.end(JSON.stringify({webSocketDebuggerUrl:'ws://127.0.0.1:'+s.address().port+'/devtools/browser/'+(foreign?'foreign-456':'own-123')}));else {if(process.env.TEST_MODE==='foreign')foreign=true;res.end('[]');}});s.on('upgrade',(req,sock)=>{const key=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');sock.write('HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Accept: '+key+'\\r\\n\\r\\n');sock.on('data',data=>{if((data[0]&15)!==1)return;let len=data[1]&127,off=2;if(len===126){len=data.readUInt16BE(off);off+=2}const mask=data.subarray(off,off+4);off+=4;const body=Buffer.from(data.subarray(off,off+len));for(let i=0;i<body.length;i++)body[i]^=mask[i%4];if(JSON.parse(body).method==='Browser.close'){fs.writeFileSync(process.env.TEST_MARKER,'closed');setTimeout(()=>process.exit(0),10);}})});s.listen(0,'127.0.0.1',()=>{fs.writeFileSync(process.env.TEST_PID,''+process.pid);fs.writeFileSync(process.env.TEST_PORT,''+s.address().port);console.error('DevTools listening on ws://127.0.0.1:'+s.address().port+'/devtools/browser/own-123')});setTimeout(()=>process.exit(0),30000);`);
writeFileSync(launcher,`#!${process.execPath}\nconst {spawn}=require('node:child_process');const c=spawn(process.execPath,[process.env.TEST_SERVER],{detached:true,stdio:['ignore','ignore','inherit']});c.unref();setTimeout(()=>process.exit(0),300);`,{mode:0o755});
try {for(const mode of ['missing','foreign']) {const pid=join(dir,mode+'pid'),port=join(dir,mode+'port'),marker=join(dir,mode+'marker');Object.assign(process.env,{CHROME_BIN:launcher,TEST_SERVER:server,TEST_PID:pid,TEST_PORT:port,TEST_MARKER:marker,TEST_MODE:mode});
try {await assert.rejects(withChromium(dir,()=>{throw Error('unexpected callback')},{debugPort:0,requireAnnouncedEndpoint:true}),/no unique owned page/);const url='http://127.0.0.1:'+readFileSync(port,'utf8')+'/json/version';if(mode==='missing'){assert.equal(readFileSync(marker,'utf8'),'closed');await assert.rejects(fetch(url,{signal:AbortSignal.timeout(500)}));}else {assert.equal(existsSync(marker),false);assert.equal((await fetch(url)).ok,true);}console.log(JSON.stringify({mode,pass:true}));}finally{try{process.kill(Number(readFileSync(pid,'utf8')),'SIGTERM')}catch{}}}}
finally{rmSync(dir,{recursive:true,force:true})}

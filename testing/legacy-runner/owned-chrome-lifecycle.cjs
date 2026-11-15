/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/* Finite Linux ownership proof for the one Karma-launched browser. */
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const {debuggerMatchesChild}=require('../../scripts/chromium-debug-endpoint.mjs');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function processInfo(pid){
 try{const dir='/proc/'+pid,raw=fs.readFileSync(dir+'/stat','utf8').split(') ').at(-1).split(' '),status=fs.readFileSync(dir+'/status','utf8'),cmd=fs.readFileSync(dir+'/cmdline','utf8');return {pid,ppid:Number(raw[1]),pgrp:Number(raw[2]),state:raw[0],starttime:Number(raw[19]),uid:Number(status.match(/^Uid:\s+(\d+)/m)[1]),exe:fs.readlinkSync(dir+'/exe'),cmd};}catch(e){if(e.code==='ENOENT'||e.code==='ESRCH')return null;throw e;}
}
function listener(port,pid){const output=execFileSync('ss',['-ltnp',`sport = :${port}`],{encoding:'utf8',timeout:3000}),rows=output.trim().split('\n').slice(1);return rows.length===1&&rows[0].includes('127.0.0.1:'+port)&&rows[0].includes('pid='+pid+',');}
function listenerGone(port){const output=execFileSync('ss',['-ltnp',`sport = :${port}`],{encoding:'utf8',timeout:3000});return output.trim().split('\n').length===1;}
function activePort(profile){const file=path.join(profile,'DevToolsActivePort'),st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink()||st.uid!==process.getuid())throw Error('debugger port file is not an owned regular file');const lines=fs.readFileSync(file,'utf8').trim().split('\n'),port=Number(lines[0]),urlPath=lines[1];if(lines.length!==2||!Number.isInteger(port)||port<1||port>65535||!/^\/devtools\/browser\/[a-z0-9-]+$/i.test(urlPath))throw Error('invalid debugger port file');return {port,path:urlPath};}
async function version(endpoint){const r=await fetch('http://127.0.0.1:'+endpoint.port+'/json/version',{signal:AbortSignal.timeout(2000)});if(!r.ok)throw Error('browser debugger response unavailable');const x=await r.json();if(!debuggerMatchesChild(x,endpoint))throw Error('debugger endpoint mismatch');return x;}
function socket(url){return new Promise((resolve,reject)=>{let done=false;const ws=new WebSocket(url),timer=setTimeout(()=>{if(!done){done=true;ws.close();reject(Error('debugger connect timeout'));}},2500);ws.addEventListener('open',()=>{if(!done){done=true;clearTimeout(timer);resolve(ws);}});ws.addEventListener('error',()=>{if(!done){done=true;clearTimeout(timer);reject(Error('debugger connect failed'));}});});}
function rpc(ws,id,method){return new Promise((resolve,reject)=>{let done=false;const timer=setTimeout(()=>{if(!done){done=true;reject(Error(method+' timed out'));}},2500);const onMessage=event=>{let v;try{v=JSON.parse(event.data);}catch{return;}if(v.id!==id||done)return;done=true;clearTimeout(timer);ws.removeEventListener('message',onMessage);if(v.error)reject(Error(method+' rejected'));else resolve(v.result);};ws.addEventListener('message',onMessage);ws.send(JSON.stringify({id,method}));});}
function snapshotTree(root,additional=[]){const all=new Map();for(const d of fs.readdirSync('/proc')){if(!/^\d+$/.test(d))continue;try{const x=processInfo(Number(d));if(x)all.set(x.pid,x);}catch(e){if(additional.includes(Number(d))||Number(d)===root)throw e;}}
 const seen=new Set([root,...additional]);let changed=true;while(changed){changed=false;for(const x of all.values())if(seen.has(x.ppid)&&!seen.has(x.pid)){seen.add(x.pid);changed=true;}}
 return [...seen].map(pid=>all.get(pid)).filter(Boolean).map(x=>({pid:x.pid,starttime:x.starttime,state:x.state}));}
// Name recognition is only a census signal, never close authorization.
function isBrowserProcessName(name){return /^(?:chrome|chromium|chromium-browse|chrome_crashpad|chrome-sandbox|headless_shell|\.chrome-wrapped)$/.test(name);}
/** Conservative same-user browser census: unknown new Chrome processes fail closed. */
function browserProcesses(procRoot='/proc'){
 const found=[];for(const d of fs.readdirSync(procRoot)){if(!/^\d+$/.test(d))continue;try{const dir=path.join(procRoot,d),raw=fs.readFileSync(dir+'/stat','utf8'),name=raw.slice(raw.indexOf('(')+1,raw.lastIndexOf(')')),parts=raw.slice(raw.lastIndexOf(')')+2).split(' ');if(!isBrowserProcessName(name)||parts[0]==='Z')continue;const status=fs.readFileSync(dir+'/status','utf8'),uid=Number(status.match(/^Uid:\s+(\d+)/m)[1]);if(uid===process.getuid())found.push({pid:Number(d),starttime:Number(parts[19])});}catch(e){if(e.code==='ENOENT'||e.code==='ESRCH')continue;throw e;}}return found;
}
function profileProcesses(profile){
 const found=[],flag='--user-data-dir='+profile;
 for(const d of fs.readdirSync('/proc')){if(!/^\d+$/.test(d))continue;const dir='/proc/'+d;try{const status=fs.readFileSync(dir+'/status','utf8'),uid=Number(status.match(/^Uid:\s+(\d+)/m)[1]);if(uid!==process.getuid())continue;const cmd=fs.readFileSync(dir+'/cmdline','utf8').replaceAll('\0',' ');if(!(' '+cmd+' ').includes(' '+flag+' '))continue;const x=processInfo(Number(d));if(x&&x.state!=='Z')found.push({pid:x.pid,starttime:x.starttime,state:x.state});}catch(e){if(e.code==='ENOENT'||e.code==='ESRCH')continue;throw e;}}
 return found;
}
function sameAlive(item){const now=processInfo(item.pid);return !!now&&now.starttime===item.starttime&&now.state!=='Z';}
// Pinned to the committed catalog at ae9e395e2. Changes require a reviewed pin update.
const approvedCatalogSha256='250dcb18cc36074a73b4b22caf1101f30399a861c42727750e4d5911f5918cb7';
function checkApprovedCatalog(bytes){
 if(createHash('sha256').update(bytes).digest('hex')!==approvedCatalogSha256)throw Error('approved browser catalog mismatch');
}
function checkNixProfile(selected,arch){
 const supported={arm64:'linux-arm64-nix',x64:'linux-x64-nix-predicted-inputs'};
 if(!Object.hasOwn(supported,arch)||selected.arch!==arch||selected.id!==supported[arch])throw Error('unsupported wrapped browser profile or architecture');
}
// The catalog authenticates the exact launcher and binary; the profile name alone does not.
async function approvedNixBinary(){
 const root=path.resolve(__dirname,'../..'),catalog=path.join(root,'compatibility/rc/inherited-native-profiles.json');
 const checkCatalog=()=>checkApprovedCatalog(fs.readFileSync(catalog));
 checkCatalog();
 const {selectInheritedNativeProfile}=await import('../../scripts/inherited-native-profiles.mjs');
 const selected=selectInheritedNativeProfile(root);
 checkNixProfile(selected,process.arch);
 const check=()=>{checkCatalog();selected.check();checkCatalog();};
 check();
 const match=fs.readFileSync(selected.browser,'utf8').match(/exec -a "\$0" "([^"\n]+)"/);
 if(!match||!path.isAbsolute(match[1]))throw Error('invalid approved launcher');
 return {binary:fs.realpathSync(match[1]),profile:selected.id,check};
}
const real={activePort,version,socket,rpc,processInfo,listener,listenerGone,snapshotTree,profileProcesses,browserProcesses,sameAlive,pause,approvedNixBinary};
/** Close only a browser whose debugger, process, listener, profile and nonce agree. */
async function closeOwned({profile,nonce,launcherPid,launcherIdentity,events,baseline,onCloseIssued=()=>{}},io=real){
 const proof={status:'fail',profile,nonce,launcher_pid:launcherPid,close_issued:false};let ws;
 try{
  if(process.platform!=='linux'||!Number.isInteger(launcherPid)||launcherPid<=0||!Array.isArray(baseline)||baseline.some(x=>!Number.isInteger(x.pid)||!Number.isSafeInteger(x.starttime)))throw Error('missing supported launcher handle or browser baseline');proof.baseline=baseline;
  if(events.some(e=>e.kind==='browser-error'||e.kind==='launcher-failure'||e.kind==='launcher-diagnostic-failure'||e.kind==='unexpected-exit'))throw Error('browser or launcher failed before close');
  let ep,last;for(let i=0;i<40;i++){try{ep=io.activePort(profile);break;}catch(e){last=e;await io.pause(50);}}if(!ep)throw last||Error('debugger port absent');proof.endpoint=ep;
  const v=await io.version(ep);ws=await io.socket(v.webSocketDebuggerUrl);const command=await io.rpc(ws,1,'Browser.getBrowserCommandLine'),args=command?.arguments;
  const profileFlag='--user-data-dir='+profile,nonceFlag='--legacy-runner-nonce='+nonce;
  if(!Array.isArray(args)||args.filter(x=>x===profileFlag).length!==1||args.filter(x=>x===nonceFlag).length!==1)throw Error('CDP browser profile/nonce mismatch');
  const info=await io.rpc(ws,2,'SystemInfo.getProcessInfo'),browsers=(info?.processInfo||[]).filter(x=>x.type==='browser');if(browsers.length!==1||!Number.isInteger(browsers[0].id))throw Error('browser process unavailable');const pid=browsers[0].id,owner=io.processInfo(pid);let approved=null;
  if(owner&&path.basename(owner.exe)==='.chrome-wrapped'){
   approved=await io.approvedNixBinary();
   if(owner.exe!==approved.binary||owner.pid!==launcherPid||!launcherIdentity||launcherIdentity.pid!==owner.pid||launcherIdentity.starttime!==owner.starttime||launcherIdentity.pgrp!==owner.pgrp)throw Error('approved wrapped browser launcher identity mismatch');
   proof.approved_browser={profile:approved.profile,launcher_pid:launcherPid,starttime:owner.starttime,pgrp:owner.pgrp,exe:owner.exe};
  }
  if(!owner||owner.uid!==process.getuid()||(!approved&&!['chrome','chromium','chromium-browser','headless_shell'].includes(path.basename(owner.exe)))||!(' '+owner.cmd.replaceAll('\0',' ')+' ').includes(' '+profileFlag+' ')||!(' '+owner.cmd.replaceAll('\0',' ')+' ').includes(' '+nonceFlag+' ')||!io.listener(ep.port,pid))throw Error('browser process/listener ownership mismatch');
  proof.owner={pid,starttime:owner.starttime,exe:owner.exe,uid:owner.uid};const cdpPids=(info.processInfo||[]).map(x=>x.id).filter(Number.isInteger);proof.processes=io.snapshotTree(pid,cdpPids);proof.profile_before=io.profileProcesses(profile);if(!proof.processes.some(x=>x.pid===pid&&x.starttime===owner.starttime)||!proof.profile_before.some(x=>x.pid===pid&&x.starttime===owner.starttime))throw Error('browser process snapshot/census missing');
  const ep2=io.activePort(profile),current=io.processInfo(pid);if(approved)approved.check();if(ep2.port!==ep.port||ep2.path!==ep.path||!current||current.uid!==owner.uid||current.starttime!==owner.starttime||current.pgrp!==owner.pgrp||current.exe!==owner.exe||!(' '+current.cmd.replaceAll('\0',' ')+' ').includes(' '+profileFlag+' ')||!(' '+current.cmd.replaceAll('\0',' ')+' ').includes(' '+nonceFlag+' ')||!io.listener(ep.port,pid))throw Error('browser ownership changed before close');const v2=await io.version(ep);if(v2.webSocketDebuggerUrl!==v.webSocketDebuggerUrl)throw Error('browser endpoint changed before close');const again=await io.rpc(ws,3,'Browser.getBrowserCommandLine');if(again?.arguments?.filter(x=>x===profileFlag).length!==1||again?.arguments?.filter(x=>x===nonceFlag).length!==1)throw Error('CDP profile/nonce changed before close');
  proof.close_issued=true;onCloseIssued();try{await io.rpc(ws,4,'Browser.close');}catch(e){if(e?.message!=='Browser.close timed out')throw e;proof.close_response=String(e);}const preexisting=new Set(baseline.map(x=>x.pid+':'+x.starttime));const newBrowsers=()=>io.browserProcesses().filter(x=>!preexisting.has(x.pid+':'+x.starttime));for(let i=0;i<30;i++){proof.profile_remaining=io.profileProcesses(profile);proof.new_browser_remaining=newBrowsers();if(proof.processes.every(x=>!io.sameAlive(x))&&proof.profile_remaining.length===0&&proof.new_browser_remaining.length===0&&io.listenerGone(ep.port))break;await io.pause(100);}proof.remaining=proof.processes.filter(io.sameAlive);proof.profile_remaining=io.profileProcesses(profile);proof.new_browser_remaining=newBrowsers();proof.census_completed=true;proof.listener_gone=io.listenerGone(ep.port);if(proof.remaining.length||proof.profile_remaining.length||proof.new_browser_remaining.length||!proof.listener_gone)throw Error('owned browser processes, post-launch browser census or listener survived');if(events.some(e=>e.kind==='browser-error'||e.kind==='launcher-failure'||e.kind==='launcher-diagnostic-failure'||e.kind==='unexpected-exit'))throw Error('browser or launcher failed during close');proof.status='pass';
 }catch(e){proof.error=String(e?.message||e);}finally{if(ws)try{ws.close();}catch{}}
 return proof;
}
function validReceipt(value,{profile,nonce}){
 const p=value?.proof,owner=p?.owner,events=value?.events,exit=Array.isArray(events)?events.filter(e=>e.kind==='expected-exit'):[];
 return Boolean(value?.schema_version===1&&value.profile===profile&&value.nonce===nonce&&value.status==='pass'&&Number.isInteger(value.launcher_pid)&&value.launcher_pid>0&&p?.status==='pass'&&p.profile===profile&&p.nonce===nonce&&p.launcher_pid===value.launcher_pid&&p.close_issued===true&&p.listener_gone===true&&p.census_completed===true&&Array.isArray(p.baseline)&&Array.isArray(p.new_browser_remaining)&&p.new_browser_remaining.length===0&&Array.isArray(p.remaining)&&p.remaining.length===0&&Array.isArray(p.profile_remaining)&&p.profile_remaining.length===0&&Array.isArray(p.profile_before)&&p.profile_before.some(x=>x.pid===owner?.pid&&x.starttime===owner?.starttime)&&Number.isInteger(owner?.pid)&&owner.pid>0&&Number.isSafeInteger(owner.starttime)&&owner.uid===process.getuid()&&typeof owner.exe==='string'&&Array.isArray(p.processes)&&p.processes.some(x=>x.pid===owner.pid&&x.starttime===owner.starttime)&&Number.isInteger(p.endpoint?.port)&&p.endpoint.port>0&&p.endpoint.port<=65535&&/^\/devtools\/browser\/[a-z0-9-]+$/i.test(p.endpoint.path||'')&&exit.length===1&&exit[0].code===0&&exit[0].signal==null&&!events.some(e=>['browser-error','launcher-failure','launcher-diagnostic-failure','unexpected-exit'].includes(e.kind)));
}
function deliberateFailOutcome(lifecyclePassed, report, result){
 const suite='legacy-runner deliberate fail probe',description='fails on purpose to prove assertion failure detection',name=suite+' > '+description,t=report?.totals,failures=report?.failures,specs=report?.specs;
 return lifecyclePassed&&result&&!result.error&&!result.signal&&result.status===1&&report?.mode==='deliberate-fail'&&report?.deliberate_fail_observed===true&&Number.isInteger(t?.executed)&&t.executed>0&&t.failed===1&&t.skipped===0&&t.passed+1===t.executed&&Array.isArray(failures)&&failures.length===1&&failures[0].suite===suite&&failures[0].description===description&&Array.isArray(specs)&&specs.length===t.executed&&specs.filter(x=>!x.success&&!x.skipped).length===1&&specs.some(x=>x.full_name===name&&x.success===false&&x.skipped===false)?0:1;
}
module.exports={closeOwned,processInfo,listener,listenerGone,activePort,browserProcesses,isBrowserProcessName,checkApprovedCatalog,checkNixProfile,validReceipt,deliberateFailOutcome,real};

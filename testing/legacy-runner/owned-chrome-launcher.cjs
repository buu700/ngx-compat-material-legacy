/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/* Decorate the existing Karma ChromeHeadless launcher; no separate launcher. */
const fs=require('node:fs');
const path=require('node:path');
const chrome=require('karma-chrome-launcher')['launcher:ChromeHeadless'][1];
const {closeOwned,processInfo}=require('./owned-chrome-lifecycle.cjs');
function decorate(instance,{emitter,profile,nonce,receipt,baseline,close=closeOwned,readProcess=processInfo,delay=ms=>new Promise(r=>setTimeout(r,ms))}){
 const events=[],state={launcher_pid:null,launcher_identity:null,close_started:false,close_issued:false,proof:null};let finished;
 const originalStart=instance._start.bind(instance),originalExit=instance._onProcessExit.bind(instance),originalForceKill=instance.forceKill.bind(instance);
 instance._start=function(url){originalStart(url);state.launcher_pid=instance._process?.pid??null;if(state.launcher_pid)state.launcher_identity=readProcess(state.launcher_pid);if(!state.launcher_pid)events.push({kind:'launcher-failure',detail:'launcher PID missing'});};
 instance._onProcessExit=function(code,signal,output){
  const detail=String(output||'');events.push({kind:state.close_issued&&code===0&&!signal?'expected-exit':'unexpected-exit',code,signal,detail:detail.slice(0,2000)});
  // These are launcher/startup or OS resource failure signals, not arbitrary Chrome diagnostics.
  if(/Permission denied accessing the binary|Can not find the binary|(?:^|\n)Error:\s*(?:spawn|kill)\b[^\n]*\b(?:EACCES|ENOENT)\b|inotify_init\(\) failed: Too many open files|\bFATAL:/i.test(detail))events.push({kind:'launcher-diagnostic-failure',detail:detail.slice(-2000)});
  return originalExit(code,signal,output);
 };
 emitter.on('browser_error',(browser,error)=>{if(browser?.id===instance.id)events.push({kind:'browser-error',detail:String(error).slice(0,1000)});});
 emitter.on('browser_process_failure',browser=>{if(browser?.id===instance.id)events.push({kind:'launcher-failure',detail:String(browser.error||'browser process failure')});});
 instance.forceKill=function(){
  if(finished)return finished;
  instance.state=instance.STATE_BEING_KILLED;state.close_started=true;
  finished=(async()=>{
   state.proof=await close({profile,nonce,launcherPid:state.launcher_pid,launcherIdentity:state.launcher_identity,events,baseline,onCloseIssued:()=>{state.close_issued=true;}});
   for(let i=0;i<30&&instance._process;i++)await delay(100);
   if(instance._process)events.push({kind:'launcher-failure',detail:'spawned launcher did not exit after browser close'});
   const exit=events.filter(e=>e.kind==='expected-exit');if(exit.length!==1)events.push({kind:'launcher-failure',detail:'expected clean launcher process exit missing or ambiguous'});
   if(state.proof.status!=='pass'||events.some(e=>['browser-error','launcher-failure','launcher-diagnostic-failure','unexpected-exit'].includes(e.kind))){instance.state=instance.STATE_FINISHED;return;}
   await originalForceKill();
  })().catch(e=>{events.push({kind:'launcher-failure',detail:String(e?.stack||e)});instance.state=instance.STATE_FINISHED;});return finished;
 };
 emitter.on('exit',done=>{(async()=>{if(!finished){events.push({kind:'launcher-failure',detail:'browser lifecycle close was never initiated'});instance.forceKill();}await finished;const failed=state.proof?.status!=='pass'||events.some(e=>['browser-error','launcher-failure','launcher-diagnostic-failure','unexpected-exit'].includes(e.kind));const data={schema_version:1,role:'owned legacy Karma browser lifecycle',status:failed?'fail':'pass',profile,nonce,launcher_pid:state.launcher_pid,events,proof:state.proof};try{fs.writeFileSync(receipt,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});}catch{return done(1);}done(failed?1:undefined);})().catch(()=>done(1));});
 return {state,events};
}
function OwnedChrome(baseBrowserDecorator,args,emitter){
 chrome.call(this,baseBrowserDecorator,args);
 const profile=process.env.LEGACY_BROWSER_PROFILE,nonce=process.env.LEGACY_BROWSER_NONCE,receipt=process.env.LEGACY_BROWSER_LIFECYCLE;
 let baseline;try{baseline=JSON.parse(process.env.LEGACY_BROWSER_BASELINE);}catch{throw Error('browser baseline unavailable');}
 if(!Array.isArray(baseline)||!profile||!path.isAbsolute(profile)||!receipt||!path.isAbsolute(receipt)||!/^[a-f0-9]{32}$/.test(nonce||''))throw Error('owned browser profile/nonce/receipt unavailable');
 const stat=fs.lstatSync(profile);if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==process.getuid()||fs.realpathSync(profile)!==profile)throw Error('browser profile is not owned physical directory');
 if(args.chromeDataDir!==profile||!args.flags?.includes('--legacy-runner-nonce='+nonce)||!args.flags?.includes('--remote-debugging-port=0'))throw Error('owned browser launch arguments do not match');
 decorate(this,{emitter,profile,nonce,receipt,baseline});
}
OwnedChrome.prototype=chrome.prototype;
OwnedChrome.$inject=['baseBrowserDecorator','args','emitter'];
module.exports={'launcher:LegacyOwnedChromeHeadless':['type',OwnedChrome],decorate};

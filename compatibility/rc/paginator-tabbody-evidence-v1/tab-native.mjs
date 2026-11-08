import {readFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import assert from 'node:assert/strict';
import {withChromium} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/check-companion-computed-styles.mjs';
const out='/home/parallels/.codex/closeout-state/2026-11-07-recovery/paginator-tabbody-contract-a488-v1', info=JSON.parse(readFileSync(out+'/runtime.json'));
const result=await withChromium(join(info.consumer,'dist'),async({send,evaluate,browser})=>{
 const wait=ms=>new Promise(r=>setTimeout(r,ms)),ready=async()=>{for(let i=0;i<100;i++){if(await evaluate("document.documentElement.dataset.ready==='1'"))return;await wait(50)}throw Error('fixture not ready')};
 const reload=async()=>{await evaluate('window.__oldPage=true');await send('Page.reload');for(let i=0;i<100;i++){if(await evaluate("!window.__oldPage && document.documentElement.dataset.ready==='1'")){await wait(150);return}await wait(50)}throw Error('reload failed')};
 const snap=()=>evaluate('window.tabProof.snapshot()');await ready();await wait(700);const rows={initial:await snap()};
 await evaluate('window.tabProof.select(1)');await wait(130);rows.leaving=await snap();await wait(650);rows.arrived=await snap();
 await reload();await evaluate('window.tabProof.setPreserve(true)');await evaluate('window.tabProof.select(1)');await wait(750);rows.preserve=await snap();
 await evaluate('window.tabProof.select(0)');await wait(110);await evaluate('window.tabProof.select(2)');await wait(850);rows.interrupted=await snap();
 await evaluate('window.tabProof.select(1)');await wait(100);await evaluate('window.tabProof.destroy()');await wait(700);rows.destroy=await snap();
 return {browser,rows};},{debugPort:0,requireAnnouncedEndpoint:true});
writeFileSync(out+'/tab-native-raw.json',JSON.stringify(result,null,2)+'\n');
const r=result.rows,body=(s,i)=>s.bodies[i], active=s=>s.bodies.findIndex(b=>b.active);
const checks={initial:active(r.initial)===0&&body(r.initial,0).child==='A'&&body(r.initial,0).visibility==='visible',leaving:body(r.leaving,0).child==='A'&&body(r.leaving,0).visibility==='visible'&&body(r.leaving,0).animating,arrived:active(r.arrived)===1&&body(r.arrived,1).child==='B'&&body(r.arrived,1).visibility==='visible'&&body(r.arrived,0).child===null,preserve:active(r.preserve)===1&&body(r.preserve,0).child==='A'&&body(r.preserve,0).visibility==='hidden',interrupted:active(r.interrupted)===2&&body(r.interrupted,2).visibility==='visible'&&r.interrupted.consumerTransform==='scale(0.97)',destroy:r.destroy.bodies.length===0&&['A','B','C'].every(n=>r.destroy.events.some(e=>e.type==='destroy'&&e.name===n))};
writeFileSync(out+'/tab-native-result.json',JSON.stringify({browser:result.browser,checks},null,2)+'\n');assert.ok(Object.values(checks).every(Boolean),JSON.stringify(checks));

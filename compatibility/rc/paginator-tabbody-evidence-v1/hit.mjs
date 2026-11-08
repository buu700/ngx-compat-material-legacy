import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {withChromium} from '/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy/scripts/check-companion-computed-styles.mjs';
const out='/home/parallels/.codex/closeout-state/2026-11-07-recovery/paginator-tabbody-contract-a488-v1', initial=JSON.parse(readFileSync(out+'/runtime.json'));
const result=await withChromium(join(initial.consumer,'dist'),async({evaluate,send,browser})=>{
for(let i=0;i<100&&!await evaluate('!!document.querySelector("mat-select")');i++)await new Promise(r=>setTimeout(r,100));
const rows=[];
for(const id of ['default-ltr','default-rtl','dense-ltr','dense-rtl','disabled']){
for(const point of ['center','above','below']){
await evaluate('window.__oldPage=true');await send('Page.reload'); for(let i=0;i<100&&!await evaluate('!window.__oldPage && !!document.querySelector("mat-select")');i++)await new Promise(r=>setTimeout(r,100)); await new Promise(r=>setTimeout(r,150));
const pre=await evaluate(`(()=>{const p=document.querySelector('#${id}'),f=p?.querySelector('mat-form-field'),s=p?.querySelector('mat-select'),t=p?.querySelector('.mat-select-trigger');if(!s||!f||!t)return null;const r=s.getBoundingClientRect(),q=f.getBoundingClientRect(),z=t.getBoundingClientRect();const y=${JSON.stringify(point)}==='center'?r.y+r.height/2:${JSON.stringify(point)}==='above'?r.y-17:r.bottom+17;const x=r.x+r.width/2;const e=document.elementFromPoint(x,y),c=getComputedStyle(s);return {point:{x,y},hit:e?{tag:e.tagName,cls:String(e.className),insideSelect:!!e.closest('mat-select'),insideField:!!e.closest('mat-form-field')}:null,field:{x:q.x,y:q.y,width:q.width,height:q.height},select:{x:r.x,y:r.y,width:r.width,height:r.height},trigger:{x:z.x,y:z.y,width:z.width,height:z.height},style:{display:c.display,visibility:c.visibility,pointerEvents:c.pointerEvents},expanded:s.getAttribute('aria-expanded')}})()`);
if(!pre)throw Error('missing '+id);
await send('Input.dispatchMouseEvent',{type:'mousePressed',x:pre.point.x,y:pre.point.y,button:'left',clickCount:1}); await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:pre.point.x,y:pre.point.y,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,120));
const post=await evaluate(`(()=>({expanded:document.querySelector('#${id} mat-select').getAttribute('aria-expanded'),options:[...document.querySelectorAll('mat-option')].map(e=>e.textContent.trim())}))()`); rows.push({id,point,pre,post});
}}
return {browser,rows};},{debugPort:0,requireAnnouncedEndpoint:true});
function assess(r){let issues=[];if(!r?.pre?.field||!r?.pre?.select||!r?.pre?.trigger||!r?.pre?.hit)issues.push('missing control or hit');for(const v of [r?.pre?.field,r?.pre?.select,r?.pre?.trigger]) if(!v||![v.x,v.y,v.width,v.height].every(Number.isFinite)||v.width<=0||v.height<=0)issues.push('corrupt geometry');const s=r?.pre?.style;if(!s||s.display==='none'||s.visibility!=='visible'||s.pointerEvents==='none')issues.push('style witness absent');return issues;}
const valid=result.rows.map(r=>({id:r.id,point:r.point,issues:assess(r)}));const base=result.rows[0];const missing=structuredClone(base);missing.pre.select=null;const corrupt=structuredClone(base);corrupt.pre.trigger.width=0;const style=structuredClone(base);style.pre.style.display='none';const negatives={missing:assess(missing),corrupt:assess(corrupt),style:assess(style)};writeFileSync(out+'/hit-result.json',JSON.stringify({...result,valid,negatives},null,2));if(valid.some(v=>v.issues.length)||Object.values(negatives).some(v=>!v.length))throw Error('validation failed');

if(result.rows.length!==15 || result.rows.some(r=>r.post.expanded !== (r.id==='disabled'?'false':'true'))) throw Error('paginator pointer outcome mismatch');

/** Historical badge class and current forced colors must remain observable. */
export const BADGE_HIGH_CONTRAST_CASES=Object.freeze([
  'badge/high-contrast/historical-class',
  'badge/high-contrast/forced-colors',
]);
// Authentic16 rule: outline:solid1px; border-radius:0. Its complete selector/rule
// bytes are retained in the source review, not inferred from candidate output.
const positive=value=>value?.found===true && value.radius==='0px'
  && value.outline_width==='1px' && value.outline_style==='solid';
const negative=value=>value?.found===true && value.radius==='13px'
  && value.outline_width==='5px' && value.outline_style==='solid';
export function assessBadgeHighContrast(observations){
  const historic=observations?.historical_class,forced=observations?.forced_colors;
  const classOk=!observations?.error && historic?.media_active===false
    && historic.normal?.found===true && typeof historic.normal.radius==='string'
    && historic.normal.radius!=='' && historic.normal.radius!=='0px'
    && positive(historic.active) && negative(historic.negative);
  const forcedOk=!observations?.error && forced?.media_active===true
    && ['oracle','candidate','bridge'].every(mode=>positive(forced[mode]))
    && negative(forced.negative);
  return BADGE_HIGH_CONTRAST_CASES.map((case_id,index)=>({case_id,result:(index===0?classOk:forcedOk)?'pass':'fail',
    observations:index===0?historic??null:forced??null,
    error:observations?.error??null,role:'Required supplemental native style guard; no extra matrix acceptance credit.'}));
}

/** Run in the existing real MatBadge page after its normal token observations. */
export async function observeBadgeHighContrast({send,evaluate},lightScenario){
  const observations={};
  const features=value=>[{name:'hover',value:'hover'},{name:'any-hover',value:'hover'},
    {name:'pointer',value:'fine'},{name:'forced-colors',value}];
  const frame=()=>evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))');
  const read=()=>evaluate(`(() => { const el=document.querySelector('#ccs-badge .mat-badge-content');
    if(!el)return {found:false}; const s=getComputedStyle(el);return {found:true,
    radius:s.borderTopLeftRadius,outline_width:s.outlineWidth,outline_style:s.outlineStyle}; })()`);
  const sentinel=async enabled=>{
    await evaluate(`(() => {const el=document.getElementById('ccs-sentinel');el.media=${JSON.stringify(enabled?'all':'not all')};
      el.textContent=${JSON.stringify(enabled?'#ccs-badge .mat-badge-content { border-radius:13px!important; outline:solid 5px!important; }':'')};})()`);
    await frame();
  };
  const previousClass=await evaluate('document.body.classList.contains("cdk-high-contrast-active")');
  try{
    await send('Emulation.setEmulatedMedia',{features:features('none')});
    await evaluate('document.body.classList.remove("cdk-high-contrast-active")');
    await evaluate(`window.__ccs.apply('candidate',${JSON.stringify(lightScenario)})`);await frame();
    const normal=await read();
    await evaluate('document.body.classList.add("cdk-high-contrast-active")');await frame();
    observations.historical_class={media_active:await evaluate('matchMedia("(forced-colors: active)").matches'),normal,active:await read()};
    await sentinel(true);observations.historical_class.negative=await read();await sentinel(false);
    await evaluate('document.body.classList.remove("cdk-high-contrast-active")');
    await send('Emulation.setEmulatedMedia',{features:features('active')});await frame();
    observations.forced_colors={media_active:await evaluate('matchMedia("(forced-colors: active)").matches')};
    for(const mode of ['oracle','bridge','candidate']){
      await evaluate(`window.__ccs.apply(${JSON.stringify(mode)},${JSON.stringify(lightScenario)})`);await frame();
      observations.forced_colors[mode]=await read();
    }
    await sentinel(true);observations.forced_colors.negative=await read();
  }catch(error){observations.error=String(error.message||error);}
  finally{
    await sentinel(false);
    await evaluate(`document.body.classList.toggle('cdk-high-contrast-active',${JSON.stringify(previousClass)})`);
    await send('Emulation.setEmulatedMedia',{features:features('none')});await frame();
  }
  return observations;
}

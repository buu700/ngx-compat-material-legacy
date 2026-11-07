/** Owned class/forced-color accessibility and finite ripple lifecycle guards. */
export const LEGACY_CORE_HIGH_CONTRAST_CASES=Object.freeze([
  'legacy-core/high-contrast/historical-class',
  'legacy-core/high-contrast/forced-colors',
  'legacy-core/ripple/high-contrast-lifecycle',
]);
const lifecycle=mode=>Array.isArray(mode?.lifecycle)
  && JSON.stringify(mode.lifecycle)===JSON.stringify(['FADING_IN','VISIBLE','FADING_OUT','HIDDEN'])
  && JSON.stringify(mode.connected)===JSON.stringify([true,true,true,false]);
const control=mode=>mode?.media_active===false && mode?.class_active===false
  && mode.ripple_display==='block' && mode.focus_display==='none'
  && mode.submenu_fill==='rgb(1, 2, 3)';
const positive=mode=>mode?.found===true && mode.ripple_display==='none'
  && mode.focus_display==='block' && typeof mode.canvas_color==='string'
  && mode.canvas_color!=='' && mode.canvas_color!=='rgb(1, 2, 3)'
  && mode.submenu_fill===mode.canvas_color;
const negative=mode=>mode?.found===true && mode.ripple_display==='block'
  && mode.focus_display==='none' && mode.submenu_fill==='rgb(8, 9, 10)';
const fallback=mode=>mode?.initial_state==='FADING_IN' && mode.initial_connected===true
  && mode.final_state==='HIDDEN' && mode.final_connected===false && mode.wait_completed===true;

const persistent=mode=>mode?.initial_state==='FADING_IN' && mode.initial_connected===true
  && mode.visible_state==='VISIBLE' && mode.visible_connected===true && mode.visible_wait_completed===true
  && mode.dismissed_state==='FADING_OUT' && mode.dismissed_connected===true
  && mode.final_state==='HIDDEN' && mode.final_connected===false && mode.hidden_wait_completed===true;

export function assessLegacyCoreHighContrast(observations){
  const o=observations||{},normal=o.normal,historic=o.historical_class,forced=o.forced_colors;
  const classOk=!o.error && normal?.found===true && control(normal)
    && historic?.media_active===false && historic?.class_active===true
    && positive(historic) && negative(historic.negative);
  const forcedOk=!o.error && normal?.found===true && control(normal)
    && forced?.media_active===true && forced?.class_active===false
    && positive(forced) && negative(forced.negative);
  const motionOk=classOk && forcedOk && [normal,historic,forced].every(lifecycle)
    && fallback(historic.fallback) && fallback(forced.fallback)
    && persistent(historic.persistent) && persistent(forced.persistent);
  return LEGACY_CORE_HIGH_CONTRAST_CASES.map((case_id,i)=>({case_id,
    result:[classOk,forcedOk,motionOk][i]?'pass':'fail',
    role:'Required supplemental native guard;no extra browser matrix acceptance credit.',
    error:o.error??null}));
}
export const legacyCoreHighContrastOkay=observations=>assessLegacyCoreHighContrast(observations).every(r=>r.result==='pass');

/** Uses the packed consumer's real owned renderer and compiled exported Sass. */
export async function observeLegacyCoreHighContrast({send,evaluate,waitFor}){
  const observations={};
  const previousClass=await evaluate('document.body.classList.contains("cdk-high-contrast-active")');
  const setMode=async (forced,historic)=>{
    await send('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:forced?'active':'none'}]});
    // Flush a real browser frame, then remove any detector-added class so the
    // forced-colors route cannot pass solely through the historical selector.
    await send('Runtime.evaluate',{expression:'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))',awaitPromise:true,returnByValue:true});
    await evaluate(`document.body.classList.toggle('cdk-high-contrast-active',${JSON.stringify(historic)})`);
  };
  const exercise=()=>evaluate(`(() => {
    const api=window.__closeoutCoreContrast;if(!api)return {found:false};
    document.getElementById('core-contrast-focus').focus();
    return {...api.exercise(),media_active:matchMedia('(forced-colors: active)').matches,
      class_active:document.body.classList.contains('cdk-high-contrast-active')};
  })()`);
  const sentinel=async enabled=>{
    await evaluate(`(() => {let style=document.getElementById('core-contrast-sentinel');
      if(!style){style=document.createElement('style');style.id='core-contrast-sentinel';document.head.append(style);}
      style.textContent=${JSON.stringify(enabled?'#core-contrast-ripple .mat-ripple-element {display:block!important} #core-contrast-focus {--mat-focus-indicator-display:none!important} #core-contrast-menu {fill:rgb(8,9,10)!important}':'')};})()`);
  };
  try{
    await setMode(false,false);observations.normal=await exercise();
    for(const [key,forced,historic] of [['historical_class',false,true],['forced_colors',true,false]]){
      await setMode(forced,historic);observations[key]=await exercise();
      await sentinel(true);observations[key].negative=await exercise();await sentinel(false);
      const initial=await evaluate('window.__closeoutCoreContrast.startFallback()');
      const wait_completed=await waitFor('window.__closeoutCoreContrast.readFallback().final_state === "HIDDEN"',20,50);
      observations[key].fallback={...initial,...await evaluate('window.__closeoutCoreContrast.readFallback()'),wait_completed};
      const start=await evaluate('window.__closeoutCoreContrast.startPersistent()');
      const visible_wait_completed=await waitFor('window.__closeoutCoreContrast.readPersistent()?.state === "VISIBLE"',20,50);
      await send('Runtime.evaluate',{expression:'new Promise(r=>setTimeout(r,250))',awaitPromise:true,returnByValue:true});
      const visible=await evaluate('window.__closeoutCoreContrast.readPersistent()');
      const dismissed=await evaluate('window.__closeoutCoreContrast.fadePersistent()');
      const hidden_wait_completed=await waitFor('window.__closeoutCoreContrast.readPersistent()?.state === "HIDDEN"',20,50);
      const final=await evaluate('window.__closeoutCoreContrast.readPersistent()');
      observations[key].persistent={initial_state:start.state,initial_connected:start.connected,
        visible_state:visible.state,visible_connected:visible.connected,visible_wait_completed,
        dismissed_state:dismissed.state,dismissed_connected:dismissed.connected,
        final_state:final.state,final_connected:final.connected,hidden_wait_completed};
    }
  }catch(error){observations.error=String(error.message||error);}
  finally{
    await sentinel(false);
    await evaluate('window.__closeoutCoreContrast?.cleanup()');
    await setMode(false,previousClass===true);
  }
  return observations;
}

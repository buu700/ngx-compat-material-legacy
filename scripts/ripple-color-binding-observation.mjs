/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Finite packed-theme/public-ripple cascade guard; no extra matrix credit. */
export const RIPPLE_COLOR_CASES=Object.freeze({
 root:['rgba(0, 0, 0, 0.1)','1'],
 dark:['rgba(255, 255, 255, 0.1)','1'],
 custom:['rgba(79, 112, 130, 0.1)','1'],
 variable:['rgb(70, 30, 90)','0.1'],
 modern:['rgba(210, 80, 60, 0.3)','1'],
});
const rowsOkay=(rows,explicit=false)=>Array.isArray(rows)&&rows.length===5
 && Object.keys(RIPPLE_COLOR_CASES).every(id=>{
  const matches=rows.filter(row=>row.id===id);if(matches.length!==1)return false;
  const row=matches[0],[color,opacity]=RIPPLE_COLOR_CASES[id];
  return row.shared_public_instance===true&&row.connected===true&&row.removed===true
   &&row.background===(explicit?'rgb(5, 6, 7)':color)&&row.opacity===opacity
   &&row.position==='absolute'&&row.radius==='50%';
 });
export function rippleColorBindingOkay(o){
 return !!o&&!o.error&&o.shared_public_identity===true&&o.public_styles_copied>0
  &&rowsOkay(o.baseline)&&rowsOkay(o.late_styles)&&rowsOkay(o.explicit_colors,true)
  &&rowsOkay(o.restored)&&o.negative?.root_background==='rgba(23, 24, 25, 0.73)'
  &&o.negative?.dark_background===RIPPLE_COLOR_CASES.dark[0]
  &&o.remaining_elements===0&&/^[a-f0-9]{64}$/.test(o.compiled_theme_css_sha256??'');
}
export async function observeRippleColorBinding({evaluate}){
 const observations={};
 try{
  Object.assign(observations,await evaluate(`(() => {
   const api=window.__closeoutRippleColor;if(!api)return {error:'public ripple fixture missing'};
   const out={shared_public_identity:api.sharedPublicIdentity,baseline:api.exercise(false)};
   // Copy the actual public style loader's output to the end of the head. This
   // challenges the unscoped historical rule at equal selector specificity.
   const styles=[...document.querySelectorAll('style')].map(style=>style.textContent??'')
    .filter(css=>css.includes('.mat-ripple-element')&&css.includes('--mat-ripple-color'));
   const late=document.createElement('style');late.id='closeout-ripple-late-styles';
   late.textContent=styles.join(String.fromCharCode(10));document.head.append(late);out.public_styles_copied=styles.length;
   try{
    out.late_styles=api.exercise(false);out.explicit_colors=api.exercise(true);
    const html=document.documentElement,previous=html.style.getPropertyValue('--mat-ripple-color');
    const priority=html.style.getPropertyPriority('--mat-ripple-color');
    try{
     html.style.setProperty('--mat-ripple-color','rgba(23,24,25,0.73)');
     const negative=api.exercise(false);out.negative={root_background:negative.find(row=>row.id==='root')?.background,
      dark_background:negative.find(row=>row.id==='dark')?.background};
    }finally{if(previous)html.style.setProperty('--mat-ripple-color',previous,priority);else html.style.removeProperty('--mat-ripple-color');}
    out.restored=api.exercise(false);out.remaining_elements=api.remainingElements();
   }finally{late.remove();}
   return out;
  })()`));
 }catch(error){observations.error=String(error.message||error);}
 return observations;
}

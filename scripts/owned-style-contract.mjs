/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Shared finite owned-style catalog and property/context contracts. No browser or installer. */
export const OWNED_STYLE_PROBES = Object.freeze({
  'light/disabled-placeholder': {context:'light', selector:'#s-disabled .mat-select-placeholder', properties:['color']},
  'light/disabled-value': {context:'light', selector:'#s-value .mat-select-value-text', properties:['color']},
  'light/invalid-arrow': {context:'light', selector:'#s-invalid .mat-select-arrow', properties:['color']},
  'light/snack-container': {context:'light', selector:'.mat-snack-bar-container', properties:['color','background-color']},
  'light/snack-action': {context:'light', selector:'.mat-simple-snackbar-action', properties:['color','line-height']},
  'light/snack-primary-action': {context:'light', selector:'.mat-simple-snackbar-action button', properties:['color']},
  'custom/disabled-placeholder': {context:'custom', selector:'#s-disabled .mat-select-placeholder', properties:['color']},
  'custom/invalid-arrow': {context:'custom', selector:'#s-invalid .mat-select-arrow', properties:['color']},
  'light/button-inheritance': {context:'light', selector:'#s-button', properties:['font-size','font-weight','line-height','height']},
  'custom/button-inheritance': {context:'custom', selector:'#s-button', properties:['font-size','font-weight','line-height','height']},
  'light/datepicker-text-button': {context:'light', selector:'#s-mdc-text', properties:['font-size','font-weight','line-height','height']},
  'light/datepicker-raised-button': {context:'light', selector:'#s-mdc-raised', properties:['font-size','font-weight','line-height','height']},
  'light/datepicker-flat-button': {context:'light', selector:'#s-mdc-flat', properties:['font-size','font-weight','line-height','height']},
  'light/datepicker-stroked-button': {context:'light', selector:'#s-mdc-stroked', properties:['font-size','font-weight','line-height','height']},
  'light/outside-datepicker-button': {context:'light', selector:'#s-mdc-outside', properties:['font-size','font-weight','line-height','height']},
  'custom/datepicker-text-button': {context:'custom', selector:'#s-mdc-text', properties:['font-size','font-weight','line-height','height']},
  'custom/datepicker-raised-button': {context:'custom', selector:'#s-mdc-raised', properties:['font-size','font-weight','line-height','height']},
  'custom/datepicker-flat-button': {context:'custom', selector:'#s-mdc-flat', properties:['font-size','font-weight','line-height','height']},
  'custom/datepicker-stroked-button': {context:'custom', selector:'#s-mdc-stroked', properties:['font-size','font-weight','line-height','height']},
  'custom/outside-datepicker-button': {context:'custom', selector:'#s-mdc-outside', properties:['font-size','font-weight','line-height','height']},
  "typography/legacy-button": {"context":"typography","selector":"#s-button","properties":["font-family","font-size","font-weight","line-height","rect-height","rect-width"]},
  "typography/select-value": {"context":"typography","selector":"#s-disabled .mat-select-value","properties":["font-family","font-size","line-height","rect-height","rect-width"]},
  "typography/form-field-infix": {"context":"typography","selector":".mat-form-field-infix","properties":["font-family","font-size","line-height","padding-top","padding-bottom","rect-height","rect-width"]},
  "typography/snack-action": {"context":"typography","selector":".mat-simple-snackbar-action button","properties":["font-family","font-size","font-weight","line-height","rect-height","rect-width"]},
  'custom/disabled-value': {context:'custom', selector:'#s-value .mat-select-value-text', properties:['color']},
  ...Object.fromEntries(['theme-light','theme-dark'].flatMap(context=>[
    ['disabled-placeholder','#s-disabled .mat-select-placeholder',['color']],
    ['disabled-value','#s-value .mat-select-value-text',['color']],
    ['invalid-arrow','#s-invalid .mat-select-arrow',['color']],
    ['snack-container','.mat-snack-bar-container',['color','background-color']],
    ['snack-action','.mat-simple-snackbar-action',['color','line-height']],
    ['snack-primary-action','.mat-simple-snackbar-action button',['color']],
  ].map(([name,selector,properties])=>[context+'/'+name,{context,selector,properties}]))),
  ...Object.fromEntries(['light','custom','typography','theme-light','theme-dark'].flatMap(context=>[
    ['visible-disabled-placeholder','#s-standalone .mat-select-placeholder',['color','visibility','opacity','effective-opacity','rect-height','rect-width']],
    ['combined-disabled-invalid-arrow','#s-combined.mat-select-invalid .mat-select-arrow',['color']],
    ['snack-focused-action','.mat-simple-snackbar-action button',['color','state-active'],'focus'],
    ['snack-disabled-action','.mat-simple-snackbar-action button',['color','state-active'],'disabled'],
  ].map(([name,selector,properties,state])=>[context+'/'+name,{context,selector,properties,...(state?{state}:{})}]))),
});
export const OWNED_STYLE_CONTEXTS=Object.freeze(['light','custom','typography','theme-light','theme-dark']);
export const ownedThemeVariant=context=>context==='theme-light'?'custom-full-theme':context==='theme-dark'?'custom-dark-theme':null;
export const ownedStyleCaseIds = () => Object.keys(OWNED_STYLE_PROBES).map(id => `owned-style/${id}`);
function themeWitness(id,context,reference,candidate){
  if(!ownedThemeVariant(context))return null;
  const snack=id.split('/')[1].startsWith('snack-'),dark=context==='theme-dark';
  // These independent tagged recipes use primary600/warn500 by default and
  // custom primary700(text300)/warn900; dark disabled text and snack surfaces
  // also differ. Read actual computed values rather than hardcoding RGB output.
  const name=snack?(dark?'snack-container':'snack-primary-action'):(dark?'visible-disabled-placeholder':'invalid-arrow');
  const property=snack&&dark?'background-color':'color',baseline='light/'+name,themed=context+'/'+name;
  return {baseline_case_id:'owned-style/'+baseline,themed_case_id:'owned-style/'+themed,property,
    reference:{baseline:reference?.[baseline]?.values?.[property]??null,themed:reference?.[themed]?.values?.[property]??null},
    candidate:{baseline:candidate?.[baseline]?.values?.[property]??null,themed:candidate?.[themed]?.values?.[property]??null}};
}
export function assessOwnedStyles(reference, candidate, negative) {
  return Object.fromEntries(Object.entries(OWNED_STYLE_PROBES).map(([id,spec])=>{
    const before=reference?.[id], after=candidate?.[id];
    const properties=spec.properties.map(property=>({property,reference:before?.values?.[property]??null,candidate:after?.values?.[property]??null}));
    const found=before?.found===true&&after?.found===true;
    const stateActive=!spec.state||[before,after].every(v=>v?.values?.['state-active']==='true');
    const visible=!spec.properties.includes('visibility')||(['reference','candidate'].every(mode=>({reference:before,candidate:after}[mode]?.values?.visibility==='visible' && Number({reference:before,candidate:after}[mode]?.values?.opacity)>0 && Number({reference:before,candidate:after}[mode]?.values?.['effective-opacity'])>0)));
    const match=found&&properties.every(p=>typeof p.reference==='string'&&p.reference!==''&&p.candidate===p.reference&&(!p.property.startsWith('rect-')||(Number.isFinite(Number(p.reference))&&Number(p.reference)>0)));
    const mutation=negative?.[id];
    const mutationProperty=spec.properties.includes('line-height')?'line-height':spec.properties[0];
    const mutationReference=before?.values?.[mutationProperty];
    const mutationObserved=mutation?.values?.[mutationProperty];
    const sensitivity=mutation?.found===true&&typeof mutationReference==='string'&&mutationReference!==''&&typeof mutationObserved==='string'&&mutationObserved!==''&&mutationObserved!==mutationReference;
    const reference_kind=spec.context==='typography'||ownedThemeVariant(spec.context)?'untouched-material-16.2.14-compiled-css':'untouched-material-16.2.14-css';
    const customization_witness=themeWitness(id,spec.context,reference,candidate);
    const effective=!customization_witness||(Object.values(customization_witness.reference).every(value=>typeof value==='string'&&value.length>0)
      &&customization_witness.reference.baseline!==customization_witness.reference.themed
      &&customization_witness.reference.baseline===customization_witness.candidate.baseline&&customization_witness.reference.themed===customization_witness.candidate.themed);
    return [id,{case_id:`owned-style/${id}`,group:'owned-rendered',kind:'assertion',result:match&&sensitivity&&effective&&visible&&stateActive?'pass':'fail',selector:spec.selector,context:spec.context,reference_kind,
      ...(customization_witness?{customization_witness}:{}),found,properties,mutation_detected:sensitivity,mutation:{found:mutation?.found===true,property:mutationProperty,reference:mutationReference??null,observed:mutationObserved??null}}];
  }));
}

/** Use the same finite context setup for positive and wrong-style captures.
 * Full-theme selectors must cover body overlays, not only the nested controls. */
export function ownedStyleContextProgram(context,mode){
  if(!OWNED_STYLE_CONTEXTS.includes(context)||!['reference','candidate'].includes(mode))throw new Error('unknown owned style context');
  return `(()=>{
    const context=${JSON.stringify(context)},mode=${JSON.stringify(mode)};
    document.getElementById('light-sheet').textContent=window.__ownedStyleSheets['light-'+mode];
    document.getElementById('custom-sheet').textContent=context==='custom'?window.__ownedStyleSheets['custom-'+mode]:'';
    const full=context==='typography'||context==='theme-light'||context==='theme-dark';
    document.getElementById('typography-sheet').textContent=full?window.__ownedStyleSheets[context+'-'+mode]:'';
    document.body.classList.toggle('sass-argument-probe',full);
    document.body.dataset.ownedStyleContext=context;
    document.getElementById('style-context').className=context==='custom'?'shell':'';
    document.querySelector('.mat-simple-snackbar-action button').classList.add('mat-primary');
    return true;
  })()`;
}

/** Action click must complete, and a later snackbar must reopen and dismiss independently. */
export function assessSnackLifecycle(x){return !!x && x.first_removed===true && x.reopened===true && x.second_removed===true && x.negative_removed===true && JSON.stringify(x.negative_events)===JSON.stringify(['dismissed:false']) && JSON.stringify(x.negative_events)!==JSON.stringify(x.first_events) && JSON.stringify(x.first_events)===JSON.stringify(['action','dismissed:true']) && JSON.stringify(x.second_events)===JSON.stringify(['dismissed:false']);}

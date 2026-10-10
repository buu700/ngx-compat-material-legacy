/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Packed list/real reactive control blur; supplemental guard, no extra matrix cells. */
export function legacyChipBlurNativeOkay(o) {
  return !!o && !o.error && o.focused_before === true && o.touched_before === false &&
    o.focused_after === false && o.touched_after === true && o.dom_focus_moved === true;
}
export async function observeLegacyChipBlurNative({evaluate,waitFor}) {
  const read=()=>evaluate(`(()=>{
    const state=document.getElementById('chip-form-state');
    return {focused:state?.dataset.focused==='true',touched:state?.dataset.touched==='true',
      state_present:!!state,dom_focus_moved:document.activeElement===document.getElementById('ff-input')};
  })()`);
  const o={};
  try {
    if(!await waitFor('document.getElementById("chip-form-state")?.dataset.focused==="true"'))throw new Error('real chip list did not report focus');
    const before=await read();Object.assign(o,{focused_before:before.focused,touched_before:before.touched});
    await evaluate('document.getElementById("ff-input").focus()');
    if(!await waitFor('document.getElementById("chip-form-state")?.dataset.focused==="false"&&document.getElementById("chip-form-state")?.dataset.touched==="true"'))throw new Error('real chip blur/form state did not settle');
    const after=await read();Object.assign(o,{focused_after:after.focused,touched_after:after.touched,dom_focus_moved:after.dom_focus_moved});
  } catch(error) {o.error=String(error.message||error);}
  return o;
}

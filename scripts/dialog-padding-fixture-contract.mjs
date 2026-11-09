/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 *
 * Source-derived candidate expectations for the exact 22.1.7 fixture. These
 * are not browser observations or an admission into a release matrix.
 */
import {isDeepStrictEqual} from 'node:util';

const box=(top,right,bottom,left)=>({top,right,bottom,left});
const ZERO=box('0px','0px','0px','0px');
export const PEER_PADDING_EXPECTATIONS=Object.freeze({
  baseline:{
    surface:{padding:ZERO,margin:ZERO},
    title:{padding:box('6px','24px','13px','24px'),margin:box('0px','0px','1px','0px')},
    content:{padding:box('0px','24px','0px','24px'),margin:ZERO},
    actions:{padding:box('16px','24px','16px','24px'),margin:ZERO},
    input:{padding:ZERO,margin:ZERO},
  },
  optin:{
    surface:{padding:box('24px','24px','24px','24px'),margin:ZERO},
    title:{padding:box('6px','24px','13px','24px'),margin:box('-24px','-24px','1px','-24px')},
    content:{padding:box('0px','24px','0px','24px'),margin:box('0px','-24px','0px','-24px')},
    actions:{padding:box('16px','24px','16px','24px'),margin:box('0px','-24px','-24px','-24px')},
    input:{padding:ZERO,margin:ZERO},
  },
});
// Independently derived from the owned dialog.scss and its actual directive classes.
export const LEGACY_PADDING_EXPECTATIONS=Object.freeze({
  surface:{padding:box('24px','24px','24px','24px'),margin:ZERO},
  title:{padding:ZERO,margin:box('0px','0px','20px','0px')},
  content:{padding:box('0px','24px','0px','24px'),margin:box('0px','-24px','0px','-24px')},
  actions:{padding:box('8px','0px','8px','0px'),margin:box('0px','0px','-24px','0px')},
});
export const WRONG_VALUE_CSS='.dp-current-optin .mat-mdc-dialog-surface { padding-left: 23px !important; }';

/** Browser-side expression: exact real component nodes, body overlay and theme ancestry. */
export const DIALOG_PADDING_OBSERVE=`(() => {
 const sides=['top','right','bottom','left'];
 const box=(style,prefix)=>Object.fromEntries(sides.map(side=>[side,style.getPropertyValue(prefix+'-'+side)]));
 const panelNames=['current-baseline','current-optin','legacy-baseline','legacy-optin'];
 const all={};
 for(const name of panelNames){
  const panes=[...document.querySelectorAll('.cdk-overlay-pane.dp-'+name)];
  if(panes.length!==1){all[name]={found:false,paneCount:panes.length};continue;}
  const pane=panes[0],legacy=name.startsWith('legacy-');
  const find=selector=>{const nodes=[...pane.querySelectorAll(selector)];return nodes.length===1?nodes[0]:null};
  const container=find(legacy?'.mat-dialog-container':'.mat-mdc-dialog-container');
  const surface=legacy?container:find('.mat-mdc-dialog-surface');
  const title=find(legacy?'.mat-dialog-title':'.mat-mdc-dialog-title');
  const content=find(legacy?'.mat-dialog-content':'.mat-mdc-dialog-content');
  const actions=find(legacy?'.mat-dialog-actions':'.mat-mdc-dialog-actions');
  const input=find(legacy?'input':'.mat-mdc-input-element.mdc-text-field__input');
  const nodes={surface,title,content,actions,input};const roles={};
  for(const [role,node] of Object.entries(nodes)){if(!node){roles[role]=null;continue;}const style=getComputedStyle(node);roles[role]={padding:box(style,'padding'),margin:box(style,'margin')};}
  all[name]={found:Object.values(nodes).every(Boolean),paneCount:panes.length,
   bodyOverlay:!!pane.closest('.cdk-overlay-container')&&pane.closest('.cdk-overlay-container').parentElement===document.body,
   outsideNested:!document.querySelector('#nested-theme')?.contains(pane),
   peerActionContainer:legacy?null:container?.classList.contains('mat-mdc-dialog-container-with-actions'),
   peerAdjacent:legacy?null:!!title&&title.nextElementSibling===content&&content?.nextElementSibling===actions,
   legacyHasNoMdcDialog:legacy?!pane.querySelector('.mat-mdc-dialog-container,.mat-mdc-dialog-surface,.mat-mdc-dialog-content,.mat-mdc-dialog-title,.mat-mdc-dialog-actions'):null,
   themePrimary:getComputedStyle(document.body).getPropertyValue('--mat-sys-primary').trim(),roles};
 }
 return all;
})()`;

function validFrame(frame,legacy){return frame?.found===true&&frame.paneCount===1&&frame.bodyOverlay===true&&frame.outsideNested===true&&typeof frame.themePrimary==='string'&&frame.themePrimary.length>0&&(legacy?frame.legacyHasNoMdcDialog===true:frame.peerActionContainer===true&&frame.peerAdjacent===true);}
function legacyExpected(frame){return Object.entries(LEGACY_PADDING_EXPECTATIONS).every(([role,value])=>isDeepStrictEqual(frame?.roles?.[role],value));}
/** Require exact positive boxes and a live wrong-value control, without accepting missing nodes. */
export function assessDialogPadding(positive,negative){
 const cb=positive?.['current-baseline'],co=positive?.['current-optin'],lb=positive?.['legacy-baseline'],lo=positive?.['legacy-optin'];
 const frames=[cb,co,lb,lo];
 const frameOk=validFrame(cb,false)&&validFrame(co,false)&&validFrame(lb,true)&&validFrame(lo,true)&&frames.every(f=>f.themePrimary===cb.themePrimary);
 const peer=frameOk&&isDeepStrictEqual(cb.roles,PEER_PADDING_EXPECTATIONS.baseline)&&isDeepStrictEqual(co.roles,PEER_PADDING_EXPECTATIONS.optin);
 const legacy=frameOk&&legacyExpected(lb)&&legacyExpected(lo)&&isDeepStrictEqual(lb.roles,lo.roles);
 const negativeTarget=negative?.['current-optin'],negativeBaseline=negative?.['current-baseline'],negativeLegacyBaseline=negative?.['legacy-baseline'],negativeLegacyOptin=negative?.['legacy-optin'];
 const expectedBad=structuredClone(PEER_PADDING_EXPECTATIONS.optin);expectedBad.surface.padding.left='23px';
 const mutation=validFrame(negativeTarget,false)&&validFrame(negativeBaseline,false)&&isDeepStrictEqual(negativeTarget.roles,expectedBad)&&isDeepStrictEqual(negativeBaseline.roles,PEER_PADDING_EXPECTATIONS.baseline)&&negativeTarget.themePrimary===cb?.themePrimary&&validFrame(negativeLegacyBaseline,true)&&validFrame(negativeLegacyOptin,true)&&isDeepStrictEqual(negativeLegacyBaseline.roles,lb?.roles)&&isDeepStrictEqual(negativeLegacyOptin.roles,lo?.roles);
 return {frame:frameOk,peer,legacy,mutation,pass:frameOk&&peer&&legacy&&mutation};
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Pure finite raw-CSS insertions. Callers must authenticate the entire original,
 * its program/source/producer and current measurement separately. No admission. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
const hash=value=>createHash('sha256').update(value).digest('hex');
export const ORDINARY_CHECKBOX_BUTTON_CASES=Object.freeze(['checkbox','button'].flatMap(family=>
 ['color','typography','density','theme'].flatMap(dimension=>[
  'mixin-css/'+family+'-'+dimension,
  ...((dimension==='theme'?['custom-full-theme','custom-dark-theme']:dimension==='color'?['custom-full-theme','raw-color-config']:dimension==='typography'?['custom-full-theme','raw-typography-config']:['custom-full-theme','raw-density-config']).map(v=>'mixin-argument/'+family+'-'+dimension+'/'+v)),
 ])));
function fields(value,keys){
 assert.ok(value&&typeof value==='object'&&!types.isProxy(value));assert.equal(Object.getPrototypeOf(value),Object.prototype);
 const ds=Object.getOwnPropertyDescriptors(value),out={};
 for(const k of keys){const d=ds[k];assert.ok(d&&Object.hasOwn(d,'value')&&d.enumerable);out[k]=d.value;}return out;
}
const checkboxColorKeys=['disabled-selected-icon-color','disabled-unselected-icon-color','selected-checkmark-color','selected-focus-icon-color','selected-hover-icon-color','selected-icon-color','selected-pressed-icon-color','unselected-focus-icon-color','unselected-hover-icon-color','unselected-icon-color','unselected-pressed-icon-color','selected-focus-state-layer-color','selected-hover-state-layer-color','selected-pressed-state-layer-color','unselected-focus-state-layer-color','unselected-hover-state-layer-color','unselected-pressed-state-layer-color'];
const typographyKeys=['-moz-osx-font-smoothing','-webkit-font-smoothing','font-family','font-size','line-height','font-weight','letter-spacing','text-decoration','text-transform'];
const variants=[['text','mat-mdc-button'],['filled','mat-mdc-unelevated-button'],['protected','mat-mdc-raised-button'],['outlined','mat-mdc-outlined-button']];
const geometry={
 0:['0px 0px 0px 0px','0px 0px 0px 0px','0px 0px 0px 0px'],
 2:['0px 3px 1px -2px','0px 2px 2px 0px','0px 1px 5px 0px'],
 4:['0px 2px 4px -1px','0px 4px 5px 0px','0px 1px 10px 0px'],
 8:['0px 5px 5px -3px','0px 8px 10px 1px','0px 3px 14px 2px'],
};
const shadow=level=>geometry[level].map((v,i)=>v+' rgba(0, 0, 0, '+['0.2','0.14','0.12'][i]+')').join(', ');
function fallback(value){
 // Remove only the independently owned MDC wrappers, retaining any caller CSS var.
 while(/^var\(--mdc-(?:typography|theme)-/.test(value)){
  const comma=value.indexOf(', ');assert.ok(comma>0&&value.endsWith(')'));value=value.slice(comma+2,-1);
 }return value;
}
function parse(css){
 assert.equal(typeof css,'string');assert.ok(css.length>0&&!css.includes('\r'));
 const rules=[],pattern=/([^{}]+)\{([^{}]*)\}/g;let cursor=0,match;
 while((match=pattern.exec(css))){
  assert.equal(match.index,cursor);const leading=/^\s*/.exec(match[1])[0],header=match[1].slice(leading.length);
  assert.ok(header.endsWith(' '));const selector=header.slice(0,-1),body=match[2];
  assert.ok(body.startsWith('\n')&&body.endsWith('\n'));
  const rows=body.slice(1,-1).split('\n').map(line=>{const m=/^  ([a-z-]+): ([^;\r\n{}]+);$/.exec(line);assert.ok(m,'noncanonical original declaration');return[m[1],m[2]];});
  assert.equal(new Set(rows.map(r=>r[0])).size,rows.length);
  rules.push({selector,headStart:match.index+leading.length,bodyStart:match.index+match[1].length+1,close:pattern.lastIndex-1,end:pattern.lastIndex,rows,map:Object.fromEntries(rows)});
  cursor=pattern.lastIndex;
 }assert.equal(cursor,css.length);return rules;
}
function build(css,scope,family,dimension){
 const rules=parse(css),ops=[];let cursor=0;
 const take=(selector,keys)=>{const r=rules[cursor++];assert.ok(r,'missing original rule');assert.equal(r.selector,selector);if(keys)assert.deepEqual(r.rows.map(x=>x[0]),keys);return r;};
 const decls=pairs=>pairs.map(([k,v])=>'  '+k+': '+v+';\n').join('');
 const rule=(selector,pairs)=>selector+' {\n'+decls(pairs)+'}';
 const append=(r,pairs)=>ops.push([r.close,decls(pairs)]);
 const prepend=(r,pairs)=>ops.push([r.bodyStart+1,decls(pairs)]);
 const after=(r,text)=>ops.push([r.end,'\n'+text]);
 const before=(r,text)=>ops.push([r.headStart,text+'\n']);
 const publicPairs=(prefix,pairs)=>pairs.map(([k,v])=>['--mat-'+prefix+'-'+k,v]);
 if(family==='checkbox'){
  if(dimension==='color'||dimension==='theme'){
   const colorRules=['', ' .mat-mdc-checkbox.mat-primary',' .mat-mdc-checkbox.mat-warn'].map(s=>take(scope+s,checkboxColorKeys.map(k=>'--mdc-checkbox-'+k)));
   const label=take(scope+' .mat-mdc-checkbox .mdc-form-field',['color']);
   const disabled=take(scope+' .mat-mdc-checkbox.mat-mdc-checkbox-disabled label',['color']);
   for(const r of colorRules){
    assert.equal(r.map['--mdc-checkbox-unselected-pressed-icon-color'],r.map['--mdc-checkbox-unselected-icon-color']);
    const pairs=checkboxColorKeys.filter(k=>k!=='unselected-pressed-icon-color').map(k=>[k,r.map['--mdc-checkbox-'+k]]);
    pairs.push(['disabled-selected-checkmark-color','#fff'],
     ...['selected','unselected'].flatMap(state=>[['focus','0.16'],['hover','0.04'],['pressed','0.16']].map(([event,v])=>[state+'-'+event+'-state-layer-opacity',v])),
     ['disabled-label-color',disabled.map.color]);
    append(r,publicPairs('checkbox',pairs));
   }
   after(label,rule(scope+' .mat-mdc-checkbox',publicPairs('checkbox',[['label-text-color',fallback(label.map.color)]])));
  }
  if(dimension==='density'||dimension==='theme'){
   const density=take(scope,['--mdc-checkbox-state-layer-size']);
   let unsupported=false;
   if(rules[cursor]?.selector===scope+' .mat-mdc-checkbox-touch-target'){const touch=take(scope+' .mat-mdc-checkbox-touch-target',['display']);assert.equal(touch.map.display,'none');unsupported=true;}
   append(density,publicPairs('checkbox',[['state-layer-size',density.map['--mdc-checkbox-state-layer-size']],['touch-target-size','48px'],['touch-target-display','block'],...(unsupported?[['touch-target-display','none']]:[])]));
  }
  if(dimension==='typography'||dimension==='theme'){
   const type=take(scope+' .mat-mdc-checkbox .mdc-form-field',typographyKeys);
   after(type,rule(scope+' .mat-mdc-checkbox',publicPairs('checkbox',[
    ['label-text-font',fallback(type.map['font-family'])],['label-text-line-height',fallback(type.map['line-height'])],
    ['label-text-size',fallback(type.map['font-size'])],['label-text-tracking',fallback(type.map['letter-spacing'])],['label-text-weight',fallback(type.map['font-weight'])],
   ])));
  }
 }else{
  assert.equal(family,'button');
  if(dimension==='color'||dimension==='theme'){
   for(const[kind,cls]of variants){
    const base=scope+' .'+cls,prefix='--mdc-'+kind+'-button-';
    let outline;if(kind==='outlined')outline=take(base,[prefix+'outline-color']);
    const roles=['mat-unthemed','mat-primary','mat-accent','mat-warn'].map(role=>take(base+'.'+role,kind==='filled'||kind==='protected'?[prefix+'container-color',prefix+'label-text-color']:[prefix+'label-text-color']));
    const disabledKeys=kind==='text'?['disabled-label-text-color','label-text-color']:kind==='outlined'?['label-text-color','disabled-label-text-color','outline-color','disabled-outline-color']:['disabled-container-color','disabled-label-text-color','container-color','label-text-color',...(kind==='protected'?['container-elevation']:[])];
    const disabled=take(base+'[disabled][disabled]',disabledKeys.map(k=>prefix+k));
    const ink=disabled.map[prefix+'disabled-label-text-color'],container=disabled.map[prefix+'disabled-container-color'];
    const common=[[kind+'-disabled-label-text-color',ink]];
    if(kind==='filled'||kind==='protected')common.push([kind+'-disabled-container-color',container]);
    if(kind==='protected')common.push(...[['container-elevation-shadow',2],['hover-container-elevation-shadow',4],['focus-container-elevation-shadow',4],['pressed-container-elevation-shadow',8],['disabled-container-elevation-shadow',0]].map(([k,v])=>[kind+'-'+k,shadow(v)]));
    if(kind==='outlined'){const color=outline.map[prefix+'outline-color'];common.push(['outlined-outline-color',color],['outlined-disabled-outline-color',color]);prepend(outline,publicPairs('button',common));}
    else before(roles[0],rule(base,publicPairs('button',common)));
    for(const r of roles)append(r,publicPairs('button',r.rows.map(([k,v])=>[kind+'-'+k.slice(prefix.length),v])));
    append(disabled,publicPairs('button',disabled.rows.map(([k,v])=>[kind+'-'+(k===prefix+'container-elevation'?'container-elevation-shadow':k.slice(prefix.length)),k===prefix+'container-elevation'?shadow(0):v]).concat(kind==='protected'?[['protected-disabled-container-elevation-shadow',shadow(0)]]:[])));
   }
   for(const group of [[['text','mat-mdc-button'],['outlined','mat-mdc-outlined-button']],[['protected','mat-mdc-raised-button'],['filled','mat-mdc-unelevated-button']]]){
    const sels=suffix=>group.map(([,cls])=>scope+' .'+cls+suffix).join(', ');
    const hover=take(sels(':hover .mat-mdc-button-persistent-ripple::before'),['opacity']);
    const focus=take(group.flatMap(([,cls])=>['.cdk-program-focused','.cdk-keyboard-focused'].map(state=>scope+' .'+cls+state+' .mat-mdc-button-persistent-ripple::before')).join(', '),['opacity']);
    const press=take(sels(':active .mat-mdc-button-persistent-ripple::before'),['opacity']);
    const originals=['','.mat-primary','.mat-accent','.mat-warn'].map(role=>take(sels(role),['--mat-mdc-button-persistent-ripple-color','--mat-mdc-button-ripple-color']));
    const additions=originals.map(r=>rule(r.selector,publicPairs('button',group.flatMap(([kind])=>[
     [kind+'-state-layer-color',r.map['--mat-mdc-button-persistent-ripple-color']],
     [kind+'-disabled-state-layer-color',r.map['--mat-mdc-button-persistent-ripple-color']],
     [kind+'-ripple-color',r.map['--mat-mdc-button-ripple-color']],
     [kind+'-hover-state-layer-opacity',hover.map.opacity],[kind+'-focus-state-layer-opacity',focus.map.opacity],[kind+'-pressed-state-layer-opacity',press.map.opacity],
    ]))));
    after(originals.at(-1),additions.join('\n'));
   }
  }
  if(dimension==='density'||dimension==='theme'){
   // Source selector order is text/protected/filled/outlined, distinct from token map order.
   const ordered=[variants[0],variants[2],variants[1],variants[3]].map(([,cls])=>scope+' .'+cls+'.mat-mdc-button-base');
   const density=take(ordered.join(',\n'));const reset=density.rows.length!==1;assert.deepEqual(density.rows.map(r=>r[0]),reset?['height','margin-top','margin-bottom']:['height']);
   let last=density,unsupported=false;
   if(reset){last=take(ordered.map(s=>s+' .mdc-button__touch').join(',\n'),['height']);assert.equal(last.map.height,'100%');}
   if(rules[cursor]?.selector===ordered.map(s=>s+' .mat-mdc-button-touch-target').join(',\n')){last=take(ordered.map(s=>s+' .mat-mdc-button-touch-target').join(',\n'),['display']);assert.equal(last.map.display,'none');unsupported=true;}
   const pairs=display=>variants.flatMap(([kind])=>[[kind+'-container-height',density.map.height],[kind+'-touch-target-size','48px'],[kind+'-touch-target-display',display]]);
   const tokens=publicPairs('button',[...pairs('block'),...(unsupported?pairs('none'):[])]);
   if(reset)after(last,rule(ordered.join(',\n'),tokens));else append(density,tokens);
  }
  if(dimension==='typography'||dimension==='theme'){
   const type=take(scope+' .mdc-button',typographyKeys);
   after(type,rule(scope,publicPairs('button',variants.flatMap(([kind])=>[
    [kind+'-label-text-font',fallback(type.map['font-family'])],[kind+'-label-text-size',fallback(type.map['font-size'])],
    [kind+'-label-text-tracking',fallback(type.map['letter-spacing'])],[kind+'-label-text-weight',fallback(type.map['font-weight'])],[kind+'-label-text-transform',fallback(type.map['text-transform'])],
   ]))));
  }
 }
 assert.equal(cursor,rules.length,'unmodeled original CSS rule');
 for(const[pos,text]of ops.sort((a,b)=>b[0]-a[0]))css=css.slice(0,pos)+text+css.slice(pos);
 return css;
}
export function ordinaryCheckboxButtonExpectedCss(args){
 try{
  const{caseId,originalCss}=fields(args,['caseId','originalCss']);assert.ok(ORDINARY_CHECKBOX_BUTTON_CASES.includes(caseId));
  const match=/^(mixin-css|mixin-argument)\/(checkbox|button)-(color|typography|density|theme)(?:\/[^/]+)?$/.exec(caseId);assert.ok(match);
  return build(originalCss,match[1]==='mixin-css'?'.sass-api-probe':'.sass-argument-probe',match[2],match[3]);
 }catch{return null;}
}
export function ordinaryCheckboxButtonResultsMatch(args){
 try{
  const{caseId,original,actual}=fields(args,['caseId','original','actual']),a=fields(actual,['css','css_sha256','css_bytes']),o=fields(original,['css','css_sha256','css_bytes']);
  for(const v of[a,o])assert.ok(typeof v.css==='string'&&v.css_sha256===hash(v.css)&&Number.isSafeInteger(v.css_bytes)&&v.css_bytes===Buffer.byteLength(v.css));
  const expected=ordinaryCheckboxButtonExpectedCss({caseId,originalCss:o.css});return expected!==null&&a.css===expected;
 }catch{return false;}
}

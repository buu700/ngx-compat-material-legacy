/** Eight color/theme aggregates: exact historical CSS and finite public additions. */
import {createHash} from 'node:crypto';
import {historicalStepperPeerCss} from './sass-stepper-historical-model.mjs';
import {readFileSync} from 'node:fs';
import {SCENARIOS,themeSass,COMPANIONS} from './companion-bridge-peer-oracle.mjs';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
import {ORIGINAL_CALENDAR_DENSITY,CURRENT_CALENDAR_FALLBACKS} from './sass-datepicker-controls-contract.mjs';
import {FORM_FIELD_STATE_AGGREGATE_CASES,insertFormFieldStateInAggregate} from './sass-form-field-state-contract.mjs';
import {insertRippleColorInExpectedModel,rippleColorMeasurementOkay} from './sass-ripple-color-contract.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const catalog=JSON.parse(readFileSync(new URL('../fixtures/sass/aggregate-color-theme-contracts.json',import.meta.url)));
const names=['all-component-colors','all-component-themes','all-legacy-component-colors','all-legacy-component-themes'];
const ids=names.flatMap(name=>['custom-full-theme',name.endsWith('colors')?'raw-color-config':'custom-dark-theme'].map(v=>`mixin-argument/${name}/${v}`));
const oracleBytes=readFileSync(new URL('../compatibility/rc/oracles/material-16.2.14-sass-api.json',import.meta.url));
const oracle=JSON.parse(oracleBytes);
if(catalog.schema_version!==1 || JSON.stringify(Object.keys(catalog.cases).sort())!==JSON.stringify(ids.sort())
  || sha(oracleBytes)!==catalog.original_membership.oracle_sha256
  || names.some(n=>JSON.stringify(oracle.members.mixins[n].aggregate)!==JSON.stringify(catalog.original_membership.aggregates[n])))throw Error('finite color/theme aggregate scope changed');
export const AGGREGATE_COLOR_THEME_CASES=Object.freeze(catalog.cases);
const marker=(family,part)=>`/*!__closeout_${family}_${part}__*/`;
const peerFamilies=[...COMPANIONS,'current-high-contrast','current-progress-color'];
const highContrast='.cdk-high-contrast-active .sass-argument-probe .mat-badge-content {\n  outline: solid 1px;\n  border-radius: 0;\n}';
const opening='.sass-argument-probe {\n';

export function aggregateColorThemePeerProgram(caseId){
  const entry=AGGREGATE_COLOR_THEME_CASES[caseId],profile=catalog.profiles[entry?.peer_profile];if(!profile)return null;
  const scenario=SCENARIOS.find(s=>s.id===`closeout-custom-${profile.profile}-${profile.type}`);
  const dimensions=profile.dimension==='colors'?['color']:['color','typography','density'];
  return "@use '@angular/material' as peer;\n@use '@angular/cdk' as cdk;\n"+themeSass('peer',scenario,{m2Prefix:'m2-'})
    +COMPANIONS.map(f=>{
      const selected=f==='datepicker'?dimensions.filter(d=>d!=='density'):dimensions;
      const controls=f==='datepicker'&&dimensions.includes('density')?' .mat-calendar-controls { @include peer.icon-button-overrides((touch-target-display: none)); .mat-mdc-icon-button.mat-mdc-button-base { @include peer.icon-button-overrides((state-layer-size: 40px)); } }':'';
      return marker(f,'begin')+'\n.sass-argument-probe { '+['base',...selected].map(d=>`@include peer.${f}-${d}($theme);`).join(' ')+controls+' }\n'+marker(f,'end');
    }).join('\n')+'\n'+marker('current-high-contrast','begin')+'\n.sass-argument-probe .mat-badge-content { @include cdk.high-contrast(active) { outline: solid 1px; border-radius: 0; } }\n'+marker('current-high-contrast','end')+'\n'+marker('current-progress-color','begin')+'\n.sass-argument-probe { @include peer.progress-bar-color($theme); }\n'+marker('current-progress-color','end')+'\n';
}
export function measureAggregateColorThemePeer(options){
  const program=aggregateColorThemePeerProgram(options.caseId);
  return program===null?null:measureM2PeerProgram({...options,program});
}
function members(css){
  const result={};
  for(const f of peerFamilies){
    const start=marker(f,'begin'),end=marker(f,'end');
    if(css.split(start).length!==2 || css.split(end).length!==2)return null;
    result[f]=css.split(start)[1].split(end)[0].trim();
  }
  return result;
}
function parent(...parts){
  const values=parts.filter(Boolean);
  if(values.some(s=>!s.startsWith(opening)||!s.endsWith('\n}')||s.split(opening).length!==2))return null;
  return opening+values.map(s=>s.slice(opening.length,-2)).join('\n')+'\n}';
}
function badge(original,peer,forced,separator){
  if(original.split('  border-radius: 50%;').length!==2 || original.split(highContrast+'\n\n').length!==2)return null;
  let css=original.replace('  border-radius: 50%;','  border-radius: var(--mat-badge-container-shape, 50%);');
  for(const [size,value,geometry,height] of [['small',16,'legacy-small-size-container-size','small-size-line-height'],['medium',22,'legacy-container-size','line-height'],['large',28,'legacy-large-size-container-size','large-size-line-height']]){
    const old=`.sass-argument-probe .mat-badge-${size} .mat-badge-content {\n  width: ${value}px;\n  height: ${value}px;\n  line-height: ${value}px;`;
    if(css.split(old).length!==2)return null;
    css=css.replace(old,`.sass-argument-probe .mat-badge-${size} .mat-badge-content {\n  width: var(--mat-badge-${geometry}, ${value}px);\n  height: var(--mat-badge-${geometry}, ${value}px);\n  line-height: var(--mat-badge-${height}, ${value}px);`);
  }
  return css.replace(highContrast+'\n\n',highContrast+'\n\n'+forced+'\n')+separator+peer;
}

export function aggregateColorThemeExpectedCss(caseId,original,peer){
  const entry=AGGREGATE_COLOR_THEME_CASES[caseId],profile=catalog.profiles[entry?.peer_profile],floor=profile?.peers[peer?.line];
  const sources=catalog.sources[peer?.line];
  if(!entry || !floor || typeof original?.css!=='string' || original.css_sha256!==entry.original_sha256
    || sha(original.css)!==entry.original_sha256 || original.css_bytes!==Buffer.byteLength(original.css)
    || !peerMeasurementMatches(peer,aggregateColorThemePeerProgram(caseId),Object.fromEntries(sources.filter(s=>s.root===0).map(s=>[s.path,[s.sha256,s.bytes]])))
    || peer.program_sha256!==floor.program_sha256 || peer.css_sha256!==floor.css_sha256
    || peer.sources.length!==sources.length || sources.some(s=>!peer.sources.some(v=>v.root===s.root&&v.path===s.path&&v.sha256===s.sha256&&v.bytes===s.bytes)))return null;
  const p=members(peer.css),o=Object.fromEntries(Object.entries(profile.originals).map(([f,m])=>[f,m.css]));
  if(p)p.stepper=historicalStepperPeerCss(p.stepper,o.stepper,peer.line,true);
  if(p?.stepper===null)return null;
  if(!p || COMPANIONS.some(f=>!Object.hasOwn(o,f)||sha(o[f])!==profile.originals[f].css_sha256||Buffer.byteLength(o[f])!==profile.originals[f].css_bytes))return null;
  if(p['grid-list']!==o['grid-list'] || p.icon!==o.icon.replace('}\n\n.sass-argument-probe .mat-icon.mat-primary','}\n.sass-argument-probe .mat-icon.mat-primary'))return null;
  const order=COMPANIONS.filter(f=>o[f]);
  if(order.some(f=>original.css.split(o[f]).length!==2))return null;
  const start=original.css.indexOf(o.badge),tail=order.map((f,i)=>o[f]+(i===order.length-1?'':profile.separators[f])).join('');
  if(start<0 || original.css.slice(start)!==tail)return null;
  let prefix=original.css.slice(0,start);
  const mdc=/  --mdc-linear-progress-active-indicator-color: ([^;\n]+);\n  --mdc-linear-progress-track-color: ([^;\n]+);/g;
  const current=/  --mat-progress-bar-active-indicator-color: ([^;\n]+);\n  --mat-progress-bar-track-color: ([^;\n]+);/g;
  if(entry.profile==='2018'){
    const pairs=[...prefix.matchAll(mdc)].map(m=>[m[1],m[2]]),publicPairs=[...p['current-progress-color'].matchAll(current)].map(m=>[m[1],m[2]]);
    if(pairs.length!==3 || JSON.stringify(pairs)!==JSON.stringify(publicPairs))return null;
    prefix=prefix.replace(mdc,(all,active,track)=>all+`\n  --mat-progress-bar-active-indicator-color: ${active};\n  --mat-progress-bar-track-color: ${track};`);
  }else if(prefix.includes('--mdc-linear-progress-active-indicator-color'))return null;
  const separator=profile.dimension==='colors'?'\n':'\n\n';
  const added=f=>o[f]+(f==='toolbar'?separator:'\n\n')+p[f];
  const badgeCss=badge(o.badge,p.badge,p['current-high-contrast'],separator),expansion=parent(p.expansion,p['grid-list']);
  if(badgeCss===null || expansion===null)return null;
  let datepicker=o.datepicker;
  if(profile.dimension==='themes'){
    if(datepicker.split(ORIGINAL_CALENDAR_DENSITY).length!==2)return null;
    datepicker=datepicker.replace(ORIGINAL_CALENDAR_DENSITY,ORIGINAL_CALENDAR_DENSITY+'\n'+CURRENT_CALENDAR_FALLBACKS);
  }
  datepicker+=separator+p.datepicker;
  const sort=o.sort.replace(/^  color: ([^;\n]+);$/gm,(_,v)=>`  color: var(--mat-sort-arrow-color, ${v});`)+'\n'+p.sort;
  const tokens={background:'container-background-color',color:'node-text-color','font-weight':'node-text-weight','font-size':'node-text-size','min-height':'node-min-height'};
  const tree=o.tree.replace(/^  (background|color|font-weight|font-size|min-height): ([^;\n]+);$/gm,(_,k,v)=>`  ${k}: var(--mat-tree-${tokens[k]}, ${v});`)+'\n'+p.tree;
  // Preserve the entire owned prefix and historical icon CSS. Only the
  // enumerated companion additions and expansion/grid parent boundary compose.
  const css=prefix+[badgeCss,added('bottom-sheet'),added('button-toggle'),datepicker,added('divider'),o.expansion+'\n\n'+expansion,o.icon,added('sidenav'),added('stepper'),sort,added('toolbar'),tree].join('\n');
  const withState=Object.hasOwn(FORM_FIELD_STATE_AGGREGATE_CASES,caseId)?insertFormFieldStateInAggregate(caseId,css,peer):css;
  return insertRippleColorInExpectedModel(caseId,withState,peer,{aggregate:true});
}
export function aggregateColorThemeResultsMatch(caseId,original,actual,peer){
  const expected=aggregateColorThemeExpectedCss(caseId,original,peer);
  return expected!==null && rippleColorMeasurementOkay(caseId,actual,peer?.line) && actual?.css===expected && actual.css_sha256===sha(actual.css) && actual.css_bytes===Buffer.byteLength(actual.css);
}

/** Eight default aggregates retain every historical byte around finite public additions. */
import {createHash} from 'node:crypto';
import {historicalStepperPeerCss} from './sass-stepper-historical-model.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
import {ORIGINAL_CALENDAR_DENSITY,CURRENT_CALENDAR_FALLBACKS} from './sass-datepicker-controls-contract.mjs';
import {FORM_FIELD_STATE_AGGREGATE_CASES,insertFormFieldStateInAggregate} from './sass-form-field-state-contract.mjs';
import {RIPPLE_COLOR_BINDING_CASES,insertRippleColorInExpectedModel,rippleColorMeasurementOkay} from './sass-ripple-color-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const catalog=JSON.parse(readFileSync(new URL('../fixtures/sass/default-aggregate-contracts.json',import.meta.url)));
const raw=readFileSync(new URL('../compatibility/rc/oracles/material-16.2.14-sass-api.json',import.meta.url)),oracle=JSON.parse(raw);
const names={'all-component-colors':'colors','all-component-densities':'density','all-component-themes':'themes','all-component-typographies':'typography-2018','all-legacy-component-colors':'colors','all-legacy-component-themes':'themes','all-legacy-component-typographies':'typography-legacy','private-all-legacy-component-densities':'density'};
const families=['badge','bottom-sheet','button-toggle','datepicker','divider','expansion','grid-list','icon','sidenav','stepper','sort','toolbar','tree'];
const densityFamilies=['expansion','stepper','toolbar','tree','button-toggle'];
const ids=Object.keys(names).map(n=>'mixin-css/'+n),marker=(f,part)=>`/*!__default_aggregate_${f}_${part}__*/`;
const opening='.sass-api-probe {\n',equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sourceSets=Object.fromEntries(Object.entries(catalog.peer_inputs).map(([line,p])=>[line,new Set(p.sources.map(s=>JSON.stringify([s.root,s.path,s.sha256,s.bytes])))]));
if(catalog.schema_version!==1||sha(raw)!==catalog.oracle_sha256||catalog.default_theme!==oracle.standard_theme
  ||!equal(Object.keys(catalog.cases).sort(),ids.sort())||!equal(Object.keys(catalog.profiles).sort(),[...new Set(Object.values(names))].sort()))throw Error('finite default aggregate scope changed');
export const DEFAULT_AGGREGATE_CASES=Object.freeze(catalog.cases);
export const DEFAULT_AGGREGATE_CONTRACT='historical-default-aggregate-with-qualified-public-members';
function profileInfo(profile){
  const legacy=profile==='typography-legacy',dimension=profile.startsWith('typography')?'typography':profile==='colors'?'color':profile==='themes'?'theme':'density';
  const fs=profile==='density'?densityFamilies:families,helpers=profile==='colors'||profile==='themes';
  const setup=oracle.standard_theme.replaceAll('m.define-','peer.m2-define-').replaceAll('m.$','peer.$m2-');
  return {legacy,dimension,families:fs,public_families:helpers?[...fs,'current-high-contrast','current-progress-color']:fs,helpers,peer_setup:legacy?setup.replace('peer.m2-define-typography-config()','peer.m2-define-legacy-typography-config()'):setup};
}
export function defaultAggregatePeerProgram(id){
  const e=DEFAULT_AGGREGATE_CASES[id];if(!e)return null;
  const p=profileInfo(e.profile),dims=p.dimension==='theme'?['color','typography','density']:[p.dimension];
  return "@use '@angular/material' as peer;\n"+(p.helpers?"@use '@angular/cdk' as cdk;\n":'')+p.peer_setup+'\n'
    +p.families.map(f=>{
      const selected=f==='datepicker'?dims.filter(d=>d!=='density'):dims;
      const controls=f==='datepicker'&&dims.includes('density')?' .mat-calendar-controls { @include peer.icon-button-overrides((touch-target-display: none)); .mat-mdc-icon-button.mat-mdc-button-base { @include peer.icon-button-overrides((state-layer-size: 40px)); } }':'';
      return marker(f,'begin')+'\n.sass-api-probe { '+['base',...selected].map(d=>`@include peer.${f}-${d}($__theme);`).join(' ')+controls+' }\n'+marker(f,'end');
    }).join('\n')+'\n'+(p.helpers?marker('current-high-contrast','begin')+'\n.sass-api-probe .mat-badge-content { @include cdk.high-contrast(active) { outline: solid 1px; border-radius: 0; } }\n'+marker('current-high-contrast','end')+'\n'+marker('current-progress-color','begin')+'\n.sass-api-probe { @include peer.progress-bar-color($__theme); }\n'+marker('current-progress-color','end')+'\n':'');
}
for(const [id,e] of Object.entries(DEFAULT_AGGREGATE_CASES)){
  const n=id.slice(10),entry=oracle.members.mixins[n],p=catalog.profiles[names[n]],info=profileInfo(names[n]);
  const call=`.sass-api-probe { @include m.${n}(${n.endsWith('typographies')?'':'$__theme'}); }`,program="@use '__entry__' as m;\n"+oracle.standard_theme+'\n'+call+'\n';
  const at=entry.file.lastIndexOf('/'),source='styles/'+entry.file.slice(0,at)+'/_'+entry.file.slice(at+1)+'.scss';
  if(e.name!==n||e.profile!==names[n]||e.call!==call||e.program_sha256!==sha(program)||e.source_path!==source||!equal(e.aggregate,entry.aggregate??null)
    ||e.original_sha256!==entry.invocation.css_sha256||e.original_bytes!==entry.invocation.css_bytes||sha(e.original_css)!==e.original_sha256||Buffer.byteLength(e.original_css)!==e.original_bytes)throw Error('default aggregate original or membership changed');
  for(const key of ['dimension','legacy','families','public_families','peer_setup'])if(!equal(p[key],info[key]))throw Error('default aggregate input profile changed');
  if(!equal(Object.keys(p.originals).sort(),[...info.families].sort())||Object.values(p.originals).some(m=>sha(m.css)!==m.css_sha256||Buffer.byteLength(m.css)!==m.css_bytes))throw Error('default aggregate original member capsule changed');
  const originalSetup=oracle.standard_theme.replaceAll('m.','original.'),argument=info.dimension==='typography'?`original.define-${info.legacy?'legacy-':''}typography-config()`:e.profile==='colors'?'(color: original.get-color-config($__theme), typography: null, density: null)':'$__theme';
  const originalProgram="@use '__reference__' as original;\n"+originalSetup+'\n$__argument: '+argument+';\n'+info.families.map(f=>marker(f,'begin')+`\n.sass-api-probe { @include original.${f}-${e.profile==='colors'?'theme':info.dimension}($__argument); }\n`+marker(f,'end')).join('\n')+'\n';
  if(p.original_program!==originalProgram||p.original_program_sha256!==sha(originalProgram)||Object.values(p.peers).some(floor=>floor.program_sha256!==sha(defaultAggregatePeerProgram(id))))throw Error('default aggregate measurement recipe changed');
}
const privateMembership=catalog.private_density_membership;
if(privateMembership.source_path!=='@angular/material/legacy-core/density/private/_all-density.scss'||!equal(privateMembership.includes,['form-field-theme.density','expansion-theme.density','stepper-theme.density','toolbar-theme.density','tree-theme.density','button-toggle-theme.density']))throw Error('private density membership changed');
const originalIdentity=JSON.parse(readFileSync(new URL('../compatibility/rc/original16-sass-source-diagnostic-identity.json',import.meta.url)));
if(!Object.values(originalIdentity.loaded_source_sets).flat().some(s=>s.path===privateMembership.source_path&&s.sha256===privateMembership.sha256&&s.bytes===privateMembership.bytes))throw Error('private density membership source is not authenticated');
export function measureDefaultAggregatePeer(options){
  const program=defaultAggregatePeerProgram(options.caseId);if(program===null)throw Error('unknown default aggregate');
  const p=measureM2PeerProgram({...options,program}),raw=readFileSync(join(options.cdkRoot,'package.json'));
  return {...p,cdk_version:JSON.parse(raw).version,cdk_package_json_sha256:sha(raw)};
}
function members(css,fs){
  const result={};for(const f of fs){const start=marker(f,'begin'),end=marker(f,'end');if(css.split(start).length!==2||css.split(end).length!==2)return null;result[f]=css.split(start)[1].split(end)[0].trim();}return result;
}
function parent(...parts){
  const values=parts.filter(Boolean);if(!values.length||values.some(p=>!p.startsWith(opening)||!p.endsWith('\n}')||p.split(opening).length!==2))return null;
  return opening+values.map(p=>p.slice(opening.length,-2)).join('\n')+'\n}';
}
function densityModel(css,o,p){
  const tail=densityFamilies.slice(0,-1).map(f=>o[f]).join('\n\n')+'\n'+o['button-toggle'];
  if(!css.endsWith(tail)||css.split(tail).length!==2||p.toolbar!==o.toolbar)return null;
  const added=f=>o[f]+'\n\n'+p[f],stepper=added('stepper');
  if(!stepper.endsWith('\n}')||!o.toolbar.startsWith(opening))return null;
  const joined=stepper.slice(0,-2)+'\n'+o.toolbar.slice(opening.length);
  const tree=o.tree.replace(/^  min-height: ([^;\n]+);$/gm,(_,v)=>`  min-height: var(--mat-tree-node-min-height, ${v});`)+'\n'+p.tree;
  return css.slice(0,-tail.length)+[added('expansion'),joined,tree,added('button-toggle')].join('\n');
}
function typographyModel(css,o,p){
  if(p['grid-list']!==o['grid-list']||p.toolbar!==o.toolbar||p.icon!==''||p.sort!==''||['divider','icon','sidenav','sort'].some(f=>o[f]!==''))return null;
  const order=['bottom-sheet','button-toggle','datepicker','expansion','grid-list','stepper','toolbar','tree'];
  if(['badge',...order].some(f=>!o[f]||css.split(o[f]).length!==2))return null;
  const badge=css.indexOf(o.badge),bottom=css.indexOf(o['bottom-sheet']),tail=order.map(f=>o[f]).join('\n\n');
  if(css.slice(bottom,bottom+tail.length)!==tail||bottom<badge+o.badge.length)return null;
  const middle=css.slice(badge+o.badge.length,bottom),suffix=css.slice(bottom+tail.length);if(!middle.startsWith('\n\n')||!suffix.startsWith('\n'))return null;
  const added=f=>o[f]+'\n\n'+p[f],button=parent(p['button-toggle'],p.divider),expansion=parent(p.expansion,p['grid-list'],p.sidenav),stepper=parent(p.stepper,p.toolbar);
  if([button,expansion,stepper].some(v=>v===null))return null;
  const tree=o.tree.replace(/^  (font-weight|font-size): ([^;\n{}]+);$/gm,(_,k,v)=>`  ${k}: var(--mat-tree-node-text-${k==='font-weight'?'weight':'size'}, ${v});`)+'\n'+p.tree;
  return css.slice(0,badge)+added('badge')+middle.slice(1)+[added('bottom-sheet'),o['button-toggle']+'\n\n'+button,added('datepicker'),o.expansion+'\n\n'+expansion,o.stepper+'\n\n'+stepper,tree].join('\n')+suffix;
}
const highContrast='.cdk-high-contrast-active .sass-api-probe .mat-badge-content {\n  outline: solid 1px;\n  border-radius: 0;\n}';
function badgeModel(css,peer,forced,separator){
  if(css.split('  border-radius: 50%;').length!==2||css.split(highContrast+'\n\n').length!==2)return null;
  css=css.replace('  border-radius: 50%;','  border-radius: var(--mat-badge-container-shape, 50%);');
  for(const [size,value,geometry,height] of [['small',16,'legacy-small-size-container-size','small-size-line-height'],['medium',22,'legacy-container-size','line-height'],['large',28,'legacy-large-size-container-size','large-size-line-height']]){
    const from=`.sass-api-probe .mat-badge-${size} .mat-badge-content {\n  width: ${value}px;\n  height: ${value}px;\n  line-height: ${value}px;`;if(css.split(from).length!==2)return null;
    css=css.replace(from,`.sass-api-probe .mat-badge-${size} .mat-badge-content {\n  width: var(--mat-badge-${geometry}, ${value}px);\n  height: var(--mat-badge-${geometry}, ${value}px);\n  line-height: var(--mat-badge-${height}, ${value}px);`);
  }
  return css.replace(highContrast+'\n\n',highContrast+'\n\n'+forced+'\n')+separator+peer;
}
function colorThemeModel(css,o,p,e){
  const order=families.filter(f=>o[f]);if(order.some(f=>css.split(o[f]).length!==2))return null;
  const positions=order.map(f=>css.indexOf(o[f])),separators=Object.fromEntries(order.slice(0,-1).map((f,i)=>[f,css.slice(positions[i]+o[f].length,positions[i+1])]));
  if(Object.values(separators).some(s=>!['\n','\n\n'].includes(s)))return null;
  const start=positions[0],tail=order.map((f,i)=>o[f]+(i<order.length-1?separators[f]:'')).join('');if(css.slice(start)!==tail)return null;
  if(p['grid-list']!==o['grid-list']||p.icon!==o.icon.replace('}\n\n.sass-api-probe .mat-icon.mat-primary','}\n.sass-api-probe .mat-icon.mat-primary'))return null;
  let prefix=css.slice(0,start);const pattern=/  --mdc-linear-progress-active-indicator-color: ([^;\n]+);\n  --mdc-linear-progress-track-color: ([^;\n]+);/g;
  const pairs=[...prefix.matchAll(pattern)].map(m=>[m[1],m[2]]),current=[...p['current-progress-color'].matchAll(/  --mat-progress-bar-active-indicator-color: ([^;\n]+);\n  --mat-progress-bar-track-color: ([^;\n]+);/g)].map(m=>[m[1],m[2]]);
  if(e.name.startsWith('all-component-')){if(pairs.length!==3||!equal(pairs,current))return null;prefix=prefix.replace(pattern,(all,a,t)=>all+`\n  --mat-progress-bar-active-indicator-color: ${a};\n  --mat-progress-bar-track-color: ${t};`);}else if(pairs.length)return null;
  const separator=e.profile==='colors'?'\n':'\n\n',added=f=>o[f]+(f==='toolbar'?separator:'\n\n')+p[f];
  const badge=badgeModel(o.badge,p.badge,p['current-high-contrast'],separator),expansion=parent(p.expansion,p['grid-list']);if(badge===null||expansion===null)return null;
  let datepicker=o.datepicker;
  if(e.profile==='themes'){const original=ORIGINAL_CALENDAR_DENSITY.replaceAll('.sass-argument-probe','.sass-api-probe'),fallback=CURRENT_CALENDAR_FALLBACKS.replaceAll('.sass-argument-probe','.sass-api-probe');if(datepicker.split(original).length!==2)return null;datepicker=datepicker.replace(original,original+'\n'+fallback);}
  datepicker+=separator+p.datepicker;
  const sort=o.sort.replace(/^  color: ([^;\n]+);$/gm,(_,v)=>`  color: var(--mat-sort-arrow-color, ${v});`)+'\n'+p.sort,tokens={background:'container-background-color',color:'node-text-color','font-weight':'node-text-weight','font-size':'node-text-size','min-height':'node-min-height'};
  const tree=o.tree.replace(/^  (background|color|font-weight|font-size|min-height): ([^;\n]+);$/gm,(_,k,v)=>`  ${k}: var(--mat-tree-${tokens[k]}, ${v});`)+'\n'+p.tree;
  return prefix+[badge,added('bottom-sheet'),added('button-toggle'),datepicker,added('divider'),o.expansion+'\n\n'+expansion,o.icon,added('sidenav'),added('stepper'),sort,added('toolbar'),tree].join('\n');
}
export function defaultAggregateExpectedCss(id,peer){
  const e=DEFAULT_AGGREGATE_CASES[id],profile=catalog.profiles[e?.profile],floor=profile?.peers[peer?.line],inputs=catalog.peer_inputs[peer?.line];
  if(!floor||!inputs||!peerMeasurementMatches(peer,defaultAggregatePeerProgram(id),{})||peer.program_sha256!==floor.program_sha256||peer.css_sha256!==floor.css_sha256||peer.css_bytes!==floor.css_bytes
    ||peer.cdk_version!==peer.peer_version||peer.cdk_version!==inputs.cdk_version||peer.cdk_package_json_sha256!==inputs.cdk_package_json_sha256||peer.sources.length!==inputs.sources.length||peer.sources.some(s=>!sourceSets[peer.line].has(JSON.stringify([s.root,s.path,s.sha256,s.bytes]))))return null;
  const p=members(peer.css,profile.public_families);if(!p)return null;const o=Object.fromEntries(Object.entries(profile.originals).map(([f,m])=>[f,m.css]));
  p.stepper=historicalStepperPeerCss(p.stepper,o.stepper,peer.line,['color','theme'].includes(profile.dimension));
  if(p.stepper===null)return null;
  const css=profile.dimension==='density'?densityModel(e.original_css,o,p):profile.dimension==='typography'?typographyModel(e.original_css,o,p):colorThemeModel(e.original_css,o,p,e);
  const withState=Object.hasOwn(FORM_FIELD_STATE_AGGREGATE_CASES,id)?insertFormFieldStateInAggregate(id,css,peer):css;
  return Object.hasOwn(RIPPLE_COLOR_BINDING_CASES,id)?insertRippleColorInExpectedModel(id,withState,peer,{aggregate:true}):withState;
}
export function defaultAggregateMeasurementOk(id,m,line){
  if(Object.hasOwn(RIPPLE_COLOR_BINDING_CASES,id)&&!rippleColorMeasurementOkay(id,m,line))return false;
  const e=DEFAULT_AGGREGATE_CASES[id];if(!e||!Object.hasOwn(catalog.peer_inputs,line)||m?.line!==line||m.program_sha256!==e.program_sha256||typeof m.css!=='string'||m.css_sha256!==sha(m.css)||m.css_bytes!==Buffer.byteLength(m.css)||typeof m.sass_version!=='string'||!m.sass_version.startsWith('dart-sass\t1.104.1\t'))return false;
  const ss=m.sources;if(!Array.isArray(ss)||!ss.length||ss.some(s=>!Number.isInteger(s.root)||![0,1,2].includes(s.root)||typeof s.path!=='string'||!s.path||s.path.startsWith('/')||s.path.includes('\\')||s.path.split('/').includes('..')||!/^[0-9a-f]{64}$/.test(s.sha256)||!Number.isInteger(s.bytes)||s.bytes<1)||new Set(ss.map(s=>`${s.root}/${s.path}`)).size!==ss.length)return false;
  if(id==='mixin-css/private-all-legacy-component-densities'&&!ss.some(s=>s.root===0&&s.path===e.source_path&&s.sha256===privateMembership.sha256&&s.bytes===privateMembership.bytes))return false;
  return ['_index.scss','styles/bridges/_companion-overrides.scss','styles/bridges/_m2-system.scss','styles/core/theming/_theming.scss',e.source_path].every(path=>ss.some(s=>s.root===0&&s.path===path));
}
export function defaultAggregateResultsMatch(id,actual,contract){
  if(!actual?.actual_measurement||!contract?.peer||contract.classification!=='conforming-current-companion'||contract.contract!==DEFAULT_AGGREGATE_CONTRACT||actual.actual_measurement.line!==contract.peer.line||actual.actual_measurement.css!==actual.css||actual.actual_measurement.css_sha256!==actual.sha256)return false;
  const expected=defaultAggregateExpectedCss(id,contract.peer);return expected!==null&&actual.css===expected&&actual.sha256===sha(actual.css);
}

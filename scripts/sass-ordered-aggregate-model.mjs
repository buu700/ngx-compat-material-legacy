/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One sequence-sensitive aggregate preserves whole owned16 CSS around public peers. */
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {isAbsolute,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
import {measureOrderedCorePeer,orderedCoreExpectedCss} from './sass-ordered-core-contract.mjs';
import {insertRippleColorInExpectedModel,rippleColorMeasurementOkay} from './sass-ripple-color-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const catalog=JSON.parse(readFileSync(new URL('../fixtures/sass/ordered-aggregate-contracts.json',import.meta.url)));
const id='06-aggregate-and-companions',entry=catalog.cases[id],source=catalog.fixture_source;
const raw=readFileSync(new URL('../'+entry.reference,import.meta.url));
const families=['badge','bottom-sheet','button-toggle','datepicker','divider','expansion','grid-list','icon','sidenav','stepper','sort','toolbar','tree'];
const groups=['light','dark','panel'],marker=(g,f,part)=>`/*!__ordered_aggregate_${g}_${f}_${part}__*/`;
const prelude=source.slice(0,source.indexOf('@include mat.core();'));
if(catalog.schema_version!==1||!equal(Object.keys(catalog.cases),[id])||!equal(Object.keys(catalog.profiles),groups)
  ||entry.fixture!==`fixtures/sass/${id}.scss`||entry.reference!==`reference/material-16.2.14/sass-css/${id}.css`
  ||sha(source)!==entry.fixture_sha256||sha(source.replace("'@angular/material'","'__entry__'"))!==entry.program_sha256
  ||entry.reference_sha256!=='b9e73e138556f00c4077c19032587c2b78a64aad0ecc46abc3dca56b1eb95070'
  ||sha(raw)!==entry.reference_sha256||raw.length!==entry.reference_bytes
  ||!equal(Object.keys(catalog.parts),['core','light','dark','panel'])||Object.values(catalog.parts).join('\n\n')!==raw.toString('utf8'))throw Error('ordered aggregate frozen inputs changed');
export const ORDERED_AGGREGATE_CASES=Object.freeze(catalog.cases);
export const ORDERED_AGGREGATE_CONTRACT='historical-ordered-aggregate-with-qualified-public-members';
export function orderedAggregatePeerProgram(group){
  if(!groups.includes(group))return null;
  const fs=group==='panel'?['expansion']:families,scope=group==='light'?'':group==='dark'?'.dark-shell':'.single-panel';
  const ds=group==='dark'?['color','density']:['color','typography','density'];
  const setup=prelude.replace('as mat;','as peer;').replaceAll('mat.define-','peer.m2-define-').replaceAll('mat.$','peer.$m2-');
  let program="@use '@angular/material' as peer;\n"+(group==='panel'?'':"@use '@angular/cdk' as cdk;\n")+setup.slice(setup.indexOf('\n')+1);
  if(group==='dark')program+='$theme: peer.m2-define-dark-theme($primary, $accent);\n';
  program+=fs.map(f=>{
    const selected=f==='datepicker'?ds.filter(d=>d!=='density'):ds;
    const controls=f==='datepicker'&&ds.includes('density')?' .mat-calendar-controls { @include peer.icon-button-overrides((touch-target-display: none)); .mat-mdc-icon-button.mat-mdc-button-base { @include peer.icon-button-overrides((state-layer-size: 40px)); } }':'';
    return marker(group,f,'begin')+'\n'+(scope?scope+' { ':'')+['base',...selected].map(d=>`@include peer.${f}-${d}($theme);`).join(' ')+controls+(scope?' }':'')+'\n'+marker(group,f,'end');
  }).join('\n')+'\n';
  if(group!=='panel')program+=marker(group,'current-high-contrast','begin')+'\n'+(scope?scope+' ':'')+'.mat-badge-content { @include cdk.high-contrast(active) { outline: solid 1px; border-radius: 0; } }\n'+marker(group,'current-high-contrast','end')+'\n'+marker(group,'current-progress-color','begin')+'\n'+(scope?scope+' { ':'')+'@include peer.progress-bar-color($theme);'+(scope?' }':'')+'\n'+marker(group,'current-progress-color','end')+'\n';
  return program;
}
const originalIdentity=JSON.parse(readFileSync(new URL('../compatibility/rc/original16-sass-source-diagnostic-identity.json',import.meta.url)));
const known=new Set(Object.values(originalIdentity.loaded_source_sets).flat().map(s=>JSON.stringify([s.path,s.sha256,s.bytes])));
for(const group of groups){
  const p=catalog.profiles[group],fs=group==='panel'?['expansion']:families,scope=group==='light'?'':group==='dark'?'.dark-shell':'.single-panel',ds=group==='dark'?['color','density']:['color','typography','density'];
  const argument=group==='dark'?'mat.define-dark-theme($primary, $accent)':'$theme';
  const program=prelude+fs.map(f=>(group==='dark'?`@include mat.${f}-theme($theme);\n`:'')+marker(group,f,'begin')+'\n'+(scope?scope+' { ':'')+`@include mat.${f}-theme(${argument});`+(scope?' }':'')+'\n'+marker(group,f,'end')).join('\n')+'\n';
  if(p.scope!==scope||!equal(p.dimensions,ds)||!equal(p.families,fs)||!equal(p.public_families,group==='panel'?fs:[...fs,'current-high-contrast','current-progress-color'])
    ||p.original_program!==program||p.original_program_sha256!==sha(program)||p.peer_program!==orderedAggregatePeerProgram(group)
    ||!equal(Object.keys(p.originals),fs)||Object.values(p.originals).some(m=>sha(m.css)!==m.css_sha256||Buffer.byteLength(m.css)!==m.css_bytes)
    ||Object.values(p.peers).some(m=>m.program_sha256!==sha(p.peer_program))
    ||!p.original_sources.length||p.original_sources.some(s=>!known.has(JSON.stringify([s.path,s.sha256,s.bytes]))))throw Error('ordered aggregate profile or original source changed');
}
if(!catalog.original_sources.length||catalog.original_sources.some(s=>!known.has(JSON.stringify([s.path,s.sha256,s.bytes]))))throw Error('ordered aggregate original sources not authenticated');
export function measureOrderedAggregatePeers(options){
  const raw=readFileSync(join(options.cdkRoot,'package.json')),cdk={cdk_version:JSON.parse(raw).version,cdk_package_json_sha256:sha(raw)};
  return {core:measureOrderedCorePeer(options),...Object.fromEntries(groups.map(group=>[group,{...measureM2PeerProgram({...options,program:orderedAggregatePeerProgram(group)}),...cdk}]))};
}
function members(group,peer,line){
  const p=catalog.profiles[group],floor=p.peers[line],inputs=catalog.peer_inputs[line];
  if(!floor||!inputs||peer?.line!==line||!peerMeasurementMatches(peer,p.peer_program,{})||peer.css_sha256!==floor.css_sha256||peer.css_bytes!==floor.css_bytes
    ||peer.cdk_version!==inputs.cdk_version||peer.cdk_version!==peer.peer_version||peer.cdk_package_json_sha256!==inputs.cdk_package_json_sha256
    ||peer.sources.length!==inputs.sources.length||inputs.sources.some(s=>!peer.sources.some(v=>v.root===s.root&&v.path===s.path&&v.sha256===s.sha256&&v.bytes===s.bytes)))return null;
  const out={};for(const f of p.public_families){const a=marker(group,f,'begin'),b=marker(group,f,'end');if(peer.css.split(a).length!==2||peer.css.split(b).length!==2)return null;out[f]=peer.css.split(a)[1].split(b)[0].trim();}return out;
}
// Root public calls coalesce adjacent declaration blocks within a member only.
// This retains each declaration and variant boundary; candidate CSS is never normalized.
function rootBlocks(css){
  const pattern=/^html {\n((?:  --[^\n]+;\n)+)}\n\nhtml {\n((?:  --[^\n]+;\n)+)}/gm;
  for(;;){const next=css.replace(pattern,(_,a,b)=>'html {\n'+a+b+'}');if(next===css)return css;css=next;}
}
function parent(scope,...parts){
  const opening=(scope||'html')+' {\n',values=parts.filter(Boolean);
  if(!values.length||values.some(p=>!p.startsWith(opening)||!p.endsWith('\n}')||p.split(opening).length!==2))return null;
  return opening+values.map(p=>p.slice(opening.length,-2)).join('\n')+'\n}';
}
function themeModel(group,p){
  const profile=catalog.profiles[group],css=catalog.parts[group],scope=profile.scope,lead=scope?scope+' ':'';
  const o=Object.fromEntries(Object.entries(profile.originals).map(([f,m])=>[f,m.css]));
  if(!scope)p=Object.fromEntries(Object.entries(p).map(([f,css])=>[f,rootBlocks(css)]));
  const order=families.filter(f=>o[f]);if(order.some(f=>css.split(o[f]).length!==2))return null;
  const pos=order.map(f=>css.indexOf(o[f])),sep=Object.fromEntries(order.slice(0,-1).map((f,i)=>[f,css.slice(pos[i]+o[f].length,pos[i+1])]));
  if(Object.values(sep).some(s=>!['\n','\n\n'].includes(s)))return null;
  const start=pos[0],tail=order.map((f,i)=>o[f]+(i<order.length-1?sep[f]:'')).join('');if(css.slice(start)!==tail||p['grid-list']!==o['grid-list'])return null;
  const prefix=css.slice(0,start);if(prefix.includes('--mdc-linear-progress-active-indicator-color'))return null;
  const separator=scope?'\n':'\n\n',hc='.cdk-high-contrast-active '+lead+'.mat-badge-content {\n  outline: solid 1px;\n  border-radius: 0;\n}';let badge=o.badge;
  if(!scope){
    if(badge.split('  border-radius: 50%;').length!==2||badge.split(hc+'\n\n').length!==2)return null;
    badge=badge.replace('  border-radius: 50%;','  border-radius: var(--mat-badge-container-shape, 50%);');
    for(const [size,value,geometry,height] of [['small',16,'legacy-small-size-container-size','small-size-line-height'],['medium',22,'legacy-container-size','line-height'],['large',28,'legacy-large-size-container-size','large-size-line-height']]){
      const old=`${lead}.mat-badge-${size} .mat-badge-content {\n  width: ${value}px;\n  height: ${value}px;\n  line-height: ${value}px;`;if(badge.split(old).length!==2)return null;
      badge=badge.replace(old,`${lead}.mat-badge-${size} .mat-badge-content {\n  width: var(--mat-badge-${geometry}, ${value}px);\n  height: var(--mat-badge-${geometry}, ${value}px);\n  line-height: var(--mat-badge-${height}, ${value}px);`);
    }
    badge=badge.replace(hc+'\n\n',hc+'\n\n'+p['current-high-contrast']+'\n\n');
  }else if(badge.includes('border-radius'))return null;
  badge+=separator+p.badge;
  let datepicker=o.datepicker;
  const calendar=`${lead}.mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base {\n  --mdc-icon-button-state-layer-size: 40px;\n  width: var(--mdc-icon-button-state-layer-size);\n  height: var(--mdc-icon-button-state-layer-size);\n  padding: 8px;\n}\n${lead}.mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base .mat-mdc-button-touch-target {\n  display: none;\n}`;
  const fallback=`${lead}.mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base {\n  width: var(--mat-icon-button-state-layer-size, var(--mdc-icon-button-state-layer-size));\n  height: var(--mat-icon-button-state-layer-size, var(--mdc-icon-button-state-layer-size));\n}\n${lead}.mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base .mat-mdc-button-touch-target {\n  display: var(--mat-icon-button-touch-target-display, none);\n}`;
  if(datepicker.split(calendar).length!==2)return null;datepicker=datepicker.replace(calendar,calendar+'\n'+fallback)+separator+p.datepicker;
  const expansion=scope?parent(scope,p.expansion,p['grid-list']):p.expansion;if(expansion===null)return null;
  const added=f=>o[f]+'\n\n'+p[f],sort=o.sort.replace(/^  color: ([^;\n]+);$/gm,(_,v)=>`  color: var(--mat-sort-arrow-color, ${v});`)+separator+p.sort;
  const tokens={background:'container-background-color',color:'node-text-color','font-weight':'node-text-weight','font-size':'node-text-size','min-height':'node-min-height'};
  const tree=o.tree.replace(/^  (background|color|font-weight|font-size|min-height): ([^;\n]+);$/gm,(_,k,v)=>`  ${k}: var(--mat-tree-${tokens[k]}, ${v});`)+separator+p.tree;
  const pieces=[badge,added('bottom-sheet'),added('button-toggle'),datepicker,added('divider'),o.expansion+'\n\n'+expansion];if(!scope)pieces.push(o['grid-list']);
  pieces.push(o.icon,added('sidenav'),added('stepper'),sort,added('toolbar'),tree);return prefix+pieces.join(separator);
}
export function orderedAggregateExpectedCss(peers,line){
  if(!peers||!equal(Object.keys(peers).sort(),['core',...groups].sort())||peers.core?.line!==line)return null;
  const core=orderedCoreExpectedCss('02-core',peers.core),parts=Object.fromEntries(groups.map(g=>[g,members(g,peers[g],line)]));
  if(core===null||Object.values(parts).some(p=>p===null))return null;
  const light=themeModel('light',parts.light),dark=themeModel('dark',parts.dark);if(light===null||dark===null)return null;
  const css=core+'\n'+[light,dark,catalog.parts.panel+'\n\n'+parts.panel.expansion].join('\n\n');
  return insertRippleColorInExpectedModel(id,css,peers.light,{aggregate:true});
}
export function orderedAggregateMeasurementOk(m,line){
  if(!rippleColorMeasurementOkay(id,m,line))return false;
  if(!Object.hasOwn(catalog.peer_inputs,line)||m?.line!==line||m.program_sha256!==entry.program_sha256||typeof m.css!=='string'
    ||m.css_sha256!==sha(m.css)||m.css_bytes!==Buffer.byteLength(m.css)||typeof m.sass_version!=='string'||!m.sass_version.startsWith('dart-sass\t1.104.1\t'))return false;
  const ss=m.sources;if(!Array.isArray(ss)||!ss.length||ss.some(s=>!Number.isInteger(s.root)||![0,1,2].includes(s.root)||typeof s.path!=='string'||!s.path||s.path.startsWith('/')||s.path.includes('\\')||s.path.split('/').includes('..')||!/^[0-9a-f]{64}$/.test(s.sha256)||!Number.isInteger(s.bytes)||s.bytes<1)||new Set(ss.map(s=>`${s.root}/${s.path}`)).size!==ss.length)return false;
  return ['_index.scss','styles/core/_core.scss','styles/core/theming/_theming.scss','styles/legacy-core/theming/_all-theme.scss','styles/bridges/_companion-overrides.scss'].every(path=>ss.some(s=>s.root===0&&s.path===path));
}
export function measureOrderedAggregate({source,fixtureFile,result,roots,sass,line}){
  if(sha(source)!==entry.fixture_sha256||roots.length!==3)throw Error('ordered aggregate invocation scope changed');
  const invocation=realpathSync(fixtureFile);if(sha(readFileSync(invocation))!==entry.fixture_sha256)throw Error('ordered aggregate fixture bytes changed');
  const bases=roots.map(p=>realpathSync(p)),sources=result.loadedUrls.map(url=>{
    if(url.protocol!=='file:')throw Error('ordered aggregate loaded a non-file source');const path=realpathSync(fileURLToPath(url));if(path===invocation)return null;
    const root=bases.findIndex(base=>{const r=relative(base,path);return !isAbsolute(r)&&r!=='..'&&!r.startsWith('../');});if(root<0)throw Error('ordered aggregate loaded a foreign source');
    const raw=readFileSync(path);return {root,path:relative(bases[root],path).replaceAll('\\','/'),sha256:sha(raw),bytes:raw.length};
  }).filter(Boolean).sort((a,b)=>a.root-b.root||a.path.localeCompare(b.path));
  const m={line,css:result.css,css_sha256:sha(result.css),css_bytes:Buffer.byteLength(result.css),program_sha256:sha(source.replace("'@angular/material'","'__entry__'")),sass_version:sass.info,sources};
  if(!orderedAggregateMeasurementOk(m,line))throw Error('ordered aggregate measurement incomplete');return m;
}

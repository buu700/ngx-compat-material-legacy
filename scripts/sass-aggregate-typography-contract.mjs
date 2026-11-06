/** Four typography aggregates: retain every owned byte around qualified companions. */
import {createHash} from 'node:crypto';
import {historicalStepperPeerCss} from './sass-stepper-historical-model.mjs';
import {readFileSync} from 'node:fs';
import {SCENARIOS,themeSass,COMPANIONS} from './companion-bridge-peer-oracle.mjs';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const catalog=JSON.parse(readFileSync(new URL('../fixtures/sass/aggregate-typography-contracts.json',import.meta.url)));
const names=['all-component-typographies','all-legacy-component-typographies'];
const ids=names.flatMap(name=>['custom-full-theme','raw-typography-config'].map(variant=>`mixin-argument/${name}/${variant}`));
const oracleBytes=readFileSync(new URL('../compatibility/rc/oracles/material-16.2.14-sass-api.json',import.meta.url));
const oracle=JSON.parse(oracleBytes);
if(catalog.schema_version!==1 || JSON.stringify(Object.keys(catalog.cases).sort())!==JSON.stringify(ids.sort())
  || sha(oracleBytes)!==catalog.original_membership.oracle_sha256
  || names.some(n=>JSON.stringify(oracle.members.mixins[n].aggregate)!==JSON.stringify(catalog.original_membership.aggregates[n])))throw Error('finite typography aggregate scope changed');
export const AGGREGATE_TYPOGRAPHY_CASES=Object.freeze(catalog.cases);
const marker=(family,part)=>`/*!__closeout_${family}_${part}__*/`;
export function aggregateTypographyPeerProgram(caseId){
  const entry=AGGREGATE_TYPOGRAPHY_CASES[caseId];if(!entry)return null;
  const scenario=SCENARIOS.find(s=>s.id===`closeout-custom-${entry.profile}-light`);
  return "@use '@angular/material' as peer;\n"+themeSass('peer',scenario,{m2Prefix:'m2-'})
    +COMPANIONS.map(f=>marker(f,'begin')+`\n.sass-argument-probe { @include peer.${f}-base($theme); @include peer.${f}-typography($theme); }\n`+marker(f,'end')).join('\n')+'\n';
}
export function measureAggregateTypographyPeer(options){
  const program=aggregateTypographyPeerProgram(options.caseId);
  return program===null?null:measureM2PeerProgram({...options,program});
}
function peerMembers(css){
  const result={};
  for(const family of COMPANIONS){
    const start=marker(family,'begin'),end=marker(family,'end');
    if(css.split(start).length!==2 || css.split(end).length!==2)return null;
    result[family]=css.split(start)[1].split(end)[0].trim();
  }
  return result;
}
function parentRule(...members){
  const opening='.sass-argument-probe {\n';
  if(members.some(css=>!css.startsWith(opening)||!css.endsWith('\n}')||css.split(opening).length!==2))return null;
  return opening+members.map(css=>css.slice(opening.length,-2)).join('\n')+'\n}';
}
export function aggregateTypographyExpectedCss(caseId,original,peer){
  const entry=AGGREGATE_TYPOGRAPHY_CASES[caseId],profile=catalog.profiles[entry?.profile],floor=profile?.peers[peer?.line];
  if(!entry || !floor || typeof original?.css!=='string' || original.css_sha256!==entry.original_sha256
    || sha(original.css)!==entry.original_sha256 || original.css_bytes!==Buffer.byteLength(original.css)
    || !peerMeasurementMatches(peer,aggregateTypographyPeerProgram(caseId),catalog.sources[peer.line])
    || peer.program_sha256!==floor.program_sha256 || peer.css_sha256!==floor.css_sha256)return null;
  const p=peerMembers(peer.css);if(!p)return null;
  const o=Object.fromEntries(Object.entries(profile.originals).map(([family,m])=>[family,m.css]));
  p.stepper=historicalStepperPeerCss(p.stepper,o.stepper,peer.line,false);
  if(p.stepper===null)return null;
  if(COMPANIONS.some(f=>!Object.hasOwn(o,f) || sha(o[f])!==profile.originals[f].css_sha256
    || Buffer.byteLength(o[f])!==profile.originals[f].css_bytes))return null;
  if(p['grid-list']!==o['grid-list'] || p.toolbar!==o.toolbar || p.icon!=='' || p.sort!==''
    || ['divider','icon','sidenav','sort'].some(f=>o[f]!==''))return null;
  const tailOrder=['bottom-sheet','button-toggle','datepicker','expansion','grid-list','stepper','toolbar','tree'];
  if(['badge',...tailOrder].some(f=>!o[f] || original.css.split(o[f]).length!==2))return null;
  const badge=original.css.indexOf(o.badge),bottom=original.css.indexOf(o['bottom-sheet']);
  const tail=tailOrder.map(f=>o[f]).join('\n\n');
  if(original.css.slice(bottom,bottom+tail.length)!==tail || bottom<badge+o.badge.length)return null;
  const middle=original.css.slice(badge+o.badge.length,bottom),suffix=original.css.slice(bottom+tail.length);
  if(!middle.startsWith('\n\n') || !suffix.startsWith('\n'))return null;
  const added=f=>o[f]+'\n\n'+p[f];
  const button=parentRule(p['button-toggle'],p.divider);
  const expansion=parentRule(p.expansion,p['grid-list'],p.sidenav);
  const stepper=parentRule(p.stepper,p.toolbar);
  if([button,expansion,stepper].some(css=>css===null))return null;
  const tree=o.tree.replace(/^  (font-weight|font-size): ([^;\n{}]+);$/gm,
    (_,key,value)=>`  ${key}: var(--mat-tree-node-text-${key==='font-weight'?'weight':'size'}, ${value});`)+ '\n'+p.tree;
  // Only current direct parent declarations are composed across the three
  // known boundaries. Historical hierarchy, option/control CSS and all
  // original declarations/selectors remain exact outside the tree fallbacks.
  const pieces=[added('bottom-sheet'),o['button-toggle']+'\n\n'+button,added('datepicker'),
    o.expansion+'\n\n'+expansion,o.stepper+'\n\n'+stepper,tree];
  return original.css.slice(0,badge)+added('badge')+middle.slice(1)+pieces.join('\n')+suffix;
}
export function aggregateTypographyResultsMatch(caseId,original,actual,peer){
  const expected=aggregateTypographyExpectedCss(caseId,original,peer);
  return expected!==null && actual?.css===expected && actual.css_sha256===sha(actual.css)
    && actual.css_bytes===Buffer.byteLength(actual.css);
}

/** Four density aggregates: exact owned prefix and finite qualified companion tail. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {SCENARIOS,themeSass} from './companion-bridge-peer-oracle.mjs';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
import {measureCompanionAdditionPeer,companionAdditionExpectedCss} from './sass-companion-addition-contract.mjs';
import {measureTreePeer,treeCompanionExpectedCss} from './sass-tree-companion-contract.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const catalog=JSON.parse(readFileSync(new URL('../fixtures/sass/aggregate-density-contracts.json',import.meta.url)));
const ids=['all-component-densities','private-all-legacy-component-densities'].flatMap(name=>['custom-full-theme','raw-density-config'].map(variant=>`mixin-argument/${name}/${variant}`));
export const AGGREGATE_DENSITY_MEMBERS=Object.freeze(['expansion','stepper','toolbar','tree','button-toggle']);
if(catalog.schema_version!==1 || JSON.stringify(Object.keys(catalog.cases).sort())!==JSON.stringify(ids.sort())
  || JSON.stringify(catalog.members.map(m=>m.family))!==JSON.stringify(AGGREGATE_DENSITY_MEMBERS)
  || catalog.members.map(m=>m.css+m.separator).join('')!==catalog.original_tail
  || sha(catalog.original_tail)!=='a4a3c6e9000735891f3175e8340e9db6d0cf9f10cad8f4ac15bab24c19ee48a7')throw Error('finite aggregate density scope changed');
export const AGGREGATE_DENSITY_CASES=Object.freeze(catalog.cases);
export function toolbarDensityPeerProgram(){
  const scenario=SCENARIOS.find(s=>s.id==='closeout-custom-2018-light');
  return "@use '@angular/material' as peer;\n"+themeSass('peer',scenario,{m2Prefix:'m2-'})
    +'.sass-argument-probe { @include peer.toolbar-base($theme); @include peer.toolbar-density($theme); }\n';
}
export function measureAggregateDensityPeers(options){
  if(!Object.hasOwn(AGGREGATE_DENSITY_CASES,options.caseId))return null;
  return Object.fromEntries(AGGREGATE_DENSITY_MEMBERS.map(family=>{
    const child={...options,caseId:`mixin-argument/${family}-density/custom-full-theme`};
    const peer=family==='toolbar'?measureM2PeerProgram({...options,program:toolbarDensityPeerProgram()})
      :family==='tree'?measureTreePeer(child):measureCompanionAdditionPeer(child);
    return [family,peer];
  }));
}
export function aggregateDensityExpectedCss(caseId,original,peers){
  if(!Object.hasOwn(AGGREGATE_DENSITY_CASES,caseId) || typeof original?.css!=='string'
    || original.css_sha256!==AGGREGATE_DENSITY_CASES[caseId] || sha(original.css)!==original.css_sha256
    || original.css_bytes!==Buffer.byteLength(original.css) || !original.css.endsWith(catalog.original_tail)
    || original.css.split(catalog.original_tail).length!==2
    || !peers || JSON.stringify(Object.keys(peers).sort())!==JSON.stringify([...AGGREGATE_DENSITY_MEMBERS].sort()))return null;
  const line=peers.toolbar?.line;
  if(!catalog.toolbar_sources[line] || AGGREGATE_DENSITY_MEMBERS.some(f=>peers[f]?.line!==line))return null;
  const parts=catalog.members.map(member=>{
    const childId=`mixin-argument/${member.family}-density/custom-full-theme`;
    const child={css:member.css,css_sha256:sha(member.css),css_bytes:Buffer.byteLength(member.css)};
    if(member.family==='toolbar')return peerMeasurementMatches(peers.toolbar,toolbarDensityPeerProgram(),catalog.toolbar_sources[line])
      && peers.toolbar.css===member.css?member.css:null;
    return member.family==='tree'?treeCompanionExpectedCss(childId,child,peers.tree)
      :companionAdditionExpectedCss(childId,child,peers[member.family]);
  });
  if(parts.some(p=>p===null))return null;
  // Current public overrides emit direct parent declarations, unlike the old
  // at-root helper. Preserve the exact ordered declarations while composing the
  // one adjacent stepper/toolbar parent rule; all other rule bytes stay intact.
  const toolbar=parts[2],stepper=parts[1];
  if(!toolbar.startsWith('.sass-argument-probe {\n') || !stepper.endsWith('\n}'))return null;
  const joined=stepper.slice(0,-2)+'\n'+toolbar.slice('.sass-argument-probe {\n'.length);
  const tail=[parts[0],joined,parts[3],parts[4]].join('\n');
  return original.css.slice(0,-catalog.original_tail.length)+tail;
}
export function aggregateDensityResultsMatch(caseId,original,actual,peers){
  const expected=aggregateDensityExpectedCss(caseId,original,peers);
  return expected!==null && actual?.css===expected && actual.css_sha256===sha(actual.css)
    && actual.css_bytes===Buffer.byteLength(actual.css);
}

/** Finite append-only companion differences; original CSS remains byte exact. */
import {createHash} from 'node:crypto';
import {historicalStepperPeerCss} from './sass-stepper-historical-model.mjs';
import {readFileSync} from 'node:fs';
import {SCENARIOS,themeSass} from './companion-bridge-peer-oracle.mjs';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const catalog=JSON.parse(readFileSync(new URL('../fixtures/sass/companion-addition-contracts.json',import.meta.url)));
const scopes={...Object.fromEntries(['bottom-sheet','button-toggle','divider','expansion','sidenav','stepper'].map(f=>[f,['color','typography','density','theme']])),badge:['color','typography','density'],datepicker:['color','typography'],toolbar:['color','theme']};
const ids=Object.entries(scopes).flatMap(([family,dimensions])=>dimensions.flatMap(d=>[
  `mixin-argument/${family}-${d}/custom-full-theme`,
  `mixin-argument/${family}-${d}/${d==='theme'?'custom-dark-theme':`raw-${d}-config`}`,
]));
if(catalog.schema_version!==1 || JSON.stringify(Object.keys(catalog.cases).sort())!==JSON.stringify(ids.sort()))
  throw Error('finite companion addition roster changed');
export const COMPANION_ADDITION_CASES=Object.freeze(catalog.cases);

export function companionAdditionPeerProgram(caseId){
  if(!Object.hasOwn(COMPANION_ADDITION_CASES,caseId))return null;
  const entry=COMPANION_ADDITION_CASES[caseId];
  const scenario=SCENARIOS.find(s=>s.id===`closeout-custom-2018-${caseId.endsWith('/custom-dark-theme')?'dark':'light'}`);
  return "@use '@angular/material' as peer;\n"+themeSass('peer',scenario,{m2Prefix:'m2-'})
    +`.sass-argument-probe { ${['base',...entry.dimensions].map(d=>`@include peer.${entry.family}-${d}($theme);`).join(' ')} }\n`;
}
export function measureCompanionAdditionPeer({sass,materialRoot,cdkRoot,caseId,line}){
  const program=companionAdditionPeerProgram(caseId);
  return program===null?null:measureM2PeerProgram({sass,materialRoot,cdkRoot,program,line});
}
export function companionAdditionExpectedCss(caseId,original,peer){
  if(!Object.hasOwn(COMPANION_ADDITION_CASES,caseId))return null;
  const entry=COMPANION_ADDITION_CASES[caseId],floor=entry?.peers[peer?.line];
  if(!floor || typeof original?.css!=='string' || original.css_sha256!==entry.original_sha256
      || sha(original.css)!==entry.original_sha256 || original.css_bytes!==Buffer.byteLength(original.css)
      || !peerMeasurementMatches(peer,companionAdditionPeerProgram(caseId),catalog.sources[peer.line][entry.family])
      || peer.program_sha256!==floor.program_sha256 || peer.css_sha256!==floor.css_sha256)return null;
  const addition=entry.family==='stepper' ? historicalStepperPeerCss(peer.css,original.css,peer.line,entry.dimensions.includes('color')) : peer.css;
  if(addition===null)return null;
  return (original.css?original.css+entry.separator:'')+addition;
}
export function companionAdditionResultsMatch(caseId,original,actual,peer){
  const expected=companionAdditionExpectedCss(caseId,original,peer);
  return expected!==null && actual?.css===expected && actual.css_sha256===sha(actual.css)
    && actual.css_bytes===Buffer.byteLength(actual.css);
}

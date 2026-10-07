/** Four finite current-peer aliases; every historical motion/style byte survives. */
import {createHash} from 'node:crypto';
import {SCENARIOS,themeSass} from './companion-bridge-peer-oracle.mjs';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const ORIGINAL='e65293d6696aaaa07514f19bc208660605c43ecc79a954092d1a6d5fca156dcc';
export const PROGRESS_COLOR_ALIAS_CASES=Object.freeze(Object.fromEntries([
  'progress-bar-color/custom-full-theme','progress-bar-color/raw-color-config',
  'progress-bar-theme/custom-full-theme','progress-bar-theme/custom-dark-theme',
].map(id=>['mixin-argument/'+id,ORIGINAL])));
const SOURCES={
  'progress-bar/_m2-progress-bar.scss':['3ef9135469690508db54167b8e907c8d614c2cc8592b960de1296e7c6b2f2ca7',1021],
  'progress-bar/_progress-bar-theme.scss':['886c4282857365d43652c3c18928589defafd2d222a02848b6da70f9121ab4d1',2901],
};
const COLORS=[['','#303f9f','rgba(48, 63, 159, 0.25)'],
  ['.mat-accent','#ff4081','rgba(255, 64, 129, 0.25)'],
  ['.mat-warn','#b71c1c','rgba(183, 28, 28, 0.25)']];
export function progressColorPeerProgram(caseId){
  if(!Object.hasOwn(PROGRESS_COLOR_ALIAS_CASES,caseId))return null;
  const scenario=SCENARIOS.find(s=>s.id===`closeout-custom-2018-${caseId.endsWith('/custom-dark-theme')?'dark':'light'}`);
  // Only public color semantics are borrowed. Historical base/motion remains owned.
  return "@use '@angular/material' as peer;\n"+themeSass('peer',scenario,{m2Prefix:'m2-'})
    +'.sass-argument-probe { @include peer.progress-bar-color($theme); }\n';
}
export function progressColorPeerExpectedCss(){
  return COLORS.map(([variant,active,track])=>`.sass-argument-probe .mat-mdc-progress-bar${variant} {\n  --mat-progress-bar-active-indicator-color: ${active};\n  --mat-progress-bar-track-color: ${track};\n}`).join('\n');
}
export function measureProgressColorPeer({sass,materialRoot,cdkRoot,caseId,line}){
  const program=progressColorPeerProgram(caseId);
  return program===null?null:measureM2PeerProgram({sass,materialRoot,cdkRoot,program,line});
}
export function progressColorAliasExpectedCss(caseId,original,peer){
  if(!Object.hasOwn(PROGRESS_COLOR_ALIAS_CASES,caseId) || typeof original?.css!=='string'
      || original.css_sha256!==ORIGINAL || sha(original.css)!==ORIGINAL
      || original.css_bytes!==Buffer.byteLength(original.css)
      || !peerMeasurementMatches(peer,progressColorPeerProgram(caseId),SOURCES)
      || peer.css!==progressColorPeerExpectedCss())return null;
  let matches=0;
  const result=original.css.replace(/(\.sass-argument-probe \.mat-mdc-progress-bar(?:\.mat-(?:accent|warn))? \{\n  --mdc-linear-progress-active-indicator-color: ([^;\n]+);\n  --mdc-linear-progress-track-color: ([^;\n]+);)\n\}/g,
    (_,prefix,active,track)=>{matches++;return `${prefix}\n  --mat-progress-bar-active-indicator-color: ${active};\n  --mat-progress-bar-track-color: ${track};\n}`;});
  return matches===3?result:null;
}
export function progressColorAliasResultsMatch(caseId,original,actual,peer){
  const expected=progressColorAliasExpectedCss(caseId,original,peer);
  return expected!==null && actual?.css===expected && actual.css_sha256===sha(actual.css)
    && actual.css_bytes===Buffer.byteLength(actual.css);
}

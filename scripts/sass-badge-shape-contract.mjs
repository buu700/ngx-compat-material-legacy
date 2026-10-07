/** Two badge themes: authentic selectors/motion/fallbacks and exact peer additions. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {SCENARIOS,themeSass} from './companion-bridge-peer-oracle.mjs';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const catalog=JSON.parse(readFileSync(new URL('../fixtures/sass/badge-shape-contracts.json',import.meta.url)));
const ids=['mixin-argument/badge-theme/custom-full-theme','mixin-argument/badge-theme/custom-dark-theme'];
if(catalog.schema_version!==1 || JSON.stringify(Object.keys(catalog.cases).sort())!==JSON.stringify(ids.sort()))throw Error('finite badge shape scope changed');
export const BADGE_SHAPE_CASES=Object.freeze(catalog.cases);
export const BADGE_FORCED_COLOR_CSS='@media (forced-colors: active) {\n  .sass-argument-probe .mat-badge-content {\n    outline: solid 1px;\n    border-radius: 0;\n  }\n}';
const ORIGINAL_RULE='.cdk-high-contrast-active .sass-argument-probe .mat-badge-content {\n  outline: solid 1px;\n  border-radius: 0;\n}';
export function badgeShapePeerProgram(caseId){
  if(!Object.hasOwn(BADGE_SHAPE_CASES,caseId))return null;
  const scenario=SCENARIOS.find(s=>s.id===`closeout-custom-2018-${caseId.endsWith('/custom-dark-theme')?'dark':'light'}`);
  return "@use '@angular/material' as peer;\n@use '@angular/cdk' as cdk;\n"+themeSass('peer',scenario,{m2Prefix:'m2-'})
    +'.sass-argument-probe { @include peer.badge-base($theme); @include peer.badge-color($theme); @include peer.badge-typography($theme); @include peer.badge-density($theme); .mat-badge-content { @include cdk.high-contrast(active) { outline: solid 1px; border-radius: 0; } } }\n';
}
export function measureBadgeShapePeer({sass,materialRoot,cdkRoot,caseId,line}){
  const program=badgeShapePeerProgram(caseId);
  return program===null?null:measureM2PeerProgram({sass,materialRoot,cdkRoot,program,line});
}
export function badgeShapeExpectedCss(caseId,original,peer){
  if(!Object.hasOwn(BADGE_SHAPE_CASES,caseId))return null;
  const entry=BADGE_SHAPE_CASES[caseId],floor=entry.peers[peer?.line],cdk=catalog.cdk_sources[peer?.line];
  if(!floor || typeof original?.css!=='string' || original.css_sha256!==entry.original_sha256
      || sha(original.css)!==entry.original_sha256 || original.css_bytes!==Buffer.byteLength(original.css)
      || !peerMeasurementMatches(peer,badgeShapePeerProgram(caseId),catalog.sources[peer.line])
      || !peer.sources.some(s=>Object.keys(cdk).every(k=>s[k]===cdk[k]))
      || peer.program_sha256!==floor.program_sha256 || peer.css_sha256!==floor.css_sha256
      || !peer.css.endsWith('\n'+BADGE_FORCED_COLOR_CSS))return null;
  let css=original.css.replace('  border-radius: 50%;','  border-radius: var(--mat-badge-container-shape, 50%);');
  for(const [size,value,geometry,height] of [
    ['small','16','legacy-small-size-container-size','small-size-line-height'],
    ['medium','22','legacy-container-size','line-height'],
    ['large','28','legacy-large-size-container-size','large-size-line-height']]){
    const from=`.sass-argument-probe .mat-badge-${size} .mat-badge-content {\n  width: ${value}px;\n  height: ${value}px;\n  line-height: ${value}px;`;
    if(!css.includes(from))return null;
    css=css.replace(from,`.sass-argument-probe .mat-badge-${size} .mat-badge-content {\n  width: var(--mat-badge-${geometry}, ${value}px);\n  height: var(--mat-badge-${geometry}, ${value}px);\n  line-height: var(--mat-badge-${height}, ${value}px);`);
  }
  if(!css.includes(ORIGINAL_RULE+'\n\n'))return null;
  css=css.replace(ORIGINAL_RULE+'\n\n',ORIGINAL_RULE+'\n\n'+BADGE_FORCED_COLOR_CSS+'\n');
  return css+'\n\n'+peer.css.slice(0,-(BADGE_FORCED_COLOR_CSS.length+1));
}
export function badgeShapeResultsMatch(caseId,original,actual,peer){
  const expected=badgeShapeExpectedCss(caseId,original,peer);
  return expected!==null && actual?.css===expected && actual.css_sha256===sha(actual.css)
    && actual.css_bytes===Buffer.byteLength(actual.css);
}

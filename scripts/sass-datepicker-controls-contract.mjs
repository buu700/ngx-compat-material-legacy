/** Historical calendar density stays intact; current slots use public overrides. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {SCENARIOS,themeSass} from './companion-bridge-peer-oracle.mjs';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const catalog=JSON.parse(readFileSync(new URL('../fixtures/sass/datepicker-controls-contracts.json',import.meta.url)));
const ids=['datepicker-density/custom-full-theme','datepicker-density/raw-density-config','datepicker-theme/custom-full-theme','datepicker-theme/custom-dark-theme'].map(id=>'mixin-argument/'+id);
if(catalog.schema_version!==1 || JSON.stringify(Object.keys(catalog.cases).sort())!==JSON.stringify(ids.sort()))throw Error('finite datepicker controls scope changed');
export const DATEPICKER_CONTROLS_CASES=Object.freeze(catalog.cases);
export const ORIGINAL_CALENDAR_DENSITY='.sass-argument-probe .mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base {\n  --mdc-icon-button-state-layer-size: 40px;\n  width: var(--mdc-icon-button-state-layer-size);\n  height: var(--mdc-icon-button-state-layer-size);\n  padding: 8px;\n}\n.sass-argument-probe .mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base .mat-mdc-button-touch-target {\n  display: none;\n}';
export const CURRENT_CALENDAR_FALLBACKS='.sass-argument-probe .mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base {\n  width: var(--mat-icon-button-state-layer-size, var(--mdc-icon-button-state-layer-size));\n  height: var(--mat-icon-button-state-layer-size, var(--mdc-icon-button-state-layer-size));\n}\n.sass-argument-probe .mat-calendar-controls .mat-mdc-icon-button.mat-mdc-button-base .mat-mdc-button-touch-target {\n  display: var(--mat-icon-button-touch-target-display, none);\n}';
export function datepickerControlsPeerProgram(caseId){
  if(!Object.hasOwn(DATEPICKER_CONTROLS_CASES,caseId))return null;
  const theme=caseId.includes('/datepicker-theme/');
  const scenario=SCENARIOS.find(s=>s.id===`closeout-custom-2018-${caseId.endsWith('/custom-dark-theme')?'dark':'light'}`);
  return "@use '@angular/material' as peer;\n"+themeSass('peer',scenario,{m2Prefix:'m2-'})
    +`.sass-argument-probe { @include peer.datepicker-base($theme); ${theme?'@include peer.datepicker-color($theme); @include peer.datepicker-typography($theme); ':''}.mat-calendar-controls { @include peer.icon-button-overrides((touch-target-display: none)); .mat-mdc-icon-button.mat-mdc-button-base { @include peer.icon-button-overrides((state-layer-size: 40px)); } } }\n`;
}
export function measureDatepickerControlsPeer({sass,materialRoot,cdkRoot,caseId,line}){
  const program=datepickerControlsPeerProgram(caseId);
  return program===null?null:measureM2PeerProgram({sass,materialRoot,cdkRoot,program,line});
}
export function datepickerControlsExpectedCss(caseId,original,peer){
  if(!Object.hasOwn(DATEPICKER_CONTROLS_CASES,caseId))return null;
  const entry=DATEPICKER_CONTROLS_CASES[caseId],floor=entry.peers[peer?.line];
  if(!floor || typeof original?.css!=='string' || original.css_sha256!==entry.original_sha256
      || sha(original.css)!==entry.original_sha256 || original.css_bytes!==Buffer.byteLength(original.css)
      || !peerMeasurementMatches(peer,datepickerControlsPeerProgram(caseId),catalog.sources[peer.line])
      || peer.program_sha256!==floor.program_sha256 || peer.css_sha256!==floor.css_sha256
      || original.css.split(ORIGINAL_CALENDAR_DENSITY).length!==2)return null;
  return original.css.replace(ORIGINAL_CALENDAR_DENSITY,ORIGINAL_CALENDAR_DENSITY+'\n'+CURRENT_CALENDAR_FALLBACKS)
    +(caseId.includes('/datepicker-theme/')?'\n\n':'\n')+peer.css;
}
export function datepickerControlsResultsMatch(caseId,original,actual,peer){
  const expected=datepickerControlsExpectedCss(caseId,original,peer);
  return expected!==null && actual?.css===expected && actual.css_sha256===sha(actual.css)
    && actual.css_bytes===Buffer.byteLength(actual.css);
}

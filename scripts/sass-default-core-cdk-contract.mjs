/** Five default core cases: preserve owned CSS around public CDK contributions. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const catalog=JSON.parse(readFileSync(new URL('../fixtures/sass/default-core-cdk-contracts.json',import.meta.url)));
const oracleBytes=readFileSync(new URL('../compatibility/rc/oracles/material-16.2.14-sass-api.json',import.meta.url)),oracle=JSON.parse(oracleBytes);
const ids=['core','legacy-core','ripple','private-menu-common-item-submenu-icon','private-strong-focus-indicators-structural-styling'].map(n=>'mixin-css/'+n);
if(catalog.schema_version!==1 || sha(oracleBytes)!==catalog.oracle_sha256
  || JSON.stringify(Object.keys(catalog.cases).sort())!==JSON.stringify(ids.sort())
  || ids.some(id=>{const e=catalog.cases[id],o=oracle.members.mixins[id.slice(10)].invocation;return e.original_sha256!==o.css_sha256||e.original_bytes!==o.css_bytes||sha(e.original_css)!==o.css_sha256;}))throw Error('finite default core/CDK scope changed');
export const DEFAULT_CORE_CDK_CASES=Object.freeze(catalog.cases);
export const DEFAULT_CORE_CDK_CONTRACT='historical-core-with-public-cdk-contributions';
const cdkOrder=['a11y-visually-hidden','overlay','text-field-autosize','text-field-autofill'];
const names=['ripple_force','focus_mat_force','focus_mdc_force','root_focus_mat_force','root_focus_mdc_force','menu_force',...cdkOrder];
const marker=(name,part)=>`/*!__core_cdk_${name}_${part}__*/`;

export function defaultCoreCdkPeerProgram(){return catalog.peer_program;}
export function measureDefaultCoreCdkPeer(options){
  const peer=measureM2PeerProgram({...options,program:catalog.peer_program});
  const raw=readFileSync(join(options.cdkRoot,'package.json'));
  return {...peer,cdk_version:JSON.parse(raw).version,cdk_package_json_sha256:sha(raw)};
}
function peerParts(peer){
  const floor=catalog.peers[peer?.line];if(!floor)return null;
  if(!peerMeasurementMatches(peer,catalog.peer_program,{}) || peer.css_sha256!==floor.css_sha256
    || peer.cdk_version!==floor.cdk_version || peer.cdk_package_json_sha256!==floor.cdk_package_json_sha256
    || peer.sources.length!==floor.sources.length || floor.sources.some(s=>!peer.sources.some(v=>v.root===s.root&&v.path===s.path&&v.sha256===s.sha256&&v.bytes===s.bytes)))return null;
  const result={};
  for(const n of names){
    const begin=marker(n,'begin'),end=marker(n,'end');
    if(peer.css.split(begin).length!==2||peer.css.split(end).length!==2)return null;
    result[n]=peer.css.split(begin)[1].split(end)[0].trim();
  }
  return result;
}
function focus(css,root,p){
  const boundary='\n\n'+(root?'':'.sass-api-probe ')+'.mat-mdc-focus-indicator {';
  if(css.split(boundary).length!==2)return null;
  const [first,second]=css.split(boundary);
  return first+'\n\n'+p[(root?'root_':'')+'focus_mat_force']+'\n'+boundary.slice(2)+second+'\n\n'+p[(root?'root_':'')+'focus_mdc_force'];
}
export function defaultCoreCdkExpectedCss(caseId,peer){
  const entry=DEFAULT_CORE_CDK_CASES[caseId],p=peerParts(peer);if(!entry||!p)return null;
  const old=entry.original_css;
  if(caseId==='mixin-css/ripple')return old+'\n\n'+p.ripple_force;
  if(caseId==='mixin-css/private-menu-common-item-submenu-icon')return old+'\n\n'+p.menu_force;
  if(caseId==='mixin-css/private-strong-focus-indicators-structural-styling')return focus(old,true,p);
  const ripple=DEFAULT_CORE_CDK_CASES['mixin-css/ripple'].original_css;
  if(!old.startsWith(ripple))return null;
  let previous=ripple.length;const separators={};
  for(const n of cdkOrder){
    const member=catalog.original_cdk_members[n];if(!member||old.split(member).length!==2)return null;
    const start=old.indexOf(member),separator=old.slice(previous,start);
    if(!['\n','\n\n'].includes(separator))return null;
    separators[n]=separator;previous=start+member.length;
  }
  const tail=old.slice(previous);if(!tail.startsWith('\n.sass-api-probe .mat-focus-indicator {'))return null;
  const ownedFocus=focus(tail.slice(1),false,p);if(ownedFocus===null)return null;
  // Replace only the four known borrowed CDK members. Owned ripple/focus
  // declarations and class selectors remain complete and ordered. The one
  // changed boundary is the current media block before visually-hidden CSS.
  return ripple+'\n\n'+p.ripple_force+cdkOrder.map(n=>(n==='a11y-visually-hidden'?'\n':separators[n])+p[n]).join('')+'\n'+ownedFocus;
}
export function defaultCoreCdkResultsMatch(caseId,actual,contract){
  if(contract?.classification!=='conforming-current-infrastructure'||contract.contract!==DEFAULT_CORE_CDK_CONTRACT)return false;
  if(actual?.actual_measurement?.line!==contract.peer?.line
    || actual?.actual_measurement?.css!==actual?.css
    || actual?.actual_measurement?.css_sha256!==actual?.sha256)return false;
  const expected=defaultCoreCdkExpectedCss(caseId,contract.peer);
  return expected!==null&&actual?.css===expected&&actual.sha256===sha(actual.css);
}
export function defaultCoreCdkMeasurementOk(caseId,measurement,line){
  const entry=DEFAULT_CORE_CDK_CASES[caseId];
  if(!entry||measurement?.line!==line||measurement.program_sha256!==entry.program_sha256||typeof measurement.css!=='string'
    || measurement.css_sha256!==sha(measurement.css)||measurement.css_bytes!==Buffer.byteLength(measurement.css)
    || typeof measurement.sass_version!=='string'||!measurement.sass_version.startsWith('dart-sass\t1.104.1\t'))return false;
  const sources=measurement.sources;
  if(!Array.isArray(sources)||!sources.length||sources.some(s=>!Number.isInteger(s.root)||![0,1,2].includes(s.root)
    ||typeof s.path!=='string'||!s.path||s.path.startsWith('/')||s.path.includes('\\')||s.path.split('/').includes('..')
    ||!/^[0-9a-f]{64}$/.test(s.sha256)||!Number.isInteger(s.bytes)||s.bytes<1)
    ||new Set(sources.map(s=>`${s.root}/${s.path}`)).size!==sources.length)return false;
  const required=['_index.scss','styles/core/style/_high-contrast.scss'];
  if(['mixin-css/core','mixin-css/legacy-core','mixin-css/ripple'].includes(caseId))required.push('styles/core/ripple/_ripple.scss');
  if(['mixin-css/core','mixin-css/legacy-core','mixin-css/private-strong-focus-indicators-structural-styling'].includes(caseId))required.push('styles/core/focus-indicators/_private.scss');
  if(caseId==='mixin-css/private-menu-common-item-submenu-icon')required.push('styles/core/style/_menu-common.scss');
  return Object.hasOwn(catalog.peers,line)&&required.every(path=>sources.some(s=>s.root===0&&s.path===path));
}

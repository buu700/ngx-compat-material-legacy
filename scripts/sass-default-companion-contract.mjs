/** Finite default companion cases: complete historical CSS plus exact public peer CSS. */
import {createHash} from 'node:crypto';
import {historicalStepperPeerCss} from './sass-stepper-historical-model.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const catalog=JSON.parse(readFileSync(new URL('../fixtures/sass/default-companion-contracts.json',import.meta.url)));
const raw=readFileSync(new URL('../compatibility/rc/oracles/material-16.2.14-sass-api.json',import.meta.url)),oracle=JSON.parse(raw);
const scopes={...Object.fromEntries(['bottom-sheet','button-toggle','divider','expansion','sidenav','stepper'].map(n=>[n,['color','typography','density','theme']])),badge:['color','typography','density'],datepicker:['color','typography'],toolbar:['color','theme']};
const ids=Object.entries(scopes).flatMap(([family,dimensions])=>dimensions.map(d=>'mixin-css/'+family+'-'+d));
const peerSetup=oracle.standard_theme.replaceAll('m.define-','peer.m2-define-').replaceAll('m.$','peer.$m2-');
if(catalog.peer_setup!==peerSetup)throw Error('default companion peer theme changed');
const peerSourceSets=Object.fromEntries(Object.entries(catalog.peer_inputs).map(([line,input])=>[line,new Set(input.sources.map(s=>JSON.stringify([s.root,s.path,s.sha256,s.bytes])))]));
if(catalog.schema_version!==1||sha(raw)!==catalog.oracle_sha256||JSON.stringify(Object.keys(catalog.cases).sort())!==JSON.stringify(ids.sort()))throw Error('finite default companion scope changed');
for(const [id,e] of Object.entries(catalog.cases)){
 const name=id.slice(10),inv=oracle.members.mixins[name].invocation,dimension=name.slice(e.family.length+1);
 const dimensions=dimension==='theme'?['color','typography','density']:[dimension];
 const program="@use '__entry__' as m;\n"+oracle.standard_theme+'\n'+e.call+'\n';
 const separator=['mixin-css/badge-color','mixin-css/datepicker-color','mixin-css/toolbar-color'].includes(id)?'\n':'\n\n';
 const peerProgram="@use '@angular/material' as peer;\n"+peerSetup+'\n.sass-api-probe { '+['base',...dimensions].map(d=>`@include peer.${e.family}-${d}($__theme);`).join(' ')+' }\n';
 if(Object.values(e.peers).some(floor=>floor.program_sha256!==sha(peerProgram)))throw Error('default companion peer program changed');
 if(name!==e.family+'-'+dimension||!Object.hasOwn(scopes,e.family)||!scopes[e.family].includes(dimension)||JSON.stringify(e.dimensions)!==JSON.stringify(dimensions)
   ||e.call!==`.sass-api-probe { @include m.${name}($__theme); }`||e.program_sha256!==sha(program)
   ||e.original_sha256!==inv.css_sha256||e.original_bytes!==inv.css_bytes||sha(e.original_css)!==inv.css_sha256
   ||Buffer.byteLength(e.original_css)!==e.original_bytes||e.separator!==separator)throw Error('finite default companion original contract changed');
}
export const DEFAULT_COMPANION_CASES=Object.freeze(catalog.cases);
export const DEFAULT_COMPANION_CONTRACT='historical-default-css-with-public-companion-addition';
export function defaultCompanionPeerProgram(id){
 const e=DEFAULT_COMPANION_CASES[id];
 return e?"@use '@angular/material' as peer;\n"+catalog.peer_setup+'\n.sass-api-probe { '+['base',...e.dimensions].map(d=>`@include peer.${e.family}-${d}($__theme);`).join(' ')+' }\n':null;
}
export function measureDefaultCompanionPeer(options){
 const program=defaultCompanionPeerProgram(options.caseId);if(program===null)throw Error('unknown default companion case');
 const peer=measureM2PeerProgram({...options,program}),raw=readFileSync(join(options.cdkRoot,'package.json'));
 return {...peer,cdk_version:JSON.parse(raw).version,cdk_package_json_sha256:sha(raw)};
}
export function defaultCompanionExpectedCss(id,peer){
 const e=DEFAULT_COMPANION_CASES[id],floor=e?.peers[peer?.line],inputs=catalog.peer_inputs[peer?.line];
 if(!floor||!inputs||!peerMeasurementMatches(peer,defaultCompanionPeerProgram(id),{})
   ||peer.program_sha256!==floor.program_sha256||peer.css_sha256!==floor.css_sha256
   ||peer.cdk_version!==peer.peer_version||peer.cdk_version!==inputs.cdk_version||peer.cdk_package_json_sha256!==inputs.cdk_package_json_sha256
   ||peer.sources.length!==inputs.sources.length||peer.sources.some(s=>!peerSourceSets[peer.line].has(JSON.stringify([s.root,s.path,s.sha256,s.bytes]))))return null;
 const addition=e.family==='stepper' ? historicalStepperPeerCss(peer.css,e.original_css,peer.line,e.dimensions.includes('color')) : peer.css;
 if(addition===null)return null;
 return (e.original_css?e.original_css+e.separator:'')+addition;
}
export function defaultCompanionMeasurementOk(id,m,line){
 const e=DEFAULT_COMPANION_CASES[id];
 if(!e||!Object.hasOwn(catalog.peer_inputs,line)||m?.line!==line||m.program_sha256!==e.program_sha256||typeof m.css!=='string'
   ||m.css_sha256!==sha(m.css)||m.css_bytes!==Buffer.byteLength(m.css)||typeof m.sass_version!=='string'||!m.sass_version.startsWith('dart-sass\t1.104.1\t'))return false;
 const ss=m.sources;
 if(!Array.isArray(ss)||!ss.length||ss.some(s=>!Number.isInteger(s.root)||![0,1,2].includes(s.root)||typeof s.path!=='string'||!s.path
   ||s.path.startsWith('/')||s.path.includes('\\')||s.path.split('/').includes('..')||!/^[0-9a-f]{64}$/.test(s.sha256)||!Number.isInteger(s.bytes)||s.bytes<1)
   ||new Set(ss.map(s=>`${s.root}/${s.path}`)).size!==ss.length)return false;
 return ['_index.scss','styles/bridges/_companion-overrides.scss','styles/bridges/_m2-system.scss','styles/core/theming/_theming.scss'].every(path=>ss.some(s=>s.root===0&&s.path===path));
}
export function defaultCompanionResultsMatch(id,actual,contract){
 if(!actual?.actual_measurement||!contract?.peer)return false;
 if(contract?.classification!=='conforming-current-companion'||contract.contract!==DEFAULT_COMPANION_CONTRACT
   ||actual?.actual_measurement?.line!==contract.peer?.line||actual.actual_measurement.css!==actual.css||actual.actual_measurement.css_sha256!==actual.sha256)return false;
 const expected=defaultCompanionExpectedCss(id,contract.peer);
 return expected!==null&&actual.css===expected&&actual.sha256===sha(actual.css);
}

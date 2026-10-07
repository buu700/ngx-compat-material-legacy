/** Eight finite default mappings retain every owned rule and historical fallback. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const catalog=JSON.parse(readFileSync(new URL('../fixtures/sass/default-mapped-companion-contracts.json',import.meta.url)));
const raw=readFileSync(new URL('../compatibility/rc/oracles/material-16.2.14-sass-api.json',import.meta.url)),oracle=JSON.parse(raw);
const scopes={sort:['color','theme'],tree:['color','typography','density','theme'],'progress-bar':['color','theme']};
const ids=Object.entries(scopes).flatMap(([family,ds])=>ds.map(d=>'mixin-css/'+family+'-'+d));
const peerSetup=oracle.standard_theme.replaceAll('m.define-','peer.m2-define-').replaceAll('m.$','peer.$m2-');
const peerSourceSets=Object.fromEntries(Object.entries(catalog.peer_inputs).map(([line,input])=>[line,new Set(input.sources.map(s=>JSON.stringify([s.root,s.path,s.sha256,s.bytes])))]));
if(catalog.schema_version!==1||sha(raw)!==catalog.oracle_sha256||catalog.peer_setup!==peerSetup
  ||JSON.stringify(Object.keys(catalog.cases).sort())!==JSON.stringify(ids.sort()))throw Error('finite default mapped companion scope changed');

export const DEFAULT_MAPPED_COMPANION_CASES=Object.freeze(catalog.cases);
export const DEFAULT_MAPPED_COMPANION_CONTRACT='historical-default-css-with-public-companion-mapping';
export function defaultMappedCompanionPeerProgram(id){
  const e=DEFAULT_MAPPED_COMPANION_CASES[id];if(!e)return null;
  const dimensions=e.dimension==='theme'?['color','typography','density']:[e.dimension];
  const includes=e.family==='tree'?['base',...dimensions].map(d=>`@include peer.tree-${d}($__theme);`).join(' ')
    :`@include peer.${e.family}-${e.family==='progress-bar'?'color':e.dimension}($__theme);`;
  return "@use '@angular/material' as peer;\n"+peerSetup+'\n.sass-api-probe { '+includes+' }\n';
}
for(const [id,e] of Object.entries(DEFAULT_MAPPED_COMPANION_CASES)){
  const name=id.slice(10),inv=oracle.members.mixins[name].invocation;
  const program="@use '__entry__' as m;\n"+oracle.standard_theme+'\n'+e.call+'\n';
  if(!Object.hasOwn(scopes,e.family)||!scopes[e.family].includes(e.dimension)||name!==e.family+'-'+e.dimension
    ||e.call!==`.sass-api-probe { @include m.${name}($__theme); }`||e.program_sha256!==sha(program)
    ||e.original_sha256!==inv.css_sha256||e.original_bytes!==inv.css_bytes||sha(e.original_css)!==inv.css_sha256
    ||Buffer.byteLength(e.original_css)!==e.original_bytes
    ||Object.values(e.peers).some(p=>p.program_sha256!==sha(defaultMappedCompanionPeerProgram(id))))throw Error('finite default mapped companion reference changed');
}

export function measureDefaultMappedCompanionPeer(options){
  const program=defaultMappedCompanionPeerProgram(options.caseId);if(program===null)throw Error('unknown default mapped companion case');
  const peer=measureM2PeerProgram({...options,program}),raw=readFileSync(join(options.cdkRoot,'package.json'));
  return {...peer,cdk_version:JSON.parse(raw).version,cdk_package_json_sha256:sha(raw)};
}

export function defaultMappedCompanionPeerExpectedCss(id){
  const e=DEFAULT_MAPPED_COMPANION_CASES[id];if(!e)return null;
  if(e.family==='sort')return '.sass-api-probe {\n  --mat-sort-arrow-color: rgba(0, 0, 0, 0.87);\n}';
  if(e.family==='tree'){
    const groups={color:[['container-background-color','white'],['node-text-color','rgba(0, 0, 0, 0.87)']],
      typography:[['node-text-font','Roboto, sans-serif'],['node-text-size','14px'],['node-text-weight','400']],density:[['node-min-height','48px']]};
    const dimensions=e.dimension==='theme'?['color','typography','density']:[e.dimension];
    return '.sass-api-probe {\n'+dimensions.flatMap(d=>groups[d]).map(([key,value])=>`  --mat-tree-${key}: ${value};`).join('\n')+'\n}';
  }
  return [['','#3f51b5','rgba(63, 81, 181, 0.25)'],['.mat-accent','#ff4081','rgba(255, 64, 129, 0.25)'],['.mat-warn','#f44336','rgba(244, 67, 54, 0.25)']]
    .map(([variant,active,track])=>`.sass-api-probe .mat-mdc-progress-bar${variant} {\n  --mat-progress-bar-active-indicator-color: ${active};\n  --mat-progress-bar-track-color: ${track};\n}`).join('\n');
}

export function defaultMappedCompanionExpectedCss(id,peer){
  const e=DEFAULT_MAPPED_COMPANION_CASES[id],floor=e?.peers[peer?.line],inputs=catalog.peer_inputs[peer?.line];
  if(!floor||!inputs||!peerMeasurementMatches(peer,defaultMappedCompanionPeerProgram(id),{})
    ||peer.program_sha256!==floor.program_sha256||peer.css_sha256!==floor.css_sha256||peer.css_bytes!==floor.css_bytes
    ||peer.css!==defaultMappedCompanionPeerExpectedCss(id)||peer.cdk_version!==peer.peer_version
    ||peer.cdk_version!==inputs.cdk_version||peer.cdk_package_json_sha256!==inputs.cdk_package_json_sha256
    ||peer.sources.length!==inputs.sources.length||peer.sources.some(s=>!peerSourceSets[peer.line].has(JSON.stringify([s.root,s.path,s.sha256,s.bytes]))))return null;
  if(e.family==='sort'){
    const match=e.original_css.match(/^\.sass-api-probe \.mat-sort-header-arrow \{\n  color: ([^;\n]+);\n\}$/);
    return match?`.sass-api-probe .mat-sort-header-arrow {\n  color: var(--mat-sort-arrow-color, ${match[1]});\n}\n`+peer.css:null;
  }
  if(e.family==='tree'){
    const tokens={background:'container-background-color',color:'node-text-color','font-weight':'node-text-weight','font-size':'node-text-size','min-height':'node-min-height'};
    let count=0;
    const css=e.original_css.replace(/^  (background|color|font-weight|font-size|min-height): ([^;\n{}]+);$/gm,
      (_,property,value)=>{count++;return `  ${property}: var(--mat-tree-${tokens[property]}, ${value});`;});
    return count==={color:2,typography:2,density:1,theme:5}[e.dimension]?css+'\n'+peer.css:null;
  }
  // Insert only three independently verified color aliases; leave motion, media,
  // images, selectors, original variables and every remaining byte untouched.
  let count=0;
  const css=e.original_css.replace(/(\.sass-api-probe \.mat-mdc-progress-bar(?:\.mat-(?:accent|warn))? \{\n  --mdc-linear-progress-active-indicator-color: ([^;\n]+);\n  --mdc-linear-progress-track-color: ([^;\n]+);)\n\}/g,
    (_,prefix,active,track)=>{count++;return `${prefix}\n  --mat-progress-bar-active-indicator-color: ${active};\n  --mat-progress-bar-track-color: ${track};\n}`;});
  return count===3?css:null;
}

export function defaultMappedCompanionMeasurementOk(id,m,line){
  const e=DEFAULT_MAPPED_COMPANION_CASES[id];
  if(!e||!Object.hasOwn(catalog.peer_inputs,line)||m?.line!==line||m.program_sha256!==e.program_sha256||typeof m.css!=='string'
    ||m.css_sha256!==sha(m.css)||m.css_bytes!==Buffer.byteLength(m.css)||typeof m.sass_version!=='string'||!m.sass_version.startsWith('dart-sass\t1.104.1\t'))return false;
  const ss=m.sources;
  if(!Array.isArray(ss)||!ss.length||ss.some(s=>!Number.isInteger(s.root)||![0,1,2].includes(s.root)||typeof s.path!=='string'||!s.path
    ||s.path.startsWith('/')||s.path.includes('\\')||s.path.split('/').includes('..')||!/^[0-9a-f]{64}$/.test(s.sha256)||!Number.isInteger(s.bytes)||s.bytes<1)
    ||new Set(ss.map(s=>`${s.root}/${s.path}`)).size!==ss.length)return false;
  const required=['_index.scss','styles/bridges/_companion-overrides.scss','styles/bridges/_m2-system.scss','styles/core/theming/_theming.scss',`styles/${e.family}/_${e.family}-theme.scss`];
  if(e.family==='progress-bar')required.push('styles/legacy-progress-bar/_progress-bar-theme.scss');
  return required.every(path=>ss.some(s=>s.root===0&&s.path===path));
}
export function defaultMappedCompanionResultsMatch(id,actual,contract){
  if(!actual?.actual_measurement||!contract?.peer||contract.classification!=='conforming-current-companion'
    ||contract.contract!==DEFAULT_MAPPED_COMPANION_CONTRACT||actual.actual_measurement.line!==contract.peer.line
    ||actual.actual_measurement.css!==actual.css||actual.actual_measurement.css_sha256!==actual.sha256)return false;
  const expected=defaultMappedCompanionExpectedCss(id,contract.peer);
  return expected!==null&&actual.css===expected&&actual.sha256===sha(actual.css);
}

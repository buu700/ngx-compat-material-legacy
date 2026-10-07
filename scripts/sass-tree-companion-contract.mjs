/** Finite current-tree differences preserve every original selector and fallback. */
import {createHash} from 'node:crypto';
import {SCENARIOS,themeSass} from './companion-bridge-peer-oracle.mjs';
import {measureM2PeerProgram,peerMeasurementMatches} from './sass-current-companion-peer.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const TREE_COMPANION_CASES=Object.freeze({
  'mixin-argument/tree-color/custom-full-theme':'fa403fd64c3bbd3312e0356f8e4583fed7fe806e82be74a197a161aacea3fe45',
  'mixin-argument/tree-color/raw-color-config':'fa403fd64c3bbd3312e0356f8e4583fed7fe806e82be74a197a161aacea3fe45',
  'mixin-argument/tree-density/custom-full-theme':'794b08d991fb8a67e78b4efb90a498c5d048781d031b164620ca3c63108e7f02',
  'mixin-argument/tree-density/raw-density-config':'794b08d991fb8a67e78b4efb90a498c5d048781d031b164620ca3c63108e7f02',
  'mixin-argument/tree-typography/custom-full-theme':'8f780bf1204aed04212d2d96d1fd42f76c099814877d08416dc3165fc789fae2',
  'mixin-argument/tree-typography/raw-typography-config':'8f780bf1204aed04212d2d96d1fd42f76c099814877d08416dc3165fc789fae2',
  'mixin-argument/tree-theme/custom-full-theme':'f0c42168029ce1e5a33adc06397a213da2827bfb704996797aaf7d07d7e5a798',
  'mixin-argument/tree-theme/custom-dark-theme':'3ba982b68f6ff83aed679481c1e2697d9296cf63f31f5a6d3116ec9402147d2a',
});
const REQUIRED_SOURCES={
  'tree/_m2-tree.scss':['efb7b17cb55631f6dc3318ed2dc04240055f92aa742b015d00c47864db2429b5',871],
  'tree/_tree-theme.scss':['645c90053453a65e4519c2396a1710f881866a3a589a241108490d86577ec2a2',1977],
};
export function treeDimensions(caseId){
  if(!Object.hasOwn(TREE_COMPANION_CASES,caseId))return null;
  const dimension=caseId.split('/')[1].slice('tree-'.length);
  return dimension==='theme'?['color','typography','density']:[dimension];
}
export function treePeerProgram(caseId){
  const dimensions=treeDimensions(caseId);if(!dimensions)return null;
  const dark=caseId.endsWith('/custom-dark-theme');
  const scenario=SCENARIOS.find(s=>s.id===`closeout-custom-2018-${dark?'dark':'light'}`);
  if(!scenario)throw Error('independent peer tree scenario missing');
  // Explicit current-token dimension order. Original historical rule order is
  // retained separately; no CSS declarations are normalized or reordered.
  return "@use '@angular/material' as peer;\n"+themeSass('peer',scenario,{m2Prefix:'m2-'})
    +`.sass-argument-probe { ${['base',...dimensions].map(d=>`@include peer.tree-${d}($theme);`).join(' ')} }\n`;
}
export function measureTreePeer({sass,materialRoot,cdkRoot,caseId,line}){
  const program=treePeerProgram(caseId);
  return program===null?null:measureM2PeerProgram({sass,materialRoot,cdkRoot,program,line});
}
export function treePeerExpectedCss(caseId){
  const dimensions=treeDimensions(caseId);if(!dimensions)return null;
  const dark=caseId.endsWith('/custom-dark-theme');
  const groups={
    color:[['container-background-color',dark?'#424242':'white'],['node-text-color',dark?'white':'rgba(0, 0, 0, 0.87)']],
    typography:[['node-text-font','Custom Family'],['node-text-size','14px'],['node-text-weight','400']],
    density:[['node-min-height','40px']],
  };
  return '.sass-argument-probe {\n'+dimensions.flatMap(d=>groups[d]).map(([key,value])=>`  --mat-tree-${key}: ${value};`).join('\n')+'\n}';
}
export function treeCompanionExpectedCss(caseId,original,peer){
  if(!Object.hasOwn(TREE_COMPANION_CASES,caseId)||typeof original?.css!=='string'
      ||original.css_sha256!==TREE_COMPANION_CASES[caseId]||sha(original.css)!==original.css_sha256
      ||original.css_bytes!==Buffer.byteLength(original.css)
      ||!peerMeasurementMatches(peer,treePeerProgram(caseId),REQUIRED_SOURCES)
      ||peer.css!==treePeerExpectedCss(caseId))return null;
  const tokens={background:'container-background-color',color:'node-text-color',
    'font-weight':'node-text-weight','font-size':'node-text-size','min-height':'node-min-height'};
  const originalWithFallbacks=original.css.replace(/^  (background|color|font-weight|font-size|min-height): ([^;\n{}]+);$/gm,
    (_,property,value)=>`  ${property}: var(--mat-tree-${tokens[property]}, ${value});`);
  return originalWithFallbacks+'\n'+peer.css;
}
export function treeCompanionResultsMatch(caseId,original,actual,peer){
  const expected=treeCompanionExpectedCss(caseId,original,peer);
  return expected!==null&&actual?.css===expected&&actual.css_sha256===sha(actual.css)&&actual.css_bytes===Buffer.byteLength(actual.css);
}

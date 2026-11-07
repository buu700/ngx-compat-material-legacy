/** @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Complete historical CSS with finite ordinary button tokens for legacy datepickers. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ordinaryCheckboxButtonExpectedCss} from '../compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const ORDERED_LEGACY_BUTTON_CONTRACT='historical-legacy-datepicker-with-public-ordinary-button-tokens';
export const ORDERED_LEGACY_BUTTON_CASES=Object.freeze({
  '07-with-configuration':Object.freeze({reference_sha256:'a183901f771c82348fba49d9687776869bea17821e5c5bc078d2a56995a0d0c2',fixture_sha256:'e3e3ac962a8a704ebecc9b37f2c123624b4e227b8760b2b95bef0b3a15a45320',scopes:['.mat-datepicker-content','.repeat .mat-datepicker-content'],phases:['color','density']}),
  '05-custom-map-nested':Object.freeze({reference_sha256:'e82b4ca28cb36a74fdd7d9c25c25288e4ca2587b06f86fe525e43a68daedc130',fixture_sha256:'3b84ac535804b859763e75e520472659fb85905ba95c190057c45a2532abc03f',scopes:['.shell .alternate .mat-datepicker-content'],phases:['color','density']}),
  'owned-legacy-button':Object.freeze({reference_sha256:'d68091356fca93c590be566ae50ce221d35cdf2327b16f590ee0658797acc311',fixture_sha256:'bd06ccaa570a0ae1127369b645e63082737a6e6aa2ba68e0d565ac961077d222',scopes:['.mat-datepicker-content'],phases:['color','density','typography']}),
});
const proofInputs=Object.freeze({
  'compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs':'f094e84d2ce8a3f36aab239eb0d30940da976072a85ca0edcf29b8afb6dc9fb0',
  'projects/ngx-material-legacy/styles/button/_button-theme.scss':'6fa8ecaf9a0816a2a6b5602b33b23b256b201ad64cdb6cde67833a4f16fd7c96',
  'projects/ngx-material-legacy/styles/legacy-button/_button-theme.scss':'dbeccc67f7538f9e9b7529dd3226a45b0a8b3ad7079970fd553dcb25c067c3d0',
  'projects/ngx-material-legacy/styles/datepicker/_datepicker-legacy-compat.scss':'a2a43eb85c21c0f592aa7d770a89d0d68227d90b0616e5fff587825c8ec70acc',
  'node_modules/@angular/material/package.json':'5d33c35b56f9834d36a3be0ce4dc37892e689bceb1727de0cf223f10ab8f28af',
  'node_modules/@angular/material/_index.scss':'e3ad831c2e7679767b0c76d51cf37c455e8d14bf60c5920e53d95bcb762eb08b',
  'node_modules/@angular/material/button/_button-theme.scss':'06b0c0f5684502cb39a18fae857982ea6d61924eca9069ac20ad63c2b8b32b61',
  'node_modules/@angular/material/fesm2022/button.mjs':'589e6b07ed1c0a18928e3ddcf151af6275cf0ab91260a9e0598fe5959741d364',
});
export const ORDERED_LEGACY_BUTTON_PEER_FILES=Object.freeze(Object.fromEntries(
  Object.entries(proofInputs).filter(([path])=>path.startsWith('node_modules/@angular/material/'))));
function sourceProof(){
  for(const[path,digest]of Object.entries(proofInputs))if(sha(readFileSync(join(root,path)))!==digest)throw Error('ordered button proof input changed: '+path);
  const pkg=JSON.parse(readFileSync(join(root,'node_modules/@angular/material/package.json')));
  if(pkg.version!=='22.1.7')throw Error('wrong minimum peer');
  const index=readFileSync(join(root,'node_modules/@angular/material/_index.scss'),'utf8');
  const theme=readFileSync(join(root,'node_modules/@angular/material/button/_button-theme.scss'),'utf8');
  if(!index.includes('button-density, button-base, button-overrides;')||!theme.includes('@mixin overrides($tokens: ())'))throw Error('public override export absent');
  const owned=readFileSync(join(root,'projects/ngx-material-legacy/styles/datepicker/_datepicker-legacy-compat.scss'),'utf8');
  if(!owned.includes('.mat-datepicker-content {\n    @include button-theme.theme($theme);'))throw Error('owned datepicker composition changed');
  return new Set([...readFileSync(join(root,'node_modules/@angular/material/fesm2022/button.mjs'),'utf8').matchAll(/var\((--mat-button-[a-z0-9-]+)/g)].map(m=>m[1]));
}
function rules(css){
  const out=[];for(const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const leading=/^\s*/.exec(m[1])[0],header=m[1].slice(leading.length);
    if(!header.endsWith(' '))throw Error('noncanonical historical CSS');
    out.push({start:m.index+leading.length,end:m.index+m[0].length,header:header.slice(0,-1)});
  }return out;
}
function mapHeaders(css,from,to){
  let cursor=0,out='';for(const r of rules(css)){
    if(!r.header.split(/,\n|, /).every(s=>s===from||s.startsWith(from+' ')))throw Error('nested selector escaped');
    out+=css.slice(cursor,r.start)+r.header.replaceAll(from,to)+css.slice(r.start+r.header.length,r.end);cursor=r.end;
  }return out+css.slice(cursor);
}
/** Candidate CSS never enters this expected computation. */
export function orderedLegacyButtonExpectedCss(caseId){
  try{
    const plan=ORDERED_LEGACY_BUTTON_CASES[caseId];if(!plan)return null;
    const original=readFileSync(join(root,'reference/material-16.2.14/sass-css',caseId+'.css'),'utf8');
    const fixture=readFileSync(join(root,'fixtures/sass',caseId+'.scss'));
    if(sha(original)!==plan.reference_sha256||sha(fixture)!==plan.fixture_sha256)return null;
    const peerTokens=sourceProof(),rs=rules(original),edits=[];
    for(const scope of plan.scopes){
      const classes=['mat-mdc-button','mat-mdc-unelevated-button','mat-mdc-raised-button','mat-mdc-outlined-button'];
      const belongs=r=>r.header.split(/,\n|, /).every(s=>s===scope+' .mdc-button'||classes.some(c=>s.startsWith(scope+' .'+c)&&/^(?:[.:[\s]|$)/.test(s.slice((scope+' .'+c).length))));
      const groups=[];for(let i=0;i<rs.length;i++)if(belongs(rs[i])){const group=[rs[i]];while(i+1<rs.length&&belongs(rs[i+1]))group.push(rs[++i]);groups.push(group);}
      if(groups.length!==plan.phases.length)return null;
      for(let i=0;i<groups.length;i++){
        const g=groups[i],start=g[0].start,end=g.at(-1).end,before=original.slice(start,end);
        const rootBefore=mapHeaders(before,scope,'.sass-api-probe');
        const expectedRoot=ordinaryCheckboxButtonExpectedCss({caseId:'mixin-css/button-'+plan.phases[i],originalCss:rootBefore});
        if(typeof expectedRoot!=='string')return null;
        const after=mapHeaders(expectedRoot,'.sass-api-probe',scope);
        const inserted=[...after.matchAll(/(--mat-button-[a-z0-9-]+):/g)].map(m=>m[1]);
        if(!inserted.length||inserted.some(name=>!peerTokens.has(name)))return null;
        edits.push({start,end,value:after});
      }
    }
    let result=original;for(const e of edits.toSorted((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.value+result.slice(e.end);
    return result;
  }catch{return null;}
}
export function orderedLegacyButtonResultMatches(id,row,record,css,peerFiles){
  try{
    const plan=ORDERED_LEGACY_BUTTON_CASES[id],expected=orderedLegacyButtonExpectedCss(id);
    if(JSON.stringify(peerFiles)!==JSON.stringify(ORDERED_LEGACY_BUTTON_PEER_FILES))return false;
    return !!plan&&typeof expected==='string'&&row?.status==='blocked'&&row.baseline_sha256===plan.reference_sha256
      &&record?.id===id&&record.status==='compiled'&&record.module==='@ngx-compat/material-legacy'
      &&record.fixture_sha256===plan.fixture_sha256&&typeof css==='string'&&css===expected
      &&record.css_sha256===sha(css)&&row.candidate_sha256===sha(css);
  }catch{return false;}
}

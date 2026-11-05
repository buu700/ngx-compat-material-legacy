/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact test roster, independently reconstructed from authenticated old data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {spinnerSnackC04Source} from '../scripts/sass-spinner-snack-c04-source.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const HISTORICAL={path:'compatibility/rc/21x-c04-button-token-repairs-source-review.json',sha256:'cf2ec51ab6fd7cf98e718909940cb75ca6aaad2687bcc0544bd544dadc9ce38f',bytes:853841};
const INPUTS=[
 ['compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs','f094e84d2ce8a3f36aab239eb0d30940da976072a85ca0edcf29b8afb6dc9fb0',13313],
 ['compatibility/rc/ordinary-checkbox-button-legacy-composition-model-v1.mjs','2b136425698aa80d0ae368f74968fff94267d40b612b00b0bfba5577763a0692',5779],
 ['compatibility/rc/ordinary-checkbox-button-legacy-composition-cases-v1.json','8f4186d34848a0f298170c2124bbb727ff31a3995a1e8f041ab05476ffe1125d',12675],
 ['compatibility/rc/ordinary-checkbox-button-legacy-composition-known-before-v1.json','3e96bf8c73dc35d1cb9d132c74f69b6f91ee7d22b19b185cf3540d68d3cb9f43',1706],
 ['compatibility/rc/upstream-sass-inspection-current-scope.json.gz','b0a8f0d0d2ce8cb41943a0585ccdcc25fd6bb0d30c9339f80501ef86c65726f4',61597],
 ['compatibility/rc/21x-c04-button-tokenization-source-review.json','4fa19472ae965a5fbc097b51ab60f344acd7791909d97221a954a25f89e9463a',870169],
 [HISTORICAL.path,HISTORICAL.sha256,HISTORICAL.bytes],
];
export function currentButtonTokenRepairsTestSources({root=process.cwd(),read=path=>readFileSync(join(root,path))}={}){
 const extra=INPUTS.map(([path,sha256,bytes])=>{const raw=read(path);assert.equal(hash(raw),sha256);assert.equal(raw.length,bytes);return {path,sha256,bytes};});
 const historical=JSON.parse(read(HISTORICAL.path));assert.equal(historical.current_source_bindings.length,627);assert.equal(historical.shared_button_source_bindings,623);
 const owner=spinnerSnackC04Source({root,read}),refs=new Map();
 for(const ref of [...owner.bound,...historical.current_source_bindings.map(ref=>owner.qualify(ref)),...extra]){if(refs.has(ref.path))assert.deepEqual(refs.get(ref.path),ref);else refs.set(ref.path,ref);}
 const expected=[...refs.values()].sort((a,b)=>a.path.localeCompare(b.path));owner.assertCurrent();return {historical,expected};
}
export function assertCurrentButtonTokenRepairsTestSources({scope,root=process.cwd(),read=path=>readFileSync(join(root,path))}){
 const {historical,expected}=currentButtonTokenRepairsTestSources({root,read}),sort=refs=>structuredClone(refs).sort((a,b)=>a.path.localeCompare(b.path));
 assert.deepEqual(scope.historical_report,historical);assert.deepEqual(sort(scope.bound),expected);assert.deepEqual(scope.report.current_source_bindings,expected);
 assert.equal(scope.report.historical_source_bindings,627);assert.equal(scope.report.historical_shared_button_source_bindings,623);scope.assertCurrent();
 return {historical_source_bindings:627,historical_shared_button_source_bindings:623,expected_source_bindings:expected.length,current_source_bindings_match_exact_successor:true};
}

/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import '@angular/compiler';
import * as core from '@angular/core';
import {ViewportRuler} from '@angular/cdk/scrolling';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
import {deriveSurface} from '../scripts/api-surface.mjs';
import {loadRuntimeModule,observePublicNodeFactory} from '../scripts/api-di-observe.mjs';
import {selectViewportProof} from '../scripts/api-select-viewport-contract.mjs';
assert.equal(process.argv.length,7,'usage: node tests/api_select_viewport_provider_probe.mjs <package-root> <reference-material-root> <tarball> <historical-cdk-archive> <historical-cdk-package>');
const [packageRoot,referenceRoot,tarball,archive,historicalRoot]=process.argv.slice(2).map(p=>resolve(p));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
assert.equal(hash(archive),'a499ba0fee46784441b92587e43b17ec72d9bd383f78ea14954eaa62c781bad7');
assert.equal(hash(join(historicalRoot,'package.json')),'b7794ad784818253dec6b2aeea7d0b3b5ac7fa6ac0f8d2e440bf9e581fc2bf15');
assert.equal(hash(join(historicalRoot,'fesm2022/scrolling.mjs')),'7656a68cba9c315d54e834f26a36e4f465e1b76b65418ad3ee9dffc3ac6431d6');
// The untouched historical class is used only as a provider identity. No older
// peer is installed into the consumer or made a published dependency.
const {ViewportRuler:HistoricalViewport}=await import(pathToFileURL(join(historicalRoot,'fesm2022/scrolling.mjs')));
const surface=deriveSurface(referenceRoot),symbol=surface.symbols.find(value=>value.symbol_id==='legacy-select/primary/MatLegacySelect');
const context={packageRoot,tarball,referenceRoot},proof=selectViewportProof(symbol,surface.symbols.find(value=>value.symbol_id==='legacy-progress-spinner/primary/MatLegacyProgressSpinner'),surface.symbols.find(value=>value.symbol_id==='legacy-select/primary/MAT_LEGACY_SELECT_SCROLL_STRATEGY'),context);assert.ok(proof);
const loaded=await loadRuntimeModule(packageRoot,'legacy-select','primary'),owned=await loadRuntimeModule(packageRoot,'legacy-core','primary'),Type=loaded.MatLegacySelect,base=Object.getPrototypeOf(Type);
assert.notEqual(HistoricalViewport,ViewportRuler);assert.notEqual(HistoricalViewport,owned._LegacyViewport);assert.notEqual(ViewportRuler,owned._LegacyViewport);
const historical={kind:'historical16'},minimum={kind:'minimum22'},candidate={kind:'owned'};
const providers=[{provide:HistoricalViewport,useValue:historical},{provide:ViewportRuler,useValue:minimum}];
const run=providers=>observePublicNodeFactory(Type,core,packageRoot,symbol,surface.symbols,s=>import(s),{providers,selectProof:proof,inputArtifactContext:context});
function input(result){assert.equal(result.outcome,'returned',result.error);assert.equal(result.constructorCapture.constructor_calls,1);assert.equal(result.constructorCapture.inputs.length,15);assert.equal(result.selectViewportContext.stored_input_matches,true);return result.constructorCapture.inputs[0];}
const first=input(await run(providers));assert.ok(first instanceof owned._LegacyViewport);assert.notEqual(first,historical);assert.notEqual(first,minimum);
assert.equal(input(await run([...providers,{provide:owned._LegacyViewport,useValue:candidate}])),candidate);
const original=base.ctorParameters;
try{
 base.ctorParameters=()=>original().map((value,index)=>index===0?{...value,type:ViewportRuler}:value);
 const rejected=await run(providers);assert.equal(rejected.outcome,'threw');assert.match(rejected.error,/actual constructor provider value differs at parameter 0|select viewport actual node\/constructor identity differs/);
}finally{base.ctorParameters=original;}
assert.ok(input(await run(providers)) instanceof owned._LegacyViewport);
console.log(JSON.stringify({result:'pass',actual_node_factories:4,constructor_arity:15,viewport_index:0,historical16_provider_selected:false,minimum22_provider_selected:false,owned_provider_selected:true,wrong_reflection_rejected:true,recovery:true,scope:'Actual select node provider/input correlation under synthetic server renderer; native browser and full peer range separate'}));

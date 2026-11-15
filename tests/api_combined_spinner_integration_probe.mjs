/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import {deriveSurface} from '../scripts/api-surface.mjs';
import {observeRuntimeDi} from '../scripts/api-di-observe.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';
import {combinedSpinnerViewportObservationProblems} from '../scripts/api-spinner-combined-row.mjs';
import {captureCombinedSpinnerViewport} from '../scripts/api-spinner-combined-viewport-successor.mjs';

const [packageRoot,tarball,referenceRoot,historicalCdk16Root,historicalCdk16Tarball,output]=process.argv.slice(2).map(x=>resolve(x));
assert.ok(packageRoot&&tarball&&referenceRoot&&historicalCdk16Root&&historicalCdk16Tarball&&output);
const require=createRequire(import.meta.url),load=spec=>import(pathToFileURL(require.resolve(spec)).href);
await load('@angular/compiler');
const context={packageRoot,tarball,referenceRoot,historicalCdk16Root,historicalCdk16Tarball};
const symbols=deriveSurface(referenceRoot).symbols.filter(s=>['legacy-progress-spinner/primary/MatLegacyProgressSpinner','legacy-progress-spinner/primary/MatLegacyProgressSpinnerModule'].includes(s.symbol_id));
assert.equal(symbols.length,2);
const rows=await observeRuntimeDi(packageRoot,symbols,[],load,context);
const row=rows.find(r=>r.symbol.symbol_id==='legacy-progress-spinner/primary/MatLegacyProgressSpinner');
assert.ok(row);assert.deepEqual(row.problems,[]);
const settled=settleDi(row,[],context);assert.equal(settled.result,'pass');assert.deepEqual(settled.problems,[]);
const receipt=row.factory_combined_spinner_viewport_context;
assert.equal(receipt.artifact_sha256,'04092350fea6096cac866268fc295eb390b2670c67366a3195a75c14b319be88');
assert.equal(receipt.constructor_calls,1);assert.equal(receipt.node_element_matched,true);
assert.equal(receipt.owned_input_matches_node_provider,true);
assert.equal(receipt.historical_provider_selected,false);assert.equal(receipt.minimum_provider_selected,false);
assert.equal(receipt.viewport_subimage_unchanged,true);
const badReceipt={...row,factory_combined_spinner_viewport_context:{...receipt,historical_provider_selected:true}};
assert.ok(combinedSpinnerViewportObservationProblems(badReceipt,context).length);
const badRequest={...row,runtime_requests:row.runtime_requests.map((r,i)=>i===6?{...r,identity_matched:true}:r)};
assert.ok(combinedSpinnerViewportObservationProblems(badRequest,context).length);
assert.ok(combinedSpinnerViewportObservationProblems(row,{...context,tarball:historicalCdk16Tarball}).length);
class OwnedViewport{}
assert.throws(()=>captureCombinedSpinnerViewport(receipt,{capture:{constructor_calls:1,inputs:new Array(9)},node:{injector:null},owned:{_LegacyViewport:OwnedViewport},historical:OwnedViewport,minimum:class MinimumViewport{}}));
const badHistorical=await observeRuntimeDi(packageRoot,symbols,[],load,{...context,historicalCdk16Tarball:tarball});
const badHistoricalRow=badHistorical.find(r=>r.symbol.symbol_id===row.symbol.symbol_id);
assert.equal(settleDi(badHistoricalRow,[],context).result,'fail');
const result={role:'combined-spinner-viewport-integration',artifact_sha256:receipt.artifact_sha256,
  spinner_settlement:settled.result,constructor_calls:receipt.constructor_calls,actual_node:receipt.node_element_matched,
  owned_provider_input:receipt.owned_input_matches_node_provider,historical16_provider_selected:receipt.historical_provider_selected,
  minimum22_provider_selected:receipt.minimum_provider_selected,unchanged_viewport_runtime_subimage_sha256:receipt.viewport_runtime_subimage_sha256,
  mutations_rejected:['receipt provider claim','request token identity','wrong tarball','historical/owned token conflation','wrong historical CDK archive'],
  scope:'Exact packed 04092350 image and authenticated historical CDK 16 image under synthetic server renderer. Packed source map and prior source agree; no live source-worktree qualification, native rendering, or version-range claim.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));

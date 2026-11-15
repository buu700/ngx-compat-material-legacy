/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {deriveSurface} from '../scripts/api-surface.mjs';
import {observeRuntimeDi} from '../scripts/api-di-observe.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';
import {inputObservationProblems} from '../scripts/api-input-context.mjs';
import {menuTriggerObservationProblems} from '../scripts/api-menu-trigger-token.mjs';
const [packageRoot,tarball,referenceRoot]=process.argv.slice(2).map(x=>resolve(x));
const context={packageRoot,tarball,referenceRoot}, req=createRequire(import.meta.url),load=s=>import(pathToFileURL(req.resolve(s)).href);
await load('@angular/compiler');
const ids=['legacy-input/primary/MatLegacyInput','legacy-menu/primary/MatLegacyMenuTrigger'];
const symbols=deriveSurface(referenceRoot).symbols.filter(s=>['legacy-input','legacy-menu'].includes(s.family)).map(s=>ids.includes(s.symbol_id)?s:{...s,di_id:null});
const rows=await observeRuntimeDi(packageRoot,symbols,[],load,context);
for(const id of ids){const row=rows.find(r=>r.symbol.symbol_id===id);assert.ok(row);assert.equal(settleDi(row,[],context).result,'pass',JSON.stringify(row.problems));}
const input=rows.find(r=>r.symbol.symbol_id===ids[0]),menu=rows.find(r=>r.symbol.symbol_id===ids[1]);
assert.equal(input.factory_input_context.owned_element_ref.artifact_sha256,'04092350fea6096cac866268fc295eb390b2670c67366a3195a75c14b319be88');
assert.equal(menu.runtime_requests[5].owned_menu_item_replacement.owned_identity_matched,true);
const badInput=structuredClone(input);badInput.factory_input_context.owned_element_ref.native_node_identical=false;assert.ok(inputObservationProblems(badInput,context).length);assert.equal(settleDi(badInput,[],context).result,'fail');
const badMenu=structuredClone(menu);badMenu.runtime_requests[5].identity_matched=true;assert.ok(menuTriggerObservationProblems(badMenu).length);assert.equal(settleDi(badMenu,[],context).result,'fail');
const badContext={...context,tarball:referenceRoot+'/input/input.ts'};
const badRows=await observeRuntimeDi(packageRoot,symbols,[],load,badContext);
for(const row of badRows.filter(r=>ids.includes(r.symbol.symbol_id)))assert.equal(settleDi(row,[],badContext).result,'fail');
console.log(JSON.stringify({rows:ids,settlement:'pass',mutations_rejected:['input native node','menu historic token identity','wrong archive'],artifact_sha256:input.factory_input_context.owned_element_ref.artifact_sha256}));

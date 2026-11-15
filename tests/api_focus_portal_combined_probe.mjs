/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {deriveSurface} from '../scripts/api-surface.mjs';
import {observeRuntimeDi} from '../scripts/api-di-observe.mjs';
import {settleDi} from '../scripts/api-completeness.mjs';
import {ownedDialogFocusObservationProblems} from '../scripts/api-owned-dialog-focus-context.mjs';
import {tabPortalObservationProblems} from '../scripts/api-tab-portal-context.mjs';
const [packageRoot,tarball,referenceRoot]=process.argv.slice(2).map(x=>resolve(x)),context={packageRoot,tarball};
const require=createRequire(import.meta.url),load=s=>import(pathToFileURL(require.resolve(s)).href);await load('@angular/compiler');
const ids=['legacy-dialog/primary/MatLegacyDialogContainer','legacy-dialog/primary/_MatLegacyDialogContainerBase','legacy-tabs/primary/MatLegacyTabBodyPortal'];
const symbols=deriveSurface(referenceRoot).symbols.filter(x=>ids.includes(x.symbol_id));assert.equal(symbols.length,3);
const rows=await observeRuntimeDi(packageRoot,symbols,[],load,context);assert.equal(rows.length,3);
for(const row of rows){assert.equal(row.factory_outcome,'returned',row.factory_error);assert.deepEqual(row.problems,[]);const portal=row.symbol.symbol_id.includes('TabBodyPortal');const check=portal?tabPortalObservationProblems:ownedDialogFocusObservationProblems;const old=check;assert.ok(old(row).length);assert.deepEqual(check(row,context),[]);
 if(!portal){const settled=settleDi(row,[],context,r=>ownedDialogFocusObservationProblems(r,context));assert.equal(settled.result,'pass',JSON.stringify(settled.problems));}
 assert.ok(check(row,{...context,tarball:referenceRoot}).length);assert.ok(check(row,{...context,packageRoot:referenceRoot}).length);assert.ok(check(row,{...context,expected_hash:portal?'d272c01799c1cb542e95f819b90b71fb68e89ee4b713b136c59629e8de8f8ed4':'02cbd08f4d1e656cbbfb08e80fa6dd9606222ace6e600b0f7b777642f17b03ac',tarball:referenceRoot}).length);
 const forged=portal?{...row,factory_tab_portal_context:{...row.factory_tab_portal_context,packed_helper:{...row.factory_tab_portal_context.packed_helper,sha256:'0'.repeat(64)}}}:{...row,factory_owned_dialog_focus_context:{...row.factory_owned_dialog_focus_context,source:{...row.factory_owned_dialog_focus_context.source,sha256:'0'.repeat(64)}}};assert.ok(check(forged,context).length);
 const before=JSON.stringify(row);const key=portal?'factory_tab_portal_context':'factory_owned_dialog_focus_context', receipt=row[key];
 for(const mutated of portal?[{...receipt,attached_events:3},{...receipt,borrowed_parent_view_alive:false},{...receipt,constructor_calls:2}]:[{...receipt,detector_scope_verified:false},{...receipt,manual_constructor_verified:false},{...receipt,classified_requests:5}])assert.ok(check({...row,[key]:mutated},context).length);
 const historical=portal?{...row,[key]:{...receipt,packed_helper:{...receipt.packed_helper,sha256:'ab6891ffa20dfd036d6f5ff7d81925df754bed95fc0ca3953a04fec0e3c098ac'}}}:{...row,[key]:{...receipt,source:{...receipt.source,sha256:'35b0726ed573b6e785dfc45274279d5b81d7bdd4e1164f90154e1c75692bea5f'}}};assert.deepEqual(check(historical,{}),old(historical));assert.equal(JSON.stringify(row),before);
}
console.log(JSON.stringify({result:'pass',rows:ids,scope:'actual packed observer; focus full settlement; portal successor settlement guard; negative and predecessor checks'}));

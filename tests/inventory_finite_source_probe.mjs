/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{join,resolve}from'node:path';
const root=resolve(process.argv[2]);const {prepareInventoryReferenceSourceMetadata:make}=await import(root+'/scripts/inventory-reference-proposal.mjs');let bad=null;const read=p=>p===bad?Buffer.from('corrupt'):readFileSync(join(root,p));const result=make({root,read});assert.equal(result.verifier.source_bindings_changed,13);for(const path of ['scripts/historical_inventory_rebinding.py','scripts/select_dialog_finite_source_successor.py','compatibility/rc/parent-inventory-python-product-successor-v1.json','projects/ngx-material-legacy/legacy-select/select.spec.ts','projects/ngx-material-legacy/legacy-menu/menu.spec.ts','projects/ngx-material-legacy/legacy-snack-bar/snack-bar.spec.ts']){bad=path;assert.throws(()=>result.assertCurrent(),undefined,'late '+path);assert.throws(()=>make({root,read}),undefined,'cold '+path);}bad=null;result.assertCurrent();console.log('PASS inventory old cohort plus cold/late controls');

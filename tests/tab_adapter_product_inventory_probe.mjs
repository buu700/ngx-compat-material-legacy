/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Independent source preservation and raw-current inventory/history rejection controls. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectTabAdapterInventory,computeTabAdapterInventoryWrites} from '../scripts/tab-adapter-product-inventory-review.mjs';
import {qualifyIndependentTabProductDelta,readCurrentChipFocusInputs,assertQualifiedProductSourcePopulation,TAB_ADAPTER_INVENTORY_INPUTS,CURRENT_CHIP_FOCUS_INPUTS} from '../scripts/tab-adapter-product-inventory-context.mjs';
import {tabAdapterSourceContext,tabAdapterPreviousSourceReader,inspectTabAdapterHistory,TAB_ADAPTER_HISTORY_INPUTS} from '../scripts/tab-adapter-product-inventory-history.mjs';
import {inspectChipFocusRepair} from '../scripts/chip-focus-contract.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=p=>readFileSync(join(root,p)),hash=b=>createHash('sha256').update(b).digest('hex'),ts=createRequire(import.meta.url)('typescript');
const built=computeTabAdapterInventoryWrites({root}),summary=inspectTabAdapterInventory({root,validateAll:false}),history=inspectTabAdapterHistory({root}),inputs=JSON.parse(read(TAB_ADAPTER_HISTORY_INPUTS)),parent=tabAdapterPreviousSourceReader({root}),controls=[];
assert.equal(summary.source_scoped_SHA_reviews_requalified,75);assert.equal(summary.authored_evidence_bindings_requalified,1);assert.equal(summary.authored_source_insufficient,0);assert.equal(summary.new_semantic_closures,0);
const source=ts.parseJsonText('before.json',built.prior.ledger.text),currentText=read(built.prior.ledger.path).toString(),current=ts.parseJsonText('after.json',currentText),items=s=>s.statements[0].expression.properties.find(p=>p.name.text==='entries').initializer.elements;
let restored=currentText,unselected=0;const beforeItems=items(source),afterItems=items(current);assert.equal(beforeItems.length,1697);assert.equal(afterItems.length,1697);
for(let i=afterItems.length-1;i>=0;i--){const a=beforeItems[i],b=afterItems[i],before=JSON.parse(a.getText(source)),after=JSON.parse(b.getText(current));assert.equal(before.sha,after.sha);for(const field of ['final_disposition','reason','files','review_depth','affected_branches','diff_sha256'])assert.deepEqual(after[field],before[field],'original judgment changed');if(built.entries.has(before.sha))restored=restored.slice(0,b.getStart(current))+a.getText(source)+restored.slice(b.end);else{assert.equal(hash(a.getText(source)),hash(b.getText(current)));unselected++;}}
assert.equal(unselected,1622);assert.equal(hash(restored),built.prior.ledger.sha256,'unselected rows/envelope changed');assert.equal(hash(parent(built.prior.ledger.path)),built.prior.ledger.sha256);
for(const member of built.prior.reports)assert.equal(hash(read(member.path)),member.sha256,'original report changed');for(const m of built.prior.product_delta_sources)assert.equal(hash(parent(m.path)),hash(read(m.path)),'product source was projected');
const currentContext=tabAdapterSourceContext({root});for(const path of [built.prior.ledger.path,'compatibility/f10/authored-dependency-dispositions.json',...Object.keys(JSON.parse(read(inputs.edits.path)).substitutions)])assert.equal(hash(currentContext.raw(path)),hash(read(path)),'prior bookkeeping leaked into current fingerprint '+path);
const qualified=qualifyIndependentTabProductDelta({root}),master=JSON.parse(read(TAB_ADAPTER_INVENTORY_INPUTS));
for(const paths of [built.paths.slice(1),[...built.paths,built.paths[0]],[...built.paths,'projects/ngx-material-legacy/unreviewed.ts'].sort()]){assert.throws(()=>assertQualifiedProductSourcePopulation(paths,{root,read}),error=>error?.code==='ERR_ASSERTION');controls.push('unapproved-source-population');}
const productPaths=[TAB_ADAPTER_INVENTORY_INPUTS,CURRENT_CHIP_FOCUS_INPUTS,...qualified.delta.map(m=>m.path),qualified.qualification.path,...master.current_code_members.map(m=>m.path)];
for(const path of productPaths){const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>readCurrentChipFocusInputs({root,read:p=>p===path?bytes:read(p)}),error=>error?.code==='ERR_ASSERTION');controls.push('current-product:'+path);}
for(const path of ['projects/ngx-material-legacy/legacy-slider/slider.ts','projects/ngx-material-legacy/legacy-chips/chips.scss']){const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspectChipFocusRepair({root,readMember:p=>p===path?bytes:read(p)}),error=>error?.code==='ERR_ASSERTION');controls.push('unrelated-product-or-style:'+path);}
const paths=[...new Set([...inputs.writes,...inputs.current_members].map(m=>m.path).concat(Object.keys(JSON.parse(read(inputs.edits.path)).substitutions),TAB_ADAPTER_HISTORY_INPUTS,inputs.prior.path,inputs.authored_prior.path,inputs.history_prior.path,inputs.edits.path))];
for(const path of paths){const bytes=Buffer.concat([read(path),Buffer.from('\n')]);assert.throws(()=>inspectTabAdapterHistory({root,read:p=>p===path?bytes:read(p)}),error=>error?.code==='ERR_ASSERTION');controls.push('history:'+path);}
let changed=false;const late=p=>changed&&p===qualified.delta[1].path?Buffer.concat([read(p),Buffer.from('\n')]):read(p);const earlier=tabAdapterPreviousSourceReader({root,read:late});changed=true;assert.throws(()=>tabAdapterPreviousSourceReader({root,read:earlier}),error=>error?.code==='ERR_ASSERTION');controls.push('late-source-mutation');
const report={...summary,history,unselected_SHA_row_bytes_preserved:unselected,entire_unselected_ledger_envelope_preserved:true,source_population_faults:3,qualified_product_faults:productPaths.length,unrelated_product_or_style_faults:2,history_faults:paths.length,late_mutation_rejected:true,rejection_controls:controls.length,controls,raw_current_product_not_projected:true};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...summary,raw_scope_results:undefined,rejection_controls:controls.length,history_faults:paths.length,unselected_SHA_row_bytes_preserved:unselected,late_mutation_rejected:true}));

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Exact physical source and historical role qualification, with negative controls. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scanCurrentAuthoredUses} from '../scripts/authored-current-use-inventory.mjs';
import {qualifyFormFieldRetiredUse} from '../scripts/form-field-retired-use.mjs';
import {qualifyCurrentMenuRetirementReceipt} from '../scripts/current-menu-retirement-receipt.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),readMember=p=>readFileSync(join(root,p));
const current=scanCurrentAuthoredUses({root}),args={root,current,readMember},result=qualifyFormFieldRetiredUse(args);
assert.equal(result.original.symbol,'AfterViewChecked');assert.deepEqual(result.retired.occurrences,[]);
const returned=structuredClone(current);returned.symbol_uses.push(result.retired);assert.throws(()=>qualifyFormFieldRetiredUse({...args,current:returned}));
const wrongGraph=structuredClone(current);wrongGraph.source_files.find(r=>r.path.endsWith('/legacy-form-field/form-field.ts')).sha256='0'.repeat(64);assert.throws(()=>qualifyFormFieldRetiredUse({...args,current:wrongGraph}));
assert.throws(()=>qualifyFormFieldRetiredUse({...args,readMember:p=>p===result.qualification.path?Buffer.from('tampered'):readMember(p)}));
let entered=false;const reentrant=p=>{if(!entered){entered=true;try{qualifyFormFieldRetiredUse(args);}catch{}}return readMember(p);};assert.throws(()=>qualifyFormFieldRetiredUse({...args,readMember:reentrant}));
const menu=qualifyCurrentMenuRetirementReceipt(args);assert.equal(menu.historical_input_members,418);
for(const bad of ['compatibility/rc/menu-panel-content-boundary-main.json','projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts'])assert.throws(()=>qualifyCurrentMenuRetirementReceipt({...args,readMember:p=>p===bad?Buffer.from('tamper'):readMember(p)}));
const wrongMenu=structuredClone(current);wrongMenu.symbol_uses.push({file:'legacy-menu/internal/menu-panel.ts',module:'@angular/material/menu',symbol:'MatMenuContent'});assert.throws(()=>qualifyCurrentMenuRetirementReceipt({...args,current:wrongMenu}));
let nested=false;assert.throws(()=>qualifyCurrentMenuRetirementReceipt({...args,readMember:p=>{if(!nested){nested=true;try{qualifyCurrentMenuRetirementReceipt(args);}catch{}}return readMember(p);}}));
const lateField=structuredClone(current);let fieldReads=0;assert.throws(()=>qualifyFormFieldRetiredUse({root,current:lateField,readMember:p=>{const b=readMember(p);if(p===result.qualification.path&&++fieldReads===2)lateField.symbol_uses.push(result.retired);return b;}}));
const lateMenu=structuredClone(current);let menuReads=0;assert.throws(()=>qualifyCurrentMenuRetirementReceipt({root,current:lateMenu,readMember:p=>{const b=readMember(p);if(p==='projects/ngx-material-legacy/legacy-menu/internal/menu-panel.ts'&&++menuReads===2)lateMenu.symbol_uses.push({file:'legacy-menu/internal/menu-panel.ts',module:'@angular/material/menu',symbol:'MatMenuContent'});return b;}}));
console.log(JSON.stringify({source_files:current.source_files.length,uses:current.symbol_uses.length,source_population_sha256:current.source_population_sha256,retired:result.retired,negative_controls:10,menu_historical_input_members:418}));

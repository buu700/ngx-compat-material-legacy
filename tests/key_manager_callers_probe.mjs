/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {keyManagerPublicSubjects} from '../scripts/key-manager-public-subjects.mjs';
import {inspectKeyManagerCallers,inspectPublicKeyManagerDeclarations,verifyKeyManagerPublicUses,verifyTaggedKeyManagerConstruction,reviewKeyManagerCallers} from '../scripts/key-manager-caller-review.mjs';
const report=await reviewKeyManagerCallers(),read=p=>readFileSync(p,'utf8'),mutations=[];
const chip='projects/ngx-material-legacy/legacy-chips/chip-list.ts',select='projects/ngx-material-legacy/legacy-select/internal/select-base.ts',trigger='projects/ngx-material-legacy/legacy-autocomplete/internal/autocomplete-trigger-base.ts';
for(const [id,path,change]of [
 ['runtime-constructor-value',chip,s=>s+'\nconsole.log(FocusKeyManager);\n'],
 ['duplicate-constructor-import',chip,s=>s+"\nimport {FocusKeyManager as Duplicate} from '@angular/cdk/a11y';\n"],
 ['private-constructor-import',chip,s=>s.replace("'@angular/cdk/a11y'","'@angular/cdk/a11y/_focus-key-manager'")],
 ['type-only-construction',chip,s=>s.replace('import {FocusKeyManager}','import type {FocusKeyManager}')],
 ['non-querylist-construction',chip,s=>s.replace('new FocusKeyManager<MatLegacyChip>(this.chips)','new FocusKeyManager<MatLegacyChip>([])')],
 ['extra-constructor-argument',chip,s=>s.replace('new FocusKeyManager<MatLegacyChip>(this.chips)','new FocusKeyManager<MatLegacyChip>(this.chips, null)')],
 ['mutable-manager-alias',select,s=>s.replace('const manager = this._keyManager','let manager = this._keyManager')],
 ['computed-manager-access',select,s=>s.replace('manager.isTyping()',"manager['isTyping']()")],
 ['manager-value-escape',chip,s=>s.replace('this._keyManager.tabOut.subscribe','consume(this._keyManager);\nthis._keyManager.tabOut.subscribe')],
 ['external-unknown-manager-route',trigger,s=>s.replace('this.autocomplete._keyManager.activeItem',"this.autocomplete['_keyManager'].activeItem")],
 ['option-derived-instance-drift','projects/ngx-material-legacy/legacy-core/option/option.ts',s=>s.replace('extends _MatOptionBase<T> {','extends _MatOptionBase<T> {newInstanceField = true;')],
]){
 const before=read(path),after=change(before);assert.notEqual(before,after);assert.throws(()=>inspectKeyManagerCallers({readSource:p=>p===path?after:read(p)}),undefined,id);mutations.push(id);
}
for(const [id,change]of [
 ['lost-historical-wrap',r=>{r.constructor_expression=r.constructor_expression.replace('.withWrap()','.withWrap(false)');}],
 ['lost-historical-disabled-focus',r=>{r.constructor_expression=r.constructor_expression.replace('.skipPredicate(() => false)','.skipPredicate(() => true)');}],
]){
 const cases=structuredClone(report.cases),row=cases.find(r=>id.includes('disabled')?r.file==='legacy-list/selection-list.ts':r.file==='legacy-chips/chip-list.ts'),before=row.constructor_expression;change(row);assert.notEqual(row.constructor_expression,before);assert.throws(()=>verifyTaggedKeyManagerConstruction(cases),undefined,id);mutations.push(id);
}
const subjects=await keyManagerPublicSubjects();try{
 const contracts=inspectPublicKeyManagerDeclarations(subjects.models.find(m=>m.subject.line==='main'));
 for(const [id,change]of [['private-peer-state',r=>{r.public_api_uses.push({name:'_activeItemIndex'});}],['non-fluent-chain',r=>{r.public_api_uses.push({name:'withWrap',receiver_method:'setActiveItem'});}]]){
  const cases=structuredClone(report.cases);change(cases[0]);assert.throws(()=>verifyKeyManagerPublicUses(cases,contracts),undefined,id);mutations.push(id);
 }
}finally{subjects.dispose();}
console.log(JSON.stringify({...report,mutation_rejections:mutations},null,2));

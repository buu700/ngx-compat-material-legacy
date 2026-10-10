/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
await import('@angular/compiler');
const {SelectionModel}=await import('@angular/cdk/collections');
const [line,mutated]=process.argv.slice(2),cases=[];
const check=(id,fn)=>{fn();cases.push(id);};
function comparable(){const model=new SelectionModel(false,[],false,(a,b)=>a.id===b.id);const first={id:1},same={id:1};
 model.setSelection(first);assert.deepEqual(model.selected,[first]);model.setSelection(same);return {model,first,same};}
const observed=comparable();
if(line==='original')assert.deepEqual(observed.model.selected,[],'untouched16 bug must reproduce');
else assert.deepEqual(observed.model.selected,[observed.first],'same comparator key retains original selected identity');
cases.push(line==='original'?'untouched-comparator-bug-reproduced':'peer-comparator-fix-retains-concrete-identity');
check('owned-identity-only-single-and-multiple',()=>{for(const multiple of [false,true]){
 const a={},b={},model=new SelectionModel(multiple),events=[];model.changed.subscribe(e=>events.push([e.added.length,e.removed.length]));
 model.select(a);assert.equal(model.isSelected(a),true);assert.equal(model.isSelected(b),false);
 assert.deepEqual(model.selected,[a]);assert.equal(model.select(a),false);model.deselect(a);assert.deepEqual(model.selected,[]);
 model.setSelection(a);model.setSelection(a);assert.deepEqual(model.selected,[a]);model.toggle(a);assert.deepEqual(model.selected,[]);
 assert.ok(events.length>=4);assert.ok(events.every(e=>e[0]+e[1]>0));
}});
check('owned-chip-model-suppressed-events',()=>{const a={},b={},model=new SelectionModel(true,undefined,false);let changes=0;
 model.changed.subscribe(()=>changes++);model.select(a,b);assert.deepEqual(model.selected,[a,b]);model.deselect(a);model.clear();assert.equal(changes,0);});
check('selection-list-replacement-retains-selected-identities',()=>{const a={},b={},old=new SelectionModel(true,[a,b]);const replacement=new SelectionModel(true,old.selected);
 assert.deepEqual(replacement.selected,[a,b]);assert.equal(replacement.selected[0],a);assert.equal(replacement.selected[1],b);});
check('single-mode-rejects-multiple-values',()=>{const model=new SelectionModel(false);assert.throws(()=>model.select({},{}));});
if(line!=='original')check('comparator-changed-key-and-multiple-reselection',()=>{
 const first={id:1},second={id:2},model=new SelectionModel(true,[first,second],true,(a,b)=>a.id===b.id),events=[];
 model.changed.subscribe(e=>events.push(e));model.setSelection({id:1},{id:2});assert.deepEqual(model.selected,[first,second]);assert.equal(events.length,0);
 model.setSelection({id:2});assert.deepEqual(model.selected,[second]);assert.deepEqual(events[0].removed,[first]);
});
console.log(JSON.stringify({line,mutated:mutated==='true',cases,original_bug:line==='original',genuine_entire_public_collections_executed:true,native_legacy_caller_executed:false}));

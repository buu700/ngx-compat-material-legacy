/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
await import('@angular/compiler');
const {enableProdMode}=await import('@angular/core');
const {SelectionModel}=await import('@angular/cdk/collections');
const [line,mutated,mode='development']=process.argv.slice(2),cases=[];
assert.ok(['development','production'].includes(mode));
if(mode==='production')enableProdMode();
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
check('single-mode-multiple-values-observe-dev-guard',()=>{const a={},b={},model=new SelectionModel(false);
 if(mode==='development')assert.throws(()=>model.select(a,b));
 else {model.select(a,b);assert.deepEqual(model.selected,[b]);}
});
check('exact-single-and-multiple-events-noop-and-source-identity',()=>{for(const multiple of [false,true]){
 const a={},b={},model=new SelectionModel(multiple),events=[];
 model.changed.subscribe(e=>events.push(e));
 model.select(a);model.select(a);model.deselect(b);
 assert.equal(events.length,1);assert.equal(events[0].source,model);assert.deepEqual(events[0].added,[a]);assert.deepEqual(events[0].removed,[]);
 model.select(b);assert.equal(events.length,2);assert.deepEqual(events[1].added,[b]);assert.deepEqual(events[1].removed,multiple?[]:[a]);
 model.clear();model.clear();assert.equal(events.length,3);assert.deepEqual(events[2].added,[]);assert.deepEqual(events[2].removed,multiple?[a,b]:[b]);
 assert.deepEqual(events[0].added,[a],'later changes must not mutate retained event arrays');
 assert.ok(events.every(e=>e.source===model));assert.equal(model.isEmpty(),true);assert.equal(model.hasValue(),false);
}});
check('sort-orders-identity-cache-without-membership-or-event-change',()=>{
 const a={rank:2},b={rank:1},model=new SelectionModel(true,[a,b]),events=[];
 model.changed.subscribe(e=>events.push(e));const cached=model.selected;
 model.sort((x,y)=>x.rank-y.rank);assert.equal(model.selected,cached);assert.deepEqual(model.selected,[b,a]);
 assert.equal(model.isSelected(a),true);assert.equal(model.isSelected(b),true);assert.equal(events.length,0);
 model.deselect(a);assert.notEqual(model.selected,cached);assert.deepEqual(model.selected,[b]);assert.deepEqual(events[0].removed,[a]);
 const single=new SelectionModel(false,[a,b]);single.sort(()=>-1);assert.deepEqual(single.selected,[a]);
});
check('deferred-clear-merges-next-event-and-preserves-object-identity',()=>{
 const a={},b={},model=new SelectionModel(true,[a]),events=[];model.changed.subscribe(e=>events.push(e));
 model.clear(false);assert.equal(events.length,0);assert.equal(model.isEmpty(),true);model.select(b);
 assert.equal(events.length,1);assert.equal(events[0].source,model);assert.deepEqual(events[0].added,[b]);assert.deepEqual(events[0].removed,[a]);
 assert.deepEqual(model.selected,[b]);assert.equal(model.select(b),false);assert.equal(events.length,1);
});
check('unsubscribed-change-observer-stops-receiving-updates',()=>{
 const model=new SelectionModel(true),seen=[];const subscription=model.changed.subscribe(e=>seen.push(e));
 model.select({});subscription.unsubscribe();model.clear();model.select({});assert.equal(seen.length,1);
});
check('initial-values-multiplicity-and-equal-valued-distinct-identities',()=>{
 const a={value:1},b={value:1},model=new SelectionModel(true,[a,b]),seen=[];model.changed.subscribe(e=>seen.push(e));
 assert.equal(model.isMultipleSelection(),true);assert.deepEqual(model.selected,[a,b]);assert.equal(model.isSelected({value:1}),false);
 model.select(a,b);assert.equal(seen.length,0);model.deselect(a);assert.deepEqual(model.selected,[b]);
 const single=new SelectionModel(false,[a,b]);assert.equal(single.isMultipleSelection(),false);assert.deepEqual(single.selected,[a]);
});
if(line!=='original')check('comparator-changed-key-and-multiple-reselection',()=>{
 const first={id:1},second={id:2},model=new SelectionModel(true,[first,second],true,(a,b)=>a.id===b.id),events=[];
 model.changed.subscribe(e=>events.push(e));model.setSelection({id:1},{id:2});assert.deepEqual(model.selected,[first,second]);assert.equal(events.length,0);
 model.setSelection({id:2});assert.deepEqual(model.selected,[second]);assert.deepEqual(events[0].removed,[first]);
});
console.log(JSON.stringify({line,mode,mutated:mutated==='true',cases,original_bug:line==='original',genuine_entire_public_collections_executed:true,native_legacy_caller_executed:false}));

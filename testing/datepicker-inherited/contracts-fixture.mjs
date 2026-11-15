/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Experimental independent raw-row checks only. This is NOT admission: a
// coordinator-owned producer must independently authenticate every input,
// actual child status, fixture faults, source graph, AOT and both mode results.
import {isDeepStrictEqual as eq} from 'node:util';
const CLASSES='0d36e863ba6752596b6cee5810b5d953d536a9a9';
const FILTERS='2d5942cb0fe86f9c3d26b1925b1d4390cfc6613b';
const EARLY='5db8dca18b5967c203a5898dfa713ff03d9e7134';
const FOCUS='e8b28fa6ba15f536e72d13c0b22765924efaf1f6';
const views=['month','year','multi-year'];
const date=(x,y,m,d)=>x?.year===y&&x.month===m&&x.day===d;
const endpoints={month:[[2024,0,15],[2024,2,15]],year:[[2023,1,15],[2025,1,15]],'multi-year':[[2006,1,15],[2054,1,15]]};
const keys=(obj, expected)=>obj && typeof obj==='object' && !Array.isArray(obj) && eq(Object.keys(obj).sort(),[...expected].sort());
const classInitial=(v,name)=>v?.baseClass===true&&eq(v.initial,name==='object'?[true,false,false]:[true,true,false]);
const classOne=(v,name)=>keys(v,['initial','replacement','baseClass'])&&classInitial(v,name)&&eq(v.replacement,[false,false,true]);
const early=x=>keys(x,['focusCall','todayCall','focused','destroyed'])&&x.focusCall==='ok'&&x.todayCall==='ok'&&x.focused===true&&x.destroyed===true;
const boundary=x=>x&&x.aria==='true'&&x.nativeDisabled===false&&x.focused===true&&Number.isInteger(x.year)&&Number.isInteger(x.month)&&Number.isInteger(x.day);
const compileNegative=(rows,id,code)=>{const t=rows.typeNegatives?.[id];return t?.status===1&&t.signal===null&&typeof t.diagnostic==='string'&&t.diagnostic.includes('error '+code+':')&&t.diagnostic.includes(id==='cell-readonly'?'cssClasses':id==='date-class'?'badClass':'invalidFilter');};
const filterCore=x=>x&&x.single===false&&x.rangeStart===false&&x.rangeEnd===true;
const filterInput=x=>filterCore(x)&&x.day15===true;
function baseline(sha,r){
 if(sha===CLASSES)return compileNegative(r,'date-class','TS2322')&&compileNegative(r,'cell-readonly','TS2540')&&keys(r.classes,views)&&views.every(v=>keys(r.classes[v],['string','array','set','object'])&&['string','array','set','object'].every(n=>classOne(r.classes[v][n],n)));
 if(sha===EARLY)return early(r.early);
 if(sha===FOCUS)return views.every(v=>{
  const n=r.navigation?.[v];return n&&boundary(n.atMin)&&boundary(n.pastMin)&&boundary(n.atMax)&&boundary(n.pastMax)&&eq(n.atMin,n.pastMin)&&eq(n.atMax,n.pastMax)&&date(n.atMin,...endpoints[v][0])&&date(n.atMax,...endpoints[v][1])&&Number.isInteger(n.steps)&&n.steps>0&&n.steps<=10;
 })&&boundary(r.navigation?.keyboardMin)&&boundary(r.navigation?.keyboardPastMin)&&eq(r.navigation.keyboardMin,r.navigation.keyboardPastMin)&&boundary(r.navigation?.keyboardMax)&&boundary(r.navigation?.keyboardPastMax)&&eq(r.navigation.keyboardMax,r.navigation.keyboardPastMax)&&date(r.navigation.keyboardMin,2024,0,15)&&date(r.navigation.keyboardMax,2024,2,15);
 if(sha===FILTERS){
  if(!['calendar-filter','single-filter','range-filter'].every(id=>compileNegative(r,id,'TS2322')))return false;
  if(!views.every(v=>{const a=r.filters?.[v];return Array.isArray(a)&&a.length===4&&a.every(x=>Number.isInteger(x.count)&&x.count>0&&Number.isInteger(x.disabled))&&a[0].disabled===0&&a[1].disabled===0&&a[2].disabled===a[2].count&&a[3].disabled===0}))return false;
  const a=r.filters?.input,project=x=>({single:x?.single,rangeStart:x?.rangeStart,rangeEnd:x?.rangeEnd,day15:x?.day15}),unfiltered={single:true,rangeStart:true,rangeEnd:true,day15:false};return Array.isArray(a)&&a.length===5&&eq(project(a[0]),unfiltered)&&eq(project(a[1]),unfiltered)&&filterInput(a[2])&&eq(project(a[3]),{single:true,rangeStart:true,rangeEnd:false,day15:false})&&eq(project(a[4]),unfiltered)&&r.defaultFilter?.count>0&&r.defaultFilter.disabled===0;
 }
 return false;
}
function controlRejected(sha,f){
 if(sha===CLASSES){const x=f?.classes;return x&&Array.isArray(x.initial)&&x.baseClass===true&&!classInitial(x,'string');}
 if(sha===EARLY){const x=f?.earlyFocus,y=f?.earlyToday;return x&&y&&x.focusCall==='Error: fault:focus'&&y.todayCall==='Error: fault:today'&&!early(x)&&!early(y);}
 if(sha===FOCUS){const x=f?.navigation;return x&&date(x,2024,0,15)&&x.aria==='true'&&x.nativeDisabled===false&&x.focused===false&&!boundary(x);}
 if(sha===FILTERS){const x=f?.filters;return x&&x.single===true&&x.rangeStart===true&&!filterCore(x);}
 return false;
}
export function evaluateDatepickerRows(sha,rows,nonce){
 // These are checks of raw observations, not proof of execution or origin.
 if(![CLASSES,FILTERS,EARLY,FOCUS].includes(sha)||!rows||!/^[a-f0-9]{32,64}$/.test(nonce)||rows.nonce!==nonce)return {baseline:false,negative:false};
 const common=rows.adapter===true&&eq(rows.errors,[])&&rows.picker?.open===true&&rows.picker?.closed===true&&rows.cleanup?.rootPresent===false&&rows.cleanup?.overlayCalendars===0&&eq(rows.cleanup?.errors,[]);
 return {baseline:Boolean(common&&baseline(sha,rows)),negative:Boolean(controlRejected(sha,rows.faults))};
}

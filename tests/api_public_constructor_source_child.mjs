/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. */
import assert from 'node:assert/strict';import {readFileSync,writeFileSync,readdirSync} from 'node:fs';import {createRequire} from 'node:module';import {dirname,join} from 'node:path';import {EventEmitter,VERSION} from '@angular/core';import {emitterScope} from './scripts/api-public-constructor-internals.mjs';
const req=createRequire(import.meta.url),entry=req.resolve('@angular/core'),entryOriginal=readFileSync(entry,'utf8'),text=Function.prototype.toString.call(EventEmitter),candidates=readdirSync(dirname(entry)).filter(name=>name.endsWith('.mjs')).map(name=>join(dirname(entry),name)).filter(path=>readFileSync(path,'utf8').includes(text)),core={EventEmitter,VERSION};
assert.equal(candidates.length,1,'actual constructor source must be unique');const file=candidates[0],original=readFileSync(file,'utf8');
assert.ok(original.includes(text));const baseline=emitterScope(core,{file});assert.ok(baseline,'real exported class must pass');
try{
 const benign=original+'\n// changed physical bytes\n';writeFileSync(file,benign);const refreshed=emitterScope(core,{file});assert.ok(refreshed,'valid changed source must pass');assert.notEqual(refreshed.proof.sha256,baseline.proof.sha256,'stale proof reused after harmless drift');writeFileSync(file,original);assert.equal(emitterScope(core,{file}).proof.sha256,baseline.proof.sha256,'restored proof must follow physical bytes');
 const comment=original.replace(text,'class EventEmitter_ {}\n/* '+text+' */');assert.notEqual(comment,original);writeFileSync(file,comment);assert.equal(emitterScope(core,{file}),null,'comment and stale cache must reject');
 for(const [id,extra] of [
  ['mutable exported alias','let EventEmitter = EventEmitter_; EventEmitter = class Foreign {};'],
  ['class binding overwrite','const EventEmitter = EventEmitter_; EventEmitter_ = class Foreign {};'],
  ['class overwrite before exported alias','EventEmitter_ = class Foreign {}; const EventEmitter = EventEmitter_;'],
  ['class compound assignment','const EventEmitter = EventEmitter_; EventEmitter_ ||= class Foreign {};'],
  ['class prefix increment','const EventEmitter = EventEmitter_; ++EventEmitter_;'],
  ['class postfix increment','const EventEmitter = EventEmitter_; EventEmitter_++;'],
  ['class destructuring assignment','const EventEmitter = EventEmitter_; ({EventEmitter_} = {});'],
  ['class array destructuring','const EventEmitter = EventEmitter_; [EventEmitter_] = [];'],
  ['class for-of binding','const EventEmitter = EventEmitter_; for (EventEmitter_ of []) {}'],
  ['class for-in binding','const EventEmitter = EventEmitter_; for (EventEmitter_ in {}) {}'],
  ['nested assignment','const EventEmitter = EventEmitter_; function change() { EventEmitter_ = class Foreign {}; }'],
  ['direct eval','const EventEmitter = EventEmitter_; eval("EventEmitter_ = 1");'],
  ['parenthesized eval','const EventEmitter = EventEmitter_; (eval)("EventEmitter_ = 1");'],
 ]){const changed=original.replace('const EventEmitter = EventEmitter_;',extra);assert.notEqual(changed,original,id);writeFileSync(file,changed);assert.equal(emitterScope(core,{file}),null,id);}
 const shadow=original.replace('const EventEmitter = EventEmitter_;','const EventEmitter = EventEmitter_; function unrelated() { let EventEmitter_; EventEmitter_ = 1; }');writeFileSync(file,shadow);assert.ok(emitterScope(core,{file}),'shadowed local assignment must not count');
 const unused=original.replace('const EventEmitter = EventEmitter_;','const EventEmitter = class Other {};');assert.notEqual(unused,original);writeFileSync(file,unused);assert.equal(emitterScope(core,{file}),null,'unexported actual class must reject');
 const reexport=[...entryOriginal.matchAll(/export\s*\{[^}]*\}\s*from\s*['"][^'"]+['"]/gs)].map(x=>x[0]).filter(x=>/\bEventEmitter\b/.test(x));assert.equal(reexport.length,1,'public emitter reexport must be unique');const changedExport=reexport[0].replace(/\bEventEmitter\b/,'EventEmitter as NotEventEmitter');const alteredEntry=entryOriginal.replace(reexport[0],changedExport);assert.notEqual(alteredEntry,entryOriginal);writeFileSync(entry,alteredEntry);assert.equal(emitterScope(core,{file}),null,'changed entry export must reject');writeFileSync(entry,entryOriginal);
 const fake=original.replace('const EventEmitter = EventEmitter_;','const EventEmitter = EventEmitter_;\nexport {EventEmitter};');assert.notEqual(fake,original);writeFileSync(file,fake);assert.equal(emitterScope(core,{file}),null,'duplicate export must reject');
}finally{writeFileSync(file,original);writeFileSync(entry,entryOriginal)}
assert.ok(emitterScope(core,{file}),'restored source must pass');console.log('actual and shadowed positives pass; comment, alias/class writes, eval, export mismatch, duplicate export and stale cache reject; restoration passes');

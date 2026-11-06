/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {motionSource} from '../scripts/native-motion-page.mjs';
import {assertCase, deriveMainRoster, samplePass} from '../scripts/native-motion-roster.mjs';
const ts=createRequire(import.meta.url)('typescript');
const paths=['browser-dialog-escape.mjs','browser-form-families.mjs','browser-control-families.mjs','browser-overlay-families.mjs'];
for(const path of paths){
 const raw=readFileSync(new URL('../scripts/'+path,import.meta.url),'utf8');
 assert.match(raw,/provideZoneChangeDetection/);assert.match(raw,/applicationProviders: \[provideZoneChangeDetection\(\)\]/);
 assert.match(raw,/provideZonelessChangeDetection/);assert.match(raw,/zone\.run\(\(\) => NgZone\.isInAngularZone\(\)\)/);
 const coreImport=raw.match(/import \{[^\n]+from '@angular\/core';/);assert.ok(coreImport,path);assert.match(coreImport[0],/\bNgZone\b/,path);assert.match(coreImport[0],/\binject\b/,path);
 assert.match(raw,/angular_zone_entered: angularZoneEntered/);
 const file=ts.createSourceFile(path,raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);
 const expressions=[];function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(file)==='zoneOk')expressions.push(n.initializer.getText(file));ts.forEachChild(n,visit);}visit(file);assert.equal(expressions.length,1,path);
 const evaluate=(zoneless,angularZoneEntered,zoneGlobal,bundleHasZone)=>runInNewContext(expressions[0],{zoneless,angularZoneEntered,zoneGlobal,bundleHasZone});
 for(const zoneless of [false,true]){
  const valid=[zoneless,!zoneless,zoneless?'undefined':'function',!zoneless];assert.equal(evaluate(...valid),true,path);
  assert.equal(evaluate(zoneless,zoneless,valid[2],valid[3]),false,path);
  assert.equal(evaluate(zoneless,null,valid[2],valid[3]),false,path);
  assert.equal(evaluate(zoneless,valid[1],valid[2],!valid[3]),false,path);
 }
 if(path==='browser-dialog-escape.mjs') {
  assert.match(raw,/cspAngularZoneEntered !== !zoneless/);
  let nonceExpression;function findNonce(n){if(ts.isVariableDeclaration(n)&&n.name.getText(file)==='nonceClean')nonceExpression=n.initializer.getText(file);ts.forEachChild(n,findNonce);}findNonce(file);assert.ok(nonceExpression);
  const partial={cspOpened:true,stylesWithNonce:1,nonceViolations:[]};
  assert.equal(runInNewContext(nonceExpression,{...partial,cspError:null}),true);
  assert.equal(runInNewContext(nonceExpression,{...partial,cspError:'late violation read failed'}),false);
 }

}
for(const zoneless of [false,true]){
 const source=motionSource(zoneless);assert.match(source,/zone\.run\(\(\) => NgZone\.isInAngularZone\(\)\)/);
 assert.equal(source.includes('applicationProviders: [provideZoneChangeDetection()]'),!zoneless);
 assert.equal(source.includes('provideZonelessChangeDetection(), '),zoneless);
 const id=deriveMainRoster().ids.find(x=>x.includes(zoneless?'/zoneless/':'/zoneful/'));
 const good=samplePass(id);assert.deepEqual(assertCase(id,good),[]);
 assert.ok(assertCase(id,{...good,angularZoneEntered:zoneless}).length);
 const missing={...good};delete missing.angularZoneEntered;assert.ok(assertCase(id,missing).length);
}
console.log(JSON.stringify({browser_producers:paths.length,motion_runtime_modes:2,mismatch_and_missing_rejected:true,native_browser_executed:false}));

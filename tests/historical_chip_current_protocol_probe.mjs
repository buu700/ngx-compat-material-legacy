/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Reuse the authenticated original protocol assertions on actual current source. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {historicalChipCurrentSubject} from '../scripts/historical-chip-current-subject.mjs';
import {chipRepairPair,CHIP_SOURCE} from '../scripts/spec-stability-chip-repair.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const require=createRequire(import.meta.url),ts=require('typescript');
const originalPath='tests/spec_stability_chip_probe.mjs',originalRaw=read(originalPath);
assert.equal(hash(originalRaw),'2abc2e89300ca68cf4c88e57ecc166f649db1b62203301b098473e37109bf032',
  'original protocol assertions changed; review their subject before updating this binding');
const original=ts.createSourceFile(originalPath,originalRaw.toString(),ts.ScriptTarget.Latest,true);
assert.equal(original.parseDiagnostics.length,0);
const helpers=['method','loadOwnedMethod','exercise'].map(name=>{
  const found=original.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  assert.equal(found.length,1);return found[0].getText(original);
});
const start=original.statements.findIndex(node=>ts.isVariableStatement(node)&&
  node.declarationList.declarations.some(declaration=>declaration.name.getText(original)==='modes'));
assert.ok(start>=0);
// These nine unchanged statements contain all five positive protocol modes,
// two authentic-before failures and two noisy-reset failures. The original
// whole-file seal controls below them concern the historical source frame.
const protocol=original.statements.slice(start,start+9);
assert.equal(protocol.length,9);
assert.ok(ts.isForOfStatement(protocol.at(-1)));
assert.ok(protocol.at(-1).getText(original).includes('exercise(NoisySubject, mode)'));

const current=historicalChipCurrentSubject({root});
assert.equal(hash(read(CHIP_SOURCE)),current.report.actual_chip_source.sha256);
await import(pathToFileURL(require.resolve('@angular/compiler')).href);
const {QueryList}=await import(pathToFileURL(require.resolve('@angular/core')).href);
const {FocusKeyManager}=await import(pathToFileURL(require.resolve('@angular/cdk/a11y')).href);
const pair=chipRepairPair({root});
const execute=new Function('assert','ts','CHIP_SOURCE','QueryList','FocusKeyManager','read','pair',
  'return (async()=>{'+helpers.join('\n')+'\n'+protocol.map(node=>node.getText(original)).join('\n')+
  '\nreturn {cases,method:method(read(CHIP_SOURCE).toString())};})()');
const result=await execute(assert,ts,CHIP_SOURCE,QueryList,FocusKeyManager,read,pair);
assert.equal(result.cases.length,9);
assert.equal(hash(result.method),current.report.empty_query_reset_method_sha256);
current.assertCurrent();
const report={schema_version:1,line:current.line,
  role:'Unchanged original behavioral assertions applied to the actual current owned method and actual installed public objects.',
  original_protocol:{path:originalPath,sha256:hash(originalRaw),helper_functions:3,protocol_statements:9,
    original_source_unchanged:true,assertions_or_expected_results_changed:false},
  current_subject:current.report,cases:result.cases,
  actual_current_owned_method_protocol_cases:5,authentic_before_method_rejected:2,
  unexpected_change_event_mutants_rejected:2,
  runtime:{node:process.version,typescript:ts.version,core:require('@angular/core/package.json').version,
    cdk:require('@angular/cdk/package.json').version,canonical_or_floor_qualified:false},
  producer:{path:'tests/historical_chip_current_protocol_probe.mjs',sha256:hash(read('tests/historical_chip_current_protocol_probe.mjs'))},
  actual_Angular_view_DOM_packed_artifact_browser_or_floor_qualified:false,
  g11_claim:'not-passed',g13_claim:'not-passed'};
const args=process.argv.slice(2);assert.ok(args.length===0||args.length===2);
if(args.length){assert.equal(args[0],'--out');writeFileSync(args[1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
console.log(JSON.stringify(report));

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/** Whole genuine constructors/methods through explicit server and modal protocols. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {compileRemainingIdentityGraph, remainingIdentityEntries} from '../scripts/remaining-identity-construction.mjs';
import {prepareRemainingIdentitySubjects} from '../scripts/remaining-identity-public-subjects.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root,p)), hash = b => createHash('sha256').update(b).digest('hex');
const graph = compileRemainingIdentityGraph({root}), loaded = prepareRemainingIdentitySubjects(root);
const worker = read('tests/snack_modal_identity_subject.mjs'), results = [];
try {
  for(const model of loaded.models) {
    for(const module of graph.modules) {
      const target=join(model.root,'owned',module.path.replace(/\.ts$/,'.mjs'));
      mkdirSync(dirname(target),{recursive:true}); writeFileSync(target,module.compiled);
    }
    writeFileSync(join(model.root,'worker.mjs'),worker);
    writeFileSync(join(model.root,'resources.json'),JSON.stringify(graph.resources));
    for(const order of ['legacy-first','peer-first'])for(const clearFirst of ['legacy','current']) {
      const child=spawnSync(process.execPath,[join(model.root,'worker.mjs'),model.line,'snack-bar',order,join(model.root,'owned',remainingIdentityEntries['snack-bar'].replace(/\.ts$/,'.mjs')),clearFirst],{cwd:model.root,encoding:'utf8',timeout:20000});
      assert.equal(child.status,0,child.stderr||String(child.error)); assert.equal(child.stderr,'');
      const result=JSON.parse(child.stdout);
      assert.equal(result.actual_public_peer_constructors,true);
      assert.equal(result.actual_whole_modal_methods_executed,true);
      assert.equal(result.actual_modal_nodes_or_overlay_lifecycle_qualified,false);
      assert.ok(result.values.every(value=>value.unique));
      const expected=model.line==='original'||order==='peer-first';
      assert.equal(result.modal_stages.every(stage=>stage.okay),expected,JSON.stringify(result));
      results.push(result);
    }
  }
} finally {loaded.dispose();}
assert.equal(results.length,12);
assert.equal(results.filter(row=>!row.modal_stages.every(stage=>stage.okay)).length,4);
const report={schema_version:1,line:JSON.parse(read('compatibility/rc/snack-modal-identity-worksheet.json')).line,
  stage:'before-prefix-isolation',node:process.version,compiler:graph.compiler,
  producer_sha256:hash(read('tests/snack_modal_identity_probe.mjs')),worker_sha256:hash(worker),
  compiler_helper_sha256:hash(read('scripts/remaining-identity-construction.mjs')),
  loader_sha256:hash(read('scripts/remaining-identity-public-subjects.mjs')),runtime_capsule:loaded.runtime_capsule,
  owned_modules:graph.modules.map(({compiled,...m})=>m),resources:graph.resources.map(({text,...r})=>r),results,
  limits:['Actual complete genuine tagged/current constructors and whole actual expose/clear methods with explicit document/modal-attribute protocols.','No replacement peer ID generator or copied method body. Server construction and raw resource text do not qualify actual Angular nodes, real modal/overlay lifecycle, rendering, native/packed/AOT or canonical runtime/compiler/RxJS floors.'],g11_claim:'not-passed'};
const args=process.argv.slice(2);
if(args.length){assert.equal(args.length,2);assert.equal(args[0],'--report');assert.equal(existsSync(args[1]),false);writeFileSync(args[1],JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({line:report.line,stage:report.stage,contexts:results.length,original_reference_positive:4,current_positive_controls:4,current_reproduced_failures:4,owned_modules:graph.modules.length,owned_resources:graph.resources.length,actual_modal_or_packed_nodes_qualified:false}));

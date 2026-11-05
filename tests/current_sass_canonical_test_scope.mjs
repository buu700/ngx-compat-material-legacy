/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** Current registry bytes and physical tool guards, separate from historical proofs. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {legacyRemovalRegistrySuccessor} from '../scripts/legacy-removal-canonical-stage.mjs';
import {tableLocalCompilationRegistrySuccessor} from '../scripts/table-local-compilation-canonical-stage.mjs';
import {currentSassToolReferenceSubject} from '../scripts/current-sass-tool-references.mjs';
import {sourceContractDefinitions} from '../scripts/upstream-source-contract-registry.mjs';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
export function assertCurrentCanonicalTestRegistry({historicalRegistry,qualified,root=process.cwd(),read=path=>readFileSync(join(root,path))}){
 assert.equal(hash(historicalRegistry),'03a18cd09e4183f4307f1ec2c17d0797eea72db0440e23530e4d015ea0dae6a8');
 const expected=tableLocalCompilationRegistrySuccessor(legacyRemovalRegistrySuccessor(historicalRegistry));
 const path='scripts/upstream-source-contract-registry.mjs',actual=read(path);
 assert.deepEqual(actual,expected,'current registry must be the exact two finite source successors');
 assert.equal(sourceContractDefinitions.length,69);assert.equal(new Set(sourceContractDefinitions.map(row=>row.sha)).size,69);
 assert.deepEqual(qualified.reference,{path,sha256:hash(expected),bytes:expected.length});
 const guards=new Map();
 for(const ref of qualified.bound){
  assert.equal(guards.has(ref.path),false,'duplicate current canonical guard');
  const bytes=read(ref.path);assert.equal(hash(bytes),ref.sha256);assert.equal(bytes.length,ref.bytes);guards.set(ref.path,ref);
 }
 const tools=currentSassToolReferenceSubject({root,read});
 for(const ref of tools.bound)assert.deepEqual(guards.get(ref.path),ref,'canonical tool role omitted a current finite source input');
 qualified.assertCurrent();tools.assertCurrent();
 return {historical_registered_source_contracts:67,registered_source_contracts:69,
  current_registry_tool_bindings:guards.size,current_registry_tool_bindings_verified:true,
  all_current_tool_bindings_retained:true};
}

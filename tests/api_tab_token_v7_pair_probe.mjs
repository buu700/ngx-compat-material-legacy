/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license in LICENSE.
 * Run: node tests/api_tab_token_v7_pair_probe.mjs <old-package> <v7-package> <reference> <old-tar> <v7-tar>
 */
import assert from 'node:assert/strict';
import {deriveSurface,readDts} from '../scripts/api-surface.mjs';
import {tabTokenProof} from '../scripts/api-tab-token-contract.mjs';
const [oldPackage,v7Package,referenceRoot,oldTar,v7Tar]=process.argv.slice(2);
assert.ok(oldPackage&&v7Package&&referenceRoot&&oldTar&&v7Tar);
const symbol=deriveSurface(referenceRoot).symbols.find(x=>x.symbol_id==='legacy-tabs/primary/MAT_LEGACY_TAB');
const file=root=>readDts(root).get('ngx-compat-material-legacy-legacy-tabs.d.ts');
const context=(packageRoot,tarball)=>({packageRoot,tarball,referenceRoot});
for(const [root,tar] of [[oldPackage,oldTar],[v7Package,v7Tar]]){
 const proof=tabTokenProof(symbol,file(root),context(root,tar));assert.ok(proof);assert.equal(proof.program_sources,307);assert.equal(proof.program_closure_sha256,'f445d9c82890f13bb412f77e24605478ae6ca3e53766af0583e8a94f54a3d1f6');
}
assert.equal(tabTokenProof(symbol,file(oldPackage),context(oldPackage,v7Tar)),null);
assert.equal(tabTokenProof(symbol,file(v7Package),context(v7Package,oldTar)),null);
console.log('two exact artifacts qualified; crossed artifact images rejected');

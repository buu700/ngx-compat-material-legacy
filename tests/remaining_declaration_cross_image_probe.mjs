/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. */
import assert from 'node:assert/strict';
import {deriveSurface,readDts} from '../scripts/api-surface.mjs';
import {paginatorTabBodyProof} from '../scripts/api-paginator-tabbody-contract.mjs';
import {selectScrollTokenProof} from '../scripts/api-select-scroll-token-contract.mjs';
const [oldRoot,v7Root,ref,oldTar,v7Tar]=process.argv.slice(2),surface=deriveSurface(ref);
for(const [id,name,proof] of [['legacy-paginator/primary/MatLegacyPaginator','legacy-paginator',paginatorTabBodyProof],['legacy-tabs/primary/_MatLegacyTabBodyBase','legacy-tabs',paginatorTabBodyProof],['legacy-select/primary/MAT_LEGACY_SELECT_SCROLL_STRATEGY','legacy-select',selectScrollTokenProof]]){
 const symbol=surface.symbols.find(x=>x.symbol_id===id);
 for(const [root,tar,other] of [[oldRoot,oldTar,v7Tar],[v7Root,v7Tar,oldTar]]){
  const file=readDts(root).get(`ngx-compat-material-legacy-${name}.d.ts`),context={packageRoot:root,referenceRoot:ref,tarball:tar};
  assert.ok(proof(symbol,file,context),`${id} positive`);assert.equal(proof(symbol,file,{...context,tarball:other}),null,`${id} cross-image mismatch`);
 }
}
console.log('Six positives and six cross-image mismatches passed');

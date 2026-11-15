/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
import {mock} from 'node:test';import {readFileSync} from 'node:fs';import {prepareDisposableTableProbe} from './table-inherited-disposable.mjs';import assert from 'node:assert/strict';
const dir=process.env.TABLE_REVALIDATOR_FIXTURE;if(!dir)throw Error('Set TABLE_REVALIDATOR_FIXTURE to the synthetic source fixture');const {owned,args,bundle,writeOwned}=prepareDisposableTableProbe(dir),before=readFileSync(bundle);
mock.module('../scripts/overlay-inherited-archive.mjs',{exports:{verifyArchive:()=>writeOwned(bundle,Buffer.concat([before,Buffer.from('x')]))}});
try{const {revalidateTable}=await import('../scripts/revalidate-table-inherited.mjs');assert.throws(()=>revalidateTable(args),/table bundle changed during replay/);console.log('late bundle mutation rejected in '+owned);}finally{writeOwned(bundle,before);mock.restoreAll()}

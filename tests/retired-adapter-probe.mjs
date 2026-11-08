/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {packedCvaMetadataToolingEpoch, PACKED_CVA_ROLE_INPUTS} from '../scripts/packed-cva-source-requalification.mjs';
const root=process.cwd(), read=p=>readFileSync(join(root,p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const inputs=JSON.parse(read(PACKED_CVA_ROLE_INPUTS)),path=inputs.metadata_tooling_delta.path;
const epoch=packedCvaMetadataToolingEpoch({root,read});
assert.equal(hash(read(path)),'34250fbc33217cd572fcb0380221f057b56117aa832e05aa3cb22cf8cc3afb66');
assert.equal(hash(epoch.read(path)),inputs.metadata_tooling_delta.before_sha256);
assert.ok(epoch.read(PACKED_CVA_ROLE_INPUTS).equals(read(PACKED_CVA_ROLE_INPUTS)));
assert.throws(()=>packedCvaMetadataToolingEpoch({root,read:p=>p===path?Buffer.concat([read(p),Buffer.from('\n// tamper')]):read(p)}),/changed retired-role/);
assert.throws(()=>packedCvaMetadataToolingEpoch({root,read:p=>p===PACKED_CVA_ROLE_INPUTS?Buffer.concat([read(p),Buffer.from(' ')]):read(p)}),/changed packed role/);
let mutate=false;const unstable=p=>p===path&&mutate?Buffer.concat([read(p),Buffer.from(' ')]):read(p);
const live=packedCvaMetadataToolingEpoch({root,read:unstable});mutate=true;
assert.throws(()=>live.read(path),/late retired-role/);assert.throws(()=>live.assertCurrent(),/late retired-role/);
console.log('Exact current adapter, historical projection, input and late-mutation controls pass');

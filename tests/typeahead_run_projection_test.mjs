/** @license Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester. MIT license; see LICENSE. */
import assert from 'node:assert/strict';
import {typeaheadRunDigest} from '../scripts/typeahead-run-projection.mjs';
const original={schema_version:1,template:false,run_id:'run',purpose:'candidate',created_at:'time',source:{commit:'one'},environment:{mode:'host-nix'},oracles:{},artifacts:[{sha256:'one'}],expected_matrix:{sha256:'one'},execution_inputs:{inputs_sha256:'one'},pack_execution:{sha256:'one'},pack_metadata:{sha256:'one'},stage:'draft',reports:[],summary:{}};
const digest=typeaheadRunDigest(original);
const final={...original,execution_record:{sha256:'record'}};
assert.equal(typeaheadRunDigest(final),digest);
const sealed={...final,stage:'sealed',finished_at:'time',reports:[{check_id:'test'}],summary:{automatic_product_result:'pass'},preseal_manifest_sha256:'hash',evidence_files:[]};
assert.equal(typeaheadRunDigest(sealed),digest);
for (const [key,value] of [['source',{commit:'two'}],['artifacts',[{sha256:'two'}]],['execution_inputs',{inputs_sha256:'two'}]]) assert.notEqual(typeaheadRunDigest({...sealed,[key]:value}),digest);
assert.throws(()=>typeaheadRunDigest({...sealed,unexpected:'value'}));
assert.throws(()=>typeaheadRunDigest({...sealed,stage:'unexpected'}));
console.log('typeahead run projection: passed');

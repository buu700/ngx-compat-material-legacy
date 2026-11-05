/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
/** One current API transport check; the maintained full JS probe is syntax-only here. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCurrentSpinnerSnackContract,currentSpinnerSnackAssertionOk} from '../../scripts/current-sass-spinner-snack-contract.mjs';
const input=JSON.parse(readFileSync(0,'utf8'));assert.ok(input.root.includes('ngx-current-sass-source-test-'));
const context=createCurrentSpinnerSnackContract({root:input.root});
assert.equal(context.descriptor.source_modules.length,4);assert.deepEqual(context.descriptor,input.model.body.current_spinner_snack_bridge);
assert.equal(currentSpinnerSnackAssertionOk({context,...input.model}),true);
const wrong=structuredClone(input.model);wrong.body.call='cold wrong maintained metadata';
assert.equal(currentSpinnerSnackAssertionOk({context,...wrong}),false);
console.log(JSON.stringify({line:context.line,current_positive:true,cold_wrong_metadata_rejected:true,source_modules:4,
 canonical_descriptor_matches_python:true,current_source_set_successors:context.source_set_successors,
 compiler_calls:0,full_maintained_probe_executed:false,actual_packed_assertions:0}));

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import assert from 'node:assert/strict';
import {existsSync,writeFileSync} from 'node:fs';
import {probeRequiredPackedContract} from './packed_required_contract_admission.mjs';
const result=probeRequiredPackedContract('table');
const at=process.argv.indexOf('--report');if(at>=0){assert.equal(existsSync(process.argv[at+1]),false);writeFileSync(process.argv[at+1],JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify(result));

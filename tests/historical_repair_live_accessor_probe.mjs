/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by the MIT license in LICENSE.
 */
import assert from 'node:assert/strict';
import {historicalRepairLiveSourceSuccessor as make} from '../scripts/historical-repair-live-source-successor.mjs';
const subject=make({root:process.cwd()}),ref=subject.signatureBefore;let called=false;
const hostile={...ref,get extra(){called=true;return 1;}};assert.throws(()=>subject.qualify(hostile));assert.equal(called,false);assert.ok(subject.qualify(ref));subject.assertPhysical();
console.log(JSON.stringify({result:'pass',accessor_rejected_before_invocation:true,recovery:true,g11_claim:'not-passed'}));

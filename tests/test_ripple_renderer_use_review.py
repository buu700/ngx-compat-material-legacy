# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
import json
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]


class RippleRendererUseReviewTests(unittest.TestCase):
    def test_exact_six_boundaries_and_source_corruption_controls(self):
        source=r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewRippleRendererUses} from './scripts/ripple-renderer-use-review.mjs';
const path='projects/ngx-material-legacy/legacy-core/ripple/ripple-renderer.ts',original=readFileSync(path,'utf8');
const report=reviewRippleRendererUses();assert.equal(report.cases.length,6);assert.equal(report.subjects.length,3);
assert.equal(report.public_zone_accesses.length,3);assert.equal(report.owned_zone_forwarding.length,1);
const mutations=[
 ['coerceElement(elementOrElementRef)','coerceElement(elementOrElementRef, undefined)'],
 ['passive: true','passive: false'],
 ['isFakeMousedownFromScreenReader(event)','isFakeMousedownFromScreenReader(new MouseEvent("mousedown"))'],
 ['isFakeTouchstartFromScreenReader(event)','isFakeTouchstartFromScreenReader(event, true)'],
 ['this._platform.isBrowser','this._platform.BLINK'],
 ['this._ngZone.runOutsideAngular','this._ngZone.run'],
 ['private _ngZone: NgZone','private _ngZone: any'],
 ["import {coerceElement}","import type {coerceElement}"],
 ['export class LegacyRippleRenderer', 'const escapedHelper = coerceElement;\nexport class LegacyRippleRenderer'],
 ['if (_platform.isBrowser)', 'const escapedPlatform = _platform;\n    if (_platform.isBrowser)'],
];
for(const[from,to]of mutations){const changed=original.replace(from,to);assert.notEqual(changed,original);
 assert.throws(()=>reviewRippleRendererUses({readSource:p=>p===path?changed:readFileSync(p,'utf8')}));}
console.log(JSON.stringify({cases:6,subjects:3,negative_source_controls:mutations.length,native_or_packed_executed:false}));
"""
        result=subprocess.run(['node','--max-old-space-size=512','--input-type=module','-e',source],cwd=ROOT,
                              capture_output=True,text=True,timeout=90)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual(json.loads(result.stdout)['negative_source_controls'],10)

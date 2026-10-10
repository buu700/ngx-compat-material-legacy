# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RippleEventManagerUseReviewTests(unittest.TestCase):
    def test_exact_public_zone_binding_and_three_negative_controls(self):
        script = r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewRippleEventManagerNgZone} from './scripts/ripple-event-manager-use-review.mjs';
const path='projects/ngx-material-legacy/legacy-core/ripple/ripple-event-manager.ts';
assert.equal(reviewRippleEventManagerNgZone().cases.length,1);
for(const [from,to] of [['ngZone: NgZone','ngZone: any'],
 ['ngZone.runOutsideAngular','ngZone.run'],['NgZone','DifferentZone']]) {
 const original=readFileSync(path,'utf8'), changed=original.replace(from,to);
 assert.notEqual(changed,original);
 assert.throws(()=>reviewRippleEventManagerNgZone({readSource:current=>
  current===path?changed:readFileSync(current,'utf8')}));
}
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT,
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

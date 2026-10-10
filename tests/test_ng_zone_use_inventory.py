# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""The bounded source inventory must reject changed or missed NgZone contexts."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NgZoneUseInventoryTests(unittest.TestCase):
    def test_all_frozen_and_current_receivers_and_changed_contexts(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inventoryNgZoneUses} from './scripts/ng-zone-use-inventory.mjs';
const report = inventoryNgZoneUses();
assert.equal(report.frozen_uses,25);assert.equal(report.current_uses,36);
assert.equal(report.cases.filter(row=>row.testing_only).length,1);
assert.equal(report.accesses.length,61);assert.equal(report.forwarding.length,15);
assert.equal(report.new_frozen_use_closures,0);
const file='projects/ngx-material-legacy/legacy-tabs/internal/owned-header-resize.ts';
const source=readFileSync(file,'utf8');
for(const [from,to,message] of [
 ['ngZone.runOutsideAngular(', 'ngZone.runGuarded(', 'NgZone member outside reviewed scope'],
 ['ngZone.runOutsideAngular(', "ngZone['runOutsideAngular'](", 'computed NgZone member'],
 ["{NgZone} from '@angular/core'", "{NgZone} from '@angular/core/private'", 'Expected values to be strictly deep-equal'],
]) {
 const changed=source.replace(from,to);assert.notEqual(changed,source);
 assert.throws(()=>inventoryNgZoneUses({readSource:path=>path===file?changed:readFileSync(path,'utf8')}),
  error=>error.code==='ERR_ASSERTION'&&error.message.startsWith(message));
}
console.log(JSON.stringify({frozen:25,current:36,accesses:61,forwarding:15,mutations:3}));
'''
        result = subprocess.run(['node', '--max-old-space-size=512', '--input-type=module', '-e', code],
                                cwd=ROOT, capture_output=True, text=True, timeout=120)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Finite borrowed contexts execute genuine Core without owning caller services."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BorrowedConstructorInjectorTests(unittest.TestCase):
    def test_complete_helpers_context_restore_lifetime_and_current_caller_bounds(self):
        result = subprocess.run(['node', '--max-old-space-size=768', 'tests/borrowed_constructor_injector_probe.mjs'],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        observed = json.loads(result.stdout)
        self.assertEqual(observed['helpers'], 3)
        self.assertEqual(observed['callers'], 14)
        self.assertEqual(observed['contexts'], 6)
        self.assertEqual(observed['cases'], 162)
        self.assertEqual(observed['strict_type_subjects'], 3)
        self.assertEqual(observed['whole_helper_mutants_rejected'], 18)
        self.assertFalse(observed['actual_legacy_components_executed'])

    def test_nine_dependency_records_require_exact_helpers_callers_and_core_evidence(self):
        code = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {authoredUseReviewEvidence} from './scripts/authored-use-inventory.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const ledger=JSON.parse(readFileSync('compatibility/f10/authored-dependency-current-dispositions.json'));
const files=['internal/public-constructor-context.ts','legacy-table/internal/public-constructor-context.ts','legacy-tabs/internal/public-constructor-context.ts'];
const rows=ledger.symbol_uses.filter(r=>files.includes(r.file)&&r.module==='@angular/core'&&['Injector','ProviderToken','runInInjectionContext'].includes(r.symbol));
assert.equal(rows.length,9);assert.ok(rows.every(r=>r.disposition==='closed'&&r.status==='reviewed'));
const observe=(changed={},line=ledger.line)=>authoredUseReviewEvidence({symbol_uses:rows},line,p=>Object.hasOwn(changed,p)?changed[p]:readFileSync(p),hash);
assert.deepEqual(observe(),{reviewed:9,insufficient:0,insufficient_uses:[]});
for(const file of files)assert.equal(observe({['projects/ngx-material-legacy/'+file]:Buffer.from('changed bounded helper')}).insufficient,3);
assert.equal(observe({},ledger.line==='main'?'21.x':'main').insufficient,9);
assert.equal(observe({'compatibility/rc/borrowed-constructor-injector-source-proof.json':Buffer.from('changed Core context proof')}).insufficient,9);
assert.equal(observe({'projects/ngx-material-legacy/legacy-table/cell.ts':Buffer.from('changed emitted fields')}).insufficient,3);
assert.equal(observe({'projects/ngx-material-legacy/legacy-tabs/tab-label.ts':Buffer.from('changed label constructor')}).insufficient,3);
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code],
            cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact successor views, explicit stages and current-product guard rejection."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch
from tests.chip_history_union import (chip_history_union_context,chip_history_read,
    validate_chip_history_current,recorded_stage_subject,historical_product_diff,INPUT)
from tests.recorded_execution_source_context import recorded_implementation_subject
from tests.chip_batch_history import batch_history_read

ROOT=Path(__file__).resolve().parents[1]
sha=lambda b:hashlib.sha256(b).hexdigest()


class ChipHistoryUnion(unittest.TestCase):
    def test_JS_current_subjects_and_finite_stage_capsule_controls(self):
        command=['node','tests/chip_history_union_probe.mjs']
        if os.environ.get('NGX_CHIP_HISTORY_UNION_DIAGNOSTIC'):command.append(os.environ['NGX_CHIP_HISTORY_UNION_DIAGNOSTIC'])
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=60)
        self.assertEqual(result.returncode,0,(result.stdout+result.stderr)[-11000:]);report=json.loads(result.stdout)
        self.assertEqual(report['historical_predecessors'],30);self.assertEqual(report['source_unknown_controls'],30)
        self.assertEqual(report['exact_stage_subjects'],4);self.assertEqual(report['stage_rejection_controls'],8)
        self.assertEqual(report['capsule_and_snapshot_controls'],6);self.assertEqual(report['older_context_recheck_controls'],3);self.assertEqual(report['current_native_guards'],31 if report['line']=='main' else 30)
        self.assertTrue(report['all_current_guards_refuse_missing_coordinator']);self.assertTrue(report['all1697_decisions_unchanged'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified']);self.assertEqual(report['new_SHA_or_role_decisions'],0)

    def test_Python_unknown_bytes_stages_and_late_capsule_corruption(self):
        read=batch_history_read(ROOT,lambda p:(ROOT/p).read_bytes());data,before=validate_chip_history_current(ROOT,read,required=True)
        history=chip_history_read(ROOT,read)
        for member in before['members']:
            self.assertEqual(history(member['path']),member['before_text'].encode());unknown=read(member['path'])+b'\n unreviewed history input'
            altered=lambda p:unknown if p==member['path'] else read(p)
            self.assertEqual(chip_history_read(ROOT,altered)(member['path']),unknown)
            with self.subTest(path=member['path']),self.assertRaises(AssertionError):validate_chip_history_current(ROOT,altered,required=True)
        for stage in before['stages']:
            for member in stage['members']:
                self.assertEqual(sha(recorded_stage_subject(ROOT,stage['name'],member['path'])),member['sha256'])
                with self.assertRaises(AssertionError):recorded_stage_subject(ROOT,stage['name'],member['path'],lambda p:read(p)+b'unknown' if p==member['path'] else read(p))
        for stage,path in [('unknown',data['ledger_path']),('modern-chip-admission','tests/audit_test_context.py')]:
            with self.assertRaises(AssertionError):recorded_stage_subject(ROOT,stage,path)
        for path in [INPUT,data['prior']['path'],data['supplement']['path'],'scripts/chip-history-union.mjs']:
            corrupt=False
            def changing(p):return b'unreviewed' if corrupt and p==path else read(p)
            captured=chip_history_read(ROOT,changing);corrupt=True
            with self.assertRaises((AssertionError,ValueError,KeyError)):chip_history_union_context(ROOT,changing)
            self.assertEqual(captured(before['members'][0]['path']),before['members'][0]['before_text'].encode())
        with self.assertRaises(AssertionError):recorded_implementation_subject(ROOT,data['ledger_path'],lambda p:read(p)+b'unknown' if p==data['ledger_path'] else read(p))

    def test_nine_historical_product_comparisons_require_live_current_product_identity(self):
        data,before=chip_history_union_context(ROOT,lambda p:(ROOT/p).read_bytes())
        for row in before['product_comparisons']:self.assertEqual(historical_product_diff(ROOT,row['base']),b'')
        with self.assertRaises(AssertionError):historical_product_diff(ROOT,'0'*40)
        original=subprocess.check_output
        def altered_diff(args,**kwargs):
            if 'diff' in args and args[args.index('diff')+1]==before['qualified_product_frame']:return b'unreviewed current product delta'
            return original(args,**kwargs)
        with patch('tests.chip_history_union.subprocess.check_output',altered_diff),self.assertRaises(AssertionError):historical_product_diff(ROOT,before['product_comparisons'][0]['base'])
        def added_product(args,**kwargs):
            if 'ls-files' in args:return b'projects/ngx-material-legacy/unreviewed.ts\n'
            return original(args,**kwargs)
        with patch('tests.chip_history_union.subprocess.check_output',added_product),self.assertRaises(AssertionError):historical_product_diff(ROOT,before['product_comparisons'][0]['base'])

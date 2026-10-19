# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""One original source program remains mandatory beside current zone checks."""
import ast
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import unittest
from tests.chip_blur_history import inputs, validate_receipt
from tests.chip_recent_history import canonical_recorded_case
ROOT = Path(__file__).resolve().parents[1]
sha = lambda raw: hashlib.sha256(raw).hexdigest()


class ChipBlurHistory(unittest.TestCase):
    def test_fixed_original_graph_receipt_and_unknown_subject_controls(self):
        command = ['node', 'tests/chip_blur_history_probe.mjs']
        if os.environ.get('NGX_CHIP_BLUR_BOUNDARY_DIAGNOSTIC'):
            command.append(os.environ['NGX_CHIP_BLUR_BOUNDARY_DIAGNOSTIC'])
        child = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-12000:])
        result = json.loads(child.stdout)
        self.assertEqual((result['original_modules'], result['original_case_ids']), (1, 1))
        self.assertEqual((result['original_zone_subjects'], result['original_mutation_rejections']), (10, 36))
        self.assertEqual(result['rejection_controls'], 26)
        self.assertEqual(result['actual_original_module_executions'], 0)
        self.assertFalse(result['actual_current_source_native_packed_or_floor_qualified'])

    def test_original_assertions_loader_identity_and_exact_shared_engine_extension(self):
        data, prior = inputs(ROOT)
        for member in prior['originals']:
            original = subprocess.check_output(['git', '--no-replace-objects', 'show', data['frame']['commit'] + ':' + member['path']], cwd=ROOT)
            self.assertEqual(sha(original), member['sha256']); self.assertEqual(original.decode(), member['text'])
            if member['path'] != data['program']:
                self.assertEqual((ROOT / member['path']).read_bytes(), original)
        original = next(m['text'] for m in prior['originals'] if m['path'] == data['program'])
        assertions = [n for n in ast.walk(ast.parse(original)) if isinstance(n, ast.Call)
                      and isinstance(n.func, ast.Attribute) and n.func.attr.startswith('assert')]
        self.assertEqual(len(assertions), 5)
        wrapper = (ROOT / data['program']).read_bytes(); self.assertEqual(sha(wrapper), data['wrapper_sha256'])
        def ids(suite):
            result = []
            for item in suite:
                if isinstance(item, unittest.TestSuite): result.extend(ids(item))
                else: result.append(item.id())
            return sorted(result)
        normal = ids(unittest.TestLoader().loadTestsFromName(data['module']))
        discovery = ids(unittest.TestLoader().discover(str(ROOT / 'tests'), pattern='test_chip_blur_runtime.py'))
        self.assertEqual(normal, data['case_ids'])
        self.assertEqual([canonical_recorded_case(data, value) for value in discovery], data['case_ids'])
        for bad in ['foreign.' + normal[0], normal[0] + '.extra', 'tests.' + normal[0]]:
            with self.assertRaises(AssertionError): canonical_recorded_case(data, bad)
        text = prior['shared_engine_before']['text']
        self.assertEqual(sha(text.encode()), prior['shared_engine_before']['sha256'])
        for before, after in data['shared_engine_edits']:
            self.assertEqual(text.count(before), 1); text = text.replace(before, after)
        self.assertEqual(text, (ROOT / prior['shared_engine_before']['path']).read_text())
        for member in prior['protected']:
            self.assertEqual(sha((ROOT / member['path']).read_bytes()), member['sha256'])
        good = {'line': data['line'], 'id': data['id'], 'inputs_sha256': sha((ROOT / 'compatibility/rc/chip-blur-history-inputs.json').read_bytes()),
                'case_ids': data['case_ids'], 'selected_modules': [data['module']], 'current_guard_passed_before_and_after': True,
                'original_program_unchanged': True, 'historical_post_execution_clean': True, 'temporary_graph_removed': True,
                'actual_current_source_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'}
        validate_receipt(data, good)
        for mutate in [lambda body: body['case_ids'].clear(), lambda body: body.update(inputs_sha256='0' * 64),
                       lambda body: body.update(current_guard_passed_before_and_after=False),
                       lambda body: body.update(original_program_unchanged=False), lambda body: body.update(temporary_graph_removed=False),
                       lambda body: body.update(actual_current_source_native_packed_or_floor_qualified=True),
                       lambda body: body.update(g11_claim='passed')]:
            bad = copy.deepcopy(good); mutate(bad)
            with self.assertRaises(AssertionError): validate_receipt(data, bad)


if __name__ == '__main__':
    unittest.main()

# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Pure public helper admission; no component/browser/floor qualification."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class InheritedHelperExecution(unittest.TestCase):
    def test_genuine_helpers_and_actual_cli_corruptions(self):
        child = subprocess.run(['node', 'tests/inherited_helper_execution_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=150)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-9000:])
        report = json.loads(child.stdout.strip().splitlines()[-1])
        self.assertEqual(report['actual_CLI_scenarios'], 16)
        self.assertEqual(report['actual_helper_observation_inspection_controls'], 28)
        self.assertTrue(report['real_public_helper_execution'])
        self.assertFalse(report['actual_native_packed_or_floor_qualified'])

    def test_exact_finite_dispatch_extension_and_unchanged_reviews(self):
        read = lambda p: (ROOT / p).read_bytes()
        if (ROOT / 'compatibility/rc/content-observer-native-worksheet.json').exists():
            from tests.test_content_observer_native import project_content_observer_native_context
            _, read = project_content_observer_native_context(ROOT)
        task = json.loads(read('compatibility/rc/inherited-helper-execution-worksheet.json'))
        parent = task['source_parent']
        git = lambda *args: subprocess.check_output(['git', *args], cwd=ROOT)
        path = 'scripts/upstream-inherited-execution-evidence.mjs'
        previous = git('show', parent + ':' + path).decode()
        original_import = "import {bidiBehaviorRequirements, validateBidiBehavior} from './upstream-bidi-evidence.mjs';"
        added_import = "import {inheritedHelperRequirements, validateInheritedHelperExecution} from './upstream-inherited-helper-evidence.mjs';"
        original_guard = '    if (entry?.sha === TABLE_ONPUSH_SHA) {'
        added_guard = '    if (inheritedHelperRequirements(entry?.sha, line)) return validateInheritedHelperExecution({root, entry, proof, line});'
        self.assertEqual(previous.count(original_import), 1)
        self.assertEqual(previous.count(original_guard), 1)
        expected = previous.replace(original_import, original_import + '\n' + added_import).replace(original_guard, added_guard + '\n' + original_guard)
        self.assertEqual(read(path).decode(), expected)
        for member in ['compatibility/f10/disposition-ledger/ledger.json',
                       'scripts/screen-reader-event-use-review.mjs', 'scripts/aria-reference-use-review.mjs',
                       'scripts/key-manager-public-subjects.mjs', 'scripts/element-ref-use-review.mjs',
                       'tests/screen_reader_event_review_probe.mjs', 'tests/aria_reference_review_probe.mjs',
                       'compatibility/f10/authored-dependency-dispositions.json',
                       'compatibility/f10/authored-dependency-current-dispositions.json']:
            self.assertEqual(read(member), git('show', parent + ':' + member), member)
        self.assertEqual(git('diff', parent, '--name-only', '--', 'projects', 'testing', 'reference', 'fixtures'), b'')

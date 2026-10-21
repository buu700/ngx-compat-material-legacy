# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Original candidate tests run once as a full cohort; applied-source tests remain live."""
import gzip
import hashlib
import json
import os
from functools import lru_cache
from pathlib import Path
import subprocess
from tests.chip_recent_history import canonical_recorded_case

INPUT = 'compatibility/rc/dialog-caller-history-inputs.json'
PINS = {'main': 'b413c5360d78e80b3905a58ae1dffbd5b0d87e6fcb7cac35c2ca06fa6a2a3a2d', '21.x': '2fbde2774343ab60fe7e3dfa75dc4604f55b2c198ec16f61b4968d745125a53d'}
sha = lambda value: hashlib.sha256(value).hexdigest()


def candidate_history_inputs(root):
    raw = (root / INPUT).read_bytes()
    data = json.loads(raw)
    assert sha(raw) == PINS[data['line']]
    stored = (root / data['prior']['path']).read_bytes()
    assert sha(stored) == data['prior']['sha256']
    unpacked = gzip.decompress(stored)
    assert sha(unpacked) == data['prior']['raw_sha256']
    return data, json.loads(unpacked), sha(raw), sha(stored)


def validate_candidate_history_receipt(data, receipt):
    assert receipt['line'] == data['line'] and receipt['id'] == data['id']
    assert receipt['complete_registered_module_set'] is True
    assert receipt['selected_modules'] == [entry['module'] for entry in data['entries']]
    assert receipt['case_ids'] == data['case_ids']
    for name in ['current_guard_passed_before_and_after', 'original_program_unchanged',
                 'historical_post_execution_clean', 'temporary_graph_removed']:
        assert receipt[name] is True
    assert receipt['actual_current_source_native_packed_or_floor_qualified'] is False
    assert receipt['g11_claim'] == 'not-passed'


@lru_cache(maxsize=2)
def execute_candidate_history(root, registry_sha, prior_sha, head, report_dir):
    command = ['node', 'scripts/run-dialog-caller-history.mjs']
    if report_dir:
        command += ['--report', str(Path(report_dir) / 'dialog-candidate-source-models.json')]
    child = subprocess.run(command, cwd=root, capture_output=True, text=True, timeout=210)
    assert child.returncode == 0, (child.stdout + child.stderr)[-12000:]
    return child.stdout.strip().splitlines()[-1]


def assert_recorded_candidate_case(test, root, module, case_id):
    data, _, registry_sha, prior_sha = candidate_history_inputs(root)
    entries = [entry for entry in data['entries'] if entry['module'] == module]
    test.assertEqual(len(entries), 1)
    entry = entries[0]
    test.assertEqual(sha((root / entry['program']).read_bytes()), entry['wrapper_sha256'])
    canonical = canonical_recorded_case(entry, case_id)
    test.assertIn(canonical, data['case_ids'])
    for member in data['current_applied_test_programs']:
        test.assertEqual(sha((root / member['path']).read_bytes()), member['sha256'])
    head = subprocess.check_output(['git', '--no-replace-objects', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    result = json.loads(execute_candidate_history(str(root), registry_sha, prior_sha, head,
                        os.environ.get('NGX_DIALOG_CALLER_HISTORY_REPORT_DIR', '')))
    validate_candidate_history_receipt(data, result)

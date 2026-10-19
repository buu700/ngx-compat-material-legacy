# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Original complete chip-blur module; each call performs fresh coherence checks."""
import gzip
import hashlib
import json
import os
import subprocess
from tests.chip_recent_history import canonical_recorded_case

INPUT = 'compatibility/rc/chip-blur-history-inputs.json'
PINS = {'main': 'aa39d7ad27a3543cf6adde7615a66e3232b669acfdfee3a4f299bd61296e825c', '21.x': '41b62dfa9a05755c845ec1c78dcd7115677c0f11a92d11b506e2cbd816cd511e'}
sha = lambda raw: hashlib.sha256(raw).hexdigest()


def inputs(root):
    raw = (root / INPUT).read_bytes(); data = json.loads(raw)
    assert sha(raw) == PINS[data['line']], 'unknown chip-blur history inputs'
    packed = (root / data['prior']['path']).read_bytes()
    assert sha(packed) == data['prior']['sha256']
    unpacked = gzip.decompress(packed); assert sha(unpacked) == data['prior']['raw_sha256']
    return data, json.loads(unpacked)


def validate_receipt(data, result):
    assert result['line'] == data['line'] and result['id'] == data['id']
    assert result['inputs_sha256'] == PINS[data['line']]
    assert result['case_ids'] == data['case_ids']
    assert result['selected_modules'] == [data['module']]
    for flag in ['current_guard_passed_before_and_after', 'original_program_unchanged',
                 'historical_post_execution_clean', 'temporary_graph_removed']:
        assert result[flag] is True
    assert result['actual_current_source_native_packed_or_floor_qualified'] is False
    assert result['g11_claim'] == 'not-passed'


def assert_original_chip_blur(test, root, case_id):
    data, _ = inputs(root)
    test.assertEqual(sha((root / data['program']).read_bytes()), data['wrapper_sha256'])
    canonical_recorded_case(data, case_id)
    command = ['node', 'scripts/run-chip-blur-history.mjs']
    if os.environ.get('NGX_CHIP_BLUR_HISTORY_REPORT_DIR'):
        command.extend(['--report', str(root / os.environ['NGX_CHIP_BLUR_HISTORY_REPORT_DIR'] / 'chip-blur-original.json')])
    child = subprocess.run(command, cwd=root, capture_output=True, text=True, timeout=210)
    test.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-15000:])
    result = json.loads(child.stdout.strip().splitlines()[-1]); validate_receipt(data, result)

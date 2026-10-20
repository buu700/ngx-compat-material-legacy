# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""One complete original collector cohort, with fresh current byte checks."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
from functools import lru_cache
from tests.chip_recent_history import canonical_recorded_case
from tests.tab_portal_source_requalification import historical_source_members, historical_member_bytes

INPUT = 'compatibility/rc/packed-collector-history-inputs.json'
PINS = {'main': '69e8670d7349e45a273462387b9f1817223fd3367466c2e8a6f69282185f0f25',
        '21.x': 'c818f7f204d98b2bd173977edcff2e1b413674ef79afa94547a4bd5ba927a8ff'}
_sha = lambda b: hashlib.sha256(b).hexdigest()


def _raw(root, path):
    assert not root.is_symlink()
    parts = path.split('/')
    assert all(p and p not in {'.', '..'} for p in parts)
    member = root
    for part in parts:
        member = member/part
        assert not member.is_symlink()
    return member.read_bytes()


def _inputs(root):
    parent_members = historical_source_members(root, read_current=lambda member: _raw(root, member))
    raw = _raw(root, INPUT); data = json.loads(raw)
    assert _sha(raw) == PINS[data['line']]
    stored = _raw(root, data['prior']['path'])
    assert _sha(stored) == data['prior']['sha256']
    unpacked = gzip.decompress(stored)
    assert _sha(unpacked) == data['prior']['raw_sha256']
    for m in data['current_identical_subjects'] + data['protected'] + [data['matrix']]:
        assert _sha(historical_member_bytes(root, m['path'], parent_members, read_current=lambda member: _raw(root, member))) == m['sha256'], m['path']
    for m in data['entries']:
        assert _sha(_raw(root, m['program'])) == m['wrapper_sha256'], m['program']
    return data, json.loads(unpacked), _sha(raw), _sha(stored)


def validate_complete_collector_receipt(data, result):
    assert result['line'] == data['line'] and result['id'] == data['id']
    assert result['inputs_sha256'] == PINS[data['line']]
    assert result['case_ids'] == data['case_ids']
    assert result['current_collector_writer_probe_and_contract_identity_count'] == 14
    for flag in ['current_guard_passed_before_and_after', 'packed_check_unchanged',
                 'original_programs_unchanged', 'historical_post_execution_clean', 'temporary_graph_removed']:
        assert result[flag] is True
    assert result['actual_current_source_native_packed_or_floor_qualified'] is False
    assert result['g11_claim'] == 'not-passed'
    observations = result['node_observations']
    assert len(observations) == 6
    assert {m['probe'] for m in observations} == {e['probe'] for e in data['entries']}
    for observation in observations:
        summary = observation['summary']
        assert summary['line'] == data['line'] and summary['derived_cases'] == 106
        for key, value in summary.items():
            if key.startswith('actual_') or key == 'native_browser_executed':
                assert value is False


@lru_cache(maxsize=2)
def _execute(root, inputs_hash, prior_hash, head, report_dir):
    command = ['node', 'scripts/run-packed-collector-history.mjs']
    if report_dir:
        command.extend(['--report', str(Path(report_dir)/'packed-collector-history.json')])
    child = subprocess.run(command, cwd=root, capture_output=True, text=True, timeout=390)
    if child.returncode:
        raise AssertionError((child.stdout + child.stderr)[-20000:])
    return child.stdout.strip().splitlines()[-1]


def assert_recorded_collector_case(test, root, case_id):
    data, _, fingerprint, prior_hash = _inputs(root)
    delegated = [
        e for e in data['entries'] if case_id in {e['delegated_case_id'], e['delegated_case_id'].removeprefix('tests.')}]
    test.assertEqual(len(delegated), 1)
    test.assertIn(canonical_recorded_case(delegated[0], case_id), data['case_ids'])
    head = subprocess.check_output(['git', '--no-replace-objects', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    result = json.loads(_execute(str(root), fingerprint, prior_hash, head,
                               os.environ.get('NGX_PACKED_COLLECTOR_HISTORY_REPORT_DIR', '')))
    validate_complete_collector_receipt(data, result)

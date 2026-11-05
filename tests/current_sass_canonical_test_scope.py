# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact registry comparison data; no historical source module is executed."""
import hashlib
import gzip
import json
import os
import re
import subprocess
from pathlib import Path

REGISTRY = 'scripts/upstream-source-contract-registry.mjs'
CURRENT = 'be50b37d181b43960361860dd7cb3bb24d0f2d1b0a2ecfaa5a85a791e4869399'
HISTORICAL = '03a18cd09e4183f4307f1ec2c17d0797eea72db0440e23530e4d015ea0dae6a8'
RECORDS = (
    b"  {sha:'f7e3ae3bd1b86d5987df57bb06d350001c592931',proof_kind:'individual-historical-legacy-removal-source-exclusion',\n"
    b"    scope_key:'legacy_removal_source_scope',module:'upstream-legacy-removal-admission.cjs'},\n",
    b"  {sha:'3f35b12290ea4dbee4a9d82845c0964b2b4df50d',proof_kind:'individual-historical-table-local-compilation-source-review',\n"
    b"    scope_key:'table_local_compilation_source_scope',module:'upstream-table-local-compilation-admission.cjs'},\n",
)
BASE_RECORD = (
    b"  {sha:'55f9618b687fc0da4743a3cf27e113ceb837e151',proof_kind:'individual-historical-base-class-removal-source-review',\n"
    b"    scope_key:'base_class_removal_source_scope',module:'upstream-base-class-removal-admission.cjs'},\n"
)
BASE_CURRENT = 'e90d2268e862284605dd9b4f5630c0d9d84976f6014679d1aa4acbc47f38c4cc'
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PROPOSAL = 'compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json'
PROPOSAL_SHA = '720a4fcd0c9d0d67afbeddd106fc9741d7ab34a0848edc1a0f2e6a25019b9881'
SOURCE_PARENT = 'd8ab97315b6c77b83f42c2bebcf63b2984fff255'


def _physical(root, path):
    cursor = Path(root)
    assert cursor.is_dir() and not cursor.is_symlink()
    for part in path.split('/'):
        assert part not in ('', '.', '..')
        cursor = cursor / part
        assert not cursor.is_symlink()
    assert cursor.is_file()
    return cursor.read_bytes()


def _git_data(root, path):
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0',
        '-c', 'maintenance.auto=0', 'show', SOURCE_PARENT + ':' + path], cwd=root, env=env)


def _proposal(root, bound):
    raw = _physical(root, PROPOSAL)
    assert len(raw) == 3578 and hashlib.sha256(raw).hexdigest() == PROPOSAL_SHA
    bound[PROPOSAL] = raw
    return json.loads(raw)


def _image(root, ref, bound):
    raw = _physical(root, ref['path'])
    assert len(raw) == ref['bytes'] and hashlib.sha256(raw).hexdigest() == ref['sha256']
    bound[ref['path']] = raw
    return gzip.decompress(raw)


def current_canonical_registry_subject(root):
    """Authenticate only current69/70; old67/69 programs are comparison DATA."""
    bound = {}
    packet = _proposal(root, bound)
    before = _image(root, packet['registry_before_image'], bound)
    after = _image(root, packet['registry_after_image'], bound)
    assert len(before) == 15548 and hashlib.sha256(before).hexdigest() == CURRENT
    assert len(after) == 15768 and hashlib.sha256(after).hexdigest() == BASE_CURRENT
    assert _git_data(root, REGISTRY) == before
    assert before.count(b'];\n') == 1
    assert before.replace(b'];\n', BASE_RECORD + b'];\n') == after
    raw = _physical(root, REGISTRY)
    assert raw in (before, after), 'unqualified current registry'
    bound[REGISTRY] = raw
    count = 69 if raw == before else 70

    def assert_current():
        for path, expected in bound.items():
            assert _physical(root, path) == expected, 'changed current test subject ' + path
    assert_current()
    return dict(raw=raw, comparison69=before, registered_source_contracts=count,
                assert_current=assert_current)


def current_canonical_test_frame(root):
    """Exact426/69,426/70 precursor or427/70; comparison bytes carry no authority."""
    registry = current_canonical_registry_subject(root)
    bound = {}
    packet = _proposal(root, bound)
    before = _image(root, packet['ledger_before_image'], bound)
    after = _image(root, packet['ledger_after_image'], bound)
    for name, raw in [('before', before), ('after', after)]:
        assert len(raw) == packet[name]['bytes']
        assert hashlib.sha256(raw).hexdigest() == packet[name]['sha256']
    assert _git_data(root, LEDGER) == before
    target = packet['sha']
    def span(raw):
        text = raw.decode()
        decoder = json.JSONDecoder()
        found = []
        for marker in re.finditer(r'^    \{', text, re.M):
            start = marker.start() + 4
            row, end = decoder.raw_decode(text, start)
            if row.get('sha') == target:
                found.append((start, end, row))
        assert len(found) == 1
        return text, found[0]
    old, (start, end, _) = span(before)
    new, (new_start, new_end, _) = span(after)
    expected = old[:start] + new[new_start:new_end] + old[end:]
    for key, prior, current in [('closed_dispositions', 426, 427), ('open_or_deferred', 1271, 1270)]:
        token = f'  "{key}": {prior},'
        assert expected.count(token) == 1
        expected = expected.replace(token, f'  "{key}": {current},', 1)
    assert expected.encode() == after  # All1696 unselected entry bytes remain exact.
    raw = _physical(root, LEDGER)
    assert raw in (before, after), 'unqualified current test ledger'
    assert raw != after or registry['registered_source_contracts'] == 70
    bound[LEDGER] = raw

    def assert_current():
        registry['assert_current']()
        for path, expected_raw in bound.items():
            assert _physical(root, path) == expected_raw, 'changed current test frame ' + path
    def comparison(path, supplied):
        assert_current()
        assert path in (LEDGER, REGISTRY)
        assert supplied == (raw if path == LEDGER else registry['raw'])
        return before if path == LEDGER else registry['comparison69']
    assert_current()
    return dict(comparison=comparison, assert_current=assert_current,
                registered_source_contracts=registry['registered_source_contracts'],
                individual_source_reviews=91 if raw == after else 90,
                base_class_decisions=1 if raw == after else 0)


def historical67_registry_bytes(root):
    """Authenticate current69/70, retain exact69→67 assertions on comparison DATA."""
    subject = current_canonical_registry_subject(root)
    raw = subject['comparison69']
    assert len(raw) == 15548 and hashlib.sha256(raw).hexdigest() == CURRENT
    comparison = raw
    for record in reversed(RECORDS):
        assert comparison.count(record) == 1
        comparison = comparison.replace(record, b'')
    assert hashlib.sha256(comparison).hexdigest() == HISTORICAL
    assert comparison.count(b'];\n') == 1
    expected = comparison
    for record in RECORDS:
        expected = expected.replace(b'];\n', record + b'];\n')
    assert expected == raw
    subject['assert_current']()
    return comparison

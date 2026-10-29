# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent finite current tool authentication and private predecessor data."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
from historical_contract_repair_source import tool_comparison_bytes, qualify_tool_reference

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'compatibility/rc/21x-table-local-compilation-admission-'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def table_owner_source_data(root=ROOT):
    module = (root / 'scripts/table-local-compilation-owner-source.mjs').read_text()
    pins = re.findall(r"^const PIN='([0-9a-f]{64})';$", module, re.M)
    assert len(pins) == 1
    raw = (root / (PREFIX + 'owner-inputs.json')).read_bytes()
    assert digest(raw) == pins[0]
    packet = json.loads(raw)
    assert packet['line'] == '21.x' and packet['old_program_executed'] is False
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    transitions = {}
    for row in packet['code_transitions']:
        path = row['before']['path']
        assert path == row['after']['path'] and path not in transitions
        before = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', 'show', packet['source_parent'] + ':' + path], cwd=root, env=env)
        assert digest(before) == row['before']['sha256'] and len(before) == row['before']['bytes']
        expected = before.decode()
        for edit in row['literal_edits']:
            assert expected.count(edit['before']) == 1
            expected = expected.replace(edit['before'], edit['after'])
        after = tool_comparison_bytes(row['after'], root)
        assert after == expected.encode()
        assert digest(after) == row['after']['sha256'] and len(after) == row['after']['bytes']
        transitions[path] = row
    assert len(transitions) == packet['code_transition_count']
    for ref in packet['source_members']:
        value = tool_comparison_bytes(ref, root)
        assert digest(value) == ref['sha256'] and len(value) == ref['bytes']
    return packet, transitions


def qualify_table_owner_reference(ref, root=ROOT):
    _, transitions = table_owner_source_data(root)
    if ref['path'] not in transitions:
        return qualify_tool_reference(ref, root)
    row = transitions[ref['path']]
    prior = next((value for value in [row['before'], row['after']] if value['sha256'] == ref['sha256']), None)
    if prior is None:
        return qualify_tool_reference(ref, root)
    if 'bytes' in ref:
        assert ref['bytes'] == prior['bytes']
    return qualify_tool_reference({**ref, **row['after']}, root)


def table_predecessor_data(path, raw, root=ROOT):
    packet, _ = table_owner_source_data(root)
    names = {'compatibility/f10/disposition-ledger/ledger.json': 'ledger',
             'scripts/upstream-source-contract-registry.mjs': 'registry',
             'compatibility/rc/21x-remaining-disposition-worksheet.json': 'roster'}
    if path not in names:
        return raw
    name = names[path]
    before_ref, after_ref = packet[name + '_before_image'], packet[name + '_after_image']
    before_raw, after_raw = (root / before_ref['path']).read_bytes(), (root / after_ref['path']).read_bytes()
    assert digest(before_raw) == before_ref['sha256'] and digest(after_raw) == after_ref['sha256']
    before, after = gzip.decompress(before_raw), gzip.decompress(after_raw)
    return before if raw == after else raw

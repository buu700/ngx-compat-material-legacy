# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Reverse exactly five inserted byte ranges, independently of the TS reader."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SHA = lambda raw: hashlib.sha256(raw).hexdigest()
line = '21.x' if json.loads((ROOT / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
raw = (ROOT / 'compatibility/rc/autocomplete-selection-spec-successor.json').read_bytes()
assert SHA(raw) == {'main': 'bf629b45cf65bc93a98a43a9f7fc2d0fb9cf720cc72c07d9c8545c60ee1e10a3',
                    '21.x': '7351ca1bb38ed03c8487db227d73194d94383941ca310a64604b0516188e33a5'}[line]
packet = json.loads(raw)
assert packet['line'] == line and packet['original_tokens_or_assertions_removed'] == 0
assert packet['path'] == 'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts'
parent = {'main': '589891e611bf4effe62b0ffe3e0af1a9c2bae6c1', '21.x': 'c0c75460214cc7e52d263edf28883fa0c6a8d5c5'}[line]
assert packet['source_parent'] == parent
env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
    env.pop(key, None)
before = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                                  'show', parent + ':' + packet['path']], cwd=ROOT, env=env)
assert SHA(before) == packet['before']['sha256'] == '09a96761ccbb96309989dfc13517170c3600fb2bd57b3fb7e9c9cb02f788d423'
current = (ROOT / packet['path']).read_bytes()
assert SHA(current) == packet['after']['sha256'] and len(current) == packet['after']['bytes']
assert len(packet['insertions']) == 5 and packet['complete_historical_cases'] == 2236
assert packet['actual_Angular_native_browser_or_artifact_execution'] is False
ordered = sorted(packet['insertions'], key=lambda row: row['byte_offset'])
assert len({row['byte_offset'] for row in ordered}) == 5
removed = current
for row in reversed(ordered):
    offset = row['byte_offset'] + sum(len(previous['text'].encode()) for previous in ordered if previous['byte_offset'] < row['byte_offset'])
    text = row['text'].encode()
    assert removed[offset:offset + len(text)] == text
    removed = removed[:offset] + removed[offset + len(text):]
assert removed == before
report = dict(line=line, independent_direction='current bytes minus exact insertion ranges reconstruct authenticated Git original',
              inserted_ranges=5, every_original_byte_retained=True, full_current_historical_case_count=2236,
              source_before_sha256=SHA(before), source_after_sha256=SHA(current),
              native_or_full_source_admission_qualified=False)
if len(sys.argv) > 1:
    with open(sys.argv[1], 'x') as output:
        output.write(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))

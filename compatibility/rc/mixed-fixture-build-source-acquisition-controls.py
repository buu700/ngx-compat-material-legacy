# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Reject expansion beyond the exact four complete mixed-source populations."""
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2])
producer = root / 'scripts/acquire-mixed-fixture-build-originals.py'
spec = importlib.util.spec_from_file_location('mixed_fixture_build_reader', producer)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
worksheet = json.loads((root / 'compatibility/rc/mixed-fixture-build-source-worksheet.json').read_text())
census = json.loads(gzip.decompress((root / module.CENSUS).read_bytes()))
selected = module.select_subjects(worksheet, census)
assert len(selected) == 4 and sum(len(n['complete_changed_files']) for n in selected) == 12
cases = []


def reject(name, action):
    try:
        action()
    except AssertionError:
        cases.append({'id': name, 'result': 'rejected'})
    else:
        raise AssertionError('selector accepted ' + name)


other = copy.deepcopy(worksheet)
other['subjects'][-1] = census['commits'][0]['sha']
reject('unsupported-subject-set', lambda: module.select_subjects(other, census))
other = copy.deepcopy(census)
row = next(n for n in other['commits'] if n['sha'] == worksheet['subjects'][0])
row['complete_changed_files'][0]['path'] = 'src/cdk/observers/foreign.ts'
reject('foreign-path', lambda: module.select_subjects(worksheet, other))
other = copy.deepcopy(census)
row = next(n for n in other['commits'] if n['sha'] == worksheet['subjects'][0])
row['complete_changed_files'].pop()
reject('filtered-complete-population', lambda: module.select_subjects(worksheet, other))
other = copy.deepcopy(census)
row = next(n for n in other['commits'] if n['sha'] == worksheet['subjects'][0])
row['complete_changed_files'][0]['after_mode'] = '120000'
reject('symlink-mode', lambda: module.select_subjects(worksheet, other))
other = copy.deepcopy(worksheet)
other['line'] = '21.x' if worksheet['line'] == 'main' else 'main'
reject('foreign-maintained-line', lambda: module.select_subjects(other, census))
report = {'schema_version': 1, 'line': worksheet['line'], 'subjects': 4, 'complete_files': 12,
          'negative_controls': len(cases), 'cases': cases,
          'producer': {'path': 'scripts/acquire-mixed-fixture-build-originals.py',
                       'sha256': hashlib.sha256(producer.read_bytes()).hexdigest()},
          'source_acquisition_selection_only': True, 'actual_native_or_floor_qualified': False,
          'g11_claim': 'not-passed'}
with out.open('x') as output:
    output.write(json.dumps(report, indent=2) + '\n')
print(json.dumps({'line': worksheet['line'], 'controls': len(cases), 'complete_files': 12}))

# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Check the separately owned exact-four selector; execute no acquired source."""
import argparse
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root', required=True, type=Path)
parser.add_argument('--out', required=True, type=Path)
args = parser.parse_args()
root = args.root

def module(path, name):
    spec = importlib.util.spec_from_file_location(name, root / path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result

old_path = 'scripts/acquire-upstream-spec-originals.py'
new_path = 'scripts/acquire-final-fixture-originals.py'
assert hashlib.sha256((root / old_path).read_bytes()).hexdigest() == 'f3aaeddf694d07b9fc9f96615d6d46e1ae56e29b5b6a4f2e44d11a0ed2d9dac4'
old = module(old_path, 'original_src_only_reader')
new = module(new_path, 'exact_final_four_reader')
worksheet = json.loads((root / 'compatibility/rc/spec-final-fixture-source-worksheet.json').read_text())
census = json.loads(gzip.decompress((root / new.CENSUS).read_bytes()))
selected = new.select_subjects(worksheet, census)
assert len(selected) == 4 and sum(len(n['complete_changed_files']) for n in selected) == 84
controls = []
for kind in ['unsupported-subject-set', 'foreign-doc-path', 'doc-path-on-wrong-commit', 'original-src-boundary-preserved']:
    w, c = copy.deepcopy(worksheet), copy.deepcopy(census)
    reader = new
    if kind == 'unsupported-subject-set':
        w['subjects'].pop()
    elif kind == 'foreign-doc-path':
        next(n for n in c['commits'] if n['sha'] == w['subjects'][1])['complete_changed_files'][0]['path'] = 'material.angular.io/unreviewed.spec.ts'
    elif kind == 'doc-path-on-wrong-commit':
        next(n for n in c['commits'] if n['sha'] == w['subjects'][0])['complete_changed_files'][0]['path'] = sorted(new.DOCS_TEST_PATHS)[0]
    else:
        reader = old
    try:
        reader.select_subjects(w, c)
    except AssertionError:
        controls.append({'id': kind, 'result': 'rejected'})
    else:
        raise AssertionError(kind + ' was accepted')
report = {'schema_version': 1, 'line': worksheet['line'], 'subjects': 4, 'complete_files': 84,
          'controls': len(controls), 'cases': controls, 'original_producer_unchanged': True,
          'producer': {'path': new_path, 'sha256': hashlib.sha256((root / new_path).read_bytes()).hexdigest()},
          'actual_upstream_source_or_native_or_floor_executed': False, 'g11_claim': 'not-passed'}
with args.out.open('x') as output:
    output.write(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k != 'cases'}))

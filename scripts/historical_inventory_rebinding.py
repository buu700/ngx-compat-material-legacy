#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Verify the finite13-member current-source inventory successor; never execute tests."""
from __future__ import annotations
import copy
from select_dialog_finite_source_successor import make_finite_product_successor
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = 'testing/legacy-runner/historical-inventory.json'
SELECTION = 'testing/legacy-runner/historical-specs.json'
REFERENCE = 'compatibility/handoff/codex-closeout/reference/historical-paths.csv'
REFERENCE_SHA256 = '33e24c7a3350004bda35236d5e643ae0d6f67bad5149faaf85e81cd108368d74'
CANDIDATE = 'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.spec.ts'
HARNESS_INPUTS = 'compatibility/rc/harness-animation-preparation-current-inputs.json'
HARNESS_INPUTS_SHA256 = 'c6a7cf8d01a03cc5f620f49a396bf7156290ec39baba5450e51cd7d2646836ce'
PINS = {
    'main': {'parent': '1acfa9280ef19f3c8c60ddbff19b45b0c2a185ec',
             'inventory_sha256': '89e7770f51357cd8544c7df10a3ba9c538bcc66f3040e3d45434634308616832',
             'empty_selection': '4221697247dc7e06478a9397d9b31b6c5253e9ff',
             'selection_assertions': '8b2a12324f3fbfd02d970654b98fe9e7f86469c9',
             'harness': 'f6f0433d3f2fdc0854d2e94449b2706da82b92e0'},
    '21.x': {'parent': '97bdcbed054d714841db8f2446ade83b953cd5e0',
             'inventory_sha256': '2698f53be977b484aec2aaf3f9f052fc9b0bc4cd28632acc2ef5481b3ca4f724',
             'empty_selection': '2db51eee7acadc90585fcda197c99bc505ba9f15',
             'selection_assertions': 'd2f52bc32ab8e53ae0dd396b116ae5f59a619f12',
             'harness': '86bcffb62af23ce56e3cced061a971ce6e832790'},
}
CANDIDATE_SHA256 = [
    '9fa9e54e3f7cc9ee9a7a7b236e3b14e28ee1b824312b026361c51fbcb912e1d9',
    '09a96761ccbb96309989dfc13517170c3600fb2bd57b3fb7e9c9cb02f788d423',
    '2610d311569c9a6fdb063dc0652b423414622cf1370b2434f13ba86070293236',
]


def need(condition, message):
    if not condition:
        raise ValueError(message)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def encoded(value):
    return (json.dumps(value, indent=2) + '\n').encode()


def git(root, *args):
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0',
                                    '-c', 'maintenance.auto=0', *args], cwd=root, env=env)


def expected_successor(root=ROOT, *, read_member=None):
    """Authenticate current bytes from fixed branch-native committed transitions."""
    read = read_member or (lambda path: (root / path).read_bytes())
    version = json.loads(read('projects/ngx-material-legacy/package.json'))['version']
    line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
    need(line in PINS, 'unrecognized actual package line')
    qualify_product, product_sweep = make_finite_product_successor(root)
    pins = PINS[line]
    old_raw = git(root, 'show', pins['parent'] + ':' + INVENTORY)
    need(sha(old_raw) == pins['inventory_sha256'], 'changed immutable inventory parent')
    before = json.loads(old_raw)
    need(before['candidate_snapshot']['line'] == line, 'inventory line mismatch')
    need(sha(read(REFERENCE)) == REFERENCE_SHA256, 'frozen historical reference changed')
    for path in [REFERENCE, SELECTION, 'scripts/historical_inventory_source.py']:
        need(read(path) == git(root, 'show', pins['parent'] + ':' + path), 'protected source changed: ' + path)
    input_raw = read(HARNESS_INPUTS)
    need(sha(input_raw) == HARNESS_INPUTS_SHA256, 'finite harness input map changed')
    harness = json.loads(input_raw)['members']
    need(len(harness) == 12 and len({r['path'] for r in harness}) == 12, 'finite shim membership changed')
    changed_shims = git(root, 'diff', '--name-only', pins['harness'] + '^', pins['harness'], '--',
                        'testing/legacy-runner/shims/harness').decode().splitlines()
    need(changed_shims == [r['path'] for r in harness], 'shim transition includes an unreviewed file')
    candidate_refs = [pins['empty_selection'] + '^', pins['empty_selection'], pins['selection_assertions']]
    candidate_frames = [git(root, 'show', ref + ':' + CANDIDATE) for ref in candidate_refs]
    need([sha(raw) for raw in candidate_frames] == CANDIDATE_SHA256, 'autocomplete source transition changed')
    need(candidate_frames[1] == git(root, 'show', pins['selection_assertions'] + '^:' + CANDIDATE),
         'unreviewed intermediate autocomplete source delta')
    need(read(CANDIDATE) == candidate_frames[2], 'current autocomplete differs from reviewed source')
    targets = [{'section': 'rows', 'path': CANDIDATE, 'before_sha256': CANDIDATE_SHA256[0],
                'after_sha256': CANDIDATE_SHA256[2], 'transition_commits': candidate_refs[1:]}]
    for member in harness:
        path = member['path']
        old = git(root, 'show', pins['harness'] + '^:' + path)
        after = git(root, 'show', pins['harness'] + ':' + path)
        need(sha(old) == member['before_sha256'], 'shim preimage mismatch: ' + path)
        need(sha(after) == member['after_sha256'], 'shim successor mismatch: ' + path)
        need(read(path) == after, 'current shim differs from reviewed source: ' + path)
        targets.append({'section': 'shared_suite_shims', 'path': path, 'before_sha256': sha(old),
                        'after_sha256': sha(after), 'transition_commits': [pins['harness']]})
    stale = []
    for section, path_key, hash_key in [('rows', 'candidate', 'candidate_sha256'), ('shared_suite_shims', 'path', 'sha256')]:
        for row in before[section]:
            if sha(read(row[path_key])) != qualify_product(row[path_key], row[hash_key]):
                stale.append((section, row[path_key], row[hash_key], sha(read(row[path_key]))))
    need(stale == [(t['section'], t['path'], t['before_sha256'], t['after_sha256']) for t in targets],
         'stale source population differs from the reviewed13-member cohort')
    expected = copy.deepcopy(before)
    for target in targets:
        section = target['section']
        key, hash_key = ('candidate', 'candidate_sha256') if section == 'rows' else ('path', 'sha256')
        row = next(row for row in expected[section] if row[key] == target['path'])
        need(row[hash_key] == target['before_sha256'], 'wrong prior current binding')
        if section == 'rows':
            need(row['execution']['bound_to_current_head'] is False, 'cannot carry current execution to changed sources')
            snapshot = {k: copy.deepcopy(row[k]) for k in ['candidate_sha256', 'adaptation', 'execution']}
            snapshot.update(current_source_binding=False,
                            reason='Prior current identity retained before the two authenticated autocomplete source transitions; no execution credit.')
            row.setdefault('prior_candidate_snapshots', []).append(snapshot)
        else:
            row.setdefault('prior_source_snapshots', []).append({'sha256': row[hash_key], 'current_source_binding': False,
                'reason': 'Prior source identity retained before the authenticated owned no-op provider preparation; no execution credit.'})
        row[hash_key] = target['after_sha256']
    identical = [row['candidate'] for row in before['rows'] if sha(read(row['candidate'])) == row['historical_sha256']]
    need(identical == [row['candidate'] for row in before['rows'] if row['adaptation'] == 'identical-to-historical'],
         'candidate adaptation labels differ from untouched historical identities')
    need(len(identical) == 2, 'reviewed identity census changed')
    old_summary = {key: before['counts'][key] for key in ['identical_to_historical', 'adapted']}
    need(old_summary == {'identical_to_historical': 3, 'adapted': 54}, 'unreviewed prior adaptation summary')
    expected['counts'].update(identical_to_historical=2, adapted=55)
    expected['candidate_snapshot']['source_binding_refreshes'] = [{
        'role': 'Exact current source identity repair only; original reference and execution claims unchanged',
        'source_parent': pins['parent'], 'before_inventory_sha256': pins['inventory_sha256'], 'members': targets,
        'current_source_bindings_changed': 13, 'historical_reference_identities_changed': 0,
        'prior_adaptation_summary': old_summary, 'derived_adaptation_summary': {'identical_to_historical': 2, 'adapted': 55},
        'unchanged_identical_candidates': identical, 'derived_summary_scalars_changed': 2,
        'execution_claims_changed': 0, 'actual_Angular_native_packed_or_floor_qualified': False, 'g11_claim': 'not-passed'}]
    product_sweep()
    return expected, {'line': line, 'source_parent': pins['parent'], 'before_inventory_sha256': sha(old_raw),
                      'members': targets, 'historical_paths': 57, 'shared_shims': 21,
                      'source_bindings_changed': 13, 'derived_summary_scalars_changed': 2,
                      'unchanged_identical_candidates': identical, 'execution_claims_changed': 0,
                      'actual_native_packed_browser_floor_or_full_audit_qualified': False, 'g11_claim': 'not-passed'}


def validate_inventory_bytes(actual, expected):
    need(actual == encoded(expected), 'inventory is not the exact authenticated13-member metadata successor')


def verify_inventory_successor(root=ROOT, *, read_member=None):
    read = read_member or (lambda path: (root / path).read_bytes())
    expected, proof = expected_successor(root, read_member=read)
    actual = read(INVENTORY)
    validate_inventory_bytes(actual, expected)
    proof.update(current_inventory_sha256=sha(actual), current_inventory_bytes=len(actual))
    return proof


if __name__ == '__main__':
    print(json.dumps(verify_inventory_successor(), indent=2))

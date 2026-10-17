# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Read-only proof that native refresh changes only reviewed source hashes/locators."""
import argparse
import copy
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
root, prefix = args.root, 'compatibility/rc/bootstrap-stability-'
digest = lambda raw: hashlib.sha256(raw).hexdigest()
read_json = lambda path: json.loads((root / path).read_text())
before = json.loads(gzip.decompress((root / (prefix + 'before.json.gz')).read_bytes()))
native_before = json.loads(gzip.decompress((root / (prefix + 'native-input-before.json.gz')).read_bytes()))
refresh = read_json(prefix + 'native-input-refresh.json')
ledger = read_json('compatibility/f10/disposition-ledger/ledger.json')
base = json.loads(subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0',
                  'show', before['source_parent'] + ':compatibility/f10/disposition-ledger/ledger.json'], cwd=root))
current = {n['sha']: n for n in ledger['entries']}
assert len(native_before['native_entries']) == len(refresh['entries']) == 14
changes = {n['sha']: n for n in refresh['entries']}
for old in native_before['native_entries']:
    entry = current[old['sha']]
    inverse = copy.deepcopy(entry['individual_proof'])
    for member in changes[old['sha']]['member_changes']:
        assert member['path'] in ['scripts/check-upstream-audit-disposition.mjs', 'testing/legacy-runner/init-test-env.ts']
        assert digest((root / member['path']).read_bytes()) == member['current_sha256']
        target = next(n for n in inverse[member['scope']]['source_members'] if n['path'] == member['path'])
        assert target['sha256'] == member['current_sha256']
        target['sha256'] = member['before_sha256']
    assert inverse == old['individual_proof'], 'native kind, case scope, member paths or execution witness changed'
    assert {k: v for k, v in entry.items() if k not in ['individual_proof', 'evidence_report', 'source_check']} == {
        k: v for k, v in old.items() if k not in ['individual_proof', 'evidence_report', 'source_check']}
    body = read_json(entry['evidence_report'])
    assert body['individual_proof'] == entry['individual_proof']
    assert body['actual_current_native_or_floor_qualified'] is False
    assert digest((root / entry['evidence_report']).read_bytes()) == entry['source_check']['evidence_report_sha256']
    original = changes[old['sha']]['original_source_report']
    assert digest((root / original['path']).read_bytes()) == original['sha256']
    original_body = read_json(original['path'])
    assert {k: v for k, v in body.items() if k not in ['individual_proof', 'bootstrap_stability_input_refresh', 'actual_current_native_or_floor_qualified']} == {
        k: v for k, v in original_body.items() if k not in ['individual_proof', 'bootstrap_stability_input_refresh', 'actual_current_native_or_floor_qualified']}
source_ids = {n['sha'] for n in before['affected_source_receipts']}
native_ids = {n['sha'] for n in native_before['native_entries']}
assert not source_ids & native_ids
selected = source_ids | native_ids
assert len(selected) == 23
assert [n for n in ledger['entries'] if n['sha'] not in selected] == [n for n in base['entries'] if n['sha'] not in selected]
assert {k: v for k, v in ledger.items() if k != 'entries'} == {k: v for k, v in base.items() if k != 'entries'}
assert all(current[n['sha']]['final_disposition'] == n['final_disposition'] and current[n['sha']]['reason'] == n['reason']
           for n in base['entries'])
report = {'schema_version': 1, 'line': before['line'], 'current_native_bindings_refreshed': 14,
          'all_native_proof_fields_exact_except_two_reviewed_member_hashes': True,
          'native_source_member_paths_case_ids_kinds_installed_members_and_execution_witnesses_exact': True,
          'all_native_original_source_reports_unchanged': True, 'source_receipts_separately_qualified': 9,
          'other1674_ledger_entries_exact': True, 'all1697_source_conclusions_and_other_ledger_metadata_exact': True,
          'actual_native_or_floor_qualified': False, 'g11_claim': 'not-passed'}
with args.out.open('x') as output:
    output.write(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))

# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Observer source-development controls; the native Actions run remains required."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
EDIT_HASH = '604125db25a73e20b51ae195a9d6eefb9decbc5512d56eb32723c06d6dbb1547'


def project_content_observer_native_context(root, read_member=None):
    """Verify the complete current transition before projecting prior snapshots.

    This preserves the older task's exact assertions. It never qualifies a
    native run, changes an original expectation or admits an unrelated delta.
    """
    read = read_member or (lambda p: (root / p).read_bytes())
    if (root / 'compatibility/rc/content-observer-admission-worksheet.json').exists():
        from tests.test_content_observer_admission import project_observer_admission_context
        _, read = project_observer_admission_context(root, read)
    load = lambda p: json.loads(read(p))
    digest = lambda raw: hashlib.sha256(raw).hexdigest()
    task = load('compatibility/rc/content-observer-native-worksheet.json')
    parent = task['source_parent']
    git = lambda *args: subprocess.check_output(['git', *args], cwd=root)
    prior_path = 'compatibility/rc/content-observer-native-context-prior.json.gz'
    raw = read(prior_path)
    prior = json.loads(gzip.decompress(raw))
    assert prior['source_parent'] == parent
    before = prior['changed_source']
    assert before['path'] == 'scripts/browser-surface-families.mjs'
    assert digest(before['text'].encode()) == before['sha256']
    assert git('show', parent + ':' + before['path']) == before['text'].encode()
    edits_path = 'compatibility/rc/content-observer-native-source-edits.json'
    assert digest(read(edits_path)) == EDIT_HASH
    edits = load(edits_path)
    text = before['text']
    for edit in edits['edits']:
        assert text.count(edit['before']) == edit['occurrences']
        text = text.replace(edit['before'], edit['after'])
    assert read(before['path']).decode() == text
    actual = load('compatibility/f10/disposition-ledger/ledger.json')
    recovered = copy.deepcopy(actual)
    original = json.loads(git('show', parent + ':compatibility/f10/disposition-ledger/ledger.json'))
    rows = {entry['sha']: entry for entry in recovered['entries']}
    assert len(prior['rows']) == 3
    assert {row['sha'] for row in prior['rows']} == {
        'cf3506adf1af1556d705dbb651e7e96a7141b81d', '878700d10ab042b6a62c6f86f4fcc24d5a0ae685',
        'cf456a2d43837497367662e7de22f1b2bcbf4f00'}
    for row in prior['rows']:
        old_entry = row['entry']
        original_entry = next(entry for entry in original['entries'] if entry['sha'] == row['sha'])
        assert old_entry == original_entry
        active = rows[row['sha']]
        expected_entry = copy.deepcopy(old_entry)
        members = expected_entry['individual_proof'][row['field']]['source_members']
        selected = [m for m in members if m['path'] == before['path']]
        assert len(selected) == 1 and selected[0]['sha256'] == before['sha256']
        selected[0]['sha256'] = digest(read(before['path']))
        expected_entry['evidence_report'] = active['evidence_report']
        assert active == expected_entry
        current_review = load(active['evidence_report'])
        context = current_review.pop('content_observer_native_source_context')
        assert context == {
            'prior': {'path': prior_path, 'sha256': digest(raw)},
            'prior_review': {'path': old_entry['evidence_report'], 'sha256': digest(read(old_entry['evidence_report']))},
            'changed_source': {'path': before['path'], 'before_sha256': before['sha256'], 'after_sha256': digest(read(before['path']))},
            'fixture': {'path': 'scripts/content-observer-native-contract.mjs', 'sha256': digest(read('scripts/content-observer-native-contract.mjs'))},
            'existing_predicates_and_required_runtime_cases_unchanged': True,
            'actual_native_packed_or_floor_qualified': False}
        assert json.loads(git('show', parent + ':' + old_entry['evidence_report'])) == row['review']
        assert load(old_entry['evidence_report']) == row['review']
        expected_review = copy.deepcopy(row['review'])
        expected_review['individual_proof'] = active['individual_proof']
        assert current_review == expected_review
        for member in active['individual_proof'][row['field']]['source_members']:
            assert digest(read(member['path'])) == member['sha256']
        rows[row['sha']] = copy.deepcopy(old_entry)
    recovered['entries'] = [rows[entry['sha']] for entry in recovered['entries']]
    assert recovered == original
    assert len(recovered['entries']) == 1697
    for member in ['compatibility/rc/matrices/full-verify.json', 'compatibility/f10/authored-dependency-dispositions.json',
                   'compatibility/f10/authored-dependency-current-dispositions.json']:
        assert read(member) == git('show', parent + ':' + member)
    assert git('diff', parent, '--name-only', '--', 'projects', 'testing', 'reference', 'fixtures') == b''
    ledger_path = 'compatibility/f10/disposition-ledger/ledger.json'
    original_ledger_bytes = git('show', parent + ':' + ledger_path)
    return recovered, lambda p: (before['text'].encode() if p == before['path'] else
                                 original_ledger_bytes if p == ledger_path else read(p))


class ContentObserverNative(unittest.TestCase):
    def test_synthetic_native_contract_and_generated_strict_ts(self):
        child = subprocess.run(['node', '--experimental-vm-modules', 'tests/content_observer_native_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=30)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-8000:])
        output = json.loads(child.stdout.strip().splitlines()[-1])
        self.assertGreaterEqual(output['synthetic_observation_negative_controls'], 200)
        self.assertTrue(output['native_forwarding_identity_and_restore_checked'])
        self.assertEqual(output['required_stages'], 13)
        self.assertTrue(output['owned_module_types_stubbed'])
        self.assertFalse(output['actual_Angular_AOT_or_native_or_packed_or_floor_qualified'])

    def test_exact_surface_source_addition_and_three_native_contexts(self):
        project_content_observer_native_context(ROOT)

    def test_current_context_rejects_unreviewed_deltas(self):
        read = lambda p: (ROOT / p).read_bytes()
        prior_path = 'compatibility/rc/content-observer-native-context-prior.json.gz'
        prior = json.loads(gzip.decompress(read(prior_path)))
        active = json.loads(read('compatibility/f10/disposition-ledger/ledger.json'))
        selected = next(row for row in active['entries'] if row['sha'] == prior['rows'][0]['sha'])['evidence_report']
        def edited(raw, mutate):
            value = json.loads(raw)
            mutate(value)
            return json.dumps(value).encode()
        def forged_preimage(raw):
            value = json.loads(gzip.decompress(raw))
            value['changed_source']['text'] += '\n// forged original\n'
            value['changed_source']['sha256'] = hashlib.sha256(value['changed_source']['text'].encode()).hexdigest()
            return gzip.compress(json.dumps(value).encode())
        cases = [
            ('scripts/browser-surface-families.mjs', lambda raw: raw + b'\n// unrelated delta\n'),
            ('scripts/content-observer-native-contract.mjs', lambda raw: raw + b'\n// unknown fixture change\n'),
            ('compatibility/rc/content-observer-native-source-edits.json', lambda raw: edited(raw, lambda x: x.update(schema_version=99))),
            ('compatibility/f10/disposition-ledger/ledger.json', lambda raw: edited(raw, lambda x: x['entries'][0].update(unreviewed=True))),
            (selected, lambda raw: edited(raw, lambda x: x.update(decision='unreviewed changed judgment'))),
            (prior_path, forged_preimage),
        ]
        for target, change in cases:
            changed = change(read(target))
            with self.subTest(path=target), self.assertRaises(AssertionError):
                project_content_observer_native_context(ROOT, lambda p: changed if p == target else read(p))

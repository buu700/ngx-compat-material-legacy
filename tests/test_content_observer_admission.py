# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Same-run observer admission controls; no actual native qualification."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import unittest
from tests.chip_history_union import historical_product_diff

ROOT = Path(__file__).resolve().parents[1]
EDITS_SHA = 'b22cb92914d8ef31822f299f28e3eea408d00e2d92aa994792d4c91e832eb9de'
CONTRACT_SHA = 'e935b1a67bf7095abfa088a7eed82cba367def7f2172437c193728be385568e7'
SHA = 'd8a6c3edd8d406b3f1b1c26805612eac8856b745'
SUFFIX = (' Require both native runtime protocols, independently authenticated actual installed peer JS/types, '
          'current owned header/cache/pagination and shared unsubscribe/destroy/reobserve observations in this '
          'complete same-library clean packed/browser run. This source document alone does not qualify execution.')


def project_observer_admission_context(root, read_member=None):
    """Authenticate this entire transition before exposing its retained parent.

    Older assertions still operate on their exact qualified state. All current
    entries, new observer requirements, source bytes and prior documents are
    independently checked here; this grants no runtime or release clearance.
    """
    if (root / "compatibility/rc/media-matcher-admission-worksheet.json").exists():
        from tests.test_media_matcher_admission import project_media_matcher_context
        _, read_member = project_media_matcher_context(root, read_member)
    read = read_member or (lambda p: (root / p).read_bytes())
    load = lambda p: json.loads(read(p))
    digest = lambda raw: hashlib.sha256(raw).hexdigest()
    task = load('compatibility/rc/content-observer-admission-worksheet.json')
    parent, line = task['source_parent'], task['line']
    git = lambda *args: subprocess.check_output(['git', *args], cwd=root)
    cap_path = 'compatibility/rc/content-observer-admission-context-prior.json.gz'
    raw_cap = read(cap_path)
    cap = json.loads(gzip.decompress(raw_cap))
    assert cap['source_parent'] == parent and cap['line'] == line
    edits_path = 'compatibility/rc/content-observer-admission-source-edits.json'
    assert digest(read(edits_path)) == EDITS_SHA
    contract_path = 'compatibility/rc/content-observer-admission-contract.json'
    assert digest(read(contract_path)) == CONTRACT_SHA
    rules = load(edits_path)
    sources = {row['path']: row for row in cap['sources']}
    assert set(sources) == {'scripts/check-upstream-audit-disposition.mjs', 'scripts/browser-surface-families.mjs', 'scripts/content-observer-native-contract.mjs'}
    for record in rules['files']:
        before = sources[record['path']]
        assert digest(before['text'].encode()) == before['sha256']
        assert git('show', parent + ':' + record['path']) == before['text'].encode()
        text = before['text']
        for edit in record['edits']:
            assert text.count(edit['before']) == edit['occurrences']
            text = text.replace(edit['before'], edit['after'])
        assert text.encode() == read(record['path'])
    extraction = rules['sample_extraction']
    original_probe = git('show', parent + ':' + extraction['path']).decode()
    assert original_probe.count(extraction['before']) == 1
    assert read(extraction['path']).decode() == original_probe.replace(extraction['before'], extraction['after'])
    assert read(extraction['sample_path']).decode() == extraction['sample_prefix'] + extraction['before'] + extraction['sample_suffix']
    ledger_path = 'compatibility/f10/disposition-ledger/ledger.json'
    original_bytes = git('show', parent + ':' + ledger_path)
    original = json.loads(original_bytes)
    ledger = load(ledger_path)
    recovered = copy.deepcopy(ledger)
    entries = {row['sha']: row for row in recovered['entries']}
    original_entries = {row['sha']: row for row in original['entries']}
    prior_ref = {'path': cap_path, 'sha256': digest(raw_cap)}
    changes = 0
    for row in cap['rows']:
        before = row['entry']
        assert before == original_entries[row['sha']]
        expected = copy.deepcopy(before)
        deltas = []
        for member in expected['individual_proof'][row['field']]['source_members']:
            if member['path'] in sources:
                prior = sources[member['path']]
                assert member['sha256'] == prior['sha256']
                member['sha256'] = digest(read(member['path']))
                deltas.append({'path': member['path'], 'before_sha256': prior['sha256'], 'after_sha256': member['sha256']})
        if not deltas:
            assert entries[row['sha']] == before
            continue
        changes += 1
        target = 'compatibility/f10/disposition-ledger/evidence/closeout-content-observer-admission-native-' + row['sha'] + '.json'
        expected['evidence_report'] = target
        current = entries[row['sha']]
        assert current == expected
        review = load(target)
        context = review.pop('content_observer_admission_source_context')
        assert context == {'prior': prior_ref,
            'prior_review': {'path': before['evidence_report'], 'sha256': digest(read(before['evidence_report']))},
            'source_changes': deltas, 'original_verdict_and_native_requirements_unchanged': True,
            'actual_native_packed_or_floor_qualified': False}
        assert load(before['evidence_report']) == row['review']
        assert json.loads(git('show', parent + ':' + before['evidence_report'])) == row['review']
        expected_review = copy.deepcopy(row['review'])
        expected_review['individual_proof'] = expected['individual_proof']
        assert review == expected_review
        for member in current['individual_proof'][row['field']]['source_members']:
            assert digest(read(member['path'])) == member['sha256']
        entries[row['sha']] = copy.deepcopy(before)
    assert changes == 15 and len(cap['rows']) == 21
    before = cap['observer_entry']
    old_review = cap['observer_review']
    assert before == original_entries[SHA]
    definition = load(contract_path)[line]
    proof = {'proof_kind': 'browser-required-individual-content-observer', 'diff_sha256': definition['patch'],
        'review_depth': 'individual-compatibility', 'affected_branches': [line],
        'decision': before['individual_proof']['decision'] + SUFFIX,
        'installed_member': definition['installed_member'], 'public_declaration': definition['public_declaration'],
        'reachable_behavior': {'kind': 'executed-delegation', 'id': definition['case_ids'][0]},
        'content_observer_behavior': {'kind': definition['kind'], 'runtimes': definition['runtimes'],
            'case_ids': definition['case_ids'], 'stages': definition['stages'],
            'source_members': [{'path': p, 'sha256': digest(read(p))} for p in definition['members']]}}
    target = 'compatibility/f10/disposition-ledger/evidence/closeout-content-observer-admission-source-review.json'
    expected = copy.deepcopy(before)
    expected.update(individual_proof=proof, evidence_report=target)
    assert entries[SHA] == expected
    expected_review = copy.deepcopy(old_review)
    expected_review.update(individual_proof=proof,
        prior_source_review={'path': before['evidence_report'], 'sha256': digest(read(before['evidence_report']))},
        native_admission={'kind': proof['proof_kind'], 'required': True, 'runtimes': definition['runtimes'],
            'case_ids': definition['case_ids'], 'stages': definition['stages'], 'actual_native_or_packed_executed': False,
            'qualified_by_this_document': False, 'g11_claim': 'not-passed'},
        content_observer_admission_source_context={'prior': prior_ref, 'prior_entry_sha': SHA,
            'source_only_verdict_preserved': True, 'actual_native_packed_or_floor_qualified': False})
    assert load(target) == expected_review
    assert load(before['evidence_report']) == old_review
    assert json.loads(git('show', parent + ':' + before['evidence_report'])) == old_review
    entries[SHA] = copy.deepcopy(before)
    recovered['entries'] = [entries[row['sha']] for row in recovered['entries']]
    assert recovered == original and len(entries) == 1697
    for member in ['compatibility/f10/authored-dependency-dispositions.json',
                   'compatibility/f10/authored-dependency-current-dispositions.json',
                   'compatibility/rc/matrices/full-verify.json']:
        assert read(member) == git('show', parent + ':' + member)
    assert historical_product_diff(root,parent,read,name_only=True) == b''
    def projected_read(p):
        if p in sources:
            return sources[p]['text'].encode()
        if p == ledger_path:
            return original_bytes
        return read(p)
    return recovered, projected_read


class ContentObserverAdmission(unittest.TestCase):
    def test_actual_writer_validator_and_cli_fixtures(self):
        child = subprocess.run(['node', 'tests/content_observer_admission_probe.mjs'], cwd=ROOT,
                               capture_output=True, text=True, timeout=100)
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-9000:])
        output = json.loads(child.stdout.strip().splitlines()[-1])
        self.assertEqual(output['actual_helper_controls'], 41)
        self.assertEqual(output['actual_CLI_controls'], 13)
        self.assertEqual(output['actual_installed_metadata_producer_controls'], 6)
        self.assertTrue(output['public_observer_declarations_reviewed_at_both_minimums'])
        self.assertTrue(output['fixture_only'])
        self.assertFalse(output['actual_native_packed_or_floor_qualified'])

    def test_exact_source_and_native_review_transition(self):
        project_observer_admission_context(ROOT)

    def test_unreviewed_deltas_rejected(self):
        read = lambda p: (ROOT / p).read_bytes()
        cap_path = 'compatibility/rc/content-observer-admission-context-prior.json.gz'
        current_review = 'compatibility/f10/disposition-ledger/evidence/closeout-content-observer-admission-source-review.json'
        def edit(raw, mutate):
            value = json.loads(raw)
            mutate(value)
            return json.dumps(value).encode()
        def forge(raw):
            value = json.loads(gzip.decompress(raw))
            value['sources'][0]['text'] += '\n// forged parent\n'
            value['sources'][0]['sha256'] = hashlib.sha256(value['sources'][0]['text'].encode()).hexdigest()
            return gzip.compress(json.dumps(value).encode())
        cases = [
            ('scripts/check-upstream-audit-disposition.mjs', lambda raw: raw + b'\n// changed dispatcher\n'),
            ('scripts/browser-surface-families.mjs', lambda raw: raw + b'\n// changed producer\n'),
            ('scripts/upstream-content-observer-evidence.mjs', lambda raw: raw + b'\n// changed validator\n'),
            ('tests/content_observer_native_sample.mjs', lambda raw: raw + b'\n// changed original sample\n'),
            ('compatibility/rc/content-observer-admission-contract.json', lambda raw: edit(raw, lambda x: x.update(unknown=True))),
            ('compatibility/f10/disposition-ledger/ledger.json', lambda raw: edit(raw, lambda x: x['entries'][0].update(unreviewed=True))),
            (current_review, lambda raw: edit(raw, lambda x: x['native_admission'].update(qualified_by_this_document=True))),
            (cap_path, forge),
        ]
        for p, mutate in cases:
            changed = mutate(read(p))
            with self.subTest(path=p), self.assertRaises(AssertionError):
                project_observer_admission_context(ROOT, lambda path: changed if path == p else read(path))

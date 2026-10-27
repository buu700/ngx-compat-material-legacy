# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independently reconstruct two entries and retain all other original bytes."""
import copy
import hashlib
import json
from pathlib import Path
import re
from autocomplete_selection_source_refs import _git
from unthemable_ledger_patch import replace_entries, preserved, spans

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PARENT = 'd026dd06511ea9bba6def16619ae0e387a9ac074'
BEFORE = '3d892ed786c3267965eff7a1bb833a6e6982341c5430699780f7f92c71574a5c'
PREFIX = 'compatibility/rc/21x-c04-form-field-tokenization-'
REVIEW = PREFIX + 'individual-review.json'
REVIEW_HASH = '12f0ad55d65abcf545b2ddbf57668c4a08bc21e07df15b93f1711ef61a246337'
QUALIFICATION = PREFIX + 'source-qualification.json'
QUALIFICATION_HASH = '77124973bb6ae426a797d2d8ead90cbeaa24ff719e4a21c93b0dca794f041172'
SHAS = ['98f610d192015599d8e0ce1a0f2a455c31ced558','c0b3aa524115e9b2b2b5fabd2e7cec44111b8e0e']
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def derive_field_successor(root=ROOT, expected_before=None):
    before = _git(root, PARENT, LEDGER)
    assert HASH(before) == BEFORE
    if expected_before is not None: assert expected_before == before
    raw = (root / REVIEW).read_bytes(); assert HASH(raw) == REVIEW_HASH
    assert HASH((root / QUALIFICATION).read_bytes()) == QUALIFICATION_HASH
    review = json.loads(raw); assert [row['sha'] for row in review['reviews']] == SHAS
    original = json.loads(before); assert len({row['sha'] for row in original['entries']}) == 1697
    assert (original['closed_dispositions'], original['open_or_deferred']) == (369, 1328)
    expected, replacements = copy.deepcopy(original), {}
    for row in review['reviews']:
        assert row['status'] == 'reviewed' and row['proposed_final_disposition'] == ('do-not-adopt' if row['sha'] == SHAS[0] else 'already-adapted')
        assert HASH(row['diff'].encode()) == row['diff_sha256']
        index = next(i for i, old in enumerate(original['entries']) if old['sha'] == row['sha'])
        prior = original['entries'][index]
        assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
        assert prior['files'] == row['frozen_seed_paths']
        entry = copy.deepcopy(prior)
        entry.update(final_disposition=row['proposed_final_disposition'], reason=row['decision'], review_depth='individual-compatibility',
            evidence_report=REVIEW, individual_proof=dict(proof_kind='individual-historical-form-field-tokenization-source-review',
                diff_sha256=row['diff_sha256'], review_depth='individual-compatibility', affected_branches=['21.x'], decision=row['decision'],
                form_field_tokenization_source_scope=dict(sha=row['sha'], review=dict(path=REVIEW, sha256=REVIEW_HASH),
                    qualification=dict(path=QUALIFICATION, sha256=QUALIFICATION_HASH), source_scope_only=True,
                    actual_native_artifact_browser_floor_or_full_audit_qualified=False)))
        replacements[row['sha']] = entry; expected['entries'][index] = entry
    after = replace_entries(before, replacements)
    text, start, _ = spans(after); header = text[:start]
    for key, old, new in [('closed_dispositions', 369, 371), ('open_or_deferred', 1328, 1326)]:
        header, count = re.subn(r'(?m)^(  "' + key + r'": )' + str(old) + r'(,)$', lambda m: m[1] + str(new) + m[2], header)
        assert count == 1
    after = (header + text[start:]).encode()
    expected['closed_dispositions'], expected['open_or_deferred'] = 371, 1326
    assert json.loads(after) == expected and preserved(before, after, set(SHAS)) == 1695
    assert expected['g11_claim'] == 'not-passed'
    assert sum(row['final_disposition'] == 'security-review' for row in expected['entries']) == 1
    return before, after


def verify_field_successor(root=ROOT, expected_before=None, candidate=None):
    before, after = derive_field_successor(root=root, expected_before=expected_before)
    current = Path(candidate).read_bytes() if candidate else (root / LEDGER).read_bytes()
    if current != after:
        from m3_theme_boundary_ledger_patch import verify_boundary_successor
        verify_boundary_successor(root=root, expected_before=after, candidate=candidate)
    return dict(line='21.x', individual_decisions=2, unselected_entry_bytes_preserved=1695,
        before_sha256=HASH(before), after_sha256=HASH(after), after_bytes=len(after),
        closed_dispositions=371, pending_dispositions=1326, pending_security_reviews=1,
        actual_native_artifact_browser_floor_or_full_audit_qualified=False, g11_claim='not-passed', g13_claim='not-passed')

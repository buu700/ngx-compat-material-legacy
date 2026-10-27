# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independently reconstruct four entries and retain all other original bytes."""
import copy
import hashlib
import json
from pathlib import Path
import re
from autocomplete_selection_source_refs import _git
from unthemable_ledger_patch import replace_entries, preserved, spans

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PARENT = '051c1e83402f38fed1073aefeb965b2115875246'
BEFORE = '1a6efeb50fff4ab828deff45262c0686dfc1bbed1c3fe118983882ac44990829'
PREFIX = 'compatibility/rc/21x-c04-modern-control-base-'
REVIEW = PREFIX + 'individual-review.json'
REVIEW_HASH = 'dd9e250915aa5ccdc39f493c403613e9b6f05448799ca0a737f0508375a49aab'
QUALIFICATION = PREFIX + 'source-qualification.json'
QUALIFICATION_HASH = '37fd4c07bf0fe076897a55fd8e4544fa5e12039c924464380896de79e9aa4547'
SHAS = ['68096ec9d34aae793a7b3037c39e6ae7d1700933', 'c572dc4bf4d48448699288aeac2be14db0186a86',
        '65c97170d2b3d239fda25bd049ec417e0098fe12', '7c16cc8b659133167f1b875dcfe77ca806bfe876']
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def derive_control_successor(root=ROOT, expected_before=None):
    before = _git(root, PARENT, LEDGER)
    assert HASH(before) == BEFORE
    if expected_before is not None: assert expected_before == before
    raw = (root / REVIEW).read_bytes(); assert HASH(raw) == REVIEW_HASH
    assert HASH((root / QUALIFICATION).read_bytes()) == QUALIFICATION_HASH
    review = json.loads(raw); assert [row['sha'] for row in review['reviews']] == SHAS
    original = json.loads(before); assert len({row['sha'] for row in original['entries']}) == 1697
    assert (original['closed_dispositions'], original['open_or_deferred']) == (363, 1334)
    expected, replacements = copy.deepcopy(original), {}
    for row in review['reviews']:
        assert row['status'] == 'reviewed' and row['proposed_final_disposition'] == 'do-not-adopt'
        assert HASH(row['diff'].encode()) == row['diff_sha256']
        index = next(i for i, old in enumerate(original['entries']) if old['sha'] == row['sha'])
        prior = original['entries'][index]
        assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
        assert prior['files'] == row['frozen_seed_paths']
        entry = copy.deepcopy(prior)
        entry.update(final_disposition='do-not-adopt', reason=row['decision'], review_depth='individual-compatibility',
            evidence_report=REVIEW, individual_proof=dict(proof_kind='individual-historical-modern-control-base-source-exclusion',
                diff_sha256=row['diff_sha256'], review_depth='individual-compatibility', affected_branches=['21.x'], decision=row['decision'],
                modern_control_base_source_scope=dict(sha=row['sha'], review=dict(path=REVIEW, sha256=REVIEW_HASH),
                    qualification=dict(path=QUALIFICATION, sha256=QUALIFICATION_HASH), source_scope_only=True,
                    actual_native_artifact_browser_floor_or_full_audit_qualified=False)))
        replacements[row['sha']] = entry; expected['entries'][index] = entry
    after = replace_entries(before, replacements)
    text, start, _ = spans(after); header = text[:start]
    for key, old, new in [('closed_dispositions', 363, 367), ('open_or_deferred', 1334, 1330)]:
        header, count = re.subn(r'(?m)^(  "' + key + r'": )' + str(old) + r'(,)$', lambda m: m[1] + str(new) + m[2], header)
        assert count == 1
    after = (header + text[start:]).encode()
    expected['closed_dispositions'], expected['open_or_deferred'] = 367, 1330
    assert json.loads(after) == expected and preserved(before, after, set(SHAS)) == 1693
    assert expected['g11_claim'] == 'not-passed'
    assert sum(row['final_disposition'] == 'security-review' for row in expected['entries']) == 1
    return before, after


def verify_control_successor(root=ROOT, expected_before=None, candidate=None):
    before, after = derive_control_successor(root=root, expected_before=expected_before)
    assert (Path(candidate).read_bytes() if candidate else (root / LEDGER).read_bytes()) == after
    return dict(line='21.x', individual_decisions=4, unselected_entry_bytes_preserved=1693,
        before_sha256=HASH(before), after_sha256=HASH(after), after_bytes=len(after),
        closed_dispositions=367, pending_dispositions=1330, pending_security_reviews=1,
        actual_native_artifact_browser_floor_or_full_audit_qualified=False, g11_claim='not-passed', g13_claim='not-passed')

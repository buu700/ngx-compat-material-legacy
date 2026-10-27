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
PARENT = '9a915e6fe464e6bc1a83f79c0fbeb8980a8bb89d'
BEFORE = 'a49a8cb75dbae848b07c642d37a23495c50abfb49baadcfce9ec4c3a39b63908'
PREFIX = 'compatibility/rc/21x-c04-theme-token-root-'
REVIEW = PREFIX + 'individual-review.json'
REVIEW_HASH = '317e9beb6f0897c89e791de0f5730a29424d577c0c028d480d753060242351cb'
QUALIFICATION = PREFIX + 'source-qualification.json'
QUALIFICATION_HASH = '7bff7dcf9e9ce6caeb104371d69bd9bef5e42dc1560cd5daa9a1cdc08a2d6008'
SHAS = ['408c0b492f5d7edd6571b2287bb06aa89d582758','6cc6cf21f292d78c930cbda79c1f337bd6b82bfe']
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def derive_root_successor(root=ROOT, expected_before=None):
    before = _git(root, PARENT, LEDGER)
    assert HASH(before) == BEFORE
    if expected_before is not None: assert expected_before == before
    raw = (root / REVIEW).read_bytes(); assert HASH(raw) == REVIEW_HASH
    assert HASH((root / QUALIFICATION).read_bytes()) == QUALIFICATION_HASH
    review = json.loads(raw); assert [row['sha'] for row in review['reviews']] == SHAS
    original = json.loads(before); assert len({row['sha'] for row in original['entries']}) == 1697
    assert (original['closed_dispositions'], original['open_or_deferred']) == (367, 1330)
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
            evidence_report=REVIEW, individual_proof=dict(proof_kind='individual-historical-token-root-source-exclusion',
                diff_sha256=row['diff_sha256'], review_depth='individual-compatibility', affected_branches=['21.x'], decision=row['decision'],
                theme_token_root_source_scope=dict(sha=row['sha'], review=dict(path=REVIEW, sha256=REVIEW_HASH),
                    qualification=dict(path=QUALIFICATION, sha256=QUALIFICATION_HASH), source_scope_only=True,
                    actual_native_artifact_browser_floor_or_full_audit_qualified=False)))
        replacements[row['sha']] = entry; expected['entries'][index] = entry
    after = replace_entries(before, replacements)
    text, start, _ = spans(after); header = text[:start]
    for key, old, new in [('closed_dispositions', 367, 369), ('open_or_deferred', 1330, 1328)]:
        header, count = re.subn(r'(?m)^(  "' + key + r'": )' + str(old) + r'(,)$', lambda m: m[1] + str(new) + m[2], header)
        assert count == 1
    after = (header + text[start:]).encode()
    expected['closed_dispositions'], expected['open_or_deferred'] = 369, 1328
    assert json.loads(after) == expected and preserved(before, after, set(SHAS)) == 1695
    assert expected['g11_claim'] == 'not-passed'
    assert sum(row['final_disposition'] == 'security-review' for row in expected['entries']) == 1
    return before, after


def verify_root_successor(root=ROOT, expected_before=None, candidate=None):
    before, after = derive_root_successor(root=root, expected_before=expected_before)
    assert (Path(candidate).read_bytes() if candidate else (root / LEDGER).read_bytes()) == after
    return dict(line='21.x', individual_decisions=2, unselected_entry_bytes_preserved=1695,
        before_sha256=HASH(before), after_sha256=HASH(after), after_bytes=len(after),
        closed_dispositions=369, pending_dispositions=1328, pending_security_reviews=1,
        actual_native_artifact_browser_floor_or_full_audit_qualified=False, g11_claim='not-passed', g13_claim='not-passed')

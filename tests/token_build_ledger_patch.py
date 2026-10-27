# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent one-row token-build disposition, preserving every other entry byte."""
import copy
import hashlib
import json
from pathlib import Path
import re
import sys
from autocomplete_selection_source_refs import _git

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PARENT = '0860e78b3ba8172c0997819469e9a077b6f6b37e'
BEFORE = 'd015c3d9cca4b9ea489da7028ab5a8bcd675adf428db3000ed60c0b2380f0e27'
SHA = '7ed70fe4422e4324ea450604514337fa5e0ad880'
REVIEW = 'compatibility/rc/21x-c04-token-test-build-individual-review.json'
REVIEW_HASH = '75538ffd743d23a417a8e7a91f5d15acb5db6858a335078a3d264426f40a65a8'
QUALIFICATION = 'compatibility/rc/21x-c04-token-test-build-source-qualification.json'
QUALIFICATION_HASH = '5c4c47bc80a1b1e6b5f52a71e9c5167be841f57c1d1bf1d15a600f1d827a442c'
DIFF = 'fc9af813f253527709e843280bd5d51ca160ed5f1b37b80b95be30413d9b593d'
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def derive_token_build_successor(root=ROOT, expected_before=None):
    before = _git(root, PARENT, LEDGER)
    assert HASH(before) == BEFORE
    if expected_before is not None:
        assert before == expected_before
    raw = (root / REVIEW).read_bytes()
    assert HASH(raw) == REVIEW_HASH and HASH((root / QUALIFICATION).read_bytes()) == QUALIFICATION_HASH
    review = json.loads(raw)
    assert review['sha'] == SHA and review['line'] == '21.x' and review['status'] == 'reviewed'
    assert HASH(review['diff'].encode()) == review['diff_sha256'] == DIFF
    assert len(review['complete_original_hunk_reviews']) == 6 and len(review['full_original_paths']) == 4
    original = json.loads(before)
    expected = copy.deepcopy(original)
    assert len(original['entries']) == len({row['sha'] for row in original['entries']}) == 1697
    assert original['closed_dispositions'] == 357 and original['open_or_deferred'] == 1340
    index = next(i for i, row in enumerate(original['entries']) if row['sha'] == SHA)
    prior = original['entries'][index]
    assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
    assert prior['files'] == review['frozen_seed_paths']
    successor = copy.deepcopy(prior)
    successor.update(final_disposition='already-adapted', reason=review['decision'],
        review_depth='individual-compatibility', evidence_report=REVIEW,
        individual_proof=dict(proof_kind='individual-owned-mdc-token-validation', diff_sha256=DIFF,
            review_depth='individual-compatibility', affected_branches=['21.x'], decision=review['decision'],
            mdc_token_source_scope=dict(sha=SHA, review=dict(path=REVIEW, sha256=REVIEW_HASH),
                qualification=dict(path=QUALIFICATION, sha256=QUALIFICATION_HASH), source_scope_only=True,
                actual_native_artifact_browser_floor_or_full_audit_qualified=False)))
    expected['entries'][index] = successor
    expected['closed_dispositions'], expected['open_or_deferred'] = 358, 1339
    text, decoder = before.decode(), json.JSONDecoder()
    marker = '"entries": ['
    assert text.count(marker) == 1
    array_start = text.index(marker)
    cursor = array_start + len(marker)
    spans = []
    for row in original['entries']:
        while text[cursor].isspace() or text[cursor] == ',':
            cursor += 1
        value, end = decoder.raw_decode(text, cursor)
        assert value == row
        spans.append((cursor, end))
        cursor = end
    start, end = spans[index]
    body = text[array_start:start] + json.dumps(successor, indent=2, ensure_ascii=False).replace('\n', '\n    ') + text[end:]
    header = text[:array_start]
    for key, old, new in [('closed_dispositions', 357, 358), ('open_or_deferred', 1340, 1339)]:
        header, count = re.subn(r'(?m)^(  "' + key + r'": )' + str(old) + r'(,)$',
            lambda match: match[1] + str(new) + match[2], header)
        assert count == 1
    after = (header + body).encode()
    assert json.loads(after) == expected
    current = after.decode()
    cursor = current.index(marker) + len(marker)
    for i, row in enumerate(expected['entries']):
        while current[cursor].isspace() or current[cursor] == ',':
            cursor += 1
        value, end = decoder.raw_decode(current, cursor)
        assert value == row
        if i != index:
            old_start, old_end = spans[i]
            assert current[cursor:end] == text[old_start:old_end]
        cursor = end
    return before, after


def verify_token_build_successor(root=ROOT, expected_before=None, candidate=None):
    before, after = derive_token_build_successor(root=root, expected_before=expected_before)
    assert (Path(candidate).read_bytes() if candidate else (root / LEDGER).read_bytes()) == after
    return dict(line='21.x', individual_decisions=1, unselected_entry_bytes_preserved=1696,
        before_sha256=HASH(before), after_sha256=HASH(after), after_bytes=len(after),
        pending_dispositions=1339, actual_native_artifact_browser_floor_or_full_audit_qualified=False,
        g11_claim='not-passed', g13_claim='not-passed')


if __name__ == '__main__':
    print(json.dumps(verify_token_build_successor(candidate=sys.argv[1] if len(sys.argv) > 1 else None)))

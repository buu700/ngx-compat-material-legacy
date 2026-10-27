# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact reconstruction of one branch-native Sass disposition."""
import copy
import hashlib
import json
from pathlib import Path
import re
import sys
from autocomplete_selection_source_refs import _git

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PARENT = '518be10d4de943ebfef51854d9c013cde2afbefe'
BEFORE = 'c444a0532332e11c1bfb4f737135a0710909a1a6f91332f8327e8ed2e0174ac3'
SHA = '86e9e524c3234f44eece21632048cd4290e5f3f4'
REVIEW = 'compatibility/rc/21x-c04-sass-entrypoint-individual-review.json'
REVIEW_HASH = 'e9173324c715f86a8784ae133f598d1b320c5cbbcdab21757623c3648a49a1ea'
DIFF_HASH = 'a939a0f4eed396376268ba2cdfaee50caf97d586cb3e5b42472e8738fd3cbd39'
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def derive_sass_entrypoint_successor(root=ROOT, expected_before=None):
    assert json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.')
    before = _git(root, PARENT, LEDGER)
    assert HASH(before) == BEFORE
    if expected_before is not None:
        assert before == expected_before
    raw = (root / REVIEW).read_bytes()
    assert HASH(raw) == REVIEW_HASH
    review = json.loads(raw)
    assert review['sha'] == SHA and review['line'] == '21.x'
    assert review['status'] == 'reviewed' and review['source_review_complete']
    assert len(review['full_original_paths']) == 180 and len(review['whole_original_hunk_reviews']) == 194
    assert review['diff_sha256'] == DIFF_HASH == HASH(review['diff'].encode())
    assert review['proposed_final_disposition'] == 'not-applicable'
    assert review['g11_claim'] == review['g13_claim'] == 'not-passed'
    original, expected = json.loads(before), json.loads(before)
    assert len(original['entries']) == len({row['sha'] for row in original['entries']}) == 1697
    assert original['closed_dispositions'] == 356 and original['open_or_deferred'] == 1341
    index = next(i for i, row in enumerate(original['entries']) if row['sha'] == SHA)
    prior = original['entries'][index]
    assert prior['final_disposition'] == 'needs-individual-review' and prior['evidence_report'] is None
    assert prior['files'] == review['frozen_seed_paths'] and len(prior['files']) == 111
    successor = copy.deepcopy(prior)
    successor.update(final_disposition='not-applicable', reason=review['decision'],
        review_depth='individual-compatibility', evidence_report=REVIEW,
        individual_proof=dict(proof_kind='individual-legacy-sass-default-module-exclusion',
            diff_sha256=DIFF_HASH, review_depth='individual-compatibility', affected_branches=['21.x'],
            decision=review['decision'], legacy_sass_entrypoint_scope=dict(sha=SHA,
                review=dict(path=REVIEW, sha256=REVIEW_HASH), source_scope_only=True,
                actual_native_artifact_browser_floor_or_audit_qualified=False)))
    expected['entries'][index] = successor
    expected['closed_dispositions'], expected['open_or_deferred'] = 357, 1340
    # Decode each complete JSON entry, independently of the production scanner.
    text, decoder = before.decode(), json.JSONDecoder()
    marker = '"entries": ['
    assert text.count(marker) == 1
    offset = text.index(marker) + len(marker)
    spans = []
    for row in original['entries']:
        while text[offset].isspace() or text[offset] == ',':
            offset += 1
        value, end = decoder.raw_decode(text, offset)
        assert value == row
        spans.append((offset, end))
        offset = end
    start, end = spans[index]
    replacement = json.dumps(successor, indent=2, ensure_ascii=False).replace('\n', '\n    ')
    tail = text[text.index(marker):start] + replacement + text[end:]
    header = text[:text.index(marker)]
    for key, old, new in [('closed_dispositions', 356, 357), ('open_or_deferred', 1341, 1340)]:
        header, count = re.subn(r'(?m)^(  "' + key + r'": )' + str(old) + r'(,)$',
                               lambda match: match[1] + str(new) + match[2], header)
        assert count == 1
    after = (header + tail).encode()
    assert json.loads(after) == expected
    # Every unselected entry retains its exact original bytes, including spacing.
    after_text = after.decode()
    offset = after_text.index(marker) + len(marker)
    for i, row in enumerate(expected['entries']):
        while after_text[offset].isspace() or after_text[offset] == ',':
            offset += 1
        value, end = decoder.raw_decode(after_text, offset)
        assert value == row
        if i != index:
            old_start, old_end = spans[i]
            assert after_text[offset:end] == text[old_start:old_end]
        offset = end
    assert {k: v for k, v in expected.items() if k not in ('entries', 'closed_dispositions', 'open_or_deferred')} == {
        k: v for k, v in original.items() if k not in ('entries', 'closed_dispositions', 'open_or_deferred')}
    return before, after


def verify_sass_entrypoint_successor(expected_before=None, root=ROOT, candidate=None):
    before, after = derive_sass_entrypoint_successor(root=root, expected_before=expected_before)
    actual = Path(candidate).read_bytes() if candidate else (root / LEDGER).read_bytes()
    following_checker_tokens = 0
    if actual != after:
        from checker_reference_metadata_patch import verify_checker_reference_successor
        verify_checker_reference_successor(root=root, expected_before=after, candidate=candidate)
        following_checker_tokens = 14
    return dict(line='21.x', individual_decisions=1, other_entries_preserved=1696,
        original_hunks_reviewed=194, original_paths_reviewed=180, frozen_research_paths_preserved=111,
        before_sha256=HASH(before), after_sha256=HASH(after), after_bytes=len(after),
        pending_dispositions=1340, preservation_scope='one-SHA semantic stage; following checker metadata verified separately',
        following_checker_digest_updates=following_checker_tokens,
        actual_native_artifact_browser_floor_or_full_audit_qualified=False,
        g11_claim='not-passed', g13_claim='not-passed')


if __name__ == '__main__':
    print(json.dumps(verify_sass_entrypoint_successor(candidate=sys.argv[1] if len(sys.argv) > 1 else None)))

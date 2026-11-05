# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent reconstruction of fourteen checker digest tokens, and nothing else."""
import copy
import hashlib
import json
from pathlib import Path
import sys
from autocomplete_selection_source_refs import _git
from dialog_title_reader_refs import title_prior_tool_bytes

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PARENT = '64ab628fceefdca5979141090c8d107178681957'
BEFORE = 'fbefd5a78fd9d09694567a59636e6452cb1f08ef668f4b6596378662ab00b355'
REVIEW = 'compatibility/rc/checker-reference-metadata-review.json'
REVIEW_HASH = 'b65c4822274eaf5f5ee7cfe3683e8b2e29a6867518d317e1a644cbc8b6924c62'
CHECKER = 'scripts/check-upstream-audit-disposition.mjs'
CURRENT = '96b287075747b100d615b9ee720fa0db2d1dfecf39545ae0dbb36504c472ce44'
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def derive_checker_reference_successor(root=ROOT, expected_before=None):
    assert json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.')
    raw = (root / REVIEW).read_bytes()
    assert HASH(raw) == REVIEW_HASH
    review = json.loads(raw)
    before = _git(root, PARENT, LEDGER)
    assert HASH(before) == BEFORE == review['before_ledger']['sha256']
    if expected_before is not None:
        assert before == expected_before
    checker = (root / CHECKER).read_bytes()
    if HASH(checker) != CURRENT:
        from unthemable_ledger_patch import qualified_checker_before
        checker = qualified_checker_before(root)
    assert HASH(checker) == CURRENT == review['checker']['current_sha256']
    from current_sass_canonical_test_scope import historical_checker_guard_test_subject
    source_subject = historical_checker_guard_test_subject(root)
    for ref in review['guard_modules']:
        current = source_subject['comparison_bytes'](ref)
        assert HASH(current) == ref['sha256'] and len(current) == ref['bytes']
    original = json.loads(before)
    expected = copy.deepcopy(original)
    selected = review['selected_entries']
    assert len(selected) == len({row['sha'] for row in selected}) == 14
    discovered = [(row['sha'], i) for row in original['entries'] for i, ref in enumerate(
        row.get('individual_proof', {}).get('historical_behavior', {}).get('source_members', [])) if ref['path'] == CHECKER]
    assert discovered == [(row['sha'], row['source_member_index']) for row in selected]
    text, decoder = before.decode(), json.JSONDecoder()

    def skip(pos):
        while text[pos].isspace():
            pos += 1
        return pos

    # Follow actual JSON structure. Production uses TypeScript syntax nodes.
    def locate(pos, path):
        pos = skip(pos)
        if not path:
            _, end = decoder.raw_decode(text, pos)
            return pos, end
        key, *tail = path
        if isinstance(key, int):
            assert text[pos] == '['
            pos += 1
            for i in range(key + 1):
                pos = skip(pos)
                if i == key:
                    return locate(pos, tail)
                _, pos = decoder.raw_decode(text, pos)
                pos = skip(pos)
                assert text[pos] == ','
                pos += 1
        assert text[pos] == '{'
        pos += 1
        while True:
            pos = skip(pos)
            name, pos = decoder.raw_decode(text, pos)
            pos = skip(pos)
            assert text[pos] == ':'
            pos = skip(pos + 1)
            if name == key:
                return locate(pos, tail)
            _, pos = decoder.raw_decode(text, pos)
            pos = skip(pos)
            assert text[pos] == ','
            pos += 1

    edits = []
    for change in selected:
        index = next(i for i, row in enumerate(original['entries']) if row['sha'] == change['sha'])
        member = expected['entries'][index]['individual_proof']['historical_behavior']['source_members'][change['source_member_index']]
        assert member == dict(path=CHECKER, sha256=change['before_sha256'])
        start, end = locate(0, ['entries', index, 'individual_proof', 'historical_behavior', 'source_members', change['source_member_index'], 'sha256'])
        assert json.loads(text[start:end]) == change['before_sha256']
        assert change['after_sha256'] == CURRENT
        edits.append((start, end, json.dumps(CURRENT)))
        member['sha256'] = CURRENT
        ref = change['evidence_report']
        evidence = (root / ref['path']).read_bytes()
        assert HASH(evidence) == ref['sha256'] and len(evidence) == ref['bytes']
    after = text
    for start, end, replacement in sorted(edits, reverse=True):
        after = after[:start] + replacement + after[end:]
    after = after.encode()
    assert len(after) == len(before) and json.loads(after) == expected
    assert {key: value for key, value in original.items() if key != 'entries'} == {
        key: value for key, value in expected.items() if key != 'entries'}
    assert [(row['sha'], row['final_disposition'], row['reason'], row['individual_proof'].get('decision') if row.get('individual_proof') else None)
            for row in original['entries']] == [(row['sha'], row['final_disposition'], row['reason'], row['individual_proof'].get('decision') if row.get('individual_proof') else None)
            for row in expected['entries']]
    source_subject['assert_current']()
    return before, after


def verify_checker_reference_successor(root=ROOT, expected_before=None, candidate=None):
    before, after = derive_checker_reference_successor(root=root, expected_before=expected_before)
    actual = Path(candidate).read_bytes() if candidate else (root / LEDGER).read_bytes()
    following_source_decisions = 0
    if actual != after:
        from token_build_ledger_patch import verify_token_build_successor
        verify_token_build_successor(root=root, expected_before=after, candidate=candidate)
        following_source_decisions = 1
    return dict(line='21.x', checker_digest_tokens_updated=14, unselected_entries_preserved=1683,
        original_reviews_or_hunk_judgments_changed=0, new_SHA_decisions=0, header_changes=0,
        before_sha256=HASH(before), after_sha256=HASH(after), bytes=len(after),
        preservation_scope='fourteen-token metadata stage; following source successor verified separately',
        following_token_build_source_decisions=following_source_decisions,
        actual_native_artifact_browser_floor_or_full_audit_qualified=False, g11_claim='not-passed')


if __name__ == '__main__':
    print(json.dumps(verify_checker_reference_successor(candidate=sys.argv[1] if len(sys.argv) > 1 else None)))

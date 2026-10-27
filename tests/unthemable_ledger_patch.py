# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent five-decision and fourteen-digest successor; preserve all other bytes."""
import copy
import hashlib
import json
from pathlib import Path
import re
import sys
from autocomplete_selection_source_refs import _git

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PARENT = 'e5f713f9d7eb088da729aec53835041dd6ffc521'
BEFORE = '65273c52bd8435614ff51212bc454cc9b7ed266557b0b6276bdd9e70b36e6ef3'
PREFIX = 'compatibility/rc/21x-c04-unthemable-token-placement-'
REVIEW, REVIEW_HASH = PREFIX + 'individual-review.json', '4e51698a2e4f1aec202677b21c02029f0d43aed0ad63e740f06ace522b92aaf0'
QUALIFICATION, QUALIFICATION_HASH = PREFIX + 'source-qualification.json', '6c82277c010b976751a815d094e2b479ca87f6fbb2aacf195ef9f27939186b11'
RESOLUTION, RESOLUTION_HASH = PREFIX + 'tooltip-context-reconciliation.json', '700edd40358724b503ded642c818b7ca2d9500fc8604b47e96678a05d5e91044'
SHAS = ['03a773a0237843fd1e1e600d0b9911eb924319bc', '047404067865a2452bfcb93b2374ac07aca319be',
        'ccd2d7fa72f4566ab2c2aeb78a5ac4b7d4149bbf', '593fc79ecbc6677f04e2d3707bff024b00a517e8',
        '06460d17703ef28a8fc89833c389c479b1ba6bcf']
CHECKER = 'scripts/check-upstream-audit-disposition.mjs'
OLD_CHECKER = '96b287075747b100d615b9ee720fa0db2d1dfecf39545ae0dbb36504c472ce44'
NEW_CHECKER = '4a6002153caabe102887bcd8847128818c2f7025a3d1257d97cd446f34fbf106'
HASH = lambda raw: hashlib.sha256(raw).hexdigest()


def qualified_checker_before(root=ROOT):
    """Authenticate both exact new insertions before supplying old metadata bytes."""
    before = _git(root, PARENT, CHECKER)
    assert HASH(before) == OLD_CHECKER
    text = before.decode()
    for old, new in [
        ("import {reviewMetadataComplete,individualReviewScopeOk} from './upstream-individual-evidence-scope.mjs';",
         "import {reviewMetadataComplete,individualReviewScopeOk} from './upstream-individual-evidence-scope.mjs';\nimport {requiresRegisteredSourceReview} from './upstream-registered-source-review.mjs';"),
        ('  const sensitive = sensitiveClass(entry) ||',
         '  const sensitive = requiresRegisteredSourceReview(entry, entry.individual_proof) || sensitiveClass(entry) ||'),
    ]:
        assert text.count(old) == 1
        text = text.replace(old, new)
    assert HASH(text.encode()) == NEW_CHECKER
    assert (root / CHECKER).read_bytes() == text.encode()
    assert HASH((root / 'scripts/upstream-registered-source-review.mjs').read_bytes()) == '524b9dc06153cac660f42c64039f13c7d388306ea6dfbab3bbcef168c92bfe61'
    return before


def spans(raw):
    text, decoder = raw.decode(), json.JSONDecoder()
    marker = '"entries": ['
    assert text.count(marker) == 1
    start = text.index(marker)
    cursor, rows = start + len(marker), []
    for row in json.loads(raw)['entries']:
        while text[cursor].isspace() or text[cursor] == ',':
            cursor += 1
        value, end = decoder.raw_decode(text, cursor)
        assert value == row
        rows.append((cursor, end))
        cursor = end
    assert len(rows) == 1697
    return text, start, rows


def replace_entries(raw, replacements):
    text, start, ranges = spans(raw)
    chunks, cursor = [], 0
    data = json.loads(raw)
    for i, row in enumerate(data['entries']):
        if row['sha'] not in replacements:
            continue
        begin, end = ranges[i]
        value = replacements[row['sha']]
        body = value if isinstance(value, str) else json.dumps(value, indent=2, ensure_ascii=False).replace('\n', '\n    ')
        chunks.extend([text[cursor:begin], body])
        cursor = end
    chunks.append(text[cursor:])
    return ''.join(chunks).encode()


def preserved(before, after, selected):
    old, _, a = spans(before)
    new, _, b = spans(after)
    old_rows, new_rows = json.loads(before)['entries'], json.loads(after)['entries']
    assert [r['sha'] for r in old_rows] == [r['sha'] for r in new_rows]
    for i, row in enumerate(old_rows):
        if row['sha'] not in selected:
            assert old[a[i][0]:a[i][1]] == new[b[i][0]:b[i][1]], row['sha']
    return 1697 - len(selected)


def derive_unthemable_stages(root=ROOT, expected_before=None):
    qualified_checker_before(root)
    before = _git(root, PARENT, LEDGER)
    assert HASH(before) == BEFORE
    if expected_before is not None:
        assert before == expected_before
    review_raw = (root / REVIEW).read_bytes()
    assert HASH(review_raw) == REVIEW_HASH
    assert HASH((root / QUALIFICATION).read_bytes()) == QUALIFICATION_HASH
    assert HASH((root / RESOLUTION).read_bytes()) == RESOLUTION_HASH
    review = json.loads(review_raw)
    assert [row['sha'] for row in review['reviews']] == SHAS
    original = json.loads(before)
    assert len({row['sha'] for row in original['entries']}) == 1697
    assert (original['closed_dispositions'], original['open_or_deferred']) == (358, 1339)
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
            evidence_report=REVIEW, individual_proof=dict(proof_kind='individual-historical-base-token-source-exclusion',
                diff_sha256=row['diff_sha256'], review_depth='individual-compatibility', affected_branches=['21.x'], decision=row['decision'],
                unthemable_token_source_scope=dict(sha=row['sha'], review=dict(path=REVIEW, sha256=REVIEW_HASH),
                    qualification=dict(path=QUALIFICATION, sha256=QUALIFICATION_HASH),
                    tooltip_context=dict(path=RESOLUTION, sha256=RESOLUTION_HASH), source_scope_only=True,
                    actual_native_artifact_browser_floor_or_full_audit_qualified=False)))
        replacements[row['sha']] = entry
        expected['entries'][index] = entry
    five = replace_entries(before, replacements)
    text, start, _ = spans(five)
    header = text[:start]
    for key, old, new in [('closed_dispositions', 358, 363), ('open_or_deferred', 1339, 1334)]:
        header, count = re.subn(r'(?m)^(  "' + key + r'": )' + str(old) + r'(,)$', lambda m: m[1] + str(new) + m[2], header)
        assert count == 1
    five = (header + text[start:]).encode()
    expected['closed_dispositions'], expected['open_or_deferred'] = 363, 1334
    assert json.loads(five) == expected and preserved(before, five, set(SHAS)) == 1692
    census = json.loads((root / 'compatibility/rc/checker-reference-metadata-review.json').read_bytes())
    assert len(census['selected_entries']) == 14
    text, _, ranges = spans(five)
    metadata, selected = {}, set()
    for change in census['selected_entries']:
        index = next(i for i, row in enumerate(expected['entries']) if row['sha'] == change['sha'])
        row = expected['entries'][index]
        assert row['sha'] not in SHAS
        member = row['individual_proof']['historical_behavior']['source_members'][change['source_member_index']]
        assert member == dict(path=CHECKER, sha256=OLD_CHECKER)
        member['sha256'] = NEW_CHECKER
        begin, end = ranges[index]
        updated, count = re.subn(r'("path": "' + re.escape(CHECKER) + r'",\n\s+"sha256": ")' + OLD_CHECKER + r'(")',
                                lambda m: m[1] + NEW_CHECKER + m[2], text[begin:end])
        assert count == 1
        metadata[row['sha']] = updated
        selected.add(row['sha'])
    assert len(selected) == 14
    after = replace_entries(five, metadata)
    assert json.loads(after) == expected
    assert preserved(five, after, selected) == 1683
    assert preserved(before, after, set(SHAS) | selected) == 1678
    return before, five, after


def derive_unthemable_successor(root=ROOT, expected_before=None):
    before, _, after = derive_unthemable_stages(root=root, expected_before=expected_before)
    return before, after


def verify_unthemable_successor(root=ROOT, expected_before=None, candidate=None):
    before, five, after = derive_unthemable_stages(root=root, expected_before=expected_before)
    current = Path(candidate).read_bytes() if candidate else (root / LEDGER).read_bytes()
    if current != after:
        from modern_control_base_ledger_patch import verify_control_successor
        verify_control_successor(root=root, expected_before=after, candidate=candidate)
    return dict(line='21.x', individual_decisions=5, checker_digest_tokens_updated=14,
        five_decision_stage_unselected_entry_bytes_preserved=1692, final_unmodified_entry_bytes_preserved=1678,
        before_sha256=HASH(before), five_decision_stage_sha256=HASH(five), after_sha256=HASH(after), after_bytes=len(after),
        closed_dispositions=363, pending_dispositions=1334, actual_native_artifact_browser_floor_or_full_audit_qualified=False,
        g11_claim='not-passed', g13_claim='not-passed')


if __name__ == '__main__':
    print(json.dumps(verify_unthemable_successor(candidate=sys.argv[1] if len(sys.argv) > 1 else None)))

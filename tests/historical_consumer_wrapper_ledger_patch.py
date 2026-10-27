# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent Python reconstruction of the exact 65 wrapper-reference successors."""
import copy
import hashlib
import json
from pathlib import Path
import sys
from autocomplete_selection_source_refs import _git

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PACKET = 'compatibility/rc/historical-consumer-wrapper-ledger-successor.json'
TRANSPORT = 'compatibility/rc/historical-consumer-wrapper-successor.json'
QUALIFICATION = 'compatibility/rc/historical-consumer-wrapper-transport-qualification.json'
SUBJECTS = {
    'main': ('35688ab4bfe88de585342f194f3463f409c03cbc', 'bee1639e775904d7d7a5a6434b6e025455a7be03851a80e83cb66d29a0320df2',
             '374a5bd7cb371679f0fb166822fd153a0a4b6445ab2496767bcc66452c972935', 'a1f9d4e3455d6c8ffc74bbbfefa69b001c0db6a091c3edfefab57999e7c3d0b4'),
    '21.x': ('0b04eb7edafa94c1545d419a2b5455f5a95030c7', '04d7e2bf4ec9801b28b2fb5093a2d748427801b2fc3d9cbcbc88e38369b44271',
             'fd028ae0b6b506d0bee6f5f540fd39360a545e0b6c00627dc48bff00bf1f5825', 'fa2aa9675b856020dd4e24791d74684ce47513bfd248d81b21e1d61775200502'),
}
SHA = lambda raw: hashlib.sha256(raw).hexdigest()
JSON = lambda value: (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode()


def verify_consumer_wrapper_successor(expected_before=None, root=ROOT, candidate=None):
    version = json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version']
    line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
    parent, before_hash, packet_pin, transport_pin = SUBJECTS[line]
    packet_raw = (root / PACKET).read_bytes()
    assert SHA(packet_raw) == packet_pin
    packet = json.loads(packet_raw)
    before = _git(root, parent, LEDGER)
    assert SHA(before) == before_hash == packet['before']['sha256']
    assert packet['before']['source_parent'] == parent and packet['before']['entries'] == 1697
    if expected_before is not None:
        assert before == expected_before
    assert packet['metadata_entry_replacements'] == packet['source_reference_updates'] == packet['report_reference_updates'] == packet['report_digest_updates'] == 65
    assert packet['original_hunks_preserved'] == 7770
    assert packet['new_upstream_SHA_decisions'] == packet['original_dispositions_or_hunk_judgments_changed'] == packet['unrelated_entry_or_byte_changes'] == 0
    assert not packet['actual_native_artifact_floor_or_G11_qualified']
    refs = {ref['path']: ref for ref in packet['qualification_members']}
    for ref in [packet['code_subject'], *packet['qualification_members']]:
        raw = (root / ref['path']).read_bytes()
        assert SHA(raw) == ref['sha256'] and len(raw) == ref['bytes']
    transport_raw = (root / TRANSPORT).read_bytes()
    assert SHA(transport_raw) == transport_pin
    transport = json.loads(transport_raw)
    assert len(transport['wrappers']) == 23 and transport['original_assertion_or_timeout_changes'] == 0
    wrappers = {row['path']: row for row in transport['wrappers']}
    for row in wrappers.values():
        raw = (root / row['path']).read_bytes()
        assert SHA(raw) == row['after']['sha256'] and len(raw) == row['after']['bytes']
        recovered = raw.decode()
        for edit in reversed(row['literal_edits']):
            assert recovered.count(edit['after']) == 1
            recovered = recovered.replace(edit['after'], edit['before'])
        assert recovered.encode() == _git(root, parent, row['path'])
        assert SHA(recovered.encode()) == row['before']['sha256']
    qualified_raw = (root / QUALIFICATION).read_bytes()
    assert SHA(qualified_raw) == refs[QUALIFICATION]['sha256']
    qualified = json.loads(qualified_raw)
    assert qualified['transport_methods_passed'] == 23 and qualified['transport_methods_failed'] == 0
    assert qualified['original_assertions_constants_names_and_timeouts_preserved']
    before_qualified_ref = transport['pre_transport_current_contract_qualification']
    assert (root / before_qualified_ref['path']).read_bytes() == _git(root, parent, before_qualified_ref['path'])
    original, expected = json.loads(before), json.loads(before)
    selected = [row['sha'] for row in original['entries'] if any(ref['path'] in wrappers for ref in row.get('individual_proof', {}).get('source_evidence', []))]
    assert len(selected) == 65
    assert selected == [row['sha'] for row in packet['entries']] == [row['sha'] for row in transport['canonical_reference_refresh_required']]
    changes, hunks = {}, 0
    for index, prior in enumerate(original['entries']):
        if prior['sha'] not in selected:
            continue
        transition = next(row for row in transport['canonical_reference_refresh_required'] if row['sha'] == prior['sha'])
        recorded = next(row for row in packet['entries'] if row['sha'] == prior['sha'])
        assert SHA(JSON(prior)) == transition['before_entry_sha256'] == recorded['before_entry_sha256']
        review_raw = _git(root, parent, prior['evidence_report'])
        assert (root / prior['evidence_report']).read_bytes() == review_raw
        review = json.loads(review_raw)
        assert review['individual_proof'] == prior['individual_proof']
        hunk_ref = transition['original_hunk_review_subject']
        hunk_raw = _git(root, parent, hunk_ref['path'])
        assert (root / hunk_ref['path']).read_bytes() == hunk_raw and SHA(hunk_raw) == hunk_ref['sha256']
        hunk_review = json.loads(hunk_raw)
        assert len(hunk_review['hunk_reviews']) == transition['original_hunks']
        hunks += transition['original_hunks']
        entry, successor = copy.deepcopy(prior), copy.deepcopy(review)
        for update in transition['source_reference_changes']:
            position = update['index']
            assert prior['individual_proof']['source_evidence'][position] == update['before']
            entry['individual_proof']['source_evidence'][position] = copy.deepcopy(update['after'])
            successor['independent_source_evidence'][position] = copy.deepcopy(update['after'])
        old_ref = {'path': prior['evidence_report'], 'sha256': SHA(review_raw), 'bytes': len(review_raw)}
        context = dict(role='Exact historical wrapper reference metadata; inherited source fields retain their recorded original epoch.',
            source_parent=parent, prior_entry_sha256=transition['before_entry_sha256'], prior_review=old_ref,
            wrapper_transport=refs[TRANSPORT], transport_qualification=refs[QUALIFICATION],
            pre_transport_current_contract_qualification=refs[before_qualified_ref['path']], original_hunk_review_subject=refs[hunk_ref['path']],
            original_hunk_judgments_dispositions_and_native_requirements_preserved=True,
            actual_native_artifact_browser_floor_or_full_audit_qualified=False, g11_claim='not-passed')
        entry['individual_proof']['historical_consumer_wrapper_successor'] = copy.deepcopy(context)
        successor['individual_proof'] = copy.deepcopy(entry['individual_proof'])
        successor['historical_consumer_wrapper_successor'] = copy.deepcopy(context)
        path = 'compatibility/f10/disposition-ledger/evidence/closeout-historical-consumer-wrapper-' + prior['sha'] + '.json'
        report_raw = JSON(successor)
        assert (root / path).read_bytes() == report_raw
        entry['evidence_report'] = path
        assert entry['source_check']['evidence_report_sha256'] == SHA(review_raw)
        entry['source_check']['evidence_report_sha256'] = SHA(report_raw)
        assert entry == recorded['after_entry']
        expected['entries'][index] = entry
        changes[index] = entry
    assert hunks == 7770
    # Independent Python decoder walks every JSON value; production uses a
    # string-aware entry scanner and assembles unchanged spans in one pass.
    text, decoder, spans = before.decode(), json.JSONDecoder(), {}

    def parse(pos, path=()):
        while text[pos].isspace(): pos += 1
        start = pos
        if text[pos] in '{[':
            obj, end = text[pos] == '{', '}' if text[pos] == '{' else ']'
            pos += 1
            index = 0
            while True:
                while text[pos].isspace(): pos += 1
                if text[pos] == end:
                    pos += 1
                    break
                if obj:
                    key, pos = decoder.raw_decode(text, pos)
                    while text[pos].isspace(): pos += 1
                    assert text[pos] == ':'
                    pos += 1
                else:
                    key = index
                pos = parse(pos, path + (key,))
                index += 1
                while text[pos].isspace(): pos += 1
                if text[pos] == ',': pos += 1
                else: assert text[pos] == end
        else:
            _, pos = decoder.raw_decode(text, pos)
        if len(path) == 2 and path[0] == 'entries': spans[path[1]] = (start, pos)
        return pos

    parse(0)
    assert len(spans) == 1697
    after_text = text
    for index in sorted(changes, reverse=True):
        start, end = spans[index]
        replacement = json.dumps(changes[index], indent=2, ensure_ascii=False).replace('\n', '\n    ')
        after_text = after_text[:start] + replacement + after_text[end:]
    after = after_text.encode()
    assert json.loads(after) == expected and SHA(after) == packet['after_sha256'] and len(after) == packet['after_bytes']
    actual = Path(candidate).read_bytes() if candidate else (root / LEDGER).read_bytes()
    if actual != after and line == '21.x':
        # Only the independently reconstructed one-SHA semantic successor may
        # follow this unchanged 65-entry metadata boundary.
        from legacy_sass_entrypoint_ledger_patch import verify_sass_entrypoint_successor
        verify_sass_entrypoint_successor(expected_before=after, root=root, candidate=candidate)
    else:
        assert actual == after
    assert [(row['sha'], row['final_disposition']) for row in original['entries']] == [(row['sha'], row['final_disposition']) for row in expected['entries']]
    return dict(line=line, metadata_entries=65, original_hunks_preserved=7770, other_entries_preserved=1632,
                canonical_applied=candidate is None,
                original_decisions_changed=0, actual_native_or_floor_qualified=False)


if __name__ == '__main__':
    result = verify_consumer_wrapper_successor(candidate=sys.argv[1] if len(sys.argv) > 1 else None)
    print(json.dumps(result))

# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent reverse-wrapper proof and exact four-entry reconstruction."""
import copy
import hashlib
import json
from pathlib import Path
import sys
from autocomplete_selection_source_refs import _git

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PACKET = 'compatibility/rc/historical-chip-source-wrapper-ledger-successor.json'
TRANSPORT = 'compatibility/rc/historical-chip-source-wrapper-successor.json'
SUBJECTS = {
    'main': ('1faf3f64ac8a9e7f2f0f8dd28c2b61c166c80538', '6d8eefe966fc691b233fb4cb99533ba7135c575eb79905ba100fe56f32e0b6e7',
             '3e8a3e66ae603768d60d22f646b19ec283e6c599b0df5274363533a7d70efd30', '2e6324398def110088c9a513312a9e8977aaf26ba6ee2c00f65c1d2d713ce9ef'),
    '21.x': ('8e3f12f6626edc5fcf87fa65175da16dfe58677b', '92f3a309bccd6907f9c92cbfd9b85379f416847ab48c945aba6e38234e718022',
             'a2d4e3cebf6306041a79336ccc9643f0b67a8fc3924fafbfb7ce60f393c80ead', '7c54a1d66d1e3f65b24a4f74129344d18a6e2bf9631c54e0b735005d0c1d5131'),
}
SHAS = ('cb820b1d8a8d942965790b75b48c21e345c86219', '45582795cc29c3bcb1265b7f6c541b165be3ef9d',
        'f35961a095dc2fbee6bfeb09878a82d391932cf7', '96503186a6316cf2811eaa885f64cb5ab1ffed6e')
SHA = lambda raw: hashlib.sha256(raw).hexdigest()
JSON = lambda value: (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode()


def verify_historical_wrapper_successor(expected_before=None, root=ROOT, candidate=None):
    version = json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version']
    line = '21.x' if version.startswith('21.') else 'main' if version.startswith('22.') else None
    assert line in SUBJECTS
    parent, before_hash, packet_pin, transport_pin = SUBJECTS[line]
    raw = (root / PACKET).read_bytes()
    assert SHA(raw) == packet_pin
    packet = json.loads(raw)
    assert packet['line'] == line and packet['schema_version'] == 1
    assert packet['before']['source_parent'] == parent and packet['before']['path'] == LEDGER
    assert packet['metadata_entry_replacements'] == packet['source_reference_updates'] == packet['report_reference_updates'] == packet['report_digest_updates'] == 4
    assert packet['original_hunks_preserved'] == 198
    assert packet['original_dispositions_or_hunk_judgments_changed'] == packet['unrelated_entry_or_byte_changes'] == 0
    assert not packet['actual_native_artifact_floor_or_G11_qualified'] and packet['g11_claim'] == 'not-passed'
    before = _git(root, parent, LEDGER)
    assert SHA(before) == before_hash == packet['before']['sha256'] and len(before) == packet['before']['bytes']
    assert packet['before']['entries'] == 1697
    if expected_before is not None:
        assert before == expected_before
    ref = packet['code_subject']
    assert ref['path'] == 'scripts/historical-chip-wrapper-metadata.mjs'
    raw = (root / ref['path']).read_bytes()
    assert SHA(raw) == ref['sha256'] and len(raw) == ref['bytes']
    refs = {ref['path']: ref for ref in packet['qualification_members']}
    for ref in packet['qualification_members']:
        raw = (root / ref['path']).read_bytes()
        assert SHA(raw) == ref['sha256'] and len(raw) == ref['bytes']
        assert raw == _git(root, parent, ref['path'])
    transport_raw = (root / TRANSPORT).read_bytes()
    assert SHA(transport_raw) == transport_pin
    transport = json.loads(transport_raw)
    assert transport['line'] == line and transport['schema_version'] == 1
    assert transport['original_assertions_or_constants_removed'] == transport['Python_test_names_changed'] == transport['product_TS_HTML_CSS_SCSS_or_native_case_changes'] == 0
    assert [row['path'] for row in transport['wrappers']] == ['tests/test_spec_' + f + '_async_source.py' for f in ('surface', 'form', 'navigation')]
    for row in transport['wrappers']:
        current = (root / row['path']).read_bytes()
        assert SHA(current) == row['after']['sha256'] and len(current) == row['after']['bytes']
        text = current.decode()
        assert len(row['literal_edits']) == 2
        for edit in reversed(row['literal_edits']):
            assert text.count(edit['after']) == 1
            text = text.replace(edit['after'], edit['before'])
        recovered = text.encode()
        assert recovered == _git(root, transport['source_parent'], row['path'])
        assert SHA(recovered) == row['before']['sha256'] and len(recovered) == row['before']['bytes']
    assert [row['sha'] for row in transport['canonical_reference_refresh_required']] == list(SHAS)
    assert [row['sha'] for row in packet['entries']] == list(SHAS)
    original, expected = json.loads(before), json.loads(before)
    nav = transport['wrappers'][2]
    assert [row['sha'] for row in original['entries'] if any(ref['path'] == nav['path'] for ref in row.get('individual_proof', {}).get('source_evidence', []))] == list(SHAS)
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
                    key, index = index, index + 1
                pos = parse(pos, path + (key,))
                while text[pos].isspace(): pos += 1
                if text[pos] == ',': pos += 1
                else: assert text[pos] == end
        else:
            _, pos = decoder.raw_decode(text, pos)
        spans[path] = start, pos
        return pos

    parse(0)
    by_sha = {row['sha']: i for i, row in enumerate(original['entries'])}
    edits, hunks = [], 0
    qualification = refs['compatibility/rc/historical-chip-source-inspector-qualification.json']
    for selected, change in zip(transport['canonical_reference_refresh_required'], packet['entries']):
        i = by_sha[selected['sha']]
        prior = original['entries'][i]
        assert SHA(JSON(prior)) == selected['before_entry_sha256'] == change['before_entry_sha256']
        assert prior['final_disposition'] == 'do-not-adopt' and prior['g11_claim'] == 'not-passed'
        assert prior['evidence_report'] == selected['evidence_report']
        old_bytes = _git(root, parent, prior['evidence_report'])
        assert old_bytes == (root / prior['evidence_report']).read_bytes()
        old_ref = dict(path=prior['evidence_report'], sha256=SHA(old_bytes), bytes=len(old_bytes))
        assert change['prior_review'] == old_ref
        body = json.loads(old_bytes)
        assert body['sha'] == prior['sha'] and body['line'] == line and body['status'] == 'reviewed' and body['g11_claim'] == 'not-passed'
        assert body['individual_proof'] == prior['individual_proof']
        assert SHA(_git(root, parent, body['patch_file'])) == body['diff_sha256']
        assert len(body['hunk_reviews']) == body['original_hunks']
        hunks += body['original_hunks']
        index = selected['reference_index']
        assert [j for j, ref in enumerate(prior['individual_proof']['source_evidence']) if ref['path'] == nav['path']] == [index]
        old = prior['individual_proof']['source_evidence'][index]
        assert old == selected['before_reference'] and old['sha256'] == nav['before']['sha256']
        new = dict(old, sha256=nav['after']['sha256'])
        assert new == selected['after_reference']
        context = dict(role='Exact original-source wrapper transport metadata; inherited review fields retain their original epoch.',
                       source_parent=parent, prior_entry_sha256=SHA(JSON(prior)), prior_review=old_ref,
                       wrapper_delta=refs[TRANSPORT], pre_metadata_source_qualification=qualification,
                       original_hunk_judgments_dispositions_and_native_requirements_preserved=True,
                       source_reference_updates=1, actual_Angular_native_artifact_rendered_or_floor_qualified=False, g11_claim='not-passed')
        entry, review = copy.deepcopy(prior), copy.deepcopy(body)
        entry['individual_proof']['source_evidence'][index] = new
        entry['individual_proof']['historical_source_wrapper_successor'] = copy.deepcopy(context)
        review['individual_proof'] = copy.deepcopy(entry['individual_proof'])
        assert review['independent_source_evidence'][index] == old
        review['independent_source_evidence'][index] = copy.deepcopy(new)
        review['historical_source_wrapper_successor'] = copy.deepcopy(context)
        path = 'compatibility/f10/disposition-ledger/evidence/closeout-historical-source-wrapper-' + prior['sha'] + '.json'
        raw = (root / path).read_bytes()
        assert raw == JSON(review)
        current_ref = dict(path=path, sha256=SHA(raw), bytes=len(raw))
        assert change['current_review'] == current_ref
        entry['evidence_report'] = path
        assert entry['source_check']['evidence_report_sha256'] == old_ref['sha256']
        entry['source_check']['evidence_report_sha256'] = current_ref['sha256']
        assert entry == change['after_entry']
        expected['entries'][i] = entry
        start, end = spans[('entries', i)]
        edits.append((start, end, json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n    ')))
    assert hunks == 198 and len(edits) == 4
    chunks, end = [], 0
    for start, finish, value in sorted(edits):
        assert start >= end
        chunks.extend((text[end:start], value))
        end = finish
    chunks.append(text[end:])
    after = ''.join(chunks).encode()
    assert SHA(after) == packet['after_sha256'] and len(after) == packet['after_bytes'] and json.loads(after) == expected
    actual = (root / LEDGER).read_bytes()
    successor_applied = False
    if candidate is not None:
        assert candidate == after
    elif actual != after:
        from historical_consumer_wrapper_ledger_patch import verify_consumer_wrapper_successor
        successor_applied = verify_consumer_wrapper_successor(expected_before=after, root=root)['canonical_applied']
        assert successor_applied
    return dict(line=line, result='pass', metadata_entry_replacements=4, source_reference_updates=4,
                report_reference_updates=4, report_digest_updates=4, original_hunks_preserved=198,
                unchanged_other_entries=1693, original_dispositions_or_hunk_judgments_changed=0,
                unrelated_entry_or_byte_changes=0, canonical_applied=actual == after or successor_applied,
                before_sha256=SHA(before), after_sha256=SHA(after), actual_native_artifact_floor_or_G11_qualified=False)


if __name__ == '__main__':
    report = verify_historical_wrapper_successor()
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'x') as stream:
            stream.write(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))

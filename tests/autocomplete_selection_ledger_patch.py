# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent three-entry/eleven-scalar reconstruction, without TypeScript."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
from autocomplete_selection_source_refs import _git
from autocomplete_selection_native_refs import native_registry_subject, REGISTRY

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PACKET = 'compatibility/rc/autocomplete-selection-ledger-successor.json'
PINS = {'main': 'dbee1262ff90ad59e8242b128c54a6f8d25de400ce26764d16043bb1ef3fa1c3',
        '21.x': 'c47ae399ecd8426ca2d20e6561ea3e37bb94084bce1e850c22d50065a63eb512'}
SHAS = ('d5d468a29a2db4c0676c57d60bc8431ed4fd6e18', '13629b0cd814ccc5fa01cf670b8b3001bc0021ff', 'cf868a5089a4c9eaddd4a55fd18b952fb96d5c19')
KINDS = ('autocomplete-reactive-selection-reset', 'autocomplete-actual-attachment-selection-value', 'autocomplete-optional-typing-and-null-only-selection-reset')
SHA = lambda raw: hashlib.sha256(raw).hexdigest()
JSON_BYTES = lambda value: (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode()


def verify_native_selection_successor(expected_before=None, root=ROOT):
    native = native_registry_subject(root)
    line = native['line']
    raw = (root / PACKET).read_bytes()
    assert SHA(raw) == PINS[line]
    packet = json.loads(raw)
    assert packet['line'] == line and packet['schema_version'] == 1
    assert packet['individual_source_judgments'] == 3 and packet['registry_proof_digest_updates'] == 11
    assert packet['other_entry_or_byte_changes'] == 0 and packet['actual_native_artifact_floor_or_G11_qualified'] is False
    assert packet['g11_claim'] == 'not-passed' and packet['before']['path'] == LEDGER
    before = _git(root, packet['before']['source_parent'], LEDGER)
    assert SHA(before) == packet['before']['sha256'] and len(before) == packet['before']['bytes']
    if expected_before is not None:
        assert before == expected_before
    original, expected = json.loads(before), json.loads(before)
    assert len(original['entries']) == packet['before']['entries'] == 1697
    for ref in packet['code_subjects'] + packet['qualification_members']:
        data = (root / ref['path']).read_bytes()
        assert SHA(data) == ref['sha256'] and len(data) == ref['bytes']
    assert [row['sha'] for row in packet['entries']] == list(SHAS)
    archive = json.loads(gzip.decompress((root / native['original_subjects']['path']).read_bytes()))
    proposals = json.loads((root / native['source_proposals']['path']).read_bytes())
    by_sha = {row['sha']: i for i, row in enumerate(original['entries'])}
    prior_empty = original['entries'][by_sha['db06fa8d8939d793f598bc3dbedc96a5a71c0db0']]
    common = [ref['path'] for ref in prior_empty['individual_proof']['historical_behavior']['source_members']][:-3]
    paths = common + ['scripts/autocomplete-selection-native-scopes.mjs'] + [ref['path'] for ref in native['current_product_subjects']]
    assert len(paths) == len(set(paths)) == 23
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
    edits = []
    for n, change in enumerate(packet['entries']):
        i, review_ref = by_sha[change['sha']], change['review']
        old = original['entries'][i]
        assert SHA(JSON_BYTES(old)) == change['before_entry_sha256']
        assert old['final_disposition'] == ('needs-individual-review' if line == '21.x' else 'already-adapted')
        raw_review = (root / review_ref['path']).read_bytes()
        assert SHA(raw_review) == review_ref['sha256'] and len(raw_review) == review_ref['bytes']
        body = json.loads(raw_review)
        source = next(row for row in archive['commits'] if row['sha'] == change['sha'])
        prior_review = proposals['reviews'][n]
        assert body['sha'] == change['sha'] and body['line'] == line and body['status'] == 'reviewed'
        assert body['review_depth'] == 'individual-compatibility' and body['final_disposition'] == 'already-adapted'
        assert body['diff'] == source['diff'] and SHA(body['diff'].encode()) == body['diff_sha256'] == prior_review['diff_sha256']
        assert body['hunk_reviews'] == prior_review['complete_original_hunk_reviews']
        assert body['original_hunks'] == len(body['hunk_reviews']) == (2, 5, 3)[n] and body['original_files'] == 2
        assert body['actual_native_browser_artifact_or_floor_executed'] is False and body['g11_claim'] == 'not-passed'
        cases = [{k: row[k] for k in ('case_id', 'historical_path', 'candidate', 'full_name')} for row in native['subjects'][n]['named_cases']]
        assert body['required_named_native_cases'] == cases and body['complete_historical_case_count'] == 2236
        assert body['current_owned_sources'] == native['current_product_subjects']
        assert body['source_protocol_cases_per_source'] == 14 and body['source_protocol_retained_minima'] == 2 and body['source_protocol_mutants_rejected'] == 9
        proof = dict(proof_kind='historical-required-individual-behavior', review_depth='individual-compatibility', diff_sha256=body['diff_sha256'],
                     affected_branches=[line], decision=body['decision'], historical_behavior=dict(kind=KINDS[n],
                       case_ids=[row['case_id'] for row in cases], source_members=[dict(path=p, sha256=SHA((root / p).read_bytes())) for p in paths]))
        current = dict(old, final_disposition='already-adapted', reason=body['decision'], read_note_disposition='individual-source-reviewed-on-' + line,
                       evidence_report=review_ref['path'], source_check=dict(kind='individual-source-reviewed-runtime-required', diff_sha256=body['diff_sha256'],
                         patch_archive=body['original_source_archive'], original_patch_member=change['sha'], evidence_report_sha256=review_ref['sha256']),
                       files=[row['path'] for row in source['members']], review_depth='individual-compatibility', affected_branches=[line], individual_proof=proof,
                       prior_dispositions=old.get('prior_dispositions', []) + [dict(source_parent=packet['before']['source_parent'], source_entry_sha256=SHA(JSON_BYTES(old)), source_line=line, final_disposition=old['final_disposition'])])
        assert change['after_entry'] == current
        expected['entries'][i] = current
        start, end = spans[('entries', i)]
        edits.append((start, end, json.dumps(current, indent=2, ensure_ascii=False).replace('\n', '\n    ')))
    old_native = {row['sha'] for row in original['entries'] if any(ref['path'] == REGISTRY for ref in row.get('individual_proof', {}).get('historical_behavior', {}).get('source_members', []))}
    assert len(old_native) == len(packet['source_digest_updates']) == 11
    assert {row['sha'] for row in packet['source_digest_updates']} == old_native
    for update in packet['source_digest_updates']:
        i, parts = by_sha[update['sha']], tuple(update['path'])
        assert update['sha'] not in SHAS and parts[:3] == ('individual_proof', 'historical_behavior', 'source_members') and len(parts) == 5 and parts[-1] == 'sha256'
        member = expected['entries'][i]['individual_proof']['historical_behavior']['source_members'][parts[3]]
        assert member['path'] == REGISTRY and member['sha256'] == update['before'] == native['registry']['before_sha256']
        assert update['after'] == native['registry']['after_sha256']
        member['sha256'] = update['after']
        start, end = spans[('entries', i) + parts]
        edits.append((start, end, json.dumps(update['after'])))
    pending = {'open', 'needs-individual-review', 'security-review'}
    closed = sum(row['final_disposition'] not in pending for row in expected['entries'])
    summary = [dict(field='closed_dispositions', before=original['closed_dispositions'], after=closed),
               dict(field='open_or_deferred', before=original['open_or_deferred'], after=1697-closed)]
    summary = [row for row in summary if row['before'] != row['after']]
    assert packet['summary_updates'] == summary and packet['disposition_values_changed'] == (3 if line == '21.x' else 0)
    for update in summary:
        expected[update['field']] = update['after']
        start, end = spans[(update['field'],)]
        edits.append((start, end, json.dumps(update['after'])))
    assert len(edits) == (16 if line == '21.x' else 14)
    chunks, end = [], 0
    for start, finish, value in sorted(edits):
        assert start >= end
        chunks.extend((text[end:start], value))
        end = finish
    chunks.append(text[end:])
    after = ''.join(chunks).encode()
    assert SHA(after) == packet['after_sha256'] and json.loads(after) == expected
    current = (root / LEDGER).read_bytes()
    if current != after:
        assert line == 'main'
        from sass_wrapper_notice_ledger_patch import verify_sass_notice_metadata_successor
        assert verify_sass_notice_metadata_successor(expected_before=after, root=root)['canonical_applied']
    assert expected['g11_claim'] == 'not-passed'
    return dict(line=line, result='pass', individual_source_admissions=3, registry_proof_digest_updates=11,
                summary_scalar_updates=len(summary), literal_edits=len(edits), unrelated_bytes_changed=0,
                canonical_applied=True, before_sha256=SHA(before), after_sha256=SHA(after), native_floor_or_G11_qualified=False)


if __name__ == '__main__':
    report = verify_native_selection_successor()
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'x') as output: output.write(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))

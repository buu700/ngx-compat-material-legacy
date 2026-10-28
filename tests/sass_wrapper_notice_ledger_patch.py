# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent twelve-entry reconstruction and immutable review preservation."""
import copy
import hashlib
import json
from pathlib import Path
import sys
from autocomplete_selection_source_refs import _git
from dialog_title_reader_refs import title_prior_tool_bytes
from sass_wrapper_notice_refs import qualified_notice_reference

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PACKET = 'compatibility/rc/sass-wrapper-notice-ledger-successor.json'
PARENT = 'a9976c96ba09af54754f1e3ec4cb4a98cd5ba49b'
PIN = '7f5f042a3c45b96c3f128c454d71acc9bc059d96be8d5cc927b99296ed5d565e'
SHA = lambda raw: hashlib.sha256(raw).hexdigest()
JSON = lambda value: (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode()


def verify_sass_notice_metadata_successor(expected_before=None, root=ROOT, candidate=None):
    assert json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('22.')
    raw = (root / PACKET).read_bytes()
    assert SHA(raw) == PIN
    packet = json.loads(raw)
    assert packet['schema_version'] == 1 and packet['line'] == 'main'
    assert packet['metadata_entry_replacements'] == 12 and packet['source_reference_updates'] == 20
    assert packet['report_reference_updates'] == 20 and packet['report_digest_updates'] == 4
    assert packet['original_hunks_preserved'] == 474
    assert packet['disposition_or_original_review_judgments_changed'] == packet['unrelated_entry_or_byte_changes'] == 0
    assert not packet['actual_native_artifact_floor_or_G11_qualified'] and packet['g11_claim'] == 'not-passed'
    assert packet['before']['path'] == LEDGER and packet['before']['source_parent'] == PARENT
    before = _git(root, PARENT, LEDGER)
    assert SHA(before) == packet['before']['sha256'] == '892cccca548a6f5b26821906561c5ea46ce127e443b96cf566ea48d27673f84b'
    assert len(before) == packet['before']['bytes'] and packet['before']['entries'] == 1697
    if expected_before is not None:
        assert before == expected_before
    for ref in [packet['code_subject']] + packet['qualification_members']:
        data = title_prior_tool_bytes(root, ref['path'])
        assert SHA(data) == ref['sha256'] and len(data) == ref['bytes']
    assert packet['code_subject']['path'] == 'scripts/sass-wrapper-notice-metadata.mjs'
    refs = {ref['path']: ref for ref in packet['qualification_members']}
    roster_path = 'compatibility/rc/sass-wrapper-notice-remaining-source-metadata.json'
    roster_bytes = _git(root, PARENT, roster_path)
    assert roster_bytes == (root / roster_path).read_bytes()
    assert SHA(roster_bytes) == 'cb1c405a09dc0d55cf493eb72122f8069b97cad10fbe216b30cde4a1864d935c'
    roster = json.loads(roster_bytes)
    source_ref = refs['compatibility/rc/sass-wrapper-notice-successor.json']
    reader_ref = refs['compatibility/rc/sass-wrapper-notice-reader-successors.json']
    source = json.loads((root / source_ref['path']).read_bytes())
    assert roster['source_delta'] == source_ref and len(source['subjects']) == 7
    notices = {row['path']: row for row in source['subjects']}
    for row in notices.values():
        assert qualified_notice_reference(root, dict(path=row['path'], **row['before'])) == dict(path=row['path'], **row['after'])
    original, expected = json.loads(before), json.loads(before)
    selected = [row for row in original['entries'] if any(ref['path'] in notices for ref in row.get('individual_proof', {}).get('source_evidence', []))]
    assert [row['sha'] for row in selected] == [row['sha'] for row in roster['selected_rows']] == [row['sha'] for row in packet['entries']]
    assert len(selected) == 12
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
    edits, source_updates, report_updates, digest_updates, hunks = [], 0, 0, 0, 0
    for subject, change in zip(roster['selected_rows'], packet['entries']):
        i = by_sha[subject['sha']]
        prior = original['entries'][i]
        assert prior['evidence_report'] == subject['evidence_report']
        assert prior['final_disposition'] == 'do-not-adopt' and prior['g11_claim'] == 'not-passed'
        assert prior['individual_proof']['proof_kind'] == 'individual-complete-spec-source-applicability'
        assert SHA(JSON(prior)) == change['before_entry_sha256']
        old_bytes = _git(root, PARENT, prior['evidence_report'])
        assert old_bytes == (root / prior['evidence_report']).read_bytes()
        old_ref = dict(path=prior['evidence_report'], sha256=SHA(old_bytes), bytes=len(old_bytes))
        assert change['prior_review'] == old_ref
        body = json.loads(old_bytes)
        assert body['individual_proof'] == prior['individual_proof'] and body['status'] == 'reviewed' and body['line'] == 'main'
        patch = body['diff'].encode() if 'diff' in body else _git(root, PARENT, body['patch_file'])
        assert SHA(patch) == body['diff_sha256'] and len(body['hunk_reviews']) == body['original_hunks']
        hunks += body['original_hunks']
        affected = [ref for ref in prior['individual_proof']['source_evidence'] if ref['path'] in notices]
        assert [dict(path=ref['path'], before_sha256=ref['sha256'], after_sha256=notices[ref['path']]['after']['sha256']) for ref in affected] == subject['affected_notice_references']

        def refresh(ref):
            if ref['path'] not in notices:
                return copy.deepcopy(ref)
            row = notices[ref['path']]
            assert ref['sha256'] == row['before']['sha256']
            result = dict(ref, sha256=row['after']['sha256'])
            if 'bytes' in ref:
                assert ref['bytes'] == row['before']['bytes']
                result['bytes'] = row['after']['bytes']
            return result

        context = dict(role='Exact silent-comment source metadata only; inherited review fields describe the original review epoch.',
                       source_parent=PARENT, prior_entry_sha256=SHA(JSON(prior)), prior_review=old_ref,
                       source_delta=source_ref, source_reader_delta=reader_ref, source_evidence_references_updated=len(affected),
                       original_hunks_judgments_dispositions_and_native_requirements_preserved=True,
                       actual_Angular_native_artifact_rendered_or_floor_executed=False, g11_claim='not-passed')
        entry, review = copy.deepcopy(prior), copy.deepcopy(body)
        entry['individual_proof']['source_evidence'] = [refresh(ref) for ref in prior['individual_proof']['source_evidence']]
        entry['individual_proof']['silent_Sass_notice_source_successor'] = copy.deepcopy(context)
        review['individual_proof'] = copy.deepcopy(entry['individual_proof'])
        assert [ref for ref in review['independent_source_evidence'] if ref['path'] in notices] == affected
        review['independent_source_evidence'] = [refresh(ref) for ref in review['independent_source_evidence']]
        review['silent_Sass_notice_source_successor'] = copy.deepcopy(context)
        path = 'compatibility/f10/disposition-ledger/evidence/closeout-sass-notice-source-' + prior['sha'] + '.json'
        current_bytes = (root / path).read_bytes()
        assert json.loads(current_bytes) == review and current_bytes == JSON(review)
        current_ref = dict(path=path, sha256=SHA(current_bytes), bytes=len(current_bytes))
        assert change['current_review'] == current_ref and change['reference_updates'] == len(affected)
        entry['evidence_report'] = path
        if isinstance(entry['source_check'], dict):
            assert entry['source_check']['evidence_report_sha256'] == old_ref['sha256']
            entry['source_check']['evidence_report_sha256'] = current_ref['sha256']
            digest_updates += 1
        assert entry == change['after_entry']
        expected['entries'][i] = entry
        start, end = spans[('entries', i)]
        edits.append((start, end, json.dumps(entry, indent=2, ensure_ascii=False).replace('\n', '\n    ')))
        source_updates += len(affected)
        report_updates += len(affected)
    assert (source_updates, report_updates, digest_updates, hunks) == (20, 20, 4, 474)
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
    if candidate is None and actual != after:
        from historical_chip_wrapper_ledger_patch import verify_historical_wrapper_successor
        successor_applied = verify_historical_wrapper_successor(expected_before=after, root=root)['canonical_applied']
        assert successor_applied
    else:
        assert (candidate if candidate is not None else actual) == after
    assert expected['g11_claim'] == 'not-passed'
    return dict(line='main', result='pass', metadata_entry_replacements=12, source_reference_updates=20,
                report_reference_updates=20, report_digest_updates=4, original_hunks_preserved=474,
                unchanged_other_entries=1685, disposition_or_original_hunk_judgments_changed=0,
                unrelated_entry_or_byte_changes=0, canonical_applied=actual == after or successor_applied,
                before_sha256=SHA(before), after_sha256=SHA(after), actual_native_artifact_floor_or_G11_qualified=False)


if __name__ == '__main__':
    report = verify_sass_notice_metadata_successor()
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'x') as stream:
            stream.write(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))

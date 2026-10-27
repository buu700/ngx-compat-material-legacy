# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact five-scalar ledger reconstruction; no TS parser."""
import hashlib
import json
from pathlib import Path
import sys
from autocomplete_selection_source_refs import _git, spec_subject, qualified_reference

ROOT = Path(__file__).resolve().parents[1]
SHA = lambda raw: hashlib.sha256(raw).hexdigest()
PATH = 'compatibility/f10/disposition-ledger/ledger.json'


def verify_selection_metadata(expected_before=None, root=ROOT):
    line = '21.x' if json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
    raw = (root / 'compatibility/rc/autocomplete-selection-spec-ledger-successor.json').read_bytes()
    assert SHA(raw) == {'main': '25e1e6731fa14c62a976dc9c04389f89d57b27b9d80742f44e97fdd18946adce',
                        '21.x': '46338d4f9dc08c0e93a22611352cbbcb9170baa98b58323d1ffed4252963dac4'}[line]
    packet = json.loads(raw)
    assert packet['line'] == line and packet['before']['path'] == PATH and packet['before']['entries'] == 1697
    assert packet['current_native_proof_source_digests_updated'] == 3 and packet['current_source_review_pointers_updated'] == 2
    assert packet['disposition_reason_or_required_case_changes'] == packet['header_count_changes'] == packet['other_entry_or_byte_changes'] == 0
    assert packet['actual_native_browser_artifact_or_floor_executed'] is False
    before = _git(root, packet['before']['source_parent'], PATH)
    assert SHA(before) == packet['before']['sha256']
    if expected_before is not None:
        assert before == expected_before
    spec = spec_subject(root)
    for ref in [packet['source_spec'], packet['source_readers'], packet['code_subject'], packet['current_review'], packet['historical_review']]:
        current = qualified_reference(root, ref)
        data = (root / current['path']).read_bytes()
        assert SHA(data) == current['sha256'] and len(data) == current['bytes']
    text, decoder, spans = before.decode(), json.JSONDecoder(), {}

    def parse(pos, path=()):
        while text[pos].isspace(): pos += 1
        start = pos
        if text[pos] in '{[':
            obj = text[pos] == '{'
            end = '}' if obj else ']'
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
    original = json.loads(before)
    expected = json.loads(before)
    by_sha = {row['sha']: i for i, row in enumerate(original['entries'])}
    assert len(by_sha) == 1697
    updates = []
    for row in original['entries']:
        for i, member in enumerate(row.get('individual_proof', {}).get('historical_behavior', {}).get('source_members', [])):
            if member['path'] == spec['path']:
                assert member['sha256'] == spec['before']['sha256']
                updates.append(dict(sha=row['sha'], path=['individual_proof', 'historical_behavior', 'source_members', i, 'sha256'], before=member['sha256'], after=spec['after']['sha256']))
    assert len(updates) == 3
    landscape = original['entries'][by_sha['008212a9807fd01fd32fe136a075763b7b2c854d']]
    assert landscape['evidence_report'] == packet['historical_review']['path']
    updates += [dict(sha=landscape['sha'], path=['evidence_report'], before=landscape['evidence_report'], after=packet['current_review']['path']),
                dict(sha=landscape['sha'], path=['source_check', 'evidence_report_sha256'], before=landscape['source_check']['evidence_report_sha256'], after=packet['current_review']['sha256'])]
    assert packet['literal_updates'] == updates
    edits = []
    for update in updates:
        i, parts = by_sha[update['sha']], tuple(update['path'])
        value = expected['entries'][i]
        for key in parts[:-1]: value = value[key]
        assert value[parts[-1]] == update['before']
        value[parts[-1]] = update['after']
        start, end = spans[('entries', i) + parts]
        assert json.loads(text[start:end]) == update['before']
        edits.append((start, end, json.dumps(update['after'])))
    chunks, end = [], 0
    for start, finish, value in sorted(edits):
        assert start >= end
        chunks.extend((text[end:start], value))
        end = finish
    chunks.append(text[end:])
    after = ''.join(chunks).encode()
    assert SHA(after) == packet['after_sha256'] and json.loads(after) == expected
    assert (root / PATH).read_bytes() == after
    assert expected['g11_claim'] == 'not-passed'
    return dict(line=line, result='pass', individual_SHA_decisions_changed=0, exact_literal_updates=5,
                native_proof_spec_digests=3, source_review_pointers=2, unrelated_bytes_changed=0,
                before_sha256=SHA(before), after_sha256=SHA(after), canonical_applied=True,
                actual_native_or_floor_or_G11_qualified=False)


if __name__ == '__main__':
    report = verify_selection_metadata()
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'x') as output: output.write(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))

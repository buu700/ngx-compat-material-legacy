# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact entry/scalar reconstruction; no production TS parser."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from autocomplete_selection_native_refs import native_registry_subject

ROOT = Path(__file__).resolve().parents[1]
SHA = lambda data: hashlib.sha256(data).hexdigest()
SUBJECT = '008212a9807fd01fd32fe136a075763b7b2c854d'
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
REGISTRY = 'scripts/upstream-historical-behavior-evidence.mjs'
PINS = {'main': '823684fe3cb4a30ec4ef012c742df3dc140f010c1aa43f5407c4cd1c2266a6c8',
        '21.x': 'd8de61098c5eb4fba574da97b1e6d582f13a3a3be3332bdb83ad00aa9c0f64ba'}


def verify_landscape_successor(expected_before=None, root=ROOT):
    line = '21.x' if json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version'].startswith('21.') else 'main'
    raw = (root / 'compatibility/rc/autocomplete-landscape-ledger-transition.json.gz').read_bytes()
    assert SHA(raw) == PINS[line]
    packet = json.loads(gzip.decompress(raw))
    assert packet['line'] == line and packet['schema_version'] == 1
    assert packet['individual_source_judgments'] == 1 and packet['registry_proof_digests_changed'] == 10
    assert packet['unrelated_entry_or_original_hunk_changes'] == 0
    assert packet['current_native_packed_or_floor_or_g11_credit'] is False
    parent = {'main': '4039497f0d2b30d54194e9c4d9823860fff18f24', '21.x': '3af8792280c76e9f6935c88047e397a18bc951ea'}[line]
    assert packet['before']['path'] == LEDGER and packet['before']['source_parent'] == parent
    env = {**os.environ, 'GIT_NO_LAZY_FETCH': '1', 'GIT_NO_REPLACE_OBJECTS': '1'}
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)
    before = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', parent + ':' + LEDGER], cwd=root, env=env)
    assert SHA(before) == packet['before']['sha256']
    if expected_before is not None:
        assert before == expected_before
    text = before.decode()
    original = json.loads(before)
    assert len(original['entries']) == packet['before']['entries'] == 1697
    decoder, spans = json.JSONDecoder(), {}

    def parse(pos, path=()):
        while text[pos].isspace():
            pos += 1
        start = pos
        if text[pos] in '{[':
            obj = text[pos] == '{'
            end = '}' if obj else ']'
            pos += 1
            index = 0
            while True:
                while text[pos].isspace():
                    pos += 1
                if text[pos] == end:
                    pos += 1
                    break
                if obj:
                    key, pos = decoder.raw_decode(text, pos)
                    while text[pos].isspace():
                        pos += 1
                    assert text[pos] == ':'
                    pos += 1
                else:
                    key, index = index, index + 1
                pos = parse(pos, path + (key,))
                while text[pos].isspace():
                    pos += 1
                if text[pos] == ',':
                    pos += 1
                else:
                    assert text[pos] == end
        else:
            _, pos = decoder.raw_decode(text, pos)
        spans[path] = start, pos
        return pos

    parse(0)
    for ref in packet['code_subjects'] + [packet['review']] + packet['qualification_members']:
        from autocomplete_selection_source_refs import qualified_reference
        current_ref=qualified_reference(root,ref)
        value = (root / ref['path']).read_bytes()
        assert SHA(value) == current_ref['sha256'] and len(value) == current_ref['bytes']
    review = json.loads((root / packet['review']['path']).read_bytes())
    assert review['sha'] == SUBJECT and review['line'] == line and review['status'] == 'reviewed'
    assert review['original_files'] == 2 and review['original_hunks'] == len(review['hunk_reviews']) == 6
    assert review['actual_native_browser_artifact_or_floor_executed'] is False and review['g11_claim'] == 'not-passed'
    assert SHA((root / review['patch_file']).read_bytes()) == review['diff_sha256'] == '6aef092d6a8579b310fbf94242da1a1adf3125f3934ba5d7649d56f49290855b'
    assert [int(row['case_id'].split('#')[-1]) for row in review['required_named_native_cases']] == [105, 106, 107, 108, 110]
    entries = original['entries']
    by_sha = {row['sha']: i for i, row in enumerate(entries)}
    assert len(by_sha) == 1697
    index = by_sha[SUBJECT]
    old = entries[index]
    assert old['final_disposition'] == ('needs-individual-review' if line == '21.x' else 'already-adapted')
    old_digest = SHA((json.dumps(old, indent=2, ensure_ascii=False) + '\n').encode())
    assert packet['entry']['sha'] == SUBJECT and packet['entry']['before_entry_sha256'] == old_digest
    common_paths = [row['path'] for row in entries[by_sha['db06fa8d8939d793f598bc3dbedc96a5a71c0db0']]['individual_proof']['historical_behavior']['source_members']]
    paths = common_paths + ['projects/ngx-material-legacy/legacy-autocomplete/autocomplete.html', 'projects/ngx-material-legacy/legacy-autocomplete/autocomplete.scss']
    assert len(paths) == len(set(paths)) == 22
    proof = dict(proof_kind='historical-required-individual-behavior', review_depth='individual-compatibility',
                 diff_sha256=review['diff_sha256'], affected_branches=[line], decision=review['decision'],
                 historical_behavior=dict(kind='autocomplete-landscape-viewport',
                    case_ids=[row['case_id'] for row in review['required_named_native_cases']],
                    source_members=[dict(path=p, sha256='09a96761ccbb96309989dfc13517170c3600fb2bd57b3fb7e9c9cb02f788d423' if p.endswith('/autocomplete.spec.ts') else
                        native_registry_subject(root)['registry']['before_sha256'] if p == REGISTRY else SHA((root / p).read_bytes())) for p in paths]))
    current = dict(old, final_disposition='already-adapted', reason=review['decision'], read_note_disposition='individual-source-reviewed-on-' + line,
                   evidence_report=packet['review']['path'],
                   source_check=dict(kind='individual-source-reviewed-runtime-required', diff_sha256=review['diff_sha256'], patch_path=review['patch_file'], evidence_report_sha256=packet['review']['sha256']),
                   files=['src/material/autocomplete/autocomplete-trigger.ts', 'src/material/autocomplete/autocomplete.spec.ts'],
                   review_depth='individual-compatibility', affected_branches=[line], individual_proof=proof,
                   prior_dispositions=[dict(source_parent=parent, source_entry_sha256=old_digest, source_line=line, final_disposition=old['final_disposition'])])
    assert packet['entry']['after_entry'] == current
    start, end = spans[('entries', index)]
    edits = [(start, end, json.dumps(current, indent=2, ensure_ascii=False).replace('\n', '\n    '))]
    expected = json.loads(before)
    expected['entries'][index] = current
    native = {row['sha'] for row in entries if any(ref['path'] == REGISTRY for ref in row.get('individual_proof', {}).get('historical_behavior', {}).get('source_members', []))}
    assert len(native) == len(packet['source_digest_updates']) == 10
    assert {row['sha'] for row in packet['source_digest_updates']} == native
    for update in packet['source_digest_updates']:
        i, parts = by_sha[update['sha']], tuple(update['path'])
        assert i != index and parts[:3] == ('individual_proof', 'historical_behavior', 'source_members') and len(parts) == 5 and parts[-1] == 'sha256'
        member = expected['entries'][i]['individual_proof']['historical_behavior']['source_members'][parts[3]]
        assert member['path'] == REGISTRY and member['sha256'] == update['before'] == '7e04af26527d8520bdf3ae4b5ce7bfc861b642877c714708193bc87a8c7948f0'
        assert update['after'] == native_registry_subject(root)['registry']['before_sha256']
        member['sha256'] = update['after']
        start, end = spans[('entries', i) + parts]
        edits.append((start, end, json.dumps(update['after'])))
    summary = [dict(field='closed_dispositions', before=original['closed_dispositions'], after=original['closed_dispositions'] + 1),
               dict(field='open_or_deferred', before=original['open_or_deferred'], after=original['open_or_deferred'] - 1)] if line == '21.x' else []
    assert packet['summary_updates'] == summary and packet['disposition_values_changed'] == int(line == '21.x')
    for update in summary:
        start, end = spans[(update['field'],)]
        edits.append((start, end, json.dumps(update['after'])))
        expected[update['field']] = update['after']
    assert len(edits) == (13 if line == '21.x' else 11)
    chunks, previous_end = [], 0
    for start, end, value in sorted(edits):
        assert start >= previous_end
        chunks.extend((text[previous_end:start], value))
        previous_end = end
    chunks.append(text[previous_end:])
    after = ''.join(chunks).encode()
    assert SHA(after) == packet['after_sha256'] and json.loads(after) == expected
    assert expected['g11_claim'] == 'not-passed'
    if (root / LEDGER).read_bytes()!=after:
        from autocomplete_selection_metadata_patch import verify_selection_metadata
        successor=verify_selection_metadata(expected_before=after,root=root)
        assert successor['canonical_applied'] is True
    changed = {old['sha'] for old, new in zip(entries, expected['entries']) if old != new}
    assert changed == native | {SUBJECT}
    return dict(line=line, result='pass', independent_parser='Python JSON spans and independent entry construction; no TypeScript parser',
                canonical_entries=1697, individual_source_decisions=1, registry_digest_updates=10, header_updates=len(summary),
                total_literal_edits=len(edits), before_sha256=SHA(before), after_sha256=SHA(after), canonical_applied=True,
                unrelated_byte_changes=0, native_packed_floor_G11_qualified=False)


if __name__ == '__main__':
    report = verify_landscape_successor()
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'x') as output:
            output.write(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))

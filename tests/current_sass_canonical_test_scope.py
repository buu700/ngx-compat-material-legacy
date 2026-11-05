# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact registry comparison data; no historical source module is executed."""
import hashlib
import gzip
import json
import os
import re
import subprocess
from pathlib import Path

REGISTRY = 'scripts/upstream-source-contract-registry.mjs'
CURRENT = 'be50b37d181b43960361860dd7cb3bb24d0f2d1b0a2ecfaa5a85a791e4869399'
HISTORICAL = '03a18cd09e4183f4307f1ec2c17d0797eea72db0440e23530e4d015ea0dae6a8'
RECORDS = (
    b"  {sha:'f7e3ae3bd1b86d5987df57bb06d350001c592931',proof_kind:'individual-historical-legacy-removal-source-exclusion',\n"
    b"    scope_key:'legacy_removal_source_scope',module:'upstream-legacy-removal-admission.cjs'},\n",
    b"  {sha:'3f35b12290ea4dbee4a9d82845c0964b2b4df50d',proof_kind:'individual-historical-table-local-compilation-source-review',\n"
    b"    scope_key:'table_local_compilation_source_scope',module:'upstream-table-local-compilation-admission.cjs'},\n",
)
BASE_RECORD = (
    b"  {sha:'55f9618b687fc0da4743a3cf27e113ceb837e151',proof_kind:'individual-historical-base-class-removal-source-review',\n"
    b"    scope_key:'base_class_removal_source_scope',module:'upstream-base-class-removal-admission.cjs'},\n"
)
BASE_CURRENT = 'e90d2268e862284605dd9b4f5630c0d9d84976f6014679d1aa4acbc47f38c4cc'
LEDGER = 'compatibility/f10/disposition-ledger/ledger.json'
PROPOSAL = 'compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json'
PROPOSAL_SHA = '720a4fcd0c9d0d67afbeddd106fc9741d7ab34a0848edc1a0f2e6a25019b9881'
SOURCE_PARENT = 'd8ab97315b6c77b83f42c2bebcf63b2984fff255'


def _physical(root, path):
    cursor = Path(root)
    assert cursor.is_dir() and not cursor.is_symlink()
    for part in path.split('/'):
        assert part not in ('', '.', '..')
        cursor = cursor / part
        assert not cursor.is_symlink()
    assert cursor.is_file()
    return cursor.read_bytes()


def _git_data(root, path):
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0',
        '-c', 'maintenance.auto=0', 'show', SOURCE_PARENT + ':' + path], cwd=root, env=env)


def _proposal(root, bound):
    raw = _physical(root, PROPOSAL)
    assert len(raw) == 3578 and hashlib.sha256(raw).hexdigest() == PROPOSAL_SHA
    bound[PROPOSAL] = raw
    return json.loads(raw)


def _image(root, ref, bound):
    raw = _physical(root, ref['path'])
    assert len(raw) == ref['bytes'] and hashlib.sha256(raw).hexdigest() == ref['sha256']
    bound[ref['path']] = raw
    return gzip.decompress(raw)


def current_canonical_registry_subject(root):
    """Authenticate only current69/70; old67/69 programs are comparison DATA."""
    bound = {}
    packet = _proposal(root, bound)
    before = _image(root, packet['registry_before_image'], bound)
    after = _image(root, packet['registry_after_image'], bound)
    assert len(before) == 15548 and hashlib.sha256(before).hexdigest() == CURRENT
    assert len(after) == 15768 and hashlib.sha256(after).hexdigest() == BASE_CURRENT
    assert _git_data(root, REGISTRY) == before
    assert before.count(b'];\n') == 1
    assert before.replace(b'];\n', BASE_RECORD + b'];\n') == after
    raw = _physical(root, REGISTRY)
    assert raw in (before, after), 'unqualified current registry'
    bound[REGISTRY] = raw
    count = 69 if raw == before else 70

    def assert_current():
        for path, expected in bound.items():
            assert _physical(root, path) == expected, 'changed current test subject ' + path
    assert_current()
    return dict(raw=raw, comparison69=before, registered_source_contracts=count,
                assert_current=assert_current)


def current_canonical_test_frame(root):
    """Exact426/69,426/70 precursor or427/70; comparison bytes carry no authority."""
    registry = current_canonical_registry_subject(root)
    bound = {}
    packet = _proposal(root, bound)
    before = _image(root, packet['ledger_before_image'], bound)
    after = _image(root, packet['ledger_after_image'], bound)
    for name, raw in [('before', before), ('after', after)]:
        assert len(raw) == packet[name]['bytes']
        assert hashlib.sha256(raw).hexdigest() == packet[name]['sha256']
    assert _git_data(root, LEDGER) == before
    target = packet['sha']
    def span(raw):
        text = raw.decode()
        decoder = json.JSONDecoder()
        found = []
        for marker in re.finditer(r'^    \{', text, re.M):
            start = marker.start() + 4
            row, end = decoder.raw_decode(text, start)
            if row.get('sha') == target:
                found.append((start, end, row))
        assert len(found) == 1
        return text, found[0]
    old, (start, end, _) = span(before)
    new, (new_start, new_end, _) = span(after)
    expected = old[:start] + new[new_start:new_end] + old[end:]
    for key, prior, current in [('closed_dispositions', 426, 427), ('open_or_deferred', 1271, 1270)]:
        token = f'  "{key}": {prior},'
        assert expected.count(token) == 1
        expected = expected.replace(token, f'  "{key}": {current},', 1)
    assert expected.encode() == after  # All1696 unselected entry bytes remain exact.
    raw = _physical(root, LEDGER)
    assert raw in (before, after), 'unqualified current test ledger'
    assert raw != after or registry['registered_source_contracts'] == 70
    bound[LEDGER] = raw

    def assert_current():
        registry['assert_current']()
        for path, expected_raw in bound.items():
            assert _physical(root, path) == expected_raw, 'changed current test frame ' + path
    def comparison(path, supplied):
        assert_current()
        assert path in (LEDGER, REGISTRY)
        assert supplied == (raw if path == LEDGER else registry['raw'])
        return before if path == LEDGER else registry['comparison69']
    assert_current()
    return dict(comparison=comparison, assert_current=assert_current,
                registered_source_contracts=registry['registered_source_contracts'],
                individual_source_reviews=91 if raw == after else 90,
                base_class_decisions=1 if raw == after else 0)


def historical67_registry_bytes(root):
    """Authenticate current69/70, retain exact69→67 assertions on comparison DATA."""
    subject = current_canonical_registry_subject(root)
    raw = subject['comparison69']
    assert len(raw) == 15548 and hashlib.sha256(raw).hexdigest() == CURRENT
    comparison = raw
    for record in reversed(RECORDS):
        assert comparison.count(record) == 1
        comparison = comparison.replace(record, b'')
    assert hashlib.sha256(comparison).hexdigest() == HISTORICAL
    assert comparison.count(b'];\n') == 1
    expected = comparison
    for record in RECORDS:
        expected = expected.replace(b'];\n', record + b'];\n')
    assert expected == raw
    subject['assert_current']()
    return comparison


# Fixed historical JSON DATA epochs; no source-owner or old program executes.
_HISTORICAL424_SHA = 'cc74f78b748c9b1226338b96a979558510ab72e50fea4c223cae45a76f4980a1'
_LEDGER_DATA_PINS = {'compatibility/rc/21x-legacy-removal-admission-canonical-proposal.json': ('a4d300a0b5c6bc4070f940049d99ab6f3eab1f481ec34bb4a98e4b246f963eb7', 1494), 'compatibility/rc/21x-table-local-compilation-admission-canonical-proposal.json': ('970624c3e7d3e452b57789c35b90b79a37044ea269cf7ed96a5a2a40b3dac8a8', 1568), 'compatibility/rc/c04-inventory-reference-proposal.json': ('c1ace65c1154b0d97295be951b1bda4d2ba135c8ef7a9b117ba0c083ea9c0843', 27195), 'compatibility/rc/c04-checker-reference-proposal.json': ('58af70dec579e45bd47862065ec2bb8cfcfd7cbeb9081303930508f6d07c2d7f', 13538), 'compatibility/rc/c04-browser-reference-proposal.json': ('52d231aca902638226f5065c6622a6f857745990cdd23ee9df211aaf5e5ee56e', 18691), 'compatibility/rc/21x-table-local-compilation-admission-ledger-before.json.gz': ('8578ae4a1b3ef83c7ae32d7b4099ee097d14ba3b47bf4c3a851c104d1fad53a8', 606187), 'compatibility/rc/21x-table-local-compilation-admission-ledger-after.json.gz': ('26df249d622e57e4b9bb07c54ef688ba8e17d6bcc1da6bbdb4817c7097b69086', 607011), 'compatibility/rc/21x-legacy-removal-admission-ledger-before.json.gz': ('84de7f9c24d3e6a422658b9a87dc73b3a6bb0391556ad7c381ddf4c23f8a0ecc', 605384), 'compatibility/rc/21x-legacy-removal-admission-ledger-after.json.gz': ('8578ae4a1b3ef83c7ae32d7b4099ee097d14ba3b47bf4c3a851c104d1fad53a8', 606187)}
_LEDGER_GIT_DATA = ({'subject': 'd8ab97315b6c77b83f42c2bebcf63b2984fff255:compatibility/f10/disposition-ledger/ledger.json', 'git_blob': '68a336be1682c08108d05c1b5e6e6171628da6cd', 'sha256': 'e9ef5c0bf543977809134c3367cf9a33bdda62233ab6b944dc3c4e4ac101585e', 'bytes': 4191043}, {'subject': '24365f67b82cc9fe26cd5089384c5d27ce7f4ab2:compatibility/f10/disposition-ledger/ledger.json', 'git_blob': 'cf4b9454e123895d406224a0361de0bb7f7b0462', 'sha256': 'f0aa2808e6bf022e9901b6edc249e1b08e7be9b7af06af4f154131e4a54c9cee', 'bytes': 4183477}, {'subject': '7378668ffa018b9cbf5498d84a5db32fa824cc26:compatibility/f10/disposition-ledger/ledger.json', 'git_blob': 'cf089d4c3a40c71a44e974702e8880c881b86a8f', 'sha256': '8f311ad001bf2daa3152b878414bd010a621d31b76c118d19f4184e5bed0ef17', 'bytes': 4183477}, {'subject': '7bae903e9a1309c6e226909ed8ee1bae5ad4eccf:compatibility/f10/disposition-ledger/ledger.json', 'git_blob': 'ce7e827d67c73b86bea7c26670e7ed4d63c5e253', 'sha256': '558b6891e575422cdfcdaff2f59fa7611cf53246130da3afeec68571d1c77a1b', 'bytes': 4183477}, {'subject': '3aefef647f2237cca488d0b5de62cd2981f3dc7e:compatibility/f10/disposition-ledger/ledger.json', 'git_blob': '857e56ccb950cad64c4df069ca955c509b78a4f1', 'sha256': 'cc74f78b748c9b1226338b96a979558510ab72e50fea4c223cae45a76f4980a1', 'bytes': 4183477}, {'subject': '165839cf603d3255aa93d7feaee4e21adb20c2e1:compatibility/f10/disposition-ledger/ledger.json', 'git_blob': '900f4dc1f9da0f4e6e1ebd359ca8f817092f9d27', 'sha256': '4fd46af746fb9e2b0a27b0cd4b1341ed3b06cda873a6432eb4e6e35dbeb56ad9', 'bytes': 4187291})


def _historical_ledger_git_data(root):
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)
    output = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0',
        '-c', 'maintenance.auto=0', 'cat-file', '--batch'], cwd=root, env=env,
        input=('\n'.join(ref['subject'] for ref in _LEDGER_GIT_DATA) + '\n').encode())
    cursor, images = 0, {}
    for ref in _LEDGER_GIT_DATA:
        end = output.index(b'\n', cursor)
        assert output[cursor:end].decode() == f"{ref['git_blob']} blob {ref['bytes']}"
        raw = output[end + 1:end + 1 + ref['bytes']]
        cursor = end + 1 + ref['bytes']
        assert output[cursor:cursor + 1] == b'\n'
        cursor += 1
        assert len(raw) == ref['bytes'] and hashlib.sha256(raw).hexdigest() == ref['sha256']
        assert hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest() == ref['git_blob']
        images[ref['sha256']] = raw
    assert cursor == len(output)
    return images


def _ledger_entry_spans(raw):
    text, decoder, rows = raw.decode(), json.JSONDecoder(), {}
    for marker in re.finditer(r'^    \{', text, re.M):
        start = marker.start() + 4
        entry, end = decoder.raw_decode(text, start)
        assert type(entry) is dict and entry['sha'] not in rows
        rows[entry['sha']] = (start, end, entry)
    assert len(rows) == 1697
    return text, rows


def _semantic_ledger_data_pair(before, after, sha):
    """Exact one-row/two-scalar DATA proof, preserving all unselected bytes."""
    old, old_rows = _ledger_entry_spans(before)
    new, new_rows = _ledger_entry_spans(after)
    assert list(old_rows) == list(new_rows)
    changed = [key for key in old_rows if old_rows[key][2] != new_rows[key][2]]
    assert changed == [sha]
    start, end, _ = old_rows[sha]
    new_start, new_end, _ = new_rows[sha]
    expected = old[:start] + new[new_start:new_end] + old[end:]
    prior, current = json.loads(before), json.loads(after)
    for key, delta in [('closed_dispositions', 1), ('open_or_deferred', -1)]:
        assert current[key] == prior[key] + delta
        token = f'  "{key}": {prior[key]},'
        assert expected.count(token) == 1
        expected = expected.replace(token, f'  "{key}": {current[key]},', 1)
    assert expected.encode() == after
    assert prior['entries'] == [old_rows[key][2] for key in new_rows]
    assert [row for row in prior['entries'] if row['final_disposition'] == 'security-review'] == [
        row for row in current['entries'] if row['final_disposition'] == 'security-review']


def _metadata_ledger_data_pair(before, after, packet, count, selected_count):
    """Reproduce only the complete pinned reference cohort at exact JSON pointers."""
    text, rows = _ledger_entry_spans(before)
    expected = json.loads(before)
    entries = {row['sha']: row for row in expected['entries']}
    selected, seen = set(), set()
    assert len(packet['updates']) == count
    for update in packet['updates']:
        sha, pointer = update['sha'], update['pointer']
        assert (sha, pointer) not in seen
        seen.add((sha, pointer))
        parts = pointer.split('/')[1:]
        assert parts[0] == 'individual_proof' and parts[-2] == 'source_members'
        node = entries[sha]
        for part in parts[:-1]:
            node = node[int(part)] if type(node) is list else node[part]
        key = int(parts[-1]) if type(node) is list else parts[-1]
        assert node[key] == update['before_reference']
        assert set(node[key]) == {'path', 'sha256'}
        assert update['before_reference']['path'] == update['after_reference']['path']
        node[key] = dict(update['after_reference'])
        selected.add(sha)
    assert len(selected) == selected_count
    edits = []
    for sha in selected:
        start, end, prior = rows[sha]
        encoded = lambda value: (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode()
        updates = [row for row in packet['updates'] if row['sha'] == sha]
        assert all(hashlib.sha256(encoded(prior)).hexdigest() == row['before_entry_sha256'] for row in updates)
        assert all(hashlib.sha256(encoded(entries[sha])).hexdigest() == row['after_entry_sha256'] for row in updates)
        edits.append((start, end, json.dumps(entries[sha], indent=2, ensure_ascii=False).replace('\n', '\n    ')))
    for start, end, value in sorted(edits, reverse=True):
        text = text[:start] + value + text[end:]
    assert text.encode() == after and json.loads(after) == expected
    assert len(before) == len(after)
    assert {key: value for key, value in json.loads(before).items() if key != 'entries'} == {
        key: value for key, value in expected.items() if key != 'entries'}


def historical424_ledger_test_subject(root):
    """Current whole physical frame -> exact old424 JSON DATA; no source admission."""
    frame = current_canonical_test_frame(root)
    physical = _physical(root, LEDGER)
    current426 = frame['comparison'](LEDGER, physical)
    git = _historical_ledger_git_data(root)
    assert current426 == git['e9ef5c0bf543977809134c3367cf9a33bdda62233ab6b944dc3c4e4ac101585e']
    bound = {}

    def member(path):
        digest, size = _LEDGER_DATA_PINS[path]
        raw = _physical(root, path)
        assert len(raw) == size and hashlib.sha256(raw).hexdigest() == digest
        bound[path] = raw
        return raw

    current = current426
    for family, sha in [('table-local-compilation', '3f35b12290ea4dbee4a9d82845c0964b2b4df50d'),
                        ('legacy-removal', 'f7e3ae3bd1b86d5987df57bb06d350001c592931')]:
        prefix = 'compatibility/rc/21x-' + family + '-admission-'
        packet = json.loads(member(prefix + 'canonical-proposal.json'))
        before = gzip.decompress(member(prefix + 'ledger-before.json.gz'))
        after = gzip.decompress(member(prefix + 'ledger-after.json.gz'))
        for name, raw in [('before', before), ('after', after)]:
            assert packet[name] == dict(path=LEDGER, sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw))
            assert git[packet[name]['sha256']] == raw
        _semantic_ledger_data_pair(before, after, sha)
        assert current == after
        current = before
    for family, count, selected in [('browser', 16, 8), ('checker', 5, 5), ('inventory', 19, 19)]:
        packet = json.loads(member('compatibility/rc/c04-' + family + '-reference-proposal.json'))
        assert packet['line'] == '21.x'
        before, after = (git[packet[name]['sha256']] for name in ('before_ledger', 'after_ledger'))
        for name, raw in [('before_ledger', before), ('after_ledger', after)]:
            assert packet[name] == dict(path=LEDGER, sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw))
        _metadata_ledger_data_pair(before, after, packet, count, selected)
        assert current == after
        current = before
    assert len(current) == 4183477 and hashlib.sha256(current).hexdigest() == _HISTORICAL424_SHA

    def assert_current():
        frame['assert_current']()
        for path, expected in bound.items():
            assert _physical(root, path) == expected, 'changed historical ledger DATA subject ' + path
        frame['assert_current']()
    assert_current()
    return dict(comparison=current, assert_current=assert_current,
                physical_current_source_reviews=frame['individual_source_reviews'],
                historical_closed_dispositions=424, historical_DATA_only=True)


# Complete fixed title test binding roster. Returned program bytes are DATA only.
_TITLE_SOURCE_PACKET = 'compatibility/rc/21x-c04-dialog-title-replacement-canonical-admitted-transition.json'
_TITLE_SOURCE_PACKET_REF = {'path': 'compatibility/rc/21x-c04-dialog-title-replacement-canonical-admitted-transition.json', 'sha256': '87ac44ebc3d8c8fcf082803ecf4f6deac68b62ef349ce0d95c037dbb85e9cbea', 'bytes': 4410}
_TITLE_SOURCE_REFS = ({'path': 'scripts/packed-upstream-ledger-base.mjs', 'sha256': 'ee74d3c46ae056f4ffd16cc1d38d60820ca449d96158c776319a2bfcbc6fc715', 'bytes': 109664}, {'path': 'scripts/upstream-historical-behavior-evidence.mjs', 'sha256': '8efdc7640a20c9c6b163c3e93b664d4b4384979fb0c23304b8d3f4fad02570c1', 'bytes': 20399}, {'path': 'scripts/upstream-source-contract-registry.mjs', 'sha256': 'd63a79ffe4aa63a6fb839e5f08abf1c6311832e2e73d73cbdfd55d6722098493', 'bytes': 4624}, {'path': 'scripts/upstream-dialog-title-admission.cjs', 'sha256': '1a0c187706c6e0517cae533821071108b75dab1567aefbcf88b6ed1b64208b58', 'bytes': 7760}, {'path': 'scripts/upstream-dialog-title-native-evidence.mjs', 'sha256': '728262b0b862856e265ff04c7a8a86e2836e6f2a2c1ead25f6115a0096598289', 'bytes': 3308}, {'path': 'scripts/dialog-title-canonical-stage.mjs', 'sha256': 'e183becf00a87f56e9509a9b47be59dac996e2f987b71c53d087b38d52435255', 'bytes': 4844}, {'path': 'scripts/dialog-title-source-context.mjs', 'sha256': 'c099a023155608853aba98582331b4cec27eb75bfb09d5d32839f5b323a96d02', 'bytes': 10472}, {'path': 'scripts/autocomplete-selection-native-subject.mjs', 'sha256': 'b5855c37ac4e8a7f6c24fbf64eaa2b748572728f824d5c960bdb12eaebc7fd57', 'bytes': 11403}, {'path': 'scripts/canonical-tool-source-role.mjs', 'sha256': 'a1adb7c250ff17b732568df8aaebcb22475f6173f781459d77ebe3f0a42891b1', 'bytes': 1039}, {'path': 'scripts/check-upstream-audit-disposition.mjs', 'sha256': '4a6002153caabe102887bcd8847128818c2f7025a3d1257d97cd446f34fbf106'})
_TITLE_INVENTORY_PACKET = {'path': 'compatibility/rc/c04-inventory-owner-inputs.json', 'sha256': '0d9dfac3813a6dc60644a090a2173ce56eaed1bcbdb32c2be29ce53f32413cdc', 'bytes': 12144}
_TITLE_HANDLER_GIT_DATA = ({'commit': '8432c416934b3592581b526125a0df97077bb4cf', 'path': 'scripts/upstream-dialog-title-admission.cjs', 'sha256': '1a0c187706c6e0517cae533821071108b75dab1567aefbcf88b6ed1b64208b58', 'bytes': 7760, 'git_blob': '1ab0292ad097999c439db33b509943486dd5e312'}, {'commit': '8432c416934b3592581b526125a0df97077bb4cf', 'path': 'scripts/upstream-dialog-title-native-evidence.mjs', 'sha256': '728262b0b862856e265ff04c7a8a86e2836e6f2a2c1ead25f6115a0096598289', 'bytes': 3308, 'git_blob': '590bf1b1bdd6591892a178b098f38e5f24511ec8'})
_TITLE_HANDLER_TRANSITIONS = ({'before_parent': '8432c416934b3592581b526125a0df97077bb4cf', 'before': {'path': 'scripts/upstream-dialog-title-admission.cjs', 'sha256': '1a0c187706c6e0517cae533821071108b75dab1567aefbcf88b6ed1b64208b58', 'bytes': 7760}, 'after': {'path': 'scripts/upstream-dialog-title-admission.cjs', 'sha256': 'f47da6d30d3f79930f12b3c650c85d6ae097f202d17b9e64f15cf4bc7c25cdd9', 'bytes': 8052}, 'literal_edits': [{'before': ' const bound=[{path:TITLE_SOURCE_REPORT', 'after': " const {titleMeasurementSourceReferences}=require('./inventory-reference-owner.mjs');\n const bound=[{path:TITLE_SOURCE_REPORT"}, {'before': '...scope.input_members,...types.map', 'after': '...titleMeasurementSourceReferences({root,read,scope}),...types.map'}, {'before': "  assert.deepEqual(JSON.parse(raw),inspected.scope,'fresh current title source evidence differs');", 'after': "  const {titleMeasurementForHistoricalComparison}=require('./inventory-reference-owner.mjs');\n  assert.deepEqual(titleMeasurementForHistoricalComparison({root,actual:JSON.parse(raw),expected:inspected.scope}),inspected.scope,'fresh current title source evidence differs');"}], 'role': 'Historical handler image is private binding metadata only;current compiled handler retains a fresh lifecycle child and strict complete comparison after one authenticated inventory-reference transition'}, {'before_parent': '8432c416934b3592581b526125a0df97077bb4cf', 'before': {'path': 'scripts/upstream-dialog-title-native-evidence.mjs', 'sha256': '728262b0b862856e265ff04c7a8a86e2836e6f2a2c1ead25f6115a0096598289', 'bytes': 3308}, 'after': {'path': 'scripts/upstream-dialog-title-native-evidence.mjs', 'sha256': 'dc7eb1c3759fec7f439cc2c9707b2e592d894e4138961aacd8ac851f7d86f469', 'bytes': 3494}, 'literal_edits': [{'before': "  for(const member of JSON.parse(source).input_members.filter(row=>!row.path.startsWith('node_modules/'))){", 'after': "  const {titleMeasurementSourceReferences}=require('./inventory-reference-owner.mjs');\n  const members=titleMeasurementSourceReferences({root,read:path=>readEvidenceMember(root,path),scope:JSON.parse(source)});\n  for(const member of members.filter(row=>!row.path.startsWith('node_modules/'))){"}], 'role': 'Exact inventory input-binding successor;all original native observation and same-run browser prerequisite checks remain unchanged'})
_TITLE_FINITE_TOOL_PATHS = ('scripts/packed-upstream-ledger-base.mjs', 'scripts/dialog-title-source-context.mjs', 'scripts/canonical-tool-source-role.mjs')


def _historical_title_handler_data(root):
    """Two fixed Git/literal handler transitions, never imported or executed."""
    ref = _TITLE_INVENTORY_PACKET
    raw = _physical(root, ref['path'])
    assert len(raw) == ref['bytes'] and hashlib.sha256(raw).hexdigest() == ref['sha256']
    packet = json.loads(raw)
    assert packet['line'] == '21.x'
    assert tuple(packet['historical_handler_metadata']) == _TITLE_HANDLER_TRANSITIONS
    bound = {ref['path']: raw}
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)
    output = subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0',
        '-c', 'maintenance.auto=0', 'cat-file', '--batch'], cwd=root, env=env,
        input=('\n'.join(row['commit'] + ':' + row['path'] for row in _TITLE_HANDLER_GIT_DATA) + '\n').encode())
    cursor, before_images = 0, {}
    for ref in _TITLE_HANDLER_GIT_DATA:
        end = output.index(b'\n', cursor)
        assert output[cursor:end].decode() == f"{ref['git_blob']} blob {ref['bytes']}"
        before = output[end + 1:end + 1 + ref['bytes']]
        cursor = end + 1 + ref['bytes']
        assert output[cursor:cursor + 1] == b'\n'
        cursor += 1
        assert len(before) == ref['bytes'] and hashlib.sha256(before).hexdigest() == ref['sha256']
        assert hashlib.sha1(b'blob ' + str(len(before)).encode() + b'\0' + before).hexdigest() == ref['git_blob']
        before_images[ref['path']] = before
    assert cursor == len(output)
    for transition in _TITLE_HANDLER_TRANSITIONS:
        path = transition['before']['path']
        assert transition['after']['path'] == path
        assert transition['before_parent'] == '8432c416934b3592581b526125a0df97077bb4cf'
        before = before_images[path]
        assert transition['before'] == dict(path=path, sha256=hashlib.sha256(before).hexdigest(), bytes=len(before))
        after = before.decode()
        for edit in transition['literal_edits']:
            assert after.count(edit['before']) == 1
            after = after.replace(edit['before'], edit['after'])
        after = after.encode()
        assert transition['after'] == dict(path=path, sha256=hashlib.sha256(after).hexdigest(), bytes=len(after))
        assert _physical(root, path) == after
        bound[path] = after

    def assert_current():
        for path, expected in bound.items():
            assert _physical(root, path) == expected, 'changed title handler comparison subject ' + path
    assert_current()
    return dict(before=before_images, assert_current=assert_current)


def historical_title_source_test_subject(root):
    """Exact ten historical bindings as DATA; retain current physical authority."""
    from historical_contract_repair_source import _current_tool_subject
    packet_raw = _physical(root, _TITLE_SOURCE_PACKET)
    assert len(packet_raw) == _TITLE_SOURCE_PACKET_REF['bytes']
    assert hashlib.sha256(packet_raw).hexdigest() == _TITLE_SOURCE_PACKET_REF['sha256']
    packet = json.loads(packet_raw)
    assert tuple(packet['source_members'] + [packet['root_checker']]) == _TITLE_SOURCE_REFS
    expected = {ref['path']: ref for ref in _TITLE_SOURCE_REFS}
    assert len(expected) == len(_TITLE_SOURCE_REFS) == 10
    tools = _current_tool_subject(root)
    registry = current_canonical_registry_subject(root)
    registry67 = historical67_registry_bytes(root)
    handlers = _historical_title_handler_data(root)
    bound = {_TITLE_SOURCE_PACKET: packet_raw}
    comparison = {}
    for path, ref in expected.items():
        actual = _physical(root, path)
        bound[path] = actual
        if path in _TITLE_FINITE_TOOL_PATHS:
            assert tools.owns_reference(ref)
            current = tools.qualify(ref)
            assert current == dict(ref, sha256=hashlib.sha256(actual).hexdigest(), bytes=len(actual))
            comparison[path] = tools.comparison_bytes(ref)
        elif path in handlers['before']:
            comparison[path] = handlers['before'][path]
        elif path == REGISTRY:
            assert actual == registry['raw']
            comparison[path] = registry67
        else:
            comparison[path] = actual
        if path != REGISTRY:
            assert hashlib.sha256(comparison[path]).hexdigest() == ref['sha256']
            if 'bytes' in ref:
                assert len(comparison[path]) == ref['bytes']

    def assert_current():
        tools.assert_current()
        handlers['assert_current']()
        registry['assert_current']()
        for path, actual in bound.items():
            assert _physical(root, path) == actual, 'changed title source comparison binding ' + path
        tools.assert_current()

    def comparison_bytes(incoming):
        assert type(incoming) is dict
        snapshot = dict(incoming)
        assert snapshot == expected[snapshot['path']]
        assert_current()
        raw = comparison[snapshot['path']]
        assert incoming == snapshot
        assert_current()
        return raw
    assert_current()
    return dict(comparison_bytes=comparison_bytes, assert_current=assert_current,
                historical_source_bindings=10, historical_DATA_only=True)

import datetime
import hashlib
import json
import os
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
MAIN = pathlib.Path('/home/parallels/.codex/worktrees/codex-closeout-main/ngx-compat-material-legacy')
PREFIX = 'compatibility/rc/parallel-base-admission-review-boundary-implementation-v5-'
MANIFEST = 'compatibility/rc/historical-contract-repair-reader-inputs.json'
OWNER = 'scripts/packed-upstream-ledger-epoch.mjs'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def ref(root, path):
    raw = (root / path).read_bytes()
    return {'path': path, 'sha256': sha(raw), 'bytes': len(raw)}


def git(root, *args):
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1',
               GIT_CONFIG_GLOBAL='/dev/null', GIT_CONFIG_SYSTEM='/dev/null', GIT_TERMINAL_PROMPT='0')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    return subprocess.run(['nice', '-n', '19', 'git', '--no-replace-objects', '-c',
                           'gc.auto=0', '-c', 'maintenance.auto=0', *args], cwd=root,
                          env=env, capture_output=True, check=True).stdout


def raw_rows(raw):
    text = raw.decode()
    marker = '"tool_transitions": ['
    assert text.count(marker) == 1
    cursor = text.index(marker) + len(marker)
    decoder = json.JSONDecoder()
    rows = {}
    while True:
        while text[cursor].isspace() or text[cursor] == ',':
            cursor += 1
        if text[cursor] == ']':
            return rows
        row, end = decoder.raw_decode(text, cursor)
        assert row['path'] not in rows
        rows[row['path']] = text[cursor:end]
        cursor = end


raw = (ROOT / MANIFEST).read_bytes()
data = json.loads(raw)
prior_ref = data['prior_reader_registry']
prior_raw = git(ROOT, 'show', prior_ref['source_parent'] + ':' + MANIFEST)
assert sha(prior_raw) == prior_ref['sha256'] and len(prior_raw) == prior_ref['bytes']
prior = json.loads(prior_raw)
assert data['extension_kind'] == 'packed-owner-source-lanes'
assert len(prior['tool_transitions']) == 15 and len(data['tool_transitions']) == 17
assert prior['source_parent'] == data['source_parent']
old_by_path = {row['path']: row for row in prior['tool_transitions']}
new_by_path = {row['path']: row for row in data['tool_transitions']}
assert list(new_by_path)[-2:] == ['scripts/packed-upstream-ledger-base.mjs', 'scripts/checker-reference-metadata.mjs']
assert set(new_by_path) - set(old_by_path) == set(list(new_by_path)[-2:])
before_rows, after_rows = raw_rows(prior_raw), raw_rows(raw)
unchanged = []
for path, old in old_by_path.items():
    current = new_by_path[path]
    assert current['before'] == old['before']
    if path != OWNER:
        assert old == current and before_rows[path] == after_rows[path]
        unchanged.append(path)
    else:
        assert current['literal_edits'][:len(old['literal_edits'])] == old['literal_edits']
        comparable = dict(current, after=old['after'], literal_edits=old['literal_edits'])
        assert comparable == old
assert len(unchanged) == 14
replayed = []
for row in data['tool_transitions']:
    parent = row.get('source_parent', data['source_parent'])
    old = git(ROOT, 'show', parent + ':' + row['path'])
    assert sha(old) == row['before']['sha256'] and len(old) == row['before']['bytes']
    expected = old.decode()
    for edit in row['literal_edits']:
        assert expected.count(edit['before']) == 1
        expected = expected.replace(edit['before'], edit['after'], 1)
    expected = expected.encode()
    assert sha(expected) == row['after']['sha256'] and len(expected) == row['after']['bytes']
    assert expected == (ROOT / row['path']).read_bytes()
    replayed.append({'path': row['path'], 'literal_edits': len(row['literal_edits']),
                     'current': ref(ROOT, row['path'])})
epoch_middle = git(ROOT, 'show', prior_ref['source_parent'] + ':' + OWNER)
assert sha(epoch_middle) == old_by_path[OWNER]['after']['sha256']
assert len(epoch_middle) == old_by_path[OWNER]['after']['bytes']
assert sha(epoch_middle) not in [new_by_path[OWNER][side]['sha256'] for side in ['before', 'after']]
for path, digest in [('scripts/packed-upstream-ledger-base.mjs', 'ee74d3c46ae056f4ffd16cc1d38d60820ca449d96158c776319a2bfcbc6fc715'),
                     ('scripts/checker-reference-metadata.mjs', '1fd8883f7f8872cab67003b355b140020c49ed7ce0422660c7ec51460d14b1ea')]:
    assert new_by_path[path]['source_parent'] == prior_ref['source_parent']
    assert new_by_path[path]['before']['sha256'] == digest

qualification_path = 'compatibility/rc/parallel-base-class-owner-integration-qualification-v2-final.json'
qualification = json.loads((ROOT / qualification_path).read_text())
for item in qualification['implemented_current_21_inputs'] + qualification['evidence'] + qualification['preserved_canonical_refs'] + [qualification['worksheet']]:
    assert ref(ROOT, item['path']) == item
paired = qualification['paired_main_change']
for key in ['shared_reader', 'manifest_unchanged']:
    assert ref(MAIN, paired[key]['path']) == paired[key]
assert (MAIN / 'scripts/historical-contract-repair-readers.mjs').read_bytes() == (ROOT / 'scripts/historical-contract-repair-readers.mjs').read_bytes()
assert (MAIN / MANIFEST).read_bytes() == git(MAIN, 'show', 'HEAD:' + MANIFEST)
assert len(json.loads((MAIN / MANIFEST).read_text())['tool_transitions']) == 7
ledger = json.loads((ROOT / 'compatibility/f10/disposition-ledger/ledger.json').read_text())
assert len(ledger['entries']) == 1697
assert sum(row['final_disposition'] == 'security-review' for row in ledger['entries']) == 1
assert ledger['closed_dispositions'] == 426 and ledger['open_or_deferred'] == 1271
record = {'schema_version': 1, 'recorded_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'status': 'exact17row-extension-and-current-evidence-independently-replayed',
          'current_manifest': ref(ROOT, MANIFEST),
          'authenticated_prior_manifest': prior_ref,
          'raw_json_row_bytes_unchanged': unchanged, 'raw_json_row_count_unchanged': 14,
          'all17literal_replays': replayed,
          'sole_extra_intermediate': {'path': OWNER, **old_by_path[OWNER]['after'],
                                      'authenticated_commit': prior_ref['source_parent']},
          'new_rows': list(new_by_path)[-2:],
          'main_shared_reader': ref(MAIN, 'scripts/historical-contract-repair-readers.mjs'),
          'main_manifest_unchanged': ref(MAIN, MANIFEST), 'main_transition_count': 7,
          'qualification_and_all_declared_evidence_rehashed': ref(ROOT, qualification_path),
          'canonical_ledger_registry_roster_preserved': qualification['preserved_canonical_refs'],
          'canonical_counts': {'entries': 1697, 'closed': 426, 'pending': 1271, 'security_review': 1},
          'old_programs_or_actual_owner_or_source_producers_executed': False,
          'existing_shared_files_edited': False}
output = PREFIX + 'manifest-result-v2.json'
(ROOT / output).write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({'result': ref(ROOT, output), 'literal_replays': len(replayed), 'unchanged_raw_rows': len(unchanged)}))

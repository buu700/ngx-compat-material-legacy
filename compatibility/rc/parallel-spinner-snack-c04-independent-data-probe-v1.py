"""Independent finite literal/Git/physical registry and Python visibility review."""
from pathlib import Path
import gzip
import hashlib
import importlib.util
import json
import os
import subprocess
import sys

root = Path(sys.argv[1]).resolve()
cut_path = sys.argv[2]
cut_sha = sys.argv[3]
output = Path(sys.argv[4]).resolve()
assert str(output).startswith(str(root / 'compatibility/rc/parallel-spinner-snack-c04-independent-'))
sha = lambda b: hashlib.sha256(b).hexdigest()
raw_cut = (root / cut_path).read_bytes()
assert sha(raw_cut) == cut_sha
cut = json.loads(raw_cut)
archive = json.loads(gzip.decompress((root / 'compatibility/rc/parallel-spinner-snack-public-bridge-c04-before.json.gz').read_bytes()))
def git_env():
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']:
        env.pop(key, None)
    return env
def git(r, spec):
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'show', spec], cwd=r, env=git_env())
def identify(raw, ref):
    assert sha(raw) == ref['sha256'] and len(raw) == ref['bytes'], ref.get('path')
def raw_rows(raw):
    text = raw.decode()
    start = text.index('[', text.index('"tool_transitions"')) + 1
    result = []
    decoder = json.JSONDecoder()
    while True:
        while text[start] in ' \r\n\t,':
            start += 1
        if text[start] == ']':
            return result
        _, end = decoder.raw_decode(text, start)
        result.append(text[start:end])
        start = end
def rejected(fn):
    try:
        fn()
    except (AssertionError, KeyError, ValueError):
        return True
    raise AssertionError('mutant accepted')

spec = importlib.util.spec_from_file_location('independent_historical_repair_visibility', root / 'tests/historical_contract_repair_source.py')
mirror = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mirror)
results = []
mirror_positives = mirror_rejections = 0
immutable_paths = ['compatibility/f10/disposition-ledger/ledger.json', 'scripts/upstream-source-contract-registry.mjs',
                   'compatibility/rc/oracles/material-16.2.14-sass-api.json', 'fixtures/sass/mixin-argument-contracts.json', 'fixtures/sass/default-aggregate-contracts.json']
for line, branch in cut['branches'].items():
    r = Path(branch['root'])
    assert (r / cut_path).read_bytes() == raw_cut
    for ref in branch['physical_inputs'] + branch['unchanged_historical_comparisons']:
        identify((r / ref['path']).read_bytes(), ref)
    before_commit = archive['branches'][line]['before_source_commit']
    immutable = []
    for p in immutable_paths + [p['path'] for p in branch['unchanged_historical_comparisons']]:
        if not (r / p).exists():
            assert line == 'main' and p == 'scripts/upstream-source-contract-registry.mjs'
            missing = subprocess.run(['git', '--no-replace-objects', '-c', 'gc.auto=0', '-c', 'maintenance.auto=0', 'cat-file', '-e', before_commit + ':' + p], cwd=r, env=git_env(), capture_output=True)
            assert missing.returncode != 0
            immutable.append(dict(path=p, absent_before_and_current=True))
            continue
        current = (r / p).read_bytes()
        assert current == git(r, before_commit + ':' + p), (line, p, 'historical data changed')
        immutable.append(dict(path=p, sha256=sha(current), bytes=len(current)))
    mf_path = 'compatibility/rc/historical-contract-repair-reader-inputs.json'
    raw = (r / mf_path).read_bytes()
    mf = json.loads(raw)
    assert len(mf['tool_transitions']) == branch['tool_rows'] == (39 if line == '21.x' else 11)
    count = branch['preserved_prior_rows']
    assert count == (17 if line == '21.x' else 7)
    prior_ref = mf['prior_reader_registry']
    assert prior_ref['path'] == mf_path
    assert prior_ref['sha256'] == {'21.x': '577d690ecdad79da270dda15a73649c519e5f9444f9e0a0739d94aecefa45a90', 'main': '702d6f65109297515ee1fc57810eaf8fe0a9f7148742ff8572d90824d57b2944'}[line]
    prior_raw = git(r, prior_ref['source_parent'] + ':' + mf_path)
    identify(prior_raw, prior_ref)
    prior = json.loads(prior_raw)
    assert mf['tool_transitions'][:count] == prior['tool_transitions']
    assert raw_rows(raw)[:count] == raw_rows(prior_raw), 'raw prior row bytes changed'
    rows = []
    for transition in mf['tool_transitions']:
        p = transition['path']
        before = git(r, transition.get('source_parent', mf['source_parent']) + ':' + p)
        identify(before, transition['before'])
        text = before.decode()
        assert transition['literal_edits']
        for edit in transition['literal_edits']:
            assert text.count(edit['before']) == 1
            text = text.replace(edit['before'], edit['after'])
        after = text.encode()
        identify(after, transition['after'])
        assert (r / p).read_bytes() == after
        for side in ['before', 'after']:
            for sized in [True, False]:
                incoming = dict(path=p, sha256=transition[side]['sha256'], role='unchanged-comparison-metadata', root=8)
                if sized:
                    incoming['bytes'] = transition[side]['bytes']
                expected = dict(incoming, sha256=transition['after']['sha256'])
                if sized:
                    expected['bytes'] = transition['after']['bytes']
                assert mirror.qualify_tool_reference(incoming, r) == expected
                assert mirror.tool_comparison_bytes(incoming, r) == (before if side == 'before' else after)
                mirror_positives += 2
        bad = dict(path=p, **transition['before'])
        assert rejected(lambda: mirror.qualify_tool_reference(dict(bad, sha256='0' * 64), r))
        assert rejected(lambda: mirror.qualify_tool_reference(dict(bad, bytes=bad['bytes'] + 1), r))
        mirror_rejections += 2
        rows.append(dict(path=p, exact_literal_replay=True, after_sha256=sha(after)))
    packet = json.loads((r / 'compatibility/rc/parallel-spinner-snack-public-bridge-integration-source-inputs.json').read_bytes())
    modules = packet['branches'][line]['modules']
    assert [p['path'] for p in modules] == branch['new_subject_qualified_product_paths']
    for module in modules:
        for side in ['before', 'current']:
            incoming = dict(path=module['path'], sha256=module[side]['sha256'], bytes=module[side]['bytes'], root=9, role='historical-source')
            expected = dict(incoming, sha256=module['current']['sha256'], bytes=module['current']['bytes'])
            assert mirror.qualify_spinner_snack_source_reference(incoming, r) == expected
            mirror_positives += 1
        assert rejected(lambda: mirror.qualify_spinner_snack_source_reference(dict(path=module['path'], sha256='0' * 64), r))
        assert rejected(lambda: mirror.qualify_spinner_snack_source_reference(dict(path=module['path'], sha256=module['before']['sha256'], bytes=module['before']['bytes'] + 1), r))
        mirror_rejections += 2
    unknown = dict(path='projects/ngx-material-legacy/styles/legacy-snack-bar/_snack-bar-theme.scss', sha256='0' * 64, role='unqualified')
    assert mirror.qualify_spinner_snack_source_reference(unknown, r) == unknown
    assert mirror.qualify_tool_reference(unknown, r) == unknown
    results.append(dict(line=line, physical_input_refs=len(branch['physical_inputs']), prior_rows_byte_identical=count, literal_tool_replays=rows, immutable_data=immutable, unknown_paths_remain_unqualified=True))

result = dict(schema_version=1, status='independent-literals-immutable-data-and-Python-mirror-pass', frozen_cut=dict(path=cut_path, sha256=cut_sha),
              results=results, exact_literal_replays=sum(len(r['literal_tool_replays']) for r in results), Python_positive_visibility_and_byte_controls=mirror_positives,
              Python_wrong_hash_or_length_rejections=mirror_rejections, actual_old_programs_or_source_producers_executed=False, fresh_compiler_or_owner_executed=False,
              current_product_bytes_written=False, canonical_changes_applied=False, g11_claim='not-passed')
output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(dict(status=result['status'], literal_replays=result['exact_literal_replays'], python_positive=mirror_positives, python_negative=mirror_rejections)))

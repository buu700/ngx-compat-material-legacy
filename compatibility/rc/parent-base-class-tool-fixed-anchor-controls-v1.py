# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Real maintained factories on disposable resealed profiles; no product owners."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path.cwd()
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / 'tests'))
from test_current_sass_tool_references import current_tool_fixture

INPUTS = 'compatibility/rc/parent-base-class-tool-successor-inputs-v3.json'
JS = 'scripts/current-sass-tool-references.mjs'
PY = 'scripts/current_sass_tool_references.py'
NODE = 'node'
PARENTS = {'21.x': 'd8ab97315b6c77b83f42c2bebcf63b2984fff255', 'main': '59ba0e2aa8b76f71b472ea2831273e44e44b5b57'}
FIXED = ('scripts/table-local-compilation-canonical-stage.mjs',
         'scripts/legacy-removal-owner-source.mjs',
         'scripts/browser-owner-source.mjs',
         'scripts/checker-owner-source.mjs',
         'scripts/checker-reference-proposal.mjs',
         'tests/browser_reference_owner_probe.mjs',
         'tests/test_browser_reference_owner.py',
         'tests/checker_reference_source_probe.mjs',
         'scripts/browser-reference-source.mjs',
         'tests/test_packed_upstream_ledger_epoch.py')
SOURCE_MEMBER_ANCHOR = 'tests/test_packed_upstream_ledger_epoch.py'
ANCHORS = {
    SOURCE_MEMBER_ANCHOR: ('compatibility/rc/c04-inventory-owner-inputs.json', 9),
    'scripts/browser-reference-source.mjs': ('compatibility/rc/c04-browser-owner-inputs.json', 2),
    'tests/checker_reference_source_probe.mjs': ('compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json', 4),
    'scripts/browser-owner-source.mjs': ('compatibility/rc/21x-legacy-removal-admission-owner-inputs.json', 2),
    'scripts/checker-owner-source.mjs': ('compatibility/rc/c04-browser-owner-inputs.json', 1),
    'scripts/checker-reference-proposal.mjs': ('compatibility/rc/c04-checker-owner-inputs.json', 2),
    'tests/browser_reference_owner_probe.mjs': ('compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json', 9),
    'tests/test_browser_reference_owner.py': ('compatibility/rc/21x-table-local-compilation-admission-owner-inputs.json', 10),
}
UNOWNED = 'scripts/compare-css.py'
hash_bytes = lambda raw: hashlib.sha256(raw).hexdigest()
reference = lambda path, raw: dict(path=path, sha256=hash_bytes(raw), bytes=len(raw))
node_program = """
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
const root=process.argv[1];
const {currentSassToolReferenceSubject}=await import(pathToFileURL(join(root,'scripts/current-sass-tool-references.mjs')).href);
try{
 const source=currentSassToolReferenceSubject({root});
 console.log(JSON.stringify({accepted:true,epoch:source.epoch,paths:source.transitions.map(row=>row.path)}));
}catch(error){
 if(error.code!=='ERR_ASSERTION')throw error;
 console.log(JSON.stringify({accepted:false,code:error.code,message:error.message}));
}
"""


def git_data(line, path):
    env = dict(os.environ, GIT_NO_LAZY_FETCH='1', GIT_NO_REPLACE_OBJECTS='1')
    for key in ('GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR',
                'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
        env.pop(key, None)
    return subprocess.check_output(['git', '--no-replace-objects', '-c', 'gc.auto=0',
        '-c', 'maintenance.auto=0', 'show', PARENTS[line] + ':' + path], cwd=ROOT, env=env)


cases = []
with tempfile.TemporaryDirectory(prefix='ngx-tool-fixed-anchors-') as temp:
    root = Path(temp)
    line = current_tool_fixture(root)
    baseline = json.loads((root / INPUTS).read_bytes())
    original_factories = {path: (root / path).read_text() for path in (JS, PY)}
    originals = {}
    if line == '21.x':
        originals = {path: (root / path).read_bytes() for path, _ in ANCHORS.values()}
        rows = {row['path']: row for row in baseline['branches'][line]['updates']}
        assert all(path in rows for path in FIXED)
    ordinary = git_data(line, UNOWNED)  # Git program bytes remain DATA only.
    branch = baseline['branches'][line]
    old_v2 = json.loads((root / baseline['previous_epoch']['path']).read_bytes())['branches'][line]
    historical = json.loads((root / old_v2['historical_registry']['path']).read_bytes())
    assert UNOWNED not in {row['path'] for row in historical['tool_transitions'] + old_v2['updates'] + branch['updates']}

    def seal(packet):
        raw = (json.dumps(packet, indent=2) + '\n').encode()
        (root / INPUTS).write_bytes(raw)
        digest = hash_bytes(raw)
        for path, text in original_factories.items():
            pattern = r"(INPUTS_SHA = ')[0-9a-f]{64}(')" if path == PY else r"(const INPUTS_SHA=')[0-9a-f]{64}(';)"
            body, count = re.subn(pattern, lambda match: match[1] + digest + match[2], text)
            assert count == 1
            (root / path).write_text(body)

    def evaluate(identifier, packet, accepted):
        seal(packet)
        spec = importlib.util.spec_from_file_location('fixed_anchor_' + str(len(cases)), root / PY)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)  # Current copied factory, never an old Git program.
        try:
            source = module.CurrentSassToolReferences(root)
            python = dict(accepted=True, epoch=source.epoch, paths=[row['path'] for row in source.transitions])
        except AssertionError as error:
            python = dict(accepted=False, code='ERR_ASSERTION', message=str(error))
        child = subprocess.run([NODE, '--input-type=module', '-e', node_program, str(root)],
            cwd=ROOT, capture_output=True, text=True, timeout=90)
        assert child.returncode == 0, child.stderr[-5000:]
        javascript = json.loads(child.stdout)
        for engine, result in [('python', python), ('javascript', javascript)]:
            assert result['accepted'] is accepted, (identifier, engine, result)
            if accepted:
                assert result['epoch'] == 3
                if line == '21.x':
                    assert set(FIXED) <= set(result['paths'])
            else:
                assert result['code'] == 'ERR_ASSERTION'
        cases.append(dict(id=identifier, accepted=accepted, engines=2))

    evaluate('baseline-fixed-ten' if line == '21.x' else 'baseline-main', copy.deepcopy(baseline), True)
    if line == '21.x':
        for path, (anchor_path, index) in ANCHORS.items():
            label = Path(path).stem
            for kind in ('packet-bytes', 'packet-row'):
                packet = copy.deepcopy(baseline)
                if kind == 'packet-bytes':
                    changed = originals[anchor_path] + b'\n'
                else:
                    data = json.loads(originals[anchor_path])
                    if path == SOURCE_MEMBER_ANCHOR:
                        data['source_members'][index]['sha256'] = '0' * 64
                    else:
                        data['code_transitions'][index]['after']['sha256'] = '0' * 64
                    changed = (json.dumps(data, indent=2) + '\n').encode()
                (root / anchor_path).write_bytes(changed)
                support = next(row for row in packet['branches'][line]['additional_inputs'] if row['path'] == anchor_path)
                support.update(reference(anchor_path, changed))
                try:
                    evaluate(label + '/' + kind + '-despite-profile-reseal', packet, False)
                finally:
                    (root / anchor_path).write_bytes(originals[anchor_path])
            for kind in ('sha', 'bytes'):
                packet = copy.deepcopy(baseline)
                row = next(row for row in packet['branches'][line]['updates'] if row['path'] == path)
                if kind == 'sha':
                    row['before']['sha256'] = '0' * 64
                else:
                    row['before']['bytes'] += 1
                evaluate(label + '/wrong-predecessor-' + kind, packet, False)
        packet = copy.deepcopy(baseline)
        next(row for row in packet['branches'][line]['updates'] if row['path'] == FIXED[2])['anchor_packet'] = dict(path='unowned.json')
        evaluate('profile-cannot-supply-anchor', packet, False)
    else:
        path = FIXED[3]
        assert path not in {row['path'] for row in historical['tool_transitions'] + old_v2['updates'] + branch['updates']}
        body = git_data(line, path)
        (root / path).write_bytes(body)
        packet = copy.deepcopy(baseline)
        ref = reference(path, body)
        packet['branches'][line]['updates'].append(dict(path=path, before=ref, after=dict(ref), edits=[]))
        evaluate('main-cannot-adopt-21-fixed-row', packet, False)
    (root / UNOWNED).write_bytes(ordinary)
    packet = copy.deepcopy(baseline)
    ref = reference(UNOWNED, ordinary)
    packet['branches'][line]['updates'].append(dict(path=UNOWNED, before=ref, after=dict(ref), edits=[]))
    evaluate('committed-but-unowned-path-rejected', packet, False)

report = dict(schema_version=1, result='pass', line=line, cases=len(cases), engines=2,
    accepted_checks=2, rejected_checks=2 * (len(cases) - 1), case_rows=cases,
    fixed_source_rows_verified=10 if line == '21.x' else 0,
    current_factories_executed=True, old_Git_programs_executed=False,
    product_or_source_owners_executed=False, current_root_mutated=False)
print(json.dumps(report))

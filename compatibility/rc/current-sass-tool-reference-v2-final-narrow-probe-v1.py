# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Final exact tool epoch closure only; no Sass or product source constructor."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tests'))
sys.path.insert(0, str(ROOT / 'scripts'))
from test_current_sass_tool_references import current_tool_fixture, NODE
from current_sass_tool_references import CurrentSassToolReferences, INPUTS, PREVIOUS_INPUTS
PRE = 'compatibility/rc/current-sass-tool-reference-v2-'
CHANGED = ['scripts/upstream-unthemable-token-admission.cjs', 'scripts/upstream-modern-control-base-admission.cjs',
           'scripts/upstream-m3-theme-boundary-admission.cjs', 'tests/m3_measurement_transport_probe.mjs', 'tests/test_m3_measurement_transport.py']


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def ref(path):
    raw = (ROOT / path).read_bytes()
    return dict(path=path, sha256=digest(raw), bytes=len(raw))


def main():
    start = time.monotonic()
    packet = json.loads((ROOT / INPUTS).read_bytes())
    interim = json.loads((ROOT / (PRE + 'interim-inputs-v1.json')).read_bytes())
    check = []
    assert packet['branches']['main'] == interim['branches']['main']
    for key, value in interim['branches']['21.x'].items():
        if key != 'updates':
            assert packet['branches']['21.x'][key] == value
    old_updates = {r['path']: r for r in interim['branches']['21.x']['updates']}
    new_updates = {r['path']: r for r in packet['branches']['21.x']['updates']}
    assert set(old_updates) < set(new_updates)
    assert set(new_updates) - set(old_updates) == set(CHANGED[:2])
    assert {p for p in old_updates if old_updates[p] != new_updates[p]} == set(CHANGED[2:])
    check.append('exact three changed recipes plus two newly changed historical rows; main/all other data unchanged')
    with tempfile.TemporaryDirectory(prefix='ngx-final-current-tool-') as temp:
        root = Path(temp)
        line = current_tool_fixture(root)
        subject = CurrentSassToolReferences(root)
        subject.assert_current()
        branch = packet['branches'][line]
        historical = json.loads((root / branch['historical_registry']['path']).read_bytes())
        previous = json.loads((root / PREVIOUS_INPUTS['path']).read_bytes())['branches'][line]
        assert subject.epoch == 2 and subject.line == line
        assert len(subject.transitions) == (152 if line == '21.x' else 43)
        for row in historical['tool_transitions']:
            for side in ('before', 'after'):
                assert subject.owns_reference(dict(path=row['path'], **row[side]))
        for row in previous['updates']:
            assert subject.owns_reference(row['after'])
        check.append('all original45/17 and V1current95/19 identities remain registered; actual constructor/current guard pass')
        selected = CHANGED if line == '21.x' else []
        values, observed = [], []
        transitions = {r['path']: r for r in subject.transitions}
        for path in selected:
            after = dict(path=path, **transitions[path]['after'])
            candidates = [new_updates[path]['before'], after]
            for old in historical['tool_transitions']:
                if old['path'] == path:
                    candidates += [dict(path=path, **old[s]) for s in ('before', 'after')]
            for old in previous['updates']:
                if old['path'] == path:
                    candidates += [old['before'], old['after']]
            candidates = list({(r['sha256'], r['bytes']): r for r in candidates}.values())
            for value in candidates:
                assert subject.qualify(value) == after
                assert digest(subject.comparison_bytes(value)) == value['sha256']
            assert subject.qualify(dict(after, sha256='0' * 64)) is None
            try:
                subject.qualify(dict(after, bytes=after['bytes'] + 1))
                raise RuntimeError('wrong size accepted')
            except AssertionError:
                pass
            values += [dict(value=value, after=after) for value in candidates]
            observed.append(dict(path=path, refs=len(candidates), after=after))
        check.append('exact repaired five-path historical/V1/latest qualification and byte comparisons; wrong hashes/sizes reject')
        if line == 'main':
            assert all(r['path'] != 'scripts/current-m3-theme-boundary-contract.mjs' for r in subject.bound)
            assert not (ROOT / 'scripts/current-m3-theme-boundary-contract.mjs').exists()
            check.append('main has no new21-only M3 helper or branch data')
        else:
            assert any(r['path'] == 'scripts/current-m3-theme-boundary-contract.mjs' and r['sha256'] == '46b4059d9cfcb0e044b6ffbdcf8347fca64e3e4af34338d5e29c50a7ba80b49a' for r in subject.bound)
        first, last = root / 'scripts/current_sass_tool_references.py', subject.bound[-1]['path']
        raw, armed = first.read_bytes(), False
        def supplied(path):
            nonlocal armed
            data = (root / path).read_bytes()
            if armed and path == last:
                armed = False
                first.write_bytes(raw + b'\n# late copied mutation\n')
            return data
        live = CurrentSassToolReferences(root, read=supplied)
        try:
            armed = True
            try:
                live.assert_current()
                raise RuntimeError('late cross-member physical mutation accepted')
            except AssertionError:
                pass
        finally:
            first.write_bytes(raw)
        live.assert_current()
        check.append('final full physical-only sweep rejects earlier copied member changed by last supplied read')
        code = r'''
import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {join} from 'node:path';import {createHash} from 'node:crypto';import {readFileSync,writeFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(0,'utf8')),mod=await import(pathToFileURL(join(data.project,'scripts/current-sass-tool-references.mjs'))),s=mod.currentSassToolReferenceSubject({root:data.root});
s.assertCurrent();assert.equal(s.epoch,2);assert.equal(s.transitions.length,data.expectedTransitions);
for(const v of data.values){assert.deepEqual(s.qualify(v.value),v.after);assert.equal(createHash('sha256').update(s.comparisonBytes(v.value)).digest('hex'),v.value.sha256);}
const file=join(data.root,'scripts/current-sass-tool-references.mjs'),raw=readFileSync(file),last=s.bound.at(-1).path;let armed=false;
const live=mod.currentSassToolReferenceSubject({root:data.root,read:path=>{const raw=readFileSync(join(data.root,path));if(armed&&path===last){armed=false;writeFileSync(file,Buffer.concat([readFileSync(file),Buffer.from('\n// late copied mutation\n')]));}return raw;}});
try{armed=true;assert.throws(()=>live.assertCurrent());}finally{writeFileSync(file,raw);}live.assertCurrent();
process.stdout.write(JSON.stringify({line:s.line,epoch:s.epoch,transitions:s.transitions.length,bound:s.bound.length,selected_identity_checks:data.values.length,constructor_current_guard_and_late_sweep:true}));
'''
        child = subprocess.run([NODE, '--input-type=module', '-e', code], input=json.dumps(dict(project=str(ROOT), root=str(root), expectedTransitions=len(subject.transitions), values=values)), cwd=ROOT,
                               capture_output=True, text=True, env=dict(os.environ, PYTHONDONTWRITEBYTECODE='1'), timeout=30)
        assert child.returncode == 0, child.stderr
        js = json.loads(child.stdout)
        assert js['line'] == line and js['bound'] == len(subject.bound)
        check.append('actual JS constructor/selected identities/comparison bytes/final physical guard pass against same copied view')
    result = dict(schema_version=1, result='pass', line=line, final_packet=ref(INPUTS), checks=check, repaired_paths=observed,
                  registered_original_rows=len(historical['tool_transitions']), registered_V1_current=len(previous['updates']),
                  JS=js, elapsed_seconds=time.monotonic()-start, compiler_calls=0, product_constructor_calls=0,
                  retained_interim_tests='Full2-method/15JS-control suites at11a are retained as interim, not claimed rerun at this final pin. Final narrow checks and exact five-image difference are separate.', all_processes_terminal=True)
    destination = Path(sys.argv[1]);assert not destination.exists();destination.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(dict(path=str(destination), line=line, elapsed_seconds=result['elapsed_seconds'], transitions=js['transitions'], bound=js['bound'])))


if __name__ == '__main__':
    main()

# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent finite program-image replay and physical guard controls."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from current_sass_tool_references import CurrentSassToolReferences

base = CurrentSassToolReferences(ROOT)
with TemporaryDirectory(prefix='tooltip-source-program-py-') as temporary:
    root = Path(temporary)
    for ref in base.bound:
        dest = root / ref['path']; dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / ref['path'], dest)
    gitdir = subprocess.check_output(['git', 'rev-parse', '--absolute-git-dir'], cwd=ROOT, text=True).strip()
    (root / '.git').write_text('gitdir: ' + gitdir + '\n')
    read = lambda path: (root / path).read_bytes()
    scope = CurrentSassToolReferences(root)
    packet_path = 'compatibility/rc/main-tooltip-resource-source-programs-v1.json'
    packet = json.loads(read(packet_path))
    graph_path = 'compatibility/rc/main-sass-graph-resource-source-programs-v2.json'
    contract_path = 'compatibility/rc/main-sass-resource-contract-programs-v1.json'
    graph, contracts = json.loads(read(graph_path)), json.loads(read(contract_path))
    test_path = 'compatibility/rc/main-current-inventory-source-routing-v7.json'
    test = json.loads(read(test_path))
    inspection_path = 'compatibility/rc/main-current-inventory-source-routing-v8.json'
    inspection = json.loads(read(inspection_path))
    stage_path = 'compatibility/rc/main-current-inventory-source-routing-v9.json'
    stage = json.loads(read(stage_path))
    updates = packet['updates'] + graph['updates'] + contracts['updates'] + test['updates'] + inspection['updates'] + stage['updates']
    latest = {row['path']: row['after'] for row in updates}
    assert (len(scope.bound), len(scope.transitions)) == (522, 104)
    for update in updates:
        for ref in (update['before'], update['after']):
            assert scope.qualify(ref) == latest[update['path']]
            assert hashlib.sha256(scope.comparison_bytes(ref)).hexdigest() == ref['sha256']
            assert scope.qualify(dict(ref, sha256='0' * 64)) is None
            try: scope.qualify(dict(ref, bytes=ref['bytes'] + 1))
            except AssertionError: pass
            else: raise AssertionError('wrong program length accepted')
    targets = list(dict.fromkeys([packet_path, graph_path, contract_path, test_path, inspection_path, stage_path, test['source_anchor']['packet']['path'], *[row['path'] for row in updates],
        *[row['path'] for row in packet['support']], *[row['path'] for row in graph['support']]]))
    for path in targets:
        target = root / path; saved = read(path)
        try:
            target.write_bytes(saved + b' ')
            for action in (scope.assert_current, lambda: CurrentSassToolReferences(root)):
                try: action()
                except AssertionError: pass
                else: raise AssertionError('changed physical program input accepted: ' + path)
        finally: target.write_bytes(saved)
        scope.assert_current()
    for program_path in latest:
        try: CurrentSassToolReferences(root, read=lambda path: b'not the physical source' if path == program_path else read(path))
        except AssertionError: pass
        else: raise AssertionError('nonphysical supplied program input accepted')
    print(json.dumps(dict(result='pass', bound=scope.bound, transitions=scope.transitions,
        program_reference_checks=len(updates) * 2, unique_program_images=len({ref['sha256'] for row in updates for ref in (row['before'], row['after'])}),
        physical_cold_late_recovery_targets=len(targets),
        bad_supplied_program_readers_rejected=len(latest), historical_programs_executed=False,
        artifact_or_audit_admission_granted=False)))

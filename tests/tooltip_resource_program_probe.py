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
    assert (len(scope.bound), len(scope.transitions)) == (515, 99)
    for update in packet['updates']:
        for ref in (update['before'], update['after']):
            assert scope.qualify(ref) == update['after']
            assert hashlib.sha256(scope.comparison_bytes(ref)).hexdigest() == ref['sha256']
            assert scope.qualify(dict(ref, sha256='0' * 64)) is None
            try: scope.qualify(dict(ref, bytes=ref['bytes'] + 1))
            except AssertionError: pass
            else: raise AssertionError('wrong program length accepted')
    targets = [packet_path, *[row['path'] for row in packet['updates']], *[row['path'] for row in packet['support']]]
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
    for update in packet['updates']:
        try: CurrentSassToolReferences(root, read=lambda path: b'not the physical source' if path == update['path'] else read(path))
        except AssertionError: pass
        else: raise AssertionError('nonphysical supplied program input accepted')
    print(json.dumps(dict(result='pass', bound=scope.bound, transitions=scope.transitions,
        program_images_preserved=6, physical_cold_late_recovery_targets=len(targets),
        bad_supplied_program_readers_rejected=3, historical_programs_executed=False,
        artifact_or_audit_admission_granted=False)))

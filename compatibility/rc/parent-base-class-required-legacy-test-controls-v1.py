# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Disposable finite test DATA controls; no owner/sourceproducer executes."""
import gzip
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path.cwd()
sys.path.insert(0, str(ROOT / 'tests'))
from current_sass_canonical_test_scope import (current_canonical_registry_subject,
    current_canonical_test_frame, historical67_registry_bytes)

proposal = 'compatibility/rc/21x-base-class-removal-admission-canonical-proposal-v6.json'
packet = json.loads((ROOT / proposal).read_bytes())
LEDGER, REGISTRY = packet['before']['path'], packet['registry_before']['path']
images = {name: gzip.decompress((ROOT / packet[name + '_image']['path']).read_bytes())
    for name in ('ledger_before', 'ledger_after', 'registry_before', 'registry_after')}
cases = []
with tempfile.TemporaryDirectory(prefix='ngx-base-test-data-') as temp:
    root = Path(temp)
    def put(path, raw):
        dest = root / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(raw)
    gitdir = subprocess.check_output(['git', '-c', 'gc.auto=0', '-c',
        'maintenance.auto=0', 'rev-parse', '--absolute-git-dir'], cwd=ROOT).strip()
    put('.git', b'gitdir: ' + gitdir + b'\n')
    for path in [proposal] + [packet[name + '_image']['path'] for name in images]:
        put(path, (ROOT / path).read_bytes())
    def state(applied=False, registry70=None):
        registry70 = applied if registry70 is None else registry70
        put(LEDGER, images['ledger_after' if applied else 'ledger_before'])
        put(REGISTRY, images['registry_after' if registry70 else 'registry_before'])
    def rejected(call):
        try:
            call()
        except AssertionError:
            return
        raise AssertionError('invalid finite DATA subject accepted')
    historical = None
    for applied, registry70, expected in [(False, False, 90), (False, True, 90), (True, True, 91)]:
        state(applied, registry70)
        subject = current_canonical_test_frame(root)
        assert subject['individual_source_reviews'] == expected
        assert subject['registered_source_contracts'] == (70 if registry70 else 69)
        assert subject['comparison'](LEDGER, (root / LEDGER).read_bytes()) == images['ledger_before']
        current_historical = historical67_registry_bytes(root)
        assert historical is None or historical == current_historical
        historical = current_historical
        subject['assert_current']()
        cases.append('exact%d-%d' % (427 if applied else 426, 70 if registry70 else 69))
    state(True, False)
    rejected(lambda: current_canonical_test_frame(root)); cases.append('reject427-69')
    state(); put(REGISTRY, images['registry_before'] + b'\n')
    rejected(lambda: current_canonical_registry_subject(root)); cases.append('unknown-registry')
    state(); put(LEDGER, images['ledger_before'] + b'\n')
    rejected(lambda: current_canonical_test_frame(root)); cases.append('unknown-ledger')
    state(); subject = current_canonical_test_frame(root); put(REGISTRY, images['registry_after'])
    rejected(subject['assert_current']); cases.append('late-physical-registry')
    state(); subject = current_canonical_test_frame(root); put(LEDGER, images['ledger_after'])
    rejected(subject['assert_current']); cases.append('late-physical-ledger')
    state(); subject = current_canonical_test_frame(root)
    rejected(lambda: subject['comparison'](LEDGER, images['ledger_after'])); cases.append('unrelated-comparison-input')
    state(); put(proposal, (ROOT / proposal).read_bytes() + b'\n')
    rejected(lambda: current_canonical_registry_subject(root)); cases.append('changed-pinned-proposal')
    put(proposal, (ROOT / proposal).read_bytes())
    image_path = packet['registry_before_image']['path']
    put(image_path, (ROOT / image_path).read_bytes() + b'\n')
    rejected(lambda: current_canonical_registry_subject(root)); cases.append('changed-pinned-before-image')
    put(image_path, (ROOT / image_path).read_bytes())
    state(); (root / REGISTRY).unlink(); (root / REGISTRY).symlink_to(ROOT / REGISTRY)
    rejected(lambda: current_canonical_registry_subject(root)); cases.append('linked-registry')
print(json.dumps(dict(schema_version=1, result='pass', scope='disposable registry/frame DATA only',
    cases=len(cases), case_ids=cases, current_root_mutated=False, owner_or_sourceproducer_executed=False)))

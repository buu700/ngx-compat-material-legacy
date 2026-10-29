# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Execute exactly the focused independent source/admission checks and retain raw outputs."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import time

root = Path.cwd()
prefix = 'compatibility/rc/historical-contract-repair-'
modules = ['test_historical_contract_repair_source', 'test_legacy_removal_source', 'test_legacy_removal_admission']
paths = ['scripts/historical-contract-repair-source.mjs', 'scripts/historical-contract-repair-readers.mjs',
         'compatibility/rc/historical-contract-repair-reader-inputs.json',
         'compatibility/rc/historical-contract-repair-source-inputs.json',
         'tests/historical_contract_repair_source.py', 'tests/test_historical_contract_repair_source.py',
         'tests/test_legacy_removal_source.py', 'tests/table_local_compilation_owner_source.py',
         'tests/test_legacy_removal_admission.py', 'tests/legacy_removal_admission_probe.mjs',
         'tests/legacy_removal_source_probe.mjs', 'scripts/upstream-legacy-removal-admission.cjs',
         'scripts/upstream-legacy-removal-source.mjs']
def digest(raw):
    return hashlib.sha256(raw).hexdigest()
before = [{'path': p, 'sha256': digest((root/p).read_bytes())} for p in paths]
env = dict(os.environ)
env['PYTHONPATH'] = str(root/'tests')
env['PATH'] = '/nix/store/w8jijs92barihdb0z54dsgq5szj2wd47-nodejs-24.21.0/bin:' + env.get('PATH', '')
env['LEGACY_REMOVAL_ADMISSION_REPORT'] = str(root/(prefix+'admission-current-controls.json'))
env['LEGACY_REMOVAL_ORIGINAL_REPORT'] = str(root/(prefix+'original-current-controls.json'))
command = [sys.executable, '-m', 'unittest', '-v', *modules]
started = time.monotonic()
child = subprocess.run(command, cwd=root, env=env, capture_output=True, text=True, timeout=180)
seconds = time.monotonic()-started
for ref in before:
    assert digest((root/ref['path']).read_bytes()) == ref['sha256'], ref['path']
log = prefix+'python-current-tests.log'
assert not (root/log).exists()
(root/log).write_text(child.stdout+child.stderr)
report = {'schema_version': 1, 'line': '21.x', 'status': 'pass' if child.returncode == 0 else 'failed',
          'command': command, 'test_modules': modules, 'exit_code': child.returncode, 'seconds': seconds,
          'raw_output': {'path': log, 'sha256': digest((root/log).read_bytes())},
          'source_bindings': before, 'full_root_coordinator_or_native_tests_run': False,
          'product_changes': 0, 'canonical_dispositions_changed': 0, 'g11_claim': 'not-passed'}
out = root/(prefix+'python-current-execution.json')
assert not out.exists()
out.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({'status': report['status'], 'exit_code': child.returncode, 'seconds': seconds, 'raw_output': log}))
if child.returncode:
    print((child.stdout+child.stderr)[-10000:])
    raise SystemExit(child.returncode)

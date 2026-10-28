# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Preserve the exact prior focused roster; no full product/M3/1800s suite."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'compatibility/rc/21x-c04-slider-m3-repairs-'
attempt = sys.argv[1]
assert re.fullmatch(r'a[1-9][0-9]*', attempt)
prior = json.loads((ROOT / 'compatibility/rc/21x-c04-owner-source-transaction-retained-focused-execution.json').read_text())
command = ['python', *prior['command'][1:-1], 'test_surface_m3_theme_source_review', 'test_surface_m3_theme_admission', '-v']
environment = dict(os.environ, PYTHONPATH=str(ROOT / 'tests'))
outputs = {}
for name in command[3:-1]:
    source = (ROOT / 'tests' / (name.split('.')[0] + '.py')).read_text()
    for key in re.findall(r'os.environ.get\([\'\"]([^\'\"]+)', source):
        if key == 'M3_BOUNDARY_ADMISSION_REPORT' and '.test_independent_five_entries_and_real_failures' in name:
            continue
        outputs[key] = PREFIX + 'retained-' + attempt + '-' + key.lower().replace('_', '-') + '.json'
environment.update(outputs)
assert os.nice(0) >= 19
log_path = PREFIX + 'retained-' + attempt + '-focused-execution.txt'
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
begin = time.monotonic()
with (ROOT / log_path).open('x') as log:
    child = subprocess.run(command, cwd=ROOT, env=environment, stdout=log, stderr=log, timeout=450)

def ref(path):
    raw = (ROOT / path).read_bytes()
    return dict(path=path, sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw))

report = dict(schema_version=1, line='21.x', started_at_utc=started, elapsed_seconds=round(time.monotonic()-begin, 3),
              command=command, runtime='pinned Chainman PTY nice19', nice=os.nice(0), exit_code=child.returncode,
              result='pass' if child.returncode == 0 else 'fail', log=ref(log_path), report_environment=outputs,
              reports=[ref(path) for path in outputs.values() if (ROOT / path).exists()],
              missing_reports=[path for path in outputs.values() if not (ROOT / path).exists()],
              full_retained_1800s_suite_executed=False, full_M3_suite_executed=False, pushed=False, actions_started=False,
              actual_native_artifact_browser_floor_or_full_audit_qualified=False, g11_claim='not-passed')
with (ROOT / (PREFIX + 'retained-' + attempt + '-focused-execution.json')).open('x') as target:
    target.write(json.dumps(report, indent=2) + '\n')
print(json.dumps({key: report[key] for key in ['result','elapsed_seconds','exit_code','missing_reports']}))
sys.exit(child.returncode)

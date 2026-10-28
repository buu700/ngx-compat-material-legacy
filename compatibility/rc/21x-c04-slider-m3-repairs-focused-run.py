# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Serial, low-priority focused source review; no product or matrix execution."""
import datetime
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'compatibility/rc/21x-c04-slider-m3-repairs-'
command = ['python', '-m', 'unittest', 'tests.test_slider_m3_repairs_source_review', '-v']
environment = dict(os.environ, SLIDER_M3_REPAIRS_SOURCE_REPORT=PREFIX + 'source-controls.json',
                   SLIDER_M3_REPAIRS_REVIEW_REPORT=PREFIX + 'source-review.json')
assert os.nice(0) >= 19
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
begin = time.monotonic()
child = subprocess.run(command, cwd=ROOT, env=environment, capture_output=True, text=True, timeout=150)
report = {'schema_version': 1, 'started_at_utc': started, 'elapsed_seconds': round(time.monotonic() - begin, 3),
          'command': command, 'nice': os.nice(0), 'python': sys.version.split()[0],
          'node': subprocess.check_output(['node', '--version'], text=True).strip(),
          'pnpm': subprocess.check_output(['pnpm', '--version'], text=True).strip(),
          'exit_code': child.returncode, 'stdout': child.stdout, 'stderr': child.stderr,
          'expensive_product_or_matrix_commands': False, 'pushed': False, 'actions_started': False}
with (ROOT / (PREFIX + 'focused-execution.json')).open('x') as target:
    target.write(json.dumps(report, indent=2) + '\n')
print(json.dumps({'exit_code': child.returncode, 'elapsed_seconds': report['elapsed_seconds'], 'stderr': child.stderr}))
sys.exit(child.returncode)

# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license in LICENSE.
"""Route MAIN to current admission plus the original historical assertions."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PINS = {
    '5dad16b56a21a7cc0fdcaba15c43a367a05c2d60f9710cae12cd7e74cdb3c03f': 'main',
    'ffd0915b98cba04e203fb0ef2b5ea4ce64c0601737e080ee9e833d111deea5d5': '21.x',
}


def dialog_command(original, case):
    capture = (ROOT / 'compatibility/rc/dialog-caller-prior.json.gz').read_bytes()
    line = PINS.get(hashlib.sha256(capture).hexdigest())
    if line is None or json.loads(gzip.decompress(capture))['line'] != line:
        raise AssertionError('unauthenticated dialog caller prior')
    if line == '21.x':
        return ['node', original]
    result = subprocess.run(['node', '--input-type=module', '-e',
        'import {inspectDialogCurrentOwner} from "./scripts/dialog-caller-current-owner.mjs"; inspectDialogCurrentOwner({})'],
        cwd=ROOT, capture_output=True, text=True, timeout=90)
    if result.returncode:
        raise AssertionError('current dialog owner rejected: ' + (result.stdout + result.stderr)[-10000:])
    return ['node', 'scripts/dialog-caller-historical-assertions.mjs', case]

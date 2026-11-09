# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Route only authenticated remaining Core caller captures."""
import gzip
import hashlib
import json
from pathlib import Path
_ROOT = Path(__file__).resolve().parents[1]
_PINS = {'a6e589d9db9037bb7aa9fccfdaf54695d0801299640647a065d5eaa6410d80e9': 'main',
         '02b9b9182538e1147a1af4fb9a9ce6970eba11e04f2444c843af870d5af894bb': '21.x'}


def remaining_core_line(data):
    line = _PINS.get(hashlib.sha256(data).hexdigest())
    if line is None or json.loads(gzip.decompress(data))['line'] != line:
        raise ValueError('unrecognized remaining Core caller capture')
    return line


def remaining_core_route():
    line = remaining_core_line((_ROOT / 'compatibility/rc/remaining-core-caller-roles-prior.json.gz').read_bytes())
    return line, 'tests/remaining_core_current_probe.mjs' if line == 'main' else 'tests/remaining_core_caller_roles_probe.mjs'

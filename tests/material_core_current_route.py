# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Route only authenticated historical Material-core caller captures."""
import gzip
import hashlib
import json
from pathlib import Path
_ROOT = Path(__file__).resolve().parents[1]
_PINS = {'2f7829704e1decafcd976381089b258eab3ae711bbdf4e3a8c0c18f5de095ed4': 'main',
         '8fb42d736a2041153bbf442693a57b8ee9b8ce06885525eb7cbbed939d2425e2': '21.x'}


def material_core_line(data):
    line = _PINS.get(hashlib.sha256(data).hexdigest())
    if line is None or json.loads(gzip.decompress(data))['line'] != line:
        raise ValueError('unrecognized Material-core caller capture')
    return line


def material_core_route():
    line = material_core_line((_ROOT / 'compatibility/rc/material-core-caller-roles-prior.json.gz').read_bytes())
    return line, 'tests/material_core_current_probe.mjs' if line == 'main' else 'tests/material_core_caller_roles_probe.mjs'

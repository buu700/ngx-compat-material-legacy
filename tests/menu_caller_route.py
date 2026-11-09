# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Select only a line authenticated by the immutable menu caller capture."""
import gzip
import hashlib
import json
from pathlib import Path
_ROOT = Path(__file__).resolve().parents[1]
_PINS = {'a6cf639de2151c32bc80b82be63ae4390453dc8c92a309801c1c153de9a82a00': 'main',
         '2da547a58102ec0a5715ebfdc91a86085d9728a6b6f747e35bf15cf8d0f8fe8e': '21.x'}
def line_from_capture(data):
    line = _PINS.get(hashlib.sha256(data).hexdigest())
    if line is None or json.loads(gzip.decompress(data))['line'] != line:
        raise ValueError('unrecognized menu caller capture')
    return line

def menu_line():
    return line_from_capture((_ROOT / 'compatibility/rc/menu-caller-prior.json.gz').read_bytes())

def probe_for(line):
    if line == 'main':
        return 'tests/menu_caller_current_adapter.mjs'
    if line == '21.x':
        return 'tests/menu_caller_probe.mjs'
    raise ValueError('unknown menu caller line')

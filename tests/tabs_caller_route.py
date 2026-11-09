# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Select only a line authenticated by the immutable tabs caller capture."""
import gzip
import hashlib
import json
from pathlib import Path
_ROOT = Path(__file__).resolve().parents[1]
_PINS = {'e663f39867c81c012c9f05e77132c73bf908f49e59567d6f738d1e2e02bc9c1d': 'main',
         'b6fe104f889cf5f5757eb95dbe7660933e796ecaac60dc9c4af55caea75a2613': '21.x'}
def line_from_capture(data):
    line = _PINS.get(hashlib.sha256(data).hexdigest())
    if line is None or json.loads(gzip.decompress(data))['line'] != line:
        raise ValueError('unrecognized tabs caller capture')
    return line
def tabs_line():
    return line_from_capture((_ROOT / 'compatibility/rc/tabs-caller-prior.json.gz').read_bytes())
def probe_for(line):
    if line == 'main':
        return 'tests/tabs_caller_current_adapter.mjs'
    if line == '21.x':
        return 'tests/tabs_caller_probe.mjs'
    raise ValueError('unknown tabs caller line')

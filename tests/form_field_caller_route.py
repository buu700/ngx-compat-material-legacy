# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Route only from the authenticated original caller capture."""
import gzip
import hashlib
import json
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
_PINS = {'9dc98dd04874c66a033fbe00e4adf0751c61fff5853ffba7919f0a9d83635bb2': 'main',
         'ed043948c1f38f3d90f1cbf6c2067ab60eac29a6ce2fe0f7967ffd3a3a7db6fb': '21.x'}


def line_from_capture(data):
    line = _PINS.get(hashlib.sha256(data).hexdigest())
    if line is None or json.loads(gzip.decompress(data))['line'] != line:
        raise ValueError('unrecognized form-field caller capture')
    return line


def form_field_caller_line():
    return line_from_capture((_ROOT / 'compatibility/rc/form-field-caller-prior.json.gz').read_bytes())


def probe_for(line, family):
    probes = {
        'contracts': ('tests/form_field_caller_current_main.mjs', 'tests/form_field_caller_probe.mjs'),
        'integration': ('compatibility/rc/form-field-caller-integration-check.mjs', 'compatibility/rc/form-field-caller-integration-check.mjs'),
    }
    if line not in ('main', '21.x') or family not in probes:
        raise ValueError('unknown form-field caller route')
    return probes[family][0 if line == 'main' else 1]

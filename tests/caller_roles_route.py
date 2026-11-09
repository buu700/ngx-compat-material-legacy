# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Finite line routing from the authenticated historic CDK caller capture."""
import gzip
import hashlib
import json
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
_PINS = {'76326259e21af2757f70bec721448eb3c382d0589face55193b215fda8a8667c': 'main',
         'ebba4b339a5785d78ba9b0f757c2a717ecf9baefb3f4901d63d2aa6d6a196349': '21.x'}


def cdk_line_from_capture(data):
    line = _PINS.get(hashlib.sha256(data).hexdigest())
    if line is None or json.loads(gzip.decompress(data))['line'] != line:
        raise ValueError('unrecognized CDK module/type caller capture')
    return line


def cdk_module_type_route():
    data = (_ROOT / 'compatibility/rc/cdk-module-type-caller-roles-prior.json.gz').read_bytes()
    line = cdk_line_from_capture(data)
    path = 'tests/cdk_module_type_current_probe.mjs' if line == 'main' else 'tests/cdk_module_type_caller_roles_probe.mjs'
    return line, path

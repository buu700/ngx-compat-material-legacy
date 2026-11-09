# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Route only authenticated Core-token captures."""
import gzip
import hashlib
import json
from pathlib import Path
_ROOT = Path(__file__).resolve().parents[1]
_PINS = {'4d182d7e2a1e7b83069335c5a854a835ecdee2c6e136ebcfc22dd1b836738c87': 'main',
         '79c2b36d191286a956fe96253fb434a20b32aaba445daa7fa0c3aa08e68ae70b': '21.x'}


def core_token_line(data):
    line = _PINS.get(hashlib.sha256(data).hexdigest())
    if line is None or json.loads(gzip.decompress(data))['line'] != line:
        raise ValueError('unrecognized Core-token capture')
    return line


def core_token_route():
    line = core_token_line((_ROOT / 'compatibility/rc/core-token-caller-roles-prior.json.gz').read_bytes())
    return line, 'tests/core_token_current_probe.mjs' if line == 'main' else 'tests/core_token_caller_roles_probe.mjs'

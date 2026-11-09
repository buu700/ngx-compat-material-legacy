# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
"""Choose an epoch only from the authenticated immutable configuration capture."""
import gzip
import hashlib
import json
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
_PINS = {'3c12b3538e4d5d1fc307f1f58f911fce7d2045763c0518b6233fc61d01a6e0f6': 'main',
         '3754c37913758aae0c5b9af9981b79ff7956551229ff78994fbcffaf4de547d5': '21.x'}


def line_from_capture(data):
    line = _PINS.get(hashlib.sha256(data).hexdigest())
    if line is None or json.loads(gzip.decompress(data))['line'] != line:
        raise ValueError('unrecognized component configuration capture')
    return line


def component_config_line():
    return line_from_capture((_ROOT / 'compatibility/rc/component-config-caller-prior.json.gz').read_bytes())


def probe_for(line, family):
    probes = {
        'contracts': ('component_config_main_adapter', 'component_config_caller_probe'),
        'types': ('component_config_current_type_evidence_probe', 'component_config_caller_type_evidence_probe'),
        'public_runtime': ('component_config_current_public_runtime_evidence_probe', 'component_config_caller_public_runtime_evidence_probe'),
        'owned_runtime': ('component_config_current_owned_evidence_probe', 'component_config_caller_owned_evidence_probe'),
    }
    if line not in ('main', '21.x') or family not in probes:
        raise ValueError('unknown component configuration route')
    return 'tests/' + probes[family][0 if line == 'main' else 1] + '.mjs'

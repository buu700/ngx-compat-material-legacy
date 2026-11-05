# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact registry comparison data; no historical source module is executed."""
import hashlib
from pathlib import Path

REGISTRY = 'scripts/upstream-source-contract-registry.mjs'
CURRENT = 'be50b37d181b43960361860dd7cb3bb24d0f2d1b0a2ecfaa5a85a791e4869399'
HISTORICAL = '03a18cd09e4183f4307f1ec2c17d0797eea72db0440e23530e4d015ea0dae6a8'
RECORDS = (
    b"  {sha:'f7e3ae3bd1b86d5987df57bb06d350001c592931',proof_kind:'individual-historical-legacy-removal-source-exclusion',\n"
    b"    scope_key:'legacy_removal_source_scope',module:'upstream-legacy-removal-admission.cjs'},\n",
    b"  {sha:'3f35b12290ea4dbee4a9d82845c0964b2b4df50d',proof_kind:'individual-historical-table-local-compilation-source-review',\n"
    b"    scope_key:'table_local_compilation_source_scope',module:'upstream-table-local-compilation-admission.cjs'},\n",
)


def historical67_registry_bytes(root):
    """Authenticate current69, then return only exact preceding67 comparison bytes."""
    cursor = Path(root)
    assert cursor.is_dir() and not cursor.is_symlink()
    for part in REGISTRY.split('/'):
        cursor = cursor / part
        assert not cursor.is_symlink()
    raw = cursor.read_bytes()
    assert len(raw) == 15548 and hashlib.sha256(raw).hexdigest() == CURRENT
    comparison = raw
    for record in reversed(RECORDS):
        assert comparison.count(record) == 1
        comparison = comparison.replace(record, b'')
    assert hashlib.sha256(comparison).hexdigest() == HISTORICAL
    assert comparison.count(b'];\n') == 1
    expected = comparison
    for record in RECORDS:
        expected = expected.replace(b'];\n', record + b'];\n')
    assert expected == raw
    assert cursor.read_bytes() == raw
    return comparison

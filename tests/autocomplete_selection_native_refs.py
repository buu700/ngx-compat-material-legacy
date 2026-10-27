# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent exact registry successor; metadata references never expose code."""
import hashlib
import json
from autocomplete_selection_source_refs import _git

REGISTRY = 'scripts/upstream-historical-behavior-evidence.mjs'
PACKET = 'compatibility/rc/autocomplete-selection-native-contract-proposal.json'
PINS = {'main': 'f53ca24623f8876b28f6af99a4e2ad80ecc3934073aed5931fb59aa641a7d0e7',
        '21.x': '9807d4a66c303445a1af43a2c4bb66217b7391af9ee62ab33f290c3b9bb066ba'}
SHA = lambda raw: hashlib.sha256(raw).hexdigest()


def native_registry_subject(root):
    version = json.loads((root / 'projects/ngx-material-legacy/package.json').read_bytes())['version']
    assert version.startswith(('21.', '22.'))
    line = '21.x' if version.startswith('21.') else 'main'
    raw = (root / PACKET).read_bytes()
    assert SHA(raw) == PINS[line]
    packet = json.loads(raw)
    assert packet['line'] == line and packet['schema_version'] == 1 and packet['registry']['path'] == REGISTRY
    assert packet['production_registry_activated'] is False and packet['canonical_SHA_decisions_changed'] == 0
    assert packet['actual_native_browser_artifact_or_floor_executed'] is False and packet['g11_claim'] == 'not-passed'
    before = _git(root, packet['source_parent'], REGISTRY)
    assert SHA(before) == packet['registry']['before_sha256'] and len(before) == packet['registry']['before_bytes']
    edits = [dict(before="import {createHash} from 'node:crypto';", after="import {createHash} from 'node:crypto';\nimport {autocompleteSelectionHistoricalScopes} from './autocomplete-selection-native-scopes.mjs';"),
             dict(before='const scopes = new Map([\n', after='const scopes = new Map([\n  ...autocompleteSelectionHistoricalScopes(commonMembers,nativeCase),\n')]
    assert packet['literal_edits'] == edits
    text = before.decode()
    for edit in edits:
        assert text.count(edit['before']) == 1
        text = text.replace(edit['before'], edit['after'])
    current = (root / REGISTRY).read_bytes()
    assert current == text.encode() and SHA(current) == packet['registry']['after_sha256']
    assert len(current) == packet['registry']['after_bytes']
    for ref in [packet['scope_module'], packet['source_proposals'], packet['original_subjects'], *packet['current_product_subjects']]:
        data = (root / ref['path']).read_bytes()
        assert SHA(data) == ref['sha256'] and len(data) == ref['bytes']
    return packet


def qualified_native_reference(root, ref):
    if ref['path'] != REGISTRY:
        return ref
    data = native_registry_subject(root)['registry']
    assert ref['sha256'] in (data['before_sha256'], data['after_sha256'])
    if 'bytes' in ref:
        assert ref['bytes'] == data['before_bytes' if ref['sha256'] == data['before_sha256'] else 'after_bytes']
    return dict(ref, sha256=data['after_sha256'], bytes=data['after_bytes'])


def native_registry_before_metadata(root, ref):
    if ref['path'] != REGISTRY:
        return ref
    qualified_native_reference(root, ref)
    data = native_registry_subject(root)['registry']
    return dict(ref, sha256=data['before_sha256'], **({'bytes': data['before_bytes']} if 'bytes' in ref else {}))

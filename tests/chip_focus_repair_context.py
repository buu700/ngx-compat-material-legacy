# @license
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""Exact pre-repair foundation subjects; current/native inspectors use raw files."""
import gzip
import hashlib
import json
import subprocess
from copy import deepcopy
from tests.chip_lifecycle_admission_context import admission_before_member
INPUT='compatibility/rc/chip-focus-repair-inputs.json'
PINS={'main': '40ef578cc1983d119effd4a99a0dfd2c877489c957be56ae081a961ccfb4dfe4', '21.x': '3b34cbb44b4989236de3cf61b3ea882877957ad6002162cf9735fd15cb74d3ba'}
JS_PIN='39e3a622e89f34f3366ec8ff3f2b8175da9ca97313107da3194cfdb2516c1bc9'
_sha=lambda b:hashlib.sha256(b).hexdigest()
_CACHE={}

def _focus_repair_context(root,read=None):
    read=read or (lambda p:(root/p).read_bytes());raw=read(INPUT);data=json.loads(raw);assert _sha(raw)==PINS[data['line']]
    stored=read(data['prior']['path']);assert _sha(stored)==data['prior']['sha256']
    assert _sha(read('scripts/chip-focus-repair.mjs'))==JS_PIN
    ref=data['current_raw_contract_source'];assert _sha(read(ref['path']))==ref['sha256']
    key=(str(root),_sha(raw))
    if key not in _CACHE:
        unpacked=gzip.decompress(stored);assert _sha(unpacked)==data['prior']['raw_sha256'];prior=json.loads(unpacked)
        assert prior['line']==data['line'] and prior['source_parent']==data['source_parent']
        for m in prior['sources']:assert _sha(m['text'].encode())==m['sha256']
        assert len(prior['roster']['ids'])==2227 and len(prior['roster']['discovery_negative_ids'])==5
        _CACHE[key]=(data,prior)
    return _CACHE[key]

def focus_repair_context(root,read=None):
    # Callers may inspect snapshots without changing the authenticated cache.
    return deepcopy(_focus_repair_context(root,read))

def focus_before_member(root,path,read=None):
    read=read or (lambda p:(root/p).read_bytes());data,prior=_focus_repair_context(root,read);raw=admission_before_member(root,path,read)
    current=next((m for m in data['current_members'] if m['path']==path),None)
    if current:
        old=next(m for m in prior['sources'] if m['path']==path)
        assert _sha(raw) in (current['sha256'],old['sha256']),'unknown pre-repair subject '+path
        return old['text'].encode()
    return raw

def focus_historical_product_diff(root,baseline,scope):
    data,prior=_focus_repair_context(root);assert baseline in data['allowed_historical_product_bases'];assert all(s in ['projects','testing','reference','fixtures'] for s in scope)
    for member in data['current_members']:assert _sha(admission_before_member(root,member['path']))==member['sha256'],'unreviewed live repair member'
    git=lambda *args:subprocess.check_output(['git','--no-replace-objects','-c','gc.auto=0','-c','maintenance.auto=0',*args],cwd=root)
    all_scope=['projects','testing','reference','fixtures'];actual=git('diff','--name-only',prior['source_parent'],'--',*all_scope).decode().splitlines();assert sorted(actual)==sorted(data['product_scope_changed_paths']),'unexpected current product delta'
    assert git('ls-files','--others','--exclude-standard','--',*all_scope)==b'','unreviewed added product member'
    for member in prior['product_members']:
        if member['path'] not in data['product_scope_changed_paths']:assert _sha((root/member['path']).read_bytes())==member['sha256'],'unreviewed product member'
    return git('diff',baseline,prior['source_parent'],'--',*scope)
